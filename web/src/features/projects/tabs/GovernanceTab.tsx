import { useCallback, useEffect, useState } from 'react';

import api from '../../../lib/api';
import { getErrorMessage } from '../../../lib/errors';

interface GovernanceTabProps {
  projectId: string;
}

interface Committee {
  id: string;
  name: string;
  description?: string | null;
}

interface Meeting {
  id: string;
  title: string;
  scheduledAt: string;
  status?: string | null;
  agenda?: string | null;
}

interface MinuteAgreement {
  description: string;
  responsible: string;
  dueDate?: string | null;
}

interface Minute {
  id: string;
  content: string;
  createdAt: string;
  agreements: MinuteAgreement[];
  meeting?: {
    id: string;
    title?: string | null;
  } | null;
}

interface ScopeChange {
  id: string;
  title: string;
  status: string;
  scheduleImpact: string;
  costImpact: string;
  meeting?: {
    id: string;
    title?: string | null;
    scheduledAt?: string | null;
  } | null;
  approvalWorkflow?: {
    id: string;
    status: string;
    dueAt?: string | null;
    overdue: boolean;
  } | null;
}

interface ApprovalWorkflow {
  id: string;
  status: string;
  resourceType: string;
  resourceId: string;
  dueAt?: string | null;
}

const formatDate = (value?: string | null) => {
  if (!value) return 'Sin fecha';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
};

const formatMinuteSummary = (value?: string | null) => {
  if (!value) return 'Sin contenido registrado.';
  return value.length > 120 ? `${value.slice(0, 117)}…` : value;
};

const formatDateTime = (value?: string | null) => {
  if (!value) return 'Sin fecha';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
};

