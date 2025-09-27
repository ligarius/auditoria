import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';

import api from '../../../lib/api';
import { useAuth } from '../../../hooks/useAuth';
import { getErrorMessage } from '../../../lib/errors';

interface Interview {
  id: string;
  personName: string;
  role?: string | null;
  area?: string | null;
  date?: string | null;
  transcript?: string | null;
  notes?: string | null;
}

interface InterviewsTabProps {
  projectId: string;
}

const defaultForm = {
  personName: '',
  role: '',
  area: '',
  date: '',
  transcript: '',
  notes: '',
};

export default function InterviewsTab({ projectId }: InterviewsTabProps) {
  const { role } = useAuth();
  const canEdit = useMemo(() => ['admin', 'consultor'].includes(role), [role]);
  const isAdmin = role === 'admin';
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [form, setForm] = useState(defaultForm);
  const [editing, setEditing] = useState<Interview | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadInterviews = useCallback(async () => {
    try {
      const response = await api.get<Interview[]>(`/interviews/${projectId}`);
      setInterviews(response.data ?? []);
      setError(null);
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'No se pudieron cargar las entrevistas'));
    }
  }, [projectId]);

  useEffect(() => {
    if (projectId) {
      void loadInterviews();
    }
  }, [projectId, loadInterviews]);

  const resetForm = () => {
    setForm(defaultForm);
  };

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canEdit) return;
    try {
      await api.post(`/interviews/${projectId}`, {
        personName: form.personName,
        role: form.role || undefined,
        area: form.area || undefined,
        date: form.date ? new Date(form.date).toISOString() : undefined,
        transcript: form.transcript || undefined,
        notes: form.notes || undefined,
      });
      resetForm();
      await loadInterviews();
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'No se pudo registrar la entrevista'));
    }
  };

  const startEdit = (item: Interview) => {
    setEditing({ ...item });
  };

  const cancelEdit = () => setEditing(null);

  const handleUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editing) return;
    try {
      await api.put(`/interviews/${projectId}/${editing.id}`, {
        personName: editing.personName,
        role: editing.role || undefined,
        area: editing.area || undefined,
        date: editing.date ? new Date(editing.date).toISOString() : null,
        transcript: editing.transcript || undefined,
        notes: editing.notes || undefined,
      });
      setEditing(null);
      await loadInterviews();
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'No se pudo actualizar la entrevista'));
    }
  };

  const remove = async (id: string) => {
    if (!isAdmin) return;
    try {
      await api.delete(`/interviews/${projectId}/${id}`);
      await loadInterviews();
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'No se pudo eliminar la entrevista'));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Entrevistas</h2>
        <p className="text-sm text-slate-500">
          Documenta entrevistas con stakeholders, registra hallazgos y controla
          el seguimiento.
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
          <h3 className="text-lg font-medium text-slate-800">
            Nueva entrevista
          </h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="flex flex-col text-sm">
              Nombre del entrevistado
              <input
                className="mt-1 rounded border px-3 py-2"
                value={form.personName}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, personName: e.target.value }))
                }
                required
              />
            </label>
            <label className="flex flex-col text-sm">
              Rol
              <input
                className="mt-1 rounded border px-3 py-2"
                value={form.role}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, role: e.target.value }))
                }
              />
            </label>
            <label className="flex flex-col text-sm">
              Área
              <input
                className="mt-1 rounded border px-3 py-2"
                value={form.area}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, area: e.target.value }))
                }
              />
            </label>
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
            <label className="flex flex-col text-sm md:col-span-2">
              Resumen / Transcript
              <textarea
                className="mt-1 rounded border px-3 py-2"
                value={form.transcript}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, transcript: e.target.value }))
                }
                rows={3}
              />
            </label>
            <label className="flex flex-col text-sm md:col-span-2">
              Notas y próximos pasos
              <textarea
                className="mt-1 rounded border px-3 py-2"
                value={form.notes}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, notes: e.target.value }))
                }
                rows={2}
              />
            </label>
          </div>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              className="rounded bg-slate-100 px-3 py-2 text-sm text-slate-600"
              onClick={resetForm}
            >
              Limpiar
            </button>
            <button
              type="submit"
              className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white"
            >
              Registrar entrevista
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
              Editar entrevista
            </h3>
            <button
              type="button"
              onClick={cancelEdit}
              className="text-sm text-blue-700 underline"
            >
              Cancelar
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="flex flex-col text-sm">
              Nombre del entrevistado
              <input
                className="mt-1 rounded border px-3 py-2"
                value={editing.personName}
                onChange={(e) =>
                  setEditing((prev) =>
                    prev ? { ...prev, personName: e.target.value } : prev
                  )
                }
                required
              />
            </label>
            <label className="flex flex-col text-sm">
              Rol
              <input
                className="mt-1 rounded border px-3 py-2"
                value={editing.role ?? ''}
                onChange={(e) =>
                  setEditing((prev) =>
                    prev ? { ...prev, role: e.target.value } : prev
                  )
                }
              />
            </label>
            <label className="flex flex-col text-sm">
              Área
              <input
                className="mt-1 rounded border px-3 py-2"
                value={editing.area ?? ''}
                onChange={(e) =>
                  setEditing((prev) =>
                    prev ? { ...prev, area: e.target.value } : prev
                  )
                }
              />
            </label>
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
            <label className="flex flex-col text-sm md:col-span-2">
              Resumen / Transcript
              <textarea
                className="mt-1 rounded border px-3 py-2"
                value={editing.transcript ?? ''}
                onChange={(e) =>
                  setEditing((prev) =>
                    prev ? { ...prev, transcript: e.target.value } : prev
                  )
                }
                rows={3}
              />
            </label>
            <label className="flex flex-col text-sm md:col-span-2">
              Notas y próximos pasos
              <textarea
                className="mt-1 rounded border px-3 py-2"
                value={editing.notes ?? ''}
                onChange={(e) =>
                  setEditing((prev) =>
                    prev ? { ...prev, notes: e.target.value } : prev
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
              Guardar cambios
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-slate-900">
          Entrevistas registradas
        </h3>
        <div className="space-y-3">
          {interviews.map((interview) => (
            <div
              key={interview.id}
              className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="text-base font-semibold text-slate-900">
                    {interview.personName}
                  </h4>
                  <p className="text-sm text-slate-600">
                    {interview.role || 'Rol no definido'} ·{' '}
                    {interview.area || 'Área no definida'}
                  </p>
                  {interview.date && (
                    <p className="text-xs text-slate-500">
                      {new Date(interview.date).toLocaleDateString('es-CL', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {canEdit && (
                    <button
                      onClick={() => startEdit(interview)}
                      className="rounded bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
                    >
                      Editar
                    </button>
                  )}
                  {isAdmin && (
                    <button
                      onClick={() => remove(interview.id)}
                      className="rounded bg-red-600 px-3 py-1 text-xs font-medium text-white"
                    >
                      Eliminar
                    </button>
                  )}
                </div>
              </div>
              {interview.transcript && (
                <div className="mt-3 rounded bg-slate-50 p-3 text-sm text-slate-700">
                  <p className="font-medium text-slate-800">Resumen</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm">
                    {interview.transcript}
                  </p>
                </div>
              )}
              {interview.notes && (
                <p className="mt-2 text-sm text-slate-600">
                  <span className="font-medium">Notas:</span> {interview.notes}
                </p>
              )}
            </div>
          ))}
          {interviews.length === 0 && (
            <p className="text-sm text-slate-500">
              No hay entrevistas registradas.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
