import { useCallback, useEffect, useMemo, useState } from 'react';

import api from '../../../lib/api';
import { getErrorMessage } from '../../../lib/errors';
import { getAccessToken } from '../../../lib/session';

interface ApprovalsTabProps {
  projectId: string;
}

interface ApprovalStep {
  id: string;
  order: number;
  status: 'pending' | 'approved' | 'rejected';
  approverId?: string | null;
  decidedAt?: string | null;
  comments?: string | null;
  approver?: {
    id: string;
    name?: string | null;
    email?: string | null;
  } | null;
}

interface ApprovalWorkflow {
  id: string;
  projectId: string;
  status: 'pending' | 'approved' | 'rejected';
  resourceType: string;
  resourceId: string;
  dueAt?: string | null;
  overdue: boolean;
  steps: ApprovalStep[];
  project?: { id: string; name: string } | null;
}

const formatDateTime = (value?: string | null) => {
  if (!value) return 'Sin fecha';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
};

const getPendingStep = (workflow: ApprovalWorkflow, userId?: string | null) => {
  if (!userId) return undefined;
  return workflow.steps.find(
    (step) => step.status === 'pending' && step.approverId === userId
  );
};

export default function ApprovalsTab({ projectId }: ApprovalsTabProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [workflows, setWorkflows] = useState<ApprovalWorkflow[]>([]);
  const [pending, setPending] = useState<ApprovalWorkflow[]>([]);
  const [showOverdueOnly, setShowOverdueOnly] = useState(false);
  const [actionPendingIds, setActionPendingIds] = useState<string[]>([]);

  const currentUserId = useMemo(() => {
    const token = getAccessToken();
    if (!token) return null;
    try {
      const [, payload] = token.split('.');
      if (!payload) return null;
      const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
      const padded = normalized.padEnd(
        normalized.length + ((4 - (normalized.length % 4)) % 4),
        '='
      );
      const decoded = atob(padded);
      const json = decodeURIComponent(
        decoded
          .split('')
          .map((char) => `%${`00${char.charCodeAt(0).toString(16)}`.slice(-2)}`)
          .join('')
      );
      const parsed = JSON.parse(json) as { sub?: string } | null;
      return parsed?.sub ?? null;
    } catch {
      return null;
    }
  }, []);

  const fetchWorkflows = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [allRes, pendingRes] = await Promise.all([
        api.get<ApprovalWorkflow[]>('/approvals', {
          params: {
            projectId,
            ...(showOverdueOnly ? { overdue: true } : {}),
          },
        }),
        api.get<ApprovalWorkflow[]>('/approvals/pending'),
      ]);

      const allItems = Array.isArray(allRes.data) ? allRes.data : [];
      const myPending = (
        Array.isArray(pendingRes.data) ? pendingRes.data : []
      ).filter((item) => item.projectId === projectId);

      const filteredPending = showOverdueOnly
        ? myPending.filter((item) => item.overdue)
        : myPending;

      setWorkflows(allItems);
      setPending(filteredPending);
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudieron cargar las aprobaciones.'));
    } finally {
      setLoading(false);
    }
  }, [projectId, showOverdueOnly]);

  useEffect(() => {
    void fetchWorkflows();
  }, [fetchWorkflows]);

  const handleApprove = async (workflowId: string) => {
    setActionPendingIds((prev) => [...prev, workflowId]);
    try {
      await api.post(`/approvals/${workflowId}/approve`);
      await fetchWorkflows();
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo aprobar el flujo.'));
    } finally {
      setActionPendingIds((prev) => prev.filter((id) => id !== workflowId));
    }
  };

  const handleReject = async (workflowId: string) => {
    const comments =
      window.prompt('Describe el motivo del rechazo (opcional):') ?? undefined;
    setActionPendingIds((prev) => [...prev, workflowId]);
    try {
      await api.post(
        `/approvals/${workflowId}/reject`,
        comments ? { comments } : {}
      );
      await fetchWorkflows();
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo rechazar el flujo.'));
    } finally {
      setActionPendingIds((prev) => prev.filter((id) => id !== workflowId));
    }
  };

  const renderWorkflowRow = (workflow: ApprovalWorkflow) => {
    const pendingStep = getPendingStep(workflow, currentUserId ?? undefined);
    const canAct = pendingStep !== undefined;
    const isActing = actionPendingIds.includes(workflow.id);

    return (
      <tr key={workflow.id} className="border-b border-slate-200">
        <td className="px-3 py-2 text-sm text-slate-700">
          <div className="font-medium text-slate-900">
            {workflow.resourceType}
          </div>
          <div className="text-xs text-slate-500">
            Recurso: {workflow.resourceId}
          </div>
        </td>
        <td className="px-3 py-2 text-sm text-slate-700">{workflow.status}</td>
        <td className="px-3 py-2 text-sm text-slate-700">
          {workflow.dueAt ? formatDateTime(workflow.dueAt) : 'Sin fecha'}
          {workflow.overdue && (
            <span className="ml-2 rounded bg-red-100 px-2 py-0.5 text-xs text-red-700">
              Vencido
            </span>
          )}
        </td>
        <td className="px-3 py-2 text-sm text-slate-700">
          <ul className="space-y-1">
            {workflow.steps.map((step) => (
              <li
                key={step.id}
                className="flex items-center justify-between gap-2"
              >
                <span>
                  #{step.order} ·{' '}
                  {step.approver?.name ?? step.approver?.email ?? 'Sin asignar'}
                </span>
                <span className="text-xs text-slate-500">{step.status}</span>
              </li>
            ))}
          </ul>
        </td>
        <td className="px-3 py-2 text-sm text-right">
          {canAct ? (
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="rounded bg-emerald-600 px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
                onClick={() => handleApprove(workflow.id)}
                disabled={isActing}
              >
                Aprobar
              </button>
              <button
                type="button"
                className="rounded bg-red-600 px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
                onClick={() => handleReject(workflow.id)}
                disabled={isActing}
              >
                Rechazar
              </button>
            </div>
          ) : (
            <span className="text-xs text-slate-400">
              Sin acciones disponibles
            </span>
          )}
        </td>
      </tr>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">
          Bandeja de aprobaciones
        </h2>
        <p className="text-sm text-slate-500">
          Controla los flujos pendientes del proyecto y filtra aquellos que
          excedieron el SLA de 48 horas.
        </p>
      </div>

      {error && (
        <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-800">
              Mis pendientes
            </h3>
            <p className="text-xs text-slate-500">
              Aprobaciones asignadas a ti dentro de este proyecto. Acciona
              directamente desde aquí.
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={showOverdueOnly}
              onChange={(event) => setShowOverdueOnly(event.target.checked)}
            />
            Mostrar solo vencidos
          </label>
        </header>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead>
              <tr className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-3 py-2">Flujo</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2">Vencimiento</th>
                <th className="px-3 py-2">Pasos</th>
                <th className="px-3 py-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {pending.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-6 text-center text-sm text-slate-400"
                  >
                    {loading
                      ? 'Cargando aprobaciones…'
                      : 'No tienes aprobaciones pendientes.'}
                  </td>
                </tr>
              ) : (
                pending.map(renderWorkflowRow)
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <header className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-800">
            Flujos del proyecto
          </h3>
          <button
            type="button"
            className="rounded border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
            onClick={() => fetchWorkflows()}
            disabled={loading}
          >
            Actualizar
          </button>
        </header>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead>
              <tr className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-3 py-2">Flujo</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2">Vencimiento</th>
                <th className="px-3 py-2">Pasos</th>
                <th className="px-3 py-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {workflows.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-6 text-center text-sm text-slate-400"
                  >
                    {loading
                      ? 'Actualizando bandeja…'
                      : 'Sin flujos configurados con los filtros actuales.'}
                  </td>
                </tr>
              ) : (
                workflows.map(renderWorkflowRow)
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
