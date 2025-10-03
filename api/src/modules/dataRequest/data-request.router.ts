import { Router } from 'express';

import { authenticate, requireProjectRole } from '../../core/middleware/auth';

import { dataRequestService } from './data-request.service';

const dataRequestRouter = Router();

dataRequestRouter.use(authenticate);

dataRequestRouter.get(
  '/:projectId',
  requireProjectRole(['ConsultorLider', 'Auditor', 'SponsorPM', 'Invitado']),
  async (req, res) => {
    const { projectId } = req.params;
    const { category, status } = req.query;
    const items = await dataRequestService.list(projectId, {
      category: category as string,
      status: status as string
    });
    res.json(items);
  }
);

dataRequestRouter.post(
  '/:projectId',
  requireProjectRole(['ConsultorLider', 'Auditor']),
  async (req, res) => {
    const item = await dataRequestService.create(
      req.params.projectId,
      req.body,
      req.user!.id
    );
    res.status(201).json(item);
  }
);

dataRequestRouter.put(
  '/:projectId/:itemId',
  requireProjectRole(['ConsultorLider', 'Auditor', 'SponsorPM']),
  async (req, res) => {
    const item = await dataRequestService.update(
      req.params.itemId,
      req.body,
      req.user!.id
    );
    res.json(item);
  }
);

dataRequestRouter.delete(
  '/:projectId/:itemId',
  requireProjectRole(['ConsultorLider']),
  async (req, res) => {
    await dataRequestService.remove(req.params.itemId, req.user!.id);
    res.status(204).send();
  }
);

export { dataRequestRouter };
