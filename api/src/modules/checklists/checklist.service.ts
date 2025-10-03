import { ChecklistStatus } from '@prisma/client';

import { prisma } from '../../core/config/db';
import { HttpError } from '../../core/errors/http-error';
import { auditService } from '../audit/audit.service';

export interface ChecklistItemInput {
  id?: string;
  text: string;
  isDone?: boolean;
}

interface CreateChecklistInput {
  sopId: string;
  assigneeId?: string | null;
  status?: ChecklistStatus;
  items?: ChecklistItemInput[];
}

interface UpdateChecklistInput {
  assigneeId?: string | null;
  status?: ChecklistStatus;
}

export const checklistService = {
  async list(projectId: string, sopId?: string) {
    return prisma.checklist.findMany({
      where: {
        sop: {
          process: { projectId }
        },
        sopId: sopId ?? undefined
      },
      include: {
        items: { orderBy: { createdAt: 'asc' } },
        assignee: { select: { id: true, name: true, email: true } },
        signedBy: { select: { id: true, name: true, email: true } },
        sop: { select: { id: true, title: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
  },

  async get(id: string) {
    const checklist = await prisma.checklist.findUnique({
      where: { id },
      include: {
        items: { orderBy: { createdAt: 'asc' } },
        assignee: { select: { id: true, name: true, email: true } },
        signedBy: { select: { id: true, name: true, email: true } },
        sop: { include: { process: true } }
      }
    });
    if (!checklist) {
      throw new HttpError(404, 'Checklist no encontrada');
    }
    return checklist;
  },

  async create(data: CreateChecklistInput, userId: string) {
    const sop = await prisma.sop.findUnique({
      where: { id: data.sopId },
      include: { process: true }
    });
    if (!sop) {
      throw new HttpError(404, 'SOP no encontrado');
    }

    const created = await prisma.checklist.create({
      data: {
        sopId: data.sopId,
        assigneeId: data.assigneeId ?? null,
        status: data.status ?? ChecklistStatus.open,
        items: data.items?.length
          ? {
              create: data.items.map((item) => ({
                text: item.text,
                isDone: item.isDone ?? false
              }))
            }
          : undefined
      },
      include: {
        items: { orderBy: { createdAt: 'asc' } },
        assignee: { select: { id: true, name: true, email: true } },
        signedBy: { select: { id: true, name: true, email: true } },
        sop: { select: { id: true, title: true } }
      }
    });

    await auditService.record(
      'Checklist',
      created.id,
      'CREATE',
      userId,
      sop.process.projectId,
      null,
      created
    );

    return created;
  },

  async update(id: string, data: UpdateChecklistInput, userId: string) {
    const existing = await prisma.checklist.findUnique({
      where: { id },
      include: { sop: { include: { process: true } } }
    });
    if (!existing) {
      throw new HttpError(404, 'Checklist no encontrada');
    }

    const updated = await prisma.checklist.update({
      where: { id },
      data: {
        assigneeId: data.assigneeId === undefined ? undefined : data.assigneeId,
        status: data.status ?? undefined
      },
      include: {
        items: { orderBy: { createdAt: 'asc' } },
        assignee: { select: { id: true, name: true, email: true } },
        signedBy: { select: { id: true, name: true, email: true } },
        sop: { select: { id: true, title: true } }
      }
    });

    await auditService.record(
      'Checklist',
      id,
      'UPDATE',
      userId,
      existing.sop.process.projectId,
      existing,
      updated
    );

    return updated;
  },

  async updateItem(
    checklistId: string,
    itemId: string,
    data: ChecklistItemInput,
    userId: string
  ) {
    const checklist = await prisma.checklist.findUnique({
      where: { id: checklistId },
      include: { sop: { include: { process: true } } }
    });
    if (!checklist) {
      throw new HttpError(404, 'Checklist no encontrada');
    }

    const item = await prisma.checklistItem.findUnique({
      where: { id: itemId }
    });
    if (!item || item.checklistId !== checklistId) {
      throw new HttpError(404, 'Item de checklist no encontrado');
    }

    const updated = await prisma.checklistItem.update({
      where: { id: itemId },
      data: {
        text: data.text ?? undefined,
        isDone: data.isDone ?? undefined
      }
    });

    await auditService.record(
      'ChecklistItem',
      itemId,
      'UPDATE',
      userId,
      checklist.sop.process.projectId,
      item,
      updated
    );

    return updated;
  },

  async sign(id: string, userId: string) {
    const checklist = await prisma.checklist.findUnique({
      where: { id },
      include: { sop: { include: { process: true } } }
    });
    if (!checklist) {
      throw new HttpError(404, 'Checklist no encontrada');
    }
    if (
      checklist.status !== ChecklistStatus.completed &&
      checklist.status !== ChecklistStatus.signed
    ) {
      throw new HttpError(400, 'Solo se pueden firmar checklists completadas');
    }

    const updated = await prisma.checklist.update({
      where: { id },
      data: {
        status: ChecklistStatus.signed,
        signedById: userId,
        signedAt: new Date()
      },
      include: {
        items: { orderBy: { createdAt: 'asc' } },
        assignee: { select: { id: true, name: true, email: true } },
        signedBy: { select: { id: true, name: true, email: true } },
        sop: { select: { id: true, title: true } }
      }
    });

    await auditService.record(
      'Checklist',
      id,
      'SIGN',
      userId,
      checklist.sop.process.projectId,
      checklist,
      updated
    );

    return updated;
  }
};
