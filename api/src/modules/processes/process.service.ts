import { prisma } from '../../core/config/db.js';
import { HttpError } from '../../core/errors/http-error.js';
import { auditService } from '../audit/audit.service.js';

export const processService = {
  async list(projectId: string) {
    return prisma.processAsset.findMany({ where: { projectId } });
  },

  async create(projectId: string, payload: any, userId: string) {
    const asset = await prisma.processAsset.create({ data: { ...payload, projectId } });
    await auditService.record('ProcessAsset', asset.id, 'CREATE', userId, projectId, null, asset);
    return asset;
  },

  async update(id: string, payload: any, userId: string) {
    const before = await prisma.processAsset.findUnique({ where: { id } });
    if (!before) throw new HttpError(404, 'Proceso no encontrado');
    const asset = await prisma.processAsset.update({ where: { id }, data: payload });
    await auditService.record('ProcessAsset', id, 'UPDATE', userId, before.projectId, before, asset);
    return asset;
  },

  async remove(id: string, userId: string) {
    const before = await prisma.processAsset.findUnique({ where: { id } });
    if (!before) throw new HttpError(404, 'Proceso no encontrado');
    await prisma.processAsset.delete({ where: { id } });
    await auditService.record('ProcessAsset', id, 'DELETE', userId, before.projectId, before, null);
  }
};
