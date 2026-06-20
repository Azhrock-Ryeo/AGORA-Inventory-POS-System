import { Request, Response } from 'express'
import prisma from '../utils/prisma'
import { calculateDiscount } from '../services/order.service'

export async function createOrder(req: Request, res: Response) {
  try {
    const user = (req as any).user
    const { items, discount_type, discount_value } = req.body

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'items array is required' })
    }

    const result = await prisma.$transaction(async (tx) => {
      let subtotal = 0
      const orderItemsData: { product_id: string; quantity: number; unit_price: number }[] = []

      for (const item of items) {
        const product = await tx.product.findUnique({ where: { id: item.product_id } })
        if (!product) throw new Error(`PRODUCT_NOT_FOUND:${item.product_id}`)

        const stockLevel = await tx.stockLevel.findUnique({ where: { product_id: item.product_id } })
        if (!stockLevel || stockLevel.quantity < item.quantity) {
          throw new Error(`INSUFFICIENT_STOCK:${item.product_id}`)
        }

        const unitPrice = Number(product.price)
        subtotal += unitPrice * item.quantity
        orderItemsData.push({ product_id: item.product_id, quantity: item.quantity, unit_price: unitPrice })
      }

      const discount = calculateDiscount(subtotal, discount_type, discount_value)
      const total = subtotal - discount

      const order = await tx.order.create({
        data: {
          cashier_id: user.userId,
          total,
          discount,
          status: 'COMPLETED',
          items: { create: orderItemsData },
        },
        include: { items: true },
      })

      for (const item of orderItemsData) {
        await tx.stockMovement.create({
          data: {
            product_id: item.product_id,
            type: 'STOCK_OUT',
            quantity: item.quantity,
            reason: `Order ${order.id}`,
            user_id: user.userId,
          },
        })
        await tx.stockLevel.update({
          where: { product_id: item.product_id },
          data: { quantity: { decrement: item.quantity } },
        })
      }

      return order
    })

    res.status(201).json(result)
  } catch (err: any) {
    if (typeof err.message === 'string' && err.message.startsWith('PRODUCT_NOT_FOUND')) {
      return res.status(404).json({ message: `Product not found: ${err.message.split(':')[1]}` })
    }
    if (typeof err.message === 'string' && err.message.startsWith('INSUFFICIENT_STOCK')) {
      return res.status(409).json({ message: `Insufficient stock for product: ${err.message.split(':')[1]}` })
    }
    res.status(500).json({ message: 'Failed to create order' })
  }
}

export async function getOrders(req: Request, res: Response) {
  try {
    const { status, page = 1, limit = 20 } = req.query
    const where = { ...(status && { status: String(status) as any }) }

    const orders = await prisma.order.findMany({
      where,
      include: { cashier: { select: { id: true, name: true } }, items: true },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
      orderBy: { created_at: 'desc' },
    })
    const total = await prisma.order.count({ where })

    res.json({ data: orders, total, page: Number(page), limit: Number(limit) })
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch orders' })
  }
}

export async function getOrderById(req: Request, res: Response) {
  try {
    const id = String(req.params.id)
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        cashier: { select: { id: true, name: true } },
        items: { include: { product: true } },
        transaction: true,
      },
    })
    if (!order) return res.status(404).json({ message: 'Order not found' })
    res.json(order)
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch order' })
  }
}

export async function getOrderReceipt(req: Request, res: Response) {
  try {
    const id = String(req.params.id)
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        cashier: { select: { id: true, name: true } },
        items: { include: { product: { select: { id: true, name: true, sku: true } } } },
        transaction: true,
      },
    })

    if (!order) return res.status(404).json({ message: 'Order not found' })

    const subtotal = order.items.reduce(
      (sum, item) => sum + Number(item.unit_price) * item.quantity,
      0
    )

    const receipt = {
      order_id: order.id,
      date: order.created_at,
      cashier: order.cashier.name,
      items: order.items.map((item) => ({
        product_name: item.product.name,
        sku: item.product.sku,
        quantity: item.quantity,
        unit_price: item.unit_price,
        line_total: (Number(item.unit_price) * item.quantity).toFixed(2),
      })),
      subtotal: subtotal.toFixed(2),
      discount: order.discount,
      total: order.total,
      payment: order.transaction
        ? {
            method: order.transaction.payment_method,
            amount_paid: order.transaction.amount_paid,
            change: order.transaction.change,
          }
        : null,
      status: order.status,
    }

    res.json(receipt)
  } catch (err) {
    res.status(500).json({ message: 'Failed to assemble receipt' })
  }
}