import { prisma } from '../../core/config/db.js';
import { HttpError } from '../../core/errors/http-error.js';
import { auditService } from '../audit/audit.service.js';

export interface ApprovalWorkflowInput {
  projectId: string;
  resourceType: string;
  resourceId: string;
  status?: 'pending' | 'approved' | 'rejected';
  dueAt?: Date | null;
  steps?: { approverId?: string | null; approverRole?: string | null; order?: number; status?: 'pending' | 'approved' | 'rejected'; comments?: string | null; decidedAt?: Date | null }[];
}

export interface ApprovalWorkflowUpdateInput {
  status?: 'pending' | 'approved' | 'rejected';
  dueAt?: Date | null;
}

export const approvalService = {
  async list(filters: { projectId?: string; resourceType?: string; resourceId?: string }) {
    const { projectId, resourceType, resourceId } = filters;
    return prisma.approvalWorkflow.findMany({
      where: {
        projectId: projectId ?? undefined,
        resourceType: resourceType ?? undefined,
        resourceId: resourceId ?? undefined,
      },
      include: { steps: true, slaTimers: true },
      orderBy: { createdAt: 'desc' },
    });
  },

  async get(id: string) {
    const workflow = await prisma.approvalWorkflow.findUnique({
      where: { id },
      include: { steps: true, slaTimers: true },
    });
    if (!workflow) {
      throw new HttpError(404, 'Flujo de aprobación no encontrado');
    }
    return workflow;
  },

  async create(data: ApprovalWorkflowInput, userId: string) {
    const workflow = await prisma.approvalWorkflow.create({
      data: {
        projectId: data.projectId,
        resourceType: data.resourceType,
        resourceId: data.resourceId,
        status: data.status ?? 'pending',
        dueAt: data.dueAt ?? null,
        steps: data.steps?.length
          ? {
              create: data.steps.map((step, index) => ({
                order: step.order ?? index + 1,
                approverId: step.approverId ?? null,
                approverRole: step.approverRole ?? null,
                status: step.status ?? 'pending',
                comments: step.comments ?? null,
                decidedAt: step.decidedAt ?? null,
              })),
            }
          : undefined,
        slaTimers:
          data.dueAt
            ? {
                create: {
                  dueAt: data.dueAt,
                },
              }
            : undefined,
      },
      include: { steps: true, slaTimers: true },
    });
    await auditService.record('ApprovalWorkflow', workflow.id, 'CREATE', userId, data.projectId, null, workflow);
    return workflow;
  },

  async update(id: string, data: ApprovalWorkflowUpdateInput, userId: string) {
    const existing = await prisma.approvalWorkflow.findUnique({ where: { id } });
    if (!existing) {
      throw new HttpError(404, 'Flujo de aprobación no encontrado');
    }
    const updated = await prisma.approvalWorkflow.update({
      where: { id },
      data: {
        status: data.status ?? undefined,
        dueAt: data.dueAt === undefined ? undefined : data.dueAt,
      },
      include: { steps: true, slaTimers: true },
    });
    await auditService.record('ApprovalWorkflow', id, 'UPDATE', userId, existing.projectId, existing, updated);
    return updated;
  },

  async remove(id: string, userId: string) {
    const existing = await prisma.approvalWorkflow.findUnique({ where: { id } });
    if (!existing) {
      throw new HttpError(404, 'Flujo de aprobación no encontrado');
    }
    await prisma.approvalWorkflow.delete({ where: { id } });
    await auditService.record('ApprovalWorkflow', id, 'DELETE', userId, existing.projectId, existing, null);
  },
};
