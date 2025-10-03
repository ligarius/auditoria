import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import { Download } from 'lucide-react';

import api from '../../lib/api';
import { downloadModuleReport } from '../../lib/reports';
import BlindCountSection from './BlindCountSection';
import type { LocationItem, SkuItem, ZoneSummary } from './types';

interface LocationsResponse {
  locations: LocationItem[];
  zones: ZoneSummary[];
}

const formatDateTime = (value: string | null | undefined) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('es-ES');
};

const formatNumber = (value: number | null | undefined) => {
  if (value === null || value === undefined) return '—';
  return Number(value).toString();
};

const initialBulkState = {
  zoneCode: '',
  zoneName: '',
  rackCode: '',
  rackName: '',
  rowStart: '1',
  rowEnd: '1',
  levelStart: '1',
  levelEnd: '1',
  positionStart: '1',
  positionEnd: '1',
};

type LabelType = 'SKU' | 'LOCATION';

interface InventoryTabProps {
  projectId: string;
}

const InventoryTab = ({ projectId }: InventoryTabProps) => {
  const [skus, setSkus] = useState<SkuItem[]>([]);
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [zones, setZones] = useState<ZoneSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkForm, setBulkForm] = useState(initialBulkState);
  const [selectedType, setSelectedType] = useState<LabelType>('SKU');
  const [selectedSkuIds, setSelectedSkuIds] = useState<string[]>([]);
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [activeSection, setActiveSection] = useState<'master' | 'counts'>(
    'master'
  );
  const [downloadingReport, setDownloadingReport] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  const columnCount = selectedType === 'SKU' ? 8 : 10;

  const fetchInventory = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [skuResponse, locationResponse] = await Promise.all([
        api.get<SkuItem[]>(`/inventory/skus/${projectId}`),
        api.get<LocationsResponse>(`/inventory/locations/${projectId}`),
      ]);
      setSkus(Array.isArray(skuResponse.data) ? skuResponse.data : []);
      const locationData = locationResponse.data ?? {
        locations: [],
        zones: [],
      };
      setLocations(
        Array.isArray(locationData.locations) ? locationData.locations : []
      );
      setZones(Array.isArray(locationData.zones) ? locationData.zones : []);
    } catch (error) {
      console.error('No se pudo cargar la información de inventario', error);
      setLoadError(
        'No se pudieron cargar los datos del maestro y las ubicaciones.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  useEffect(() => {
    if (selectedType === 'SKU') {
      setSelectedLocationIds([]);
    } else {
      setSelectedSkuIds([]);
    }
  }, [selectedType]);

  const handleSkuImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setActionError(null);
    setActionMessage(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await api.post<{
        total: number;
        created: number;
        updated: number;
      }>(`/inventory/skus/import/${projectId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const total = response.data?.total ?? 0;
      setActionMessage(
        total > 0
          ? `Se procesaron ${total} SKU${total === 1 ? '' : 's'} del archivo.`
          : 'El archivo no contenía registros nuevos.'
      );
      await fetchInventory();
    } catch (error) {
      console.error('No se pudo importar el CSV de SKUs', error);
      setActionError(
        'No se pudo importar el archivo CSV. Verifica el formato e inténtalo nuevamente.'
      );
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const handleBulkChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setBulkForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleBulkSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBulkError(null);
    setActionError(null);
    setActionMessage(null);
    if (!bulkForm.zoneCode.trim() || !bulkForm.rackCode.trim()) {
      setBulkError(
        'Debes indicar al menos un código de zona y un código de rack.'
      );
      return;
    }

    const definition = {
      zone: {
        code: bulkForm.zoneCode.trim(),
        name: bulkForm.zoneName.trim() ? bulkForm.zoneName.trim() : undefined,
      },
      rack: {
        code: bulkForm.rackCode.trim(),
        name: bulkForm.rackName.trim() ? bulkForm.rackName.trim() : undefined,
      },
      rowStart: Number(bulkForm.rowStart || 0),
      rowEnd: Number(bulkForm.rowEnd || bulkForm.rowStart || 0),
      levelStart: Number(bulkForm.levelStart || 0),
      levelEnd: Number(bulkForm.levelEnd || bulkForm.levelStart || 0),
      positionStart: Number(bulkForm.positionStart || 0),
      positionEnd: Number(bulkForm.positionEnd || bulkForm.positionStart || 0),
    };

    setBulkSaving(true);
    try {
      const response = await api.post(
        `/inventory/locations/${projectId}/bulk`,
        {
          definitions: [definition],
        }
      );
      const created = response.data?.created ?? 0;
      const reused = response.data?.reused ?? 0;
      setActionMessage(
        `Se generaron ${created} ubicaciones y se actualizaron ${reused}.`
      );
      setBulkForm(initialBulkState);
      await fetchInventory();
    } catch (error) {
      console.error('No se pudieron crear las ubicaciones', error);
      setBulkError(
        'No se pudieron generar las ubicaciones con los datos entregados.'
      );
    } finally {
      setBulkSaving(false);
    }
  };

  const selectedIds =
    selectedType === 'SKU' ? selectedSkuIds : selectedLocationIds;

  const selectedLabelIds = useMemo(() => {
    if (selectedType === 'SKU') {
      return selectedSkuIds
        .map((id) => skus.find((sku) => sku.id === id)?.label?.id)
        .filter((id): id is string => Boolean(id));
    }
    return selectedLocationIds
      .map((id) => locations.find((location) => location.id === id)?.label?.id)
      .filter((id): id is string => Boolean(id));
  }, [selectedLocationIds, selectedSkuIds, selectedType, locations, skus]);

  const handleGeneratePdf = async () => {
    if (selectedIds.length === 0) {
      setActionError('Selecciona al menos un elemento para generar etiquetas.');
      return;
    }
    setGenerating(true);
    setActionError(null);
    setActionMessage(null);
    try {
      const response = await api.post(
        `/inventory/labels/${projectId}/generate`,
        {
          type: selectedType,
          ids: selectedIds,
        },
        {
          responseType: 'blob',
        }
      );
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const stamp = new Date().toISOString().slice(0, 10);
      link.download = `etiquetas-${selectedType.toLowerCase()}-${stamp}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      setActionMessage('PDF de etiquetas generado correctamente.');
      await fetchInventory();
    } catch (error) {
      console.error('No se pudo generar el PDF de etiquetas', error);
      setActionError(
        'No se pudo generar el PDF de etiquetas. Intenta nuevamente.'
      );
    } finally {
      setGenerating(false);
    }
  };

  const handleMarkInstalled = async () => {
    if (selectedLabelIds.length === 0) {
      setActionError(
        'Las selecciones actuales no tienen etiquetas emitidas para marcar como instaladas.'
      );
      return;
    }
    setInstalling(true);
    setActionError(null);
    setActionMessage(null);
    try {
      await api.post(`/inventory/labels/${projectId}/install`, {
        labelIds: selectedLabelIds,
      });
      setActionMessage('Se marcaron las etiquetas como instaladas.');
      await fetchInventory();
    } catch (error) {
      console.error(
        'No se pudieron marcar las etiquetas como instaladas',
        error
      );
      setActionError('No se pudieron actualizar los estados de instalación.');
    } finally {
      setInstalling(false);
    }
  };

  const toggleSkuSelection = (id: string) => {
    setSelectedSkuIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );
  };

  const toggleLocationSelection = (id: string) => {
    setSelectedLocationIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );
  };

  const allSkusSelected =
    skus.length > 0 && selectedSkuIds.length === skus.length;
  const allLocationsSelected =
    locations.length > 0 && selectedLocationIds.length === locations.length;

  const handleSelectAll = (checked: boolean) => {
    if (selectedType === 'SKU') {
      setSelectedSkuIds(checked ? skus.map((sku) => sku.id) : []);
    } else {
      setSelectedLocationIds(
        checked ? locations.map((location) => location.id) : []
      );
    }
  };

  const totalZones = zones.length;
  const totalLocations = useMemo(
    () => zones.reduce((acc, zone) => acc + zone.totalLocations, 0),
    [zones]
  );
  const installedLocations = useMemo(
    () => zones.reduce((acc, zone) => acc + zone.installedLocations, 0),
    [zones]
  );

  const handleDownloadReport = async () => {
    setReportError(null);
    setDownloadingReport(true);
    try {
      await downloadModuleReport(projectId, 'inventario', 'inventario');
    } catch (downloadException) {
      console.error(
        'No se pudo descargar el informe de inventario',
        downloadException
      );
      setReportError(
        'No se pudo descargar el informe de inventario. Intenta nuevamente.'
      );
    } finally {
      setDownloadingReport(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <h1 className="text-xl font-semibold text-slate-900">Inventario</h1>
          <p className="text-sm text-slate-500">
            Administra el maestro de SKU, las ubicaciones y ejecuta el barrido
            ciego del inventario.
          </p>
          {reportError ? (
            <p className="text-sm text-red-600">{reportError}</p>
          ) : null}
        </div>
        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={handleDownloadReport}
            disabled={downloadingReport}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
          >
            <Download className="h-4 w-4" />
            {downloadingReport ? 'Generando…' : 'Descargar informe PDF'}
          </button>
          <div className="inline-flex rounded-md border border-slate-200 bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setActiveSection('master')}
              className={`rounded-md px-4 py-2 text-sm font-medium transition ${
                activeSection === 'master'
                  ? 'bg-white text-slate-900 shadow'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Maestro & Etiquetas
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('counts')}
              className={`rounded-md px-4 py-2 text-sm font-medium transition ${
                activeSection === 'counts'
                  ? 'bg-white text-slate-900 shadow'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Conteo ciego
            </button>
          </div>
        </div>
      </div>

      {activeSection === 'master' ? (
        <>
          {(actionMessage || actionError || loadError) && (
            <div className="space-y-2">
              {actionMessage && (
                <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
                  {actionMessage}
                </div>
              )}
              {(actionError || loadError) && (
                <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">
                  {actionError ?? loadError}
                </div>
              )}
            </div>
          )}

          <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Importar maestro de SKU
                </h2>
                <p className="text-sm text-slate-500">
                  Carga un CSV con columnas code, name, uom, length, width,
                  height y weight para mantener el maestro actualizado.
                </p>
              </div>
              <label className="inline-flex cursor-pointer items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50">
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleSkuImport}
                  disabled={uploading}
                />
                {uploading ? 'Importando…' : 'Seleccionar CSV'}
              </label>
            </div>
            <div className="mt-4 text-xs text-slate-400">
              Última actualización: {new Date().toLocaleString('es-ES')}
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-slate-900">
                Generar ubicaciones masivas
              </h2>
              <p className="text-sm text-slate-500">
                Define un rango de filas, niveles y posiciones para crear todas
                las ubicaciones en bloque dentro de una zona y rack.
              </p>
            </div>
            <form
              className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
              onSubmit={handleBulkSubmit}
            >
              <div className="flex flex-col gap-1">
                <label
                  className="text-xs font-semibold uppercase text-slate-500"
                  htmlFor="zoneCode"
                >
                  Código de zona
                </label>
                <input
                  id="zoneCode"
                  name="zoneCode"
                  value={bulkForm.zoneCode}
                  onChange={handleBulkChange}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </div>
              <div className="flex flex-col gap-1">
                <label
                  className="text-xs font-semibold uppercase text-slate-500"
                  htmlFor="zoneName"
                >
                  Nombre de zona
                </label>
                <input
                  id="zoneName"
                  name="zoneName"
                  value={bulkForm.zoneName}
                  onChange={handleBulkChange}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label
                  className="text-xs font-semibold uppercase text-slate-500"
                  htmlFor="rackCode"
                >
                  Código de rack
                </label>
                <input
                  id="rackCode"
                  name="rackCode"
                  value={bulkForm.rackCode}
                  onChange={handleBulkChange}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </div>
              <div className="flex flex-col gap-1">
                <label
                  className="text-xs font-semibold uppercase text-slate-500"
                  htmlFor="rackName"
                >
                  Nombre de rack
                </label>
                <input
                  id="rackName"
                  name="rackName"
                  value={bulkForm.rackName}
                  onChange={handleBulkChange}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label
                  className="text-xs font-semibold uppercase text-slate-500"
                  htmlFor="rowStart"
                >
                  Fila inicial
                </label>
                <input
                  id="rowStart"
                  name="rowStart"
                  value={bulkForm.rowStart}
                  onChange={handleBulkChange}
                  type="number"
                  min={0}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label
                  className="text-xs font-semibold uppercase text-slate-500"
                  htmlFor="rowEnd"
                >
                  Fila final
                </label>
                <input
                  id="rowEnd"
                  name="rowEnd"
                  value={bulkForm.rowEnd}
                  onChange={handleBulkChange}
                  type="number"
                  min={0}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label
                  className="text-xs font-semibold uppercase text-slate-500"
                  htmlFor="levelStart"
                >
                  Nivel inicial
                </label>
                <input
                  id="levelStart"
                  name="levelStart"
                  value={bulkForm.levelStart}
                  onChange={handleBulkChange}
                  type="number"
                  min={0}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label
                  className="text-xs font-semibold uppercase text-slate-500"
                  htmlFor="levelEnd"
                >
                  Nivel final
                </label>
                <input
                  id="levelEnd"
                  name="levelEnd"
                  value={bulkForm.levelEnd}
                  onChange={handleBulkChange}
                  type="number"
                  min={0}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label
                  className="text-xs font-semibold uppercase text-slate-500"
                  htmlFor="positionStart"
                >
                  Posición inicial
                </label>
                <input
                  id="positionStart"
                  name="positionStart"
                  value={bulkForm.positionStart}
                  onChange={handleBulkChange}
                  type="number"
                  min={0}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label
                  className="text-xs font-semibold uppercase text-slate-500"
                  htmlFor="positionEnd"
                >
                  Posición final
                </label>
                <input
                  id="positionEnd"
                  name="positionEnd"
                  value={bulkForm.positionEnd}
                  onChange={handleBulkChange}
                  type="number"
                  min={0}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div className="md:col-span-2 lg:col-span-3">
                <button
                  type="submit"
                  className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
                  disabled={bulkSaving}
                >
                  {bulkSaving ? 'Generando…' : 'Crear ubicaciones'}
                </button>
                {bulkError && (
                  <p className="mt-2 text-sm text-rose-600">{bulkError}</p>
                )}
              </div>
            </form>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Wizard de etiquetado
                </h2>
                <p className="text-sm text-slate-500">
                  Selecciona SKU o ubicaciones para emitir el PDF de etiquetas
                  Code-128 y actualiza el estado de instalación.
                </p>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <input
                    type="radio"
                    value="SKU"
                    checked={selectedType === 'SKU'}
                    onChange={() => setSelectedType('SKU')}
                  />
                  SKU
                </label>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <input
                    type="radio"
                    value="LOCATION"
                    checked={selectedType === 'LOCATION'}
                    onChange={() => setSelectedType('LOCATION')}
                  />
                  Ubicaciones
                </label>
              </div>
            </div>

            <div className="mb-4 grid gap-4 md:grid-cols-3">
              <div className="rounded-md border border-slate-200 p-4">
                <p className="text-xs uppercase text-slate-500">Zonas</p>
                <p className="text-2xl font-semibold text-slate-900">
                  {totalZones}
                </p>
              </div>
              <div className="rounded-md border border-slate-200 p-4">
                <p className="text-xs uppercase text-slate-500">
                  Ubicaciones totales
                </p>
                <p className="text-2xl font-semibold text-slate-900">
                  {totalLocations}
                </p>
              </div>
              <div className="rounded-md border border-slate-200 p-4">
                <p className="text-xs uppercase text-slate-500">Instaladas</p>
                <p className="text-2xl font-semibold text-slate-900">
                  {installedLocations}
                </p>
              </div>
            </div>

            <div className="mb-4 overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-left">
                      <input
                        type="checkbox"
                        checked={
                          selectedType === 'SKU'
                            ? allSkusSelected
                            : allLocationsSelected
                        }
                        onChange={(event) =>
                          handleSelectAll(event.target.checked)
                        }
                        aria-label="Seleccionar todos"
                      />
                    </th>
                    {selectedType === 'SKU' ? (
                      <>
                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Código
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Nombre
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          UoM
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Dimensiones (L × W × H)
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Peso
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Impreso
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Instalado
                        </th>
                      </>
                    ) : (
                      <>
                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Código ZRNP
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Zona
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Rack
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Fila
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Nivel
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Posición
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Esperado
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Impreso
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Instalado
                        </th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {loading ? (
                    <tr>
                      <td
                        colSpan={columnCount}
                        className="px-3 py-8 text-center text-sm text-slate-500"
                      >
                        Cargando información…
                      </td>
                    </tr>
                  ) : selectedType === 'SKU' ? (
                    skus.length > 0 ? (
                      skus.map((sku) => (
                        <tr key={sku.id}>
                          <td className="px-3 py-2">
                            <input
                              type="checkbox"
                              checked={selectedSkuIds.includes(sku.id)}
                              onChange={() => toggleSkuSelection(sku.id)}
                              aria-label={`Seleccionar SKU ${sku.code}`}
                            />
                          </td>
                          <td className="px-3 py-2 text-sm font-medium text-slate-900">
                            {sku.code}
                          </td>
                          <td className="px-3 py-2 text-sm text-slate-700">
                            {sku.name}
                          </td>
                          <td className="px-3 py-2 text-sm text-slate-700">
                            {sku.uom}
                          </td>
                          <td className="px-3 py-2 text-sm text-slate-700">
                            {`${formatNumber(sku.length)} × ${formatNumber(sku.width)} × ${formatNumber(sku.height)}`}
                          </td>
                          <td className="px-3 py-2 text-sm text-slate-700">
                            {formatNumber(sku.weight)}
                          </td>
                          <td className="px-3 py-2 text-sm text-slate-500">
                            {formatDateTime(sku.label?.printedAt)}
                          </td>
                          <td className="px-3 py-2 text-sm text-slate-500">
                            {formatDateTime(sku.label?.installedAt)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={columnCount}
                          className="px-3 py-8 text-center text-sm text-slate-500"
                        >
                          No hay SKUs cargados para este proyecto.
                        </td>
                      </tr>
                    )
                  ) : locations.length > 0 ? (
                    locations.map((location) => (
                      <tr key={location.id}>
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked={selectedLocationIds.includes(location.id)}
                            onChange={() =>
                              toggleLocationSelection(location.id)
                            }
                            aria-label={`Seleccionar ubicación ${location.codeZRNP}`}
                          />
                        </td>
                        <td className="px-3 py-2 text-sm font-medium text-slate-900">
                          {location.codeZRNP}
                        </td>
                        <td className="px-3 py-2 text-sm text-slate-700">
                          {location.zone.name}
                        </td>
                        <td className="px-3 py-2 text-sm text-slate-700">
                          {location.rack.name}
                        </td>
                        <td className="px-3 py-2 text-sm text-slate-700">
                          {location.row}
                        </td>
                        <td className="px-3 py-2 text-sm text-slate-700">
                          {location.level}
                        </td>
                        <td className="px-3 py-2 text-sm text-slate-700">
                          {location.pos}
                        </td>
                        <td className="px-3 py-2 text-sm text-slate-700">
                          {formatNumber(location.expectedQty)}
                        </td>
                        <td className="px-3 py-2 text-sm text-slate-500">
                          {formatDateTime(location.label?.printedAt)}
                        </td>
                        <td className="px-3 py-2 text-sm text-slate-500">
                          {formatDateTime(location.label?.installedAt)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={columnCount}
                        className="px-3 py-8 text-center text-sm text-slate-500"
                      >
                        No hay ubicaciones registradas. Genera rangos en la
                        sección anterior.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleGeneratePdf}
                className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
                disabled={generating || selectedIds.length === 0}
              >
                {generating ? 'Generando…' : 'Generar PDF'}
              </button>
              <button
                type="button"
                onClick={handleMarkInstalled}
                className="inline-flex items-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
                disabled={installing || selectedLabelIds.length === 0}
              >
                {installing ? 'Actualizando…' : 'Marcar instaladas'}
              </button>
              <span className="text-sm text-slate-500">
                Seleccionados: {selectedIds.length}. Con etiqueta emitida:{' '}
                {selectedLabelIds.length}.
              </span>
            </div>
          </section>
        </>
      ) : (
        <BlindCountSection
          projectId={projectId}
          skus={skus}
          locations={locations}
          zones={zones}
          loadingMaster={loading}
        />
      )}
    </div>
  );
};

export default InventoryTab;
