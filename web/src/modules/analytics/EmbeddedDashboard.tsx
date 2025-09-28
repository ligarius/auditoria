import { useEffect, useMemo, useState } from 'react';

import api from '../../lib/api';
import { getErrorMessage } from '../../lib/errors';

interface EmbeddedDashboardProps {
  projectId: string;
  companyId: string;
  dashboardId: string | number;
  datasetIds?: Array<string | number>;
  height?: number;
}

interface GuestTokenResponse {
  embedUrl: string;
  token: string;
  expiresAt?: string;
}

export function EmbeddedDashboard({
  projectId,
  companyId,
  dashboardId,
  datasetIds,
  height = 720
}: EmbeddedDashboardProps) {
  const [state, setState] = useState<{
    loading: boolean;
    error: string | null;
    data: GuestTokenResponse | null;
  }>({ loading: true, error: null, data: null });

  const datasetKey = useMemo(
    () => (datasetIds && datasetIds.length > 0 ? datasetIds.join(',') : ''),
    [datasetIds]
  );

  useEffect(() => {
    if (!projectId || !companyId) {
      return;
    }

    let cancelled = false;
    setState((prev) => ({ ...prev, loading: true, error: null }));

    api
      .post<GuestTokenResponse>('/analytics/superset/guest-token', {
        projectId,
        companyId,
        dashboardId,
        datasetIds
      })
      .then((response) => {
        if (cancelled) return;
        setState({ loading: false, error: null, data: response.data ?? null });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setState({
          loading: false,
          error: getErrorMessage(error, 'No se pudo cargar el dashboard'),
          data: null
        });
      });

    return () => {
      cancelled = true;
    };
  }, [projectId, companyId, dashboardId, datasetKey]);

  if (state.loading) {
    return (
      <div className="flex h-full items-center justify-center rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-500">
        Cargando dashboard...
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="flex h-full flex-col justify-center gap-2 rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        <p>{state.error}</p>
        <p>Verifica que Superset esté en ejecución y el token esté habilitado.</p>
      </div>
    );
  }

  if (!state.data?.embedUrl) {
    return (
      <div className="flex h-full items-center justify-center rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-500">
        No se pudo obtener la URL de Superset.
      </div>
    );
  }

  return (
    <iframe
      key={state.data.embedUrl}
      title="Dashboard Superset"
      src={state.data.embedUrl}
      className="w-full rounded-lg border border-slate-200 shadow"
      style={{ height }}
      allow="fullscreen"
    />
  );
}
