import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import prisma from '../utils/prisma'

export async function getUsers(req: Request, res: Response) {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, is_active: true, created_at: true },
      orderBy: { created_at: 'desc' },
    })
    res.json(users)
  } catch {
    res.status(500).json({ message: 'Failed to fetch users' })
  }
}

export async function createUser(req: Request, res: Response) {
  try {
    const { name, email, password, role } = req.body
    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'name, email, password, and role are required' })
    }
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) return res.status(409).json({ message: 'Email already in use' })

    const password_hash = await bcrypt.hash(password, 12)
    const user = await prisma.user.create({
      data: { name, email, password_hash, role },
      select: { id: true, name: true, email: true, role: true, is_active: true, created_at: true },
    })
    res.status(201).json(user)
  } catch {
    res.status(500).json({ message: 'Failed to create user' })
  }
}

export async function updateUser(req: Request, res: Response) {
  try {
    const { id } = req.params
    const { name, email, role, password } = req.body

    const data: any = {}
    if (name) data.name = name
    if (email) data.email = email
    if (role) data.role = role
    if (password) data.password_hash = await bcrypt.hash(password, 12)

    const user = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, name: true, email: true, role: true, is_active: true, created_at: true },
    })
    res.json(user)
  } catch {
    res.status(500).json({ message: 'Failed to update user' })
  }
}

export async function toggleUserStatus(req: Request, res: Response) {
  try {
    const { id } = req.params
    const caller = (req as any).user

    if (caller.userId === id) {
      return res.status(400).json({ message: 'You cannot deactivate your own account' })
    }

    const current = await prisma.user.findUnique({ where: { id } })
    if (!current) return res.status(404).json({ message: 'User not found' })

    const user = await prisma.user.update({
      where: { id },
      data: { is_active: !current.is_active },
      select: { id: true, name: true, email: true, role: true, is_active: true, created_at: true },
    })
    res.json(user)
  } catch {
    res.status(500).json({ message: 'Failed to toggle user status' })
  }
}