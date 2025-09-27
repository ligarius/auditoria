import { FormEvent, useEffect, useState } from 'react';

import api from '../../../lib/api';
import { useAuth } from '../../../hooks/useAuth';

interface Risk {
  id: string;
  category: string;
  description: string;
  probability: number;
  impact: number;
  severity: number;
  rag: string;
  mitigation?: string | null;
  owner?: string | null;
  dueDate?: string | null;
}

interface RisksTabProps {
  projectId: string;
}

const initialForm = {
  category: '',
  description: '',
  probability: 1,
  impact: 1,
  mitigation: '',
  owner: '',
  dueDate: ''
};

export default function RisksTab({ projectId }: RisksTabProps) {
  const { role } = useAuth();
  const canEdit = ['admin', 'consultor'].includes(role);
  const isAdmin = role === 'admin';
  const [risks, setRisks] = useState<Risk[]>([]);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState<string | null>(null);

  const loadRisks = async () => {
    try {
      const response = await api.get<Risk[]>('/risks', { params: { projectId } });
      setRisks(response.data);
      setError(null);
    } catch (err: any) {
      setError(err?.response?.data?.title || 'No se pudieron cargar los riesgos');
    }
  };

  useEffect(() => {
    if (projectId) {
      loadRisks();
    }
  }, [projectId]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canEdit) return;
    try {
      setError(null);
      await api.post('/risks', {
        projectId,
        category: form.category,
        description: form.description,
        probability: Number(form.probability),
        impact: Number(form.impact),
        mitigation: form.mitigation || undefined,
        owner: form.owner || undefined,
        dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : undefined
      });
      setForm(initialForm);
      await loadRisks();
    } catch (err: any) {
      setError(err?.response?.data?.title || 'No se pudo crear el riesgo');
    }
  };

  const updateRisk = async (id: string, data: Partial<Risk>) => {
    try {
      const response = await api.patch<Risk>(`/risks/${id}`, data);
      setRisks((prev) => prev.map((item) => (item.id === id ? response.data : item)));
      setError(null);
    } catch (err: any) {
      setError(err?.response?.data?.title || 'No se pudo actualizar el riesgo');
    }
  };

  const deleteRisk = async (id: string) => {
    try {
      await api.delete(`/risks/${id}`);
      setRisks((prev) => prev.filter((item) => item.id !== id));
      setError(null);
    } catch (err: any) {
      setError(err?.response?.data?.title || 'No se pudo eliminar el riesgo');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-900">Riesgos del proyecto</h2>
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>

      {canEdit && (
        <form onSubmit={handleSubmit} className="grid gap-3 rounded-lg border border-slate-200 p-4">
          <h3 className="text-lg font-medium text-slate-800">Nuevo riesgo</h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="flex flex-col text-sm">
              Categoría
              <input
                className="mt-1 rounded border px-3 py-2"
                value={form.category}
                onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                required
              />
            </label>
            <label className="flex flex-col text-sm">
              Probabilidad (1-5)
              <input
                type="number"
                min={1}
                max={5}
                className="mt-1 rounded border px-3 py-2"
                value={form.probability}
                onChange={(e) => setForm((prev) => ({ ...prev, probability: Number(e.target.value) }))}
                required
              />
            </label>
            <label className="flex flex-col text-sm">
              Impacto (1-5)
              <input
                type="number"
                min={1}
                max={5}
                className="mt-1 rounded border px-3 py-2"
                value={form.impact}
                onChange={(e) => setForm((prev) => ({ ...prev, impact: Number(e.target.value) }))}
                required
              />
            </label>
            <label className="flex flex-col text-sm">
              Responsable
              <input
                className="mt-1 rounded border px-3 py-2"
                value={form.owner}
                onChange={(e) => setForm((prev) => ({ ...prev, owner: e.target.value }))}
              />
            </label>
            <label className="flex flex-col text-sm md:col-span-2">
              Descripción
              <textarea
                className="mt-1 rounded border px-3 py-2"
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                required
              />
            </label>
            <label className="flex flex-col text-sm">
              Mitigación
              <input
                className="mt-1 rounded border px-3 py-2"
                value={form.mitigation}
                onChange={(e) => setForm((prev) => ({ ...prev, mitigation: e.target.value }))}
              />
            </label>
            <label className="flex flex-col text-sm">
              Fecha objetivo
              <input
                type="date"
                className="mt-1 rounded border px-3 py-2"
                value={form.dueDate}
                onChange={(e) => setForm((prev) => ({ ...prev, dueDate: e.target.value }))}
              />
            </label>
          </div>
          <button
            type="submit"
            className="self-start rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white"
          >
            Guardar riesgo
          </button>
        </form>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-slate-600">Categoría</th>
              <th className="px-3 py-2 text-left font-medium text-slate-600">Descripción</th>
              <th className="px-3 py-2 text-left font-medium text-slate-600">Prob.</th>
              <th className="px-3 py-2 text-left font-medium text-slate-600">Impacto</th>
              <th className="px-3 py-2 text-left font-medium text-slate-600">Severidad</th>
              <th className="px-3 py-2 text-left font-medium text-slate-600">RAG</th>
              <th className="px-3 py-2 text-left font-medium text-slate-600">Mitigación</th>
              <th className="px-3 py-2 text-left font-medium text-slate-600">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {risks.map((risk) => (
              <tr key={risk.id}>
                <td className="px-3 py-2">{risk.category}</td>
                <td className="px-3 py-2 text-slate-700">{risk.description}</td>
                <td className="px-3 py-2">{risk.probability}</td>
                <td className="px-3 py-2">{risk.impact}</td>
                <td className="px-3 py-2 font-semibold">{risk.severity}</td>
                <td className="px-3 py-2">
                  {canEdit ? (
                    <select
                      className="rounded border px-2 py-1"
                      value={risk.rag}
                      onChange={(e) => updateRisk(risk.id, { rag: e.target.value })}
                    >
                      <option value="Rojo">Rojo</option>
                      <option value="Ámbar">Ámbar</option>
                      <option value="Verde">Verde</option>
                    </select>
                  ) : (
                    risk.rag
                  )}
                </td>
                <td className="px-3 py-2">
                  {canEdit ? (
                    <input
                      className="w-full rounded border px-2 py-1"
                      value={risk.mitigation ?? ''}
                      onBlur={(e) => updateRisk(risk.id, { mitigation: e.target.value })}
                      onChange={(e) =>
                        setRisks((prev) =>
                          prev.map((item) =>
                            item.id === risk.id ? { ...item, mitigation: e.target.value } : item
                          )
                        )
                      }
                    />
                  ) : (
                    risk.mitigation || '-'
                  )}
                </td>
                <td className="px-3 py-2">
                  {isAdmin && (
                    <button
                      onClick={() => deleteRisk(risk.id)}
                      className="rounded bg-red-600 px-2 py-1 text-white"
                    >
                      Eliminar
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {risks.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-slate-500">
                  No hay riesgos registrados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
