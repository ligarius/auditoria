import { Router } from 'express';
import { z } from 'zod';

import {
  authenticate,
  requireProjectMembership,
  requireRole
} from '../../core/middleware/auth.js';
import { enforceProjectAccess } from '../../core/security/enforce-project-access.js';
import { processCatalogService } from './process-catalog.service.js';

const processCatalogRouter = Router();

processCatalogRouter.use(authenticate);

const baseSchema = z.object({
  projectId: z.string().min(1, 'Proyecto requerido'),
  name: z.string().min(1, 'Nombre requerido'),
  type: z.enum(['AS_IS', 'TO_BE']),
  version: z.number().int().positive().optional(),
  description: z.string().optional().nullable()
});

const updateSchema = baseSchema.partial({ projectId: true }).extend({
  version: z.number().int().positive().optional()
});

processCatalogRouter.get('/', requireProjectMembership(), async (req, res) => {
  const projectId = (req as any).projectId as string;
  const processes = await processCatalogService.list(projectId);
  res.json(processes);
});

processCatalogRouter.get('/:id', async (req, res) => {
  const process = await processCatalogService.get(req.params.id);
  await enforceProjectAccess(req.user, process.projectId);
  res.json(process);
});

processCatalogRouter.post(
  '/',
  requireRole('admin', 'consultor'),
  requireProjectMembership(),
  async (req, res) => {
    const payload = baseSchema.parse(req.body);
    await enforceProjectAccess(req.user, payload.projectId);
    const created = await processCatalogService.create(payload, req.user!.id);
    res.status(201).json(created);
  }
);

processCatalogRouter.put(
  '/:id',
  requireRole('admin', 'consultor'),
  async (req, res) => {
    const payload = updateSchema.parse(req.body);
    const existing = await processCatalogService.get(req.params.id);
    await enforceProjectAccess(req.user, existing.projectId);
    const updated = await processCatalogService.update(
      req.params.id,
      payload,
      req.user!.id
    );
    res.json(updated);
  }
);

processCatalogRouter.delete('/:id', requireRole('admin'), async (req, res) => {
  const existing = await processCatalogService.get(req.params.id);
  await enforceProjectAccess(req.user, existing.projectId);
  await processCatalogService.remove(req.params.id, req.user!.id);
  res.status(204).end();
});

export { processCatalogRouter };
