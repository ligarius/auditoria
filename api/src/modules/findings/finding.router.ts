import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../../core/config/db';
import { enforceProjectAccess } from '../../core/security/enforce-project-access';
import {
  authenticate,
  requireProjectMembership,
  requireRole
} from '../../core/middleware/auth';

import { findingService } from './finding.service';

const findingRouter = Router();

findingRouter.use(authenticate);

const baseSchema = z.object({
  projectId: z.string().min(1, 'Proyecto requerido'),
  title: z.string().min(1, 'Título requerido'),
  impact: z.string().min(1, 'Impacto requerido'),
  recommendation: z.string().min(1, 'Recomendación requerida'),
  severity: z.string().min(1).optional(),
  area: z.string().optional().nullable(),
  costEstimate: z.coerce.number().nonnegative().optional().nullable(),
  isQuickWin: z.boolean().optional(),
  effortDays: z.coerce.number().int().nonnegative().optional().nullable(),
  responsibleR: z.string().min(1, 'Responsable requerido'),
  accountableA: z.string().min(1, 'Accountable requerido'),
  targetDate: z.coerce.date().optional().nullable(),
  evidence: z.string().optional().nullable(),
  status: z.string().optional()
});

const updateSchema = baseSchema.partial({ projectId: true });

findingRouter.get('/', requireProjectMembership(), async (req, res) => {
  const projectId = (req as any).projectId as string;
  const findings = await findingService.list(projectId);
  res.json(findings);
});

findingRouter.post(
  '/',
  requireRole('admin', 'consultor'),
  requireProjectMembership(),
  async (req, res) => {
    const payload = baseSchema.parse(req.body);
    await enforceProjectAccess(req.user, payload.projectId);
    const finding = await findingService.create(
      payload.projectId,
      {
        title: payload.title,
        impact: payload.impact,
        recommendation: payload.recommendation,
        severity: payload.severity,
        area: payload.area ?? null,
        costEstimate: payload.costEstimate ?? null,
        isQuickWin: payload.isQuickWin,
        effortDays: payload.effortDays ?? null,
        responsibleR: payload.responsibleR,
        accountableA: payload.accountableA,
        targetDate: payload.targetDate ?? null,
        evidence: payload.evidence ?? null,
        status: payload.status
      },
      req.user!.id
    );
    res.status(201).json(finding);
  }
);

findingRouter.patch(
  '/:id',
  requireRole('admin', 'consultor'),
  async (req, res) => {
    const { id } = req.params;
    const item = await prisma.finding.findUnique({ where: { id } });
    if (!item) {
      return res.status(404).json({ title: 'No encontrado' });
    }
    await enforceProjectAccess(req.user, item.projectId);
    const payload = updateSchema.parse({
      ...req.body,
      projectId: item.projectId
    });
    const finding = await findingService.update(
      id,
      {
        title: payload.title,
        impact: payload.impact,
        recommendation: payload.recommendation,
        severity: payload.severity,
        area: payload.area === undefined ? undefined : payload.area,
        costEstimate:
          payload.costEstimate === undefined ? undefined : payload.costEstimate,
        isQuickWin: payload.isQuickWin ?? undefined,
        effortDays:
          payload.effortDays === undefined ? undefined : payload.effortDays,
        responsibleR: payload.responsibleR,
        accountableA: payload.accountableA,
        targetDate:
          payload.targetDate === undefined ? undefined : payload.targetDate,
        evidence: payload.evidence === undefined ? undefined : payload.evidence,
        status: payload.status
      },
      req.user!.id
    );
    res.json(finding);
  }
);

findingRouter.delete('/:id', requireRole('admin'), async (req, res) => {
  const { id } = req.params;
  const item = await prisma.finding.findUnique({ where: { id } });
  if (!item) {
    return res.status(404).json({ title: 'No encontrado' });
  }
  await enforceProjectAccess(req.user, item.projectId);
  await findingService.remove(id, req.user!.id);
  res.status(204).end();
});

export { findingRouter };
