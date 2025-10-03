import { Router } from 'express';
import { z } from 'zod';

import { authenticate, requireRole } from '../../core/middleware/auth.js';
import { enforceProjectAccess } from '../../core/security/enforce-project-access.js';

import { scopeChangeService } from './scope-change.service.js';

const scopeChangeRouter = Router();

scopeChangeRouter.use(authenticate);

const baseSchema = z.object({
  projectId: z.string().min(1, 'Proyecto requerido'),
  meetingId: z.string().min(1).optional(),
  title: z.string().min(1, 'Título requerido'),
  description: z.string().optional(),
  impact: z.string().optional(),
  scheduleImpact: z.string().min(1, 'Impacto en plazo requerido'),
  costImpact: z.string().min(1, 'Impacto en costo requerido'),
  status: z.string().optional(),
  requestedBy: z.string().optional(),
  requestedAt: z.coerce.date().optional(),
  decidedAt: z.coerce.date().optional(),
  decision: z.string().optional(),
  approvalWorkflowId: z.string().min(1).optional()
});

const updateSchema = baseSchema.partial();

scopeChangeRouter.get('/', async (req, res) => {
  const projectId =
    typeof req.query.projectId === 'string' ? req.query.projectId : undefined;
  if (projectId) {
    await enforceProjectAccess(req.user, projectId);
  }
  const items = await scopeChangeService.list(projectId);
  res.json(items);
});

scopeChangeRouter.post(
  '/',
  requireRole('admin', 'consultor'),
  async (req, res) => {
    const payload = baseSchema.parse(req.body);
    await enforceProjectAccess(req.user, payload.projectId);
    const item = await scopeChangeService.create({
      ...payload,
      meetingId: payload.meetingId || null,
      description: payload.description ?? null,
      impact: payload.impact ?? null,
      scheduleImpact: payload.scheduleImpact,
      costImpact: payload.costImpact,
      requestedBy: payload.requestedBy ?? null,
      requestedAt: payload.requestedAt ?? new Date(),
      decidedAt: payload.decidedAt ?? null,
      decision: payload.decision ?? null,
      approvalWorkflowId: payload.approvalWorkflowId || null
    });
    res.status(201).json(item);
  }
);

scopeChangeRouter.get('/:id', async (req, res) => {
  const item = await scopeChangeService.get(req.params.id);
  await enforceProjectAccess(req.user, item.projectId);
  res.json(item);
});

scopeChangeRouter.put(
  '/:id',
  requireRole('admin', 'consultor'),
  async (req, res) => {
    const payload = updateSchema.parse(req.body);
    const current = await scopeChangeService.get(req.params.id);
    await enforceProjectAccess(req.user, current.projectId);
    const updated = await scopeChangeService.update(req.params.id, {
      ...payload,
      meetingId:
        payload.meetingId === undefined ? undefined : payload.meetingId || null,
      description: payload.description ?? undefined,
      impact: payload.impact ?? undefined,
      scheduleImpact: payload.scheduleImpact ?? undefined,
      costImpact: payload.costImpact ?? undefined,
      requestedBy: payload.requestedBy ?? undefined,
      requestedAt: payload.requestedAt ?? undefined,
      decidedAt: payload.decidedAt ?? undefined,
      decision: payload.decision ?? undefined,
      approvalWorkflowId:
        payload.approvalWorkflowId === undefined
          ? undefined
          : payload.approvalWorkflowId || null
    });
    res.json(updated);
  }
);

scopeChangeRouter.delete('/:id', requireRole('admin'), async (req, res) => {
  const item = await scopeChangeService.get(req.params.id);
  await enforceProjectAccess(req.user, item.projectId);
  await scopeChangeService.remove(req.params.id);
  res.status(204).end();
});

export { scopeChangeRouter };
