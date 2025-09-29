import type { Prisma } from '@prisma/client';

import { prisma } from '../../core/config/db.js';
import { logger } from '../../core/config/logger.js';
import { HttpError } from '../../core/errors/http-error.js';
import type { AuthenticatedRequest } from '../../core/middleware/auth.js';
import { scoringService } from '../../services/scoring.js';
import { tokenService } from '../../services/token.js';
import { queueService } from '../../services/queue.js';

interface UserContext {
  id: string;
  role: string;
}

interface RespondentInput {
  email?: string;
  fullName?: string;
  department?: string;
  externalId?: string;
}

const ensureCompanyAccess = async (user: UserContext, companyId: string) => {
  if (user.role === 'admin') {
    return;
  }

  const membership = await prisma.project.findFirst({
    where: {
      companyId,
      memberships: { some: { userId: user.id } }
    },
    select: { id: true }
  });

  if (!membership) {
    throw new HttpError(403, 'Sin acceso a la empresa');
  }
};

const ensureProjectAccess = async (user: UserContext, projectId: string) => {
  if (user.role === 'admin') {
    return;
  }
  const membership = await prisma.membership.findUnique({
    where: { userId_projectId: { userId: user.id, projectId } }
  });
  if (!membership) {
    throw new HttpError(403, 'Sin acceso al proyecto');
  }
};

const resolveRespondentId = async (
  tx: Prisma.TransactionClient,
  companyId: string,
  input: RespondentInput | undefined
) => {
  if (!input) {
    return undefined;
  }

  const { email, externalId } = input;
  let respondent = null as Awaited<ReturnType<typeof tx.respondent.findFirst>>;

  if (externalId) {
    respondent = await tx.respondent.findFirst({
      where: { companyId, externalId }
    });
  }

  if (!respondent && email) {
    respondent = await tx.respondent.findFirst({
      where: { companyId, email }
    });
  }

  if (respondent) {
    await tx.respondent.update({
      where: { id: respondent.id },
      data: {
        fullName: input.fullName ?? respondent.fullName,
        department: input.department ?? respondent.department
      }
    });
    return respondent.id;
  }

  const created = await tx.respondent.create({
    data: {
      companyId,
      email: input.email,
      fullName: input.fullName,
      department: input.department,
      externalId: input.externalId
    }
  });
  return created.id;
};

