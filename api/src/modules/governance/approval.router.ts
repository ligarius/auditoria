import { Router } from 'express';
import { z } from 'zod';

import { authenticate, requireRole } from '../../core/middleware/auth.js';
import { enforceProjectAccess } from '../../core/security/enforce-project-access.js';

import { approvalService } from './approval.service.js';

const approvalRouter = Router();

approvalRouter.use(authenticate);

const stepSchema = z.object({
  approverId: z.string().min(1).optional(),
  approverRole: z.string().optional(),
  order: z.number().int().positive().optional(),
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
  comments: z.string().optional(),
  decidedAt: z.coerce.date().optional()
});

const baseSchema = z.object({
  projectId: z.string().min(1, 'Proyecto requerido'),
  resourceType: z.string().min(1, 'Tipo de recurso requerido'),
  resourceId: z.string().min(1, 'Recurso requerido'),
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
  dueAt: z.coerce.date().optional(),
  steps: z.array(stepSchema).optional()
});

const updateSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
  dueAt: z.coerce.date().optional().nullable()
});

approvalRouter.get('/', async (req, res) => {
  const projectId =
    typeof req.query.projectId === 'string' ? req.query.projectId : undefined;
  const resourceType =
    typeof req.query.resourceType === 'string'
      ? req.query.resourceType
      : undefined;
  const resourceId =
    typeof req.query.resourceId === 'string' ? req.query.resourceId : undefined;
  const status =
    typeof req.query.status === 'string' &&
    ['pending', 'approved', 'rejected'].includes(req.query.status)
      ? (req.query.status as 'pending' | 'approved' | 'rejected')
      : undefined;
  const overdueParam =
    typeof req.query.overdue === 'string' ? req.query.overdue : undefined;
  const overdue =
    overdueParam === undefined
      ? undefined
      : overdueParam.toLowerCase() === 'true'
        ? true
        : overdueParam.toLowerCase() === 'false'
          ? false
          : undefined;
  if (projectId) {
    await enforceProjectAccess(req.user, projectId);
  }
  const workflows = await approvalService.list({
    projectId,
    resourceType,
    resourceId,
    overdue,
    status
  });
  res.json(workflows);
});

approvalRouter.get('/pending', async (req, res) => {
  const workflows = await approvalService.listPendingForUser(req.user!.id);
  res.json(workflows);
});

approvalRouter.post(
  '/',
  requireRole('admin', 'consultor'),
  async (req, res) => {
    const payload = baseSchema.parse(req.body);
    await enforceProjectAccess(req.user, payload.projectId);
    const workflow = await approvalService.create(
      {
        ...payload,
        dueAt: payload.dueAt ?? null,
        steps: payload.steps?.map((step) => ({
          ...step,
          approverId: step.approverId ?? null,
          approverRole: step.approverRole ?? null,
          comments: step.comments ?? null,
          decidedAt: step.decidedAt ?? null
        }))
      },
      req.user!.id
    );
    res.status(201).json(workflow);
  }
);

approvalRouter.get('/:id', async (req, res) => {
  const workflow = await approvalService.get(req.params.id);
  await enforceProjectAccess(req.user, workflow.projectId);
  res.json(workflow);
});

const decisionSchema = z.object({
  comments: z.string().optional()
});

approvalRouter.post('/:id/approve', async (req, res) => {
  const workflow = await approvalService.get(req.params.id);
  await enforceProjectAccess(req.user, workflow.projectId);
  const updated = await approvalService.approve(req.params.id, req.user!.id);
  res.json(updated);
});

approvalRouter.post('/:id/reject', async (req, res) => {
  const payload = decisionSchema.parse(req.body ?? {});
  const workflow = await approvalService.get(req.params.id);
  await enforceProjectAccess(req.user, workflow.projectId);
  const updated = await approvalService.reject(
    req.params.id,
    req.user!.id,
    payload.comments
  );
  res.json(updated);
});

approvalRouter.put(
  '/:id',
  requireRole('admin', 'consultor'),
  async (req, res) => {
    const payload = updateSchema.parse(req.body);
    const workflow = await approvalService.get(req.params.id);
    await enforceProjectAccess(req.user, workflow.projectId);
    const updated = await approvalService.update(
      req.params.id,
      {
        status: payload.status,
        dueAt: payload.dueAt === undefined ? undefined : payload.dueAt
      },
      req.user!.id
    );
    res.json(updated);
  }
);

approvalRouter.delete('/:id', requireRole('admin'), async (req, res) => {
  const workflow = await approvalService.get(req.params.id);
  await enforceProjectAccess(req.user, workflow.projectId);
  await approvalService.remove(req.params.id, req.user!.id);
  res.status(204).end();
});

export { approvalRouter };
