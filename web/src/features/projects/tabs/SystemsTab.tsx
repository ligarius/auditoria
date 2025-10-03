import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';

import api from '../../../lib/api';
import { useAuth } from '../../../hooks/useAuth';
import { getErrorMessage } from '../../../lib/errors';

interface InventoryItem {
  id: string;
  systemName: string;
  type: string;
  ownerArea?: string | null;
  usersActive?: number | null;
  criticality?: string | null;
  notes?: string | null;
}

interface CoverageItem {
  id: string;
  process: string;
  subProcess?: string | null;
  systemNameRef?: string | null;
  coverage: number;
  hasGap: boolean;
  gapDesc?: string | null;
  owner?: string | null;
}

interface IntegrationItem {
  id: string;
  source: string;
  target: string;
  type: string;
  periodicity?: string | null;
  dailyVolume?: number | null;
  format?: string | null;
  notes?: string | null;
}

interface DataQualityItem {
  id: string;
  systemName: string;
  entity: string;
  hasCriticalFields: boolean;
  dataQuality: number;
  hasBusinessRules: boolean;
  historyYears?: number | null;
  notes?: string | null;
}

interface SystemsTabProps {
  projectId: string;
}

const defaultInventoryForm = {
  systemName: '',
  type: '',
  ownerArea: '',
  usersActive: '',
  criticality: '',
  notes: '',
};

const defaultCoverageForm = {
  process: '',
  subProcess: '',
  systemNameRef: '',
  coverage: 80,
  hasGap: 'false',
  gapDesc: '',
  owner: '',
};

const defaultIntegrationForm = {
  source: '',
  target: '',
  type: '',
  periodicity: '',
  dailyVolume: '',
  format: '',
  notes: '',
};

const defaultDataQualityForm = {
  systemName: '',
  entity: '',
  hasCriticalFields: 'true',
  dataQuality: 80,
  hasBusinessRules: 'true',
  historyYears: '',
  notes: '',
};

