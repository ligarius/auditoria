import type { Prisma } from '@prisma/client';

import { prisma } from '../../core/config/db.js';
import { HttpError } from '../../core/errors/http-error.js';
import { auditService } from '../audit/audit.service.js';

const baseSelect = {
  id: true,
  name: true,
  taxId: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { projects: true } }
} satisfies Prisma.CompanySelect;

export const companyService = {
  async list() {
    return prisma.company.findMany({
      select: baseSelect,
      orderBy: { name: 'asc' }
    });
  },

  async getById(id: string) {
    const company = await prisma.company.findUnique({
      where: { id },
      select: baseSelect
    });
    if (!company) {
      throw new HttpError(404, 'Empresa no encontrada');
    }
    return company;
  },

  async create(data: Prisma.CompanyCreateInput, userId: string) {
    const company = await prisma.company.create({
      data,
      select: baseSelect
    });
    await auditService.record(
      'Company',
      company.id,
      'CREATE',
      userId,
      undefined,
      null,
      company
    );
    return company;
  },

  async update(id: string, data: Prisma.CompanyUpdateInput, userId: string) {
    const existing = await prisma.company.findUnique({ where: { id } });
    if (!existing) {
      throw new HttpError(404, 'Empresa no encontrada');
    }
    const company = await prisma.company.update({
      where: { id },
      data,
      select: baseSelect
    });
    await auditService.record(
      'Company',
      id,
      'UPDATE',
      userId,
      undefined,
      existing,
      company
    );
    return company;
  },

  async remove(id: string, userId: string) {
    const company = await prisma.company.findUnique({
      where: { id },
      include: { _count: { select: { projects: true } } }
    });
    if (!company) {
      throw new HttpError(404, 'Empresa no encontrada');
    }
    if (company._count.projects > 0) {
      throw new HttpError(409, 'La empresa tiene proyectos asociados');
    }
    await prisma.company.delete({ where: { id } });
    await auditService.record(
      'Company',
      id,
      'DELETE',
      userId,
      undefined,
      company,
      null
    );
  }
};
