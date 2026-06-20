import { z } from 'zod'

export const createSupplierSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  contact_name: z.string().optional(),
  email: z.string().email('Invalid email').optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
})

export const updateSupplierSchema = createSupplierSchema.partial()