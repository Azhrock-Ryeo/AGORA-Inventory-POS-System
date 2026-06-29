import { Router } from 'express'
import { getProducts, getProductById, createProduct, updateProduct, deleteProduct, lookupProduct } from '../controllers/product.controller'
import { protect } from '../middleware/auth.middleware'
import { apiRateLimiter } from '../middleware/rateLimiter.middleware'
import { auditLog } from '../middleware/audit.middleware'

const router = Router()
router.use(protect, apiRateLimiter)

router.get('/lookup', lookupProduct)
router.get('/', getProducts)
router.get('/:id', getProductById)
router.post('/', auditLog('Inventory Module', 'CREATE', (req) => `Created product: ${req.body.name}`), createProduct)
router.put('/:id', auditLog('Inventory Module', 'UPDATE', (req) => `Updated product: ${req.params.id}`), updateProduct)
router.delete('/:id', auditLog('Inventory Module', 'DELETE', (req) => `Deleted product: ${req.params.id}`), deleteProduct)

export default router