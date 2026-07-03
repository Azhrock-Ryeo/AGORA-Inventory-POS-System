import { Router } from 'express'
import { protect } from '../middleware/auth.middleware'
import { apiRateLimiter } from '../middleware/rateLimiter.middleware'
import { allow } from '../middleware/rbac.middleware'
import { validate } from '../middleware/validate.middleware'
import { createOrderSchema } from '../schemas/order.schema'
import { createOrder, getOrders, getOrderById, getOrderReceipt, downloadReceiptPDF } from '../controllers/order.controller'
import { auditLog } from '../middleware/audit.middleware'

const router = Router()
router.use(protect, apiRateLimiter)

router.post('/',
  allow('CASHIER', 'MANAGER', 'ADMIN', 'SUPER_ADMIN'),
  validate(createOrderSchema),
  auditLog('Order Module', 'CREATE', (req) => `Created new order`),
  createOrder
)

router.get('/', getOrders)

// ✅ CRITICAL: Specific routes MUST come BEFORE parameterized routes
// Otherwise /:id catches "receipt" as an ID
router.get('/:id/receipt/pdf', downloadReceiptPDF)  // ← BEFORE /:id
router.get('/:id/receipt', getOrderReceipt)         // ← BEFORE /:id
router.get('/:id', getOrderById)                    // ← AFTER specific routes

export default router