export default function SystemsTab({ projectId }: SystemsTabProps) {
  const { role } = useAuth();
  const canEdit = useMemo(() => ['admin', 'consultor'].includes(role), [role]);
  const isAdmin = role === 'admin';

  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [inventoryForm, setInventoryForm] = useState(defaultInventoryForm);
  const [editingInventory, setEditingInventory] =
    useState<InventoryItem | null>(null);

  const [coverage, setCoverage] = useState<CoverageItem[]>([]);
  const [coverageForm, setCoverageForm] = useState(defaultCoverageForm);
  const [editingCoverage, setEditingCoverage] = useState<CoverageItem | null>(
    null
  );

  const [integrations, setIntegrations] = useState<IntegrationItem[]>([]);
  const [integrationForm, setIntegrationForm] = useState(
    defaultIntegrationForm
  );
  const [editingIntegration, setEditingIntegration] =
    useState<IntegrationItem | null>(null);

  const [dataQuality, setDataQuality] = useState<DataQualityItem[]>([]);
  const [dataQualityForm, setDataQualityForm] = useState(
    defaultDataQualityForm
  );
  const [editingDataQuality, setEditingDataQuality] =
    useState<DataQualityItem | null>(null);

  const [error, setError] = useState<string | null>(null);

  const loadInventory = useCallback(async () => {
    try {
      const response = await api.get<InventoryItem[]>(
        `/systems/inventory/${projectId}`
      );
      setInventory(response.data ?? []);
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'No se pudo cargar el inventario'));
    }
  }, [projectId]);

  const loadCoverage = useCallback(async () => {
    try {
      const response = await api.get<CoverageItem[]>(
        `/systems/coverage/${projectId}`
      );
      setCoverage(response.data ?? []);
    } catch (error: unknown) {
      setError(
        getErrorMessage(error, 'No se pudo cargar la cobertura de procesos')
      );
    }
  }, [projectId]);

  const loadIntegrations = useCallback(async () => {
    try {
      const response = await api.get<IntegrationItem[]>(
        `/systems/integrations/${projectId}`
      );
      setIntegrations(response.data ?? []);
    } catch (error: unknown) {
      setError(
        getErrorMessage(error, 'No se pudieron cargar las integraciones')
      );
    }
  }, [projectId]);

  const loadDataQuality = useCallback(async () => {
    try {
      const response = await api.get<DataQualityItem[]>(
        `/systems/data-quality/${projectId}`
      );
      setDataQuality(response.data ?? []);
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'No se pudo cargar la calidad de datos'));
    }
  }, [projectId]);

  useEffect(() => {
    void loadInventory();
    void loadCoverage();
    void loadIntegrations();
    void loadDataQuality();
  }, [loadInventory, loadCoverage, loadIntegrations, loadDataQuality]);

  const coverageGroups = useMemo(() => {
    const groups = new Map<string, CoverageItem[]>();
    coverage.forEach((item) => {
      const key = item.process;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(item);
    });
    groups.forEach((items) =>
      items.sort((a, b) =>
        (a.subProcess ?? '').localeCompare(b.subProcess ?? '')
      )
    );
    return Array.from(groups.entries());
  }, [coverage]);

  const handleCreateInventory = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canEdit) return;
    try {
      await api.post(`/systems/inventory/${projectId}`, {
        systemName: inventoryForm.systemName,
        type: inventoryForm.type,
        ownerArea: inventoryForm.ownerArea || undefined,
        usersActive: inventoryForm.usersActive
          ? Number(inventoryForm.usersActive)
          : undefined,
        criticality: inventoryForm.criticality || undefined,
        notes: inventoryForm.notes || undefined,
      });
      setInventoryForm(defaultInventoryForm);
      await loadInventory();
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'No se pudo crear el sistema'));
    }
  };

  const handleUpdateInventory = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingInventory) return;
    try {
      await api.put(`/systems/inventory/${projectId}/${editingInventory.id}`, {
        systemName: editingInventory.systemName,
        type: editingInventory.type,
        ownerArea: editingInventory.ownerArea || undefined,
        usersActive: editingInventory.usersActive ?? undefined,
        criticality: editingInventory.criticality || undefined,
        notes: editingInventory.notes || undefined,
      });
      setEditingInventory(null);
      await loadInventory();
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'No se pudo actualizar el sistema'));
    }
  };

  const handleCreateCoverage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canEdit) return;
    try {
      await api.post(`/systems/coverage/${projectId}`, {
        process: coverageForm.process,
        subProcess: coverageForm.subProcess || undefined,
        systemNameRef: coverageForm.systemNameRef || undefined,
        coverage: Number(coverageForm.coverage),
        hasGap: coverageForm.hasGap === 'true',
        gapDesc: coverageForm.gapDesc || undefined,
        owner: coverageForm.owner || undefined,
      });
      setCoverageForm(defaultCoverageForm);
      await loadCoverage();
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'No se pudo registrar la cobertura'));
    }
  };

  const handleUpdateCoverage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingCoverage) return;
    try {
      await api.put(`/systems/coverage/${projectId}/${editingCoverage.id}`, {
        process: editingCoverage.process,
        subProcess: editingCoverage.subProcess || undefined,
        systemNameRef: editingCoverage.systemNameRef || undefined,
        coverage: editingCoverage.coverage,
        hasGap: editingCoverage.hasGap,
        gapDesc: editingCoverage.gapDesc || undefined,
        owner: editingCoverage.owner || undefined,
      });
      setEditingCoverage(null);
      await loadCoverage();
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'No se pudo actualizar la cobertura'));
    }
  };

  const handleCreateIntegration = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canEdit) return;
    try {
      await api.post(`/systems/integrations/${projectId}`, {
        source: integrationForm.source,
        target: integrationForm.target,
        type: integrationForm.type,
        periodicity: integrationForm.periodicity || undefined,
        dailyVolume: integrationForm.dailyVolume
          ? Number(integrationForm.dailyVolume)
          : undefined,
        format: integrationForm.format || undefined,
        notes: integrationForm.notes || undefined,
      });
      setIntegrationForm(defaultIntegrationForm);
      await loadIntegrations();
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'No se pudo crear la integración'));
    }
  };

  const handleUpdateIntegration = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingIntegration) return;
    try {
      await api.put(
        `/systems/integrations/${projectId}/${editingIntegration.id}`,
        {
          source: editingIntegration.source,
          target: editingIntegration.target,
          type: editingIntegration.type,
          periodicity: editingIntegration.periodicity || undefined,
          dailyVolume: editingIntegration.dailyVolume ?? undefined,
          format: editingIntegration.format || undefined,
          notes: editingIntegration.notes || undefined,
        }
      );
      setEditingIntegration(null);
      await loadIntegrations();
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'No se pudo actualizar la integración'));
    }
  };

  const handleCreateDataQuality = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canEdit) return;
    try {
      await api.post(`/systems/data-quality/${projectId}`, {
        systemName: dataQualityForm.systemName,
        entity: dataQualityForm.entity,
        hasCriticalFields: dataQualityForm.hasCriticalFields === 'true',
        dataQuality: Number(dataQualityForm.dataQuality),
        hasBusinessRules: dataQualityForm.hasBusinessRules === 'true',
        historyYears: dataQualityForm.historyYears
          ? Number(dataQualityForm.historyYears)
          : undefined,
        notes: dataQualityForm.notes || undefined,
      });
      setDataQualityForm(defaultDataQualityForm);
      await loadDataQuality();
    } catch (error: unknown) {
      setError(
        getErrorMessage(error, 'No se pudo registrar la calidad de datos')
      );
    }
  };

  const handleUpdateDataQuality = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingDataQuality) return;
    try {
      await api.put(
        `/systems/data-quality/${projectId}/${editingDataQuality.id}`,
        {
          systemName: editingDataQuality.systemName,
          entity: editingDataQuality.entity,
          hasCriticalFields: editingDataQuality.hasCriticalFields,
          dataQuality: editingDataQuality.dataQuality,
          hasBusinessRules: editingDataQuality.hasBusinessRules,
          historyYears: editingDataQuality.historyYears ?? undefined,
          notes: editingDataQuality.notes || undefined,
        }
      );
      setEditingDataQuality(null);
      await loadDataQuality();
    } catch (error: unknown) {
      setError(
        getErrorMessage(error, 'No se pudo actualizar la calidad de datos')
      );
    }
  };

  const removeInventory = async (id: string) => {
    if (!isAdmin) return;
    try {
      await api.delete(`/systems/inventory/${projectId}/${id}`);
      await loadInventory();
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'No se pudo eliminar el sistema'));
    }
  };

  const removeCoverage = async (id: string) => {
    if (!isAdmin) return;
    try {
      await api.delete(`/systems/coverage/${projectId}/${id}`);
      await loadCoverage();
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'No se pudo eliminar la cobertura'));
    }
  };

  const removeIntegration = async (id: string) => {
    if (!isAdmin) return;
    try {
      await api.delete(`/systems/integrations/${projectId}/${id}`);
      await loadIntegrations();
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'No se pudo eliminar la integración'));
    }
  };

  const removeDataQuality = async (id: string) => {
    if (!isAdmin) return;
    try {
      await api.delete(`/systems/data-quality/${projectId}/${id}`);
      await loadDataQuality();
    } catch (error: unknown) {
      setError(
        getErrorMessage(error, 'No se pudo eliminar el registro de calidad')
      );
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Sistemas</h2>
        <p className="text-sm text-slate-500">
          Gestiona el inventario tecnológico, cobertura de procesos e
          integraciones clave del proyecto.
        </p>
      </div>

      {error && (
        <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <header className="space-y-1">
          <h3 className="text-lg font-semibold text-slate-900">
            Inventario de sistemas
          </h3>
          <p className="text-sm text-slate-500">
            Registra las plataformas relevantes, su criticidad y áreas
            responsables.
          </p>
        </header>
        {canEdit && !editingInventory && (
          <form
            onSubmit={handleCreateInventory}
            className="grid gap-3 rounded-lg border border-slate-200 p-4"
          >
            <h4 className="text-base font-medium text-slate-800">
              Nuevo sistema
            </h4>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="flex flex-col text-sm">
                Nombre del sistema
                <input
                  className="mt-1 rounded border px-3 py-2"
                  value={inventoryForm.systemName}
                  onChange={(event) =>
                    setInventoryForm((prev) => ({
                      ...prev,
                      systemName: event.target.value,
                    }))
                  }
                  required
                />
              </label>
              <label className="flex flex-col text-sm">
                Tipo / Categoría
                <input
                  className="mt-1 rounded border px-3 py-2"
                  value={inventoryForm.type}
                  onChange={(event) =>
                    setInventoryForm((prev) => ({
                      ...prev,
                      type: event.target.value,
                    }))
                  }
                  required
                />
              </label>
              <label className="flex flex-col text-sm">
                Área responsable
                <input
                  className="mt-1 rounded border px-3 py-2"
                  value={inventoryForm.ownerArea}
                  onChange={(event) =>
                    setInventoryForm((prev) => ({
                      ...prev,
                      ownerArea: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="flex flex-col text-sm">
                Usuarios activos
                <input
                  type="number"
                  min={0}
                  className="mt-1 rounded border px-3 py-2"
                  value={inventoryForm.usersActive}
                  onChange={(event) =>
                    setInventoryForm((prev) => ({
                      ...prev,
                      usersActive: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="flex flex-col text-sm">
                Criticidad
                <input
                  className="mt-1 rounded border px-3 py-2"
                  value={inventoryForm.criticality}
                  onChange={(event) =>
                    setInventoryForm((prev) => ({
                      ...prev,
                      criticality: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="flex flex-col text-sm md:col-span-2">
                Notas
                <textarea
                  className="mt-1 rounded border px-3 py-2"
                  value={inventoryForm.notes}
                  onChange={(event) =>
                    setInventoryForm((prev) => ({
                      ...prev,
                      notes: event.target.value,
                    }))
                  }
                  rows={2}
                />
              </label>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white"
              >
                Agregar sistema
              </button>
            </div>
          </form>
        )}

        {editingInventory && canEdit && (
          <form
            onSubmit={handleUpdateInventory}
            className="grid gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-base font-medium text-slate-800">
                Editar sistema
              </h4>
              <button
                type="button"
                className="text-sm text-blue-700 underline"
                onClick={() => setEditingInventory(null)}
              >
                Cancelar
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="flex flex-col text-sm">
                Nombre del sistema
                <input
                  className="mt-1 rounded border px-3 py-2"
                  value={editingInventory.systemName}
                  onChange={(event) =>
                    setEditingInventory((prev) =>
                      prev ? { ...prev, systemName: event.target.value } : prev
                    )
                  }
                  required
                />
              </label>
              <label className="flex flex-col text-sm">
                Tipo / Categoría
                <input
                  className="mt-1 rounded border px-3 py-2"
                  value={editingInventory.type}
                  onChange={(event) =>
                    setEditingInventory((prev) =>
                      prev ? { ...prev, type: event.target.value } : prev
                    )
                  }
                  required
                />
              </label>
              <label className="flex flex-col text-sm">
                Área responsable
                <input
                  className="mt-1 rounded border px-3 py-2"
                  value={editingInventory.ownerArea ?? ''}
                  onChange={(event) =>
                    setEditingInventory((prev) =>
                      prev ? { ...prev, ownerArea: event.target.value } : prev
                    )
                  }
                />
              </label>
              <label className="flex flex-col text-sm">
                Usuarios activos
                <input
                  type="number"
                  min={0}
                  className="mt-1 rounded border px-3 py-2"
                  value={editingInventory.usersActive ?? ''}
                  onChange={(event) =>
                    setEditingInventory((prev) =>
                      prev
                        ? { ...prev, usersActive: Number(event.target.value) }
                        : prev
                    )
                  }
                />
              </label>
              <label className="flex flex-col text-sm">
                Criticidad
                <input
                  className="mt-1 rounded border px-3 py-2"
                  value={editingInventory.criticality ?? ''}
                  onChange={(event) =>
                    setEditingInventory((prev) =>
                      prev ? { ...prev, criticality: event.target.value } : prev
                    )
                  }
                />
              </label>
              <label className="flex flex-col text-sm md:col-span-2">
                Notas
                <textarea
                  className="mt-1 rounded border px-3 py-2"
                  value={editingInventory.notes ?? ''}
                  onChange={(event) =>
                    setEditingInventory((prev) =>
                      prev ? { ...prev, notes: event.target.value } : prev
                    )
                  }
                  rows={2}
                />
              </label>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white"
              >
                Actualizar sistema
              </button>
            </div>
          </form>
        )}

        <div className="space-y-2">
          {inventory.map((item) => (
            <div
              key={item.id}
              className="flex flex-wrap items-start justify-between gap-2 rounded border border-slate-200 bg-slate-50 p-3"
            >
              <div>
                <p className="text-sm font-medium text-slate-800">
                  {item.systemName}
                </p>
                <p className="text-xs text-slate-500">
                  {item.type} · Área: {item.ownerArea ?? 'No definida'}
                </p>
                <p className="text-xs text-slate-500">
                  Usuarios: {item.usersActive ?? 'N/D'} · Criticidad:{' '}
                  {item.criticality ?? 'N/D'}
                </p>
                {item.notes && (
                  <p className="text-xs text-slate-500">{item.notes}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {canEdit && (
                  <button
                    className="rounded bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
                    onClick={() => setEditingInventory(item)}
                  >
                    Editar
                  </button>
                )}
                {isAdmin && (
                  <button
                    className="rounded bg-red-600 px-3 py-1 text-xs font-medium text-white"
                    onClick={() => removeInventory(item.id)}
                  >
                    Eliminar
                  </button>
                )}
              </div>
            </div>
          ))}
          {inventory.length === 0 && (
            <p className="text-sm text-slate-500">
              No hay sistemas registrados.
            </p>
          )}
        </div>
      </section>

      <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <header className="space-y-1">
          <h3 className="text-lg font-semibold text-slate-900">
            Cobertura de procesos
          </h3>
          <p className="text-sm text-slate-500">
            Analiza procesos, subprocesos y brechas identificadas en el
            inventario.
          </p>
        </header>
        {canEdit && !editingCoverage && (
          <form
            onSubmit={handleCreateCoverage}
            className="grid gap-3 rounded-lg border border-slate-200 p-4"
          >
            <h4 className="text-base font-medium text-slate-800">
              Nuevo registro
            </h4>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="flex flex-col text-sm">
                Proceso
                <input
                  className="mt-1 rounded border px-3 py-2"
                  value={coverageForm.process}
                  onChange={(event) =>
                    setCoverageForm((prev) => ({
                      ...prev,
                      process: event.target.value,
                    }))
                  }
                  required
                />
              </label>
              <label className="flex flex-col text-sm">
                Subproceso
                <input
                  className="mt-1 rounded border px-3 py-2"
                  value={coverageForm.subProcess}
                  onChange={(event) =>
                    setCoverageForm((prev) => ({
                      ...prev,
                      subProcess: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="flex flex-col text-sm">
                Sistema asociado
                <input
                  className="mt-1 rounded border px-3 py-2"
                  value={coverageForm.systemNameRef}
                  onChange={(event) =>
                    setCoverageForm((prev) => ({
                      ...prev,
                      systemNameRef: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="flex flex-col text-sm">
                Cobertura (%)
                <input
                  type="number"
                  min={0}
                  max={100}
                  className="mt-1 rounded border px-3 py-2"
                  value={coverageForm.coverage}
                  onChange={(event) =>
                    setCoverageForm((prev) => ({
                      ...prev,
                      coverage: Number(event.target.value),
                    }))
                  }
                  required
                />
              </label>
              <label className="flex flex-col text-sm">
                Brecha identificada
                <select
                  className="mt-1 rounded border px-3 py-2"
                  value={coverageForm.hasGap}
                  onChange={(event) =>
                    setCoverageForm((prev) => ({
                      ...prev,
                      hasGap: event.target.value,
                    }))
                  }
                >
                  <option value="false">No</option>
                  <option value="true">Sí</option>
                </select>
              </label>
              <label className="flex flex-col text-sm">
                Dueño
                <input
                  className="mt-1 rounded border px-3 py-2"
                  value={coverageForm.owner}
                  onChange={(event) =>
                    setCoverageForm((prev) => ({
                      ...prev,
                      owner: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="flex flex-col text-sm md:col-span-2">
                Descripción de brecha / notas
                <textarea
                  className="mt-1 rounded border px-3 py-2"
                  value={coverageForm.gapDesc}
                  onChange={(event) =>
                    setCoverageForm((prev) => ({
                      ...prev,
                      gapDesc: event.target.value,
                    }))
                  }
                  rows={2}
                />
              </label>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white"
              >
                Registrar cobertura
              </button>
            </div>
          </form>
        )}

        {editingCoverage && canEdit && (
          <form
            onSubmit={handleUpdateCoverage}
            className="grid gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-base font-medium text-slate-800">
                Editar registro
              </h4>
              <button
                type="button"
                className="text-sm text-blue-700 underline"
                onClick={() => setEditingCoverage(null)}
              >
                Cancelar
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="flex flex-col text-sm">
                Proceso
                <input
                  className="mt-1 rounded border px-3 py-2"
                  value={editingCoverage.process}
                  onChange={(event) =>
                    setEditingCoverage((prev) =>
                      prev ? { ...prev, process: event.target.value } : prev
                    )
                  }
                  required
                />
              </label>
              <label className="flex flex-col text-sm">
                Subproceso
                <input
                  className="mt-1 rounded border px-3 py-2"
                  value={editingCoverage.subProcess ?? ''}
                  onChange={(event) =>
                    setEditingCoverage((prev) =>
                      prev ? { ...prev, subProcess: event.target.value } : prev
                    )
                  }
                />
              </label>
              <label className="flex flex-col text-sm">
                Sistema asociado
                <input
                  className="mt-1 rounded border px-3 py-2"
                  value={editingCoverage.systemNameRef ?? ''}
                  onChange={(event) =>
                    setEditingCoverage((prev) =>
                      prev
                        ? { ...prev, systemNameRef: event.target.value }
                        : prev
                    )
                  }
                />
              </label>
              <label className="flex flex-col text-sm">
                Cobertura (%)
                <input
                  type="number"
                  min={0}
                  max={100}
                  className="mt-1 rounded border px-3 py-2"
                  value={editingCoverage.coverage}
                  onChange={(event) =>
                    setEditingCoverage((prev) =>
                      prev
                        ? { ...prev, coverage: Number(event.target.value) }
                        : prev
                    )
                  }
                  required
                />
              </label>
              <label className="flex flex-col text-sm">
                Brecha identificada
                <select
                  className="mt-1 rounded border px-3 py-2"
                  value={editingCoverage.hasGap ? 'true' : 'false'}
                  onChange={(event) =>
                    setEditingCoverage((prev) =>
                      prev
                        ? { ...prev, hasGap: event.target.value === 'true' }
                        : prev
                    )
                  }
                >
                  <option value="false">No</option>
                  <option value="true">Sí</option>
                </select>
              </label>
              <label className="flex flex-col text-sm">
                Dueño
                <input
                  className="mt-1 rounded border px-3 py-2"
                  value={editingCoverage.owner ?? ''}
                  onChange={(event) =>
                    setEditingCoverage((prev) =>
                      prev ? { ...prev, owner: event.target.value } : prev
                    )
                  }
                />
              </label>
              <label className="flex flex-col text-sm md:col-span-2">
                Descripción de brecha / notas
                <textarea
                  className="mt-1 rounded border px-3 py-2"
                  value={editingCoverage.gapDesc ?? ''}
                  onChange={(event) =>
                    setEditingCoverage((prev) =>
                      prev ? { ...prev, gapDesc: event.target.value } : prev
                    )
                  }
                  rows={2}
                />
              </label>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white"
              >
                Actualizar registro
              </button>
            </div>
          </form>
        )}

        <div className="space-y-3">
          {coverageGroups.map(([processName, items]) => (
            <div
              key={processName}
              className="space-y-2 rounded border border-slate-200 bg-slate-50 p-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    {processName}
                  </p>
                  <p className="text-xs text-slate-500">
                    Cobertura promedio:{' '}
                    {Math.round(
                      items.reduce((acc, item) => acc + item.coverage, 0) /
                        (items.length || 1)
                    )}
                    %
                  </p>
                </div>
              </div>
              <ul className="space-y-2">
                {items.map((item) => (
                  <li
                    key={item.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded border border-slate-200 bg-white p-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-800">
                        {item.subProcess || 'Sin subproceso'}
                      </p>
                      <p className="text-xs text-slate-500">
                        Sistema: {item.systemNameRef || 'N/D'} · Cobertura:{' '}
                        {item.coverage}%
                      </p>
                      <p className="text-xs text-slate-500">
                        Gap: {item.hasGap ? 'Sí' : 'No'}{' '}
                        {item.gapDesc ? `· ${item.gapDesc}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {canEdit && (
                        <button
                          className="rounded bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
                          onClick={() => setEditingCoverage(item)}
                        >
                          Editar
                        </button>
                      )}
                      {isAdmin && (
                        <button
                          className="rounded bg-red-600 px-3 py-1 text-xs font-medium text-white"
                          onClick={() => removeCoverage(item.id)}
                        >
                          Eliminar
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {coverage.length === 0 && (
            <p className="text-sm text-slate-500">
              Aún no se registran coberturas de procesos.
            </p>
          )}
        </div>
      </section>

      <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <header className="space-y-1">
          <h3 className="text-lg font-semibold text-slate-900">
            Integraciones
          </h3>
          <p className="text-sm text-slate-500">
            Documenta los flujos de información entre sistemas y su volumetría.
          </p>
        </header>
        {canEdit && !editingIntegration && (
          <form
            onSubmit={handleCreateIntegration}
            className="grid gap-3 rounded-lg border border-slate-200 p-4"
          >
            <h4 className="text-base font-medium text-slate-800">
              Nueva integración
            </h4>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="flex flex-col text-sm">
                Origen
                <input
                  className="mt-1 rounded border px-3 py-2"
                  value={integrationForm.source}
                  onChange={(event) =>
                    setIntegrationForm((prev) => ({
                      ...prev,
                      source: event.target.value,
                    }))
                  }
                  required
                />
              </label>
              <label className="flex flex-col text-sm">
                Destino
                <input
                  className="mt-1 rounded border px-3 py-2"
                  value={integrationForm.target}
                  onChange={(event) =>
                    setIntegrationForm((prev) => ({
                      ...prev,
                      target: event.target.value,
                    }))
                  }
                  required
                />
              </label>
              <label className="flex flex-col text-sm">
                Tipo
                <input
                  className="mt-1 rounded border px-3 py-2"
                  value={integrationForm.type}
                  onChange={(event) =>
                    setIntegrationForm((prev) => ({
                      ...prev,
                      type: event.target.value,
                    }))
                  }
                  required
                />
              </label>
              <label className="flex flex-col text-sm">
                Periodicidad
                <input
                  className="mt-1 rounded border px-3 py-2"
                  value={integrationForm.periodicity}
                  onChange={(event) =>
                    setIntegrationForm((prev) => ({
                      ...prev,
                      periodicity: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="flex flex-col text-sm">
                Volumen diario
                <input
                  type="number"
                  min={0}
                  className="mt-1 rounded border px-3 py-2"
                  value={integrationForm.dailyVolume}
                  onChange={(event) =>
                    setIntegrationForm((prev) => ({
                      ...prev,
                      dailyVolume: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="flex flex-col text-sm">
                Formato
                <input
                  className="mt-1 rounded border px-3 py-2"
                  value={integrationForm.format}
                  onChange={(event) =>
                    setIntegrationForm((prev) => ({
                      ...prev,
                      format: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="flex flex-col text-sm md:col-span-2">
                Notas
                <textarea
                  className="mt-1 rounded border px-3 py-2"
                  value={integrationForm.notes}
                  onChange={(event) =>
                    setIntegrationForm((prev) => ({
                      ...prev,
                      notes: event.target.value,
                    }))
                  }
                  rows={2}
                />
              </label>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white"
              >
                Registrar integración
              </button>
            </div>
          </form>
        )}

        {editingIntegration && canEdit && (
          <form
            onSubmit={handleUpdateIntegration}
            className="grid gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-base font-medium text-slate-800">
                Editar integración
              </h4>
              <button
                type="button"
                className="text-sm text-blue-700 underline"
                onClick={() => setEditingIntegration(null)}
              >
                Cancelar
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="flex flex-col text-sm">
                Origen
                <input
                  className="mt-1 rounded border px-3 py-2"
                  value={editingIntegration.source}
                  onChange={(event) =>
                    setEditingIntegration((prev) =>
                      prev ? { ...prev, source: event.target.value } : prev
                    )
                  }
                  required
                />
              </label>
              <label className="flex flex-col text-sm">
                Destino
                <input
                  className="mt-1 rounded border px-3 py-2"
                  value={editingIntegration.target}
                  onChange={(event) =>
                    setEditingIntegration((prev) =>
                      prev ? { ...prev, target: event.target.value } : prev
                    )
                  }
                  required
                />
              </label>
              <label className="flex flex-col text-sm">
                Tipo
                <input
                  className="mt-1 rounded border px-3 py-2"
                  value={editingIntegration.type}
                  onChange={(event) =>
                    setEditingIntegration((prev) =>
                      prev ? { ...prev, type: event.target.value } : prev
                    )
                  }
                  required
                />
              </label>
              <label className="flex flex-col text-sm">
                Periodicidad
                <input
                  className="mt-1 rounded border px-3 py-2"
                  value={editingIntegration.periodicity ?? ''}
                  onChange={(event) =>
                    setEditingIntegration((prev) =>
                      prev ? { ...prev, periodicity: event.target.value } : prev
                    )
                  }
                />
              </label>
              <label className="flex flex-col text-sm">
                Volumen diario
                <input
                  type="number"
                  min={0}
                  className="mt-1 rounded border px-3 py-2"
                  value={editingIntegration.dailyVolume ?? ''}
                  onChange={(event) =>
                    setEditingIntegration((prev) =>
                      prev
                        ? { ...prev, dailyVolume: Number(event.target.value) }
                        : prev
                    )
                  }
                />
              </label>
              <label className="flex flex-col text-sm">
                Formato
                <input
                  className="mt-1 rounded border px-3 py-2"
                  value={editingIntegration.format ?? ''}
                  onChange={(event) =>
                    setEditingIntegration((prev) =>
                      prev ? { ...prev, format: event.target.value } : prev
                    )
                  }
                />
              </label>
              <label className="flex flex-col text-sm md:col-span-2">
                Notas
                <textarea
                  className="mt-1 rounded border px-3 py-2"
                  value={editingIntegration.notes ?? ''}
                  onChange={(event) =>
                    setEditingIntegration((prev) =>
                      prev ? { ...prev, notes: event.target.value } : prev
                    )
                  }
                  rows={2}
                />
              </label>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white"
              >
                Actualizar integración
              </button>
            </div>
          </form>
        )}

        <div className="space-y-2">
          {integrations.map((item) => (
            <div
              key={item.id}
              className="flex flex-wrap items-start justify-between gap-2 rounded border border-slate-200 bg-slate-50 p-3"
            >
              <div>
                <p className="text-sm font-medium text-slate-800">
                  {item.source} → {item.target}
                </p>
                <p className="text-xs text-slate-500">
                  Tipo: {item.type} · Periodicidad: {item.periodicity || 'N/D'}
                </p>
                <p className="text-xs text-slate-500">
                  Volumen: {item.dailyVolume ?? 'N/D'} · Formato:{' '}
                  {item.format ?? 'N/D'}
                </p>
                {item.notes && (
                  <p className="text-xs text-slate-500">{item.notes}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {canEdit && (
                  <button
                    className="rounded bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
                    onClick={() => setEditingIntegration(item)}
                  >
                    Editar
                  </button>
                )}
                {isAdmin && (
                  <button
                    className="rounded bg-red-600 px-3 py-1 text-xs font-medium text-white"
                    onClick={() => removeIntegration(item.id)}
                  >
                    Eliminar
                  </button>
                )}
              </div>
            </div>
          ))}
          {integrations.length === 0 && (
            <p className="text-sm text-slate-500">
              No hay integraciones registradas.
            </p>
          )}
        </div>
      </section>

      <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <header className="space-y-1">
          <h3 className="text-lg font-semibold text-slate-900">
            Calidad de datos
          </h3>
          <p className="text-sm text-slate-500">
            Evalúa atributos de calidad y gobernanza sobre las entidades
            relevantes.
          </p>
        </header>
        {canEdit && !editingDataQuality && (
          <form
            onSubmit={handleCreateDataQuality}
            className="grid gap-3 rounded-lg border border-slate-200 p-4"
          >
            <h4 className="text-base font-medium text-slate-800">
              Nuevo registro
            </h4>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="flex flex-col text-sm">
                Sistema
                <input
                  className="mt-1 rounded border px-3 py-2"
                  value={dataQualityForm.systemName}
                  onChange={(event) =>
                    setDataQualityForm((prev) => ({
                      ...prev,
                      systemName: event.target.value,
                    }))
                  }
                  required
                />
              </label>
              <label className="flex flex-col text-sm">
                Entidad / tabla
                <input
                  className="mt-1 rounded border px-3 py-2"
                  value={dataQualityForm.entity}
                  onChange={(event) =>
                    setDataQualityForm((prev) => ({
                      ...prev,
                      entity: event.target.value,
                    }))
                  }
                  required
                />
              </label>
              <label className="flex flex-col text-sm">
                Campos críticos
                <select
                  className="mt-1 rounded border px-3 py-2"
                  value={dataQualityForm.hasCriticalFields}
                  onChange={(event) =>
                    setDataQualityForm((prev) => ({
                      ...prev,
                      hasCriticalFields: event.target.value,
                    }))
                  }
                >
                  <option value="true">Sí</option>
                  <option value="false">No</option>
                </select>
              </label>
              <label className="flex flex-col text-sm">
                Calidad (0-100)
                <input
                  type="number"
                  min={0}
                  max={100}
                  className="mt-1 rounded border px-3 py-2"
                  value={dataQualityForm.dataQuality}
                  onChange={(event) =>
                    setDataQualityForm((prev) => ({
                      ...prev,
                      dataQuality: Number(event.target.value),
                    }))
                  }
                  required
                />
              </label>
              <label className="flex flex-col text-sm">
                Reglas de negocio
                <select
                  className="mt-1 rounded border px-3 py-2"
                  value={dataQualityForm.hasBusinessRules}
                  onChange={(event) =>
                    setDataQualityForm((prev) => ({
                      ...prev,
                      hasBusinessRules: event.target.value,
                    }))
                  }
                >
                  <option value="true">Sí</option>
                  <option value="false">No</option>
                </select>
              </label>
              <label className="flex flex-col text-sm">
                Años de historia
                <input
                  type="number"
                  min={0}
                  className="mt-1 rounded border px-3 py-2"
                  value={dataQualityForm.historyYears}
                  onChange={(event) =>
                    setDataQualityForm((prev) => ({
                      ...prev,
                      historyYears: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="flex flex-col text-sm md:col-span-2">
                Notas
                <textarea
                  className="mt-1 rounded border px-3 py-2"
                  value={dataQualityForm.notes}
                  onChange={(event) =>
                    setDataQualityForm((prev) => ({
                      ...prev,
                      notes: event.target.value,
                    }))
                  }
                  rows={2}
                />
              </label>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white"
              >
                Registrar calidad
              </button>
            </div>
          </form>
        )}

        {editingDataQuality && canEdit && (
          <form
            onSubmit={handleUpdateDataQuality}
            className="grid gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-base font-medium text-slate-800">
                Editar registro
              </h4>
              <button
                type="button"
                className="text-sm text-blue-700 underline"
                onClick={() => setEditingDataQuality(null)}
              >
                Cancelar
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="flex flex-col text-sm">
                Sistema
                <input
                  className="mt-1 rounded border px-3 py-2"
                  value={editingDataQuality.systemName}
                  onChange={(event) =>
                    setEditingDataQuality((prev) =>
                      prev ? { ...prev, systemName: event.target.value } : prev
                    )
                  }
                  required
                />
              </label>
              <label className="flex flex-col text-sm">
                Entidad / tabla
                <input
                  className="mt-1 rounded border px-3 py-2"
                  value={editingDataQuality.entity}
                  onChange={(event) =>
                    setEditingDataQuality((prev) =>
                      prev ? { ...prev, entity: event.target.value } : prev
                    )
                  }
                  required
                />
              </label>
              <label className="flex flex-col text-sm">
                Campos críticos
                <select
                  className="mt-1 rounded border px-3 py-2"
                  value={
                    editingDataQuality.hasCriticalFields ? 'true' : 'false'
                  }
                  onChange={(event) =>
                    setEditingDataQuality((prev) =>
                      prev
                        ? {
                            ...prev,
                            hasCriticalFields: event.target.value === 'true',
                          }
                        : prev
                    )
                  }
                >
                  <option value="true">Sí</option>
                  <option value="false">No</option>
                </select>
              </label>
              <label className="flex flex-col text-sm">
                Calidad (0-100)
                <input
                  type="number"
                  min={0}
                  max={100}
                  className="mt-1 rounded border px-3 py-2"
                  value={editingDataQuality.dataQuality}
                  onChange={(event) =>
                    setEditingDataQuality((prev) =>
                      prev
                        ? { ...prev, dataQuality: Number(event.target.value) }
                        : prev
                    )
                  }
                  required
                />
              </label>
              <label className="flex flex-col text-sm">
                Reglas de negocio
                <select
                  className="mt-1 rounded border px-3 py-2"
                  value={editingDataQuality.hasBusinessRules ? 'true' : 'false'}
                  onChange={(event) =>
                    setEditingDataQuality((prev) =>
                      prev
                        ? {
                            ...prev,
                            hasBusinessRules: event.target.value === 'true',
                          }
                        : prev
                    )
                  }
                >
                  <option value="true">Sí</option>
                  <option value="false">No</option>
                </select>
              </label>
              <label className="flex flex-col text-sm">
                Años de historia
                <input
                  type="number"
                  min={0}
                  className="mt-1 rounded border px-3 py-2"
                  value={editingDataQuality.historyYears ?? ''}
                  onChange={(event) =>
                    setEditingDataQuality((prev) =>
                      prev
                        ? { ...prev, historyYears: Number(event.target.value) }
                        : prev
                    )
                  }
                />
              </label>
              <label className="flex flex-col text-sm md:col-span-2">
                Notas
                <textarea
                  className="mt-1 rounded border px-3 py-2"
                  value={editingDataQuality.notes ?? ''}
                  onChange={(event) =>
                    setEditingDataQuality((prev) =>
                      prev ? { ...prev, notes: event.target.value } : prev
                    )
                  }
                  rows={2}
                />
              </label>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white"
              >
                Actualizar calidad
              </button>
            </div>
          </form>
        )}

        <div className="space-y-2">
          {dataQuality.map((item) => (
            <div
              key={item.id}
              className="flex flex-wrap items-start justify-between gap-2 rounded border border-slate-200 bg-slate-50 p-3"
            >
              <div>
                <p className="text-sm font-medium text-slate-800">
                  {item.systemName} · {item.entity}
                </p>
                <p className="text-xs text-slate-500">
                  Calidad: {item.dataQuality}% · Campos críticos:{' '}
                  {item.hasCriticalFields ? 'Sí' : 'No'}
                </p>
                <p className="text-xs text-slate-500">
                  Reglas de negocio: {item.hasBusinessRules ? 'Sí' : 'No'} ·
                  Historia: {item.historyYears ?? 'N/D'} años
                </p>
                {item.notes && (
                  <p className="text-xs text-slate-500">{item.notes}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {canEdit && (
                  <button
                    className="rounded bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
                    onClick={() => setEditingDataQuality(item)}
                  >
                    Editar
                  </button>
                )}
                {isAdmin && (
                  <button
                    className="rounded bg-red-600 px-3 py-1 text-xs font-medium text-white"
                    onClick={() => removeDataQuality(item.id)}
                  >
                    Eliminar
                  </button>
                )}
              </div>
            </div>
          ))}
          {dataQuality.length === 0 && (
            <p className="text-sm text-slate-500">
              No hay registros de calidad de datos.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
