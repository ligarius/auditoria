import { prisma } from '../../core/config/db.js';
import { HttpError } from '../../core/errors/http-error.js';
import { auditService } from '../audit/audit.service.js';

const ensureRACI = (payload: any) => {
  if (!payload.responsibleR || !payload.accountableA) {
    throw new HttpError(400, 'Responsable R y Accountable A son obligatorios');
  }
};

export const findingService = {
  async list(projectId: string) {
    return prisma.finding.findMany({ where: { projectId } });
  },

  async create(projectId: string, payload: any, userId: string) {
    ensureRACI(payload);
    const created = await prisma.finding.create({ data: { ...payload, projectId } });
    await auditService.record('Finding', created.id, 'CREATE', userId, projectId, null, created);
    return created;
  },

  async update(id: string, payload: any, userId: string) {
    ensureRACI(payload);
    const before = await prisma.finding.findUnique({ where: { id } });
    if (!before) throw new HttpError(404, 'Hallazgo no encontrado');
    const updated = await prisma.finding.update({ where: { id }, data: payload });
    await auditService.record('Finding', id, 'UPDATE', userId, before.projectId, before, updated);
    return updated;
  },

  async remove(id: string, userId: string) {
    const before = await prisma.finding.findUnique({ where: { id } });
    if (!before) throw new HttpError(404, 'Hallazgo no encontrado');
    await prisma.finding.delete({ where: { id } });
    await auditService.record('Finding', id, 'DELETE', userId, before.projectId, before, null);
  }
};
