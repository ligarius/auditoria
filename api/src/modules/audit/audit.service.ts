import { Prisma } from '@prisma/client';

import { prisma } from '../../core/config/db.js';

export const auditService = {
  async record(
    entity: string,
    entityId: string,
    action: string,
    userId: string,
    projectId?: string,
    oldValue?: unknown,
    newValue?: unknown
  ) {
    await prisma.auditLog.create({
      data: {
        entity,
        entityId,
        action,
        userId,
        projectId,
        oldValue: oldValue as Prisma.InputJsonValue,
        newValue: newValue as Prisma.InputJsonValue
      }
    });
  },

  async list(projectId: string) {
    return prisma.auditLog.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' }
    });
  }
};
