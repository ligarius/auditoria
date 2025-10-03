import { prisma } from '../../core/config/db';
import { HttpError } from '../../core/errors/http-error';
import { auditService } from '../audit/audit.service';

export const dataRequestService = {
  async list(
    projectId: string,
    filters: { category?: string; status?: string }
  ) {
    return prisma.dataRequestItem.findMany({
      where: {
        projectId,
        category: filters.category ? filters.category : undefined,
        status: filters.status ? filters.status : undefined
      }
    });
  },

  async create(projectId: string, payload: any, userId: string) {
    const item = await prisma.dataRequestItem.create({
      data: { ...payload, projectId }
    });
    await auditService.record(
      'DataRequestItem',
      item.id,
      'CREATE',
      userId,
      projectId,
      null,
      item
    );
    return item;
  },

  async update(id: string, payload: any, userId: string) {
    const before = await prisma.dataRequestItem.findUnique({ where: { id } });
    if (!before) {
      throw new HttpError(404, 'Elemento no encontrado');
    }
    const item = await prisma.dataRequestItem.update({
      where: { id },
      data: payload
    });
    await auditService.record(
      'DataRequestItem',
      id,
      'UPDATE',
      userId,
      before.projectId,
      before,
      item
    );
    return item;
  },

  async remove(id: string, userId: string) {
    const before = await prisma.dataRequestItem.findUnique({ where: { id } });
    if (!before) {
      throw new HttpError(404, 'Elemento no encontrado');
    }
    await prisma.dataRequestItem.delete({ where: { id } });
    await auditService.record(
      'DataRequestItem',
      id,
      'DELETE',
      userId,
      before.projectId,
      before,
      null
    );
  }
};
