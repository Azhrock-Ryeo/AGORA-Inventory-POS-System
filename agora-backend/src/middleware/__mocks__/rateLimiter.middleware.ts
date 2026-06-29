import { Request, Response, NextFunction } from 'express'

export const loginRateLimiter = (
  _req: Request,
  _res: Response,
  next: NextFunction
) => next()

export const apiRateLimiter = (
  _req: Request,
  _res: Response,
  next: NextFunction
) => next()