import { Router } from 'express';

import { authRouter } from './modules/auth/auth.router.js';
import { projectRouter } from './modules/projects/project.router.js';
import { dataRequestRouter } from './modules/dataRequest/data-request.router.js';
import { surveyRouter } from './modules/surveys/survey.router.js';
import { interviewRouter } from './modules/interviews/interview.router.js';
import { processRouter } from './modules/processes/process.router.js';
import { systemsRouter } from './modules/systems/systems.router.js';
import { receptionRouter } from './modules/receptions/reception.router.js';
import { riskRouter } from './modules/risks/risk.router.js';
import { findingRouter } from './modules/findings/finding.router.js';
import { pocRouter } from './modules/poc/poc.router.js';
import { decisionRouter } from './modules/decisions/decision.router.js';
import { kpiRouter } from './modules/kpis/kpi.router.js';
import { exportRouter } from './modules/export/export.router.js';
import { auditRouter } from './modules/audit/audit.router.js';
import { fileRouter } from './modules/files/file.router.js';

const appRouter = Router();

appRouter.use('/auth', authRouter);
appRouter.use('/projects', projectRouter);
appRouter.use('/data-request', dataRequestRouter);
appRouter.use('/surveys', surveyRouter);
appRouter.use('/interviews', interviewRouter);
appRouter.use('/process-assets', processRouter);
appRouter.use('/systems', systemsRouter);
appRouter.use('/receptions', receptionRouter);
appRouter.use('/risks', riskRouter);
appRouter.use('/findings', findingRouter);
appRouter.use('/poc', pocRouter);
appRouter.use('/decisions', decisionRouter);
appRouter.use('/kpis', kpiRouter);
appRouter.use('/export', exportRouter);
appRouter.use('/audit', auditRouter);
appRouter.use('/files', fileRouter);

export { appRouter };
