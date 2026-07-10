import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt'
import { redis } from '../utils/redis'
import jwt from 'jsonwebtoken'

const prisma = new PrismaClient()

const MAX_FAILED_ATTEMPTS = 5
const LOCKOUT_DURATION = 15 * 60
const SESSION_TTL = 7 * 24 * 60 * 60 // matches refresh cookie maxAge
import { sessionKey, SESSION_LOCK_TTL } from '../utils/session'

export async function loginUser(email: string, password: string) {
  const lockKey = `lockout:${email}`
  const attemptsKey = `attempts:${email}`

  const isLocked = await redis.get(lockKey)
  if (isLocked) {
    const ttl = await redis.ttl(lockKey)
    const minutes = Math.ceil(ttl / 60)
    throw new Error(`Account locked. Try again in ${minutes} minute(s).`)
  }

  const user = (await prisma.user.findUnique({
    where: { email },
    include: { user_role: { include: { role: true } } },
  })) as any

  if (!user || !user.is_active) {
    throw new Error('Invalid credentials')
  }

  const passwordMatches = await bcrypt.compare(password, user.password_hash)

  if (!passwordMatches) {
    const attempts = await redis.incr(attemptsKey)
    await redis.expire(attemptsKey, LOCKOUT_DURATION)

    if (attempts >= MAX_FAILED_ATTEMPTS) {
      await redis.setex(lockKey, LOCKOUT_DURATION, '1')
      await redis.del(attemptsKey)
      throw new Error(`Too many failed attempts. Account locked for 15 minutes.`)
    }

    throw new Error(`Invalid credentials. ${MAX_FAILED_ATTEMPTS - attempts} attempt(s) remaining.`)
  }

  await redis.del(attemptsKey)
  await redis.del(lockKey)

  const userRole = user.user_role
  const roleId = userRole?.role_id
  const roleName = userRole?.role.role_name

  if (!roleId || !roleName) {
    throw new Error('User has no assigned role')
  }

  const existingSession = await redis.get(sessionKey(user.id))
  if (existingSession) {
    throw new Error('Already logged in elsewhere. Please log out from the other session first.')
  }

  const payload = { userId: user.id, name: user.name, role: roleName, roleId }
  const accessToken = signAccessToken(payload)
  const refreshToken = signRefreshToken(payload)

  await redis.setex(sessionKey(user.id), SESSION_LOCK_TTL, '1')

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: roleName,
    },
  }
}

export async function refreshUserToken(oldRefreshToken: string) {
  let payload
  try {
    payload = verifyRefreshToken(oldRefreshToken)
  } catch {
    throw new Error('Invalid or expired refresh token')
  }

  const user = (await prisma.user.findUnique({
    where: { id: payload.userId },
    include: { user_role: { include: { role: true } } },
  })) as any

  if (!user || !user.is_active) {
    throw new Error('User not found or inactive')
  }

  const userRole = user.user_role
  const roleId = userRole?.role_id
  const roleName = userRole?.role.role_name

  if (!roleId || !roleName) {
    throw new Error('User has no assigned role')
  }

  const newPayload = { userId: user.id, name: user.name, role: roleName, roleId }
  const accessToken = signAccessToken(newPayload)
  const newRefreshToken = signRefreshToken(newPayload)

  await redis.expire(sessionKey(user.id), SESSION_LOCK_TTL)

  return { accessToken, refreshToken: newRefreshToken }
}

export async function logoutUser(refreshToken: string) {
  let userId: string | undefined

  try {
    const payload = verifyRefreshToken(refreshToken)
    userId = payload.userId
  } catch (err: any) {
    if (err?.name === 'TokenExpiredError') {
      // Signature was already validated before the expiry check failed,
      // so it's safe to decode (not verify) just to recover the userId.
      const decoded = jwt.decode(refreshToken) as { userId?: string } | null
      userId = decoded?.userId
    }
    // Any other error (bad signature, malformed) — don't trust it, leave userId undefined.
  }

  if (userId) {
    await redis.del(sessionKey(userId))
  }
}