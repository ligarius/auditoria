import { prisma } from '../../core/config/db.js';
import { HttpError } from '../../core/errors/http-error.js';
import { auditService } from '../audit/audit.service.js';
import { computeRiskValues } from './risk.utils.js';

export const riskService = {
  async list(projectId: string, rag?: string) {
    return prisma.risk.findMany({
      where: { projectId, rag: rag ?? undefined },
      orderBy: { severity: 'desc' }
    });
  },

  async create(projectId: string, payload: any, userId: string) {
    if (payload.probability === undefined || payload.impact === undefined) {
      throw new HttpError(400, 'Probabilidad e impacto son obligatorios');
    }
    const computed = computeRiskValues(payload);
    const created = await prisma.risk.create({ data: { ...payload, ...computed, projectId } });
    await auditService.record('Risk', created.id, 'CREATE', userId, projectId, null, created);
    return created;
  },

  async update(id: string, payload: any, userId: string) {
    const before = await prisma.risk.findUnique({ where: { id } });
    if (!before) throw new HttpError(404, 'Riesgo no encontrado');
    const nextProbability = payload.probability ?? before.probability;
    const nextImpact = payload.impact ?? before.impact;
    const computed =
      payload.probability !== undefined || payload.impact !== undefined
        ? computeRiskValues({ probability: nextProbability, impact: nextImpact })
        : {};
    const updated = await prisma.risk.update({ where: { id }, data: { ...payload, ...computed } });
    await auditService.record('Risk', id, 'UPDATE', userId, before.projectId, before, updated);
    return updated;
  },

  async remove(id: string, userId: string) {
    const before = await prisma.risk.findUnique({ where: { id } });
    if (!before) throw new HttpError(404, 'Riesgo no encontrado');
    await prisma.risk.delete({ where: { id } });
    await auditService.record('Risk', id, 'DELETE', userId, before.projectId, before, null);
  }
};
