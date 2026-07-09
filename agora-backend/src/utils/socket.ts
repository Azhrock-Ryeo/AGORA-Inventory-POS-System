import { Server } from 'socket.io'
import type { Server as HttpServer } from 'http'
import jwt from 'jsonwebtoken'

let io: Server

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

    socket.on('disconnect', (reason) => {
      console.log('[Socket] Client disconnected:', socket.id, reason)
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