import { Request, Response, NextFunction } from 'express'
import prisma from '../utils/prisma'

export function auditLog(module: string, action: string, getDescription?: (req: Request) => string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json.bind(res)

    res.json = function (body: any) {
      const user = (req as any).user
      const status = res.statusCode < 400 ? 'Success' : 'Failed'

      // fetch username async — don't block the response
      const logEntry = async () => {
        let username = null
        let userRole = user?.role ?? null

        if (user?.userId) {
          const dbUser = await prisma.user.findUnique({
            where: { id: user.userId },
            select: { name: true },
          }).catch(() => null)
          username = dbUser?.name ?? null
        }

        await prisma.auditLog.create({
          data: {
            user_id: user?.userId ?? null,
            username,
            user_role: userRole,
            module,
            action: action as any,
            description: getDescription ? getDescription(req) : `${action} on ${module}`,
            ip_address: req.ip ?? null,
            status,
          },
        }).catch((err) => console.error('[Audit] Failed to log:', err))
      }

      logEntry()
      return originalJson(body)
    }

    next()
  }
}