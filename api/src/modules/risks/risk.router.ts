import { Router } from 'express';

import { prisma } from '../../core/config/db.js';
import { authenticate, requireProjectMembership, requireRole } from '../../core/middleware/auth.js';
import { riskService } from './risk.service.js';

const riskRouter = Router();

riskRouter.use(authenticate);

riskRouter.get('/', requireProjectMembership(), async (req, res) => {
  const projectId = (req as any).projectId as string;
  const rag = typeof req.query.rag === 'string' ? req.query.rag : undefined;
  const risks = await riskService.list(projectId, rag);
  res.json(risks);
});

riskRouter.post('/', requireRole('admin', 'consultor'), requireProjectMembership(), async (req, res) => {
  const projectId = (req as any).projectId as string;
  const risk = await riskService.create(projectId, req.body, req.user!.id);
  res.status(201).json(risk);
});

riskRouter.patch('/:id', requireRole('admin', 'consultor'), async (req, res) => {
  const { id } = req.params;
  const item = await prisma.risk.findUnique({ where: { id } });
  if (!item) {
    return res.status(404).json({ title: 'No encontrado' });
  }
  const membership = await prisma.membership.findUnique({
    where: { userId_projectId: { userId: req.user!.id, projectId: item.projectId } }
  });
  if (!membership) {
    return res.status(403).json({ title: 'Sin acceso al proyecto' });
  }
  const risk = await riskService.update(id, req.body, req.user!.id);
  res.json(risk);
});

riskRouter.delete('/:id', requireRole('admin'), async (req, res) => {
  const { id } = req.params;
  const item = await prisma.risk.findUnique({ where: { id } });
  if (!item) {
    return res.status(404).json({ title: 'No encontrado' });
  }
  const membership = await prisma.membership.findUnique({
    where: { userId_projectId: { userId: req.user!.id, projectId: item.projectId } }
  });
  if (!membership) {
    return res.status(403).json({ title: 'Sin acceso al proyecto' });
  }
  await riskService.remove(id, req.user!.id);
  res.status(204).end();
});

export { riskRouter };
