import { Server } from 'socket.io'
import type { Server as HttpServer } from 'http'
import jwt from 'jsonwebtoken'
import { redis } from './redis'

let io: Server

function sessionKey(userId: string) {
  return `session:active:${userId}`
}

export function initSocket(httpServer: HttpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: ['http://localhost:5173', process.env.FRONTEND_URL].filter(Boolean) as string[],
      credentials: true,
    },
  })

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token
    if (!token) return next()
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET as string) as any
      socket.data.user = payload
      next()
    } catch {
      next(new Error('Authentication failed'))
    }
  })

  io.on('connection', (socket) => {
    const user = socket.data.user
    console.log('[Socket] Client connected:', socket.id, 'userId:', user?.userId, 'role:', user?.role)

    if (user?.userId) socket.join(`user:${user.userId}`)

    if (user?.role) {
      socket.join(`role:${user.role}`)
      if (user.role !== 'CASHIER') socket.join('staff')
    }

    console.log('[Socket] Rooms after join:', [...socket.rooms])

    socket.on('disconnect', async (reason) => {
      console.log('[Socket] Client disconnected:', socket.id, reason)

      if (user?.userId) {
        // Only clear if no other socket for this user is still connected
        // (multi-tab: closing one tab shouldn't log out a user who still
        // has another tab open)
        const room = io.sockets.adapter.rooms.get(`user:${user.userId}`)
        if (!room || room.size === 0) {
          await redis.del(sessionKey(user.userId))
          console.log(`[Socket] Session cleared instantly for user ${user.userId}`)
        }
      }
    })
  })

  return io
}

export function getIO(): Server {
  if (!io) throw new Error('Socket.io not initialized')
  return io
}

export function emitToUser(userId: string, event: string, payload: any) {
  getIO().to(`user:${userId}`).emit(event, payload)
}

export function emitToRoles(roles: string[], event: string, payload: any) {
  const ioInstance = getIO()
  roles.forEach((role) => {
    const roomName = `role:${role}`
    const size = ioInstance.sockets.adapter.rooms.get(roomName)?.size ?? 0
    console.log(`[Socket] Emitting "${event}" to room "${roomName}" — ${size} socket(s) listening`)
    ioInstance.to(roomName).emit(event, payload)
  })
}