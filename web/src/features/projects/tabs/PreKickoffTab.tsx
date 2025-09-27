import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';

import api from '../../../lib/api';
import { useAuth } from '../../../hooks/useAuth';
import { getErrorMessage } from '../../../lib/errors';

interface DataRequestItem {
  id: string;
  category: string;
  title: string;
  description?: string | null;
  required: boolean;
  status: string;
  format?: string | null;
  ownerName?: string | null;
  dueDate?: string | null;
  notes?: string | null;
}

interface PreKickoffTabProps {
  projectId: string;
}

const defaultForm = {
  category: '',
  title: '',
  description: '',
  required: true,
  status: 'Pending',
  format: '',
  ownerName: '',
  dueDate: '',
  notes: '',
};

const STATUS_OPTIONS = ['Pending', 'En progreso', 'Recibido'];

export default function PreKickoffTab({ projectId }: PreKickoffTabProps) {
  const { role } = useAuth();
  const canEdit = useMemo(() => ['admin', 'consultor'].includes(role), [role]);
  const isAdmin = role === 'admin';
  const [items, setItems] = useState<DataRequestItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [editing, setEditing] = useState<DataRequestItem | null>(null);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get<DataRequestItem[]>(
        `/data-request/${projectId}`
      );
      setItems(response.data ?? []);
      setError(null);
    } catch (error: unknown) {
      setError(
        getErrorMessage(error, 'No se pudieron cargar las solicitudes de datos')
      );
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (projectId) {
      void loadItems();
    }
  }, [projectId, loadItems]);

  const resetForm = () => {
    setForm(defaultForm);
  };

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canEdit) return;
    try {
      await api.post(`/data-request/${projectId}`, {
        category: form.category,
        title: form.title,
        description: form.description || undefined,
        required: form.required,
        status: form.status,
        format: form.format || undefined,
        ownerName: form.ownerName || undefined,
        dueDate: form.dueDate
          ? new Date(form.dueDate).toISOString()
          : undefined,
        notes: form.notes || undefined,
      });
      resetForm();
      await loadItems();
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'No se pudo crear la solicitud'));
    }
  };

  const startEdit = (item: DataRequestItem) => {
    setEditing({ ...item });
  };

  const cancelEdit = () => {
    setEditing(null);
  };

  const handleEditChange = (
    field: keyof DataRequestItem,
    value: string | boolean
  ) => {
    setEditing((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const saveEdit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editing) return;
    try {
      await api.put(`/data-request/${projectId}/${editing.id}`, {
        category: editing.category,
        title: editing.title,
        description: editing.description || undefined,
        required: editing.required,
        status: editing.status,
        format: editing.format || undefined,
        ownerName: editing.ownerName || undefined,
        dueDate: editing.dueDate
          ? new Date(editing.dueDate).toISOString()
          : null,
        notes: editing.notes || undefined,
      });
      setEditing(null);
      await loadItems();
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'No se pudo actualizar la solicitud'));
    }
  };

  const removeItem = async (id: string) => {
    if (!isAdmin) return;
    try {
      await api.delete(`/data-request/${projectId}/${id}`);
      await loadItems();
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'No se pudo eliminar la solicitud'));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">
          Datos Pre-Kickoff
        </h2>
        <p className="text-sm text-slate-500">
          Gestiona el checklist de información previa al kickoff, asignando
          responsables y fechas objetivo.
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
            Nueva solicitud de datos
          </h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="flex flex-col text-sm">
              Categoría
              <input
                className="mt-1 rounded border px-3 py-2"
                value={form.category}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, category: e.target.value }))
                }
                required
              />
            </label>
            <label className="flex flex-col text-sm">
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
            <label className="flex flex-col text-sm md:col-span-2">
              Título
              <input
                className="mt-1 rounded border px-3 py-2"
                value={form.title}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, title: e.target.value }))
                }
                required
              />
            </label>
            <label className="flex flex-col text-sm md:col-span-2">
              Descripción
              <textarea
                className="mt-1 rounded border px-3 py-2"
                value={form.description}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, description: e.target.value }))
                }
                rows={3}
              />
            </label>
            <label className="flex flex-col text-sm">
              Formato esperado
              <input
                className="mt-1 rounded border px-3 py-2"
                value={form.format}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, format: e.target.value }))
                }
              />
            </label>
            <label className="flex flex-col text-sm">
              Responsable
              <input
                className="mt-1 rounded border px-3 py-2"
                value={form.ownerName}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, ownerName: e.target.value }))
                }
              />
            </label>
            <label className="flex flex-col text-sm">
              Fecha objetivo
              <input
                type="date"
                className="mt-1 rounded border px-3 py-2"
                value={form.dueDate}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, dueDate: e.target.value }))
                }
              />
            </label>
            <label className="flex flex-col text-sm">
              Obligatorio
              <select
                className="mt-1 rounded border px-3 py-2"
                value={form.required ? 'true' : 'false'}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    required: e.target.value === 'true',
                  }))
                }
              >
                <option value="true">Sí</option>
                <option value="false">No</option>
              </select>
            </label>
            <label className="flex flex-col text-sm md:col-span-2">
              Notas internas
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
              className="rounded bg-slate-100 px-3 py-2 text-sm font-medium text-slate-600"
              onClick={resetForm}
            >
              Limpiar
            </button>
            <button
              type="submit"
              className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white"
            >
              Guardar solicitud
            </button>
          </div>
        </form>
      )}

      {editing && canEdit && (
        <form
          onSubmit={saveEdit}
          className="grid gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-slate-800">
              Editar solicitud
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
              Categoría
              <input
                className="mt-1 rounded border px-3 py-2"
                value={editing.category}
                onChange={(e) => handleEditChange('category', e.target.value)}
                required
              />
            </label>
            <label className="flex flex-col text-sm">
              Estado
              <select
                className="mt-1 rounded border px-3 py-2"
                value={editing.status}
                onChange={(e) => handleEditChange('status', e.target.value)}
              >
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col text-sm md:col-span-2">
              Título
              <input
                className="mt-1 rounded border px-3 py-2"
                value={editing.title}
                onChange={(e) => handleEditChange('title', e.target.value)}
                required
              />
            </label>
            <label className="flex flex-col text-sm md:col-span-2">
              Descripción
              <textarea
                className="mt-1 rounded border px-3 py-2"
                value={editing.description ?? ''}
                onChange={(e) =>
                  handleEditChange('description', e.target.value)
                }
                rows={3}
              />
            </label>
            <label className="flex flex-col text-sm">
              Formato esperado
              <input
                className="mt-1 rounded border px-3 py-2"
                value={editing.format ?? ''}
                onChange={(e) => handleEditChange('format', e.target.value)}
              />
            </label>
            <label className="flex flex-col text-sm">
              Responsable
              <input
                className="mt-1 rounded border px-3 py-2"
                value={editing.ownerName ?? ''}
                onChange={(e) => handleEditChange('ownerName', e.target.value)}
              />
            </label>
            <label className="flex flex-col text-sm">
              Fecha objetivo
              <input
                type="date"
                className="mt-1 rounded border px-3 py-2"
                value={editing.dueDate ? editing.dueDate.substring(0, 10) : ''}
                onChange={(e) => handleEditChange('dueDate', e.target.value)}
              />
            </label>
            <label className="flex flex-col text-sm">
              Obligatorio
              <select
                className="mt-1 rounded border px-3 py-2"
                value={editing.required ? 'true' : 'false'}
                onChange={(e) =>
                  handleEditChange('required', e.target.value === 'true')
                }
              >
                <option value="true">Sí</option>
                <option value="false">No</option>
              </select>
            </label>
            <label className="flex flex-col text-sm md:col-span-2">
              Notas internas
              <textarea
                className="mt-1 rounded border px-3 py-2"
                value={editing.notes ?? ''}
                onChange={(e) => handleEditChange('notes', e.target.value)}
                rows={2}
              />
            </label>
          </div>
          <div className="flex items-center justify-end gap-2">
            <button
              type="submit"
              className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white"
            >
              Actualizar solicitud
            </button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-slate-600">
                Categoría
              </th>
              <th className="px-3 py-2 text-left font-medium text-slate-600">
                Título
              </th>
              <th className="px-3 py-2 text-left font-medium text-slate-600">
                Estado
              </th>
              <th className="px-3 py-2 text-left font-medium text-slate-600">
                Responsable
              </th>
              <th className="px-3 py-2 text-left font-medium text-slate-600">
                Fecha objetivo
              </th>
              <th className="px-3 py-2 text-left font-medium text-slate-600">
                Requerido
              </th>
              <th className="px-3 py-2 text-left font-medium text-slate-600">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {items.map((item) => (
              <tr key={item.id} className="bg-white">
                <td className="px-3 py-2 font-medium text-slate-800">
                  {item.category}
                </td>
                <td className="px-3 py-2 text-slate-700">{item.title}</td>
                <td className="px-3 py-2">{item.status}</td>
                <td className="px-3 py-2">{item.ownerName || '-'}</td>
                <td className="px-3 py-2">
                  {item.dueDate
                    ? new Date(item.dueDate).toLocaleDateString()
                    : '-'}
                </td>
                <td className="px-3 py-2">{item.required ? 'Sí' : 'No'}</td>
                <td className="px-3 py-2">
                  {canEdit && (
                    <button
                      onClick={() => startEdit(item)}
                      className="mr-2 rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700"
                    >
                      Editar
                    </button>
                  )}
                  {isAdmin && (
                    <button
                      onClick={() => removeItem(item.id)}
                      className="rounded bg-red-600 px-2 py-1 text-xs font-medium text-white"
                    >
                      Eliminar
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {!loading && items.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-3 py-6 text-center text-slate-500"
                >
                  No hay solicitudes registradas.
                </td>
              </tr>
            )}
            {loading && (
              <tr>
                <td
                  colSpan={7}
                  className="px-3 py-6 text-center text-slate-500"
                >
                  Cargando checklist…
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
