import { Router } from 'express';
import { z } from 'zod';

import { authenticate, requireRole } from '../../core/middleware/auth.js';
import { enforceProjectAccess } from '../../core/security/enforce-project-access.js';
import { committeeService } from './committee.service.js';

const committeeRouter = Router();

committeeRouter.use(authenticate);

const baseSchema = z.object({
  projectId: z.string().min(1, 'Proyecto requerido'),
  name: z.string().min(1, 'Nombre requerido'),
  description: z.string().optional(),
  ownerId: z.string().min(1).optional(),
});

committeeRouter.get('/', async (req, res) => {
  const projectId = typeof req.query.projectId === 'string' ? req.query.projectId : undefined;
  if (projectId) {
    await enforceProjectAccess(req.user, projectId);
  }
  const committees = await committeeService.list(projectId);
  res.json(committees);
});

committeeRouter.post('/', requireRole('admin', 'consultor'), async (req, res) => {
  const payload = baseSchema.parse(req.body);
  await enforceProjectAccess(req.user, payload.projectId);
  const committee = await committeeService.create({
    ...payload,
    ownerId: payload.ownerId || undefined,
  });
  res.status(201).json(committee);
});

committeeRouter.get('/:id', async (req, res) => {
  const committee = await committeeService.get(req.params.id);
  await enforceProjectAccess(req.user, committee.projectId);
  res.json(committee);
});

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  ownerId: z.string().min(1).optional().nullable(),
});

committeeRouter.put('/:id', requireRole('admin', 'consultor'), async (req, res) => {
  const payload = updateSchema.parse(req.body);
  const committee = await committeeService.get(req.params.id);
  await enforceProjectAccess(req.user, committee.projectId);
  const updated = await committeeService.update(req.params.id, {
    name: payload.name,
    description: payload.description ?? null,
    ownerId: payload.ownerId ?? null,
  });
  res.json(updated);
});

committeeRouter.delete('/:id', requireRole('admin'), async (req, res) => {
  const committee = await committeeService.get(req.params.id);
  await enforceProjectAccess(req.user, committee.projectId);
  await committeeService.remove(req.params.id);
  res.status(204).end();
});

export { committeeRouter };
