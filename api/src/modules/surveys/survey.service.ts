import { Prisma } from '@prisma/client';

import { prisma } from '../../core/config/db.js';
import { HttpError } from '../../core/errors/http-error.js';

export const surveyService = {
  async list(projectId: string) {
    return prisma.survey.findMany({ where: { projectId }, include: { questions: true } });
  },

  async create(projectId: string, payload: Prisma.SurveyCreateInput) {
    return prisma.survey.create({ data: { ...payload, project: { connect: { id: projectId } } } });
  },

  async addQuestion(surveyId: string, payload: Prisma.SurveyQuestionCreateInput) {
    return prisma.surveyQuestion.create({ data: { ...payload, survey: { connect: { id: surveyId } } } });
  },

  async submitResponse(surveyId: string, answers: { questionId: string; valueNumber?: number; valueText?: string }[], respondent?: string) {
    const response = await prisma.surveyResponse.create({
      data: {
        surveyId,
        respondent,
        answers: {
          create: answers.map((answer) => ({
            question: { connect: { id: answer.questionId } },
            valueNumber: answer.valueNumber,
            valueText: answer.valueText
          }))
        }
      },
      include: { answers: true }
    });
    return response;
  },

  async getSummary(surveyId: string) {
    const survey = await prisma.survey.findUnique({
      where: { id: surveyId },
      include: { questions: true, responses: { include: { answers: true } } }
    });
    if (!survey) {
      throw new HttpError(404, 'Encuesta no encontrada');
    }
    const summaries = survey.questions.map((question) => {
      const answers = survey.responses.flatMap((response) =>
        response.answers.filter((a) => a.questionId === question.id)
      );
      if (question.type === 'Likert') {
        const values = answers.map((a) => a.valueNumber ?? 0);
        const avg = values.length ? values.reduce((acc, val) => acc + val, 0) / values.length : 0;
        return { questionId: question.id, average: avg, responses: values.length };
      }
      return { questionId: question.id, responses: answers.map((a) => a.valueText) };
    });
    return { survey, summaries };
  }
};
