import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';

import api from '../../../lib/api';
import { useAuth } from '../../../hooks/useAuth';
import { getErrorMessage } from '../../../lib/errors';

interface POCItem {
  id: string;
  item: string;
  description?: string | null;
  owner?: string | null;
  date?: string | null;
  status: string;
}

interface POCTabProps {
  projectId: string;
}

const defaultForm = {
  item: '',
  description: '',
  owner: '',
  date: '',
  status: 'Pending',
};

const STATUS_OPTIONS = ['Pending', 'En ejecución', 'Completado'];

export default function POCTab({ projectId }: POCTabProps) {
  const { role } = useAuth();
  const canEdit = useMemo(() => ['admin', 'consultor'].includes(role), [role]);
  const isAdmin = role === 'admin';
  const [items, setItems] = useState<POCItem[]>([]);
  const [form, setForm] = useState(defaultForm);
  const [editing, setEditing] = useState<POCItem | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    try {
      const response = await api.get<POCItem[]>(`/poc/${projectId}`);
      setItems(response.data ?? []);
      setError(null);
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'No se pudieron cargar los POC'));
    }
  }, [projectId]);

  useEffect(() => {
    if (projectId) {
      void loadItems();
    }
  }, [projectId, loadItems]);

  const resetForm = () => setForm(defaultForm);

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canEdit) return;
    try {
      await api.post(`/poc/${projectId}`, {
        item: form.item,
        description: form.description || undefined,
        owner: form.owner || undefined,
        date: form.date ? new Date(form.date).toISOString() : undefined,
        status: form.status,
      });
      resetForm();
      await loadItems();
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'No se pudo crear el POC'));
    }
  };

  const handleUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editing) return;
    try {
      await api.put(`/poc/${projectId}/${editing.id}`, {
        item: editing.item,
        description: editing.description || undefined,
        owner: editing.owner || undefined,
        date: editing.date ? new Date(editing.date).toISOString() : null,
        status: editing.status,
      });
      setEditing(null);
      await loadItems();
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'No se pudo actualizar el POC'));
    }
  };

  const remove = async (id: string) => {
    if (!isAdmin) return;
    try {
      await api.delete(`/poc/${projectId}/${id}`);
      await loadItems();
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'No se pudo eliminar el POC'));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">POC / Pilotos</h2>
        <p className="text-sm text-slate-500">
          Administra pilotos, responsables y estados para acelerar la validación
          de soluciones.
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
          <h3 className="text-lg font-medium text-slate-800">Nuevo piloto</h3>
          <label className="flex flex-col text-sm">
            Nombre del piloto
            <input
              className="mt-1 rounded border px-3 py-2"
              value={form.item}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, item: e.target.value }))
              }
              required
            />
          </label>
          <label className="flex flex-col text-sm">
            Descripción
            <textarea
              className="mt-1 rounded border px-3 py-2"
              value={form.description}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, description: e.target.value }))
              }
              rows={2}
            />
          </label>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <label className="flex flex-col text-sm md:col-span-1">
              Responsable
              <input
                className="mt-1 rounded border px-3 py-2"
                value={form.owner}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, owner: e.target.value }))
                }
              />
            </label>
            <label className="flex flex-col text-sm md:col-span-1">
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
            <label className="flex flex-col text-sm md:col-span-1">
              Estado
              <select
                className="mt-1 rounded border px-3 py-2"
                value={form.status}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, status: e.target.value }))
                }
              >
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white"
            >
              Registrar piloto
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
              Editar piloto
            </h3>
            <button
              type="button"
              className="text-sm text-blue-700 underline"
              onClick={() => setEditing(null)}
            >
              Cancelar
            </button>
          </div>
          <label className="flex flex-col text-sm">
            Nombre del piloto
            <input
              className="mt-1 rounded border px-3 py-2"
              value={editing.item}
              onChange={(e) =>
                setEditing((prev) =>
                  prev ? { ...prev, item: e.target.value } : prev
                )
              }
              required
            />
          </label>
          <label className="flex flex-col text-sm">
            Descripción
            <textarea
              className="mt-1 rounded border px-3 py-2"
              value={editing.description ?? ''}
              onChange={(e) =>
                setEditing((prev) =>
                  prev ? { ...prev, description: e.target.value } : prev
                )
              }
              rows={2}
            />
          </label>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <label className="flex flex-col text-sm md:col-span-1">
              Responsable
              <input
                className="mt-1 rounded border px-3 py-2"
                value={editing.owner ?? ''}
                onChange={(e) =>
                  setEditing((prev) =>
                    prev ? { ...prev, owner: e.target.value } : prev
                  )
                }
              />
            </label>
            <label className="flex flex-col text-sm md:col-span-1">
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
            <label className="flex flex-col text-sm md:col-span-1">
              Estado
              <select
                className="mt-1 rounded border px-3 py-2"
                value={editing.status}
                onChange={(e) =>
                  setEditing((prev) =>
                    prev ? { ...prev, status: e.target.value } : prev
                  )
                }
              >
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white"
            >
              Actualizar piloto
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-slate-900">
          Pilotos en curso
        </h3>
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {item.item}
                  </p>
                  {item.description && (
                    <p className="text-sm text-slate-600">{item.description}</p>
                  )}
                  <p className="text-xs text-slate-500">
                    {item.owner
                      ? `Owner: ${item.owner}`
                      : 'Sin responsable asignado'}{' '}
                    ·{' '}
                    {item.date
                      ? new Date(item.date).toLocaleDateString()
                      : 'Sin fecha'}
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                  {item.status}
                </span>
              </div>
              <div className="mt-3 flex gap-2">
                {canEdit && (
                  <button
                    onClick={() => setEditing(item)}
                    className="rounded bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
                  >
                    Editar
                  </button>
                )}
                {isAdmin && (
                  <button
                    onClick={() => remove(item.id)}
                    className="rounded bg-red-600 px-3 py-1 text-xs font-medium text-white"
                  >
                    Eliminar
                  </button>
                )}
              </div>
            </div>
          ))}
          {items.length === 0 && (
            <p className="text-sm text-slate-500">
              No hay pilotos registrados.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
