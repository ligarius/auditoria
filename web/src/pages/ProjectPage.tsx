import * as Tabs from '@radix-ui/react-tabs';
import { useEffect } from 'react';
import { useParams } from 'react-router-dom';

import { ProjectTabs } from '../features/projects/ProjectTabs';
import ProjectPicker from '../components/ProjectPicker';
import { useAuth } from '../hooks/useAuth';
import api from '../lib/api';

export const ProjectPage = () => {
  const { id } = useParams();
  const { role } = useAuth();

  // Si todavía no usas ProtectedRoute, fuerza login si no hay token:
  useEffect(() => {
    if (!localStorage.getItem('token')) {
      window.location.href = '/login';
    }
  }, []);

  useEffect(() => {
    if (id) {
      localStorage.setItem('lastProjectId', id);
    }
  }, [id]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('lastProjectId');
    window.location.href = '/login';
  };

  const handleExport = async () => {
    if (!id) return;
    try {
      const res = await api.get(`/export/excel`, {
        params: { projectId: id },
        responseType: 'blob'
      });
      const blob = new Blob([res.data]);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `auditoria_${id}.zip`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('No se pudo exportar el proyecto', error);
    }
  };

  return (
    <div className="min-h-screen p-6">
      <header className="mb-6 flex items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Auditoría Nutrial</h1>
          <p className="text-slate-600">Proyecto ID: {id}</p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <ProjectPicker />
          {['admin', 'consultor'].includes(role) && (
            <button
              onClick={handleExport}
              className="px-3 py-1 rounded bg-slate-900 text-white"
            >
              Exportar
            </button>
          )}
          {localStorage.getItem('token') && (
            <button
              onClick={handleLogout}
              className="px-3 py-1 rounded bg-black text-white"
            >
              Cerrar sesión
            </button>
          )}
        </div>
      </header>

      <Tabs.Root defaultValue="prekickoff" className="space-y-4">
        <Tabs.List className="flex flex-wrap gap-2 rounded-lg bg-white p-2 shadow">
          {ProjectTabs.map((tab) => (
            <Tabs.Trigger
              key={tab.value}
              value={tab.value}
              className="rounded-md px-3 py-2 text-sm font-medium text-slate-600 data-[state=active]:bg-slate-900 data-[state=active]:text-white"
            >
              {tab.label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        {ProjectTabs.map((tab) => (
          <Tabs.Content
            key={tab.value}
            value={tab.value}
            className="rounded-lg bg-white p-6 shadow"
          >
            <tab.component projectId={id ?? ''} />
          </Tabs.Content>
        ))}
      </Tabs.Root>
    </div>
  );
};

