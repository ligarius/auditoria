import { Router } from 'express';

import { authenticate, requireProjectRole } from '../../core/middleware/auth.js';
import { kpiService } from './kpi.service.js';

const kpiRouter = Router();

kpiRouter.use(authenticate);

kpiRouter.get('/:projectId', requireProjectRole(['ConsultorLider', 'Auditor', 'SponsorPM', 'Invitado']), async (req, res) => {
  const kpis = await kpiService.list(req.params.projectId);
  res.json(kpis);
});

kpiRouter.post('/:projectId', requireProjectRole(['ConsultorLider', 'Auditor']), async (req, res) => {
  const kpi = await kpiService.create(req.params.projectId, req.body, req.user!.id);
  res.status(201).json(kpi);
});

kpiRouter.put('/:projectId/:kpiId', requireProjectRole(['ConsultorLider', 'Auditor']), async (req, res) => {
  const kpi = await kpiService.update(req.params.kpiId, req.body, req.user!.id);
  res.json(kpi);
});

kpiRouter.delete('/:projectId/:kpiId', requireProjectRole(['ConsultorLider']), async (req, res) => {
  await kpiService.remove(req.params.kpiId, req.user!.id);
  res.status(204).send();
});

export { kpiRouter };
