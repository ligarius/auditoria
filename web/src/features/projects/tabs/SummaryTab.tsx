import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { ES } from '../../../i18n/es';
import WorkflowPanel from '../../../modules/projects/WorkflowPanel';
import api from '../../../lib/api';
import { getErrorMessage } from '../../../lib/errors';

interface SummaryResponse {
  project: {
    id: string;
    name: string;
    status: string;
    startDate?: string | null;
    endDate?: string | null;
    company?: { id: string; name: string } | null;
  };
  sections: {
    preKickoff: { total: number; pending: number; overdue: number };
    surveys: {
      total: number;
      active: number;
      questions: number;
      responses: number;
    };
    interviews: { total: number };
    processes: { deliverables: number; featuresEnabled: number };
    systems: {
      inventory: number;
      integrations: number;
      coverage: number;
      gaps: number;
      averageCoverage: number | null;
      dataQuality: number;
    };
    security: {
      posture: number;
      openVulnerabilities: number;
      performance: number;
      costs: number;
      totalTco: number;
    };
    risks: { total: number; critical: number };
    findings: { total: number; open: number };
    poc: { total: number; active: number };
    decisions: { total: number };
    kpis: {
      total: number;
      latest: { id: string; name: string; value: number; unit?: string | null; date: string } | null;
    };
    gantt: {
      total: number;
      late: number;
      next: { id: string; name: string; startDate: string } | null;
    };
  };
}

interface SummaryTabProps {
  projectId: string;
}

const TAB_PATHS: Record<string, string> = {
  preKickoff: 'prekickoff',
  surveys: 'surveys',
  interviews: 'interviews',
  processes: 'procesos',
  systems: 'systems',
  security: 'security',
  risks: 'risks',
  findings: 'findings',
  poc: 'poc',
  decisions: 'decisions',
  kpis: 'kpis',
  export: 'export',
  gantt: 'plan',
};

const formatDate = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString() : 'Sin definir';

const formatPercent = (value: number | null) =>
  typeof value === 'number' ? `${Math.round(value)}%` : 'Sin datos';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);

const statusLabel = (value: string) => {
  const key = value?.toLowerCase?.() as keyof typeof ES.projectStatus;
  return ES.projectStatus[key] ?? value;
};

const statusTooltip = (value: string) => {
  const key = value?.toLowerCase?.() as keyof typeof ES.projectStatusDescriptions;
  return ES.projectStatusDescriptions[key];
};

