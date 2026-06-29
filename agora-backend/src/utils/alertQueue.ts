import { redis } from './redis'

const ALERT_QUEUE_KEY = 'queue:low-stock-alerts'

export interface AlertQueueItem {
  productId: string
  productName: string
  quantity: number
  threshold: number
  timestamp: number
}

export async function enqueueAlert(alert: AlertQueueItem): Promise<void> {
  await redis.lpush(ALERT_QUEUE_KEY, JSON.stringify(alert))
  await redis.expire(ALERT_QUEUE_KEY, 86400) // 24 hour TTL
}

export async function dequeueAlert(): Promise<AlertQueueItem | null> {
  const val = await redis.rpop(ALERT_QUEUE_KEY)
  return val ? JSON.parse(val) : null
}

export async function peekQueue(): Promise<AlertQueueItem[]> {
  const items = await redis.lrange(ALERT_QUEUE_KEY, 0, -1)
  return items.map((i) => JSON.parse(i))
}

export async function clearQueue(): Promise<void> {
  await redis.del(ALERT_QUEUE_KEY)
}