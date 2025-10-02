import { ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react';

import api from '../../lib/api';

const RACK_TYPES = [
  { value: 'selectivo', label: 'Selectivo', ppPerAisle: 60 },
  { value: 'doble-profundidad', label: 'Doble profundidad', ppPerAisle: 72 },
  { value: 'drive-in', label: 'Drive-In', ppPerAisle: 84 },
  { value: 'dinamico', label: 'Dinámico', ppPerAisle: 48 },
  { value: 'push-back', label: 'Push-Back', ppPerAisle: 66 },
] as const;

const DEFAULT_RACK_TYPE = RACK_TYPES[0].value;

interface LayoutPlan {
  id: string;
  filename: string;
  mime: string;
  size: number;
  createdAt: string;
  uploadedBy: string;
  dataUrl: string | null;
}

interface LayoutZoneRow {
  id: string;
  code: string;
  name: string;
  rackType: string;
  aisles: number;
  pp: number;
  updatedAt?: string;
  memoNote?: string;
}

interface LayoutApiResponse {
  plan: LayoutPlan | null;
  zones: {
    id: string;
    code: string;
    name: string;
    latestCalc: {
      id: string;
      rackType: string;
      aisles: number;
      pp: number;
      memo?: unknown;
      createdAt: string;
      updatedAt: string;
    } | null;
  }[];
  totalPP: number;
}

interface LayoutTabProps {
  projectId: string;
}

const calculatePP = (aisles: number, rackType: string) => {
  const option = RACK_TYPES.find((item) => item.value === rackType) ?? RACK_TYPES[0];
  return Math.max(0, Math.round(aisles * option.ppPerAisle));
};

const formatDateTime = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('es-CL', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

const extractMemoNote = (memo: unknown): string | undefined => {
  if (!memo || typeof memo !== 'object') {
    return undefined;
  }
  const record = memo as Record<string, unknown>;
  const note = record.notes ?? record.note ?? record.memo;
  return typeof note === 'string' ? note : undefined;
};

const LayoutTab = ({ projectId }: LayoutTabProps) => {
  const [plan, setPlan] = useState<LayoutPlan | null>(null);
  const [rows, setRows] = useState<LayoutZoneRow[]>([]);
  const [baselineTotal, setBaselineTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [memoText, setMemoText] = useState('');

  const fetchLayout = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<LayoutApiResponse>(`/layout/projects/${projectId}`);
      const data = response.data;
      setPlan(data.plan ?? null);
      setBaselineTotal(data.totalPP ?? 0);

      const mappedRows = data.zones.map<LayoutZoneRow>((zone) => {
        const rackType = zone.latestCalc?.rackType ?? DEFAULT_RACK_TYPE;
        const aisles = zone.latestCalc?.aisles ?? 0;
        const pp = zone.latestCalc?.pp ?? calculatePP(aisles, rackType);
        return {
          id: zone.id,
          code: zone.code,
          name: zone.name,
          rackType,
          aisles,
          pp,
          updatedAt: zone.latestCalc?.updatedAt ?? zone.latestCalc?.createdAt,
          memoNote: extractMemoNote(zone.latestCalc?.memo),
        };
      });

      setRows(mappedRows);
      setSuccess(null);
    } catch (err) {
      console.error('No se pudo cargar el layout', err);
      setError('No se pudo cargar la información de layout y capacidad.');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchLayout();
  }, [fetchLayout]);

  const totalWhatIf = useMemo(
    () => rows.reduce((accumulator, row) => accumulator + row.pp, 0),
    [rows],
  );

  const handleRackTypeChange = (zoneId: string, value: string) => {
    setRows((previous) =>
      previous.map((row) =>
        row.id === zoneId
          ? {
              ...row,
              rackType: value,
              pp: calculatePP(row.aisles, value),
            }
          : row,
      ),
    );
  };

  const handleAislesChange = (zoneId: string, value: string) => {
    const parsed = Number(value);
    const aisles = Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0;
    setRows((previous) =>
      previous.map((row) =>
        row.id === zoneId
          ? {
              ...row,
              aisles,
              pp: calculatePP(aisles, row.rackType),
            }
          : row,
      ),
    );
  };

  const handleMemoChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setMemoText(event.target.value);
  };

  const handlePlanUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(null);
    setSuccess(null);
    try {
      const formData = new FormData();
      formData.append('plan', file);
      await api.post(`/layout/projects/${projectId}/plan`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await fetchLayout();
    } catch (err) {
      console.error('No se pudo subir el plano', err);
      setError('No se pudo subir el plano del layout.');
    } finally {
      event.target.value = '';
    }
  };

  const handleSaveSimulation = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const payload = {
        rows: rows.map(({ id, rackType, aisles, pp }) => ({
          zoneId: id,
          rackType,
          aisles,
          pp,
        })),
        memo: memoText.trim().length > 0 ? { notes: memoText.trim() } : {},
      };
      await api.post(`/layout/projects/${projectId}/capacity`, payload);
      setSuccess('Simulación guardada correctamente.');
      setMemoText('');
      await fetchLayout();
    } catch (err) {
      console.error('No se pudo guardar la simulación de capacidad', err);
      setError('No se pudo guardar la simulación. Verifica los datos e inténtalo nuevamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Plano del layout</h2>
            <p className="text-sm text-slate-500">
              Carga una imagen del plano para utilizarla como referencia al simular capacidad.
            </p>
          </div>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50">
            <input className="hidden" type="file" accept="image/*" onChange={handlePlanUpload} />
            <span>Actualizar plano</span>
          </label>
        </div>
        <div className="mt-4 overflow-hidden rounded-md border border-dashed border-slate-300 bg-slate-50">
          {plan?.dataUrl ? (
            <img
              src={plan.dataUrl}
              alt={`Plano de layout ${plan.filename}`}
              className="h-auto w-full max-h-[480px] object-contain bg-white"
            />
          ) : (
            <div className="flex h-48 items-center justify-center text-sm text-slate-500">
              No hay un plano cargado para este proyecto.
            </div>
          )}
        </div>
        {plan ? (
          <p className="mt-2 text-xs text-slate-500">
            Última actualización: {formatDateTime(plan.createdAt)} · {plan.filename}
          </p>
        ) : null}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Capacidad por zona</h2>
            <p className="text-sm text-slate-500">
              Ajusta el tipo de rack y la cantidad de pasillos para simular posiciones de pallets (PP) por zona.
            </p>
          </div>
          <div className="text-sm text-slate-600">
            <p>PP actual registradas: <span className="font-semibold text-slate-900">{baselineTotal}</span></p>
            <p>
              PP simuladas (what-if):{' '}
              <span className="font-semibold text-indigo-600">{totalWhatIf}</span>
            </p>
          </div>
        </header>

        {error ? (
          <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>
        ) : null}
        {success ? (
          <p className="mt-4 rounded-md border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-700">{success}</p>
        ) : null}

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th scope="col" className="px-3 py-2">
                  Zona
                </th>
                <th scope="col" className="px-3 py-2">
                  Tipo de rack
                </th>
                <th scope="col" className="px-3 py-2">
                  Pasillos
                </th>
                <th scope="col" className="px-3 py-2">
                  PP simuladas
                </th>
                <th scope="col" className="px-3 py-2">
                  Última simulación
                </th>
                <th scope="col" className="px-3 py-2">
                  Nota
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-sm text-slate-500">
                    {loading ? 'Cargando zonas…' : 'No hay zonas configuradas para este proyecto.'}
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id}>
                    <td className="whitespace-nowrap px-3 py-3 font-medium text-slate-900">
                      <div className="font-semibold">{row.code}</div>
                      <div className="text-xs text-slate-500">{row.name}</div>
                    </td>
                    <td className="px-3 py-3">
                      <select
                        value={row.rackType}
                        onChange={(event) => handleRackTypeChange(row.id, event.target.value)}
                        className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        {RACK_TYPES.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-3">
                      <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        value={row.aisles}
                        onChange={(event) => handleAislesChange(row.id, event.target.value)}
                        className="mt-1 block w-24 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="px-3 py-3 text-right text-sm font-semibold text-slate-900">
                      {row.pp}
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-500">{formatDateTime(row.updatedAt)}</td>
                    <td className="px-3 py-3 text-xs text-slate-500">
                      {row.memoNote ? row.memoNote : <span className="text-slate-400">—</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[2fr,1fr]">
          <div>
            <label htmlFor="layoutMemo" className="block text-sm font-medium text-slate-700">
              Memoria de cálculo
            </label>
            <textarea
              id="layoutMemo"
              value={memoText}
              onChange={handleMemoChange}
              rows={4}
              placeholder="Describe supuestos, restricciones o notas de la simulación."
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div className="flex flex-col justify-between gap-4">
            <div className="rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              <p>
                El what-if aplica factores de PP por pasillo según el tipo de rack seleccionado. Ajusta los valores y guarda la
                simulación para registrar el total y la memoria de cálculo.
              </p>
            </div>
            <button
              type="button"
              onClick={handleSaveSimulation}
              disabled={saving || rows.length === 0}
              className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {saving ? 'Guardando…' : 'Guardar simulación'}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LayoutTab;
