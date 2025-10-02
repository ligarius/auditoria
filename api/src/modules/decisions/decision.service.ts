import { prisma } from '../../core/config/db.js';
import { HttpError } from '../../core/errors/http-error.js';
import { auditService } from '../audit/audit.service.js';

export const decisionService = {
  async list(projectId: string) {
    return prisma.decision.findMany({ where: { projectId }, orderBy: { date: 'desc' } });
  },

  async create(projectId: string, payload: any, userId: string) {
    if (!payload.approverA) {
      throw new HttpError(400, 'Approver A es obligatorio');
    }
    const created = await prisma.decision.create({
      data: {
        ...payload,
        projectId,
      },
    });
    await auditService.record('Decision', created.id, 'CREATE', userId, projectId, null, created);
    return created;
  },

  async update(id: string, payload: any, userId: string) {
    const before = await prisma.decision.findUnique({ where: { id } });
    if (!before) throw new HttpError(404, 'Decisión no encontrada');
    if (!payload.approverA && !before.approverA) {
      throw new HttpError(400, 'Approver A es obligatorio');
    }
    const updated = await prisma.decision.update({
      where: { id },
      data: {
        ...payload,
        approverA: payload.approverA ?? before.approverA,
      },
    });
    await auditService.record('Decision', id, 'UPDATE', userId, before.projectId, before, updated);
    return updated;
  },

  async remove(id: string, userId: string) {
    const before = await prisma.decision.findUnique({ where: { id } });
    if (!before) throw new HttpError(404, 'Decisión no encontrada');
    await prisma.decision.delete({ where: { id } });
    await auditService.record('Decision', id, 'DELETE', userId, before.projectId, before, null);
  },
};