export default function SummaryTab({ projectId }: SummaryTabProps) {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSummary = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const response = await api.get<SummaryResponse>(
        `/projects/${projectId}/summary`
      );
      setSummary(response.data ?? null);
      setError(null);
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'No se pudo obtener el resumen'));
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  const cards = useMemo(() => {
    if (!summary) return [];
    const { sections } = summary;
    return [
      {
        key: 'preKickoff',
        title: 'Pre-kickoff',
        description: 'Estado del checklist de información previa.',
        tab: TAB_PATHS.preKickoff,
        metrics: [
          { label: 'Pendientes', value: sections.preKickoff.pending },
          { label: 'Atrasados', value: sections.preKickoff.overdue },
          { label: 'Total', value: sections.preKickoff.total },
        ],
      },
      {
        key: 'surveys',
        title: 'Encuestas',
        description: 'Mediciones a stakeholders y tasa de respuesta.',
        tab: TAB_PATHS.surveys,
        metrics: [
          { label: 'Activas', value: sections.surveys.active },
          { label: 'Respuestas', value: sections.surveys.responses },
          { label: 'Preguntas', value: sections.surveys.questions },
        ],
      },
      {
        key: 'interviews',
        title: 'Entrevistas',
        description: 'Registro de sesiones realizadas.',
        tab: TAB_PATHS.interviews,
        metrics: [
          { label: 'Entrevistas', value: sections.interviews.total },
        ],
      },
      {
        key: 'processes',
        title: 'Procesos',
        description: 'Entregables y módulos habilitados.',
        tab: TAB_PATHS.processes,
        metrics: [
          { label: 'Entregables', value: sections.processes.deliverables },
          { label: 'Features', value: sections.processes.featuresEnabled },
        ],
      },
      {
        key: 'systems',
        title: 'Sistemas',
        description: 'Inventario y cobertura funcional.',
        tab: TAB_PATHS.systems,
        metrics: [
          { label: 'Inventario', value: sections.systems.inventory },
          { label: 'Integraciones', value: sections.systems.integrations },
          {
            label: 'Cobertura',
            value: formatPercent(sections.systems.averageCoverage),
          },
        ],
      },
      {
        key: 'security',
        title: 'Seguridad',
        description: 'Salud de controles y costos asociados.',
        tab: TAB_PATHS.security,
        metrics: [
          { label: 'Evaluaciones', value: sections.security.posture },
          { label: 'Vulnerabilidades', value: sections.security.openVulnerabilities },
          { label: 'TCO 3 años', value: formatCurrency(sections.security.totalTco) },
        ],
      },
      {
        key: 'risks',
        title: 'Riesgos',
        description: 'Mapa de riesgos priorizados.',
        tab: TAB_PATHS.risks,
        metrics: [
          { label: 'Totales', value: sections.risks.total },
          { label: 'Críticos', value: sections.risks.critical },
        ],
      },
      {
        key: 'findings',
        title: 'Hallazgos',
        description: 'Hallazgos pendientes y cerrados.',
        tab: TAB_PATHS.findings,
        metrics: [
          { label: 'Totales', value: sections.findings.total },
          { label: 'Abiertos', value: sections.findings.open },
        ],
      },
      {
        key: 'poc',
        title: 'POC',
        description: 'Pruebas de concepto en curso.',
        tab: TAB_PATHS.poc,
        metrics: [
          { label: 'Total', value: sections.poc.total },
          { label: 'Activas', value: sections.poc.active },
        ],
      },
      {
        key: 'decisions',
        title: 'Decisiones',
        description: 'Bitácora de decisiones clave.',
        tab: TAB_PATHS.decisions,
        metrics: [
          { label: 'Registradas', value: sections.decisions.total },
        ],
      },
      {
        key: 'kpis',
        title: 'KPIs',
        description: 'Seguimiento de indicadores críticos.',
        tab: TAB_PATHS.kpis,
        metrics: [
          { label: 'Indicadores', value: sections.kpis.total },
          {
            label: 'Último KPI',
            value: sections.kpis.latest
              ? `${sections.kpis.latest.name}: ${sections.kpis.latest.value} ${
                  sections.kpis.latest.unit ?? ''
                }`
              : 'Sin datos',
          },
        ],
      },
      {
        key: 'plan',
        title: 'Plan del proyecto',
        description: 'Seguimiento del plan y tareas críticas.',
        tab: TAB_PATHS.plan,
        metrics: [
          { label: 'Tareas', value: sections.gantt.total },
          { label: 'Atrasadas', value: sections.gantt.late },
          {
            label: 'Próximo hito',
            value: sections.gantt.next
              ? `${sections.gantt.next.name} · ${formatDate(
                  sections.gantt.next.startDate
                )}`
              : 'Sin próximo hito',
          },
        ],
      },
      {
        key: 'export',
        title: 'Exportación',
        description: 'Reportes ejecutivos listos para compartir.',
        tab: TAB_PATHS.export,
        metrics: [
          { label: 'Descargar', value: 'Zip + PDF' },
        ],
      },
    ];
  }, [summary]);

  const goToTab = (tabPath: string) => {
    if (!projectId) return;
    const path = tabPath ? `/projects/${projectId}/${tabPath}` : `/projects/${projectId}`;
    navigate(path);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Resumen ejecutivo</h2>
        <p className="text-sm text-slate-500">
          Vista rápida del estado del proyecto y accesos directos a cada módulo.
        </p>
      </div>

      {error && (
        <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {loading && (
        <p className="rounded border border-slate-200 bg-white p-3 text-sm text-slate-500">
          Cargando resumen del proyecto…
        </p>
      )}

      {summary && (
        <div className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  {summary.project.company?.name ?? 'Proyecto'} · {summary.project.name}
                </h3>
                <p className="text-sm text-slate-500">
                  Estado:{' '}
                  <span
                    className="font-medium text-slate-800"
                    title={statusTooltip(summary.project.status) ?? undefined}
                  >
                    {statusLabel(summary.project.status)}
                  </span>
                </p>
              </div>
              <div className="text-sm text-slate-500">
                <p>Inicio: {formatDate(summary.project.startDate)}</p>
                <p>Cierre: {formatDate(summary.project.endDate)}</p>
              </div>
            </div>
          </div>

          <WorkflowPanel projectId={summary.project.id} />

          <div className="grid gap-4 lg:grid-cols-3">
            {cards.map((card) => (
              <div
                key={card.key}
                className="flex h-full flex-col justify-between rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="space-y-2">
                  <h4 className="text-base font-semibold text-slate-900">
                    {card.title}
                  </h4>
                  <p className="text-sm text-slate-500">{card.description}</p>
                  <ul className="space-y-1 text-sm text-slate-600">
                    {card.metrics.map((metric) => (
                      <li key={`${card.key}-${metric.label}`}>
                        <span className="font-medium text-slate-800">
                          {metric.label}:
                        </span>{' '}
                        {metric.value}
                      </li>
                    ))}
                  </ul>
                </div>
                <button
                  className="mt-4 inline-flex items-center justify-center rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white"
                  onClick={() => goToTab(card.tab)}
                >
                  Ir a sección
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && !summary && !error && (
        <p className="text-sm text-slate-500">
          Selecciona un proyecto para ver su resumen ejecutivo.
        </p>
      )}
    </div>
  );
}
