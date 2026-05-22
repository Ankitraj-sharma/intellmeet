const Meeting = require('../models/Meeting');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { getRedis } = require('../config/redis');
const aiService = require('../services/aiService');
const logger = require('../utils/logger');

// @desc    Create meeting
// @route   POST /api/v1/meetings
exports.createMeeting = async (req, res, next) => {
  try {
    const { title, description, scheduledAt, type, settings, team, tags } = req.body;

    const meeting = await Meeting.create({
      title,
      description,
      scheduledAt,
      type: type || 'instant',
      settings: settings || {},
      team,
      tags,
      host: req.user._id,
      participants: [{ user: req.user._id, role: 'host' }],
    });

    await meeting.populate('host', 'name email avatarUrl');

    // Cache meeting ID for quick lookup
    const redis = getRedis();
    if (redis) {
      await redis.setex(`meeting:${meeting.meetingId}`, 86400, JSON.stringify({ id: meeting._id, status: meeting.status }));
    }

    logger.info(`Meeting created: ${meeting.meetingId} by ${req.user.email}`);

    res.status(201).json(new ApiResponse(201, { meeting }, 'Meeting created successfully'));
  } catch (error) {
    next(error);
  }
};

// @desc    Get all meetings (for user)
// @route   GET /api/v1/meetings
exports.getMeetings = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;
    const skip = (page - 1) * limit;

    const query = {
      $or: [
        { host: req.user._id },
        { 'participants.user': req.user._id },
      ],
    };

    if (status) query.status = status;
    if (search) query.title = { $regex: search, $options: 'i' };

    const [meetings, total] = await Promise.all([
      Meeting.find(query)
        .populate('host', 'name avatarUrl')
        .populate('participants.user', 'name avatarUrl')
        .sort({ scheduledAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Meeting.countDocuments(query),
    ]);

    res.json(new ApiResponse(200, {
      meetings,
      pagination: { total, page: Number(page), pages: Math.ceil(total / limit), limit: Number(limit) },
    }, 'Meetings fetched'));
  } catch (error) {
    next(error);
  }
};

// @desc    Get single meeting
// @route   GET /api/v1/meetings/:meetingId
exports.getMeeting = async (req, res, next) => {
  try {
    const meeting = await Meeting.findOne({ meetingId: req.params.meetingId })
      .populate('host', 'name email avatarUrl')
      .populate('participants.user', 'name email avatarUrl')
      .populate('aiSummary.actionItems.assignee', 'name avatarUrl');

    if (!meeting) return next(new ApiError(404, 'Meeting not found'));

    // Check access
    const isParticipant = meeting.participants.some(p => p.user._id.toString() === req.user._id.toString());
    const isHost = meeting.host._id.toString() === req.user._id.toString();
    if (!isParticipant && !isHost && !meeting.isPublic) {
      return next(new ApiError(403, 'Access denied'));
    }

    res.json(new ApiResponse(200, { meeting }, 'Meeting fetched'));
  } catch (error) {
    next(error);
  }
};

// @desc    Join meeting
// @route   POST /api/v1/meetings/:meetingId/join
exports.joinMeeting = async (req, res, next) => {
  try {
    const meeting = await Meeting.findOne({ meetingId: req.params.meetingId });
    if (!meeting) return next(new ApiError(404, 'Meeting not found'));
    if (meeting.status === 'ended' || meeting.status === 'cancelled') {
      return next(new ApiError(400, 'This meeting has already ended'));
    }

    const alreadyJoined = meeting.participants.find(p => p.user.toString() === req.user._id.toString());
    if (!alreadyJoined) {
      meeting.participants.push({ user: req.user._id, role: 'participant' });
    }

    if (meeting.status === 'scheduled') {
      meeting.status = 'ongoing';
      meeting.startedAt = new Date();
    }

    await meeting.save();
    await meeting.populate('participants.user', 'name avatarUrl');

    res.json(new ApiResponse(200, { meeting }, 'Joined meeting successfully'));
  } catch (error) {
    next(error);
  }
};

