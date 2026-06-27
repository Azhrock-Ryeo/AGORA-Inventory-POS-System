import { enqueueAlert, AlertQueueItem } from './alertQueue'
import { sendLowStockEmail } from './emailService'
import { emitLowStockAlert } from './socketEmitter'

export async function dispatchLowStockAlert(
  productId: string,
  productName: string,
  quantity: number,
  threshold: number
): Promise<void> {
  const alert: AlertQueueItem = { productId, productName, quantity, threshold, timestamp: Date.now() }

  // 1. Queue it in Redis
  await enqueueAlert(alert)

  // 2. Emit via Socket.io (real-time toast on frontend)
  emitLowStockAlert(productId, productName, quantity, threshold)

  // 3. Send email via Resend
  await sendLowStockEmail(productName, quantity, threshold)
}