import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import prisma from '../utils/prisma'

export async function getUsers(req: Request, res: Response) {
  try {
    const caller = (req as any).user

    // Build visibility filter based on role
    const roleFilter: any =
        caller.role === 'SUPER_ADMIN'
        ? { role: { role_name: { not: 'SUPER_ADMIN' } } } // SA sees all except other SAs
        : caller.role === 'ADMIN'
        ? { role: { role_name: { in: ['MANAGER', 'CASHIER'] } } }
        : { id: caller.userId }

    const users = await prisma.user.findMany({
      where: roleFilter,
      include: { role: true },
      orderBy: { created_at: 'desc' },
    })
    res.json(users)
  } catch (err) {
    console.error(err)
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

    // ✅ Look up the role record by role_name
    const roleRecord = await prisma.role.findFirst({ where: { role_name: role } })
    if (!roleRecord) return res.status(400).json({ message: `Role '${role}' not found` })

    const password_hash = await bcrypt.hash(password, 12)
    const user = await prisma.user.create({
      data: { name, email, password_hash, role_id: roleRecord.id },
      include: { role: true },
    })
    res.status(201).json(user)
  } catch (err: any) {
    console.error('createUser error:', err)
    res.status(500).json({ message: err.message ?? 'Failed to create user' })
  }
}

export async function updateUser(req: Request, res: Response) {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
    if (!id) return res.status(400).json({ message: 'User id is required' })
    const { name, email, role, password } = req.body

    const data: any = {}
    if (name) data.name = name
    if (email) data.email = email
    if (role) {
  const roleRecord = await prisma.role.findFirst({ where: { role_name: role } })
  if (roleRecord) data.role_id = roleRecord.id
}
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

export async function deleteUser(req: Request, res: Response) {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
    if (!id) return res.status(400).json({ message: 'User id is required' })
    const caller = (req as any).user

    // Only Super Admin can delete
    if (caller.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ message: 'Only Super Admin can delete accounts' })
    }
    // Cannot delete yourself
    if (caller.userId === id) {
      return res.status(400).json({ message: 'You cannot delete your own account' })
    }
    // Cannot delete another Super Admin
    const target = await prisma.user.findUnique({ where: { id }, select: { id: true, role_id: true } })
    if (!target) return res.status(404).json({ message: 'User not found' })

    const targetRole = await prisma.role.findUnique({ where: { id: target.role_id } })
    if (targetRole?.role_name === 'SUPER_ADMIN') {
      return res.status(403).json({ message: 'Cannot delete a Super Admin account' })
    }

    await prisma.user.delete({ where: { id } })
    res.json({ message: 'User deleted successfully' })
  } catch (err: any) {
    console.error(err)
    res.status(500).json({ message: 'Failed to delete user' })
  }
}

export async function toggleUserStatus(req: Request, res: Response) {
  try {
    const id = req.params.id as string
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
