import { Router } from 'express';

import {
  authenticate,
  requireProjectRole,
  type AuthenticatedRequest
} from '../../core/middleware/auth';
import { enforceProjectAccess } from '../../core/security/enforce-project-access';

import { fiveSAuditService } from './five-s-audit.service';

const viewerRoles = ['ConsultorLider', 'Auditor', 'SponsorPM', 'Invitado'];
const editorRoles = ['ConsultorLider', 'Auditor'];

const fiveSRouter = Router();

fiveSRouter.use(authenticate);

fiveSRouter.get(
  '/audits/:projectId',
  requireProjectRole(viewerRoles),
  async (req: AuthenticatedRequest, res) => {
    const { projectId } = req.params;
    await enforceProjectAccess(req.user, projectId);
    const audits = await fiveSAuditService.list(projectId);
    res.json(audits);
  }
);

fiveSRouter.post(
  '/audits/:projectId',
  requireProjectRole(editorRoles),
  async (req: AuthenticatedRequest, res) => {
    const { projectId } = req.params;
    await enforceProjectAccess(req.user, projectId);
    const created = await fiveSAuditService.create(
      projectId,
      req.body,
      req.user!.id
    );
    res.status(201).json(created);
  }
);

fiveSRouter.patch(
  '/audits/:auditId',
  requireProjectRole(editorRoles),
  async (req: AuthenticatedRequest, res) => {
    const { auditId } = req.params;
    const projectId = await fiveSAuditService.getProjectId(auditId);
    await enforceProjectAccess(req.user, projectId);
    const updated = await fiveSAuditService.update(
      auditId,
      req.body,
      req.user!.id
    );
    res.json(updated);
  }
);

export { fiveSRouter };
