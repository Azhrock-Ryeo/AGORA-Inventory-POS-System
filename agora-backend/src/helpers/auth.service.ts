import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt'
import { redis } from '../utils/redis'

const prisma = new PrismaClient()

const MAX_FAILED_ATTEMPTS = 5
const LOCKOUT_DURATION = 15 * 60 // 15 minutes in seconds

export async function loginUser(email: string, password: string) {
  const lockKey = `lockout:${email}`
  const attemptsKey = `attempts:${email}`

  // check if account is locked
  const isLocked = await redis.get(lockKey)
  if (isLocked) {
    const ttl = await redis.ttl(lockKey)
    const minutes = Math.ceil(ttl / 60)
    throw new Error(`Account locked. Try again in ${minutes} minute(s).`)
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: { role: true },
  })

  if (!user || !user.is_active) {
    throw new Error('Invalid credentials')
  }

  const passwordMatches = await bcrypt.compare(password, user.password_hash)

  if (!passwordMatches) {
    // increment failed attempts
    const attempts = await redis.incr(attemptsKey)
    await redis.expire(attemptsKey, LOCKOUT_DURATION)

    if (attempts >= MAX_FAILED_ATTEMPTS) {
      await redis.setex(lockKey, LOCKOUT_DURATION, '1')
      await redis.del(attemptsKey)
      throw new Error(`Too many failed attempts. Account locked for 15 minutes.`)
    }

    throw new Error(`Invalid credentials. ${MAX_FAILED_ATTEMPTS - attempts} attempt(s) remaining.`)
  }

  // clear failed attempts on successful login
  await redis.del(attemptsKey)
  await redis.del(lockKey)

  const payload = { userId: user.id, role: user.role.role_name }
  const accessToken = signAccessToken(payload)
  const refreshToken = signRefreshToken(payload)

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role.role_name,
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

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    include: { role: true },
  })

  if (!user || !user.is_active) {
    throw new Error('User not found or inactive')
  }

  const newPayload = { userId: user.id, role: user.role.role_name }
  const accessToken = signAccessToken(newPayload)
  const newRefreshToken = signRefreshToken(newPayload)

  return { accessToken, refreshToken: newRefreshToken }
}

export async function logoutUser(_refreshToken: string) {
  return
}