export const formsService = {
  async createTemplate(
    user: UserContext,
    input: { companyId: string; name: string; type: string }
  ) {
    await ensureCompanyAccess(user, input.companyId);

    return prisma.questionnaireTemplate.create({
      data: {
        companyId: input.companyId,
        name: input.name,
        type: input.type,
        createdById: user.id
      }
    });
  },

  async createVersion(
    user: UserContext,
    templateId: string,
    input: {
      formJson: Prisma.InputJsonValue;
      scoringJson?: Prisma.InputJsonValue | null;
      skipLogicJson?: Prisma.InputJsonValue | null;
    }
  ) {
    const template = await prisma.questionnaireTemplate.findUnique({
      where: { id: templateId },
      select: { id: true, companyId: true }
    });
    if (!template) {
      throw new HttpError(404, 'Plantilla no encontrada');
    }
    await ensureCompanyAccess(user, template.companyId);

    const currentMax = await prisma.questionnaireVersion.aggregate({
      where: { templateId },
      _max: { version: true }
    });
    const nextVersion = (currentMax._max.version ?? 0) + 1;

    return prisma.questionnaireVersion.create({
      data: {
        templateId,
        version: nextVersion,
        formJson: input.formJson,
        scoringJson: input.scoringJson ?? undefined,
        skipLogicJson: input.skipLogicJson ?? undefined,
        status: 'DRAFT'
      }
    });
  },

  async publishVersion(user: UserContext, versionId: string) {
    const version = await prisma.questionnaireVersion.findUnique({
      where: { id: versionId },
      include: { template: { select: { companyId: true } } }
    });
    if (!version) {
      throw new HttpError(404, 'Versión no encontrada');
    }
    await ensureCompanyAccess(user, version.template.companyId);

    const updated = await prisma.questionnaireVersion.update({
      where: { id: versionId },
      data: { status: 'PUBLISHED', publishedAt: new Date() }
    });

    return updated;
  },

  async createLink(
    user: UserContext,
    versionId: string,
    input: {
      projectId: string;
      targetType: string;
      expiresAt?: Date | null;
      maxResponses?: number | null;
    }
  ) {
    const version = await prisma.questionnaireVersion.findUnique({
      where: { id: versionId },
      include: { template: { select: { companyId: true } } }
    });
    if (!version) {
      throw new HttpError(404, 'Versión no encontrada');
    }
    if (version.status !== 'PUBLISHED') {
      throw new HttpError(400, 'La versión debe estar publicada');
    }

    await ensureCompanyAccess(user, version.template.companyId);
    await ensureProjectAccess(user, input.projectId);

    const project = await prisma.project.findUnique({
      where: { id: input.projectId },
      select: { id: true, companyId: true }
    });
    if (!project) {
      throw new HttpError(404, 'Proyecto no encontrado');
    }
    if (project.companyId !== version.template.companyId) {
      throw new HttpError(409, 'El proyecto no pertenece a la empresa de la plantilla');
    }

    const token = tokenService.generate(24);

    const link = await prisma.surveyLink.create({
      data: {
        versionId,
        projectId: input.projectId,
        targetType: input.targetType,
        expiresAt: input.expiresAt ?? null,
        maxResponses: input.maxResponses ?? null,
        token,
        createdById: user.id
      }
    });

    try {
      await queueService.enqueueSurveyInvite({ surveyLinkId: link.id });
      await queueService.scheduleSurveyReminder({ surveyLinkId: link.id });
    } catch (error) {
      logger.warn({ err: error, surveyLinkId: link.id }, 'No se pudieron programar recordatorios de encuesta');
    }

    return link;
  },

  async getFormByToken(token: string) {
    const link = await prisma.surveyLink.findUnique({
      where: { token },
      include: {
        version: { include: { template: true } },
        project: { select: { id: true } }
      }
    });
    if (!link) {
      throw new HttpError(404, 'Link no encontrado');
    }

    const now = new Date();
    if ((link.expiresAt && link.expiresAt < now) || (link.maxResponses && link.usedCount >= link.maxResponses)) {
      throw new HttpError(410, 'El link ya no está disponible');
    }

    return {
      token: link.token,
      projectId: link.projectId,
      versionId: link.versionId,
      form: link.version.formJson,
      template: {
        id: link.version.template.id,
        name: link.version.template.name,
        type: link.version.template.type
      }
    };
  },

  async submitResponse(
    token: string,
    input: { answers: Record<string, unknown>; respondent?: RespondentInput },
    user?: AuthenticatedRequest['user']
  ) {
    const link = await prisma.surveyLink.findUnique({
      where: { token },
      include: {
        version: { include: { template: true } },
        project: { select: { id: true, companyId: true } }
      }
    });
    if (!link) {
      throw new HttpError(404, 'Link no encontrado');
    }

    const now = new Date();
    if ((link.expiresAt && link.expiresAt < now) || (link.maxResponses && link.usedCount >= link.maxResponses)) {
      throw new HttpError(410, 'El link ya no está disponible');
    }

    if (link.targetType === 'AUTH') {
      if (!user) {
        throw new HttpError(401, 'Autenticación requerida para responder');
      }
      await ensureProjectAccess({ id: user.id, role: user.role }, link.projectId);
    }

    const score = scoringService.calculate(input.answers, link.version.scoringJson ?? undefined);

    const response = await prisma.$transaction(async (tx) => {
      const respondentId = await resolveRespondentId(tx, link.project.companyId, input.respondent);

      const createdResponse = await tx.questionnaireResponse.create({
        data: {
          versionId: link.versionId,
          projectId: link.projectId,
          respondentId: respondentId ?? null,
          surveyLinkId: link.id,
          answersJson: input.answers as Prisma.InputJsonValue,
          scoreTotal: score.total,
          scoreDetailJson: score.details as unknown as Prisma.InputJsonValue
        }
      });

      await tx.surveyLink.update({
        where: { id: link.id },
        data: { usedCount: { increment: 1 } }
      });

      return createdResponse;
    });

    try {
      await queueService.cancelSurveyReminder(link.id);
    } catch (error) {
      logger.warn({ err: error, surveyLinkId: link.id }, 'No se pudo cancelar el recordatorio de encuesta');
    }

    return {
      id: response.id,
      scoreTotal: response.scoreTotal,
      submittedAt: response.submittedAt
    };
  }
};
