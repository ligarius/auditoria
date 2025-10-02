import * as Tabs from '@radix-ui/react-tabs';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import ProjectPicker from '../components/ProjectPicker';
import { ProjectTabs } from '../features/projects/ProjectTabs';
import { PROCESS_SUBTABS } from '../features/projects/tabs/ProcessesTab';
import { ES } from '../i18n/es';
import { useAuth } from '../hooks/useAuth';
import api from '../lib/api';
import { LAST_PROJECT_KEY } from '../lib/session';

interface ProjectSummary {
  id: string;
  name: string;
  status?: string;
  company?: { id: string; name: string };
}

const TAB_TO_PATH: Record<string, string> = {
  summary: '',
  workflow: 'workflow',
  prekickoff: 'prekickoff',
  plan: 'plan',
  surveys: 'surveys',
  interviews: 'interviews',
  processes: 'procesos',
  systems: 'systems',
  fiveS: '5s',
  hse: 'hse',
  inventory: 'inventory',
  layout: 'layout',
  security: 'security',
  risks: 'risks',
  findings: 'findings',
  poc: 'poc',
  governance: 'governance',
  decisions: 'decisions',
  kpis: 'kpis',
  export: 'export',
};

const PATH_TO_TAB = Object.entries(TAB_TO_PATH).reduce<Record<string, string>>(
  (acc, [tab, path]) => {
    acc[path || '__root__'] = tab;
    return acc;
  },
  {}
);

const PROJECT_TEMPLATES = {
  distribution: {
    label: 'Distribución',
    features: ['reception', 'picking', 'dispatch'],
  },
  simple: {
    label: 'Simple',
    features: [],
  },
} as const;

type ProjectTemplateKey = keyof typeof PROJECT_TEMPLATES;

