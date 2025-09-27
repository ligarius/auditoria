import { FormEvent, useEffect, useState } from 'react';

import api from '../../../lib/api';
import { useAuth } from '../../../hooks/useAuth';

interface Finding {
  id: string;
  title: string;
  evidence?: string | null;
  impact: string;
  recommendation: string;
  quickWin: boolean;
  effortDays?: number | null;
  responsibleR?: string | null;
  accountableA?: string | null;
  targetDate?: string | null;
  status: string;
}

interface FindingsTabProps {
  projectId: string;
}

const initialForm = {
  title: '',
  impact: '',
  recommendation: '',
  quickWin: false,
  effortDays: '',
  responsibleR: '',
  accountableA: '',
  targetDate: '',
  evidence: ''
};

export default function FindingsTab({ projectId }: FindingsTabProps) {
  const { role } = useAuth();
  const canEdit = ['admin', 'consultor'].includes(role);
  const isAdmin = role === 'admin';
  const [findings, setFindings] = useState<Finding[]>([]);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState<string | null>(null);

  const loadFindings = async () => {
    try {
      const response = await api.get<Finding[]>('/findings', { params: { projectId } });
      setFindings(response.data);
      setError(null);
    } catch (err: any) {
      setError(err?.response?.data?.title || 'No se pudieron cargar los hallazgos');
    }
  };

  useEffect(() => {
    if (projectId) {
      loadFindings();
    }
  }, [projectId]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canEdit) return;
    try {
      setError(null);
      await api.post('/findings', {
        projectId,
        title: form.title,
        impact: form.impact,
        recommendation: form.recommendation,
        quickWin: form.quickWin,
        effortDays: form.effortDays ? Number(form.effortDays) : undefined,
        responsibleR: form.responsibleR,
        accountableA: form.accountableA,
        targetDate: form.targetDate ? new Date(form.targetDate).toISOString() : undefined,
        evidence: form.evidence || undefined
      });
      setForm(initialForm);
      await loadFindings();
    } catch (err: any) {
      setError(err?.response?.data?.title || 'No se pudo crear el hallazgo');
    }
  };

  const updateFinding = async (id: string, data: Partial<Finding>) => {
    try {
      const response = await api.patch<Finding>(`/findings/${id}`, data);
      setFindings((prev) => prev.map((item) => (item.id === id ? response.data : item)));
      setError(null);
    } catch (err: any) {
      setError(err?.response?.data?.title || 'No se pudo actualizar el hallazgo');
    }
  };

  const deleteFinding = async (id: string) => {
    try {
      await api.delete(`/findings/${id}`);
      setFindings((prev) => prev.filter((item) => item.id !== id));
      setError(null);
    } catch (err: any) {
      setError(err?.response?.data?.title || 'No se pudo eliminar el hallazgo');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-900">Hallazgos y acciones</h2>
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>

      {canEdit && (
        <form onSubmit={handleSubmit} className="grid gap-3 rounded-lg border border-slate-200 p-4">
          <h3 className="text-lg font-medium text-slate-800">Nuevo hallazgo</h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="flex flex-col text-sm md:col-span-2">
              Título
              <input
                className="mt-1 rounded border px-3 py-2"
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                required
              />
            </label>
            <label className="flex flex-col text-sm md:col-span-2">
              Recomendación
              <textarea
                className="mt-1 rounded border px-3 py-2"
                value={form.recommendation}
                onChange={(e) => setForm((prev) => ({ ...prev, recommendation: e.target.value }))}
                required
              />
            </label>
            <label className="flex flex-col text-sm">
              Impacto
              <input
                className="mt-1 rounded border px-3 py-2"
                value={form.impact}
                onChange={(e) => setForm((prev) => ({ ...prev, impact: e.target.value }))}
                required
              />
            </label>
            <label className="flex flex-col text-sm">
              Quick win
              <select
                className="mt-1 rounded border px-3 py-2"
                value={form.quickWin ? 'true' : 'false'}
                onChange={(e) => setForm((prev) => ({ ...prev, quickWin: e.target.value === 'true' }))}
              >
                <option value="true">Sí</option>
                <option value="false">No</option>
              </select>
            </label>
            <label className="flex flex-col text-sm">
              Responsable (R)
              <input
                className="mt-1 rounded border px-3 py-2"
                value={form.responsibleR}
                onChange={(e) => setForm((prev) => ({ ...prev, responsibleR: e.target.value }))}
                required
              />
            </label>
            <label className="flex flex-col text-sm">
              Accountable (A)
              <input
                className="mt-1 rounded border px-3 py-2"
                value={form.accountableA}
                onChange={(e) => setForm((prev) => ({ ...prev, accountableA: e.target.value }))}
                required
              />
            </label>
            <label className="flex flex-col text-sm">
              Días de esfuerzo
              <input
                type="number"
                min={0}
                className="mt-1 rounded border px-3 py-2"
                value={form.effortDays}
                onChange={(e) => setForm((prev) => ({ ...prev, effortDays: e.target.value }))}
              />
            </label>
            <label className="flex flex-col text-sm">
              Fecha objetivo
              <input
                type="date"
                className="mt-1 rounded border px-3 py-2"
                value={form.targetDate}
                onChange={(e) => setForm((prev) => ({ ...prev, targetDate: e.target.value }))}
              />
            </label>
            <label className="flex flex-col text-sm md:col-span-2">
              Evidencia
              <input
                className="mt-1 rounded border px-3 py-2"
                value={form.evidence}
                onChange={(e) => setForm((prev) => ({ ...prev, evidence: e.target.value }))}
              />
            </label>
          </div>
          <button
            type="submit"
            className="self-start rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white"
          >
            Guardar hallazgo
          </button>
        </form>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-slate-600">Título</th>
              <th className="px-3 py-2 text-left font-medium text-slate-600">Impacto</th>
              <th className="px-3 py-2 text-left font-medium text-slate-600">Quick win</th>
              <th className="px-3 py-2 text-left font-medium text-slate-600">Estado</th>
              <th className="px-3 py-2 text-left font-medium text-slate-600">Responsable</th>
              <th className="px-3 py-2 text-left font-medium text-slate-600">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {findings.map((finding) => (
              <tr key={finding.id}>
                <td className="px-3 py-2">
                  <p className="font-medium text-slate-800">{finding.title}</p>
                  <p className="text-xs text-slate-500">{finding.recommendation}</p>
                </td>
                <td className="px-3 py-2">{finding.impact}</td>
                <td className="px-3 py-2">
                  {canEdit ? (
                    <input
                      type="checkbox"
                      checked={finding.quickWin}
                      onChange={(e) => updateFinding(finding.id, { quickWin: e.target.checked })}
                    />
                  ) : (
                    finding.quickWin ? 'Sí' : 'No'
                  )}
                </td>
                <td className="px-3 py-2">
                  {canEdit ? (
                    <select
                      className="rounded border px-2 py-1"
                      value={finding.status}
                      onChange={(e) => updateFinding(finding.id, { status: e.target.value })}
                    >
                      <option value="Open">Open</option>
                      <option value="En progreso">En progreso</option>
                      <option value="Cerrado">Cerrado</option>
                    </select>
                  ) : (
                    finding.status
                  )}
                </td>
                <td className="px-3 py-2 text-slate-600">
                  {finding.responsibleR || '-'}
                </td>
                <td className="px-3 py-2">
                  {isAdmin && (
                    <button
                      onClick={() => deleteFinding(finding.id)}
                      className="rounded bg-red-600 px-2 py-1 text-white"
                    >
                      Eliminar
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {findings.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-slate-500">
                  No hay hallazgos registrados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
