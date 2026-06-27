import { Router } from 'express'
import { protect } from '../middleware/auth.middleware'
import { apiRateLimiter } from '../middleware/rateLimiter.middleware'
import { allow } from '../middleware/rbac.middleware'
import { getAuditLogs } from '../controllers/auditLog.controller'

const router = Router()
router.use(protect, apiRateLimiter)

router.get('/', allow('ADMIN', 'SUPER_ADMIN'), getAuditLogs)

export default router