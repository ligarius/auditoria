import { prisma } from '../../core/config/db.js';
import { HttpError } from '../../core/errors/http-error.js';
import { auditService } from '../audit/audit.service.js';

export const pocService = {
  async list(projectId: string) {
    return prisma.pOCItem.findMany({ where: { projectId } });
  },

  async create(projectId: string, payload: any, userId: string) {
    const created = await prisma.pOCItem.create({ data: { ...payload, projectId } });
    await auditService.record('POCItem', created.id, 'CREATE', userId, projectId, null, created);
    return created;
  },

  async update(id: string, payload: any, userId: string) {
    const before = await prisma.pOCItem.findUnique({ where: { id } });
    if (!before) throw new HttpError(404, 'POC no encontrado');
    const updated = await prisma.pOCItem.update({ where: { id }, data: payload });
    await auditService.record('POCItem', id, 'UPDATE', userId, before.projectId, before, updated);
    return updated;
  },

  async remove(id: string, userId: string) {
    const before = await prisma.pOCItem.findUnique({ where: { id } });
    if (!before) throw new HttpError(404, 'POC no encontrado');
    await prisma.pOCItem.delete({ where: { id } });
    await auditService.record('POCItem', id, 'DELETE', userId, before.projectId, before, null);
  }
};
