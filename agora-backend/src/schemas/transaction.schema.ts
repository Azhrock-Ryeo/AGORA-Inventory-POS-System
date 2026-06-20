import { z } from 'zod'

export const createTransactionSchema = z.object({
  order_id: z.string().uuid('Invalid order_id'),
  amount_paid: z.number().positive('amount_paid must be positive'),
  payment_method: z.enum(['CASH', 'CARD', 'GCASH', 'MAYA']),
})