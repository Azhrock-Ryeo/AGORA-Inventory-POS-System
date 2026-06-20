import { z } from 'zod'

export const stockMoveSchema = z.object({
  product_id: z.string().uuid('Invalid product_id'),
  quantity: z.number().int().positive('Quantity must be a positive integer'),
  reason: z.string().optional(),
})