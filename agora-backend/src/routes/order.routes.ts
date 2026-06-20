import { Router } from 'express'
import { protect } from '../middleware/auth.middleware'
import { allow } from '../middleware/rbac.middleware'
import { validate } from '../middleware/validate.middleware'
import { createOrderSchema } from '../schemas/order.schema'
import { createOrder, getOrders, getOrderById, getOrderReceipt } from '../controllers/order.controller'

const router = Router()

router.post('/',   protect, allow('CASHIER', 'MANAGER', 'ADMIN', 'SUPER_ADMIN'), validate(createOrderSchema), createOrder)
router.get('/',    protect, getOrders)
router.get('/:id', protect, getOrderById)
router.get('/:id/receipt', protect, getOrderReceipt)

export default router