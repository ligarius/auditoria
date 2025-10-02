import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';

import api from '../../../lib/api';
import { useAuth } from '../../../hooks/useAuth';
import { getErrorMessage } from '../../../lib/errors';
import {
  TimeSeriesChart,
  type TimeSeriesPoint,
} from '../components/TimeSeriesChart';

interface KpiSnapshot {
  id: string;
  date: string;
  otif?: number | null;
  pickPerHour?: number | null;
  inventoryAccuracy?: number | null;
  occupancyPct?: number | null;
  costPerOrder?: number | null;
  kmPerDrop?: number | null;
}

type MetricKey = keyof Pick<
  KpiSnapshot,
  | 'otif'
  | 'pickPerHour'
  | 'inventoryAccuracy'
  | 'occupancyPct'
  | 'costPerOrder'
  | 'kmPerDrop'
>;

interface KpisTabProps {
  projectId: string;
}

const defaultForm = {
  date: '',
  otif: '',
  pickPerHour: '',
  inventoryAccuracy: '',
  occupancyPct: '',
  costPerOrder: '',
  kmPerDrop: '',
};

const numberOrNull = (value: string): number | null => {
  if (!value || value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

const numberOrUndefined = (value: string): number | undefined => {
  if (!value || value.trim() === '') return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
};

const toInputDate = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
};

export default function KpisTab({ projectId }: KpisTabProps) {
  const { role } = useAuth();
  const canEdit = useMemo(() => ['admin', 'consultor'].includes(role), [role]);
  const isAdmin = role === 'admin';
  const [snapshots, setSnapshots] = useState<KpiSnapshot[]>([]);
  const [form, setForm] = useState(defaultForm);
  const [editing, setEditing] = useState<KpiSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const loadSnapshots = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { projectId };
      if (startDate) {
        params.startDate = new Date(`${startDate}T00:00:00.000Z`).toISOString();
      }
      if (endDate) {
        params.endDate = new Date(`${endDate}T23:59:59.999Z`).toISOString();
      }
      const response = await api.get<KpiSnapshot[]>('/kpis', { params });
      setSnapshots(Array.isArray(response.data) ? response.data : []);
      setError(null);
    } catch (err) {
      setError(
        getErrorMessage(err, 'No se pudieron cargar los KPIs del proyecto')
      );
    } finally {
      setLoading(false);
    }
  }, [projectId, startDate, endDate]);

  useEffect(() => {
    if (projectId) {
      void loadSnapshots();
    }
  }, [projectId, loadSnapshots]);

  const resetForm = () => {
    setForm(defaultForm);
    setEditing(null);
  };

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canEdit) return;
    try {
      await api.post('/kpis', {
        projectId,
        date: form.date
          ? new Date(form.date).toISOString()
          : new Date().toISOString(),
        otif: numberOrNull(form.otif),
        pickPerHour: numberOrNull(form.pickPerHour),
        inventoryAccuracy: numberOrNull(form.inventoryAccuracy),
        occupancyPct: numberOrNull(form.occupancyPct),
        costPerOrder: numberOrNull(form.costPerOrder),
        kmPerDrop: numberOrNull(form.kmPerDrop),
      });
      resetForm();
      await loadSnapshots();
    } catch (err) {
      setError(
        getErrorMessage(err, 'No se pudo registrar el snapshot de KPIs')
      );
    }
  };

  const handleUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editing) return;
    try {
      await api.put(`/kpis/${editing.id}`, {
        date: form.date ? new Date(form.date).toISOString() : undefined,
        otif: numberOrUndefined(form.otif),
        pickPerHour: numberOrUndefined(form.pickPerHour),
        inventoryAccuracy: numberOrUndefined(form.inventoryAccuracy),
        occupancyPct: numberOrUndefined(form.occupancyPct),
        costPerOrder: numberOrUndefined(form.costPerOrder),
        kmPerDrop: numberOrUndefined(form.kmPerDrop),
      });
      resetForm();
      await loadSnapshots();
    } catch (err) {
      setError(
        getErrorMessage(err, 'No se pudo actualizar el snapshot de KPIs')
      );
    }
  };

  const remove = async (id: string) => {
    if (!isAdmin) return;
    try {
      await api.delete(`/kpis/${id}`);
      await loadSnapshots();
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo eliminar el snapshot'));
    }
  };

  const startEdit = (snapshot: KpiSnapshot) => {
    setEditing(snapshot);
    setForm({
      date: toInputDate(snapshot.date),
      otif: snapshot.otif?.toString() ?? '',
      pickPerHour: snapshot.pickPerHour?.toString() ?? '',
      inventoryAccuracy: snapshot.inventoryAccuracy?.toString() ?? '',
      occupancyPct: snapshot.occupancyPct?.toString() ?? '',
      costPerOrder: snapshot.costPerOrder?.toString() ?? '',
      kmPerDrop: snapshot.kmPerDrop?.toString() ?? '',
    });
  };

  const clearFilters = () => {
    setStartDate('');
    setEndDate('');
  };

  const sortedSnapshots = useMemo(
    () =>
      [...snapshots].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      ),
    [snapshots]
  );

  const metricConfigs: Array<{
    key: MetricKey;
    title: string;
    unit?: string;
    color: string;
    valueFormatter?: (value: number) => string;
  }> = useMemo(
    () => [
      {
        key: 'otif',
        title: 'OTIF',
        unit: '%',
        color: '#0ea5e9',
        valueFormatter: (value: number) => value.toFixed(1),
      },
      {
        key: 'pickPerHour',
        title: 'Picks por hora',
        unit: 'picks/hh',
        color: '#6366f1',
        valueFormatter: (value: number) => value.toFixed(1),
      },
      {
        key: 'inventoryAccuracy',
        title: 'Exactitud de inventario',
        unit: '%',
        color: '#f97316',
        valueFormatter: (value: number) => value.toFixed(1),
      },
      {
        key: 'occupancyPct',
        title: 'Ocupación almacén',
        unit: '%',
        color: '#14b8a6',
        valueFormatter: (value: number) => value.toFixed(1),
      },
      {
        key: 'costPerOrder',
        title: 'Costo por pedido',
        unit: 'USD',
        color: '#8b5cf6',
        valueFormatter: (value: number) => value.toFixed(2),
      },
      {
        key: 'kmPerDrop',
        title: 'Km por drop',
        unit: 'km',
        color: '#facc15',
        valueFormatter: (value: number) => value.toFixed(1),
      },
    ],
    []
  );

  const seriesByMetric = useMemo(
    () =>
      metricConfigs.map((config) => ({
        ...config,
        data: sortedSnapshots.map<TimeSeriesPoint>((snapshot) => ({
          date: snapshot.date,
          value: snapshot[config.key] ?? null,
        })),
      })),
    [metricConfigs, sortedSnapshots]
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">
          KPIs logísticos
        </h2>
        <p className="text-sm text-slate-500">
          Registra snapshots periódicos para monitorear cumplimiento OTIF,
          productividad y costos clave.
        </p>
      </div>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-end md:justify-between">
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col text-xs font-medium uppercase tracking-wide text-slate-500">
              Desde
              <input
                type="date"
                className="mt-1 rounded border border-slate-300 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-sky-400 focus:outline-none"
                value={startDate}
                max={endDate || undefined}
                onChange={(event) => setStartDate(event.target.value)}
              />
            </label>
            <label className="flex flex-col text-xs font-medium uppercase tracking-wide text-slate-500">
              Hasta
              <input
                type="date"
                className="mt-1 rounded border border-slate-300 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-sky-400 focus:outline-none"
                value={endDate}
                min={startDate || undefined}
                onChange={(event) => setEndDate(event.target.value)}
              />
            </label>
            {(startDate || endDate) && (
              <button
                type="button"
                className="inline-flex items-center rounded border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
                onClick={clearFilters}
              >
                Limpiar
              </button>
            )}
          </div>
          {loading && (
            <span className="text-xs text-slate-500">
              Actualizando métricas…
            </span>
          )}
        </div>

        {!loading && sortedSnapshots.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
            No hay snapshots registrados en el rango seleccionado.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {seriesByMetric.map((series) => (
              <TimeSeriesChart
                key={series.key}
                title={series.title}
                unit={series.unit}
                data={series.data}
                color={series.color}
                valueFormatter={series.valueFormatter}
              />
            ))}
          </div>
        )}
      </section>

      {error && (
        <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {canEdit && !editing && (
        <form
          onSubmit={handleCreate}
          className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-slate-800">
              Nuevo snapshot
            </h3>
            {loading && (
              <span className="text-xs text-slate-500">Actualizando…</span>
            )}
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <label className="flex flex-col text-sm">
              Fecha de referencia
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
              OTIF (%)
              <input
                type="number"
                step="0.1"
                className="mt-1 rounded border px-3 py-2"
                value={form.otif}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, otif: e.target.value }))
                }
              />
            </label>
            <label className="flex flex-col text-sm">
              Picks por hora
              <input
                type="number"
                step="0.1"
                className="mt-1 rounded border px-3 py-2"
                value={form.pickPerHour}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, pickPerHour: e.target.value }))
                }
              />
            </label>
            <label className="flex flex-col text-sm">
              Exactitud inventario (%)
              <input
                type="number"
                step="0.1"
                className="mt-1 rounded border px-3 py-2"
                value={form.inventoryAccuracy}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    inventoryAccuracy: e.target.value,
                  }))
                }
              />
            </label>
            <label className="flex flex-col text-sm">
              Ocupación almacén (%)
              <input
                type="number"
                step="0.1"
                className="mt-1 rounded border px-3 py-2"
                value={form.occupancyPct}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, occupancyPct: e.target.value }))
                }
              />
            </label>
            <label className="flex flex-col text-sm">
              Costo por pedido (USD)
              <input
                type="number"
                step="0.01"
                className="mt-1 rounded border px-3 py-2"
                value={form.costPerOrder}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, costPerOrder: e.target.value }))
                }
              />
            </label>
            <label className="flex flex-col text-sm">
              Km por entrega
              <input
                type="number"
                step="0.1"
                className="mt-1 rounded border px-3 py-2"
                value={form.kmPerDrop}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, kmPerDrop: e.target.value }))
                }
              />
            </label>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white"
            >
              Registrar snapshot
            </button>
          </div>
        </form>
      )}

      {editing && canEdit && (
        <form
          onSubmit={handleUpdate}
          className="grid gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-slate-800">
              Editar snapshot
            </h3>
            <button
              type="button"
              className="text-sm text-blue-700 underline"
              onClick={resetForm}
            >
              Cancelar edición
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <label className="flex flex-col text-sm">
              Fecha de referencia
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
              OTIF (%)
              <input
                type="number"
                step="0.1"
                className="mt-1 rounded border px-3 py-2"
                value={form.otif}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, otif: e.target.value }))
                }
              />
            </label>
            <label className="flex flex-col text-sm">
              Picks por hora
              <input
                type="number"
                step="0.1"
                className="mt-1 rounded border px-3 py-2"
                value={form.pickPerHour}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, pickPerHour: e.target.value }))
                }
              />
            </label>
            <label className="flex flex-col text-sm">
              Exactitud inventario (%)
              <input
                type="number"
                step="0.1"
                className="mt-1 rounded border px-3 py-2"
                value={form.inventoryAccuracy}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    inventoryAccuracy: e.target.value,
                  }))
                }
              />
            </label>
            <label className="flex flex-col text-sm">
              Ocupación almacén (%)
              <input
                type="number"
                step="0.1"
                className="mt-1 rounded border px-3 py-2"
                value={form.occupancyPct}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, occupancyPct: e.target.value }))
                }
              />
            </label>
            <label className="flex flex-col text-sm">
              Costo por pedido (USD)
              <input
                type="number"
                step="0.01"
                className="mt-1 rounded border px-3 py-2"
                value={form.costPerOrder}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, costPerOrder: e.target.value }))
                }
              />
            </label>
            <label className="flex flex-col text-sm">
              Km por entrega
              <input
                type="number"
                step="0.1"
                className="mt-1 rounded border px-3 py-2"
                value={form.kmPerDrop}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, kmPerDrop: e.target.value }))
                }
              />
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="submit"
              className="rounded bg-blue-700 px-4 py-2 text-sm font-medium text-white"
            >
              Guardar cambios
            </button>
            <button
              type="button"
              className="rounded border border-blue-200 px-4 py-2 text-sm"
              onClick={resetForm}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {snapshots.map((snapshot) => (
          <article
            key={snapshot.id}
            className="flex h-full flex-col justify-between rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
          >
            <header className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-800">
                  Semana del {new Date(snapshot.date).toLocaleDateString()}
                </h3>
                <p className="text-xs text-slate-500">
                  Última actualización del tablero logístico.
                </p>
              </div>
              {canEdit && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="text-xs font-medium text-blue-700 hover:underline"
                    onClick={() => startEdit(snapshot)}
                  >
                    Editar
                  </button>
                  {isAdmin && (
                    <button
                      type="button"
                      className="text-xs font-medium text-red-700 hover:underline"
                      onClick={() => remove(snapshot.id)}
                    >
                      Eliminar
                    </button>
                  )}
                </div>
              )}
            </header>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600 md:grid-cols-3">
              <div>
                <dt className="font-medium text-slate-700">OTIF</dt>
                <dd>{snapshot.otif ?? '—'}%</dd>
              </div>
              <div>
                <dt className="font-medium text-slate-700">Picks/hora</dt>
                <dd>{snapshot.pickPerHour ?? '—'}</dd>
              </div>
              <div>
                <dt className="font-medium text-slate-700">
                  Exactitud inventario
                </dt>
                <dd>{snapshot.inventoryAccuracy ?? '—'}%</dd>
              </div>
              <div>
                <dt className="font-medium text-slate-700">Ocupación</dt>
                <dd>{snapshot.occupancyPct ?? '—'}%</dd>
              </div>
              <div>
                <dt className="font-medium text-slate-700">Costo por pedido</dt>
                <dd>{snapshot.costPerOrder ?? '—'} USD</dd>
              </div>
              <div>
                <dt className="font-medium text-slate-700">Km por entrega</dt>
                <dd>{snapshot.kmPerDrop ?? '—'}</dd>
              </div>
            </dl>
          </article>
        ))}
      </section>

      {snapshots.length === 0 && !loading && (
        <p className="rounded border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
          Aún no hay snapshots registrados. Comienza creando el primero para
          visualizar las métricas clave.
        </p>
      )}
    </div>
  );
}
