import { Router } from 'express';

import { authenticate, requireProjectRole } from '../../core/middleware/auth.js';
import { riskService } from './risk.service.js';

const riskRouter = Router();

riskRouter.use(authenticate);

riskRouter.get('/:projectId', requireProjectRole(['ConsultorLider', 'Auditor', 'SponsorPM', 'Invitado']), async (req, res) => {
  const risks = await riskService.list(req.params.projectId, req.query.rag as string | undefined);
  res.json(risks);
});

riskRouter.post('/:projectId', requireProjectRole(['ConsultorLider', 'Auditor']), async (req, res) => {
  const risk = await riskService.create(req.params.projectId, req.body, req.user!.id);
  res.status(201).json(risk);
});

riskRouter.put('/:projectId/:riskId', requireProjectRole(['ConsultorLider', 'Auditor']), async (req, res) => {
  const risk = await riskService.update(req.params.riskId, req.body, req.user!.id);
  res.json(risk);
});

riskRouter.delete('/:projectId/:riskId', requireProjectRole(['ConsultorLider']), async (req, res) => {
  await riskService.remove(req.params.riskId, req.user!.id);
  res.status(204).send();
});

export { riskRouter };
