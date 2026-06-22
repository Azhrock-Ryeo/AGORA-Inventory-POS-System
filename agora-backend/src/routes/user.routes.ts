import { Router } from 'express'
import { protect } from '../middleware/auth.middleware'
import { allow } from '../middleware/rbac.middleware'
import { getUsers, createUser, updateUser, toggleUserStatus } from '../controllers/user.controller'

const router = Router()

router.get('/',           protect, allow('ADMIN', 'SUPER_ADMIN'), getUsers)
router.post('/',          protect, allow('ADMIN', 'SUPER_ADMIN'), createUser)
router.put('/:id',        protect, allow('ADMIN', 'SUPER_ADMIN'), updateUser)
router.patch('/:id/status', protect, allow('ADMIN', 'SUPER_ADMIN'), toggleUserStatus)

export default router