import { Router } from 'express';
import { z } from 'zod';

import { authenticate, requireRole } from '../../core/middleware/auth.js';
import { enforceProjectAccess } from '../../core/security/enforce-project-access.js';
import { generateProjectReportPdf } from '../export/report.service.js';

import { projectService } from './project.service.js';
import { projectSurveyService } from './project-survey.service.js';

const projectRouter = Router();

projectRouter.use(authenticate);

const workflowTransitionSchema = z.object({
  state: z.string().min(1, 'Estado requerido')
});

const createSurveySchema = z.object({
  title: z.string().min(1, 'Título requerido').trim(),
  description: z.string().optional(),
  isActive: z.boolean().optional()
});

const createSurveyQuestionSchema = z
  .object({
    type: z.string().min(1, 'Tipo requerido'),
    text: z.string().min(1, 'Pregunta requerida'),
    scaleMin: z.number().int().optional(),
    scaleMax: z.number().int().optional(),
    required: z.boolean().optional()
  })
  .superRefine((data, ctx) => {
    if (data.type && data.type.toLowerCase().includes('likert')) {
      if (
        typeof data.scaleMin !== 'number' ||
        typeof data.scaleMax !== 'number'
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Debes definir el rango de la escala Likert'
        });
      } else if (data.scaleMin >= data.scaleMax) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'El mínimo de la escala debe ser menor al máximo'
        });
      }
    }
  });

const workflowDiagramSchema = z.object({
  definition: z.any()
});

projectRouter.get('/', async (req, res) => {
  const projects = await projectService.listByUser(
    req.user!.id,
    req.user!.role
  );
  res.json(projects);
});

projectRouter.get('/:projectId/features', async (req, res) => {
  const result = await projectService.getFeatures(req.params.projectId, {
    id: req.user!.id,
    role: req.user!.role
  });
  res.json(result);
});

projectRouter.get('/:projectId/report.pdf', async (req, res) => {
  await enforceProjectAccess(req.user, req.params.projectId);
  try {
    const pdf = await generateProjectReportPdf(req.params.projectId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="reporte-${req.params.projectId}.pdf"`
    );
    res.send(pdf);
  } catch (error: any) {
    const status =
      error instanceof Error && 'statusCode' in error
        ? (error as any).statusCode
        : 400;
    res
      .status(status ?? 400)
      .json({ error: error.message ?? 'No se pudo generar el PDF' });
  }
});

projectRouter.get('/:projectId/surveys', async (req, res) => {
  const surveys = await projectSurveyService.list(
    req.params.projectId,
    req.user
  );
  res.json(surveys);
});

projectRouter.post(
  '/:projectId/surveys',
  requireRole('admin', 'consultor'),
  async (req, res) => {
    const body = createSurveySchema.parse(req.body);
    const survey = await projectSurveyService.create(
      req.params.projectId,
      body,
      req.user
    );
    res.status(201).json(survey);
  }
);

projectRouter.post(
  '/:projectId/surveys/:surveyId/questions',
  requireRole('admin', 'consultor'),
  async (req, res) => {
    const body = createSurveyQuestionSchema.parse(req.body);
    const question = await projectSurveyService.addQuestion(
      req.params.projectId,
      req.params.surveyId,
      body,
      req.user
    );
    res.status(201).json(question);
  }
);

projectRouter.get('/:projectId/surveys/:surveyId/summary', async (req, res) => {
  const summary = await projectSurveyService.summary(
    req.params.projectId,
    req.params.surveyId,
    req.user
  );
  res.json(summary);
});

projectRouter.get('/:projectId/summary', async (req, res) => {
  const summary = await projectService.summary(req.params.projectId, {
    id: req.user!.id,
    role: req.user!.role
  });
  res.json(summary);
});

projectRouter.get('/:projectId/workflow', async (req, res) => {
  const workflow = await projectService.getWorkflow(req.params.projectId, {
    id: req.user!.id,
    role: req.user!.role
  });
  res.json(workflow);
});

projectRouter.get('/:projectId', async (req, res) => {
  const project = await projectService.getById(req.params.projectId, {
    id: req.user!.id,
    role: req.user!.role
  });
  res.json(project);
});

projectRouter.post('/', requireRole('admin', 'consultor'), async (req, res) => {
  const project = await projectService.create(req.body, {
    id: req.user!.id,
    role: req.user!.role
  });
  res.status(201).json(project);
});

projectRouter.put(
  '/:projectId',
  requireRole('admin', 'consultor'),
  async (req, res) => {
    await enforceProjectAccess(req.user, req.params.projectId);
    const project = await projectService.update(
      req.params.projectId,
      req.body,
      {
        id: req.user!.id,
        role: req.user!.role
      }
    );
    res.json(project);
  }
);

projectRouter.put(
  '/:projectId/workflow/diagram',
  requireRole('admin', 'consultor'),
  async (req, res) => {
    await enforceProjectAccess(req.user, req.params.projectId);
    const body = workflowDiagramSchema.parse(req.body);
    const workflow = await projectService.saveWorkflowDiagram(
      req.params.projectId,
      body.definition,
      { id: req.user!.id, role: req.user!.role }
    );
    res.json(workflow);
  }
);

projectRouter.post(
  '/:projectId/workflow/transition',
  requireRole('admin', 'consultor'),
  async (req, res) => {
    await enforceProjectAccess(req.user, req.params.projectId);
    const body = workflowTransitionSchema.parse(req.body);
    const workflow = await projectService.transitionWorkflow(
      req.params.projectId,
      body.state,
      { id: req.user!.id, role: req.user!.role }
    );
    res.json(workflow);
  }
);

projectRouter.delete('/:projectId', requireRole('admin'), async (req, res) => {
  await enforceProjectAccess(req.user, req.params.projectId);
  await projectService.remove(req.params.projectId, req.user!.id);
  res.status(204).send();
});

projectRouter.post(
  '/:projectId/invite',
  requireRole('admin'),
  async (req, res) => {
    await enforceProjectAccess(req.user, req.params.projectId);
    const { email, role } = req.body;
    const user = await projectService.invite(req.params.projectId, email, role);
    res.json(user);
  }
);

export { projectRouter };
