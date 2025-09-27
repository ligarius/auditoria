import { prisma } from '../../core/config/db.js';
import { HttpError } from '../../core/errors/http-error.js';
import { auditService } from '../audit/audit.service.js';

export const interviewService = {
  async list(projectId: string) {
    return prisma.interview.findMany({ where: { projectId } });
  },

  async create(projectId: string, payload: any, userId: string) {
    const interview = await prisma.interview.create({ data: { ...payload, projectId } });
    await auditService.record('Interview', interview.id, 'CREATE', userId, projectId, null, interview);
    return interview;
  },

  async update(id: string, payload: any, userId: string) {
    const before = await prisma.interview.findUnique({ where: { id } });
    if (!before) throw new HttpError(404, 'Entrevista no encontrada');
    const interview = await prisma.interview.update({ where: { id }, data: payload });
    await auditService.record('Interview', id, 'UPDATE', userId, before.projectId, before, interview);
    return interview;
  },

  async remove(id: string, userId: string) {
    const before = await prisma.interview.findUnique({ where: { id } });
    if (!before) throw new HttpError(404, 'Entrevista no encontrada');
    await prisma.interview.delete({ where: { id } });
    await auditService.record('Interview', id, 'DELETE', userId, before.projectId, before, null);
  }
};
