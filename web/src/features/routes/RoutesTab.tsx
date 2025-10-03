import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BadgeCheck,
  CheckCircle2,
  Copy,
  Download,
  Plus,
  Save,
  Trash2,
} from 'lucide-react';

import api from '../../lib/api';
import { downloadModuleReport } from '../../lib/reports';

type RoutePlanStatus = 'draft' | 'optimizing' | 'completed';

interface ApiRouteStop {
  id: string;
  client: string;
  windowStart: string | null;
  windowEnd: string | null;
  demandVol: number | null;
  demandKg: number | null;
  sequence: number | null;
  notes: string | null;
}

interface ApiVehicle {
  id: string;
  carrierId: string | null;
  name: string;
  capacity: number;
  costKm: number;
  fixed: number;
}

interface ApiTariff {
  id: string;
  carrierId: string | null;
  fromClient: string;
  toClient: string;
  distanceKm: number | null;
  cost: number;
}

interface ApiRoutePlan {
  id: string;
  projectId: string;
  carrierId: string | null;
  carrier?: { id: string; name: string } | null;
  scenario: string;
  status: RoutePlanStatus;
  approved: boolean;
  notes: string | null;
  stops: ApiRouteStop[];
  vehicles: ApiVehicle[];
  tariffs: ApiTariff[];
}

interface EditableStop {
  id?: string;
  client: string;
  windowStart: string;
  windowEnd: string;
  demandVol: string;
  demandKg: string;
  sequence?: number | null;
  notes?: string;
}

interface EditableVehicle {
  id?: string;
  carrierId?: string | null;
  name: string;
  capacity: string;
  costKm: string;
  fixed: string;
}

interface EditableTariff {
  id?: string;
  carrierId?: string | null;
  fromClient: string;
  toClient: string;
  distanceKm: string;
  cost: string;
}

interface EditablePlan {
  id: string;
  projectId: string;
  carrierId: string | null;
  scenario: string;
  status: RoutePlanStatus;
  approved: boolean;
  notes: string;
  stops: EditableStop[];
  vehicles: EditableVehicle[];
  tariffs: EditableTariff[];
  carrierName?: string | null;
}

const STATUS_OPTIONS: { value: RoutePlanStatus; label: string }[] = [
  { value: 'draft', label: 'Borrador' },
  { value: 'optimizing', label: 'En optimización' },
  { value: 'completed', label: 'Completado' },
];

const emptyStop = (): EditableStop => ({
  client: '',
  windowStart: '',
  windowEnd: '',
  demandVol: '',
  demandKg: '',
  sequence: null,
  notes: '',
});

const emptyVehicle = (): EditableVehicle => ({
  name: '',
  capacity: '',
  costKm: '',
  fixed: '',
});

const emptyTariff = (): EditableTariff => ({
  fromClient: '',
  toClient: '',
  distanceKm: '',
  cost: '',
});

const toInputDate = (value: string | null) =>
  value ? new Date(value).toISOString().slice(0, 16) : '';

const numberToString = (value: number | null | undefined) =>
  value === null || value === undefined || Number.isNaN(value)
    ? ''
    : String(value);

const toEditablePlan = (plan: ApiRoutePlan): EditablePlan => ({
  id: plan.id,
  projectId: plan.projectId,
  carrierId: plan.carrierId,
  scenario: plan.scenario,
  status: plan.status,
  approved: plan.approved,
  notes: plan.notes ?? '',
  carrierName: plan.carrier?.name,
  stops: plan.stops.map((stop) => ({
    id: stop.id,
    client: stop.client,
    windowStart: toInputDate(stop.windowStart),
    windowEnd: toInputDate(stop.windowEnd),
    demandVol: numberToString(stop.demandVol),
    demandKg: numberToString(stop.demandKg),
    sequence: stop.sequence,
    notes: stop.notes ?? '',
  })),
  vehicles: plan.vehicles.map((vehicle) => ({
    id: vehicle.id,
    carrierId: vehicle.carrierId,
    name: vehicle.name,
    capacity: numberToString(vehicle.capacity),
    costKm: numberToString(vehicle.costKm),
    fixed: numberToString(vehicle.fixed),
  })),
  tariffs: plan.tariffs.map((tariff) => ({
    id: tariff.id,
    carrierId: tariff.carrierId,
    fromClient: tariff.fromClient,
    toClient: tariff.toClient,
    distanceKm: numberToString(tariff.distanceKm),
    cost: numberToString(tariff.cost),
  })),
});

