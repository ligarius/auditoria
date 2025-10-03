import { FormEvent, useEffect, useState } from 'react';

import api from '../../lib/api';
import { getErrorMessage } from '../../lib/errors';

interface DataRequestCategory {
  id: string;
  name: string;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
}

const defaultForm = {
  name: '',
  description: '',
};

interface Props {
  onChange?: () => void;
}

export default function DataRequestCategoryManager({ onChange }: Props) {
  const [categories, setCategories] = useState<DataRequestCategory[]>([]);
  const [form, setForm] = useState(defaultForm);
  const [editing, setEditing] = useState<DataRequestCategory | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadCategories = async () => {
    setLoading(true);
    try {
      const response = await api.get<DataRequestCategory[]>(
        '/data-request-categories'
      );
      setCategories(response.data ?? []);
      setError(null);
    } catch (error: unknown) {
      setError(
        getErrorMessage(
          error,
          'No se pudieron cargar las categorías disponibles'
        )
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCategories();
  }, []);

  const resetForm = () => {
    setForm(defaultForm);
  };

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await api.post('/data-request-categories', {
        name: form.name,
        description: form.description || undefined,
      });
      resetForm();
      await loadCategories();
      onChange?.();
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'No se pudo crear la categoría'));
    }
  };

  const handleUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editing) return;
    try {
      await api.put(`/data-request-categories/${editing.id}`, {
        name: editing.name,
        description: editing.description || undefined,
      });
      setEditing(null);
      await loadCategories();
      onChange?.();
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'No se pudo actualizar la categoría'));
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/data-request-categories/${id}`);
      await loadCategories();
      onChange?.();
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'No se pudo eliminar la categoría'));
    }
  };

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">
          Categorías pre-kickoff
        </h2>
        <p className="text-sm text-slate-500">
          Define el catálogo de categorías disponibles para las solicitudes de
          datos pre-kickoff.
        </p>
      </div>

      {error && (
        <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {!editing && (
        <form
          onSubmit={handleCreate}
          className="grid gap-3 rounded-lg border border-slate-200 p-4"
        >
          <h3 className="text-base font-medium text-slate-800">
            Nueva categoría
          </h3>
          <label className="flex flex-col text-sm">
            Nombre
            <input
              className="mt-1 rounded border px-3 py-2"
              value={form.name}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, name: event.target.value }))
              }
              required
            />
          </label>
          <label className="flex flex-col text-sm">
            Descripción
            <textarea
              className="mt-1 rounded border px-3 py-2"
              value={form.description}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  description: event.target.value,
                }))
              }
              rows={2}
            />
          </label>
          <div className="flex justify-end gap-2">
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
              Crear categoría
            </button>
          </div>
        </form>
      )}

      {editing && (
        <form
          onSubmit={handleUpdate}
          className="grid gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-base font-medium text-slate-800">
              Editar categoría
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
            Nombre
            <input
              className="mt-1 rounded border px-3 py-2"
              value={editing.name}
              onChange={(event) =>
                setEditing((prev) =>
                  prev ? { ...prev, name: event.target.value } : prev
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
              onChange={(event) =>
                setEditing((prev) =>
                  prev ? { ...prev, description: event.target.value } : prev
                )
              }
              rows={2}
            />
          </label>
          <div className="flex justify-end gap-2">
            <button
              type="submit"
              className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white"
            >
              Actualizar
            </button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        <h3 className="text-base font-semibold text-slate-800">
          Catálogo disponible
        </h3>
        {loading && (
          <p className="text-sm text-slate-500">Cargando categorías…</p>
        )}
        {!loading && categories.length === 0 && (
          <p className="text-sm text-slate-500">
            Aún no hay categorías configuradas.
          </p>
        )}
        <div className="space-y-2">
          {categories.map((category) => (
            <div
              key={category.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded border border-slate-200 bg-white p-3 shadow-sm"
            >
              <div>
                <p className="text-sm font-medium text-slate-800">
                  {category.name}
                </p>
                {category.description && (
                  <p className="text-xs text-slate-500">
                    {category.description}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="rounded bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
                  onClick={() => setEditing(category)}
                >
                  Editar
                </button>
                <button
                  className="rounded bg-red-600 px-3 py-1 text-xs font-medium text-white"
                  onClick={() => handleDelete(category.id)}
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
