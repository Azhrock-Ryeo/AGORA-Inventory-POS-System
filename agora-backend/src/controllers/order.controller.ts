import { Request, Response } from 'express'
import prisma from '../utils/prisma'
import { calculateDiscount } from '../helpers/order.service'
import PDFDocument from 'pdfkit'

export async function createOrder(req: Request, res: Response) {
  try {
    const user = (req as any).user
    const { items, discount_type, discount_value, amount_paid, payment_method = 'CASH' } = req.body

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'items array is required' })
    }

    const normalisedDiscountType = discount_type
      ? (String(discount_type).toUpperCase() as 'FLAT' | 'PERCENTAGE')
      : undefined

    const orderId = await prisma.$transaction(
      async (tx) => {
        const productIds = items.map((i: any) => i.product_id)

        const [products, stockLevels] = await Promise.all([
          tx.product.findMany({ where: { id: { in: productIds } } }),
          tx.stockLevel.findMany({ where: { product_id: { in: productIds } } }),
        ])

        const productMap = new Map(products.map((p) => [p.id, p]))
        const stockMap = new Map(stockLevels.map((s) => [s.product_id, s]))

        let subtotal = 0
        const orderItemsData: { product_id: string; quantity: number; unit_price: number }[] = []

        for (const item of items) {
          const product = productMap.get(item.product_id)
          if (!product) throw new Error(`PRODUCT_NOT_FOUND:${item.product_id}`)

          const stockLevel = stockMap.get(item.product_id)
          if (!stockLevel || stockLevel.quantity < item.quantity) {
            throw new Error(`INSUFFICIENT_STOCK:${item.product_id}`)
          }

          const unitPrice = Number(product.price)
          subtotal += unitPrice * item.quantity
          orderItemsData.push({ product_id: item.product_id, quantity: item.quantity, unit_price: unitPrice })
        }

        const discount = calculateDiscount(subtotal, normalisedDiscountType, discount_value)
        const total = Math.max(0, subtotal - discount)

        const paid = amount_paid !== undefined && amount_paid !== null 
          ? Number(amount_paid) 
          : total

        if (paid < total) {
          throw new Error(`INSUFFICIENT_PAYMENT:${paid}:${total}`)
        }

        const order = await tx.order.create({
          data: {
            cashier_id: user.userId,
            total,
            discount,
            status: 'COMPLETED',
            items: { create: orderItemsData },
          },
        })

        await tx.transaction.create({
          data: {
            order_id: order.id,
            amount_paid: paid,
            change: paid - total,
            payment_method: String(payment_method).toUpperCase() as any,
            status: 'COMPLETED',
          },
        })

        await tx.stockMovement.createMany({
          data: orderItemsData.map((item) => ({
            product_id: item.product_id,
            type: 'STOCK_OUT',
            quantity: item.quantity,
            reason: `Order ${order.id}`,
            user_id: user.userId,
          })),
        })

        const caseStatements = orderItemsData
          .map((item) => `WHEN '${item.product_id}' THEN quantity - ${item.quantity}`)
          .join(' ')
        const productIdList = orderItemsData.map((item) => `'${item.product_id}'`).join(',')

        await tx.$executeRawUnsafe(`
          UPDATE "StockLevel" 
          SET quantity = CASE product_id ${caseStatements} END,
              "updated_at" = NOW()
          WHERE product_id IN (${productIdList})
        `)

        return order.id
      },
      { timeout: 15000, maxWait: 5000 }
    )

    const fullOrder = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        cashier: { select: { id: true, name: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, sku: true } },
          },
        },
        transaction: true,
      },
    })

    res.status(201).json(fullOrder)
  } catch (err: any) {
    if (typeof err.message === 'string' && err.message.startsWith('PRODUCT_NOT_FOUND')) {
      return res.status(404).json({ message: `Product not found: ${err.message.split(':')[1]}` })
    }
    if (typeof err.message === 'string' && err.message.startsWith('INSUFFICIENT_STOCK')) {
      return res.status(409).json({ message: `Insufficient stock for product: ${err.message.split(':')[1]}` })
    }
    if (typeof err.message === 'string' && err.message.startsWith('INSUFFICIENT_PAYMENT')) {
      const [, paid, total] = err.message.split(':')
      return res.status(400).json({ message: `Payment insufficient. Paid: ₱${paid}, Total: ₱${total}` })
    }
    if (typeof err.message === 'string' && err.message === 'INVALID_DISCOUNT_PERCENTAGE') {
      return res.status(400).json({ message: 'Discount percentage must be between 0 and 100' })
    }
    console.error(err)
    res.status(500).json({ message: 'Failed to create order' })
  }
}

export async function getOrders(req: Request, res: Response) {
  try {
    const { status, page = 1, limit = 20, date, search } = req.query
    const where: any = {}
    if (status) where.status = String(status)
    if (date) {
      const start = new Date(String(date))
      const end = new Date(start)
      end.setDate(end.getDate() + 1)
      where.created_at = { gte: start, lt: end }
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          cashier: { select: { id: true, name: true } },
          items: {
            include: {
              product: { select: { id: true, name: true, sku: true } },
            },
          },
        },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        orderBy: { created_at: 'desc' },
      }),
      prisma.order.count({ where }),
    ])

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

