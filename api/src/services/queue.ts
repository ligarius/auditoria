import { Queue, Worker, type JobsOptions } from 'bullmq';
import { Redis } from 'ioredis';

import { env } from '../core/config/env.js';
import { prisma } from '../core/config/db.js';
import { logger } from '../core/config/logger.js';

interface SurveyInviteJobData {
  surveyLinkId: string;
}

interface SurveyReminderJobData {
  surveyLinkId: string;
  remindAfterDays?: number;
}

type QueueServiceImpl = {
  enqueueSurveyInvite: (data: SurveyInviteJobData) => Promise<void>;
  scheduleSurveyReminder: (data: SurveyReminderJobData) => Promise<void>;
  cancelSurveyReminder: (surveyLinkId: string) => Promise<void>;
};

type QueueInitialization = {
  queueService: QueueServiceImpl;
  initializeQueueWorkers: () => Promise<void>;
};

const createQueueInfrastructure = (): QueueInitialization => {
  const connection = new Redis(env.redisUrl, {
    maxRetriesPerRequest: null
  });

  connection.on('error', (error: Error) => {
    logger.error({ err: error }, 'Error en la conexión a Redis para BullMQ');
  });

  const defaultJobOptions: JobsOptions = {
    attempts: 3,
    removeOnComplete: 100,
    removeOnFail: 25,
    backoff: {
      type: 'exponential',
      delay: 5000
    }
  };

  const queuePrefix = env.bullPrefix;

  const inviteQueue = new Queue<SurveyInviteJobData>('survey-invite', {
    connection,
    defaultJobOptions,
    prefix: queuePrefix
  });
  const reminderQueue = new Queue<SurveyReminderJobData>('survey-reminder', {
    connection,
    defaultJobOptions: {
      ...defaultJobOptions,
      backoff: {
        type: 'fixed',
        delay: 15000
      }
    },
    prefix: queuePrefix
  });

  const workers: Worker[] = [];
  let workersInitialized = false;

  const buildReminderJobId = (surveyLinkId: string) =>
    `survey-reminder:${surveyLinkId}`;
  const buildInviteJobId = (surveyLinkId: string) =>
    `survey-invite:${surveyLinkId}`;

  const initializeQueueWorkers = async () => {
    if (workersInitialized) {
      return;
    }

    await Promise.all([
      inviteQueue.waitUntilReady(),
      reminderQueue.waitUntilReady()
    ]);

    const inviteWorker = new Worker<SurveyInviteJobData>(
      'survey-invite',
      async (job) => {
        const link = await prisma.surveyLink.findUnique({
          where: { id: job.data.surveyLinkId },
          include: {
            project: {
              select: {
                id: true,
                name: true,
                owner: { select: { id: true, email: true, name: true } }
              }
            },
            createdBy: { select: { id: true, email: true, name: true } }
          }
        });

        if (!link) {
          logger.warn(
            { surveyLinkId: job.data.surveyLinkId },
            'No se encontró el link de encuesta para enviar la invitación'
          );
          return;
        }

        const recipients = [
          link.createdBy?.email,
          link.project.owner?.email
        ].filter((value): value is string => Boolean(value));

        logger.info(
          {
            surveyLinkId: link.id,
            projectId: link.projectId,
            projectName: link.project.name,
            recipients
          },
          'Invitación de encuesta preparada para envío'
        );
      },
      { connection, prefix: queuePrefix }
    );

    const reminderWorker = new Worker<SurveyReminderJobData>(
      'survey-reminder',
      async (job) => {
        const link = await prisma.surveyLink.findUnique({
          where: { id: job.data.surveyLinkId },
          include: {
            responses: {
              select: { id: true, submittedAt: true },
              take: 1
            },
            project: {
              select: {
                id: true,
                name: true,
                owner: { select: { id: true, email: true, name: true } }
              }
            },
            createdBy: { select: { id: true, email: true, name: true } }
          }
        });

        if (!link) {
          logger.warn(
            { surveyLinkId: job.data.surveyLinkId },
            'No se encontró el link de encuesta para el recordatorio'
          );
          return;
        }

        const now = new Date();
        if (
          (link.expiresAt && link.expiresAt <= now) ||
          (link.maxResponses && link.usedCount >= link.maxResponses)
        ) {
          logger.info(
            { surveyLinkId: link.id },
            'Encuesta expirada o completada, no se enviará recordatorio'
          );
          return;
        }

        if (link.responses.length > 0) {
          logger.info(
            { surveyLinkId: link.id },
            'Encuesta respondida, recordatorio cancelado'
          );
          return;
        }

        const recipients = [
          link.createdBy?.email,
          link.project.owner?.email
        ].filter((value): value is string => Boolean(value));

        logger.info(
          {
            surveyLinkId: link.id,
            projectId: link.projectId,
            projectName: link.project.name,
            recipients,
            remindAfterDays: job.data.remindAfterDays ?? env.surveyReminderDays
          },
          'Recordatorio de encuesta enviado'
        );
      },
      { connection, prefix: queuePrefix }
    );

    workers.push(inviteWorker, reminderWorker);
    workersInitialized = true;
  };

  const queueService: QueueServiceImpl = {
    enqueueSurveyInvite: async (data: SurveyInviteJobData) => {
      await inviteQueue.add('survey-invite', data, {
        jobId: buildInviteJobId(data.surveyLinkId)
      });
    },
    scheduleSurveyReminder: async (data: SurveyReminderJobData) => {
      const reminderDays = data.remindAfterDays ?? env.surveyReminderDays;
      const delay = Math.max(reminderDays, 1) * 24 * 60 * 60 * 1000;
      await reminderQueue.add(
        'survey-reminder',
        { ...data, remindAfterDays: reminderDays },
        {
          delay,
          jobId: buildReminderJobId(data.surveyLinkId)
        }
      );
    },
    cancelSurveyReminder: async (surveyLinkId: string) => {
      const job = await reminderQueue.getJob(buildReminderJobId(surveyLinkId));
      if (job) {
        await job.remove();
      }
    }
  };

  return { queueService, initializeQueueWorkers };
};

const noopQueueService: QueueServiceImpl = {
  enqueueSurveyInvite: async () => {},
  scheduleSurveyReminder: async () => {},
  cancelSurveyReminder: async () => {}
};

let queueServiceImplementation: QueueServiceImpl = noopQueueService;
let initializeQueueWorkersImplementation: () => Promise<void> = async () => {};

if (env.nodeEnv !== 'test') {
  const { queueService, initializeQueueWorkers } = createQueueInfrastructure();
  queueServiceImplementation = queueService;
  initializeQueueWorkersImplementation = initializeQueueWorkers;
}

export const queueService = queueServiceImplementation;
export const initializeQueueWorkers = () =>
  initializeQueueWorkersImplementation();
