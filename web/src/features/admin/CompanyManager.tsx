import { FormEvent, useEffect, useState } from 'react';

import api from '../../lib/api';
import { getErrorMessage } from '../../lib/errors';

interface Company {
  id: string;
  name: string;
  taxId?: string | null;
  createdAt: string;
  updatedAt: string;
  _count: { projects: number };
}

interface CompanyManagerProps {
  onChange?: () => void;
}

const defaultForm = {
  name: '',
  taxId: '',
};

export default function CompanyManager({ onChange }: CompanyManagerProps) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [form, setForm] = useState(defaultForm);
  const [editing, setEditing] = useState<Company | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadCompanies = async () => {
    setLoading(true);
    try {
      const response = await api.get<Company[]>('/companies');
      setCompanies(response.data ?? []);
      setError(null);
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'No se pudieron cargar las compañías'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCompanies();
  }, []);

  const resetForm = () => {
    setForm(defaultForm);
  };

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await api.post('/companies', {
        name: form.name,
        taxId: form.taxId || undefined,
      });
      resetForm();
      await loadCompanies();
      onChange?.();
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'No se pudo crear la compañía'));
    }
  };

  const handleUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editing) return;
    try {
      await api.put(`/companies/${editing.id}`, {
        name: editing.name,
        taxId: editing.taxId || undefined,
      });
      setEditing(null);
      await loadCompanies();
      onChange?.();
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'No se pudo actualizar la compañía'));
    }
  };

  const remove = async (id: string) => {
    try {
      await api.delete(`/companies/${id}`);
      await loadCompanies();
      onChange?.();
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'No se pudo eliminar la compañía'));
    }
  };

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Compañías</h2>
        <p className="text-sm text-slate-500">
          Administra las organizaciones auditadas y su identificación
          tributaria.
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
            Nueva compañía
          </h3>
          <label className="flex flex-col text-sm">
            Nombre
            <input
              className="mt-1 rounded border px-3 py-2"
              value={form.name}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, name: e.target.value }))
              }
              required
            />
          </label>
          <label className="flex flex-col text-sm">
            Tax ID / RUT
            <input
              className="mt-1 rounded border px-3 py-2"
              value={form.taxId}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, taxId: e.target.value }))
              }
              placeholder="99.999.999-9"
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
              Crear compañía
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
              Editar compañía
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
              onChange={(e) =>
                setEditing((prev) =>
                  prev ? { ...prev, name: e.target.value } : prev
                )
              }
              required
            />
          </label>
          <label className="flex flex-col text-sm">
            Tax ID / RUT
            <input
              className="mt-1 rounded border px-3 py-2"
              value={editing.taxId ?? ''}
              onChange={(e) =>
                setEditing((prev) =>
                  prev ? { ...prev, taxId: e.target.value } : prev
                )
              }
            />
          </label>
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

      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-slate-600">
                Nombre
              </th>
              <th className="px-3 py-2 text-left font-medium text-slate-600">
                Tax ID
              </th>
              <th className="px-3 py-2 text-left font-medium text-slate-600">
                Proyectos
              </th>
              <th className="px-3 py-2 text-left font-medium text-slate-600">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {companies.map((company) => (
              <tr key={company.id}>
                <td className="px-3 py-2 font-medium text-slate-800">
                  {company.name}
                </td>
                <td className="px-3 py-2">{company.taxId || '-'}</td>
                <td className="px-3 py-2">{company._count?.projects ?? 0}</td>
                <td className="px-3 py-2">
                  <button
                    onClick={() => setEditing(company)}
                    className="mr-2 rounded bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => remove(company.id)}
                    className="rounded bg-red-600 px-3 py-1 text-xs font-medium text-white"
                    disabled={(company._count?.projects ?? 0) > 0}
                    title={
                      (company._count?.projects ?? 0) > 0
                        ? 'No puedes eliminar compañías con proyectos'
                        : undefined
                    }
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
            {companies.length === 0 && !loading && (
              <tr>
                <td
                  colSpan={4}
                  className="px-3 py-6 text-center text-slate-500"
                >
                  No hay compañías registradas.
                </td>
              </tr>
            )}
            {loading && (
              <tr>
                <td
                  colSpan={4}
                  className="px-3 py-6 text-center text-slate-500"
                >
                  Cargando compañías…
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
