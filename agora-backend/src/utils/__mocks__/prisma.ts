const prismaMock = {
  user: {
    findUnique: jest.fn().mockResolvedValue({ id: 'user-001', name: 'Test User' }),
    findMany:   jest.fn().mockResolvedValue([]),
    create:     jest.fn().mockResolvedValue({}),
    update:     jest.fn().mockResolvedValue({}),
  },
  auditLog: {
    create: jest.fn().mockResolvedValue({}),
  },
  product: {
    findUnique: jest.fn().mockResolvedValue({ id: 'prod-001', name: 'Test Product' }),
    findMany:   jest.fn().mockResolvedValue([]),
    create:     jest.fn().mockResolvedValue({}),
    update:     jest.fn().mockResolvedValue({}),
  },
  stockLevel: {
    findUnique: jest.fn().mockResolvedValue({
      product_id:           'prod-001',
      quantity:             25,
      low_stock_threshold:  10,
      high_stock_threshold: 100,
    }),
    findMany: jest.fn().mockResolvedValue([]),
    update:   jest.fn().mockResolvedValue({
      product_id:           'prod-001',
      quantity:             25,
      low_stock_threshold:  10,
      high_stock_threshold: 100,
    }),
    count: jest.fn().mockResolvedValue(0),
  },
  stockMovement: {
    create:   jest.fn().mockResolvedValue({ id: 'mov-001' }),
    findMany: jest.fn().mockResolvedValue([]),
    count:    jest.fn().mockResolvedValue(0),
  },
  order: {
    findUnique: jest.fn().mockResolvedValue({ id: 'order-001', total: 100 }),
    findMany:   jest.fn().mockResolvedValue([]),
    create:     jest.fn().mockResolvedValue({}),
    update:     jest.fn().mockResolvedValue({}),
  },
  transaction: {
    findUnique: jest.fn().mockResolvedValue(null),
    findMany:   jest.fn().mockResolvedValue([]),
    create:     jest.fn().mockResolvedValue({ id: 'txn-001' }),
  },
  $transaction: jest.fn().mockImplementation((cb: any) => cb(prismaMock)),
  $disconnect:  jest.fn(),
}

export default prismaMock