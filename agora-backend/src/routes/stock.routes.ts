import { Router } from 'express'
import { getStockLevels, getStockMovements, stockIn, stockOut } from '../controllers/stock.controller'
import { protect } from '../middleware/auth.middleware'
import { apiRateLimiter } from '../middleware/rateLimiter.middleware'
import { auditLog } from '../middleware/audit.middleware'

const router = Router()
router.use(protect, apiRateLimiter)

router.get('/levels', getStockLevels)
router.get('/movements', getStockMovements)
router.post('/in',
  auditLog('Stock Module', 'CREATE', (req) => `Stock In: ${req.body.quantity} units — reason: ${req.body.reason ?? 'none'}`),
  stockIn
)
router.post('/out',
  auditLog('Stock Module', 'CREATE', (req) => `Stock Out: ${req.body.quantity} units — reason: ${req.body.reason ?? 'none'}`),
  stockOut
)

export default router