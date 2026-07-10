import jwt from 'jsonwebtoken'
import { Request, Response, NextFunction } from 'express'
import prisma from '../utils/prisma'
import { redis } from '../utils/redis'
import { sessionKey, SESSION_LOCK_TTL } from '../utils/session'

export async function protect(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' })
  }

  const token = authHeader.split(' ')[1]
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as any

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { is_active: true },
    })

    if (!user || !user.is_active) {
      return res.status(401).json({ message: 'Account is deactivated' })
    }

    redis.expire(sessionKey(payload.userId), SESSION_LOCK_TTL).catch(() => {})

    ;(req as any).user = payload
    next()
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' })
  }
}