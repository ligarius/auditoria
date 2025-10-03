import { Router } from 'express';
import { z } from 'zod';

import {
  authenticate,
  requireProjectMembership,
  requireRole
} from '../../core/middleware/auth.js';
import { enforceProjectAccess } from '../../core/security/enforce-project-access.js';

import { sopService } from './sop.service.js';

const sopRouter = Router();

sopRouter.use(authenticate);

const stepSchema = z.object({
  id: z.string().optional(),
  order: z.number().int().positive().optional(),
  text: z.string().min(1, 'Texto requerido'),
  kpi: z.record(z.any()).optional().nullable()
});

const baseSchema = z.object({
  projectId: z.string().min(1, 'Proyecto requerido'),
  processId: z.string().min(1, 'Proceso requerido'),
  title: z.string().min(1, 'Título requerido'),
  version: z.number().int().positive().optional(),
  status: z.enum(['draft', 'published']).optional(),
  steps: z.array(stepSchema).optional()
});

const updateSchema = baseSchema.partial({ projectId: true, processId: true });

sopRouter.get('/', requireProjectMembership(), async (req, res) => {
  const projectId = (req as any).projectId as string;
  const processId =
    typeof req.query.processId === 'string' ? req.query.processId : undefined;
  const sops = await sopService.list({ projectId, processId });
  res.json(sops);
});

sopRouter.get('/:id', async (req, res) => {
  const sop = await sopService.get(req.params.id);
  await enforceProjectAccess(req.user, sop.process.projectId);
  const { process: _process, ...rest } = sop as any;
  res.json(rest);
});

sopRouter.post(
  '/',
  requireRole('admin', 'consultor'),
  requireProjectMembership(),
  async (req, res) => {
    const payload = baseSchema.parse(req.body);
    await enforceProjectAccess(req.user, payload.projectId);
    const created = await sopService.create(
      {
        processId: payload.processId,
        title: payload.title,
        version: payload.version,
        status: payload.status,
        steps: payload.steps?.map((step, index) => ({
          ...step,
          order: step.order ?? index + 1
        }))
      },
      req.user!.id
    );
    res.status(201).json(created);
  }
);

sopRouter.patch('/:id', requireRole('admin', 'consultor'), async (req, res) => {
  const payload = updateSchema.parse(req.body);
  const existing = await sopService.get(req.params.id);
  await enforceProjectAccess(req.user, existing.process.projectId);
  const updated = await sopService.update(
    req.params.id,
    {
      title: payload.title,
      version: payload.version,
      status: payload.status,
      steps: payload.steps?.map((step, index) => ({
        ...step,
        order: step.order ?? index + 1
      }))
    },
    req.user!.id
  );
  res.json(updated);
});

sopRouter.post(
  '/:id/publish',
  requireRole('admin', 'consultor'),
  async (req, res) => {
    const sop = await sopService.get(req.params.id);
    await enforceProjectAccess(req.user, sop.process.projectId);
    await sopService.publish(req.params.id, req.user!.id);
    const hydrated = await sopService.get(req.params.id);
    const { process: _process, ...rest } = hydrated as any;
    res.json(rest);
  }
);

sopRouter.delete('/:id', requireRole('admin'), async (req, res) => {
  const sop = await sopService.get(req.params.id);
  await enforceProjectAccess(req.user, sop.process.projectId);
  await sopService.remove(req.params.id, req.user!.id);
  res.status(204).end();
});

export { sopRouter };
