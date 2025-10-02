import { prisma } from '../../core/config/db.js';
import { HttpError } from '../../core/errors/http-error.js';
import { auditService } from '../audit/audit.service.js';

export const kpiService = {
  async list(projectId: string) {
    return prisma.kpiSnapshot.findMany({
      where: { projectId },
      orderBy: { date: 'desc' },
    });
  },

  async create(projectId: string, payload: any, userId: string) {
    const created = await prisma.kpiSnapshot.create({ data: { ...payload, projectId } });
    await auditService.record('KpiSnapshot', created.id, 'CREATE', userId, projectId, null, created);
    return created;
  },

  async update(id: string, payload: any, userId: string) {
    const before = await prisma.kpiSnapshot.findUnique({ where: { id } });
    if (!before) throw new HttpError(404, 'KPI no encontrado');
    const updated = await prisma.kpiSnapshot.update({ where: { id }, data: payload });
    await auditService.record('KpiSnapshot', id, 'UPDATE', userId, before.projectId, before, updated);
    return updated;
  },

  async remove(id: string, userId: string) {
    const before = await prisma.kpiSnapshot.findUnique({ where: { id } });
    if (!before) throw new HttpError(404, 'KPI no encontrado');
    await prisma.kpiSnapshot.delete({ where: { id } });
    await auditService.record('KpiSnapshot', id, 'DELETE', userId, before.projectId, before, null);
  }
};
