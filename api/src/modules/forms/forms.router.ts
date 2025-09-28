import { Router } from 'express';
import type { Request } from 'express';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';

import { prisma } from '../../core/config/db.js';
import { HttpError } from '../../core/errors/http-error.js';
import {
  authenticate,
  requireProjectMembership,
  requireRole,
  type AuthenticatedRequest
} from '../../core/middleware/auth.js';
import { verifyAccessToken } from '../../core/utils/jwt.js';
import { formsService } from './forms.service.js';

const formsRouter = Router();

const templateSchema = z.object({
  companyId: z.string().min(1, 'companyId requerido'),
  name: z.string().min(1, 'Nombre requerido').trim(),
  type: z.enum(['SURVEY', 'INTERVIEW', 'PBC'])
});

const versionSchema = z.object({
  formJson: z.record(z.any(), { invalid_type_error: 'formJson debe ser un objeto' }),
  scoringJson: z.any().optional(),
  skipLogicJson: z.any().optional()
});

const linkSchema = z.object({
  projectId: z.string().min(1, 'projectId requerido'),
  targetType: z.enum(['ANONYMOUS', 'AUTH']),
  expiresAt: z.string().datetime().optional(),
  maxResponses: z.coerce.number().int().positive().optional()
});

const submitSchema = z.object({
  answers: z.record(z.any(), { invalid_type_error: 'answers debe ser un objeto' }),
  respondent: z
    .object({
      email: z.string().email().optional(),
      fullName: z.string().min(1).optional(),
      department: z.string().min(1).optional(),
      externalId: z.string().min(1).optional()
    })
    .partial()
    .optional()
});

formsRouter.post(
  '/templates',
  authenticate,
  requireRole('admin', 'consultor'),
  async (req: AuthenticatedRequest, res) => {
    const body = templateSchema.parse(req.body);
    const template = await formsService.createTemplate(
      { id: req.user!.id, role: req.user!.role },
      body
    );
    res.status(201).json(template);
  }
);

formsRouter.post(
  '/templates/:templateId/versions',
  authenticate,
  requireRole('admin', 'consultor'),
  async (req: AuthenticatedRequest, res) => {
    const body = versionSchema.parse(req.body);
    const version = await formsService.createVersion(
      { id: req.user!.id, role: req.user!.role },
      req.params.templateId,
      {
        formJson: body.formJson as Prisma.InputJsonValue,
        scoringJson: body.scoringJson as Prisma.InputJsonValue | null | undefined,
        skipLogicJson: body.skipLogicJson as Prisma.InputJsonValue | null | undefined
      }
    );
    res.status(201).json(version);
  }
);

formsRouter.post(
  '/versions/:versionId/publish',
  authenticate,
  requireRole('admin', 'consultor'),
  async (req: AuthenticatedRequest, res) => {
    const version = await formsService.publishVersion(
      { id: req.user!.id, role: req.user!.role },
      req.params.versionId
    );
    res.json(version);
  }
);

formsRouter.post(
  '/versions/:versionId/links',
  authenticate,
  requireRole('admin', 'consultor'),
  requireProjectMembership('projectId'),
  async (req: AuthenticatedRequest & { projectId: string }, res) => {
    const body = linkSchema.parse(req.body);
    const expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
    if (expiresAt && Number.isNaN(expiresAt.getTime())) {
      throw new HttpError(400, 'expiresAt inválido');
    }
    const link = await formsService.createLink(
      { id: req.user!.id, role: req.user!.role },
      req.params.versionId,
      {
        projectId: body.projectId,
        targetType: body.targetType,
        expiresAt,
        maxResponses: body.maxResponses ?? null
      }
    );
    res.status(201).json(link);
  }
);

formsRouter.get('/links/:token', async (req, res) => {
  const form = await formsService.getFormByToken(req.params.token);
  res.json(form);
});

const resolveOptionalUser = async (
  req: Request
): Promise<AuthenticatedRequest['user'] | undefined> => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return undefined;
  }
  const token = authHeader.replace('Bearer ', '');
  try {
    const payload = verifyAccessToken(token);
    const memberships = await prisma.membership.findMany({
      where: { userId: payload.sub },
      select: { projectId: true, role: true }
    });
    const projects = memberships.reduce<Record<string, string>>((acc, membership) => {
      acc[membership.projectId] = membership.role;
      return acc;
    }, {});
    return { id: payload.sub, email: payload.email, role: payload.role, projects };
  } catch (error) {
    return undefined;
  }
};

formsRouter.post('/submit/:token', async (req, res) => {
  const body = submitSchema.parse(req.body);
  const user = await resolveOptionalUser(req);
  const result = await formsService.submitResponse(req.params.token, body, user);
  res.status(201).json(result);
});

export { formsRouter };
