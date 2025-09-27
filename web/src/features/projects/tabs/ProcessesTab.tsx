import * as Tabs from '@radix-ui/react-tabs';
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import api from '../../../lib/api';

const PROCESS_SUBTABS: Record<string, string> = {
  reception: 'Recepción',
  storage: 'Almacenamiento',
  picking: 'Picking',
  dispatch: 'Despacho'
};

const PROCESS_DESCRIPTIONS: Record<string, { title: string; description: string }> = {
  reception: {
    title: 'Recepción de camiones',
    description: 'Monitorea dwell time, tiempos de descarga y cuellos de botella en patio.'
  },
  storage: {
    title: 'Almacenamiento',
    description: 'Control de ubicaciones, ocupación y movimientos dentro del CD.'
  },
  picking: {
    title: 'Picking',
    description: 'Seguimiento de tareas de preparación, productividad y accuracy.'
  },
  dispatch: {
    title: 'Despacho',
    description: 'Gestión de cargas listas, documentación y SLA de salida.'
  }
};

interface ProcessesTabProps {
  projectId: string;
}

const ProcessesTab = ({ projectId }: ProcessesTabProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [enabled, setEnabled] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    api
      .get(`/projects/${projectId}/features`)
      .then((response) => {
        if (!mounted) return;
        const features = Array.isArray(response.data?.enabled) ? response.data.enabled : [];
        setEnabled(features.filter((feature): feature is string => feature in PROCESS_SUBTABS));
      })
      .catch(() => {
        if (!mounted) return;
        setEnabled([]);
        setError('No se pudieron cargar las features de procesos.');
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [projectId]);

  const availableTabs = useMemo(() => enabled.filter((feature) => PROCESS_SUBTABS[feature]), [enabled]);

  const segments = location.pathname.split('/').filter(Boolean);
  const projectIndex = segments.indexOf(projectId);
  const subSegments = projectIndex >= 0 ? segments.slice(projectIndex + 1) : [];
  const activeFeature = subSegments[1];

  useEffect(() => {
    if (loading) return;
    if (!availableTabs.length) {
      if (activeFeature) {
        navigate(`/projects/${projectId}/procesos`, { replace: true });
      }
      return;
    }
    if (!activeFeature || !availableTabs.includes(activeFeature)) {
      navigate(`/projects/${projectId}/procesos/${availableTabs[0]}`, { replace: true });
    }
  }, [activeFeature, availableTabs, loading, navigate, projectId]);

  const currentFeature = availableTabs.includes(activeFeature ?? '') ? activeFeature ?? '' : availableTabs[0] ?? '';

  const handleSubTabChange = (value: string) => {
    navigate(`/projects/${projectId}/procesos/${value}`);
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Procesos</h2>
        <p className="text-sm text-slate-500">
          Activa módulos operativos por proyecto según la operación auditada.
        </p>
      </div>

      {loading && <p className="text-sm text-slate-500">Cargando features habilitadas…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!loading && !availableTabs.length && (
        <div className="rounded-lg border border-dashed border-slate-200 p-4 text-sm text-slate-500">
          No hay sub-módulos de procesos habilitados para este proyecto.
        </div>
      )}

      {availableTabs.length > 0 && currentFeature && (
        <Tabs.Root value={currentFeature} onValueChange={handleSubTabChange} className="space-y-4">
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
            return (
              <Tabs.Content key={feature} value={feature} className="space-y-3">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">{copy?.title ?? PROCESS_SUBTABS[feature]}</h3>
                  <p className="text-sm text-slate-500">{copy?.description ?? 'Módulo operativo habilitado.'}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-500">
                  Contenido disponible próximamente para {PROCESS_SUBTABS[feature]}.
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
