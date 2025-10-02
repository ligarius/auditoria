import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from 'react';

import api from '../../lib/api';
import type { LocationItem, SkuItem, ZoneSummary } from './types';

type InventoryCountStatus = 'planned' | 'running' | 'closed';

interface InventoryTaskSummary {
  id: string;
  zone: { id: string; code: string; name: string };
  assignedTo: { id: string; name: string; email: string | null } | null;
  blind: boolean;
  scanCount: number;
  recountCount: number;
}

interface InventoryCountSummary {
  id: string;
  projectId: string;
  status: InventoryCountStatus;
  tolerancePct: number | null;
  plannedAt: string;
  startedAt: string | null;
  closedAt: string | null;
  tasks: InventoryTaskSummary[];
  totals: { tasks: number; scans: number; recounts: number; variances: number };
}

interface InventoryScanEntry {
  id: string;
  qty: number;
  finalQty: number;
  recountQty: number | null;
  capturedAt: string;
  deviceId: string | null;
  location: { id: string; codeZRNP: string; expectedQty: number | null };
  sku: { id: string; code: string; name: string } | null;
}

interface InventoryTaskDetail extends InventoryTaskSummary {
  scans: InventoryScanEntry[];
}

interface InventoryVarianceEntry {
  id: string;
  countId: string;
  expectedQty: number;
  foundQty: number;
  difference: number;
  percentage: number;
  reason: string | null;
  location: {
    id: string;
    codeZRNP: string;
    expectedQty: number | null;
    zone: { id: string; code: string; name: string };
    rack: { id: string; code: string; name: string };
  };
  sku: { id: string | null; code: string; name: string } | null;
}

interface ZoneVarianceSummary {
  zoneId: string;
  zoneCode: string;
  zoneName: string;
  varianceCount: number;
  expectedTotal: number;
  foundTotal: number;
  differenceTotal: number;
  absoluteDifference: number;
}

interface SkuVarianceSummary {
  skuId: string | null;
  skuCode: string;
  skuName: string;
  varianceCount: number;
  expectedTotal: number;
  foundTotal: number;
  differenceTotal: number;
  absoluteDifference: number;
}

interface InventoryCountDetail {
  id: string;
  projectId: string;
  status: InventoryCountStatus;
  tolerancePct: number | null;
  plannedAt: string;
  startedAt: string | null;
  closedAt: string | null;
  tasks: InventoryTaskDetail[];
  variances: InventoryVarianceEntry[];
  zoneSummary: ZoneVarianceSummary[];
  skuSummary: SkuVarianceSummary[];
}

interface Member {
  id: string;
  name: string;
  email: string | null;
}

interface BlindCountSectionProps {
  projectId: string;
  skus: SkuItem[];
  locations: LocationItem[];
  zones: ZoneSummary[];
  loadingMaster: boolean;
}

const statusLabels: Record<InventoryCountStatus, string> = {
  planned: 'Planificado',
  running: 'En curso',
  closed: 'Cerrado',
};

const statusStyles: Record<InventoryCountStatus, string> = {
  planned: 'bg-slate-100 text-slate-700',
  running: 'bg-indigo-100 text-indigo-700',
  closed: 'bg-emerald-100 text-emerald-700',
};

const formatDateTime = (value: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('es-ES');
};

const formatNumber = (value: number | null | undefined) => {
  if (value === null || value === undefined) return '—';
  return Number(value).toLocaleString('es-ES', { maximumFractionDigits: 2 });
};

