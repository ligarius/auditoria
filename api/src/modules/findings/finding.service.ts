import { prisma } from '../../core/config/db';
import { HttpError } from '../../core/errors/http-error';
import { auditService } from '../audit/audit.service';

interface FindingInput {
  title: string;
  impact: string;
  recommendation: string;
  severity?: string;
  area?: string | null;
  costEstimate?: number | null;
  isQuickWin?: boolean;
  effortDays?: number | null;
  responsibleR?: string | null;
  accountableA?: string | null;
  targetDate?: Date | null;
  evidence?: string | null;
  status?: string;
}

const ensureRACI = (
  responsible?: string | null,
  accountable?: string | null
) => {
  if (!responsible || !accountable) {
    throw new HttpError(400, 'Responsable R y Accountable A son obligatorios');
  }
};

export const findingService = {
  async list(projectId: string) {
    return prisma.finding.findMany({
      where: { projectId },
      include: { actionItems: true },
      orderBy: { createdAt: 'desc' }
    });
  },

  async create(projectId: string, payload: FindingInput, userId: string) {
    ensureRACI(payload.responsibleR, payload.accountableA);
    const created = await prisma.finding.create({
      data: {
        projectId,
        title: payload.title,
        impact: payload.impact,
        recommendation: payload.recommendation,
        severity: payload.severity ?? 'media',
        area: payload.area ?? null,
        costEstimate: payload.costEstimate ?? null,
        isQuickWin: payload.isQuickWin ?? false,
        effortDays: payload.effortDays ?? null,
        responsibleR: payload.responsibleR ?? null,
        accountableA: payload.accountableA ?? null,
        targetDate: payload.targetDate ?? null,
        evidence: payload.evidence ?? null,
        status: payload.status ?? 'open'
      }
    });
    await auditService.record(
      'Finding',
      created.id,
      'CREATE',
      userId,
      projectId,
      null,
      created
    );
    return created;
  },

  async update(id: string, payload: Partial<FindingInput>, userId: string) {
    const before = await prisma.finding.findUnique({ where: { id } });
    if (!before) throw new HttpError(404, 'Hallazgo no encontrado');
    const responsibleR = payload.responsibleR ?? before.responsibleR;
    const accountableA = payload.accountableA ?? before.accountableA;
    ensureRACI(responsibleR, accountableA);

    const updated = await prisma.finding.update({
      where: { id },
      data: {
        title: payload.title ?? undefined,
        impact: payload.impact ?? undefined,
        recommendation: payload.recommendation ?? undefined,
        severity: payload.severity ?? undefined,
        area: payload.area === undefined ? undefined : payload.area,
        costEstimate:
          payload.costEstimate === undefined ? undefined : payload.costEstimate,
        isQuickWin: payload.isQuickWin ?? undefined,
        effortDays:
          payload.effortDays === undefined ? undefined : payload.effortDays,
        responsibleR,
        accountableA,
        targetDate:
          payload.targetDate === undefined ? undefined : payload.targetDate,
        evidence: payload.evidence === undefined ? undefined : payload.evidence,
        status: payload.status ?? undefined
      }
    });
    await auditService.record(
      'Finding',
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
    const before = await prisma.finding.findUnique({ where: { id } });
    if (!before) throw new HttpError(404, 'Hallazgo no encontrado');
    await prisma.finding.delete({ where: { id } });
    await auditService.record(
      'Finding',
      id,
      'DELETE',
      userId,
      before.projectId,
      before,
      null
    );
  }
};
