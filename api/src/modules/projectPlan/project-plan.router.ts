import { Router } from 'express';

import { authenticate, requireProjectRole } from '../../core/middleware/auth';

import { projectPlanService } from './project-plan.service';

const projectPlanRouter = Router();

projectPlanRouter.use(authenticate);

const readRoles = ['ConsultorLider', 'Auditor', 'SponsorPM', 'Invitado'];
const writeRoles = ['ConsultorLider', 'Auditor'];

projectPlanRouter.get(
  '/:projectId',
  requireProjectRole(readRoles),
  async (req, res) => {
    const tasks = await projectPlanService.list(req.params.projectId);
    res.json(tasks);
  }
);

projectPlanRouter.post(
  '/:projectId',
  requireProjectRole(writeRoles),
  async (req, res) => {
    const task = await projectPlanService.create(
      req.params.projectId,
      req.body,
      req.user!.id
    );
    res.status(201).json(task);
  }
);

projectPlanRouter.put(
  '/:projectId/:taskId',
  requireProjectRole(writeRoles),
  async (req, res) => {
    const task = await projectPlanService.update(
      req.params.taskId,
      req.body,
      req.user!.id
    );
    res.json(task);
  }
);

projectPlanRouter.delete(
  '/:projectId/:taskId',
  requireProjectRole(['ConsultorLider']),
  async (req, res) => {
    await projectPlanService.remove(req.params.taskId, req.user!.id);
    res.status(204).send();
  }
);

export { projectPlanRouter };
