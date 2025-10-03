import 'chart.js/auto';
import type { ChartConfiguration } from 'chart.js';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import dayjs from 'dayjs';
import * as puppeteer from 'puppeteer';
import { type ProjectWorkflowState as ProjectWorkflowStateType } from '@prisma/client';

import { prisma } from '../../core/config/db.js';
import { HttpError } from '../../core/errors/http-error.js';

const chartRenderer = new ChartJSNodeCanvas({
  width: 960,
  height: 420,
  backgroundColour: '#ffffff'
});

const STATUS_LABELS: Record<ProjectWorkflowStateType, string> = {
  planificacion: 'Planificación',
  recoleccion_datos: 'Recolección de datos',
  analisis: 'Análisis',
  recomendaciones: 'Recomendaciones',
  cierre: 'Cierre'
};

const STATUS_COLORS: Record<ProjectWorkflowStateType, string> = {
  planificacion: '#0ea5e9',
  recoleccion_datos: '#6366f1',
  analisis: '#2563eb',
  recomendaciones: '#f97316',
  cierre: '#16a34a'
};

const numberFormatter = new Intl.NumberFormat('es-CL', {
  maximumFractionDigits: 2
});

const formatDate = (value?: string | Date | null) =>
  value ? dayjs(value).format('DD [de] MMMM YYYY') : 'Sin definir';

