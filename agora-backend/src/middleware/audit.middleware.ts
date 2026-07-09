import { Request, Response, NextFunction } from 'express'
import prisma from '../utils/prisma'
import { emitToRoles } from '../utils/socket'

export function auditLog(
  module: string,
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'EXPORT' | 'VOID' | 'ADJUST' | 'FAILED',
  getDescription?: (req: Request) => string
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json.bind(res)

    res.json = function (body: any) {
      const user = (req as any).user
      const status = res.statusCode < 400 ? 'Success' : 'Failed'

      const logEntry = async () => {
        const log = await prisma.auditLog.create({
          data: {
            user_id: user?.userId ?? null,
            username: user?.name ?? null,
            user_role: user?.role ?? null,
            module,
            action,
            description: getDescription ? getDescription(req) : `${action} on ${module}`,
            ip_address: req.ip ?? null,
            status,
          },
        }).catch((err) => {
          console.error('[Audit] Failed to log:', err)
          return null
        })

        if (log) {
          emitToRoles(['SUPER_ADMIN', 'ADMIN'], 'audit:new', log)
        }
      }

      logEntry()
      return originalJson(body)
    }

    next()
  }
}