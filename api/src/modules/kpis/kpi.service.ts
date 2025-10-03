import { prisma } from '../../core/config/db';
import { HttpError } from '../../core/errors/http-error';
import { auditService } from '../audit/audit.service';

type KpiListFilters = {
  startDate?: Date;
  endDate?: Date;
};

export const kpiService = {
  async list(projectId: string, filters: KpiListFilters = {}) {
    const { startDate, endDate } = filters;

    return prisma.kpiSnapshot.findMany({
      where: {
        projectId,
        ...(startDate || endDate
          ? {
              date: {
                ...(startDate ? { gte: startDate } : {}),
                ...(endDate ? { lte: endDate } : {})
              }
            }
          : {})
      },
      orderBy: { date: 'asc' }
    });
  },

  async create(projectId: string, payload: any, userId: string) {
    const created = await prisma.kpiSnapshot.create({
      data: { ...payload, projectId }
    });
    await auditService.record(
      'KpiSnapshot',
      created.id,
      'CREATE',
      userId,
      projectId,
      null,
      created
    );
    return created;
  },

  async update(id: string, payload: any, userId: string) {
    const before = await prisma.kpiSnapshot.findUnique({ where: { id } });
    if (!before) throw new HttpError(404, 'KPI no encontrado');
    const updated = await prisma.kpiSnapshot.update({
      where: { id },
      data: payload
    });
    await auditService.record(
      'KpiSnapshot',
      id,
      'UPDATE',
      userId,
      before.projectId,
      before,
      updated
    );
    return updated;
  },

  async remove(id: string, userId: string) {
    const before = await prisma.kpiSnapshot.findUnique({ where: { id } });
    if (!before) throw new HttpError(404, 'KPI no encontrado');
    await prisma.kpiSnapshot.delete({ where: { id } });
    await auditService.record(
      'KpiSnapshot',
      id,
      'DELETE',
      userId,
      before.projectId,
      before,
      null
    );
  }
};
