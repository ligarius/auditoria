import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';

import api from '../../../lib/api';
import { useAuth } from '../../../hooks/useAuth';
import { getErrorMessage } from '../../../lib/errors';

interface DecisionLog {
  id: string;
  date: string;
  topic: string;
  decision: string;
  rationale: string;
  approverA: string;
}

interface DecisionsTabProps {
  projectId: string;
}

const defaultForm = {
  date: '',
  topic: '',
  decision: '',
  rationale: '',
  approverA: '',
};

export default function DecisionsTab({ projectId }: DecisionsTabProps) {
  const { role } = useAuth();
  const canEdit = useMemo(() => ['admin', 'consultor'].includes(role), [role]);
  const isAdmin = role === 'admin';
  const [decisions, setDecisions] = useState<DecisionLog[]>([]);
  const [form, setForm] = useState(defaultForm);
  const [editing, setEditing] = useState<DecisionLog | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadDecisions = useCallback(async () => {
    try {
      const response = await api.get<DecisionLog[]>(`/decisions/${projectId}`);
      setDecisions(response.data ?? []);
      setError(null);
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'No se pudieron cargar las decisiones'));
    }
  }, [projectId]);

  useEffect(() => {
    if (projectId) {
      void loadDecisions();
    }
  }, [projectId, loadDecisions]);

  const resetForm = () => setForm(defaultForm);

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canEdit) return;
    try {
      await api.post(`/decisions/${projectId}`, {
        date: form.date
          ? new Date(form.date).toISOString()
          : new Date().toISOString(),
        topic: form.topic,
        decision: form.decision,
        rationale: form.rationale,
        approverA: form.approverA,
      });
      resetForm();
      await loadDecisions();
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'No se pudo registrar la decisión'));
    }
  };

  const handleUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editing) return;
    try {
      await api.put(`/decisions/${projectId}/${editing.id}`, {
        date: editing.date
          ? new Date(editing.date).toISOString()
          : new Date().toISOString(),
        topic: editing.topic,
        decision: editing.decision,
        rationale: editing.rationale,
        approverA: editing.approverA,
      });
      setEditing(null);
      await loadDecisions();
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'No se pudo actualizar la decisión'));
    }
  };

  const remove = async (id: string) => {
    if (!isAdmin) return;
    try {
      await api.delete(`/decisions/${projectId}/${id}`);
      await loadDecisions();
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'No se pudo eliminar la decisión'));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Decision Log</h2>
        <p className="text-sm text-slate-500">
          Registra acuerdos clave, argumentos y aprobadores para mantener
          trazabilidad.
        </p>
      </div>

      {error && (
        <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {canEdit && !editing && (
        <form
          onSubmit={handleCreate}
          className="grid gap-3 rounded-lg border border-slate-200 p-4"
        >
          <h3 className="text-lg font-medium text-slate-800">Nueva decisión</h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="flex flex-col text-sm">
              Fecha
              <input
                type="date"
                className="mt-1 rounded border px-3 py-2"
                value={form.date}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, date: e.target.value }))
                }
              />
            </label>
            <label className="flex flex-col text-sm">
              Aprobador (A)
              <input
                className="mt-1 rounded border px-3 py-2"
                value={form.approverA}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, approverA: e.target.value }))
                }
                required
              />
            </label>
            <label className="flex flex-col text-sm md:col-span-2">
              Tema
              <input
                className="mt-1 rounded border px-3 py-2"
                value={form.topic}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, topic: e.target.value }))
                }
                required
              />
            </label>
            <label className="flex flex-col text-sm md:col-span-2">
              Decisión
              <textarea
                className="mt-1 rounded border px-3 py-2"
                value={form.decision}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, decision: e.target.value }))
                }
                rows={2}
                required
              />
            </label>
            <label className="flex flex-col text-sm md:col-span-2">
              Racional
              <textarea
                className="mt-1 rounded border px-3 py-2"
                value={form.rationale}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, rationale: e.target.value }))
                }
                rows={2}
              />
            </label>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white"
            >
              Registrar decisión
            </button>
          </div>
        </form>
      )}

      {editing && canEdit && (
        <form
          onSubmit={handleUpdate}
          className="grid gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-slate-800">
              Editar decisión
            </h3>
            <button
              type="button"
              className="text-sm text-blue-700 underline"
              onClick={() => setEditing(null)}
            >
              Cancelar
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="flex flex-col text-sm">
              Fecha
              <input
                type="date"
                className="mt-1 rounded border px-3 py-2"
                value={editing.date ? editing.date.substring(0, 10) : ''}
                onChange={(e) =>
                  setEditing((prev) =>
                    prev ? { ...prev, date: e.target.value } : prev
                  )
                }
              />
            </label>
            <label className="flex flex-col text-sm">
              Aprobador (A)
              <input
                className="mt-1 rounded border px-3 py-2"
                value={editing.approverA}
                onChange={(e) =>
                  setEditing((prev) =>
                    prev ? { ...prev, approverA: e.target.value } : prev
                  )
                }
                required
              />
            </label>
            <label className="flex flex-col text-sm md:col-span-2">
              Tema
              <input
                className="mt-1 rounded border px-3 py-2"
                value={editing.topic}
                onChange={(e) =>
                  setEditing((prev) =>
                    prev ? { ...prev, topic: e.target.value } : prev
                  )
                }
                required
              />
            </label>
            <label className="flex flex-col text-sm md:col-span-2">
              Decisión
              <textarea
                className="mt-1 rounded border px-3 py-2"
                value={editing.decision}
                onChange={(e) =>
                  setEditing((prev) =>
                    prev ? { ...prev, decision: e.target.value } : prev
                  )
                }
                rows={2}
                required
              />
            </label>
            <label className="flex flex-col text-sm md:col-span-2">
              Racional
              <textarea
                className="mt-1 rounded border px-3 py-2"
                value={editing.rationale}
                onChange={(e) =>
                  setEditing((prev) =>
                    prev ? { ...prev, rationale: e.target.value } : prev
                  )
                }
                rows={2}
              />
            </label>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white"
            >
              Actualizar decisión
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-slate-900">
          Bitácora de decisiones
        </h3>
        <div className="space-y-2">
          {decisions.map((decision) => (
            <div
              key={decision.id}
              className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {decision.topic}
                  </p>
                  <p className="text-xs text-slate-500">
                    {new Date(decision.date).toLocaleDateString()} · Aprobador:{' '}
                    {decision.approverA}
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                  Decisión
                </span>
              </div>
              <div className="mt-3 space-y-2 text-sm text-slate-700">
                <p>
                  <span className="font-semibold">Decisión:</span>{' '}
                  {decision.decision}
                </p>
                {decision.rationale && (
                  <p>
                    <span className="font-semibold">Racional:</span>{' '}
                    {decision.rationale}
                  </p>
                )}
              </div>
              <div className="mt-3 flex gap-2">
                {canEdit && (
                  <button
                    onClick={() => setEditing(decision)}
                    className="rounded bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
                  >
                    Editar
                  </button>
                )}
                {isAdmin && (
                  <button
                    onClick={() => remove(decision.id)}
                    className="rounded bg-red-600 px-3 py-1 text-xs font-medium text-white"
                  >
                    Eliminar
                  </button>
                )}
              </div>
            </div>
          ))}
          {decisions.length === 0 && (
            <p className="text-sm text-slate-500">
              No hay decisiones registradas.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