export default function GovernanceTab({ projectId }: GovernanceTabProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [committees, setCommittees] = useState<Committee[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [minutes, setMinutes] = useState<Minute[]>([]);
  const [scopeChanges, setScopeChanges] = useState<ScopeChange[]>([]);
  const [approvals, setApprovals] = useState<ApprovalWorkflow[]>([]);

  const loadGovernance = useCallback(async () => {
    setLoading(true);
    try {
      const [committeesRes, meetingsRes, minutesRes, scopeRes, approvalsRes] =
        await Promise.all([
          api.get<Committee[]>('/committees', { params: { projectId } }),
          api.get<Meeting[]>('/meetings', { params: { projectId } }),
          api.get<Minute[]>('/minutes', { params: { projectId } }),
          api.get<ScopeChange[]>('/scope-changes', { params: { projectId } }),
          api.get<ApprovalWorkflow[]>('/approvals', { params: { projectId } }),
        ]);
      setCommittees(
        Array.isArray(committeesRes.data) ? committeesRes.data : []
      );
      setMeetings(
        Array.isArray(meetingsRes.data)
          ? meetingsRes.data.map((meeting) => ({
              ...meeting,
              agenda: meeting.agenda ?? null,
            }))
          : []
      );
      setMinutes(
        Array.isArray(minutesRes.data)
          ? minutesRes.data.map((minute) => ({
              ...minute,
              agreements: Array.isArray(
                (minute as { agreements?: unknown }).agreements
              )
                ? (
                    (minute as { agreements?: unknown })
                      .agreements as MinuteAgreement[]
                  )
                    .map((agreement) => ({
                      description: agreement?.description ?? '',
                      responsible: agreement?.responsible ?? '',
                      dueDate: agreement?.dueDate ?? null,
                    }))
                    .filter(
                      (agreement) =>
                        agreement.description.length > 0 ||
                        agreement.responsible.length > 0
                    )
                : [],
            }))
          : []
      );
      setScopeChanges(
        Array.isArray(scopeRes.data)
          ? scopeRes.data.map((item) => ({
              ...item,
              scheduleImpact: item.scheduleImpact,
              costImpact: item.costImpact,
              meeting: item.meeting ?? null,
              approvalWorkflow: item.approvalWorkflow ?? null,
            }))
          : []
      );
      setApprovals(Array.isArray(approvalsRes.data) ? approvalsRes.data : []);
      setError(null);
    } catch (err) {
      setError(
        getErrorMessage(err, 'No se pudo cargar la gobernanza del proyecto.')
      );
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadGovernance();
  }, [loadGovernance]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">
          Gobernanza del proyecto
        </h2>
        <p className="text-sm text-slate-500">
          Panorama inicial de comités, reuniones, minutas, aprobaciones y
          cambios de alcance vinculados al proyecto.
        </p>
      </div>

      {error && (
        <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <article className="flex h-full flex-col justify-between rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div>
            <h3 className="text-base font-semibold text-slate-800">Comités</h3>
            <p className="mt-1 text-sm text-slate-500">
              Estructuras de gobierno para seguimiento y decisiones clave.
            </p>
          </div>
          <div className="mt-4 space-y-2 text-sm text-slate-600">
            {committees.length === 0 ? (
              <p className="text-slate-400">Aún no hay comités registrados.</p>
            ) : (
              <>
                <p className="text-sm font-medium text-slate-800">
                  {committees[0]?.name}
                </p>
                <p className="text-xs text-slate-500">
                  {committees[0]?.description ?? 'Sin descripción'}
                </p>
                <p className="text-xs text-slate-500">
                  Total: {committees.length}
                </p>
              </>
            )}
          </div>
        </article>

        <article className="flex h-full flex-col justify-between rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div>
            <h3 className="text-base font-semibold text-slate-800">
              Reuniones
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Seguimiento periódico para revisar avances y riesgos.
            </p>
          </div>
          <div className="mt-4 space-y-2 text-sm text-slate-600">
            {meetings.length === 0 ? (
              <p className="text-slate-400">Sin reuniones programadas.</p>
            ) : (
              <>
                <p className="text-sm font-medium text-slate-800">
                  {meetings[0]?.title}
                </p>
                <p className="text-xs text-slate-500">
                  Próxima: {formatDate(meetings[0]?.scheduledAt)}
                </p>
                {meetings[0]?.agenda && (
                  <p className="text-xs text-slate-500">
                    Agenda: {meetings[0]?.agenda}
                  </p>
                )}
                <p className="text-xs text-slate-500">
                  Total: {meetings.length}
                </p>
              </>
            )}
          </div>
        </article>

        <article className="flex h-full flex-col justify-between rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div>
            <h3 className="text-base font-semibold text-slate-800">Minutas</h3>
            <p className="mt-1 text-sm text-slate-500">
              Registro de acuerdos y compromisos surgidos en las sesiones.
            </p>
          </div>
          <div className="mt-4 space-y-2 text-sm text-slate-600">
            {minutes.length === 0 ? (
              <p className="text-slate-400">Sin minutas capturadas aún.</p>
            ) : (
              <>
                <p className="text-sm font-medium text-slate-800">
                  {minutes[0]?.meeting?.title ?? 'Sesión sin título'}
                </p>
                <p className="text-xs text-slate-500">
                  {formatDate(minutes[0]?.createdAt)}
                </p>
                <p className="text-xs text-slate-500">
                  {formatMinuteSummary(minutes[0]?.content)}
                </p>
                {minutes[0]?.agreements.length ? (
                  <ul className="space-y-1 text-xs text-slate-500">
                    {minutes[0]?.agreements
                      .slice(0, 3)
                      .map((agreement, index) => (
                        <li key={`${agreement.description}-${index}`}>
                          {agreement.description} · {agreement.responsible}
                          {agreement.dueDate
                            ? ` (${formatDate(agreement.dueDate)})`
                            : ''}
                        </li>
                      ))}
                    {minutes[0]?.agreements.length > 3 && (
                      <li className="italic text-slate-400">{`+${minutes[0]?.agreements.length - 3} acuerdos adicionales`}</li>
                    )}
                  </ul>
                ) : (
                  <p className="text-xs text-slate-400">
                    Sin acuerdos registrados.
                  </p>
                )}
                <p className="text-xs text-slate-500">
                  Total: {minutes.length}
                </p>
              </>
            )}
          </div>
        </article>

        <article className="flex h-full flex-col justify-between rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div>
            <h3 className="text-base font-semibold text-slate-800">
              Cambios de alcance
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Solicitudes registradas para ajustar entregables y cobertura.
            </p>
          </div>
          <div className="mt-4 space-y-2 text-sm text-slate-600">
            {scopeChanges.length === 0 ? (
              <p className="text-slate-400">Sin cambios propuestos.</p>
            ) : (
              <>
                <p className="text-sm font-medium text-slate-800">
                  {scopeChanges[0]?.title}
                </p>
                <p className="text-xs text-slate-500">
                  Estado: {scopeChanges[0]?.status}
                </p>
                <p className="text-xs text-slate-500">
                  Impacto plazo: {scopeChanges[0]?.scheduleImpact}
                </p>
                <p className="text-xs text-slate-500">
                  Impacto costo: {scopeChanges[0]?.costImpact}
                </p>
                {scopeChanges[0]?.meeting?.title && (
                  <p className="text-xs text-slate-500">
                    Sesión: {scopeChanges[0]?.meeting?.title} ·{' '}
                    {formatDate(scopeChanges[0]?.meeting?.scheduledAt)}
                  </p>
                )}
                {scopeChanges[0]?.approvalWorkflow && (
                  <p className="text-xs text-slate-500">
                    Aprobación: {scopeChanges[0]?.approvalWorkflow?.status} ·
                    Vence:{' '}
                    {formatDateTime(scopeChanges[0]?.approvalWorkflow?.dueAt)}
                    {scopeChanges[0]?.approvalWorkflow?.overdue && (
                      <span className="ml-1 rounded bg-red-100 px-1 text-[10px] uppercase tracking-wide text-red-700">
                        Vencido
                      </span>
                    )}
                  </p>
                )}
                <p className="text-xs text-slate-500">
                  Total: {scopeChanges.length}
                </p>
              </>
            )}
          </div>
        </article>

        <article className="flex h-full flex-col justify-between rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div>
            <h3 className="text-base font-semibold text-slate-800">
              Flujos de aprobación
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Procesos pendientes o completados para validar decisiones clave.
            </p>
          </div>
          <div className="mt-4 space-y-2 text-sm text-slate-600">
            {approvals.length === 0 ? (
              <p className="text-slate-400">Sin flujos configurados.</p>
            ) : (
              <>
                <p className="text-sm font-medium text-slate-800">
                  {approvals[0]?.resourceType} · {approvals[0]?.status}
                </p>
                <p className="text-xs text-slate-500">
                  Vence: {formatDate(approvals[0]?.dueAt)}
                </p>
                <p className="text-xs text-slate-500">
                  Total: {approvals.length}
                </p>
              </>
            )}
          </div>
        </article>
      </section>

      {loading && (
        <p className="text-sm text-slate-500">
          Actualizando datos de gobernanza…
        </p>
      )}
    </div>
  );
}
