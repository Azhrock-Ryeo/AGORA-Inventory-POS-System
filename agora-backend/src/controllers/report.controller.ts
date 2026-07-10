import { Request, Response } from 'express'
import prisma from '../utils/prisma'

// ── helpers ───────────────────────────────────────────────────────────────────
function getPeriodRange(period: string): { start: Date; end: Date; groupBy: 'day' | 'week' | 'month' } {
  const now = new Date()
  let start: Date
  let groupBy: 'day' | 'week' | 'month' = 'day'

  if (period === 'weekly') {
    start = new Date(now)
    start.setDate(now.getDate() - 6)
    groupBy = 'day'
  } else if (period === 'monthly') {
    start = new Date(now.getFullYear(), now.getMonth(), 1)
    groupBy = 'day'
  } else {
    // daily — just today
    start = new Date(now)
    groupBy = 'day'
  }

  start.setHours(0, 0, 0, 0)
  return { start, end: now, groupBy }
}

function formatLabel(date: Date): string {
  return date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
}

// ── AGORA-113: GET /reports/sales?period= ────────────────────────────────────
export async function getSalesReport(req: Request, res: Response) {
  try {
    const period = String(req.query.period ?? 'daily')
    const { start, end } = getPeriodRange(period)

    const orders = await prisma.order.findMany({
      where: {
        status: 'COMPLETED',
        created_at: { gte: start, lte: end },
      },
      select: { total: true, created_at: true },
      orderBy: { created_at: 'asc' },
    })

    // group by day
    const map: Record<string, { revenue: number; orders: number }> = {}
    const cursor = new Date(start)
    while (cursor <= end) {
      map[formatLabel(new Date(cursor))] = { revenue: 0, orders: 0 }
      cursor.setDate(cursor.getDate() + 1)
    }

    for (const order of orders) {
      const label = formatLabel(new Date(order.created_at))
      if (map[label]) {
        map[label].revenue += Number(order.total)
        map[label].orders += 1
      }
    }

    const data = Object.entries(map).map(([label, v]) => ({ label, ...v }))
    res.json({ data })
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch sales report' })
  }
}

// ── AGORA-114: GET /reports/best-sellers ─────────────────────────────────────
export async function getBestSellers(req: Request, res: Response) {
  try {
    const period = String(req.query.period ?? 'monthly')
    const { start, end } = getPeriodRange(period)

    const items = await prisma.orderItem.groupBy({
      by: ['product_id'],
      where: {
        order: {
          status: 'COMPLETED',
          created_at: { gte: start, lte: end },
        },
      },
      _sum: { quantity: true, unit_price: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 10,
    })

    const productIds = items.map((i) => i.product_id)
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true },
    })

    const productMap = Object.fromEntries(products.map((p) => [p.id, p.name]))

    const data = items.map((i) => ({
      product_id: i.product_id,
      name: productMap[i.product_id] ?? i.product_id,
      qty: i._sum.quantity ?? 0,
      revenue: Number(i._sum.unit_price ?? 0) * (i._sum.quantity ?? 0),
    }))

    res.json({ data })
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch best sellers' })
  }
}

// ── AGORA-115: GET /reports/inventory-movement ───────────────────────────────
export async function getInventoryMovement(req: Request, res: Response) {
  try {
    const period = String(req.query.period ?? 'daily')
    const { start, end } = getPeriodRange(period)

    const movements = await prisma.stockMovement.findMany({
      where: { created_at: { gte: start, lte: end } },
      select: { type: true, quantity: true, created_at: true },
      orderBy: { created_at: 'asc' },
    })

    const map: Record<string, { label: string; stock_in: number; stock_out: number }> = {}
    const cursor = new Date(start)
    while (cursor <= end) {
      const label = formatLabel(new Date(cursor))
      map[label] = { label, stock_in: 0, stock_out: 0 }
      cursor.setDate(cursor.getDate() + 1)
    }

    for (const m of movements) {
      const label = formatLabel(new Date(m.created_at))
      if (map[label]) {
        if (m.type === 'STOCK_IN') map[label].stock_in += m.quantity
        else map[label].stock_out += m.quantity
      }
    }

    const data = Object.values(map)
    res.json({ data })
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch inventory movement' })
  }
}

// ── AGORA-116: GET /reports/revenue ──────────────────────────────────────────
export async function getRevenue(req: Request, res: Response) {
  try {
    const period = String(req.query.period ?? 'daily')
    const { start, end } = getPeriodRange(period)

    const orders = await prisma.order.findMany({
      where: {
        status: 'COMPLETED',
        created_at: { gte: start, lte: end },
      },
      select: { total: true },
    })

    const total_revenue = orders.reduce((sum, o) => sum + Number(o.total), 0)
    const total_orders = orders.length
    const avg_order_value = total_orders > 0 ? total_revenue / total_orders : 0

    res.json({
      data: {
        total_revenue,
        total_orders,
        avg_order_value,
        period,
      },
    })
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch revenue' })
  }
}

// ── billing report (keep existing) ───────────────────────────────────────────
export async function getBillingReport(req: Request, res: Response) {
  try {
    const { date, start_date, end_date } = req.query
    let dateFilter: any = {}
    if (date) {
      const start = new Date(String(date))
      const end = new Date(start)
      end.setDate(end.getDate() + 1)
      dateFilter = { gte: start, lt: end }
    } else if (start_date && end_date) {
      dateFilter = { gte: new Date(String(start_date)), lt: new Date(String(end_date)) }
    } else {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      dateFilter = { gte: today, lt: tomorrow }
    }

    const transactions = await prisma.transaction.findMany({
      where: { created_at: dateFilter },
      include: {
        order: {
          include: {
            cashier: { select: { id: true, name: true } },
            items: { include: { product: { select: { id: true, name: true, sku: true } } } },
          },
        },
      },
      orderBy: { created_at: 'asc' },
    })

    const grand_total = transactions.reduce((sum, t) => sum + Number(t.order.total), 0)

    res.json({
      date: date ?? `${start_date} to ${end_date}`,
      transaction_count: transactions.length,
      grand_total: grand_total.toFixed(2),
      transactions: transactions.map((t) => ({
        transaction_id: t.id,
        order_id: t.order_id,
        created_at: t.created_at,
        cashier: t.order.cashier.name,
        total: t.order.total,
        payment_method: t.payment_method,
        amount_paid: t.amount_paid,
        change: t.change,
        status: t.status,
      })),
    })
  } catch (err) {
    res.status(500).json({ message: 'Failed to generate billing report' })
  }
}