import { Router } from 'express';

import { authenticate, requireProjectRole } from '../../core/middleware/auth.js';
import { decisionService } from './decision.service.js';

const decisionRouter = Router();

decisionRouter.use(authenticate);

decisionRouter.get('/:projectId', requireProjectRole(['ConsultorLider', 'Auditor', 'SponsorPM']), async (req, res) => {
  const decisions = await decisionService.list(req.params.projectId);
  res.json(decisions);
});

decisionRouter.post('/:projectId', requireProjectRole(['ConsultorLider', 'Auditor']), async (req, res) => {
  const decision = await decisionService.create(req.params.projectId, req.body, req.user!.id);
  res.status(201).json(decision);
});

decisionRouter.put('/:projectId/:decisionId', requireProjectRole(['ConsultorLider', 'Auditor']), async (req, res) => {
  const decision = await decisionService.update(req.params.decisionId, req.body, req.user!.id);
  res.json(decision);
});

decisionRouter.delete('/:projectId/:decisionId', requireProjectRole(['ConsultorLider']), async (req, res) => {
  await decisionService.remove(req.params.decisionId, req.user!.id);
  res.status(204).send();
});

export { decisionRouter };
