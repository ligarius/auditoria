import type { Prisma } from '@prisma/client';

import { prisma } from '../../core/config/db.js';
import { HttpError } from '../../core/errors/http-error.js';
import { enforceProjectAccess } from '../../core/security/enforce-project-access.js';
import type { AuthenticatedRequest } from '../../core/middleware/auth.js';

const isLikertType = (value: string) => value.toLowerCase().includes('likert');

const toNumber = (value: Prisma.JsonValue | null): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const toStringValue = (value: Prisma.JsonValue | null): string | null => {
  if (typeof value === 'string') {
    return value.trim();
  }
  if (typeof value === 'number') {
    return value.toString();
  }
  return null;
};

const buildQuestionSummary = (
  question: {
    id: string;
    type: string;
    scaleMin: number | null;
    scaleMax: number | null;
  },
  answers: Prisma.JsonValue[],
) => {
  const base = {
    questionId: question.id,
    responses: answers.length,
  } as {
    questionId: string;
    responses: number;
    average?: number;
    distribution?: Record<string, number>;
    scale?: { min: number; max: number };
    topResponses?: { value: string; count: number }[];
  };

  if (answers.length === 0) {
    return base;
  }

  if (isLikertType(question.type)) {
    const numericAnswers = answers
      .map((value) => toNumber(value))
      .filter((value): value is number => value !== null);
    if (numericAnswers.length === 0) {
      return base;
    }
    const total = numericAnswers.reduce((sum, value) => sum + value, 0);
    const distribution = numericAnswers.reduce<Record<string, number>>((acc, value) => {
      const key = String(value);
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});
    return {
      ...base,
      average: Number((total / numericAnswers.length).toFixed(2)),
      distribution,
      scale:
        question.scaleMin !== null && question.scaleMax !== null
          ? { min: question.scaleMin, max: question.scaleMax }
          : undefined,
    };
  }

  const textAnswers = answers
    .map((value) => toStringValue(value))
    .filter((value): value is string => !!value && value.trim().length > 0);
  if (textAnswers.length === 0) {
    return base;
  }
  const distribution = textAnswers.reduce<Record<string, number>>((acc, value) => {
    const key = value.slice(0, 120);
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  const topResponses = Object.entries(distribution)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([value, count]) => ({ value, count }));

  return { ...base, distribution, topResponses };
};

export const projectSurveyService = {
  async list(projectId: string, user: AuthenticatedRequest['user']) {
    await enforceProjectAccess(user, projectId);
    return prisma.survey.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      include: {
        questions: { orderBy: { createdAt: 'asc' } },
      },
    });
  },

  async create(
    projectId: string,
    input: { title: string; description?: string; isActive?: boolean },
    user: AuthenticatedRequest['user'],
  ) {
    await enforceProjectAccess(user, projectId);
    return prisma.survey.create({
      data: {
        projectId,
        title: input.title,
        description: input.description ?? null,
        isActive: input.isActive ?? true,
      },
      include: { questions: true },
    });
  },

  async addQuestion(
    projectId: string,
    surveyId: string,
    input: {
      type: string;
      text: string;
      scaleMin?: number | null;
      scaleMax?: number | null;
      required?: boolean;
    },
    user: AuthenticatedRequest['user'],
  ) {
    await enforceProjectAccess(user, projectId);
    const survey = await prisma.survey.findFirst({
      where: { id: surveyId, projectId },
      select: { id: true },
    });
    if (!survey) {
      throw new HttpError(404, 'Encuesta no encontrada');
    }
    return prisma.surveyQuestion.create({
      data: {
        surveyId,
        type: input.type,
        text: input.text,
        scaleMin: input.scaleMin ?? null,
        scaleMax: input.scaleMax ?? null,
        required: input.required ?? true,
      },
    });
  },

  async summary(projectId: string, surveyId: string, user: AuthenticatedRequest['user']) {
    await enforceProjectAccess(user, projectId);
    const survey = await prisma.survey.findFirst({
      where: { id: surveyId, projectId },
      include: {
        questions: { orderBy: { createdAt: 'asc' } },
        responses: {
          include: {
            answers: true,
          },
        },
      },
    });
    if (!survey) {
      throw new HttpError(404, 'Encuesta no encontrada');
    }
    const summaries = survey.questions.map((question) => {
      const answers = survey.responses.flatMap((response) =>
        response.answers.filter((answer) => answer.questionId === question.id).map((answer) => answer.value),
      );
      return buildQuestionSummary(
        {
          id: question.id,
          type: question.type,
          scaleMin: question.scaleMin,
          scaleMax: question.scaleMax,
        },
        answers,
      );
    });

    return {
      survey: {
        id: survey.id,
        title: survey.title,
        description: survey.description,
        isActive: survey.isActive,
        questions: survey.questions,
      },
      summaries,
    };
  },
};
