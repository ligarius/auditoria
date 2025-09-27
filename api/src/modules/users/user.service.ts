import type { Prisma } from '@prisma/client';

import { prisma } from '../../core/config/db.js';
import { HttpError } from '../../core/errors/http-error.js';
import { hashPassword } from '../../core/utils/password.js';
import { auditService } from '../audit/audit.service.js';

const baseSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { memberships: true } }
} satisfies Prisma.UserSelect;

export const userService = {
  async list() {
    return prisma.user.findMany({
      select: baseSelect,
      orderBy: { createdAt: 'desc' }
    });
  },

  async create(data: { name: string; email: string; role: string; password: string }, actorId: string) {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      throw new HttpError(409, 'Ya existe un usuario con ese correo');
    }
    const passwordHash = await hashPassword(data.password);
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        role: data.role,
        passwordHash
      },
      select: baseSelect
    });
    await auditService.record('User', user.id, 'CREATE', actorId, undefined, null, user);
    return user;
  },

  async update(
    id: string,
    data: { name?: string; role?: string; password?: string | null },
    actorId: string
  ) {
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new HttpError(404, 'Usuario no encontrado');
    }
    const updateData: Prisma.UserUpdateInput = {};
    if (typeof data.name === 'string') {
      updateData.name = data.name;
    }
    if (typeof data.role === 'string') {
      updateData.role = data.role;
    }
    if (data.password) {
      updateData.passwordHash = await hashPassword(data.password);
    }
    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: baseSelect
    });
    await auditService.record('User', id, 'UPDATE', actorId, undefined, existing, user);
    return user;
  },

  async remove(id: string, actorId: string) {
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new HttpError(404, 'Usuario no encontrado');
    }
    const memberships = await prisma.membership.count({ where: { userId: id } });
    if (memberships > 0) {
      throw new HttpError(409, 'El usuario tiene membresías activas. Reasigna antes de eliminar.');
    }
    await prisma.user.delete({ where: { id } });
    await auditService.record('User', id, 'DELETE', actorId, undefined, existing, null);
  }
};