const escapeHtml = (value: string | null | undefined) =>
  (value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const renderChart = async (config: ChartConfiguration) => {
  return chartRenderer.renderToDataURL(config);
};

const buildRiskBuckets = (
  risks: Array<{ severity: number | null; rag: string | null }>
) => {
  const buckets = { alto: 0, medio: 0, bajo: 0 };
  for (const risk of risks) {
    if (risk.rag) {
      const rag = risk.rag.toLowerCase();
      if (rag.includes('red') || rag.includes('alto')) {
        buckets.alto += 1;
        continue;
      }
      if (rag.includes('amber') || rag.includes('medio')) {
        buckets.medio += 1;
        continue;
      }
      if (rag.includes('green') || rag.includes('bajo')) {
        buckets.bajo += 1;
        continue;
      }
    }
    const severity = risk.severity ?? 0;
    if (severity >= 8) buckets.alto += 1;
    else if (severity >= 4) buckets.medio += 1;
    else buckets.bajo += 1;
  }
  return buckets;
};

const buildFindingBuckets = (findings: Array<{ status: string | null }>) => {
  const buckets = { abiertos: 0, enProgreso: 0, cerrados: 0 };
  for (const finding of findings) {
    const status = (finding.status ?? '').toLowerCase();
    if (status.includes('cerr') || status.includes('closed')) {
      buckets.cerrados += 1;
    } else if (status.includes('prog') || status.includes('progress')) {
      buckets.enProgreso += 1;
    } else {
      buckets.abiertos += 1;
    }
  }
  return buckets;
};

export async function generateProjectReportPdf(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      company: { select: { name: true } },
      tasks: {
        select: {
          id: true,
          name: true,
          progress: true,
          startDate: true,
          endDate: true
        },
        orderBy: { startDate: 'asc' }
      },
      kpis: {
        select: { id: true, name: true, value: true, unit: true, date: true },
        orderBy: { date: 'desc' }
      },
      risks: {
        select: { id: true, severity: true, rag: true, description: true }
      },
      findings: {
        select: {
          id: true,
          title: true,
          status: true,
          impact: true,
          recommendation: true,
          targetDate: true
        }
      },
      surveys: { select: { id: true } }
    }
  });

  if (!project) {
    throw new HttpError(404, 'Proyecto no encontrado');
  }

  const status = project.status as ProjectWorkflowStateType;
  const statusLabel = STATUS_LABELS[status] ?? project.status;
  const statusColor = STATUS_COLORS[status] ?? '#0ea5e9';

  const taskCount = project.tasks.length;
  const completedTasks = project.tasks.filter(
    (task) => (task.progress ?? 0) >= 100
  ).length;
  const averageProgress = taskCount
    ? Math.round(
        project.tasks.reduce(
          (acc, task) => acc + Math.max(0, task.progress ?? 0),
          0
        ) / taskCount
      )
    : 0;

  const findingBuckets = buildFindingBuckets(project.findings);
  const riskBuckets = buildRiskBuckets(project.risks);

  const tasksByStart = [...project.tasks].sort((a, b) => {
    const aTime = a.startDate ? new Date(a.startDate).getTime() : 0;
    const bTime = b.startDate ? new Date(b.startDate).getTime() : 0;
    return aTime - bTime;
  });
  const timelineLabels = tasksByStart.length
    ? tasksByStart.map(
        (task, index) => `${index + 1}. ${escapeHtml(task.name)}`
      )
    : ['Sin tareas registradas'];
  const timelineData = tasksByStart.length
    ? tasksByStart.map((task) => Math.min(100, Math.max(0, task.progress ?? 0)))
    : [0];

  const timelineChartConfig: ChartConfiguration<'line'> = {
    type: 'line',
    data: {
      labels: timelineLabels,
      datasets: [
        {
          label: 'Progreso de tareas (%)',
          data: timelineData,
          borderColor: '#2563eb',
          borderWidth: 3,
          fill: true,
          backgroundColor: 'rgba(37, 99, 235, 0.15)',
          tension: 0.35
        }
      ]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        y: {
          min: 0,
          max: 100,
          ticks: {
            stepSize: 20,
            callback: (value) => `${value}%`
          }
        }
      }
    }
  };

  const findingsChartConfig: ChartConfiguration<'bar'> = {
    type: 'bar',
    data: {
      labels: ['Abiertos', 'En progreso', 'Cerrados'],
      datasets: [
        {
          label: 'Hallazgos',
          data: [
            findingBuckets.abiertos,
            findingBuckets.enProgreso,
            findingBuckets.cerrados
          ],
          backgroundColor: ['#f97316', '#0ea5e9', '#16a34a'],
          borderRadius: 6
        }
      ]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { stepSize: 1 }
        }
      }
    }
  };

  const risksChartConfig: ChartConfiguration<'doughnut'> = {
    type: 'doughnut',
    data: {
      labels: ['Alto', 'Medio', 'Bajo'],
      datasets: [
        {
          data: [riskBuckets.alto, riskBuckets.medio, riskBuckets.bajo],
          backgroundColor: ['#dc2626', '#facc15', '#16a34a']
        }
      ]
    },
    options: {
      plugins: {
        legend: { position: 'bottom' }
      },
      cutout: '55%'
    }
  };

  const [timelineChart, findingsChart, risksChart] = await Promise.all([
    renderChart(timelineChartConfig),
    renderChart(findingsChartConfig),
    renderChart(risksChartConfig)
  ]);

  const kpiRows = project.kpis.slice(0, 8);
  const findingsSorted = [...project.findings].sort((a, b) => {
    const aTime = a.targetDate
      ? new Date(a.targetDate).getTime()
      : Number.POSITIVE_INFINITY;
    const bTime = b.targetDate
      ? new Date(b.targetDate).getTime()
      : Number.POSITIVE_INFINITY;
    if (aTime === bTime) {
      return a.title.localeCompare(b.title, 'es');
    }
    return aTime - bTime;
  });

  const topFindings = findingsSorted.slice(0, 5);

  const html = `<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <title>Reporte ejecutivo - ${escapeHtml(project.name)}</title>
    <style>
      @page {
        margin: 20mm 18mm 24mm 18mm;
      }
      body {
        font-family: 'Inter', 'Segoe UI', sans-serif;
        margin: 0;
        color: #111827;
        background: #f8fafc;
      }
      h1, h2, h3, h4 {
        color: #0f172a;
        margin: 0;
      }
      .cover {
        background: linear-gradient(135deg, ${statusColor} 0%, rgba(15, 23, 42, 0.9) 100%);
        color: white;
        padding: 48px 48px 56px;
        border-radius: 0 0 32px 32px;
      }
      .badge {
        display: inline-flex;
        padding: 6px 16px;
        border-radius: 999px;
        font-size: 12px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        background: rgba(255,255,255,0.16);
        margin-bottom: 24px;
      }
      .cover h1 {
        font-size: 36px;
        margin-bottom: 12px;
      }
      .cover p {
        font-size: 16px;
        margin: 6px 0;
      }
      .meta-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
        gap: 16px;
        margin-top: 24px;
      }
      .meta-card {
        padding: 14px 18px;
        border-radius: 16px;
        background: rgba(255, 255, 255, 0.14);
      }
      .meta-card span {
        display: block;
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        opacity: 0.8;
      }
      main {
        padding: 32px 48px 48px;
      }
      section {
        margin-bottom: 36px;
      }
      .section-title {
        font-size: 24px;
        margin-bottom: 12px;
      }
      .section-subtitle {
        font-size: 14px;
        color: #475569;
        margin-bottom: 20px;
      }
      .toc ol {
        padding-left: 20px;
        margin: 0;
        line-height: 1.6;
      }
      .grid-cards {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 16px;
      }
      .card {
        background: white;
        border-radius: 18px;
        padding: 18px;
        box-shadow: 0 10px 24px rgba(15, 23, 42, 0.06);
        border: 1px solid rgba(148, 163, 184, 0.18);
      }
      .card h3 {
        font-size: 14px;
        margin-bottom: 8px;
        color: #475569;
      }
      .card strong {
        font-size: 22px;
      }
      figure {
        margin: 0;
      }
      figure img {
        width: 100%;
        border-radius: 18px;
        box-shadow: 0 16px 32px rgba(15, 23, 42, 0.12);
      }
      figure figcaption {
        margin-top: 10px;
        font-size: 13px;
        color: #64748b;
      }
      .chart-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
        gap: 24px;
        margin-top: 20px;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        overflow: hidden;
        border-radius: 18px;
        box-shadow: 0 12px 28px rgba(15, 23, 42, 0.08);
      }
      th {
        text-align: left;
        background: #e2e8f0;
        padding: 12px 16px;
        font-size: 13px;
        color: #0f172a;
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }
      td {
        padding: 12px 16px;
        font-size: 13px;
        color: #1f2937;
      }
      tr:nth-child(even) td {
        background: #f8fafc;
      }
      .list {
        list-style: none;
        padding-left: 0;
        margin: 0;
        display: grid;
        gap: 12px;
      }
      .list li {
        background: white;
        border-radius: 16px;
        padding: 14px 16px;
        border: 1px solid rgba(203, 213, 225, 0.6);
      }
      .list h4 {
        font-size: 15px;
        margin-bottom: 4px;
      }
      .muted {
        color: #64748b;
        font-size: 13px;
      }
    </style>
  </head>
  <body>
    <header class="cover">
      <div class="badge">${statusLabel}</div>
      <h1>Informe ejecutivo · ${escapeHtml(project.name)}</h1>
      <p>${escapeHtml(project.company?.name ?? 'Proyecto sin empresa asociada')}</p>
      <p>Periodo: ${formatDate(project.startDate)} — ${formatDate(project.endDate)}</p>
      <div class="meta-grid">
        <div class="meta-card">
          <span>Estado</span>
          <strong>${statusLabel}</strong>
        </div>
        <div class="meta-card">
          <span>Avance promedio</span>
          <strong>${averageProgress}%</strong>
        </div>
        <div class="meta-card">
          <span>Encuestas activas</span>
          <strong>${project.surveys.length}</strong>
        </div>
        <div class="meta-card">
          <span>Hallazgos totales</span>
          <strong>${project.findings.length}</strong>
        </div>
      </div>
    </header>
    <main>
      <section class="toc" id="indice">
        <h2 class="section-title">Índice</h2>
        <ol>
          <li><a href="#resumen">Resumen ejecutivo</a></li>
          <li><a href="#metricas">Indicadores clave</a></li>
          <li><a href="#graficos">KPIs y evolución</a></li>
          <li><a href="#hallazgos">Hallazgos relevantes</a></li>
          <li><a href="#riesgos">Gestión de riesgos</a></li>
          <li><a href="#plan">Plan y próximos pasos</a></li>
        </ol>
      </section>

      <section id="resumen">
        <h2 class="section-title">Resumen ejecutivo</h2>
        <p class="section-subtitle">
          Estado general del proyecto y focos inmediatos para el equipo auditor y el cliente.
        </p>
        <div class="grid-cards">
          <div class="card">
            <h3>Progreso global</h3>
            <strong>${averageProgress}%</strong>
            <p class="muted">Promedio de avance de ${taskCount} tareas planificadas.</p>
          </div>
          <div class="card">
            <h3>Hallazgos críticos</h3>
            <strong>${findingBuckets.abiertos}</strong>
            <p class="muted">Hallazgos abiertos pendientes de cierre.</p>
          </div>
          <div class="card">
            <h3>Riesgos altos</h3>
            <strong>${riskBuckets.alto}</strong>
            <p class="muted">Riesgos con severidad alta o RAG en rojo.</p>
          </div>
          <div class="card">
            <h3>Encuestas & feedback</h3>
            <strong>${project.surveys.length}</strong>
            <p class="muted">Instrumentos activos para stakeholders.</p>
          </div>
        </div>
      </section>

      <section id="metricas">
        <h2 class="section-title">Indicadores clave</h2>
        <p class="section-subtitle">KPIs principales monitoreados durante el proyecto.</p>
        <table>
          <thead>
            <tr><th>Indicador</th><th>Valor</th><th>Fecha</th></tr>
          </thead>
          <tbody>
            ${
              kpiRows.length
                ? kpiRows
                    .map(
                      (kpi) => `
                <tr>
                  <td>${escapeHtml(kpi.name)}</td>
                  <td>${numberFormatter.format(kpi.value)}${kpi.unit ? ` ${escapeHtml(kpi.unit)}` : ''}</td>
                  <td>${formatDate(kpi.date)}</td>
                </tr>`
                    )
                    .join('')
                : '<tr><td colspan="3">Sin KPIs registrados para este periodo.</td></tr>'
            }
          </tbody>
        </table>
      </section>

      <section id="graficos">
        <h2 class="section-title">KPIs y evolución</h2>
        <figure>
          <img src="${timelineChart}" alt="Evolución del plan" />
          <figcaption>Progreso semanal de tareas clave.</figcaption>
        </figure>
        <div class="chart-grid">
          <figure>
            <img src="${findingsChart}" alt="Distribución de hallazgos" />
            <figcaption>Estado de los hallazgos levantados.</figcaption>
          </figure>
          <figure>
            <img src="${risksChart}" alt="Riesgos por severidad" />
            <figcaption>Distribución de riesgos según severidad.</figcaption>
          </figure>
        </div>
      </section>

      <section id="hallazgos">
        <h2 class="section-title">Hallazgos relevantes</h2>
        <p class="section-subtitle">Top ${topFindings.length} hallazgos priorizados para seguimiento.</p>
        <ul class="list">
          ${
            topFindings.length
              ? topFindings
                  .map(
                    (finding) => `
            <li>
              <h4>${escapeHtml(finding.title)}</h4>
              <p class="muted">Estado: ${escapeHtml(finding.status ?? 'Pendiente')}</p>
              ${finding.impact ? `<p>${escapeHtml(finding.impact)}</p>` : ''}
              ${finding.recommendation ? `<p class="muted">Recomendación: ${escapeHtml(finding.recommendation)}</p>` : ''}
            </li>`
                  )
                  .join('')
              : '<li>No se han registrado hallazgos para este periodo.</li>'
          }
        </ul>
      </section>

      <section id="riesgos">
        <h2 class="section-title">Gestión de riesgos</h2>
        <p class="section-subtitle">
          ${riskBuckets.alto + riskBuckets.medio + riskBuckets.bajo} riesgos activos clasificados por severidad.
        </p>
        <div class="grid-cards">
          <div class="card">
            <h3>Riesgos altos</h3>
            <strong>${riskBuckets.alto}</strong>
            <p class="muted">Requieren planes de mitigación inmediatos.</p>
          </div>
          <div class="card">
            <h3>Riesgos medios</h3>
            <strong>${riskBuckets.medio}</strong>
            <p class="muted">Monitoreo frecuente y dueños asignados.</p>
          </div>
          <div class="card">
            <h3>Riesgos bajos</h3>
            <strong>${riskBuckets.bajo}</strong>
            <p class="muted">Mantener controles y revisión mensual.</p>
          </div>
        </div>
      </section>

      <section id="plan">
        <h2 class="section-title">Plan y próximos pasos</h2>
        <p class="section-subtitle">
          ${completedTasks} de ${taskCount} tareas se encuentran completadas. Próximas actividades relevantes:
        </p>
        <ul class="list">
          ${
            tasksByStart.slice(0, 6).length
              ? tasksByStart
                  .slice(0, 6)
                  .map(
                    (task) => `
            <li>
              <h4>${escapeHtml(task.name)}</h4>
              <p class="muted">${formatDate(task.startDate)} → ${formatDate(task.endDate)} · ${Math.round(Math.max(0, task.progress ?? 0))}%</p>
            </li>`
                  )
                  .join('')
              : '<li>No hay planificaciones registradas.</li>'
          }
        </ul>
      </section>
    </main>
  </body>
</html>`;

  let browser: puppeteer.Browser | null = null;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await page.emulateMediaType('screen');
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '16mm', bottom: '18mm', left: '14mm', right: '14mm' }
    });
    return pdf;
  } finally {
    await browser?.close();
  }
}
