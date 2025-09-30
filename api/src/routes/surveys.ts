import { Router } from 'express';

import { prisma } from '../core/config/db.js';
import { HttpError } from '../core/errors/http-error.js';

const surveysRouter = Router();

surveysRouter.get('/:id', async (req, res) => {
  const survey = await prisma.surveyLink.findUnique({
    where: { id: req.params.id },
    include: {
      version: {
        include: {
          template: true,
        },
      },
      project: {
        select: { id: true, name: true },
      },
    },
  });

  if (!survey) {
    throw new HttpError(404, 'Not Found', 'Survey not found');
  }

  const response = {
    id: survey.id,
    projectId: survey.projectId,
    project: survey.project,
    versionId: survey.versionId,
    token: survey.token,
    targetType: survey.targetType,
    expiresAt: survey.expiresAt,
    maxResponses: survey.maxResponses,
    usedCount: survey.usedCount,
    createdAt: survey.createdAt,
    createdById: survey.createdById,
    template: {
      id: survey.version.template.id,
      name: survey.version.template.name,
      type: survey.version.template.type,
    },
    version: {
      id: survey.version.id,
      version: survey.version.version,
      status: survey.version.status,
      publishedAt: survey.version.publishedAt,
    },
  } as const;

  res.json(response);
});

export default surveysRouter;
