import { Request, Response } from 'express'
import prisma from '../utils/prisma'
import { getCache, setCache, invalidateCache, invalidateCachePattern } from '../utils/redis'

export async function getProducts(req: Request, res: Response) {
  try {
    const { search, category_id, status, page = 1, limit = 20 } = req.query

    const pageNum = Number(page)
    const limitNum = Number(limit)

    const cacheKey = `products:list:page=${pageNum}:limit=${limitNum}:search=${search ?? ''}:category=${category_id ?? ''}:status=${status ?? ''}`

    const cached = await getCache<any>(cacheKey)
    if (cached) return res.json(cached)

    // ✅ FIX: Use raw query for case-insensitive search if citext not available
    // Fallback: use LOWER() comparison which works on all PostgreSQL setups
    const where: any = {}

    if (search) {
      const searchStr = String(search).trim()
      // Search across name, sku, and barcode
      where.OR = [
        { name: { contains: searchStr, mode: 'insensitive' } },
        { sku: { contains: searchStr, mode: 'insensitive' } },
        { barcode: { contains: searchStr, mode: 'insensitive' } },
      ]
    }

    if (category_id) where.category_id = String(category_id)
    if (status) where.status = String(status).toUpperCase() as any

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: { category: true, supplier: true, stock_level: true },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        orderBy: { name: 'asc' },
      }),
      prisma.product.count({ where }),
    ])

    const response = { data: products, total, page: pageNum, limit: limitNum }

    await setCache(cacheKey, response, 60)

    res.json(response)
  } catch (err) {
    console.error('getProducts error:', err)
    res.status(500).json({ message: 'Failed to fetch products' })
  }
}

export async function getProductById(req: Request, res: Response) {
  try {
    const id = String(req.params.id)
    const product = await prisma.product.findUnique({
      where: { id },
      include: { category: true, supplier: true, stock_level: true },
    })
    if (!product) return res.status(404).json({ message: 'Product not found' })
    res.json(product)
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch product' })
  }
}

export async function createProduct(req: Request, res: Response) {
  try {
    const { name, sku, barcode, price, category_id, supplier_id } = req.body

    // ✅ Validate required fields
    if (!name || !sku || !price || !category_id) {
      return res.status(400).json({ message: 'Name, SKU, price, and category_id are required' })
    }

    const existing = await prisma.product.findUnique({ where: { sku } })
    if (existing) return res.status(409).json({ message: 'SKU already exists' })

    // ✅ Auto-generate barcode if not provided (for QR scanning)
    const finalBarcode = barcode || `AGORA-${sku}-${Date.now()}`

    const product = await prisma.product.create({
      data: { 
        name, 
        sku, 
        barcode: finalBarcode, 
        price: Number(price), 
        category_id, 
        supplier_id: supplier_id || null 
      },
    })

    await prisma.stockLevel.create({
      data: { product_id: product.id, quantity: 0, low_stock_threshold: 10 },
    })

    await invalidateCachePattern('products:list:*')

    res.status(201).json(product)
  } catch (err) {
    console.error('createProduct error:', err)
    res.status(500).json({ message: 'Failed to create product' })
  }
}

export async function updateProduct(req: Request, res: Response) {
  try {
    const id = String(req.params.id)
    const { name, sku, barcode, price, category_id, supplier_id, status } = req.body

    const product = await prisma.product.update({
      where: { id },
      data: { 
        name, 
        sku, 
        barcode, 
        price: price !== undefined ? Number(price) : undefined, 
        category_id, 
        supplier_id: supplier_id || null, 
        status 
      },
    })

    await invalidateCachePattern('products:list:*')

    res.json(product)
  } catch (err) {
    res.status(500).json({ message: 'Failed to update product' })
  }
}

export async function deleteProduct(req: Request, res: Response) {
  try {
    const id = String(req.params.id)

    const orderItems = await prisma.orderItem.count({ where: { product_id: id } })
    if (orderItems > 0) {
      return res.status(409).json({ message: 'Cannot delete - product has existing orders' })
    }

    const stockMovements = await prisma.stockMovement.count({ where: { product_id: id } })
    if (stockMovements > 0) {
      return res.status(409).json({ message: 'Cannot delete - product has stock movement history' })
    }

    await prisma.stockLevel.deleteMany({ where: { product_id: id } })
    await prisma.product.delete({ where: { id } })

    await invalidateCache('products:list')

    res.json({ message: 'Product deleted' })
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete product' })
  }
}

export async function lookupProduct(req: Request, res: Response) {
  try {
    const { qr } = req.query
    if (!qr) return res.status(400).json({ message: 'qr query param is required' })

    const qrStr = String(qr).trim()

    const product = await prisma.product.findFirst({
      where: {
        OR: [
          { barcode: qrStr },
          { sku: qrStr },
        ],
        status: 'ACTIVE',
      },
      include: { category: true, supplier: true, stock_level: true },
    })

    if (!product) return res.status(404).json({ message: 'Product not found' })

    res.json({ data: product })
  } catch (err) {
    console.error('lookupProduct error:', err)
    res.status(500).json({ message: 'Failed to lookup product' })
  }
}