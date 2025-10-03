import { prisma } from '../../core/config/db';
import { HttpError } from '../../core/errors/http-error';
import { auditService } from '../audit/audit.service';

export const dataRequestCategoryService = {
  async list() {
    return prisma.dataRequestCategory.findMany({ orderBy: { name: 'asc' } });
  },

  async create(
    payload: { name: string; description?: string },
    userId: string
  ) {
    const category = await prisma.dataRequestCategory.create({ data: payload });
    await auditService.record(
      'DataRequestCategory',
      category.id,
      'CREATE',
      userId,
      undefined,
      undefined,
      category
    );
    return category;
  },

  async update(
    id: string,
    payload: { name?: string; description?: string },
    userId: string
  ) {
    const before = await prisma.dataRequestCategory.findUnique({
      where: { id }
    });
    if (!before) {
      throw new HttpError(404, 'Categoría no encontrada');
    }
    const category = await prisma.dataRequestCategory.update({
      where: { id },
      data: payload
    });
    await auditService.record(
      'DataRequestCategory',
      id,
      'UPDATE',
      userId,
      undefined,
      before,
      category
    );
    return category;
  },

  async remove(id: string, userId: string) {
    const before = await prisma.dataRequestCategory.findUnique({
      where: { id }
    });
    if (!before) {
      throw new HttpError(404, 'Categoría no encontrada');
    }
    await prisma.dataRequestCategory.delete({ where: { id } });
    await auditService.record(
      'DataRequestCategory',
      id,
      'DELETE',
      userId,
      undefined,
      before,
      undefined
    );
  }
};
