import { Router } from 'express';

import { authenticate, requireProjectRole } from '../../core/middleware/auth.js';
import { surveyService } from './survey.service.js';

const surveyRouter = Router();

surveyRouter.post('/:surveyId/public-response', async (req, res) => {
  const { answers, respondent } = req.body;
  const response = await surveyService.submitResponse(req.params.surveyId, answers, respondent);
  res.status(201).json(response);
});

surveyRouter.use(authenticate);

surveyRouter.get('/:projectId', requireProjectRole(['ConsultorLider', 'Auditor', 'SponsorPM', 'Invitado']), async (req, res) => {
  const surveys = await surveyService.list(req.params.projectId);
  res.json(surveys);
});

surveyRouter.post('/:projectId', requireProjectRole(['ConsultorLider', 'Auditor']), async (req, res) => {
  const survey = await surveyService.create(req.params.projectId, req.body);
  res.status(201).json(survey);
});

surveyRouter.post('/questions/:surveyId', async (req, res) => {
  const question = await surveyService.addQuestion(req.params.surveyId, req.body);
  res.status(201).json(question);
});

surveyRouter.get('/:projectId/:surveyId/summary', requireProjectRole(['ConsultorLider', 'Auditor', 'SponsorPM']), async (req, res) => {
  const summary = await surveyService.getSummary(req.params.surveyId);
  res.json(summary);
});

export { surveyRouter };
