import { RateLimiterRedis } from 'rate-limiter-flexible'
import { redis } from '../utils/redis'
import { Request, Response, NextFunction } from 'express'

// Lazy initialization — avoids crash when redis isn't connected yet (e.g. during tests)
let loginLimiter: RateLimiterRedis | null = null
let apiLimiter: RateLimiterRedis | null = null

function getLoginLimiter(): RateLimiterRedis {
  if (!loginLimiter) {
    loginLimiter = new RateLimiterRedis({
      storeClient: redis,
      keyPrefix: 'rl:login',
      points: 50,
      duration: 900,
      blockDuration: 60,
    })
  }
  return loginLimiter
}

function getApiLimiter(): RateLimiterRedis {
  if (!apiLimiter) {
    apiLimiter = new RateLimiterRedis({
      storeClient: redis,
      keyPrefix: 'rl:api',
      points: 100,
      duration: 60,
    })
  }
  return apiLimiter
}

export const loginRateLimiter = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await getLoginLimiter().consume(req.ip!)
    next()
  } catch {
    res.status(429).json({
      success: false,
      message: 'Too many login attempts. Try again in 15 minutes.',
    })
  }
}

export const apiRateLimiter = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const key = (req as any).user?.userId ?? req.ip!
    await getApiLimiter().consume(key)
    next()
  } catch {
    res.status(429).json({
      success: false,
      message: 'Too many requests. Slow down.',
    })
  }
}