import { Prisma, SopStatus } from '@prisma/client';

import { prisma } from '../../core/config/db';
import { HttpError } from '../../core/errors/http-error';
import { auditService } from '../audit/audit.service';
import { approvalService } from '../governance/approval.service';

interface StepInput {
  id?: string;
  order?: number;
  text: string;
  kpi?: Prisma.InputJsonValue | null;
}

interface CreateSopInput {
  processId: string;
  title: string;
  version?: number;
  status?: SopStatus;
  steps?: StepInput[];
}

interface UpdateSopInput {
  title?: string;
  version?: number;
  status?: SopStatus;
  steps?: StepInput[];
}

export const sopService = {
  async list(params: { projectId: string; processId?: string }) {
    const { projectId, processId } = params;
    return prisma.sop.findMany({
      where: {
        process: { projectId },
        processId: processId ?? undefined
      },
      include: { steps: { orderBy: { order: 'asc' } } },
      orderBy: { createdAt: 'desc' }
    });
  },

  async get(id: string) {
    const sop = await prisma.sop.findUnique({
      where: { id },
      include: {
        steps: { orderBy: { order: 'asc' } },
        process: true
      }
    });
    if (!sop) {
      throw new HttpError(404, 'SOP no encontrado');
    }
    return sop;
  },

  async create(data: CreateSopInput, userId: string) {
    const process = await prisma.process.findUnique({
      where: { id: data.processId },
      select: { id: true, projectId: true }
    });
    if (!process) {
      throw new HttpError(404, 'Proceso no encontrado');
    }

    const created = await prisma.sop.create({
      data: {
        processId: data.processId,
        title: data.title,
        version: data.version ?? 1,
        status: data.status ?? SopStatus.draft,
        steps: data.steps?.length
          ? {
              create: data.steps.map((step, index) => ({
                order: step.order ?? index + 1,
                text: step.text,
                kpi: step.kpi ?? Prisma.JsonNull
              }))
            }
          : undefined
      },
      include: { steps: { orderBy: { order: 'asc' } } }
    });

    await auditService.record(
      'Sop',
      created.id,
      'CREATE',
      userId,
      process.projectId,
      null,
      created
    );

    return created;
  },

  async update(id: string, data: UpdateSopInput, userId: string) {
    const existing = await prisma.sop.findUnique({
      where: { id },
      include: { process: true }
    });
    if (!existing) {
      throw new HttpError(404, 'SOP no encontrado');
    }

    await prisma.$transaction(async (tx) => {
      await tx.sop.update({
        where: { id },
        data: {
          title: data.title ?? undefined,
          version: data.version ?? undefined,
          status: data.status ?? undefined
        }
      });
      if (data.steps) {
        await tx.sopStep.deleteMany({ where: { sopId: id } });
        if (data.steps.length) {
          await tx.sopStep.createMany({
            data: data.steps.map((step, index) => ({
              sopId: id,
              order: step.order ?? index + 1,
              text: step.text,
              kpi: step.kpi ?? Prisma.JsonNull
            }))
          });
        }
      }
    });

    const updated = await prisma.sop.findUnique({
      where: { id },
      include: { steps: { orderBy: { order: 'asc' } } }
    });

    if (!updated) {
      throw new HttpError(404, 'SOP no encontrado tras la actualización');
    }

    await auditService.record(
      'Sop',
      id,
      'UPDATE',
      userId,
      existing.process.projectId,
      existing,
      updated
    );

    return updated;
  },

  async remove(id: string, userId: string) {
    const existing = await prisma.sop.findUnique({
      where: { id },
      include: { process: true }
    });
    if (!existing) {
      throw new HttpError(404, 'SOP no encontrado');
    }
    if (existing.status === SopStatus.published) {
      throw new HttpError(400, 'No se puede eliminar un SOP publicado');
    }
    await prisma.sop.delete({ where: { id } });
    await auditService.record(
      'Sop',
      id,
      'DELETE',
      userId,
      existing.process.projectId,
      existing,
      null
    );
  },

  async publish(id: string, userId: string) {
    const sop = await prisma.sop.findUnique({
      where: { id },
      include: { process: true }
    });
    if (!sop) {
      throw new HttpError(404, 'SOP no encontrado');
    }

    if (sop.status === SopStatus.published) {
      return sop;
    }

    const updated = await prisma.sop.update({
      where: { id },
      data: { status: SopStatus.published },
      include: { process: true }
    });

    const dueAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

    const existingWorkflow = await prisma.approvalWorkflow.findFirst({
      where: {
        projectId: sop.process.projectId,
        resourceType: 'SOP',
        resourceId: sop.id
      }
    });

    if (!existingWorkflow) {
      await approvalService.create(
        {
          projectId: sop.process.projectId,
          resourceType: 'SOP',
          resourceId: sop.id,
          status: 'pending',
          dueAt,
          steps: [
            {
              order: 1,
              approverRole: 'sponsor',
              status: 'pending'
            }
          ]
        },
        userId
      );
    }

    await auditService.record(
      'Sop',
      id,
      'PUBLISH',
      userId,
      sop.process.projectId,
      sop,
      updated
    );

    return updated;
  }
};