const BlindCountSection = ({ projectId, skus, locations, zones, loadingMaster }: BlindCountSectionProps) => {
  const [counts, setCounts] = useState<InventoryCountSummary[]>([]);
  const [countsLoading, setCountsLoading] = useState(false);
  const [countsError, setCountsError] = useState<string | null>(null);
  const [selectedCountId, setSelectedCountId] = useState<string | null>(null);
  const [detail, setDetail] = useState<InventoryCountDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [membersError, setMembersError] = useState<string | null>(null);
  const [countForm, setCountForm] = useState({ tolerancePct: '' });
  const [creatingCount, setCreatingCount] = useState(false);
  const [updatingTolerance, setUpdatingTolerance] = useState(false);
  const [closing, setClosing] = useState(false);
  const [taskForm, setTaskForm] = useState({ zoneId: '', assignedToId: '', blind: true });
  const [addingTask, setAddingTask] = useState(false);
  const [captureTaskId, setCaptureTaskId] = useState<string | null>(null);
  const [captureForm, setCaptureForm] = useState({ locationCode: '', skuCode: '', qty: '', deviceId: '' });
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [recountDrafts, setRecountDrafts] = useState<Record<string, string>>({});
  const [recountSaving, setRecountSaving] = useState<Record<string, boolean>>({});
  const [reasonDrafts, setReasonDrafts] = useState<Record<string, string>>({});
  const [reasonSaving, setReasonSaving] = useState<Record<string, boolean>>({});
  const [downloading, setDownloading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const locationByCode = useMemo(() => {
    const map = new Map<string, LocationItem>();
    locations.forEach((location) => {
      map.set(location.codeZRNP.trim().toUpperCase(), location);
    });
    return map;
  }, [locations]);

  const skuByCode = useMemo(() => {
    const map = new Map<string, SkuItem>();
    skus.forEach((sku) => {
      map.set(sku.code.trim().toUpperCase(), sku);
    });
    return map;
  }, [skus]);

  const resetMessages = () => {
    setActionMessage(null);
    setActionError(null);
    setCaptureError(null);
  };

  const fetchCounts = useCallback(async () => {
    setCountsLoading(true);
    setCountsError(null);
    try {
      const response = await api.get<InventoryCountSummary[]>(`/inventory/counts/${projectId}`);
      const data = Array.isArray(response.data) ? response.data : [];
      setCounts(data);
      setSelectedCountId((previous) => previous ?? data[0]?.id ?? null);
    } catch (error) {
      console.error('No se pudo obtener la lista de conteos', error);
      setCountsError('No se pudieron obtener los conteos planificados.');
    } finally {
      setCountsLoading(false);
    }
  }, [projectId]);

  const fetchMembers = useCallback(async () => {
    setMembersError(null);
    try {
      const response = await api.get(`/projects/${projectId}`);
      const data = response.data as {
        memberships?: { user?: { id: string; name?: string | null; email?: string | null } }[];
      };
      const memberships = Array.isArray(data?.memberships) ? data.memberships : [];
      const parsed = memberships
        .map((membership) => membership.user)
        .filter((user): user is { id: string; name?: string | null; email?: string | null } => Boolean(user?.id))
        .map((user) => ({
          id: user.id,
          name: user.name ?? user.email ?? 'Sin nombre',
          email: user.email ?? null,
        }));
      setMembers(parsed);
    } catch (error) {
      console.error('No se pudieron obtener los miembros del proyecto', error);
      setMembersError('No se pudieron obtener los miembros para asignar tareas.');
    }
  }, [projectId]);

  const fetchDetail = useCallback(
    async (countId: string) => {
      setDetailLoading(true);
      setDetailError(null);
      try {
        const response = await api.get<InventoryCountDetail>(`/inventory/counts/${countId}/detail`);
        if (response.data) {
          setDetail(response.data);
          setCaptureTaskId((prev) => {
            if (prev && response.data.tasks.some((task) => task.id === prev)) {
              return prev;
            }
            return response.data.tasks[0]?.id ?? null;
          });
        } else {
          setDetail(null);
        }
      } catch (error) {
        console.error('No se pudo obtener el detalle del conteo', error);
        setDetailError('No se pudo obtener el detalle del conteo seleccionado.');
        setDetail(null);
      } finally {
        setDetailLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    fetchCounts();
    fetchMembers();
  }, [fetchCounts, fetchMembers]);

  useEffect(() => {
    if (selectedCountId) {
      fetchDetail(selectedCountId);
    } else {
      setDetail(null);
    }
  }, [selectedCountId, fetchDetail]);

  const handleCreateCount = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    resetMessages();
    const trimmed = countForm.tolerancePct.trim();
    let toleranceValue: number | null | undefined;
    if (trimmed.length === 0) {
      toleranceValue = undefined;
    } else {
      const parsed = Number.parseFloat(trimmed);
      if (!Number.isFinite(parsed) || parsed < 0) {
        setActionError('La tolerancia debe ser un número positivo.');
        return;
      }
      toleranceValue = parsed;
    }

    setCreatingCount(true);
    try {
      const response = await api.post<InventoryCountSummary>(`/inventory/counts/${projectId}`, {
        tolerancePct: toleranceValue ?? null,
      });
      setActionMessage('Conteo planificado correctamente.');
      setCountForm({ tolerancePct: '' });
      await fetchCounts();
      if (response.data?.id) {
        setSelectedCountId(response.data.id);
      }
    } catch (error) {
      console.error('No se pudo crear el conteo', error);
      setActionError('No se pudo planificar el conteo. Intenta nuevamente.');
    } finally {
      setCreatingCount(false);
    }
  };

  const handleUpdateTolerance = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!detail) return;
    resetMessages();
    const toleranceValue = countForm.tolerancePct.trim();
    if (toleranceValue.length === 0) {
      setActionError('Ingresa un valor para actualizar la tolerancia.');
      return;
    }
    const parsed = Number.parseFloat(toleranceValue);
    if (!Number.isFinite(parsed) || parsed < 0) {
      setActionError('La tolerancia debe ser un número positivo.');
      return;
    }

    setUpdatingTolerance(true);
    try {
      await api.patch(`/inventory/counts/${detail.id}`, { tolerancePct: parsed });
      setActionMessage('Tolerancia actualizada.');
      setCountForm({ tolerancePct: '' });
      await fetchDetail(detail.id);
      await fetchCounts();
    } catch (error) {
      console.error('No se pudo actualizar la tolerancia', error);
      setActionError('No se pudo actualizar la tolerancia del conteo.');
    } finally {
      setUpdatingTolerance(false);
    }
  };

  const handleStartCount = async () => {
    if (!detail) return;
    resetMessages();
    try {
      await api.patch(`/inventory/counts/${detail.id}`, { status: 'running' });
      setActionMessage('Conteo iniciado.');
      await fetchDetail(detail.id);
      await fetchCounts();
    } catch (error) {
      console.error('No se pudo iniciar el conteo', error);
      setActionError('No se pudo iniciar el conteo.');
    }
  };

  const handleCloseCount = async () => {
    if (!detail) return;
    resetMessages();
    setClosing(true);
    try {
      const response = await api.post<InventoryCountDetail>(`/inventory/counts/${detail.id}/close`);
      if (response.data) {
        setDetail(response.data);
      }
      setActionMessage('Conteo cerrado y variaciones calculadas.');
      await fetchCounts();
    } catch (error) {
      console.error('No se pudo cerrar el conteo', error);
      setActionError('No se pudo cerrar el conteo. Verifica que esté en curso.');
    } finally {
      setClosing(false);
    }
  };

  const handleTaskFormChange = (event: ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value, type, checked } = event.target;
    setTaskForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleAddTask = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!detail) return;
    resetMessages();
    if (!taskForm.zoneId) {
      setActionError('Selecciona una zona para crear la tarea.');
      return;
    }
    setAddingTask(true);
    try {
      await api.post(`/inventory/counts/${detail.id}/tasks`, {
        zoneId: taskForm.zoneId,
        assignedToId: taskForm.assignedToId || undefined,
        blind: taskForm.blind,
      });
      setActionMessage('Tarea asignada correctamente.');
      setTaskForm({ zoneId: '', assignedToId: '', blind: true });
      await fetchDetail(detail.id);
      await fetchCounts();
    } catch (error) {
      console.error('No se pudo crear la tarea', error);
      setActionError('No se pudo crear la tarea de conteo.');
    } finally {
      setAddingTask(false);
    }
  };

  const handleCaptureChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setCaptureForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCaptureSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!detail || !captureTaskId) {
      setCaptureError('Selecciona una tarea para registrar lecturas.');
      return;
    }
    resetMessages();
    const locationCode = captureForm.locationCode.trim().toUpperCase();
    if (!locationCode) {
      setCaptureError('Debes ingresar el código de la ubicación.');
      return;
    }
    const location = locationByCode.get(locationCode);
    if (!location) {
      setCaptureError('La ubicación indicada no existe en el maestro.');
      return;
    }

    let skuId: string | undefined;
    if (captureForm.skuCode.trim()) {
      const sku = skuByCode.get(captureForm.skuCode.trim().toUpperCase());
      if (!sku) {
        setCaptureError('El SKU indicado no existe en el maestro.');
        return;
      }
      skuId = sku.id;
    }

    const qtyValue = Number.parseFloat(captureForm.qty.replace(',', '.'));
    if (!Number.isFinite(qtyValue) || qtyValue < 0) {
      setCaptureError('La cantidad debe ser un número válido.');
      return;
    }

    setRecording(true);
    try {
      await api.post(`/inventory/counts/${detail.id}/tasks/${captureTaskId}/scans`, {
        locationId: location.id,
        skuId,
        qty: qtyValue,
        deviceId: captureForm.deviceId.trim() || undefined,
      });
      setCaptureForm({ locationCode: '', skuCode: '', qty: '', deviceId: '' });
      setActionMessage('Lectura registrada.');
      await fetchDetail(detail.id);
      await fetchCounts();
    } catch (error) {
      console.error('No se pudo registrar la lectura', error);
      setCaptureError('No se pudo registrar la lectura. Verifica el estado del conteo.');
    } finally {
      setRecording(false);
    }
  };

  const handleRecountChange = (scanId: string, value: string) => {
    setRecountDrafts((prev) => ({ ...prev, [scanId]: value }));
  };

  const handleSaveRecount = async (scanId: string) => {
    if (!detail || !captureTaskId) return;
    const targetTask = detail.tasks.find((task) => task.scans.some((scan) => scan.id === scanId));
    if (!targetTask) return;

    const draft = recountDrafts[scanId];
    const parsed = draft !== undefined ? Number.parseFloat(draft.replace(',', '.')) : NaN;
    if (!Number.isFinite(parsed) || parsed < 0) {
      setActionError('El reconteo debe ser un número válido.');
      return;
    }

    setRecountSaving((prev) => ({ ...prev, [scanId]: true }));
    try {
      await api.post(`/inventory/counts/${detail.id}/tasks/${targetTask.id}/scans/${scanId}/recount`, {
        qty2: parsed,
      });
      setActionMessage('Reconteo actualizado.');
      setRecountDrafts((prev) => ({ ...prev, [scanId]: '' }));
      await fetchDetail(detail.id);
      await fetchCounts();
    } catch (error) {
      console.error('No se pudo registrar el reconteo', error);
      setActionError('No se pudo registrar el reconteo.');
    } finally {
      setRecountSaving((prev) => ({ ...prev, [scanId]: false }));
    }
  };

  const handleReasonChange = (varianceId: string, value: string) => {
    setReasonDrafts((prev) => ({ ...prev, [varianceId]: value }));
  };

  const handleSaveReason = async (varianceId: string) => {
    if (!detail) return;
    const reason = reasonDrafts[varianceId]?.trim() ?? '';
    setReasonSaving((prev) => ({ ...prev, [varianceId]: true }));
    try {
      await api.patch(`/inventory/counts/${detail.id}/variances/${varianceId}`, {
        reason: reason.length > 0 ? reason : null,
      });
      setActionMessage('Causa actualizada.');
      await fetchDetail(detail.id);
    } catch (error) {
      console.error('No se pudo actualizar la causa', error);
      setActionError('No se pudo actualizar la causa de la variación.');
    } finally {
      setReasonSaving((prev) => ({ ...prev, [varianceId]: false }));
    }
  };

  const handleDownloadReport = async () => {
    if (!detail) return;
    setDownloading(true);
    try {
      const response = await api.get(`/inventory/counts/${detail.id}/variances/export`, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `variaciones-${detail.id}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('No se pudo descargar el reporte de variaciones', error);
      setActionError('No se pudo generar el reporte de variaciones.');
    } finally {
      setDownloading(false);
    }
  };

  const captureTask = detail?.tasks.find((task) => task.id === captureTaskId) ?? null;

  const zoneOptions = useMemo(
    () => zones.map((zone) => ({ value: zone.zoneId, label: `${zone.zoneCode} · ${zone.zoneName}` })),
    [zones],
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[320px,1fr]">
        <div className="space-y-6">
          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">Planificar conteo</h3>
            <p className="mt-1 text-xs text-slate-500">
              Define la tolerancia máxima permitida para identificar variaciones fuera de rango.
            </p>
            <form className="mt-4 space-y-3" onSubmit={handleCreateCount}>
              <div>
                <label className="text-xs font-semibold uppercase text-slate-500" htmlFor="tolerancePct">
                  Tolerancia %
                </label>
                <input
                  id="tolerancePct"
                  name="tolerancePct"
                  value={countForm.tolerancePct}
                  onChange={(event) => setCountForm((prev) => ({ ...prev, tolerancePct: event.target.value }))}
                  placeholder="Ej. 5"
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <button
                type="submit"
                className="inline-flex w-full items-center justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
                disabled={creatingCount}
              >
                {creatingCount ? 'Creando…' : 'Planificar'}
              </button>
            </form>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">Conteos programados</h3>
              <button
                type="button"
                onClick={fetchCounts}
                className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
              >
                Actualizar
              </button>
            </div>
            <div className="mt-3 space-y-2">
              {countsLoading ? (
                <p className="text-sm text-slate-500">Cargando conteos…</p>
              ) : countsError ? (
                <p className="text-sm text-rose-600">{countsError}</p>
              ) : counts.length === 0 ? (
                <p className="text-sm text-slate-500">Aún no hay conteos planificados.</p>
              ) : (
                counts.map((count) => {
                  const isActive = count.id === selectedCountId;
                  return (
                    <button
                      type="button"
                      key={count.id}
                      onClick={() => {
                        resetMessages();
                        setSelectedCountId(count.id);
                      }}
                      className={`w-full rounded-md border px-3 py-2 text-left text-sm transition ${
                        isActive
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-900 shadow-sm'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-200 hover:bg-indigo-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">{statusLabels[count.status]}</span>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[count.status]}`}>
                          {count.tolerancePct !== null ? `${count.tolerancePct}%` : 'Sin tolerancia'}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                        <span>#{count.id.slice(-6)}</span>
                        <span>{formatDateTime(count.plannedAt)}</span>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                        <span>{count.totals.tasks} tareas</span>
                        <span>{count.totals.scans} lecturas</span>
                        <span>{count.totals.variances} variaciones</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          {actionMessage && (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
              {actionMessage}
            </div>
          )}
          {actionError && (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">
              {actionError}
            </div>
          )}
          {captureError && (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-700">
              {captureError}
            </div>
          )}

          {detailLoading ? (
            <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
              Cargando detalle del conteo…
            </div>
          ) : detailError ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700 shadow-sm">
              {detailError}
            </div>
          ) : detail ? (
            <div className="space-y-6">
              <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase text-slate-500">Estado</p>
                    <p className="text-lg font-semibold text-slate-900">{statusLabels[detail.status]}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {detail.status === 'planned' && (
                      <button
                        type="button"
                        onClick={handleStartCount}
                        className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
                      >
                        Iniciar conteo
                      </button>
                    )}
                    {detail.status !== 'planned' && (
                      <button
                        type="button"
                        onClick={handleCloseCount}
                        className="inline-flex items-center rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
                        disabled={closing}
                      >
                        {closing ? 'Cerrando…' : detail.status === 'closed' ? 'Recalcular variaciones' : 'Cerrar conteo'}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleDownloadReport}
                      className="inline-flex items-center rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100"
                      disabled={downloading || detail.variances.length === 0}
                    >
                      {downloading ? 'Descargando…' : 'Descargar variaciones'}
                    </button>
                  </div>
                </div>

                <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <dt className="text-xs uppercase text-slate-500">Planificado</dt>
                    <dd className="text-sm text-slate-900">{formatDateTime(detail.plannedAt)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase text-slate-500">Inicio</dt>
                    <dd className="text-sm text-slate-900">{formatDateTime(detail.startedAt)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase text-slate-500">Cierre</dt>
                    <dd className="text-sm text-slate-900">{formatDateTime(detail.closedAt)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase text-slate-500">Tolerancia</dt>
                    <dd className="text-sm text-slate-900">
                      {detail.tolerancePct !== null ? `${detail.tolerancePct}%` : 'Sin tolerancia'}
                    </dd>
                  </div>
                </dl>

                <form className="mt-4 flex flex-wrap items-end gap-3" onSubmit={handleUpdateTolerance}>
                  <div>
                    <label className="text-xs font-semibold uppercase text-slate-500" htmlFor="toleranceUpdate">
                      Actualizar tolerancia
                    </label>
                    <input
                      id="toleranceUpdate"
                      name="tolerancePct"
                      value={countForm.tolerancePct}
                      onChange={(event) => setCountForm((prev) => ({ ...prev, tolerancePct: event.target.value }))}
                      placeholder="Ej. 5"
                      className="mt-1 w-32 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <button
                    type="submit"
                    className="inline-flex items-center rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100"
                    disabled={updatingTolerance}
                  >
                    {updatingTolerance ? 'Guardando…' : 'Actualizar'}
                  </button>
                </form>
              </section>

              <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-slate-900">Tareas asignadas</h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Controla las zonas asignadas y el estado de las lecturas.
                    </p>
                    <div className="mt-4 overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-200 text-sm">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Zona
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Asignado a
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Blind
                            </th>
                            <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Lecturas
                            </th>
                            <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Reconteos
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {detail.tasks.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="px-3 py-4 text-center text-sm text-slate-500">
                                Aún no hay tareas creadas.
                              </td>
                            </tr>
                          ) : (
                            detail.tasks.map((task) => (
                              <tr key={task.id} className={task.id === captureTaskId ? 'bg-indigo-50/60' : undefined}>
                                <td className="px-3 py-2">
                                  <div className="font-medium text-slate-900">{task.zone.code}</div>
                                  <div className="text-xs text-slate-500">{task.zone.name}</div>
                                </td>
                                <td className="px-3 py-2 text-slate-700">
                                  {task.assignedTo ? task.assignedTo.name : 'Sin asignar'}
                                </td>
                                <td className="px-3 py-2 text-slate-700">{task.blind ? 'Sí' : 'No'}</td>
                                <td className="px-3 py-2 text-right text-slate-700">{task.scanCount}</td>
                                <td className="px-3 py-2 text-right text-slate-700">{task.recountCount}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="w-full max-w-xs rounded-md border border-slate-200 bg-slate-50 p-4">
                    <h4 className="text-sm font-semibold text-slate-900">Nueva tarea</h4>
                    <form className="mt-3 space-y-3" onSubmit={handleAddTask}>
                      <div>
                        <label className="text-xs font-semibold uppercase text-slate-500" htmlFor="zoneId">
                          Zona
                        </label>
                        <select
                          id="zoneId"
                          name="zoneId"
                          value={taskForm.zoneId}
                          onChange={handleTaskFormChange}
                          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          required
                        >
                          <option value="">Selecciona una zona</option>
                          {zoneOptions.map((zone) => (
                            <option key={zone.value} value={zone.value}>
                              {zone.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-semibold uppercase text-slate-500" htmlFor="assignedToId">
                          Asignado a
                        </label>
                        <select
                          id="assignedToId"
                          name="assignedToId"
                          value={taskForm.assignedToId}
                          onChange={handleTaskFormChange}
                          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                          <option value="">Sin asignar</option>
                          {members.map((member) => (
                            <option key={member.id} value={member.id}>
                              {member.name}
                            </option>
                          ))}
                        </select>
                        {membersError && <p className="mt-1 text-xs text-rose-600">{membersError}</p>}
                      </div>
                      <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700">
                        <input
                          type="checkbox"
                          name="blind"
                          checked={taskForm.blind}
                          onChange={handleTaskFormChange}
                        />
                        Conteo ciego
                      </label>
                      <button
                        type="submit"
                        className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                        disabled={addingTask}
                      >
                        {addingTask ? 'Creando…' : 'Agregar tarea'}
                      </button>
                    </form>
                  </div>
                </div>
              </section>

              <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-900">Captura de lecturas</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Selecciona la tarea y registra lecturas por ubicación y SKU con la cantidad observada.
                </p>
                <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={handleCaptureSubmit}>
                  <div className="md:col-span-2">
                    <label className="text-xs font-semibold uppercase text-slate-500" htmlFor="captureTask">
                      Tarea
                    </label>
                    <select
                      id="captureTask"
                      value={captureTaskId ?? ''}
                      onChange={(event) => setCaptureTaskId(event.target.value || null)}
                      className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="">Selecciona una tarea</option>
                      {detail.tasks.map((task) => (
                        <option key={task.id} value={task.id}>
                          {task.zone.code} · {task.zone.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase text-slate-500" htmlFor="locationCode">
                      Ubicación (código)
                    </label>
                    <input
                      id="locationCode"
                      name="locationCode"
                      value={captureForm.locationCode}
                      onChange={handleCaptureChange}
                      placeholder="ZRNP"
                      className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      disabled={loadingMaster}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase text-slate-500" htmlFor="skuCode">
                      SKU (opcional)
                    </label>
                    <input
                      id="skuCode"
                      name="skuCode"
                      value={captureForm.skuCode}
                      onChange={handleCaptureChange}
                      placeholder="Código SKU"
                      className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      disabled={loadingMaster}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase text-slate-500" htmlFor="qty">
                      Cantidad
                    </label>
                    <input
                      id="qty"
                      name="qty"
                      value={captureForm.qty}
                      onChange={handleCaptureChange}
                      placeholder="Ej. 12"
                      className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase text-slate-500" htmlFor="deviceId">
                      Dispositivo (opcional)
                    </label>
                    <input
                      id="deviceId"
                      name="deviceId"
                      value={captureForm.deviceId}
                      onChange={handleCaptureChange}
                      placeholder="ID lector"
                      className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <button
                      type="submit"
                      className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
                      disabled={recording}
                    >
                      {recording ? 'Registrando…' : 'Registrar lectura'}
                    </button>
                  </div>
                </form>

                <div className="mt-6 overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Ubicación
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          SKU
                        </th>
                        <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Capturado
                        </th>
                        <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Final
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Reconteo
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Fecha
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {captureTask && captureTask.scans.length > 0 ? (
                        captureTask.scans.map((scan) => (
                          <tr key={scan.id}>
                            <td className="px-3 py-2">
                              <div className="font-medium text-slate-900">{scan.location.codeZRNP}</div>
                              <div className="text-xs text-slate-500">
                                Esperado: {formatNumber(scan.location.expectedQty)}
                              </div>
                            </td>
                            <td className="px-3 py-2 text-slate-700">
                              {scan.sku ? `${scan.sku.code} · ${scan.sku.name}` : 'Sin SKU'}
                            </td>
                            <td className="px-3 py-2 text-right text-slate-700">{formatNumber(scan.qty)}</td>
                            <td className="px-3 py-2 text-right text-slate-900 font-semibold">{formatNumber(scan.finalQty)}</td>
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={recountDrafts[scan.id] ?? ''}
                                  onChange={(event) => handleRecountChange(scan.id, event.target.value)}
                                  placeholder={scan.recountQty !== null ? scan.recountQty.toString() : '—'}
                                  className="w-20 rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSaveRecount(scan.id)}
                                  className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100"
                                  disabled={recountSaving[scan.id]}
                                >
                                  {recountSaving[scan.id] ? 'Guardando…' : 'Guardar'}
                                </button>
                              </div>
                            </td>
                            <td className="px-3 py-2 text-slate-500">
                              {formatDateTime(scan.capturedAt)}
                              {scan.deviceId && <div className="text-xs">Equipo: {scan.deviceId}</div>}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="px-3 py-4 text-center text-sm text-slate-500">
                            Selecciona una tarea con lecturas para visualizar el detalle.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-slate-900">Variaciones detectadas</h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Identifica las ubicaciones fuera de tolerancia y registra la causa de la variación.
                    </p>
                    <div className="mt-4 overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-200 text-sm">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Ubicación
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                              SKU
                            </th>
                            <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Esperado
                            </th>
                            <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Encontrado
                            </th>
                            <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Diferencia
                            </th>
                            <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                              %
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Causa
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {detail.variances.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="px-3 py-4 text-center text-sm text-slate-500">
                                No hay variaciones registradas para este conteo.
                              </td>
                            </tr>
                          ) : (
                            detail.variances.map((variance) => (
                              <tr key={variance.id}>
                                <td className="px-3 py-2">
                                  <div className="font-medium text-slate-900">{variance.location.codeZRNP}</div>
                                  <div className="text-xs text-slate-500">Zona {variance.location.zone.code}</div>
                                </td>
                                <td className="px-3 py-2 text-slate-700">
                                  {variance.sku ? `${variance.sku.code} · ${variance.sku.name}` : 'Sin SKU'}
                                </td>
                                <td className="px-3 py-2 text-right text-slate-700">{formatNumber(variance.expectedQty)}</td>
                                <td className="px-3 py-2 text-right text-slate-900 font-semibold">{formatNumber(variance.foundQty)}</td>
                                <td className="px-3 py-2 text-right text-slate-700">{formatNumber(variance.difference)}</td>
                                <td className="px-3 py-2 text-right text-slate-700">{formatNumber(variance.percentage)}%</td>
                                <td className="px-3 py-2">
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="text"
                                      value={reasonDrafts[variance.id] ?? variance.reason ?? ''}
                                      onChange={(event) => handleReasonChange(variance.id, event.target.value)}
                                      placeholder="Describe la causa"
                                      className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleSaveReason(variance.id)}
                                      className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100"
                                      disabled={reasonSaving[variance.id]}
                                    >
                                      {reasonSaving[variance.id] ? 'Guardando…' : 'Guardar'}
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="w-full max-w-xs space-y-4">
                    <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
                      <h4 className="text-sm font-semibold text-slate-900">Resumen por zona</h4>
                      <ul className="mt-3 space-y-2 text-xs text-slate-600">
                        {detail.zoneSummary.length === 0 ? (
                          <li>Sin variaciones registradas.</li>
                        ) : (
                          detail.zoneSummary.map((zone) => (
                            <li key={zone.zoneId} className="flex items-center justify-between">
                              <span>
                                {zone.zoneCode} · {zone.zoneName}
                              </span>
                              <span>
                                {formatNumber(zone.differenceTotal)} ({zone.varianceCount})
                              </span>
                            </li>
                          ))
                        )}
                      </ul>
                    </div>
                    <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
                      <h4 className="text-sm font-semibold text-slate-900">Resumen por SKU</h4>
                      <ul className="mt-3 space-y-2 text-xs text-slate-600">
                        {detail.skuSummary.length === 0 ? (
                          <li>Sin variaciones registradas.</li>
                        ) : (
                          detail.skuSummary.map((sku) => (
                            <li key={sku.skuId ?? 'none'} className="flex items-center justify-between">
                              <span>{sku.skuCode}</span>
                              <span>
                                {formatNumber(sku.differenceTotal)} ({sku.varianceCount})
                              </span>
                            </li>
                          ))
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          ) : (
            <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
              Selecciona un conteo para ver el detalle.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BlindCountSection;
