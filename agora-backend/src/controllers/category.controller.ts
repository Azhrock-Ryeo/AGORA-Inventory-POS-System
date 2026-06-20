import { Request, Response } from 'express'
import prisma from '../utils/prisma'

export async function getCategories(req: Request, res: Response) {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' },
    })
    res.json(categories)
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch categories' })
  }
}

export async function getCategoryById(req: Request, res: Response) {
  try {
    const id = String(req.params.id)
    const category = await prisma.category.findUnique({ where: { id } })
    if (!category) return res.status(404).json({ message: 'Category not found' })
    res.json(category)
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch category' })
  }
}

export async function createCategory(req: Request, res: Response) {
  try {
    const { name, description } = req.body
    const existing = await prisma.category.findFirst({ where: { name } })
    if (existing) return res.status(409).json({ message: 'Category name already exists' })
    const category = await prisma.category.create({ data: { name, description } })
    res.status(201).json(category)
  } catch (err) {
    res.status(500).json({ message: 'Failed to create category' })
  }
}

export async function updateCategory(req: Request, res: Response) {
  try {
    const id = String(req.params.id)
    const { name, description } = req.body
    const category = await prisma.category.update({
      where: { id },
      data: { name, description },
    })
    res.json(category)
  } catch (err) {
    res.status(500).json({ message: 'Failed to update category' })
  }
}

export async function deleteCategory(req: Request, res: Response) {
  try {
    const id = String(req.params.id)
    const productsUsingCategory = await prisma.product.count({ where: { category_id: id } })
    if (productsUsingCategory > 0) {
      return res.status(409).json({ message: 'Cannot delete - category has existing products' })
    }
    await prisma.category.delete({ where: { id } })
    res.json({ message: 'Category deleted' })
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete category' })
  }
}