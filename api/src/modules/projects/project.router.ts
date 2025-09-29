import { Router } from 'express';
import { z } from 'zod';

import { authenticate, requireRole } from '../../core/middleware/auth.js';
import { enforceProjectAccess } from '../../core/security/enforce-project-access.js';
import { projectService } from './project.service.js';

const projectRouter = Router();

projectRouter.use(authenticate);

const WORKFLOW_STATE_VALUES = ['PLANNING', 'FIELDWORK', 'REPORT', 'CLOSE'] as const;
const workflowTransitionSchema = z.object({
  state: z
    .string()
    .min(1)
    .transform((value) => value.toUpperCase())
    .refine((value) => WORKFLOW_STATE_VALUES.includes(value as (typeof WORKFLOW_STATE_VALUES)[number]), {
      message: 'Estado inválido',
    }),
});

const workflowDiagramSchema = z.object({
  definition: z.any(),
});

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

projectRouter.get('/:projectId/workflow', async (req, res) => {
  const workflow = await projectService.getWorkflow(req.params.projectId, {
    id: req.user!.id,
    role: req.user!.role,
  });
  res.json(workflow);
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

projectRouter.put(
  '/:projectId/workflow/diagram',
  requireRole('admin', 'consultor'),
  async (req, res) => {
    await enforceProjectAccess(req.user, req.params.projectId);
    const body = workflowDiagramSchema.parse(req.body);
    const workflow = await projectService.saveWorkflowDiagram(
      req.params.projectId,
      body.definition,
      { id: req.user!.id, role: req.user!.role }
    );
    res.json(workflow);
  }
);

projectRouter.post(
  '/:projectId/workflow/transition',
  requireRole('admin', 'consultor'),
  async (req, res) => {
    await enforceProjectAccess(req.user, req.params.projectId);
    const body = workflowTransitionSchema.parse(req.body);
    const workflow = await projectService.transitionWorkflow(
      req.params.projectId,
      body.state,
      { id: req.user!.id, role: req.user!.role }
    );
    res.json(workflow);
  }
);

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
