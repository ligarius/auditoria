import { Router } from 'express';

import { authenticate, requireRole } from '../../core/middleware/auth.js';
import { enforceProjectAccess } from '../../core/security/enforce-project-access.js';
import { authorizeTenantScope } from '../../middleware/authz.js';
import { projectService } from './project.service.js';

const projectRouter = Router();

projectRouter.use(authenticate);
projectRouter.use(authorizeTenantScope);

projectRouter.get('/', async (req, res) => {
  const projects = await projectService.listByUser(req.user!.id, req.user!.role);
  res.json(projects);
});

projectRouter.get('/:projectId/features', async (req, res) => {
  const result = await projectService.getFeatures(req.params.projectId, {
    id: req.user!.id,
    role: req.user!.role
  });
  res.json(result);
});

projectRouter.get('/:projectId/summary', async (req, res) => {
  const summary = await projectService.summary(req.params.projectId, {
    id: req.user!.id,
    role: req.user!.role
  });
  res.json(summary);
});

projectRouter.get('/:projectId', async (req, res) => {
  const project = await projectService.getById(req.params.projectId, {
    id: req.user!.id,
    role: req.user!.role
  });
  res.json(project);
});

projectRouter.post('/', requireRole('admin', 'consultor'), async (req, res) => {
  const project = await projectService.create(req.body, {
    id: req.user!.id,
    role: req.user!.role
  });
  res.status(201).json(project);
});

projectRouter.put('/:projectId', requireRole('admin', 'consultor'), async (req, res) => {
  await enforceProjectAccess(req.user, req.params.projectId);
  const project = await projectService.update(req.params.projectId, req.body, {
    id: req.user!.id,
    role: req.user!.role
  });
  res.json(project);
});

projectRouter.delete('/:projectId', requireRole('admin'), async (req, res) => {
  await enforceProjectAccess(req.user, req.params.projectId);
  await projectService.remove(req.params.projectId, req.user!.id);
  res.status(204).send();
});

projectRouter.post('/:projectId/invite', requireRole('admin'), async (req, res) => {
  await enforceProjectAccess(req.user, req.params.projectId);
  const { email, role } = req.body;
  const user = await projectService.invite(req.params.projectId, email, role);
  res.json(user);
});

export { projectRouter };
