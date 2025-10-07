import path from 'path';

import { Router } from 'express';

import { authenticate, requireProjectRole } from '../../core/middleware/auth';

import { exportService } from './export.service';

const exportRouter = Router();

exportRouter.use(authenticate);

exportRouter.get(
  '/excel',
  requireProjectRole(['ConsultorLider', 'Auditor', 'SponsorPM']),
  async (req, res) => {
    const projectId = req.query.projectId as string;
    const filePath = await exportService.excelZip(projectId);
    res.download(filePath, path.basename(filePath));
  }
);

exportRouter.get(
  '/pdf',
  requireProjectRole(['ConsultorLider', 'Auditor', 'SponsorPM']),
  async (req, res) => {
    const projectId = req.query.projectId as string;
    const filePath = await exportService.pdf(projectId);
    res.download(filePath, path.basename(filePath));
  }
);

export { exportRouter };
