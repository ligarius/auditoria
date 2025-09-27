import * as Tabs from '@radix-ui/react-tabs';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '../../../hooks/useAuth';
import api from '../../../lib/api';
import { getErrorMessage } from '../../../lib/errors';

const PROCESS_SUBTABS: Record<string, string> = {
  reception: 'Recepción',
  storage: 'Almacenamiento',
  picking: 'Picking',
  dispatch: 'Despacho',
};

const PROCESS_DESCRIPTIONS: Record<
  string,
  { title: string; description: string }
> = {
  reception: {
    title: 'Recepción de camiones',
    description:
      'Monitorea dwell time, tiempos de descarga y cuellos de botella en patio.',
  },
  storage: {
    title: 'Almacenamiento',
    description:
      'Control de ubicaciones, ocupación y movimientos dentro del CD.',
  },
  picking: {
    title: 'Picking',
    description:
      'Seguimiento de tareas de preparación, productividad y accuracy.',
  },
  dispatch: {
    title: 'Despacho',
    description: 'Gestión de cargas listas, documentación y SLA de salida.',
  },
};

interface ProcessesTabProps {
  projectId: string;
}

interface ProcessAsset {
  id: string;
  projectId: string;
  type: string;
  title: string;
  url?: string | null;
  fileId?: string | null;
}

const defaultAssetForm = {
  title: '',
  url: '',
};

