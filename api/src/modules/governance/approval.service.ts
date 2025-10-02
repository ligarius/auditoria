import { prisma } from '../../core/config/db.js';
import { HttpError } from '../../core/errors/http-error.js';
import { auditService } from '../audit/audit.service.js';

export interface ApprovalWorkflowInput {
  projectId: string;
  resourceType: string;
  resourceId: string;
  status?: 'pending' | 'approved' | 'rejected';
  dueAt?: Date | null;
  overdue?: boolean;
  steps?: {
    approverId?: string | null;
    approverRole?: string | null;
    order?: number;
    status?: 'pending' | 'approved' | 'rejected';
    comments?: string | null;
    decidedAt?: Date | null;
  }[];
}

export interface ApprovalWorkflowUpdateInput {
  status?: 'pending' | 'approved' | 'rejected';
  dueAt?: Date | null;
  overdue?: boolean;
}

export const approvalService = {
  async list(filters: {
    projectId?: string;
    resourceType?: string;
    resourceId?: string;
    overdue?: boolean;
    status?: 'pending' | 'approved' | 'rejected';
  }) {
    const { projectId, resourceType, resourceId, overdue, status } = filters;
    return prisma.approvalWorkflow.findMany({
      where: {
        projectId: projectId ?? undefined,
        resourceType: resourceType ?? undefined,
        resourceId: resourceId ?? undefined,
        overdue: overdue === undefined ? undefined : overdue,
        status: status ?? undefined
      },
      include: {
        steps: {
          include: {
            approver: { select: { id: true, name: true, email: true } }
          }
        },
        slaTimers: true,
        project: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
  },

  async get(id: string) {
    const workflow = await prisma.approvalWorkflow.findUnique({
      where: { id },
      include: {
        steps: {
          include: {
            approver: { select: { id: true, name: true, email: true } }
          }
        },
        slaTimers: true,
        project: { select: { id: true, name: true } }
      }
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
        overdue: data.overdue ?? false,
        steps: data.steps?.length
          ? {
              create: data.steps.map((step, index) => ({
                order: step.order ?? index + 1,
                approverId: step.approverId ?? null,
                approverRole: step.approverRole ?? null,
                status: step.status ?? 'pending',
                comments: step.comments ?? null,
                decidedAt: step.decidedAt ?? null
              }))
            }
          : undefined,
        slaTimers: data.dueAt
          ? {
              create: {
                dueAt: data.dueAt
              }
            }
          : undefined
      },
      include: {
        steps: {
          include: {
            approver: { select: { id: true, name: true, email: true } }
          }
        },
        slaTimers: true,
        project: { select: { id: true, name: true } }
      }
    });
    await auditService.record(
      'ApprovalWorkflow',
      workflow.id,
      'CREATE',
      userId,
      data.projectId,
      null,
      workflow
    );
    return workflow;
  },

  async update(id: string, data: ApprovalWorkflowUpdateInput, userId: string) {
    const existing = await prisma.approvalWorkflow.findUnique({
      where: { id },
      include: { steps: true, slaTimers: true, project: true }
    });
    if (!existing) {
      throw new HttpError(404, 'Flujo de aprobación no encontrado');
    }
    const updated = await prisma.approvalWorkflow.update({
      where: { id },
      data: {
        status: data.status ?? undefined,
        dueAt: data.dueAt === undefined ? undefined : data.dueAt,
        overdue: data.overdue === undefined ? undefined : data.overdue
      },
      include: {
        steps: {
          include: {
            approver: { select: { id: true, name: true, email: true } }
          }
        },
        slaTimers: true,
        project: { select: { id: true, name: true } }
      }
    });
    await auditService.record(
      'ApprovalWorkflow',
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
    const existing = await prisma.approvalWorkflow.findUnique({
      where: { id }
    });
    if (!existing) {
      throw new HttpError(404, 'Flujo de aprobación no encontrado');
    }
    await prisma.approvalWorkflow.delete({ where: { id } });
    await auditService.record(
      'ApprovalWorkflow',
      id,
      'DELETE',
      userId,
      existing.projectId,
      existing,
      null
    );
  },

  async listPendingForUser(userId: string) {
    return prisma.approvalWorkflow.findMany({
      where: {
        status: 'pending',
        steps: {
          some: {
            approverId: userId,
            status: 'pending'
          }
        }
      },
      include: {
        steps: {
          include: {
            approver: { select: { id: true, name: true, email: true } }
          },
          orderBy: { order: 'asc' }
        },
        project: { select: { id: true, name: true } }
      },
      orderBy: { dueAt: 'asc' }
    });
  },

  async approve(id: string, userId: string) {
    const workflow = await prisma.approvalWorkflow.findUnique({
      where: { id },
      include: {
        steps: {
          include: {
            approver: { select: { id: true, name: true, email: true } }
          },
          orderBy: { order: 'asc' }
        },
        project: true,
        slaTimers: true
      }
    });
    if (!workflow) {
      throw new HttpError(404, 'Flujo de aprobación no encontrado');
    }
    const step = workflow.steps.find(
      (item) => item.status === 'pending' && item.approverId === userId
    );
    if (!step) {
      throw new HttpError(403, 'No tienes pasos pendientes en este flujo');
    }

    const allOtherApproved = workflow.steps
      .filter((item) => item.id !== step.id)
      .every((item) => item.status === 'approved');

    await prisma.$transaction(async (tx) => {
      await tx.approvalStep.update({
        where: { id: step.id },
        data: { status: 'approved', decidedAt: new Date() }
      });

      const newStatus = allOtherApproved ? 'approved' : 'pending';
      await tx.approvalWorkflow.update({
        where: { id },
        data: {
          status: newStatus,
          overdue: newStatus !== 'pending' ? false : workflow.overdue
        }
      });
    });

    const updated = await approvalService.get(id);
    await auditService.record(
      'ApprovalWorkflow',
      id,
      'UPDATE',
      userId,
      workflow.projectId,
      workflow,
      updated
    );
    return updated;
  },

  async reject(id: string, userId: string, comments?: string) {
    const workflow = await prisma.approvalWorkflow.findUnique({
      where: { id },
      include: {
        steps: {
          include: {
            approver: { select: { id: true, name: true, email: true } }
          },
          orderBy: { order: 'asc' }
        },
        project: true,
        slaTimers: true
      }
    });
    if (!workflow) {
      throw new HttpError(404, 'Flujo de aprobación no encontrado');
    }
    const step = workflow.steps.find(
      (item) => item.status === 'pending' && item.approverId === userId
    );
    if (!step) {
      throw new HttpError(403, 'No tienes pasos pendientes en este flujo');
    }

    await prisma.$transaction(async (tx) => {
      await tx.approvalStep.update({
        where: { id: step.id },
        data: {
          status: 'rejected',
          decidedAt: new Date(),
          comments: comments ?? null
        }
      });

      await tx.approvalWorkflow.update({
        where: { id },
        data: {
          status: 'rejected',
          overdue: false
        }
      });
    });

    const updated = await approvalService.get(id);
    await auditService.record(
      'ApprovalWorkflow',
      id,
      'UPDATE',
      userId,
      workflow.projectId,
      workflow,
      updated
    );
    return updated;
  },

  async markOverdueWorkflows(referenceDate: Date) {
    const candidates = await prisma.approvalWorkflow.findMany({
      where: {
        status: 'pending',
        overdue: false,
        dueAt: {
          not: null,
          lt: referenceDate
        }
      },
      include: {
        steps: {
          include: {
            approver: { select: { id: true, name: true, email: true } }
          },
          orderBy: { order: 'asc' }
        },
        project: { select: { id: true, name: true } }
      }
    });

    const updated: typeof candidates = [];
    for (const workflow of candidates) {
      const refreshed = await prisma.approvalWorkflow.update({
        where: { id: workflow.id },
        data: { overdue: true },
        include: {
          steps: {
            include: {
              approver: { select: { id: true, name: true, email: true } }
            },
            orderBy: { order: 'asc' }
          },
          project: { select: { id: true, name: true } }
        }
      });
      updated.push(refreshed);
    }

    return updated;
  }
};
