import { Router } from 'express'
import { protect } from '../middleware/auth.middleware'
import { apiRateLimiter } from '../middleware/rateLimiter.middleware'
import { allow } from '../middleware/rbac.middleware'
import { getUsers, createUser, updateUser, toggleUserStatus, deleteUser  } from '../controllers/user.controller'

const router = Router()

router.use(protect, apiRateLimiter)
router.delete('/:id', allow('SUPER_ADMIN'), deleteUser)
router.get('/', allow('ADMIN', 'SUPER_ADMIN'), getUsers)
router.post('/', allow('ADMIN', 'SUPER_ADMIN'), createUser)
router.put('/:id', allow('ADMIN', 'SUPER_ADMIN'), updateUser)
router.patch('/:id/status', allow('ADMIN', 'SUPER_ADMIN'), toggleUserStatus)

export default router