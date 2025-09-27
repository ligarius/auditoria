import { Router } from 'express';

import { authenticate } from '../../core/middleware/auth.js';
import { projectService } from './project.service.js';

const projectRouter = Router();

projectRouter.use(authenticate);

projectRouter.get('/', async (req, res) => {
  const projects = await projectService.listByUser(req.user!.id);
  res.json(projects);
});

projectRouter.get('/:projectId', async (req, res) => {
  const project = await projectService.getById(req.params.projectId);
  res.json(project);
});

projectRouter.post('/', async (req, res) => {
  const project = await projectService.create(req.body, req.user!.id);
  res.status(201).json(project);
});

projectRouter.put('/:projectId', async (req, res) => {
  const project = await projectService.update(req.params.projectId, req.body, req.user!.id);
  res.json(project);
});

projectRouter.delete('/:projectId', async (req, res) => {
  await projectService.remove(req.params.projectId, req.user!.id);
  res.status(204).send();
});

projectRouter.post('/:projectId/invite', async (req, res) => {
  const { email, role } = req.body;
  const user = await projectService.invite(req.params.projectId, email, role);
  res.json(user);
});

export { projectRouter };
