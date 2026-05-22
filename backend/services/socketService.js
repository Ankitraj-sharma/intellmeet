const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Meeting = require('../models/Meeting');
const logger = require('../utils/logger');

const initializeSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Authentication middleware for Socket.io
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
      if (!token) return next(new Error('Authentication required'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('name email avatarUrl isOnline');
      if (!user) return next(new Error('User not found'));

      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.user.name} (${socket.id})`);

    // Update online status
    User.findByIdAndUpdate(socket.user._id, { isOnline: true }).exec();

    // Join user's personal room
    socket.join(`user:${socket.user._id}`);

    // =====================
    // MEETING ROOM EVENTS
    // =====================

    socket.on('meeting:join', async ({ meetingId }) => {
      try {
        socket.join(`meeting:${meetingId}`);
        socket.currentMeeting = meetingId;

        // Notify other participants
        socket.to(`meeting:${meetingId}`).emit('meeting:user-joined', {
          user: { _id: socket.user._id, name: socket.user.name, avatarUrl: socket.user.avatarUrl },
          socketId: socket.id,
        });

        // Get current participants in room
        const room = io.sockets.adapter.rooms.get(`meeting:${meetingId}`);
        const participantCount = room ? room.size : 0;

        socket.emit('meeting:joined', {
          meetingId,
          participantCount,
          socketId: socket.id,
        });

        logger.info(`${socket.user.name} joined meeting room: ${meetingId}`);
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    socket.on('meeting:leave', ({ meetingId }) => {
      socket.leave(`meeting:${meetingId}`);
      socket.currentMeeting = null;
      socket.to(`meeting:${meetingId}`).emit('meeting:user-left', {
        userId: socket.user._id,
        socketId: socket.id,
      });
    });

    // WebRTC signaling
    socket.on('webrtc:offer', ({ targetSocketId, offer, meetingId }) => {
      socket.to(targetSocketId).emit('webrtc:offer', {
        offer,
        fromSocketId: socket.id,
        fromUser: { _id: socket.user._id, name: socket.user.name, avatarUrl: socket.user.avatarUrl },
      });
    });

    socket.on('webrtc:answer', ({ targetSocketId, answer }) => {
      socket.to(targetSocketId).emit('webrtc:answer', { answer, fromSocketId: socket.id });
    });

    socket.on('webrtc:ice-candidate', ({ targetSocketId, candidate }) => {
      socket.to(targetSocketId).emit('webrtc:ice-candidate', { candidate, fromSocketId: socket.id });
    });

    // Media controls
    socket.on('meeting:toggle-audio', ({ meetingId, isMuted }) => {
      socket.to(`meeting:${meetingId}`).emit('meeting:user-audio-changed', {
        userId: socket.user._id,
        isMuted,
      });
    });

    socket.on('meeting:toggle-video', ({ meetingId, isVideoOff }) => {
      socket.to(`meeting:${meetingId}`).emit('meeting:user-video-changed', {
        userId: socket.user._id,
        isVideoOff,
      });
    });

    socket.on('meeting:screen-share', ({ meetingId, isSharing }) => {
      socket.to(`meeting:${meetingId}`).emit('meeting:screen-share-changed', {
        userId: socket.user._id,
        name: socket.user.name,
        isSharing,
      });
    });

    // =====================
    // CHAT EVENTS
    // =====================

    socket.on('chat:send', async ({ meetingId, message, type = 'text' }) => {
      try {
        const chatMessage = {
          _id: require('crypto').randomUUID(),
          sender: { _id: socket.user._id, name: socket.user.name, avatarUrl: socket.user.avatarUrl },
          message,
          type,
          timestamp: new Date(),
        };

        // Persist to DB
        await Meeting.findOneAndUpdate(
          { meetingId },
          { $push: { chat: { sender: socket.user._id, message, type } } }
        );

        io.to(`meeting:${meetingId}`).emit('chat:message', chatMessage);
      } catch (error) {
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    socket.on('chat:typing', ({ meetingId, isTyping }) => {
      socket.to(`meeting:${meetingId}`).emit('chat:user-typing', {
        userId: socket.user._id,
        name: socket.user.name,
        isTyping,
      });
    });

    // =====================
    // LIVE TRANSCRIPT
    // =====================

    socket.on('transcript:segment', async ({ meetingId, segment }) => {
      // Broadcast to all in meeting
      socket.to(`meeting:${meetingId}`).emit('transcript:segment', {
        ...segment,
        speaker: socket.user.name,
        speakerId: socket.user._id,
      });

      // Save segment
      await Meeting.findOneAndUpdate(
        { meetingId },
        {
          $push: { 'transcript.segments': { ...segment, speaker: socket.user.name } },
          $set: { 'transcript.fullText': { $concat: ['$transcript.fullText', ' ', segment.text] } },
        }
      );
    });

    // =====================
    // NOTES (collaborative)
    // =====================

    socket.on('notes:update', ({ meetingId, content }) => {
      socket.to(`meeting:${meetingId}`).emit('notes:updated', {
        content,
        editedBy: { _id: socket.user._id, name: socket.user.name },
      });

      Meeting.findOneAndUpdate(
        { meetingId },
        { 'notes.content': content, 'notes.lastEditedBy': socket.user._id, 'notes.lastEditedAt': new Date() }
      ).exec();
    });

    // =====================
    // REACTIONS
    // =====================

    socket.on('meeting:reaction', ({ meetingId, emoji }) => {
      io.to(`meeting:${meetingId}`).emit('meeting:reaction', {
        userId: socket.user._id,
        name: socket.user.name,
        emoji,
        timestamp: Date.now(),
      });
    });

    // =====================
    // DISCONNECT
    // =====================

    socket.on('disconnect', async () => {
      logger.info(`Socket disconnected: ${socket.user.name}`);

      if (socket.currentMeeting) {
        socket.to(`meeting:${socket.currentMeeting}`).emit('meeting:user-left', {
          userId: socket.user._id,
          socketId: socket.id,
        });
      }

      await User.findByIdAndUpdate(socket.user._id, {
        isOnline: false,
        lastSeen: new Date(),
      });
    });
  });

  return io;
};

module.exports = { initializeSocket };
