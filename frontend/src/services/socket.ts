import { io, type Socket } from 'socket.io-client'

let socket: Socket | null = null

const SOCKET_URL = 'https://intellmeet-rfkt.onrender.com'

export const initSocket = (token: string): Socket => {
  if (socket?.connected) return socket

  socket = io(SOCKET_URL, {
    auth: {
      token,
    },

    withCredentials: true,

    transports: ['websocket', 'polling'],

    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,

    timeout: 20000,
  })

  socket.on('connect', () => {
    console.log('✅ Socket connected:', socket?.id)
  })

  socket.on('disconnect', (reason) => {
    console.log('❌ Socket disconnected:', reason)
  })

  socket.on('connect_error', (err) => {
    console.error('🚨 Socket connection error:', err)
  })

  return socket
}

export const getSocket = (): Socket | null => socket

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}