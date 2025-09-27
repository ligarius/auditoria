import { prisma } from '../../core/config/db.js';
import { HttpError } from '../../core/errors/http-error.js';
import { auditService } from '../audit/audit.service.js';

export const decisionService = {
  async list(projectId: string) {
    return prisma.decisionLog.findMany({ where: { projectId } });
  },

  async create(projectId: string, payload: any, userId: string) {
    if (!payload.approverA) {
      throw new HttpError(400, 'Approver A es obligatorio');
    }
    const created = await prisma.decisionLog.create({ data: { ...payload, projectId } });
    await auditService.record('DecisionLog', created.id, 'CREATE', userId, projectId, null, created);
    return created;
  },

  async update(id: string, payload: any, userId: string) {
    if (!payload.approverA) {
      throw new HttpError(400, 'Approver A es obligatorio');
    }
    const before = await prisma.decisionLog.findUnique({ where: { id } });
    if (!before) throw new HttpError(404, 'Decisión no encontrada');
    const updated = await prisma.decisionLog.update({ where: { id }, data: payload });
    await auditService.record('DecisionLog', id, 'UPDATE', userId, before.projectId, before, updated);
    return updated;
  },

  async remove(id: string, userId: string) {
    const before = await prisma.decisionLog.findUnique({ where: { id } });
    if (!before) throw new HttpError(404, 'Decisión no encontrada');
    await prisma.decisionLog.delete({ where: { id } });
    await auditService.record('DecisionLog', id, 'DELETE', userId, before.projectId, before, null);
  }
};
