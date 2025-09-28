import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';

import api from '../../../lib/api';
import { useAuth } from '../../../hooks/useAuth';
import { getErrorMessage } from '../../../lib/errors';
import { EmbeddedDashboard } from '../../../modules/analytics/EmbeddedDashboard';
import { KpiAvance } from '../../../modules/analytics/KpiAvance';
import { KpiHallazgosSeveridad } from '../../../modules/analytics/KpiHallazgosSeveridad';
import { KpiPbcAging } from '../../../modules/analytics/KpiPbcAging';

interface KPI {
  id: string;
  name: string;
  value: number;
  unit?: string | null;
  date: string;
}

interface AnalyticsKpiResponse {
  progress: { day: string; pct: number }[];
  findingsBySeverity: { severity: string; qty: number }[];
  pbcAging: { bucket: string; label: string; count: number }[];
}

interface KpisTabProps {
  projectId: string;
}

const defaultForm = {
  name: '',
  value: '',
  unit: '',
  date: '',
};

export default function KpisTab({ projectId }: KpisTabProps) {
  const { role } = useAuth();
  const canEdit = useMemo(() => ['admin', 'consultor'].includes(role), [role]);
  const isAdmin = role === 'admin';
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [form, setForm] = useState(defaultForm);
  const [editing, setEditing] = useState<KPI | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [companyLoading, setCompanyLoading] = useState(false);
  const [insights, setInsights] = useState<AnalyticsKpiResponse | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);

  const supersetDashboardId = import.meta.env.VITE_SUPERSET_DASHBOARD_ID;
  const supersetDatasetIds = useMemo(() => {
    const raw = import.meta.env.VITE_SUPERSET_DATASET_IDS as string | undefined;
    if (!raw) return undefined;
    return raw
      .split(',')
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
  }, []);
  const chartsLoading = companyLoading || insightsLoading;
  const chartsError = !chartsLoading ? insightsError : null;

  const loadKpis = useCallback(async () => {
    try {
      const response = await api.get<KPI[]>(`/kpis/${projectId}`);
      setKpis(response.data ?? []);
      setError(null);
    } catch (error) {
      setError(getErrorMessage(error, 'No se pudieron cargar los KPIs'));
    }
  }, [projectId]);

  const loadProjectMeta = useCallback(async () => {
    if (!projectId) return;
    setCompanyLoading(true);
    try {
      const response = await api.get<{ company?: { id: string } | null }>(
        `/projects/${projectId}`
      );
      const company = response.data?.company;
      setCompanyId(company?.id ?? null);
      setInsightsError(null);
    } catch (error) {
      setCompanyId(null);
      setInsightsError(
        getErrorMessage(error, 'No se pudo obtener la compañía del proyecto')
      );
    } finally {
      setCompanyLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (projectId) {
      void loadKpis();
    }
  }, [projectId, loadKpis]);

  useEffect(() => {
    void loadProjectMeta();
  }, [loadProjectMeta]);

  useEffect(() => {
    if (!projectId || !companyId) {
      setInsights(null);
      return;
    }

    let cancelled = false;
    setInsightsLoading(true);
    setInsightsError(null);

    api
      .get<AnalyticsKpiResponse>('/analytics/kpis', {
        params: { projectId, companyId }
      })
      .then((response) => {
        if (cancelled) return;
        const payload = response.data ?? {
          progress: [],
          findingsBySeverity: [],
          pbcAging: []
        };
        setInsights(payload);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setInsights(null);
        setInsightsError(
          getErrorMessage(error, 'No se pudieron cargar los KPIs operativos')
        );
      })
      .finally(() => {
        if (!cancelled) {
          setInsightsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [projectId, companyId]);

  const resetForm = () => setForm(defaultForm);

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canEdit) return;
    try {
      await api.post(`/kpis/${projectId}`, {
        name: form.name,
        value: Number(form.value),
        unit: form.unit || undefined,
        date: form.date
          ? new Date(form.date).toISOString()
          : new Date().toISOString(),
      });
      resetForm();
      await loadKpis();
    } catch (error) {
      setError(getErrorMessage(error, 'No se pudo crear el KPI'));
    }
  };

  const handleUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editing) return;
    try {
      await api.put(`/kpis/${projectId}/${editing.id}`, {
        name: editing.name,
        value: Number(editing.value),
        unit: editing.unit || undefined,
        date: editing.date
          ? new Date(editing.date).toISOString()
          : new Date().toISOString(),
      });
      setEditing(null);
      await loadKpis();
    } catch (error) {
      setError(getErrorMessage(error, 'No se pudo actualizar el KPI'));
    }
  };

  const remove = async (id: string) => {
    if (!isAdmin) return;
    try {
      await api.delete(`/kpis/${projectId}/${id}`);
      await loadKpis();
    } catch (error) {
      setError(getErrorMessage(error, 'No se pudo eliminar el KPI'));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">KPIs</h2>
        <p className="text-sm text-slate-500">
          Registra indicadores clave para monitorear la evolución de la
          auditoría y sus impactos.
        </p>
      </div>

      <section className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-3">
          <KpiAvance
            data={insights?.progress ?? []}
            loading={chartsLoading}
            error={chartsError}
          />
          <KpiPbcAging
            data={insights?.pbcAging ?? []}
            loading={chartsLoading}
            error={chartsError}
          />
          <KpiHallazgosSeveridad
            data={insights?.findingsBySeverity ?? []}
            loading={chartsLoading}
            error={chartsError}
          />
        </div>
        {companyId && supersetDashboardId ? (
          <EmbeddedDashboard
            projectId={projectId}
            companyId={companyId}
            dashboardId={supersetDashboardId}
            datasetIds={supersetDatasetIds}
            height={620}
          />
        ) : companyId && !supersetDashboardId ? (
          <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-500">
            Configura VITE_SUPERSET_DASHBOARD_ID para habilitar el dashboard analítico embebido.
          </div>
        ) : null}
      </section>

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
          <h3 className="text-lg font-medium text-slate-800">Nuevo KPI</h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <label className="flex flex-col text-sm md:col-span-2">
              Indicador
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
              Valor
              <input
                type="number"
                step="0.01"
                className="mt-1 rounded border px-3 py-2"
                value={form.value}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, value: e.target.value }))
                }
                required
              />
            </label>
            <label className="flex flex-col text-sm">
              Unidad
              <input
                className="mt-1 rounded border px-3 py-2"
                value={form.unit}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, unit: e.target.value }))
                }
                placeholder="%, días, puntos…"
              />
            </label>
            <label className="flex flex-col text-sm md:col-span-2">
              Fecha de medición
              <input
                type="date"
                className="mt-1 rounded border px-3 py-2"
                value={form.date}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, date: e.target.value }))
                }
              />
            </label>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white"
            >
              Registrar KPI
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
            <h3 className="text-lg font-medium text-slate-800">Editar KPI</h3>
            <button
              type="button"
              className="text-sm text-blue-700 underline"
              onClick={() => setEditing(null)}
            >
              Cancelar
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <label className="flex flex-col text-sm md:col-span-2">
              Indicador
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
              Valor
              <input
                type="number"
                step="0.01"
                className="mt-1 rounded border px-3 py-2"
                value={editing.value}
                onChange={(e) =>
                  setEditing((prev) =>
                    prev ? { ...prev, value: Number(e.target.value) } : prev
                  )
                }
                required
              />
            </label>
            <label className="flex flex-col text-sm">
              Unidad
              <input
                className="mt-1 rounded border px-3 py-2"
                value={editing.unit ?? ''}
                onChange={(e) =>
                  setEditing((prev) =>
                    prev ? { ...prev, unit: e.target.value } : prev
                  )
                }
                placeholder="%, días, puntos…"
              />
            </label>
            <label className="flex flex-col text-sm md:col-span-2">
              Fecha de medición
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
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white"
            >
              Actualizar KPI
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-slate-900">
          Indicadores registrados
        </h3>
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-slate-600">
                  Indicador
                </th>
                <th className="px-3 py-2 text-left font-medium text-slate-600">
                  Valor
                </th>
                <th className="px-3 py-2 text-left font-medium text-slate-600">
                  Unidad
                </th>
                <th className="px-3 py-2 text-left font-medium text-slate-600">
                  Fecha
                </th>
                <th className="px-3 py-2 text-left font-medium text-slate-600">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {kpis.map((kpi) => (
                <tr key={kpi.id}>
                  <td className="px-3 py-2 font-medium text-slate-800">
                    {kpi.name}
                  </td>
                  <td className="px-3 py-2">{kpi.value}</td>
                  <td className="px-3 py-2">{kpi.unit || '-'}</td>
                  <td className="px-3 py-2">
                    {new Date(kpi.date).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-2">
                    {canEdit && (
                      <button
                        onClick={() => setEditing(kpi)}
                        className="mr-2 rounded bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
                      >
                        Editar
                      </button>
                    )}
                    {isAdmin && (
                      <button
                        onClick={() => remove(kpi.id)}
                        className="rounded bg-red-600 px-3 py-1 text-xs font-medium text-white"
                      >
                        Eliminar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {kpis.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-6 text-center text-slate-500"
                  >
                    No hay KPIs registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