// ============================================================
// FIXED PDF RECEIPT — Proper formatting with PDFKit
// ============================================================
export async function downloadReceiptPDF(req: Request, res: Response) {
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

    const doc = new PDFDocument({ size: 'A4', margin: 50 })
    const filename = `receipt-${order.id.slice(-8)}.pdf`

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    doc.pipe(res)

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right
    const leftX = doc.page.margins.left
    const rightX = doc.page.width - doc.page.margins.right

    // ── Helper: draw a clean line ──
    const drawLine = (y: number) => {
      doc.moveTo(leftX, y)
        .lineTo(rightX, y)
        .strokeColor('#cccccc')
        .lineWidth(0.5)
        .stroke()
    }

    // ── Header ──
    doc.fontSize(24).font('Helvetica-Bold').text('AGORA POS', leftX, 50, { align: 'center', width: pageWidth })
    doc.fontSize(10).font('Helvetica').text('Official Receipt', leftX, doc.y + 2, { align: 'center', width: pageWidth })
    doc.moveDown(1.5)

    // ── Order Info ──
    doc.fontSize(10).font('Helvetica')
    const infoStartY = doc.y
    doc.text(`Order ID: ${order.id}`, leftX, infoStartY)
    doc.text(`Date: ${new Date(order.created_at).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}`, leftX, doc.y + 4)
    doc.text(`Cashier: ${order.cashier.name}`, leftX, doc.y + 4)
    doc.moveDown(1)

    // ── Separator ──
    drawLine(doc.y)
    doc.moveDown(0.5)

    // ── Items Table Header ──
    const colItem = leftX
    const colQty = leftX + pageWidth * 0.55
    const colPrice = leftX + pageWidth * 0.70
    const colTotal = rightX

// Header row
doc.fontSize(9).font('Helvetica-Bold')
const headerY = doc.y
doc.text('Item', colItem, headerY, { width: colQty - colItem - 5 })
doc.text('Qty', colQty, headerY, { width: colPrice - colQty - 5, align: 'right' })
doc.text('Price', colPrice, headerY, { width: (colTotal - 60) - colPrice - 5, align: 'right' })
doc.text('Total', colTotal - 60, headerY, { width: 60, align: 'right' })
doc.y = headerY + 14

    // ── Separator ──
    drawLine(doc.y)
    doc.moveDown(0.3)

    // ── Items ──
    doc.fontSize(9).font('Helvetica')
order.items.forEach((item) => {
  const lineTotal = Number(item.unit_price) * item.quantity
  const itemY = doc.y
  doc.text(item.product.name, colItem, itemY, { width: colQty - colItem - 5 })
  const nameHeight = doc.y - itemY
  doc.text(String(item.quantity), colQty, itemY, { width: colPrice - colQty - 5, align: 'right' })
  doc.text(`₱${Number(item.unit_price).toFixed(2)}`, colPrice, itemY, { width: (colTotal - 60) - colPrice - 5, align: 'right' })
  doc.text(`₱${lineTotal.toFixed(2)}`, colTotal - 60, itemY, { width: 60, align: 'right' })
  doc.y = itemY + Math.max(nameHeight, 12) + 4
})

    // ── Separator ──
    drawLine(doc.y)
    doc.moveDown(0.5)

    // ── Totals (right-aligned) ──
    const totalsX = leftX + pageWidth * 0.45
    const totalsValueX = rightX

    // Totals block
doc.fontSize(10).font('Helvetica')
let rowY = doc.y
doc.text('Subtotal:', totalsX, rowY, { width: totalsValueX - totalsX - 5 })
doc.text(`₱${subtotal.toFixed(2)}`, totalsValueX - 80, rowY, { width: 80, align: 'right' })
doc.y = rowY + 16

if (Number(order.discount) > 0) {
  rowY = doc.y
  doc.text('Discount:', totalsX, rowY, { width: totalsValueX - totalsX - 5 })
  doc.text(`-₱${Number(order.discount).toFixed(2)}`, totalsValueX - 80, rowY, { width: 80, align: 'right' })
  doc.y = rowY + 16
}

doc.fontSize(12).font('Helvetica-Bold')
rowY = doc.y
doc.text('TOTAL:', totalsX, rowY, { width: totalsValueX - totalsX - 5 })
doc.text(`₱${Number(order.total).toFixed(2)}`, totalsValueX - 80, rowY, { width: 80, align: 'right' })
doc.y = rowY + 20

    // ── Separator ──
    drawLine(doc.y)
    doc.moveDown(0.5)

    // ── Payment Info ──
    if (order.transaction) {
      doc.fontSize(10).font('Helvetica')
      doc.text(`Payment Method: ${order.transaction.payment_method}`, leftX, doc.y)
      doc.moveDown(0.3)
      doc.text(`Amount Paid: ₱${Number(order.transaction.amount_paid).toFixed(2)}`, leftX, doc.y)
      doc.moveDown(0.3)
      doc.text(`Change: ₱${Number(order.transaction.change).toFixed(2)}`, leftX, doc.y)
      doc.moveDown(1)
    }

    // ── Footer ──
    doc.fontSize(10).font('Helvetica-Oblique')
    doc.text('Thank you for your purchase!', leftX, doc.y, { align: 'center', width: pageWidth })
    doc.moveDown(0.3)
    doc.text('Please come again!', leftX, doc.y, { align: 'center', width: pageWidth })

    doc.end()
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Failed to generate PDF receipt' })
  }
}