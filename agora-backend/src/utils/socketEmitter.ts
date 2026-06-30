// src/utils/socketEmitter.ts

export function emitStockUpdate(productId: string, productName: string, quantity: number) {
  try {
    const { io } = require('../server')
    io.emit('stock-update', { productId, productName, quantity })
  } catch {
    // server not initialized yet (e.g. during tests) — skip silently
  }
}

export function emitLowStockAlert(
  productId: string,
  productName: string,
  quantity: number,
  threshold: number
) {
  try {
    const { io } = require('../server')
    io.to('staff').emit('low-stock-alert', { productId, productName, quantity, threshold })
  } catch {
    // server not initialized yet — skip silently
  }
}