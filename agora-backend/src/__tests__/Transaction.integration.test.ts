// src/__tests__/transaction.integration.test.ts
// AGORA-165 — Integration tests for sales transaction flow

import request from 'supertest'
import app from '../app'

// Must match the path used inside transaction.controller.ts
jest.mock('../utils/prisma')

// eslint-disable-next-line @typescript-eslint/no-var-requires
const prisma = require('../utils/prisma').default


// Mock auth middleware so requests aren't rejected with 401
// ADD these two:
jest.mock('../middleware/auth.middleware', () => ({
  protect: (_req: any, _res: any, next: any) => next(),
}))

jest.mock('../middleware/validate.middleware', () => ({
  validate: () => (_req: any, _res: any, next: any) => next(),
}))

// Mock rate limiter so rapid test requests aren't blocked
jest.mock('../middleware/rateLimiter.middleware', () => ({
  apiRateLimiter:   (_req: any, _res: any, next: any) => next(),
  loginRateLimiter: (_req: any, _res: any, next: any) => next(),
}))

// Mock Redis to prevent open handle keeping Jest alive
jest.mock('../utils/redis', () => ({
  default: { on: jest.fn(), get: jest.fn(), set: jest.fn(), quit: jest.fn() },
}))

// Shorthand accessors
const orderFindUnique = () => prisma.order.findUnique as jest.Mock
const txnFindUnique = () => prisma.transaction.findUnique as jest.Mock
const txnCreate = () => prisma.transaction.create as jest.Mock

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockOrder = (overrides = {}) => ({
  id: 'order-001',
  total: 500,
  status: 'PENDING',
  created_at: new Date().toISOString(),
  ...overrides,
})

const mockTransaction = (overrides = {}) => ({
  id: 'txn-001',
  order_id: 'order-001',
  amount_paid: 600,
  payment_method: 'CASH',
  change: 100,
  status: 'COMPLETED',
  created_at: new Date().toISOString(),
  ...overrides,
})

// ---------------------------------------------------------------------------
// POST /api/transactions
// ---------------------------------------------------------------------------

describe('POST /api/transactions', () => {
  it('201 — creates a transaction with correct change when amount_paid > total', async () => {
    orderFindUnique().mockResolvedValue(mockOrder({ total: 500 }) as any)
    txnFindUnique().mockResolvedValue(null)
    txnCreate().mockResolvedValue(
      mockTransaction({ amount_paid: 600, change: 100 }) as any
    )

    const res = await request(app)
      .post('/api/transactions')
      .send({ order_id: 'order-001', amount_paid: 600, payment_method: 'CASH' })

    expect(res.status).toBe(201)
    expect(res.body.status).toBe('COMPLETED')
    expect(res.body.change).toBe(100)
    expect(res.body.order_id).toBe('order-001')
  })

  it('201 — creates a transaction when amount_paid exactly equals order total (zero change)', async () => {
    orderFindUnique().mockResolvedValue(mockOrder({ total: 500 }) as any)
    txnFindUnique().mockResolvedValue(null)
    txnCreate().mockResolvedValue(
      mockTransaction({ amount_paid: 500, change: 0 }) as any
    )

    const res = await request(app)
      .post('/api/transactions')
      .send({ order_id: 'order-001', amount_paid: 500, payment_method: 'CARD' })

    expect(res.status).toBe(201)
    expect(res.body.change).toBe(0)
  })

  it('400 — rejects when order_id is missing', async () => {
    const res = await request(app)
      .post('/api/transactions')
      .send({ amount_paid: 600, payment_method: 'CASH' })

    expect(res.status).toBe(400)
    expect(res.body.message).toMatch(/order_id/i)
  })

  it('400 — rejects when amount_paid is missing', async () => {
    const res = await request(app)
      .post('/api/transactions')
      .send({ order_id: 'order-001', payment_method: 'CASH' })

    expect(res.status).toBe(400)
    expect(res.body.message).toMatch(/amount_paid/i)
  })

  it('400 — rejects when payment_method is missing', async () => {
    const res = await request(app)
      .post('/api/transactions')
      .send({ order_id: 'order-001', amount_paid: 600 })

    expect(res.status).toBe(400)
    expect(res.body.message).toMatch(/payment_method/i)
  })

  it('400 — rejects when amount_paid is less than order total', async () => {
    orderFindUnique().mockResolvedValue(mockOrder({ total: 500 }) as any)
    txnFindUnique().mockResolvedValue(null)

    const res = await request(app)
      .post('/api/transactions')
      .send({ order_id: 'order-001', amount_paid: 300, payment_method: 'CASH' })

    expect(res.status).toBe(400)
    expect(res.body.message).toMatch(/less than/i)
  })

  it('404 — returns 404 when order does not exist', async () => {
    orderFindUnique().mockResolvedValue(null)

    const res = await request(app)
      .post('/api/transactions')
      .send({ order_id: 'nonexistent', amount_paid: 600, payment_method: 'CASH' })

    expect(res.status).toBe(404)
    expect(res.body.message).toMatch(/order not found/i)
  })

  it('409 — rejects duplicate transaction for the same order', async () => {
    orderFindUnique().mockResolvedValue(mockOrder() as any)
    txnFindUnique().mockResolvedValue(mockTransaction() as any)

    const res = await request(app)
      .post('/api/transactions')
      .send({ order_id: 'order-001', amount_paid: 600, payment_method: 'CASH' })

    expect(res.status).toBe(409)
    expect(res.body.message).toMatch(/already recorded/i)
  })

  it('500 — returns 500 when Prisma throws unexpectedly', async () => {
    orderFindUnique().mockRejectedValue(new Error('DB connection lost'))

    const res = await request(app)
      .post('/api/transactions')
      .send({ order_id: 'order-001', amount_paid: 600, payment_method: 'CASH' })

    expect(res.status).toBe(500)
    expect(res.body.message).toMatch(/failed to record/i)
  })
})

// ---------------------------------------------------------------------------
// GET /api/transactions/:orderId
// ---------------------------------------------------------------------------

describe('GET /api/transactions/:orderId', () => {
  it('200 — returns transaction with embedded order when found', async () => {
    txnFindUnique().mockResolvedValue({
      ...mockTransaction(),
      order: mockOrder(),
    } as any)

    const res = await request(app).get('/api/transactions/order-001')

    expect(res.status).toBe(200)
    expect(res.body.order_id).toBe('order-001')
    expect(res.body.order).toBeDefined()
    expect(res.body.order.id).toBe('order-001')
  })

  it('200 — response includes payment_method and status fields', async () => {
    txnFindUnique().mockResolvedValue({
      ...mockTransaction({ payment_method: 'CARD', status: 'COMPLETED' }),
      order: mockOrder(),
    } as any)

    const res = await request(app).get('/api/transactions/order-001')

    expect(res.status).toBe(200)
    expect(res.body.payment_method).toBe('CARD')
    expect(res.body.status).toBe('COMPLETED')
  })

  it('404 — returns 404 when no transaction exists for the order', async () => {
    txnFindUnique().mockResolvedValue(null)

    const res = await request(app).get('/api/transactions/order-999')

    expect(res.status).toBe(404)
    expect(res.body.message).toMatch(/transaction not found/i)
  })

  it('500 — returns 500 when Prisma throws on fetch', async () => {
    txnFindUnique().mockRejectedValue(new Error('Timeout'))

    const res = await request(app).get('/api/transactions/order-001')

    expect(res.status).toBe(500)
    expect(res.body.message).toMatch(/failed to fetch/i)
  })
})
