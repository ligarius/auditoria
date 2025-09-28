import { Router } from 'express';
import { z } from 'zod';

import { authenticate, requireProjectMembership } from '../../core/middleware/auth.js';
import { analyticsService } from './analytics.service.js';

const analyticsRouter = Router();

analyticsRouter.use(authenticate);

const guestTokenSchema = z.object({
  companyId: z.string().min(1, 'companyId requerido'),
  projectId: z.string().min(1, 'projectId requerido'),
  dashboardId: z.union([z.string().min(1), z.number()]),
  datasetIds: z.array(z.union([z.string().min(1), z.number()])).optional()
});

analyticsRouter.post(
  '/superset/guest-token',
  requireProjectMembership('projectId'),
  async (req, res) => {
    const body = guestTokenSchema.parse(req.body);
    const result = await analyticsService.requestSupersetGuestToken({
      companyId: body.companyId,
      projectId: body.projectId,
      dashboardId: String(body.dashboardId),
      datasetIds: body.datasetIds
    });
    res.json(result);
  }
);

const kpisQuerySchema = z.object({
  projectId: z.string().min(1, 'projectId requerido'),
  companyId: z.string().min(1, 'companyId requerido')
});

analyticsRouter.get('/kpis', requireProjectMembership(), async (req, res) => {
  const params = kpisQuerySchema.parse(req.query);
  const result = await analyticsService.getKpis({
    projectId: params.projectId,
    companyId: params.companyId
  });
  res.json(result);
});

export { analyticsRouter };
