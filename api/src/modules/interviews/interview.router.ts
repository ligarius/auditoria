import { Router } from 'express';

import { authenticate, requireProjectRole } from '../../core/middleware/auth.js';
import { enforceProjectAccess } from '../../core/security/enforce-project-access.js';
import { interviewService } from './interview.service.js';

const readRoles = ['ConsultorLider', 'Auditor', 'SponsorPM', 'Invitado'];
const writeRoles = ['ConsultorLider', 'Auditor'];

const interviewRouter = Router();

interviewRouter.use(authenticate);

interviewRouter.get('/:projectId', requireProjectRole(readRoles), async (req, res) => {
  await enforceProjectAccess(req.user!, req.params.projectId);
  const interviews = await interviewService.list(req.params.projectId);
  res.json(interviews);
});

interviewRouter.post('/:projectId', requireProjectRole(writeRoles), async (req, res) => {
  const interview = await interviewService.create(req.params.projectId, req.body, req.user!);
  res.status(201).json(interview);
});

interviewRouter.put('/:projectId/:interviewId', requireProjectRole(writeRoles), async (req, res) => {
  const interview = await interviewService.update(
    req.params.projectId,
    req.params.interviewId,
    req.body,
    req.user!
  );
  res.json(interview);
});

interviewRouter.delete('/:projectId/:interviewId', requireProjectRole(['ConsultorLider']), async (req, res) => {
  await interviewService.remove(req.params.projectId, req.params.interviewId, req.user!);
  res.status(204).send();
});

export { interviewRouter };
