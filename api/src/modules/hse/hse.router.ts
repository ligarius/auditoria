import { Router } from 'express';

import {
  authenticate,
  requireProjectRole,
  type AuthenticatedRequest
} from '../../core/middleware/auth';
import { enforceProjectAccess } from '../../core/security/enforce-project-access';

import { hseService } from './hse.service';

const viewerRoles = ['ConsultorLider', 'Auditor', 'SponsorPM', 'Invitado'];
const editorRoles = ['ConsultorLider', 'Auditor'];

const hseRouter = Router();

hseRouter.use(authenticate);

hseRouter.get(
  '/checks/:projectId',
  requireProjectRole(viewerRoles),
  async (req: AuthenticatedRequest, res) => {
    const { projectId } = req.params;
    await enforceProjectAccess(req.user, projectId);
    const checks = await hseService.listChecks(projectId);
    res.json(checks);
  }
);

hseRouter.post(
  '/checks/:projectId',
  requireProjectRole(editorRoles),
  async (req: AuthenticatedRequest, res) => {
    const { projectId } = req.params;
    await enforceProjectAccess(req.user, projectId);
    const created = await hseService.createCheck(
      projectId,
      req.body,
      req.user!.id
    );
    res.status(201).json(created);
  }
);

hseRouter.get(
  '/ppe/:projectId',
  requireProjectRole(viewerRoles),
  async (req: AuthenticatedRequest, res) => {
    const { projectId } = req.params;
    await enforceProjectAccess(req.user, projectId);
    const assignments = await hseService.listAssignments(projectId);
    res.json(assignments);
  }
);

hseRouter.post(
  '/ppe/:projectId',
  requireProjectRole(editorRoles),
  async (req: AuthenticatedRequest, res) => {
    const { projectId } = req.params;
    await enforceProjectAccess(req.user, projectId);
    const created = await hseService.createAssignment(
      projectId,
      req.body,
      req.user!.id
    );
    res.status(201).json(created);
  }
);

hseRouter.get(
  '/incidents/:projectId',
  requireProjectRole(viewerRoles),
  async (req: AuthenticatedRequest, res) => {
    const { projectId } = req.params;
    await enforceProjectAccess(req.user, projectId);
    const incidents = await hseService.listIncidents(projectId);
    res.json(incidents);
  }
);

hseRouter.post(
  '/incidents/:projectId',
  requireProjectRole(editorRoles),
  async (req: AuthenticatedRequest, res) => {
    const { projectId } = req.params;
    await enforceProjectAccess(req.user, projectId);
    const created = await hseService.createIncident(
      projectId,
      req.body,
      req.user!.id
    );
    res.status(201).json(created);
  }
);

export { hseRouter };
