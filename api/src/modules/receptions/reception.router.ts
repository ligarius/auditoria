import { Router } from 'express';

import { authenticate, requireProjectRole } from '../../core/middleware/auth.js';
import { receptionService } from './reception.service.js';

const receptionRouter = Router();

receptionRouter.use(authenticate);

receptionRouter.get('/:projectId', requireProjectRole(['ConsultorLider', 'Auditor', 'SponsorPM']), async (req, res) => {
  const receptions = await receptionService.list(req.params.projectId);
  res.json(receptions);
});

receptionRouter.post('/:projectId', requireProjectRole(['ConsultorLider', 'Auditor']), async (req, res) => {
  const reception = await receptionService.create(req.params.projectId, req.body, req.user!.id);
  res.status(201).json(reception);
});

receptionRouter.put('/:projectId/:receptionId', requireProjectRole(['ConsultorLider', 'Auditor']), async (req, res) => {
  const reception = await receptionService.update(req.params.receptionId, req.body, req.user!.id);
  res.json(reception);
});

receptionRouter.delete('/:projectId/:receptionId', requireProjectRole(['ConsultorLider']), async (req, res) => {
  await receptionService.remove(req.params.receptionId, req.user!.id);
  res.status(204).send();
});

receptionRouter.get('/:projectId/metrics/summary', requireProjectRole(['ConsultorLider', 'Auditor', 'SponsorPM']), async (req, res) => {
  const metrics = await receptionService.metrics(req.params.projectId);
  res.json(metrics);
});

export { receptionRouter };
