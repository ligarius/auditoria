import { prisma } from '../../core/config/db.js';
import { HttpError } from '../../core/errors/http-error.js';
import { auditService } from '../audit/audit.service.js';

export const kpiService = {
  async list(projectId: string) {
    return prisma.kPI.findMany({ where: { projectId }, orderBy: { date: 'asc' } });
  },

  async create(projectId: string, payload: any, userId: string) {
    const created = await prisma.kPI.create({ data: { ...payload, projectId } });
    await auditService.record('KPI', created.id, 'CREATE', userId, projectId, null, created);
    return created;
  },

  async update(id: string, payload: any, userId: string) {
    const before = await prisma.kPI.findUnique({ where: { id } });
    if (!before) throw new HttpError(404, 'KPI no encontrado');
    const updated = await prisma.kPI.update({ where: { id }, data: payload });
    await auditService.record('KPI', id, 'UPDATE', userId, before.projectId, before, updated);
    return updated;
  },

  async remove(id: string, userId: string) {
    const before = await prisma.kPI.findUnique({ where: { id } });
    if (!before) throw new HttpError(404, 'KPI no encontrado');
    await prisma.kPI.delete({ where: { id } });
    await auditService.record('KPI', id, 'DELETE', userId, before.projectId, before, null);
  }
};