const ProcessesTab = ({ projectId }: ProcessesTabProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { role } = useAuth();
  const canEdit = useMemo(() => ['admin', 'consultor'].includes(role), [role]);
  const isAdmin = role === 'admin';

  const [enabled, setEnabled] = useState<string[]>([]);
  const [loadingFeatures, setLoadingFeatures] = useState(true);
  const [featuresError, setFeaturesError] = useState<string | null>(null);

  const [assets, setAssets] = useState<ProcessAsset[]>([]);
  const [assetsError, setAssetsError] = useState<string | null>(null);
  const [assetForm, setAssetForm] = useState(defaultAssetForm);
  const [editingAsset, setEditingAsset] = useState<ProcessAsset | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoadingFeatures(true);
    setFeaturesError(null);
    api
      .get(`/projects/${projectId}/features`)
      .then((response) => {
        if (!mounted) return;
        const features = Array.isArray(response.data?.enabled)
          ? response.data.enabled
          : [];
        setEnabled(
          features.filter(
            (feature): feature is string => feature in PROCESS_SUBTABS
          )
        );
      })
      .catch(() => {
        if (!mounted) return;
        setEnabled([]);
        setFeaturesError('No se pudieron cargar las features de procesos.');
      })
      .finally(() => {
        if (!mounted) return;
        setLoadingFeatures(false);
      });
    return () => {
      mounted = false;
    };
  }, [projectId]);

  const loadAssets = useCallback(async () => {
    try {
      const response = await api.get<ProcessAsset[]>(
        `/process-assets/${projectId}`
      );
      setAssets(response.data ?? []);
      setAssetsError(null);
    } catch (error: unknown) {
      setAssetsError(
        getErrorMessage(
          error,
          'No se pudieron cargar los entregables de procesos'
        )
      );
    }
  }, [projectId]);

  useEffect(() => {
    if (projectId) {
      void loadAssets();
    }
  }, [projectId, loadAssets]);

  const availableTabs = useMemo(
    () => enabled.filter((feature) => PROCESS_SUBTABS[feature]),
    [enabled]
  );

  const segments = location.pathname.split('/').filter(Boolean);
  const projectIndex = segments.indexOf(projectId);
  const subSegments = projectIndex >= 0 ? segments.slice(projectIndex + 1) : [];
  const isInProcesses = subSegments[0] === 'procesos';
  const activeFeatureFromPath = subSegments[1];

  useEffect(() => {
    if (!isInProcesses || loadingFeatures) return;
    if (!availableTabs.length) {
      if (activeFeatureFromPath) {
        navigate(`/projects/${projectId}/procesos`, { replace: true });
      }
      return;
    }
    if (
      !activeFeatureFromPath ||
      !availableTabs.includes(activeFeatureFromPath)
    ) {
      navigate(`/projects/${projectId}/procesos/${availableTabs[0]}`, {
        replace: true,
      });
    }
  }, [
    activeFeatureFromPath,
    availableTabs,
    isInProcesses,
    loadingFeatures,
    navigate,
    projectId,
  ]);

  const currentFeature = availableTabs.includes(activeFeatureFromPath ?? '')
    ? (activeFeatureFromPath ?? '')
    : (availableTabs[0] ?? '');
  const shouldRenderSubTabs =
    isInProcesses && availableTabs.length > 0 && currentFeature;

  const handleSubTabChange = (value: string) => {
    navigate(`/projects/${projectId}/procesos/${value}`);
    setAssetForm(defaultAssetForm);
    setEditingAsset(null);
  };

  const handleCreateAsset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!currentFeature) return;
    setSubmitting(true);
    try {
      await api.post(`/process-assets/${projectId}`, {
        type: currentFeature,
        title: assetForm.title,
        url: assetForm.url || undefined,
      });
      setAssetForm(defaultAssetForm);
      await loadAssets();
    } catch (error: unknown) {
      setAssetsError(getErrorMessage(error, 'No se pudo crear el entregable'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateAsset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingAsset) return;
    setSubmitting(true);
    try {
      await api.put(`/process-assets/${projectId}/${editingAsset.id}`, {
        title: editingAsset.title,
        url: editingAsset.url || undefined,
      });
      setEditingAsset(null);
      await loadAssets();
    } catch (error: unknown) {
      setAssetsError(
        getErrorMessage(error, 'No se pudo actualizar el entregable')
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAsset = async (id: string) => {
    if (!isAdmin) return;
    try {
      await api.delete(`/process-assets/${projectId}/${id}`);
      await loadAssets();
    } catch (error: unknown) {
      setAssetsError(
        getErrorMessage(error, 'No se pudo eliminar el entregable')
      );
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Procesos</h2>
        <p className="text-sm text-slate-500">
          Activa módulos operativos y gestiona los entregables clave de cada
          proceso auditado.
        </p>
      </div>

      {featuresError && <p className="text-sm text-red-600">{featuresError}</p>}
      {assetsError && <p className="text-sm text-red-600">{assetsError}</p>}

      {loadingFeatures && (
        <p className="text-sm text-slate-500">Cargando features habilitadas…</p>
      )}

      {!loadingFeatures && !availableTabs.length && (
        <div className="rounded-lg border border-dashed border-slate-200 p-4 text-sm text-slate-500">
          No hay sub-módulos de procesos habilitados para este proyecto.
        </div>
      )}

      {shouldRenderSubTabs && (
        <Tabs.Root
          value={currentFeature}
          onValueChange={handleSubTabChange}
          className="space-y-4"
        >
          <Tabs.List className="flex flex-wrap gap-2 rounded-lg bg-slate-50 p-2">
            {availableTabs.map((feature) => (
              <Tabs.Trigger
                key={feature}
                value={feature}
                className="rounded-md px-3 py-2 text-sm font-medium text-slate-600 data-[state=active]:bg-slate-900 data-[state=active]:text-white"
              >
                {PROCESS_SUBTABS[feature]}
              </Tabs.Trigger>
            ))}
          </Tabs.List>

          {availableTabs.map((feature) => {
            const copy = PROCESS_DESCRIPTIONS[feature];
            const isActive = currentFeature === feature;
            const assetsForFeature = assets.filter(
              (asset) => asset.type === feature
            );
            const editingForFeature =
              editingAsset && editingAsset.type === feature
                ? editingAsset
                : null;

            return (
              <Tabs.Content
                key={feature}
                value={feature}
                className="space-y-4 rounded-lg bg-white p-6 shadow"
              >
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    {copy?.title ?? PROCESS_SUBTABS[feature]}
                  </h3>
                  <p className="text-sm text-slate-500">
                    {copy?.description ?? 'Módulo operativo habilitado.'}
                  </p>
                </div>

                {canEdit && isActive && !editingForFeature && (
                  <form
                    onSubmit={handleCreateAsset}
                    className="grid gap-3 rounded-lg border border-slate-200 p-4"
                  >
                    <h4 className="text-base font-medium text-slate-800">
                      Nuevo entregable
                    </h4>
                    <label className="flex flex-col text-sm">
                      Nombre del entregable
                      <input
                        className="mt-1 rounded border px-3 py-2"
                        value={assetForm.title}
                        onChange={(e) =>
                          setAssetForm((prev) => ({
                            ...prev,
                            title: e.target.value,
                          }))
                        }
                        required
                      />
                    </label>
                    <label className="flex flex-col text-sm">
                      Enlace de referencia (opcional)
                      <input
                        className="mt-1 rounded border px-3 py-2"
                        value={assetForm.url}
                        onChange={(e) =>
                          setAssetForm((prev) => ({
                            ...prev,
                            url: e.target.value,
                          }))
                        }
                        placeholder="https://..."
                      />
                    </label>
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                        disabled={submitting}
                      >
                        Guardar entregable
                      </button>
                    </div>
                  </form>
                )}

                {editingForFeature && canEdit && (
                  <form
                    onSubmit={handleUpdateAsset}
                    className="grid gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-base font-medium text-slate-800">
                        Editar entregable
                      </h4>
                      <button
                        type="button"
                        className="text-sm text-blue-700 underline"
                        onClick={() => setEditingAsset(null)}
                      >
                        Cancelar
                      </button>
                    </div>
                    <label className="flex flex-col text-sm">
                      Nombre del entregable
                      <input
                        className="mt-1 rounded border px-3 py-2"
                        value={editingAsset.title}
                        onChange={(e) =>
                          setEditingAsset((prev) =>
                            prev ? { ...prev, title: e.target.value } : prev
                          )
                        }
                        required
                      />
                    </label>
                    <label className="flex flex-col text-sm">
                      Enlace de referencia (opcional)
                      <input
                        className="mt-1 rounded border px-3 py-2"
                        value={editingAsset.url ?? ''}
                        onChange={(e) =>
                          setEditingAsset((prev) =>
                            prev ? { ...prev, url: e.target.value } : prev
                          )
                        }
                        placeholder="https://..."
                      />
                    </label>
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                        disabled={submitting}
                      >
                        Actualizar
                      </button>
                    </div>
                  </form>
                )}

                <div className="space-y-2">
                  <h4 className="text-base font-semibold text-slate-900">
                    Entregables
                  </h4>
                  <div className="space-y-2">
                    {assetsForFeature.map((asset) => (
                      <div
                        key={asset.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded border border-slate-200 bg-slate-50 p-3"
                      >
                        <div>
                          <p className="text-sm font-medium text-slate-800">
                            {asset.title}
                          </p>
                          {asset.url && (
                            <a
                              href={asset.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-blue-600 underline"
                            >
                              {asset.url}
                            </a>
                          )}
                          {asset.fileId && (
                            <p className="text-xs text-slate-500">
                              Archivo adjunto disponible
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {canEdit && (
                            <button
                              onClick={() => setEditingAsset(asset)}
                              className="rounded bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
                            >
                              Editar
                            </button>
                          )}
                          {isAdmin && (
                            <button
                              onClick={() => handleDeleteAsset(asset.id)}
                              className="rounded bg-red-600 px-3 py-1 text-xs font-medium text-white"
                            >
                              Eliminar
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                    {assetsForFeature.length === 0 && (
                      <p className="text-sm text-slate-500">
                        Aún no hay entregables registrados para este proceso.
                      </p>
                    )}
                  </div>
                </div>
              </Tabs.Content>
            );
          })}
        </Tabs.Root>
      )}
    </div>
  );
};

export default ProcessesTab;
export { PROCESS_SUBTABS };
