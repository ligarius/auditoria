import { ActionCategory, ActionStatus } from '@prisma/client';

import { prisma } from '../../core/config/db';
import { HttpError } from '../../core/errors/http-error';
import { auditService } from '../audit/audit.service';

interface ActionInput {
  projectId: string;
  findingId?: string | null;
  title: string;
  description?: string | null;
  owner?: string | null;
  dueDate?: Date | null;
  category?: ActionCategory;
  status?: ActionStatus;
}

interface ActionUpdateInput {
  title?: string;
  description?: string | null;
  owner?: string | null;
  dueDate?: Date | null;
  category?: ActionCategory;
  status?: ActionStatus;
  findingId?: string | null;
}

export const actionService = {
  async list(projectId: string) {
    return prisma.actionItem.findMany({
      where: { projectId },
      include: {
        finding: { select: { id: true, title: true, isQuickWin: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
  },

  async get(id: string) {
    const action = await prisma.actionItem.findUnique({
      where: { id },
      include: {
        finding: { select: { id: true, projectId: true } }
      }
    });
    if (!action) {
      throw new HttpError(404, 'Acción no encontrada');
    }
    return action;
  },

  async create(data: ActionInput, userId: string) {
    if (data.findingId) {
      const finding = await prisma.finding.findUnique({
        where: { id: data.findingId }
      });
      if (!finding) {
        throw new HttpError(404, 'Hallazgo no encontrado');
      }
      if (finding.projectId !== data.projectId) {
        throw new HttpError(
          400,
          'El hallazgo no pertenece al proyecto indicado'
        );
      }
    }

    const created = await prisma.actionItem.create({
      data: {
        projectId: data.projectId,
        findingId: data.findingId ?? null,
        title: data.title,
        description: data.description ?? null,
        owner: data.owner ?? null,
        dueDate: data.dueDate ?? null,
        category: data.category ?? ActionCategory.quick_win,
        status: data.status ?? ActionStatus.todo
      }
    });

    await auditService.record(
      'ActionItem',
      created.id,
      'CREATE',
      userId,
      data.projectId,
      null,
      created
    );

    return created;
  },

  async update(id: string, data: ActionUpdateInput, userId: string) {
    const existing = await prisma.actionItem.findUnique({ where: { id } });
    if (!existing) {
      throw new HttpError(404, 'Acción no encontrada');
    }

    if (data.findingId) {
      const finding = await prisma.finding.findUnique({
        where: { id: data.findingId }
      });
      if (!finding) {
        throw new HttpError(404, 'Hallazgo no encontrado');
      }
      if (finding.projectId !== existing.projectId) {
        throw new HttpError(400, 'El hallazgo no pertenece al proyecto');
      }
    }

    const updated = await prisma.actionItem.update({
      where: { id },
      data: {
        title: data.title ?? undefined,
        description:
          data.description === undefined ? undefined : data.description,
        owner: data.owner === undefined ? undefined : data.owner,
        dueDate: data.dueDate === undefined ? undefined : data.dueDate,
        category: data.category ?? undefined,
        status: data.status ?? undefined,
        findingId: data.findingId === undefined ? undefined : data.findingId
      }
    });

    await auditService.record(
      'ActionItem',
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
    const existing = await prisma.actionItem.findUnique({ where: { id } });
    if (!existing) {
      throw new HttpError(404, 'Acción no encontrada');
    }
    await prisma.actionItem.delete({ where: { id } });
    await auditService.record(
      'ActionItem',
      id,
      'DELETE',
      userId,
      existing.projectId,
      existing,
      null
    );
  }
};
