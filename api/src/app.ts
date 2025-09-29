import { Router } from 'express';

import { authRouter } from './modules/auth/auth.router.js';
import { projectRouter } from './modules/projects/project.router.js';
import { companyRouter } from './modules/companies/company.router.js';
import { dataRequestRouter } from './modules/dataRequest/data-request.router.js';
import { dataRequestCategoryRouter } from './modules/dataRequestCategories/data-request-category.router.js';
import { formsRouter } from './modules/forms/forms.router.js';
import { processRouter } from './modules/processes/process.router.js';
import { systemsRouter } from './modules/systems/systems.router.js';
import { receptionRouter } from './modules/receptions/reception.router.js';
import { pocRouter } from './modules/poc/poc.router.js';
import { decisionRouter } from './modules/decisions/decision.router.js';
import { kpiRouter } from './modules/kpis/kpi.router.js';
import { userRouter } from './modules/users/user.router.js';
import { exportRouter } from './modules/export/export.router.js';
import { auditRouter } from './modules/audit/audit.router.js';
import { fileRouter } from './modules/files/file.router.js';
import { projectPlanRouter } from './modules/projectPlan/project-plan.router.js';
import { reportRouter } from './modules/reports/report.router.js';

const appRouter = Router();

appRouter.use('/auth', authRouter);
appRouter.use('/projects', projectRouter);
appRouter.use('/companies', companyRouter);
appRouter.use('/data-request', dataRequestRouter);
appRouter.use('/data-request-categories', dataRequestCategoryRouter);
appRouter.use('/forms', formsRouter);
appRouter.use('/process-assets', processRouter);
appRouter.use('/systems', systemsRouter);
appRouter.use('/receptions', receptionRouter);
appRouter.use('/poc', pocRouter);
appRouter.use('/decisions', decisionRouter);
appRouter.use('/kpis', kpiRouter);
appRouter.use('/users', userRouter);
appRouter.use('/export', exportRouter);
appRouter.use('/audit', auditRouter);
appRouter.use('/files', fileRouter);
appRouter.use('/project-plan', projectPlanRouter);
appRouter.use('/reports', reportRouter);

export { appRouter };
