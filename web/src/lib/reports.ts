import api from './api';

export type ModuleReportType = 'diagnostico' | '5s' | 'inventario' | 'rutas' | 'final';

const sanitizeFilename = (value: string) => {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/(^-|-$)/g, '')
    .toLowerCase();
};

export const downloadModuleReport = async (
  projectId: string,
  type: ModuleReportType,
  displayName?: string,
) => {
  const response = await api.get(`/reports/${type}/projects/${projectId}.pdf`, {
    responseType: 'blob',
  });

  const blob = new Blob([response.data], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  const suffix = sanitizeFilename(displayName ?? type);
  anchor.download = `informe-${suffix || type}-${projectId}.pdf`;
  anchor.click();
  URL.revokeObjectURL(url);
};
