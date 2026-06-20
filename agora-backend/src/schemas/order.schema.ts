import { z } from 'zod'

export const createOrderSchema = z.object({
  items: z.array(
    z.object({
      product_id: z.string().uuid('Invalid product_id'),
      quantity: z.number().int().positive('Quantity must be a positive integer'),
    })
  ).min(1, 'At least one item is required'),
  discount_type: z.enum(['FLAT', 'PERCENTAGE']).optional(),
  discount_value: z.number().nonnegative().optional(),
})