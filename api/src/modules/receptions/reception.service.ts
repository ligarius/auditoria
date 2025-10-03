import { prisma } from '../../core/config/db';
import { HttpError } from '../../core/errors/http-error';
import { auditService } from '../audit/audit.service';

import {
  computeReceptionTimes,
  ReceptionTimesInput
} from './reception.metrics';

type MetricsAccumulator = {
  dwellSum: number;
  dwellCount: number;
  unloadSum: number;
  unloadCount: number;
  idleSum: number;
  idleCount: number;
};

export const receptionService = {
  async list(projectId: string) {
    const receptions = await prisma.reception.findMany({
      where: { projectId }
    });
    return receptions.map((r) => ({
      ...r,
      metrics: computeReceptionTimes(r as ReceptionTimesInput)
    }));
  },

  async create(projectId: string, payload: any, userId: string) {
    const created = await prisma.reception.create({
      data: { ...payload, projectId }
    });
    await auditService.record(
      'Reception',
      created.id,
      'CREATE',
      userId,
      projectId,
      null,
      created
    );
    return { ...created, metrics: computeReceptionTimes(created) };
  },

  async update(id: string, payload: any, userId: string) {
    const before = await prisma.reception.findUnique({ where: { id } });
    if (!before) throw new HttpError(404, 'Recepción no encontrada');
    const updated = await prisma.reception.update({
      where: { id },
      data: payload
    });
    await auditService.record(
      'Reception',
      id,
      'UPDATE',
      userId,
      before.projectId,
      before,
      updated
    );
    return { ...updated, metrics: computeReceptionTimes(updated) };
  },

  async remove(id: string, userId: string) {
    const before = await prisma.reception.findUnique({ where: { id } });
    if (!before) throw new HttpError(404, 'Recepción no encontrada');
    await prisma.reception.delete({ where: { id } });
    await auditService.record(
      'Reception',
      id,
      'DELETE',
      userId,
      before.projectId,
      before,
      null
    );
  },

  async metrics(projectId: string) {
    const receptions = await prisma.reception.findMany({
      where: { projectId }
    });
    if (!receptions.length) {
      return { count: 0, dwellAvg: 0, unloadAvg: 0, idleAvg: 0 };
    }
    const totals = receptions.reduce<MetricsAccumulator>(
      (acc, reception) => {
        const { dwell, unload, idle } = computeReceptionTimes(reception);
        if (dwell !== null) {
          acc.dwellSum += dwell;
          acc.dwellCount += 1;
        }
        if (unload !== null) {
          acc.unloadSum += unload;
          acc.unloadCount += 1;
        }
        if (idle !== null) {
          acc.idleSum += idle;
          acc.idleCount += 1;
        }
        return acc;
      },
      {
        dwellSum: 0,
        dwellCount: 0,
        unloadSum: 0,
        unloadCount: 0,
        idleSum: 0,
        idleCount: 0
      }
    );
    return {
      count: receptions.length,
      dwellAvg: totals.dwellCount ? totals.dwellSum / totals.dwellCount : 0,
      unloadAvg: totals.unloadCount ? totals.unloadSum / totals.unloadCount : 0,
      idleAvg: totals.idleCount ? totals.idleSum / totals.idleCount : 0
    };
  }
};
