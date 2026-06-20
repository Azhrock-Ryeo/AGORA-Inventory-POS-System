import { Request, Response } from 'express'
import prisma from '../utils/prisma'

export async function getSuppliers(req: Request, res: Response) {
  try {
    const suppliers = await prisma.supplier.findMany({
      orderBy: { name: 'asc' },
    })
    res.json(suppliers)
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch suppliers' })
  }
}

export async function getSupplierById(req: Request, res: Response) {
  try {
    const id = String(req.params.id)
    const supplier = await prisma.supplier.findUnique({ where: { id } })
    if (!supplier) return res.status(404).json({ message: 'Supplier not found' })
    res.json(supplier)
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch supplier' })
  }
}

export async function createSupplier(req: Request, res: Response) {
  try {
    const { name, contact_name, email, phone, address } = req.body
    const supplier = await prisma.supplier.create({
      data: { name, contact_name, email, phone, address },
    })
    res.status(201).json(supplier)
  } catch (err) {
    res.status(500).json({ message: 'Failed to create supplier' })
  }
}

export async function updateSupplier(req: Request, res: Response) {
  try {
    const id = String(req.params.id)
    const { name, contact_name, email, phone, address } = req.body
    const supplier = await prisma.supplier.update({
      where: { id },
      data: { name, contact_name, email, phone, address },
    })
    res.json(supplier)
  } catch (err) {
    res.status(500).json({ message: 'Failed to update supplier' })
  }
}

export async function deleteSupplier(req: Request, res: Response) {
  try {
    const id = String(req.params.id)
    const productsUsingSupplier = await prisma.product.count({ where: { supplier_id: id } })
    if (productsUsingSupplier > 0) {
      return res.status(409).json({ message: 'Cannot delete - supplier has existing products' })
    }
    await prisma.supplier.delete({ where: { id } })
    res.json({ message: 'Supplier deleted' })
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete supplier' })
  }
}