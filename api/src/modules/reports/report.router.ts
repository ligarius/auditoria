import { Router } from 'express';

import { authenticate } from '../../core/middleware/auth';
import { enforceProjectAccess } from '../../core/security/enforce-project-access';

import { reportService } from './report.service';

const reportRouter = Router();

reportRouter.use(authenticate);

reportRouter.get('/projects/:projectId/exec.pdf', async (req, res) => {
  await enforceProjectAccess(req.user, req.params.projectId);
  const pdf = await reportService.generateExecutivePdf(req.params.projectId);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="reporte-${req.params.projectId}-ejecutivo.pdf"`
  );
  res.send(pdf);
});

reportRouter.get('/:type/projects/:projectId.pdf', async (req, res) => {
  const { type, projectId } = req.params;
  await enforceProjectAccess(req.user, projectId);
  const pdf = await reportService.generateModulePdf(
    projectId,
    type,
    req.user?.id
  );
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="reporte-${projectId}-${type}.pdf"`
  );
  res.send(pdf);
});

export { reportRouter };
