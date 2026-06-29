import express, { Request, Response } from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import cookieParser from 'cookie-parser'
import { requestLogger } from './middleware/logger.middleware'
import { apiRateLimiter } from './middleware/rateLimiter.middleware'
import authRoutes from './routes/auth.routes'
import productRoutes from './routes/product.routes'
import categoryRoutes from './routes/category.routes'
import supplierRoutes from './routes/supplier.routes'
import stockRoutes from './routes/stock.routes'
import orderRoutes from './routes/order.routes'
import transactionRoutes from './routes/transaction.routes'
import userRoutes from './routes/user.routes'
import reportRoutes from './routes/report.routes'

dotenv.config()

const app = express()

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))

app.use(express.json())
app.use(cookieParser())
app.use(requestLogger)
app.use(apiRateLimiter)

app.get('/health', (req: Request, res: Response) => {
  const timestamp = new Date().toISOString()
  res.status(200).json({ status: 'ok', timestamp })
})

app.use('/api/auth', authRoutes)
app.use('/api/products', productRoutes)
app.use('/api/categories', categoryRoutes)
app.use('/api/suppliers', supplierRoutes)
app.use('/api/stock', stockRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/transactions', transactionRoutes)
app.use('/api/users', userRoutes)
app.use('/api/reports', reportRoutes)

export default app