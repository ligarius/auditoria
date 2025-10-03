import { logger } from '../core/config/logger';
import { approvalService } from '../modules/governance/approval.service';

import { notificationService } from './notification';

const DEFAULT_INTERVAL_MS = 60 * 1000;

let intervalHandle: NodeJS.Timeout | null = null;

const buildEmailContent = (
  workflow: Awaited<ReturnType<typeof approvalService.get>>
) => {
  const pendingApprovers = workflow.steps
    .filter((step) => step.status === 'pending' && step.approver?.email)
    .map(
      (step) =>
        `${step.approver?.name ?? step.approver?.email} (${step.approver?.email})`
    )
    .join(', ');

  const dueAtText = workflow.dueAt
    ? new Date(workflow.dueAt).toLocaleString()
    : 'Sin fecha definida';

  return {
    subject: `Flujo de aprobación vencido (${workflow.resourceType})`,
    html: `<p>El flujo de aprobación <strong>${workflow.resourceType}</strong> del proyecto <strong>${workflow.project.name}</strong> se encuentra vencido.</p>
<p>Fecha límite original: ${dueAtText}</p>
<p>Aprobadores pendientes: ${pendingApprovers || 'Sin aprobadores con correo registrado.'}</p>`
  };
};

const runMonitor = async () => {
  try {
    const referenceDate = new Date();
    const overdueWorkflows =
      await approvalService.markOverdueWorkflows(referenceDate);

    if (overdueWorkflows.length === 0) {
      return;
    }

    for (const workflow of overdueWorkflows) {
      const workflowWithTimers = workflow as typeof workflow & {
        slaTimers: unknown[];
      };
      const pendingApprovers = workflow.steps
        .filter((step) => step.status === 'pending' && step.approver?.email)
        .map((step) => step.approver?.email!)
        .filter((email) => Boolean(email));

      logger.warn(
        {
          workflowId: workflow.id,
          projectId: workflow.projectId,
          resourceType: workflow.resourceType,
          resourceId: workflow.resourceId,
          dueAt: workflow.dueAt,
          pendingApprovers
        },
        'Flujo de aprobación marcado como vencido'
      );

      const { subject, html } = buildEmailContent({
        ...workflowWithTimers,
        slaTimers: workflowWithTimers.slaTimers ?? []
      });
      await notificationService.sendEmail({
        to: pendingApprovers,
        subject,
        html
      });
    }
  } catch (error) {
    logger.error(
      { err: error },
      'Error al ejecutar el monitor de SLA de aprobaciones'
    );
  }
};

export const startApprovalSlaMonitor = (intervalMs = DEFAULT_INTERVAL_MS) => {
  if (intervalHandle) {
    return;
  }

  intervalHandle = setInterval(
    () => {
      void runMonitor();
    },
    Math.max(intervalMs, 15_000)
  );

  void runMonitor();
};

export const stopApprovalSlaMonitor = () => {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
};
