type DiscountType = 'FLAT' | 'PERCENTAGE'

export function calculateDiscount(
  subtotal: number,
  discount_type?: DiscountType,
  discount_value?: number
): number {
  if (!discount_type || !discount_value || subtotal <= 0) return 0

  if (discount_value < 0) {
    throw new Error('INVALID_DISCOUNT_VALUE')
  }

  if (discount_type === 'FLAT') {
    // Cap discount at subtotal so total never goes negative
    return Math.min(discount_value, subtotal)
  }

  if (discount_type === 'PERCENTAGE') {
    if (discount_value > 100) {
      throw new Error('INVALID_DISCOUNT_PERCENTAGE')
    }
    // Cap percentage discount so total never goes negative
    return Math.min((subtotal * discount_value) / 100, subtotal)
  }

  throw new Error('INVALID_DISCOUNT_TYPE')
}