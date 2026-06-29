import { Router } from 'express'
import { protect } from '../middleware/auth.middleware'
import { apiRateLimiter } from '../middleware/rateLimiter.middleware'
import { allow } from '../middleware/rbac.middleware'
import {
  getSalesReport,
  getBestSellers,
  getInventoryMovement,
  getRevenue,
  getBillingReport,
} from '../controllers/report.controller'

const router = Router()
router.use(protect, apiRateLimiter)

const staffOnly = allow('ADMIN', 'SUPER_ADMIN', 'MANAGER')

router.get('/sales', staffOnly, getSalesReport)
router.get('/best-sellers', staffOnly, getBestSellers)
router.get('/inventory-movement', staffOnly, getInventoryMovement)
router.get('/revenue', staffOnly, getRevenue)
router.get('/billing', staffOnly, getBillingReport)

export default router