export const ProjectPage = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { role, isAuth, logout } = useAuth();

  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [companiesError, setCompaniesError] = useState<string | null>(null);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [pdfExporting, setPdfExporting] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectStatus, setNewProjectStatus] = useState('planificacion');
  const [selectedCompanyId, setSelectedCompanyId] = useState<
    string | undefined
  >(undefined);
  const [selectedTemplate, setSelectedTemplate] =
    useState<ProjectTemplateKey>('distribution');

  useEffect(() => {
    if (id) {
      localStorage.setItem(LAST_PROJECT_KEY, id);
    }
  }, [id]);

  const fetchProjects = useCallback(async () => {
    setLoadingProjects(true);
    setProjectsError(null);
    try {
      const response = await api.get<ProjectSummary[]>('/projects');
      setProjects(response.data ?? []);
    } catch (error) {
      console.error('No se pudieron cargar los proyectos', error);
      setProjectsError('No se pudieron cargar los proyectos disponibles.');
    } finally {
      setLoadingProjects(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const fetchCompanies = useCallback(async () => {
    setCompaniesError(null);
    setLoadingCompanies(true);
    try {
      const response = await api.get<{ id: string; name: string }[]>('/companies');
      const rawCompanies = Array.isArray(response.data) ? response.data : [];
      setCompanies(
        rawCompanies.map((company) => ({
          id: company.id,
          name: company.name,
        })),
      );
    } catch (error) {
      console.error('No se pudieron cargar las compañías', error);
      setCompaniesError('No se pudieron cargar las compañías disponibles.');
    } finally {
      setLoadingCompanies(false);
    }
  }, []);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  useEffect(() => {
    if (showModal) {
      setCreateError(null);
      fetchCompanies();
    }
  }, [showModal, fetchCompanies]);

  useEffect(() => {
    if (showModal && companies.length > 0) {
      setSelectedCompanyId((prev) => prev ?? companies[0]?.id);
    }
  }, [companies, showModal]);

  const currentProject = useMemo(
    () => projects.find((project) => project.id === id),
    [projects, id]
  );

  const segments = location.pathname.split('/').filter(Boolean);
  const subSegments = segments.slice(2);
  const pathKey = subSegments[0] ?? '';
  const activeTab = PATH_TO_TAB[pathKey || '__root__'] ?? 'summary';

  const canCreateProject = role === 'admin' || role === 'consultor';

  const handleLogout = () => {
    logout();
  };

  const handleExport = async () => {
    if (!id) return;
    try {
      const res = await api.get(`/export/excel`, {
        params: { projectId: id },
        responseType: 'blob',
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

  const handlePdfExport = async () => {
    if (!id) return;
    setPdfError(null);
    setPdfExporting(true);
    try {
      const response = await api.get(`/projects/${id}/report.pdf`, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `reporte-proyecto-${id}.pdf`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('No se pudo exportar el PDF', error);
      setPdfError('No se pudo generar el PDF del proyecto.');
    } finally {
      setPdfExporting(false);
    }
  };

  const handleTabChange = (value: string) => {
    if (!id) return;
    const basePath = `/projects/${id}`;
    const target = TAB_TO_PATH[value] ?? value;
    if (!target) {
      navigate(basePath);
      return;
    }
    if (value === 'processes') {
      const currentFeature = subSegments[1];
      if (currentFeature) {
        navigate(`${basePath}/${target}/${currentFeature}`);
        return;
      }
    }
    if (target === '') {
      navigate(basePath);
      return;
    }
    navigate(`${basePath}/${target}`);
  };

  const closeModal = () => {
    setShowModal(false);
    setNewProjectName('');
    setNewProjectStatus('planificacion');
    setSelectedTemplate('distribution');
    setSelectedCompanyId(undefined);
    setCreateError(null);
  };

  const handleCreateProject = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    if (!selectedCompanyId || !newProjectName.trim()) {
      setCreateError('Nombre y compañía son obligatorios.');
      return;
    }
    setCreating(true);
    setCreateError(null);
    const template = PROJECT_TEMPLATES[selectedTemplate];
    try {
      const response = await api.post('/projects', {
        name: newProjectName.trim(),
        status: newProjectStatus,
        companyId: selectedCompanyId,
        settings: { enabledFeatures: template.features },
      });
      closeModal();
      await fetchProjects();
      await fetchCompanies();
      setRefreshKey((value) => value + 1);
      const createdId = response.data?.id as string | undefined;
      if (createdId) {
        navigate(`/projects/${createdId}`, { replace: true });
        localStorage.setItem(LAST_PROJECT_KEY, createdId);
      }
    } catch (error) {
      console.error('No se pudo crear el proyecto', error);
      setCreateError('No se pudo crear el proyecto. Intenta nuevamente.');
    } finally {
      setCreating(false);
    }
  };

  const templateFeatures = PROJECT_TEMPLATES[selectedTemplate].features;

  return (
    <div className="min-h-screen p-6">
      <header className="mb-6 flex flex-wrap items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            {currentProject?.company?.name ?? 'Auditoría'} ·{' '}
            {currentProject?.name ?? 'Proyecto'}
          </h1>
          <p className="text-slate-600">Proyecto ID: {id}</p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-3">
          <ProjectPicker refreshKey={refreshKey} />
          {role === 'admin' && (
            <button
              onClick={() => navigate('/admin')}
              className="rounded bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700 hover:bg-slate-200"
            >
              Panel admin
            </button>
          )}
          {canCreateProject && (
            <button
              onClick={() => setShowModal(true)}
              className="rounded bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700 hover:bg-slate-200"
            >
              Nuevo proyecto
            </button>
          )}
          {canCreateProject && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleExport}
                className="rounded bg-slate-900 px-3 py-1 text-sm font-medium text-white"
              >
                {ES.export.zip}
              </button>
              <button
                onClick={handlePdfExport}
                disabled={pdfExporting}
                className="rounded border border-slate-300 px-3 py-1 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pdfExporting ? 'Generando…' : ES.export.pdf}
              </button>
            </div>
          )}
          {isAuth && (
            <button
              onClick={handleLogout}
              className="rounded bg-black px-3 py-1 text-sm font-medium text-white"
            >
              Cerrar sesión
            </button>
          )}
        </div>
      </header>

      {pdfError && (
        <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {pdfError}
        </div>
      )}

      {projectsError && (
        <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {projectsError}
        </div>
      )}
      {loadingProjects && (
        <div className="mb-4 rounded border border-slate-200 bg-white p-3 text-sm text-slate-500">
          Cargando proyectos...
        </div>
      )}

      <Tabs.Root
        value={activeTab}
        onValueChange={handleTabChange}
        className="space-y-4"
      >
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

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  Nuevo proyecto
                </h2>
                <p className="text-sm text-slate-500">
                  Selecciona la compañía destino y la plantilla de procesos
                  habilitados.
                </p>
              </div>
              <button
                onClick={closeModal}
                className="rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-200"
              >
                Cerrar
              </button>
            </div>
            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label
                  className="mb-1 block text-sm font-medium text-slate-700"
                  htmlFor="project-name"
                >
                  Nombre del proyecto
                </label>
                <input
                  id="project-name"
                  type="text"
                  value={newProjectName}
                  onChange={(event) => setNewProjectName(event.target.value)}
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label
                  className="mb-1 block text-sm font-medium text-slate-700"
                  htmlFor="project-status"
                >
                  Estado
                </label>
                <select
                  id="project-status"
                  value={newProjectStatus}
                  onChange={(event) => setNewProjectStatus(event.target.value)}
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                >
                  <option value="planificacion">{ES.projectStatus.planificacion}</option>
                  <option value="recoleccion_datos">{ES.projectStatus.recoleccion_datos}</option>
                  <option value="analisis">{ES.projectStatus.analisis}</option>
                  <option value="recomendaciones">{ES.projectStatus.recomendaciones}</option>
                  <option value="cierre">{ES.projectStatus.cierre}</option>
                </select>
              </div>
              <div>
                <label
                  className="mb-1 block text-sm font-medium text-slate-700"
                  htmlFor="project-company"
                >
                  Compañía
                </label>
                <select
                  id="project-company"
                  value={selectedCompanyId ?? ''}
                  onChange={(event) =>
                    setSelectedCompanyId(event.target.value || undefined)
                  }
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                  required
                  disabled={loadingCompanies || !companies.length}
                >
                  {!companies.length && (
                    <option value="">No hay compañías disponibles</option>
                  )}
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
                {loadingCompanies && (
                  <p className="mt-1 text-xs text-slate-500">
                    Cargando compañías…
                  </p>
                )}
                {companiesError && (
                  <p className="mt-1 text-xs text-red-600">{companiesError}</p>
                )}
              </div>
              <div>
                <label
                  className="mb-1 block text-sm font-medium text-slate-700"
                  htmlFor="project-template"
                >
                  Plantilla
                </label>
                <select
                  id="project-template"
                  value={selectedTemplate}
                  onChange={(event) =>
                    setSelectedTemplate(
                      event.target.value as ProjectTemplateKey
                    )
                  }
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                >
                  {Object.entries(PROJECT_TEMPLATES).map(([key, template]) => (
                    <option key={key} value={key}>
                      {template.label}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-slate-500">
                  Features habilitadas:{' '}
                  {templateFeatures.length
                    ? templateFeatures
                        .map((feature) => PROCESS_SUBTABS[feature] ?? feature)
                        .join(', ')
                    : 'Ninguna'}
                </p>
              </div>
              {createError && (
                <p className="text-sm text-red-600">{createError}</p>
              )}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded bg-slate-100 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200"
                  disabled={creating}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
                  disabled={creating || loadingCompanies || !companies.length}
                >
                  {creating ? 'Creando...' : 'Crear proyecto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
