import { Router } from 'express';

import { authenticate, requireProjectRole } from '../../core/middleware/auth.js';
import { auditService } from './audit.service.js';

const auditRouter = Router();

auditRouter.get('/:projectId', authenticate, requireProjectRole(['ConsultorLider', 'Auditor']), async (req, res) => {
  const { projectId } = req.params;
  const logs = await auditService.list(projectId);
  res.json(logs);
});

export { auditRouter };
