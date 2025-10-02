import { prisma } from '../../core/config/db.js';
import { HttpError } from '../../core/errors/http-error.js';

export interface ScopeChangeInput {
  projectId: string;
  meetingId?: string | null;
  title: string;
  description?: string | null;
  impact?: string | null;
  scheduleImpact: string;
  costImpact: string;
  status?: string;
  requestedBy?: string | null;
  requestedAt?: Date;
  decidedAt?: Date | null;
  decision?: string | null;
  approvalWorkflowId?: string | null;
}

export const scopeChangeService = {
  async list(projectId?: string) {
    return prisma.scopeChange.findMany({
      where: projectId ? { projectId } : undefined,
      orderBy: { requestedAt: 'desc' },
      include: {
        meeting: { select: { id: true, title: true, scheduledAt: true } },
        approvalWorkflow: {
          select: { id: true, status: true, dueAt: true, overdue: true }
        }
      }
    });
  },

  async get(id: string) {
    const scopeChange = await prisma.scopeChange.findUnique({
      where: { id },
      include: {
        meeting: { select: { id: true, title: true, scheduledAt: true } },
        approvalWorkflow: {
          select: { id: true, status: true, dueAt: true, overdue: true }
        }
      }
    });
    if (!scopeChange) {
      throw new HttpError(404, 'Cambio de alcance no encontrado');
    }
    return scopeChange;
  },

  async create(data: ScopeChangeInput) {
    return prisma.scopeChange.create({
      data,
      include: {
        meeting: { select: { id: true, title: true, scheduledAt: true } },
        approvalWorkflow: {
          select: { id: true, status: true, dueAt: true, overdue: true }
        }
      }
    });
  },

  async update(id: string, data: Partial<ScopeChangeInput>) {
    const existing = await prisma.scopeChange.findUnique({ where: { id } });
    if (!existing) {
      throw new HttpError(404, 'Cambio de alcance no encontrado');
    }
    return prisma.scopeChange.update({
      where: { id },
      data,
      include: {
        meeting: { select: { id: true, title: true, scheduledAt: true } },
        approvalWorkflow: {
          select: { id: true, status: true, dueAt: true, overdue: true }
        }
      }
    });
  },

  async remove(id: string) {
    const existing = await prisma.scopeChange.findUnique({ where: { id } });
    if (!existing) {
      throw new HttpError(404, 'Cambio de alcance no encontrado');
    }
    await prisma.scopeChange.delete({ where: { id } });
  }
};
