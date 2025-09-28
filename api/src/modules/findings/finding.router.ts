import { Router } from 'express';

import { prisma } from '../../core/config/db.js';
import { enforceProjectAccess } from '../../core/security/enforce-project-access.js';
import { authenticate, requireProjectMembership, requireRole } from '../../core/middleware/auth.js';
import { authorizeTenantScope } from '../../middleware/authz.js';
import { findingService } from './finding.service.js';

const findingRouter = Router();

findingRouter.use(authenticate);
findingRouter.use(authorizeTenantScope);

findingRouter.get('/', requireProjectMembership(), async (req, res) => {
  const projectId = (req as any).projectId as string;
  const findings = await findingService.list(projectId);
  res.json(findings);
});

findingRouter.post('/', requireRole('admin', 'consultor'), requireProjectMembership(), async (req, res) => {
  const projectId = (req as any).projectId as string;
  const finding = await findingService.create(projectId, req.body, req.user!.id);
  res.status(201).json(finding);
});

findingRouter.patch('/:id', requireRole('admin', 'consultor'), async (req, res) => {
  const { id } = req.params;
  const item = await prisma.finding.findUnique({ where: { id } });
  if (!item) {
    return res.status(404).json({ title: 'No encontrado' });
  }
  await enforceProjectAccess(req.user, item.projectId);
  const finding = await findingService.update(id, req.body, req.user!.id);
  res.json(finding);
});

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