// @desc    End meeting
// @route   POST /api/v1/meetings/:meetingId/end
exports.endMeeting = async (req, res, next) => {
  try {
    const meeting = await Meeting.findOne({ meetingId: req.params.meetingId });
    if (!meeting) return next(new ApiError(404, 'Meeting not found'));
    if (meeting.host.toString() !== req.user._id.toString()) {
      return next(new ApiError(403, 'Only the host can end this meeting'));
    }

    meeting.status = 'ended';
    meeting.endedAt = new Date();

    // Update participant leave times
    meeting.participants.forEach(p => {
      if (!p.leftAt) {
        p.leftAt = new Date();
        if (p.joinedAt) {
          p.duration = Math.round((p.leftAt - p.joinedAt) / 1000);
        }
      }
    });

    await meeting.save();

    // Trigger async AI summary if transcript exists
    if (meeting.transcript?.fullText?.length > 50) {
      aiService.generateMeetingSummary(meeting._id).catch(err =>
        logger.error(`AI summary generation failed for meeting ${meeting._id}: ${err.message}`)
      );
    }

    logger.info(`Meeting ended: ${meeting.meetingId}`);
    res.json(new ApiResponse(200, { meeting }, 'Meeting ended successfully'));
  } catch (error) {
    next(error);
  }
};

// @desc    Update meeting transcript
// @route   PATCH /api/v1/meetings/:meetingId/transcript
exports.updateTranscript = async (req, res, next) => {
  try {
    const { segment } = req.body; // { speaker, text, startTime, endTime }
    const meeting = await Meeting.findOne({ meetingId: req.params.meetingId });
    if (!meeting) return next(new ApiError(404, 'Meeting not found'));

    meeting.transcript.segments.push(segment);
    meeting.transcript.fullText += ` ${segment.text}`;
    await meeting.save();

    res.json(new ApiResponse(200, {}, 'Transcript updated'));
  } catch (error) {
    next(error);
  }
};

// @desc    Get AI summary
// @route   GET /api/v1/meetings/:meetingId/summary
exports.getMeetingSummary = async (req, res, next) => {
  try {
    const meeting = await Meeting.findOne({ meetingId: req.params.meetingId })
      .populate('aiSummary.actionItems.assignee', 'name avatarUrl');
    if (!meeting) return next(new ApiError(404, 'Meeting not found'));

    if (!meeting.aiSummary?.isGenerated) {
      // Try to generate on-demand
      if (meeting.transcript?.fullText?.length > 50) {
        await aiService.generateMeetingSummary(meeting._id);
        const updated = await Meeting.findById(meeting._id).populate('aiSummary.actionItems.assignee', 'name avatarUrl');
        return res.json(new ApiResponse(200, { summary: updated.aiSummary }, 'Summary generated'));
      }
      return next(new ApiError(404, 'No transcript available for summary generation'));
    }

    res.json(new ApiResponse(200, { summary: meeting.aiSummary }, 'Summary fetched'));
  } catch (error) {
    next(error);
  }
};

// @desc    Delete meeting
// @route   DELETE /api/v1/meetings/:id
exports.deleteMeeting = async (req, res, next) => {
  try {
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) return next(new ApiError(404, 'Meeting not found'));
    if (meeting.host.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return next(new ApiError(403, 'Not authorized'));
    }
    await Meeting.findByIdAndDelete(req.params.id);
    res.json(new ApiResponse(200, {}, 'Meeting deleted'));
  } catch (error) {
    next(error);
  }
};

// @desc    Get meeting analytics
// @route   GET /api/v1/meetings/analytics
exports.getAnalytics = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { range = '30' } = req.query;
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(range));

    const [totalMeetings, hostedMeetings, participatedMeetings, avgDuration, recentMeetings] = await Promise.all([
      Meeting.countDocuments({ $or: [{ host: userId }, { 'participants.user': userId }], status: 'ended', endedAt: { $gte: daysAgo } }),
      Meeting.countDocuments({ host: userId, status: 'ended', endedAt: { $gte: daysAgo } }),
      Meeting.countDocuments({ 'participants.user': userId, status: 'ended', endedAt: { $gte: daysAgo } }),
      Meeting.aggregate([
        { $match: { $or: [{ host: userId }, { 'participants.user': userId }], status: 'ended', endedAt: { $gte: daysAgo } } },
        { $project: { duration: { $subtract: ['$endedAt', '$startedAt'] } } },
        { $group: { _id: null, avg: { $avg: '$duration' } } },
      ]),
      Meeting.find({ $or: [{ host: userId }, { 'participants.user': userId }], status: 'ended' })
        .sort({ endedAt: -1 }).limit(5).populate('host', 'name avatarUrl').lean(),
    ]);

    res.json(new ApiResponse(200, {
      totalMeetings,
      hostedMeetings,
      participatedMeetings,
      avgDurationMinutes: avgDuration[0] ? Math.round(avgDuration[0].avg / 60000) : 0,
      recentMeetings,
    }, 'Analytics fetched'));
  } catch (error) {
    next(error);
  }
};
