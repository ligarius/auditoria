import { ProcessType, SopStatus } from '@prisma/client';

import { prisma } from '../../core/config/db.js';
import { HttpError } from '../../core/errors/http-error.js';
import { auditService } from '../audit/audit.service.js';

interface ProcessInput {
  projectId: string;
  name: string;
  type: ProcessType;
  version?: number;
  description?: string | null;
}

interface ProcessUpdateInput {
  name?: string;
  type?: ProcessType;
  version?: number;
  description?: string | null;
}

export const processCatalogService = {
  async list(projectId: string) {
    return prisma.process.findMany({
      where: { projectId },
      include: {
        sops: {
          select: {
            id: true,
            title: true,
            version: true,
            status: true,
            processId: true
          },
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: [{ type: 'asc' }, { name: 'asc' }]
    });
  },

  async get(id: string) {
    const process = await prisma.process.findUnique({
      where: { id },
      include: {
        sops: {
          include: { steps: { orderBy: { order: 'asc' } } },
          orderBy: { createdAt: 'desc' }
        }
      }
    });
    if (!process) {
      throw new HttpError(404, 'Proceso no encontrado');
    }
    return process;
  },

  async create(data: ProcessInput, userId: string) {
    const payload = {
      projectId: data.projectId,
      name: data.name,
      type: data.type,
      version: data.version ?? 1,
      description: data.description ?? null
    } satisfies ProcessInput;

    const created = await prisma.process.create({ data: payload });
    await auditService.record(
      'Process',
      created.id,
      'CREATE',
      userId,
      data.projectId,
      null,
      created
    );
    return created;
  },

  async update(id: string, data: ProcessUpdateInput, userId: string) {
    const existing = await prisma.process.findUnique({ where: { id } });
    if (!existing) {
      throw new HttpError(404, 'Proceso no encontrado');
    }
    const updated = await prisma.process.update({
      where: { id },
      data: {
        name: data.name ?? undefined,
        type: data.type ?? undefined,
        version: data.version ?? undefined,
        description:
          data.description === undefined ? undefined : data.description
      }
    });
    await auditService.record(
      'Process',
      id,
      'UPDATE',
      userId,
      existing.projectId,
      existing,
      updated
    );
    return updated;
  },

  async remove(id: string, userId: string) {
    const existing = await prisma.process.findUnique({
      where: { id },
      include: { sops: { select: { id: true, status: true } } }
    });
    if (!existing) {
      throw new HttpError(404, 'Proceso no encontrado');
    }
    const hasPublished = existing.sops.some(
      (sop) => sop.status === SopStatus.published
    );
    if (hasPublished) {
      throw new HttpError(
        400,
        'No se puede eliminar un proceso con SOP publicados'
      );
    }
    await prisma.process.delete({ where: { id } });
    await auditService.record(
      'Process',
      id,
      'DELETE',
      userId,
      existing.projectId,
      existing,
      null
    );
  }
};
