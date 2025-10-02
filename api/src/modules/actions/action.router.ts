import { Router } from 'express';
import { z } from 'zod';

import {
  authenticate,
  requireProjectMembership,
  requireRole
} from '../../core/middleware/auth.js';
import { enforceProjectAccess } from '../../core/security/enforce-project-access.js';
import { actionService } from './action.service.js';

const actionRouter = Router();

actionRouter.use(authenticate);

const baseSchema = z.object({
  projectId: z.string().min(1, 'Proyecto requerido'),
  findingId: z.string().optional().nullable(),
  title: z.string().min(1, 'Título requerido'),
  description: z.string().optional().nullable(),
  owner: z.string().optional().nullable(),
  dueDate: z.coerce.date().optional().nullable(),
  category: z.enum(['quick_win', 'capex', 'opex']).optional(),
  status: z.enum(['todo', 'in_progress', 'done']).optional()
});

const updateSchema = baseSchema.partial({ projectId: true });

actionRouter.get('/', requireProjectMembership(), async (req, res) => {
  const projectId = (req as any).projectId as string;
  const actions = await actionService.list(projectId);
  res.json(actions);
});

actionRouter.post(
  '/',
  requireRole('admin', 'consultor'),
  requireProjectMembership(),
  async (req, res) => {
    const payload = baseSchema.parse(req.body);
    await enforceProjectAccess(req.user, payload.projectId);
    const created = await actionService.create(
      {
        projectId: payload.projectId,
        findingId: payload.findingId ?? undefined,
        title: payload.title,
        description: payload.description ?? undefined,
        owner: payload.owner ?? undefined,
        dueDate: payload.dueDate ?? undefined,
        category: payload.category,
        status: payload.status
      },
      req.user!.id
    );
    res.status(201).json(created);
  }
);

actionRouter.patch(
  '/:id',
  requireRole('admin', 'consultor'),
  async (req, res) => {
    const payload = updateSchema.parse(req.body);
    const existing = await actionService.get(req.params.id);
    await enforceProjectAccess(req.user, existing.projectId);
    const updated = await actionService.update(
      req.params.id,
      {
        findingId: payload.findingId ?? undefined,
        title: payload.title,
        description: payload.description ?? undefined,
        owner: payload.owner ?? undefined,
        dueDate: payload.dueDate ?? undefined,
        category: payload.category,
        status: payload.status
      },
      req.user!.id
    );
    res.json(updated);
  }
);

actionRouter.delete(
  '/:id',
  requireRole('admin', 'consultor'),
  async (req, res) => {
    const existing = await actionService.get(req.params.id);
    await enforceProjectAccess(req.user, existing.projectId);
    await actionService.remove(req.params.id, req.user!.id);
    res.status(204).end();
  }
);

export { actionRouter };
