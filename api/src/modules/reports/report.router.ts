import { Router } from 'express';

import { authenticate } from '../../core/middleware/auth.js';
import { enforceProjectAccess } from '../../core/security/enforce-project-access.js';
import { reportService } from './report.service.js';

const reportRouter = Router();

reportRouter.use(authenticate);

reportRouter.get('/projects/:projectId/exec.pdf', async (req, res) => {
  await enforceProjectAccess(req.user, req.params.projectId);
  const pdf = await reportService.generateExecutivePdf(req.params.projectId);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="reporte-${req.params.projectId}-ejecutivo.pdf"`);
  res.send(pdf);
});

export { reportRouter };
