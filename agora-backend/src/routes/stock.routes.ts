import { Router } from 'express'
import { protect } from '../middleware/auth.middleware'
import { allow } from '../middleware/rbac.middleware'
import { validate } from '../middleware/validate.middleware'
import { stockMoveSchema } from '../schemas/stock.schema'
import {
  stockIn,
  stockOut,
  getStockLevels,
  getStockMovements,
} from '../controllers/stock.controller'

const router = Router()

router.post('/in',  protect, allow('ADMIN', 'SUPER_ADMIN', 'MANAGER'), validate(stockMoveSchema), stockIn)
router.post('/out', protect, allow('ADMIN', 'SUPER_ADMIN', 'MANAGER'), validate(stockMoveSchema), stockOut)
router.get('/levels',    protect, getStockLevels)
router.get('/movements', protect, getStockMovements)

export default router