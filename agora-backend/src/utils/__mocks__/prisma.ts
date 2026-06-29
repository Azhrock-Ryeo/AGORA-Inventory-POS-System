// src/utils/__mocks__/prisma.ts

const prisma = {
  $transaction: jest.fn(),

  order: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findMany: jest.fn(),
  },

  transaction: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findMany: jest.fn(),
  },

  stockLevel: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
  },

  stockMovement: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
}

export default prisma