const parseNumberOrNull = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseDateOrNull = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const labelForStatus = (status: RoutePlanStatus) =>
  STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status;

interface RoutesTabProps {
  projectId: string;
}

const RoutesTab = ({ projectId }: RoutesTabProps) => {
  const [plans, setPlans] = useState<ApiRoutePlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [editingPlan, setEditingPlan] = useState<EditablePlan | null>(null);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [downloadingReport, setDownloadingReport] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  const loadPlans = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<ApiRoutePlan[]>('/routes/plans', {
        params: { projectId },
      });
      const data = Array.isArray(response.data) ? response.data : [];
      setPlans(data);
      if (data.length > 0) {
        const targetId =
          selectedPlanId && data.some((plan) => plan.id === selectedPlanId)
            ? selectedPlanId
            : data[0].id;
        setSelectedPlanId(targetId);
        const targetPlan = data.find((plan) => plan.id === targetId) ?? null;
        setEditingPlan(targetPlan ? toEditablePlan(targetPlan) : null);
      } else {
        setSelectedPlanId(null);
        setEditingPlan(null);
      }
    } catch (err) {
      console.error('No se pudieron cargar los planes de ruta', err);
      setError('No se pudieron cargar los escenarios de rutas.');
    } finally {
      setLoading(false);
    }
  }, [projectId, selectedPlanId]);

  useEffect(() => {
    loadPlans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  useEffect(() => {
    if (!selectedPlanId) {
      setEditingPlan(null);
      return;
    }
    const plan = plans.find((item) => item.id === selectedPlanId);
    setEditingPlan(plan ? toEditablePlan(plan) : null);
  }, [plans, selectedPlanId]);

  const handleSelectPlan = (planId: string) => {
    setSelectedPlanId(planId);
    const plan = plans.find((item) => item.id === planId);
    setEditingPlan(plan ? toEditablePlan(plan) : null);
  };

  const handleCreatePlan = async () => {
    setCreating(true);
    setError(null);
    try {
      const baseName = `Escenario ${plans.length + 1}`;
      const response = await api.post<ApiRoutePlan>('/routes/plans', {
        projectId,
        scenario: baseName,
        status: 'draft',
        approved: false,
        notes: '',
        stops: [],
        vehicles: [],
        tariffs: [],
      });
      const created = response.data;
      setPlans((prev) => [...prev, created]);
      setSelectedPlanId(created.id);
      setEditingPlan(toEditablePlan(created));
      setSuccessMessage('Escenario creado correctamente.');
    } catch (err) {
      console.error('No se pudo crear el escenario', err);
      setError('No se pudo crear el nuevo escenario de rutas.');
    } finally {
      setCreating(false);
    }
  };

  const handleDuplicatePlan = async (planId: string) => {
    setError(null);
    try {
      const response = await api.post<ApiRoutePlan>(
        `/routes/plans/${planId}/duplicate`
      );
      const duplicated = response.data;
      setPlans((prev) => [...prev, duplicated]);
      setSelectedPlanId(duplicated.id);
      setEditingPlan(toEditablePlan(duplicated));
      setSuccessMessage('Escenario duplicado.');
    } catch (err) {
      console.error('No se pudo duplicar el escenario', err);
      setError('No se pudo duplicar el escenario seleccionado.');
    }
  };

  const handleDeletePlan = async (planId: string) => {
    if (
      !window.confirm(
        '¿Eliminar este escenario de rutas? Esta acción no se puede deshacer.'
      )
    ) {
      return;
    }
    setError(null);
    try {
      await api.delete(`/routes/plans/${planId}`);
      const remaining = plans.filter((plan) => plan.id !== planId);
      setPlans(remaining);
      if (remaining.length > 0) {
        setSelectedPlanId(remaining[0].id);
        setEditingPlan(toEditablePlan(remaining[0]));
      } else {
        setSelectedPlanId(null);
        setEditingPlan(null);
      }
      setSuccessMessage('Escenario eliminado.');
    } catch (err) {
      console.error('No se pudo eliminar el escenario', err);
      setError('No se pudo eliminar el escenario.');
    }
  };

  const handleSavePlan = async () => {
    if (!editingPlan) return;
    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const payload = {
        scenario: editingPlan.scenario,
        status: editingPlan.status,
        approved: editingPlan.approved,
        notes: editingPlan.notes || null,
        stops: editingPlan.stops.map((stop, index) => ({
          id: stop.id,
          client: stop.client,
          windowStart: parseDateOrNull(stop.windowStart),
          windowEnd: parseDateOrNull(stop.windowEnd),
          demandVol: parseNumberOrNull(stop.demandVol),
          demandKg: parseNumberOrNull(stop.demandKg),
          sequence: stop.sequence ?? index,
          notes: stop.notes || null,
        })),
        vehicles: editingPlan.vehicles.map((vehicle) => ({
          id: vehicle.id,
          carrierId: vehicle.carrierId ?? editingPlan.carrierId,
          name: vehicle.name,
          capacity: parseNumberOrNull(vehicle.capacity) ?? 0,
          costKm: parseNumberOrNull(vehicle.costKm) ?? 0,
          fixed: parseNumberOrNull(vehicle.fixed) ?? 0,
        })),
        tariffs: editingPlan.tariffs.map((tariff) => ({
          id: tariff.id,
          carrierId: tariff.carrierId ?? editingPlan.carrierId,
          fromClient: tariff.fromClient,
          toClient: tariff.toClient,
          distanceKm: parseNumberOrNull(tariff.distanceKm),
          cost: parseNumberOrNull(tariff.cost) ?? 0,
        })),
      };

      const response = await api.put<ApiRoutePlan>(
        `/routes/plans/${editingPlan.id}`,
        payload
      );
      const updated = response.data;
      setPlans((prev) =>
        prev.map((plan) => (plan.id === updated.id ? updated : plan))
      );
      setEditingPlan(toEditablePlan(updated));
      setSuccessMessage('Escenario actualizado correctamente.');
    } catch (err) {
      console.error('No se pudo guardar el escenario', err);
      setError('No se pudieron guardar los cambios.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleApproved = async () => {
    if (!editingPlan) return;
    setSaving(true);
    setError(null);
    try {
      const response = await api.put<ApiRoutePlan>(
        `/routes/plans/${editingPlan.id}`,
        {
          approved: !editingPlan.approved,
        }
      );
      const updated = response.data;
      setPlans((prev) =>
        prev.map((plan) => (plan.id === updated.id ? updated : plan))
      );
      setEditingPlan(toEditablePlan(updated));
      setSuccessMessage(
        updated.approved
          ? 'Escenario aprobado.'
          : 'Escenario marcado como pendiente.'
      );
    } catch (err) {
      console.error('No se pudo actualizar el estado de aprobación', err);
      setError('No se pudo actualizar el estado aprobado del escenario.');
    } finally {
      setSaving(false);
    }
  };

  const handleExportExcel = async () => {
    if (!selectedPlanId || !editingPlan) return;
    setExporting(true);
    setError(null);
    try {
      const response = await api.get(`/routes/export/excel`, {
        params: { planId: selectedPlanId },
        responseType: 'blob',
      });
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      const safeScenario = editingPlan.scenario
        .replace(/[^a-z0-9]+/gi, '-')
        .toLowerCase();
      anchor.download = `vrp-${projectId}-${safeScenario || 'escenario'}.xlsx`;
      anchor.click();
      URL.revokeObjectURL(url);
      setSuccessMessage('Archivo Excel generado.');
    } catch (err) {
      console.error('No se pudo exportar el escenario', err);
      setError('No se pudo exportar el escenario a Excel.');
    } finally {
      setExporting(false);
    }
  };

  const totals = useMemo(() => {
    if (!editingPlan) {
      return {
        totalStops: 0,
        totalVehicles: 0,
        totalTariffs: 0,
        totalDemandVol: 0,
        totalDemandKg: 0,
        totalFixedCost: 0,
        totalTariffCost: 0,
      };
    }

    const totalDemandVol = editingPlan.stops.reduce((acc, stop) => {
      const value = parseNumberOrNull(stop.demandVol);
      return acc + (value ?? 0);
    }, 0);

    const totalDemandKg = editingPlan.stops.reduce((acc, stop) => {
      const value = parseNumberOrNull(stop.demandKg);
      return acc + (value ?? 0);
    }, 0);

    const totalFixedCost = editingPlan.vehicles.reduce((acc, vehicle) => {
      const value = parseNumberOrNull(vehicle.fixed);
      return acc + (value ?? 0);
    }, 0);

    const totalTariffCost = editingPlan.tariffs.reduce((acc, tariff) => {
      const value = parseNumberOrNull(tariff.cost);
      return acc + (value ?? 0);
    }, 0);

    return {
      totalStops: editingPlan.stops.length,
      totalVehicles: editingPlan.vehicles.length,
      totalTariffs: editingPlan.tariffs.length,
      totalDemandVol,
      totalDemandKg,
      totalFixedCost,
      totalTariffCost,
    };
  }, [editingPlan]);

  const handleDownloadReport = async () => {
    setReportError(null);
    setDownloadingReport(true);
    try {
      await downloadModuleReport(projectId, 'rutas', 'rutas');
    } catch (downloadException) {
      console.error(
        'No se pudo descargar el informe de rutas',
        downloadException
      );
      setReportError(
        'No se pudo descargar el informe de rutas. Intenta nuevamente.'
      );
    } finally {
      setDownloadingReport(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Informe de rutas
            </h2>
            <p className="text-sm text-slate-500">
              Genera un PDF con los escenarios planificados, demanda cubierta y
              costos asociados.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
            {reportError ? (
              <span className="text-sm text-red-600">{reportError}</span>
            ) : null}
            <button
              type="button"
              onClick={handleDownloadReport}
              disabled={downloadingReport}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
            >
              <Download className="h-4 w-4" />
              {downloadingReport ? 'Generando…' : 'Descargar informe PDF'}
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-6">
        <aside className="w-64 flex-shrink-0 space-y-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-700">
                Escenarios
              </h2>
              <button
                type="button"
                onClick={handleCreatePlan}
                disabled={creating}
                className="inline-flex items-center gap-1 rounded-md bg-slate-900 px-2 py-1 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-60"
              >
                <Plus className="h-4 w-4" />
                Nuevo
              </button>
            </div>
            {loading ? (
              <p className="text-xs text-slate-500">Cargando escenarios…</p>
            ) : plans.length === 0 ? (
              <p className="text-xs text-slate-500">
                Aún no hay escenarios de rutas.
              </p>
            ) : (
              <ul className="space-y-2">
                {plans.map((plan) => {
                  const isActive = plan.id === selectedPlanId;
                  return (
                    <li key={plan.id}>
                      <button
                        type="button"
                        onClick={() => handleSelectPlan(plan.id)}
                        className={`w-full rounded-md border px-3 py-2 text-left text-sm transition ${
                          isActive
                            ? 'border-slate-900 bg-slate-900/90 text-white shadow'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <span className="font-medium">{plan.scenario}</span>
                          {plan.approved ? (
                            <BadgeCheck className="h-4 w-4 text-emerald-400" />
                          ) : null}
                        </div>
                        <p
                          className={`text-xs ${isActive ? 'text-slate-100/80' : 'text-slate-500'}`}
                        >
                          {labelForStatus(plan.status)}
                        </p>
                        <div className="mt-2 flex gap-2 text-xs">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleDuplicatePlan(plan.id);
                            }}
                            className={`inline-flex items-center gap-1 rounded border px-2 py-1 transition ${
                              isActive
                                ? 'border-white/40 text-white hover:bg-white/10'
                                : 'border-slate-200 text-slate-600 hover:border-slate-300'
                            }`}
                          >
                            <Copy className="h-3.5 w-3.5" /> Duplicar
                          </button>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleDeletePlan(plan.id);
                            }}
                            className={`inline-flex items-center gap-1 rounded border px-2 py-1 transition ${
                              isActive
                                ? 'border-red-200 text-red-50 hover:bg-red-500/20'
                                : 'border-red-200 text-red-600 hover:border-red-300'
                            }`}
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Eliminar
                          </button>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          {error ? <p className="text-xs text-red-600">{error}</p> : null}
          {successMessage ? (
            <p className="text-xs text-emerald-600">{successMessage}</p>
          ) : null}
        </aside>

        <section className="flex-1 space-y-6">
          {editingPlan ? (
            <div className="space-y-6">
              <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Escenario
                      </label>
                      <input
                        type="text"
                        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-slate-500 focus:outline-none"
                        value={editingPlan.scenario}
                        onChange={(event) =>
                          setEditingPlan((prev) =>
                            prev
                              ? { ...prev, scenario: event.target.value }
                              : prev
                          )
                        }
                      />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Estado
                        </label>
                        <select
                          value={editingPlan.status}
                          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-slate-500 focus:outline-none"
                          onChange={(event) =>
                            setEditingPlan((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    status: event.target
                                      .value as RoutePlanStatus,
                                  }
                                : prev
                            )
                          }
                        >
                          {STATUS_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Transportista
                        </label>
                        <input
                          type="text"
                          className="mt-1 w-full cursor-not-allowed rounded-md border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-500"
                          value={editingPlan.carrierName ?? 'No asignado'}
                          readOnly
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Notas
                      </label>
                      <textarea
                        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-slate-500 focus:outline-none"
                        rows={3}
                        value={editingPlan.notes}
                        onChange={(event) =>
                          setEditingPlan((prev) =>
                            prev ? { ...prev, notes: event.target.value } : prev
                          )
                        }
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={handleToggleApproved}
                      disabled={saving}
                      className={`inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition ${
                        editingPlan.approved
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      {editingPlan.approved
                        ? 'Escenario aprobado'
                        : 'Marcar como aprobado'}
                    </button>
                    <button
                      type="button"
                      onClick={handleExportExcel}
                      disabled={exporting}
                      className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                    >
                      <Download className="h-4 w-4" /> Exportar Excel
                    </button>
                    <button
                      type="button"
                      onClick={handleSavePlan}
                      disabled={saving}
                      className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
                    >
                      <Save className="h-4 w-4" /> Guardar cambios
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="mb-4 text-lg font-semibold text-slate-800">
                    Clientes y ventanas
                  </h3>
                  <div className="space-y-3">
                    {editingPlan.stops.map((stop, index) => (
                      <div
                        key={stop.id ?? index}
                        className="rounded-md border border-slate-200 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 space-y-3">
                            <div className="grid gap-3 sm:grid-cols-2">
                              <div>
                                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                  Cliente
                                </label>
                                <input
                                  type="text"
                                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-slate-500 focus:outline-none"
                                  value={stop.client}
                                  onChange={(event) =>
                                    setEditingPlan((prev) => {
                                      if (!prev) return prev;
                                      const updatedStops = [...prev.stops];
                                      updatedStops[index] = {
                                        ...updatedStops[index],
                                        client: event.target.value,
                                      };
                                      return { ...prev, stops: updatedStops };
                                    })
                                  }
                                />
                              </div>
                              <div>
                                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                  Orden de visita
                                </label>
                                <input
                                  type="number"
                                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-slate-500 focus:outline-none"
                                  value={stop.sequence ?? ''}
                                  onChange={(event) =>
                                    setEditingPlan((prev) => {
                                      if (!prev) return prev;
                                      const updatedStops = [...prev.stops];
                                      updatedStops[index] = {
                                        ...updatedStops[index],
                                        sequence:
                                          event.target.value === ''
                                            ? null
                                            : Number(event.target.value),
                                      };
                                      return { ...prev, stops: updatedStops };
                                    })
                                  }
                                />
                              </div>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2">
                              <div>
                                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                  Ventana inicio
                                </label>
                                <input
                                  type="datetime-local"
                                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-slate-500 focus:outline-none"
                                  value={stop.windowStart}
                                  onChange={(event) =>
                                    setEditingPlan((prev) => {
                                      if (!prev) return prev;
                                      const updatedStops = [...prev.stops];
                                      updatedStops[index] = {
                                        ...updatedStops[index],
                                        windowStart: event.target.value,
                                      };
                                      return { ...prev, stops: updatedStops };
                                    })
                                  }
                                />
                              </div>
                              <div>
                                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                  Ventana fin
                                </label>
                                <input
                                  type="datetime-local"
                                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-slate-500 focus:outline-none"
                                  value={stop.windowEnd}
                                  onChange={(event) =>
                                    setEditingPlan((prev) => {
                                      if (!prev) return prev;
                                      const updatedStops = [...prev.stops];
                                      updatedStops[index] = {
                                        ...updatedStops[index],
                                        windowEnd: event.target.value,
                                      };
                                      return { ...prev, stops: updatedStops };
                                    })
                                  }
                                />
                              </div>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2">
                              <div>
                                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                  Demanda volumen (m³)
                                </label>
                                <input
                                  type="number"
                                  step="0.01"
                                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-slate-500 focus:outline-none"
                                  value={stop.demandVol}
                                  onChange={(event) =>
                                    setEditingPlan((prev) => {
                                      if (!prev) return prev;
                                      const updatedStops = [...prev.stops];
                                      updatedStops[index] = {
                                        ...updatedStops[index],
                                        demandVol: event.target.value,
                                      };
                                      return { ...prev, stops: updatedStops };
                                    })
                                  }
                                />
                              </div>
                              <div>
                                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                  Demanda peso (kg)
                                </label>
                                <input
                                  type="number"
                                  step="0.01"
                                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-slate-500 focus:outline-none"
                                  value={stop.demandKg}
                                  onChange={(event) =>
                                    setEditingPlan((prev) => {
                                      if (!prev) return prev;
                                      const updatedStops = [...prev.stops];
                                      updatedStops[index] = {
                                        ...updatedStops[index],
                                        demandKg: event.target.value,
                                      };
                                      return { ...prev, stops: updatedStops };
                                    })
                                  }
                                />
                              </div>
                            </div>
                            <div>
                              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Notas
                              </label>
                              <textarea
                                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-slate-500 focus:outline-none"
                                rows={2}
                                value={stop.notes ?? ''}
                                onChange={(event) =>
                                  setEditingPlan((prev) => {
                                    if (!prev) return prev;
                                    const updatedStops = [...prev.stops];
                                    updatedStops[index] = {
                                      ...updatedStops[index],
                                      notes: event.target.value,
                                    };
                                    return { ...prev, stops: updatedStops };
                                  })
                                }
                              />
                            </div>
                          </div>
                          <button
                            type="button"
                            className="rounded-md border border-red-200 p-2 text-red-500 hover:bg-red-50"
                            onClick={() =>
                              setEditingPlan((prev) => {
                                if (!prev) return prev;
                                const updatedStops = prev.stops.filter(
                                  (_, idx) => idx !== index
                                );
                                return { ...prev, stops: updatedStops };
                              })
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setEditingPlan((prev) =>
                        prev
                          ? { ...prev, stops: [...prev.stops, emptyStop()] }
                          : prev
                      )
                    }
                    className="mt-4 inline-flex items-center gap-2 rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <Plus className="h-4 w-4" /> Agregar cliente
                  </button>
                </div>

                <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="mb-4 text-lg font-semibold text-slate-800">
                    Vehículos
                  </h3>
                  <div className="space-y-3">
                    {editingPlan.vehicles.map((vehicle, index) => (
                      <div
                        key={vehicle.id ?? index}
                        className="rounded-md border border-slate-200 p-4"
                      >
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Nombre
                            </label>
                            <input
                              type="text"
                              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-slate-500 focus:outline-none"
                              value={vehicle.name}
                              onChange={(event) =>
                                setEditingPlan((prev) => {
                                  if (!prev) return prev;
                                  const updatedVehicles = [...prev.vehicles];
                                  updatedVehicles[index] = {
                                    ...updatedVehicles[index],
                                    name: event.target.value,
                                  };
                                  return { ...prev, vehicles: updatedVehicles };
                                })
                              }
                            />
                          </div>
                          <div>
                            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Capacidad (m³)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-slate-500 focus:outline-none"
                              value={vehicle.capacity}
                              onChange={(event) =>
                                setEditingPlan((prev) => {
                                  if (!prev) return prev;
                                  const updatedVehicles = [...prev.vehicles];
                                  updatedVehicles[index] = {
                                    ...updatedVehicles[index],
                                    capacity: event.target.value,
                                  };
                                  return { ...prev, vehicles: updatedVehicles };
                                })
                              }
                            />
                          </div>
                          <div>
                            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Costo por km
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-slate-500 focus:outline-none"
                              value={vehicle.costKm}
                              onChange={(event) =>
                                setEditingPlan((prev) => {
                                  if (!prev) return prev;
                                  const updatedVehicles = [...prev.vehicles];
                                  updatedVehicles[index] = {
                                    ...updatedVehicles[index],
                                    costKm: event.target.value,
                                  };
                                  return { ...prev, vehicles: updatedVehicles };
                                })
                              }
                            />
                          </div>
                          <div>
                            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Costo fijo
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-slate-500 focus:outline-none"
                              value={vehicle.fixed}
                              onChange={(event) =>
                                setEditingPlan((prev) => {
                                  if (!prev) return prev;
                                  const updatedVehicles = [...prev.vehicles];
                                  updatedVehicles[index] = {
                                    ...updatedVehicles[index],
                                    fixed: event.target.value,
                                  };
                                  return { ...prev, vehicles: updatedVehicles };
                                })
                              }
                            />
                          </div>
                        </div>
                        <div className="mt-3 text-right">
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 rounded-md border border-red-200 px-3 py-1.5 text-sm text-red-500 hover:bg-red-50"
                            onClick={() =>
                              setEditingPlan((prev) => {
                                if (!prev) return prev;
                                const updatedVehicles = prev.vehicles.filter(
                                  (_, idx) => idx !== index
                                );
                                return { ...prev, vehicles: updatedVehicles };
                              })
                            }
                          >
                            <Trash2 className="h-4 w-4" /> Quitar vehículo
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setEditingPlan((prev) =>
                        prev
                          ? {
                              ...prev,
                              vehicles: [...prev.vehicles, emptyVehicle()],
                            }
                          : prev
                      )
                    }
                    className="mt-4 inline-flex items-center gap-2 rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <Plus className="h-4 w-4" /> Agregar vehículo
                  </button>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-800">
                      Costos logísticos
                    </h3>
                    <p className="text-sm text-slate-500">
                      Define las tarifas de viaje para construir la matriz de
                      costos del solver.
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  {editingPlan.tariffs.map((tariff, index) => (
                    <div
                      key={tariff.id ?? index}
                      className="rounded-md border border-slate-200 p-4"
                    >
                      <div className="grid gap-3 md:grid-cols-4">
                        <div className="md:col-span-2">
                          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Cliente origen
                          </label>
                          <input
                            type="text"
                            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-slate-500 focus:outline-none"
                            value={tariff.fromClient}
                            onChange={(event) =>
                              setEditingPlan((prev) => {
                                if (!prev) return prev;
                                const updatedTariffs = [...prev.tariffs];
                                updatedTariffs[index] = {
                                  ...updatedTariffs[index],
                                  fromClient: event.target.value,
                                };
                                return { ...prev, tariffs: updatedTariffs };
                              })
                            }
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Cliente destino
                          </label>
                          <input
                            type="text"
                            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-slate-500 focus:outline-none"
                            value={tariff.toClient}
                            onChange={(event) =>
                              setEditingPlan((prev) => {
                                if (!prev) return prev;
                                const updatedTariffs = [...prev.tariffs];
                                updatedTariffs[index] = {
                                  ...updatedTariffs[index],
                                  toClient: event.target.value,
                                };
                                return { ...prev, tariffs: updatedTariffs };
                              })
                            }
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Distancia (km)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-slate-500 focus:outline-none"
                            value={tariff.distanceKm}
                            onChange={(event) =>
                              setEditingPlan((prev) => {
                                if (!prev) return prev;
                                const updatedTariffs = [...prev.tariffs];
                                updatedTariffs[index] = {
                                  ...updatedTariffs[index],
                                  distanceKm: event.target.value,
                                };
                                return { ...prev, tariffs: updatedTariffs };
                              })
                            }
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Costo (USD)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-slate-500 focus:outline-none"
                            value={tariff.cost}
                            onChange={(event) =>
                              setEditingPlan((prev) => {
                                if (!prev) return prev;
                                const updatedTariffs = [...prev.tariffs];
                                updatedTariffs[index] = {
                                  ...updatedTariffs[index],
                                  cost: event.target.value,
                                };
                                return { ...prev, tariffs: updatedTariffs };
                              })
                            }
                          />
                        </div>
                      </div>
                      <div className="mt-3 text-right">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-md border border-red-200 px-3 py-1.5 text-sm text-red-500 hover:bg-red-50"
                          onClick={() =>
                            setEditingPlan((prev) => {
                              if (!prev) return prev;
                              const updatedTariffs = prev.tariffs.filter(
                                (_, idx) => idx !== index
                              );
                              return { ...prev, tariffs: updatedTariffs };
                            })
                          }
                        >
                          <Trash2 className="h-4 w-4" /> Quitar tarifa
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setEditingPlan((prev) =>
                      prev
                        ? { ...prev, tariffs: [...prev.tariffs, emptyTariff()] }
                        : prev
                    )
                  }
                  className="mt-4 inline-flex items-center gap-2 rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <Plus className="h-4 w-4" /> Agregar tarifa
                </button>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-800">
                  Resumen de capacidad y costos
                </h3>
                <dl className="mt-4 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-md border border-slate-200 p-4">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Clientes
                    </dt>
                    <dd className="text-2xl font-semibold text-slate-800">
                      {totals.totalStops}
                    </dd>
                    <p className="text-xs text-slate-500">
                      Ventanas registradas
                    </p>
                  </div>
                  <div className="rounded-md border border-slate-200 p-4">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Vehículos
                    </dt>
                    <dd className="text-2xl font-semibold text-slate-800">
                      {totals.totalVehicles}
                    </dd>
                    <p className="text-xs text-slate-500">Flota disponible</p>
                  </div>
                  <div className="rounded-md border border-slate-200 p-4">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Tarifas
                    </dt>
                    <dd className="text-2xl font-semibold text-slate-800">
                      {totals.totalTariffs}
                    </dd>
                    <p className="text-xs text-slate-500">
                      Rutas con costo definido
                    </p>
                  </div>
                </dl>
                <dl className="mt-6 grid gap-4 md:grid-cols-2">
                  <div className="rounded-md border border-slate-200 p-4">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Demanda total (m³)
                    </dt>
                    <dd className="text-xl font-semibold text-slate-800">
                      {totals.totalDemandVol.toLocaleString('es-AR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </dd>
                  </div>
                  <div className="rounded-md border border-slate-200 p-4">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Demanda total (kg)
                    </dt>
                    <dd className="text-xl font-semibold text-slate-800">
                      {totals.totalDemandKg.toLocaleString('es-AR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </dd>
                  </div>
                  <div className="rounded-md border border-slate-200 p-4">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Costo fijo vehículos
                    </dt>
                    <dd className="text-xl font-semibold text-slate-800">
                      USD{' '}
                      {totals.totalFixedCost.toLocaleString('es-AR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </dd>
                  </div>
                  <div className="rounded-md border border-slate-200 p-4">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Costo variable tarifas
                    </dt>
                    <dd className="text-xl font-semibold text-slate-800">
                      USD{' '}
                      {totals.totalTariffCost.toLocaleString('es-AR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
              <p className="text-sm text-slate-500">
                Seleccioná o creá un escenario para empezar a planificar rutas.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default RoutesTab;
