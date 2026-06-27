import { Request, Response } from 'express'
import prisma from '../utils/prisma'

export async function getAuditLogs(req: Request, res: Response) {
  try {
    const {
      search,
      module,
      action,
      status,
      date_from,
      date_to,
      page = 1,
      limit = 50,
    } = req.query

    const pageNum = Number(page)
    const limitNum = Number(limit)

    const where: any = {
      ...(module && { module: String(module) }),
      ...(action && { action: String(action) as any }),
      ...(status && { status: String(status) }),
      ...(search && {
        OR: [
          { description: { contains: String(search), mode: 'insensitive' } },
          { username: { contains: String(search), mode: 'insensitive' } },
        ],
      }),
      ...((date_from || date_to) && {
        created_at: {
          ...(date_from && { gte: new Date(String(date_from)) }),
          ...(date_to && { lte: new Date(String(date_to) + 'T23:59:59') }),
        },
      }),
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.auditLog.count({ where }),
    ])

    res.json({ data: logs, total, page: pageNum, limit: limitNum })
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch audit logs' })
  }
}