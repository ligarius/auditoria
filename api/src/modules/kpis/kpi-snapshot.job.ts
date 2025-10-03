import { prisma } from '../../core/config/db';
import { logger } from '../../core/config/logger';

const startOfUtcDay = (date: Date) =>
  new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );

const createRandomGenerator = (projectId: string, date: Date) => {
  const projectHash = Array.from(projectId).reduce((acc, char, index) => {
    return acc + char.charCodeAt(0) * (index + 1);
  }, 0);
  const dateKey = Number.parseInt(
    date.toISOString().slice(0, 10).replaceAll('-', ''),
    10
  );

  let seed = (projectHash * 9301 + dateKey * 49297) % 233280;

  return () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
};

const round = (value: number, precision = 2) => {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
};

const buildSnapshotPayload = (projectId: string, snapshotDate: Date) => {
  const random = createRandomGenerator(projectId, snapshotDate);

  const otif = round(92 + random() * 6, 2);
  const pickPerHour = round(70 + random() * 15, 2);
  const inventoryAccuracy = round(94 + random() * 5, 2);
  const occupancyPct = round(60 + random() * 25, 2);
  const costPerOrder = round(3 + random() * 4, 2);
  const kmPerDrop = round(8 + random() * 12, 2);

  return {
    date: snapshotDate,
    otif,
    pickPerHour,
    inventoryAccuracy,
    occupancyPct,
    costPerOrder,
    kmPerDrop
  };
};

const createJob = () => {
  let timer: NodeJS.Timeout | null = null;
  let running = false;

  const scheduleNextRun = () => {
    const now = new Date();
    const nextExecution = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)
    );
    const delay = Math.max(nextExecution.getTime() - now.getTime(), 1000);

    timer = setTimeout(() => {
      runJob()
        .catch((error) => {
          logger.error({ err: error }, 'Error ejecutando job diario de KPI');
        })
        .finally(() => {
          scheduleNextRun();
        });
    }, delay);
  };

  const runJob = async () => {
    if (running) {
      logger.warn(
        'Job diario de KPI ya se encuentra en ejecución, se omite nueva instancia'
      );
      return;
    }

    running = true;
    const executionDate = new Date();
    const snapshotDate = startOfUtcDay(executionDate);

    try {
      const projects = await prisma.project.findMany({ select: { id: true } });

      for (const project of projects) {
        const data = buildSnapshotPayload(project.id, snapshotDate);
        const existing = await prisma.kpiSnapshot.findFirst({
          where: { projectId: project.id, date: snapshotDate },
          select: { id: true }
        });

        if (existing) {
          await prisma.kpiSnapshot.update({
            where: { id: existing.id },
            data
          });
        } else {
          await prisma.kpiSnapshot.create({
            data: {
              ...data,
              projectId: project.id
            }
          });
        }
      }

      logger.info(
        {
          projectCount: projects.length,
          snapshotDate: snapshotDate.toISOString()
        },
        'Snapshots KPI generados automáticamente'
      );
    } catch (error) {
      logger.error(
        { err: error },
        'No se pudieron generar los snapshots KPI diarios'
      );
    } finally {
      running = false;
    }
  };

  return {
    start: () => {
      runJob()
        .catch((error) => {
          logger.error(
            { err: error },
            'Error inicial al generar snapshots KPI'
          );
        })
        .finally(() => {
          scheduleNextRun();
        });
    },
    stop: () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    }
  };
};

export const startKpiSnapshotCron = () => {
  const job = createJob();
  job.start();
  return job;
};

export type KpiSnapshotCron = ReturnType<typeof createJob>;
