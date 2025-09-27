import { Router } from 'express';

import { authenticate, requireProjectRole } from '../../core/middleware/auth.js';
import { findingService } from './finding.service.js';

const findingRouter = Router();

findingRouter.use(authenticate);

findingRouter.get('/:projectId', requireProjectRole(['ConsultorLider', 'Auditor', 'SponsorPM']), async (req, res) => {
  const findings = await findingService.list(req.params.projectId);
  res.json(findings);
});

findingRouter.post('/:projectId', requireProjectRole(['ConsultorLider', 'Auditor']), async (req, res) => {
  const finding = await findingService.create(req.params.projectId, req.body, req.user!.id);
  res.status(201).json(finding);
});

findingRouter.put('/:projectId/:findingId', requireProjectRole(['ConsultorLider', 'Auditor']), async (req, res) => {
  const finding = await findingService.update(req.params.findingId, req.body, req.user!.id);
  res.json(finding);
});

findingRouter.delete('/:projectId/:findingId', requireProjectRole(['ConsultorLider']), async (req, res) => {
  await findingService.remove(req.params.findingId, req.user!.id);
  res.status(204).send();
});

export { findingRouter };
