import { Router } from 'express';

import { authenticate, requireProjectRole } from '../../core/middleware/auth.js';
import { pocService } from './poc.service.js';

const pocRouter = Router();

pocRouter.use(authenticate);

pocRouter.get('/:projectId', requireProjectRole(['ConsultorLider', 'Auditor', 'SponsorPM']), async (req, res) => {
  const items = await pocService.list(req.params.projectId);
  res.json(items);
});

pocRouter.post('/:projectId', requireProjectRole(['ConsultorLider', 'Auditor']), async (req, res) => {
  const item = await pocService.create(req.params.projectId, req.body, req.user!.id);
  res.status(201).json(item);
});

pocRouter.put('/:projectId/:itemId', requireProjectRole(['ConsultorLider', 'Auditor']), async (req, res) => {
  const item = await pocService.update(req.params.itemId, req.body, req.user!.id);
  res.json(item);
});

pocRouter.delete('/:projectId/:itemId', requireProjectRole(['ConsultorLider']), async (req, res) => {
  await pocService.remove(req.params.itemId, req.user!.id);
  res.status(204).send();
});

export { pocRouter };
