import type { ProjectWorkflowState } from '@prisma/client';

const WORKFLOW_LABELS: Record<ProjectWorkflowState, string> = {
  planificacion: 'Planificación',
  recoleccion_datos: 'Recolección de datos',
  analisis: 'Análisis',
  recomendaciones: 'Recomendaciones',
  cierre: 'Cierre'
};

const escapeHtml = (value: unknown): string => {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

const formatDate = (value: Date | string | null | undefined) => {
  if (!value) {
    return '—';
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  return new Intl.DateTimeFormat('es-CL', {
    dateStyle: 'medium'
  }).format(date);
};

export interface ExecutiveKpiEntry {
  name: string;
  value: number;
  unit?: string | null;
  date?: Date | string | null;
}

export interface ExecutiveFindingEntry {
  title: string;
  impact: string;
  recommendation: string;
  status: string;
  targetDate?: Date | string | null;
}

export interface ExecutiveReportData {
  projectName: string;
  companyName: string;
  ownerName?: string | null;
  workflowState: ProjectWorkflowState;
  generatedAt: Date;
  kpis: ExecutiveKpiEntry[];
  findings: ExecutiveFindingEntry[];
}

export const renderExecutiveReport = (data: ExecutiveReportData) => {
  const stateLabel = WORKFLOW_LABELS[data.workflowState] ?? data.workflowState;
  const generatedAt = formatDate(data.generatedAt);

  const kpiRows = data.kpis
    .map((kpi) => {
      const unit = kpi.unit ? ` ${escapeHtml(kpi.unit)}` : '';
      return `<tr>
        <td>${escapeHtml(kpi.name)}</td>
        <td class="metric">${escapeHtml(kpi.value.toFixed(2))}${unit}</td>
        <td>${escapeHtml(formatDate(kpi.date ?? null))}</td>
      </tr>`;
    })
    .join('');

  const findingsRows = data.findings
    .map((finding) => {
      return `<div class="finding">
        <h4>${escapeHtml(finding.title)}</h4>
        <p><strong>Impacto:</strong> ${escapeHtml(finding.impact)}</p>
        <p><strong>Recomendación:</strong> ${escapeHtml(finding.recommendation)}</p>
        <p class="finding-meta"><span>${escapeHtml(finding.status)}</span> · <span>${escapeHtml(
          formatDate(finding.targetDate ?? null)
        )}</span></p>
      </div>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <title>Reporte Ejecutivo - ${escapeHtml(data.projectName)}</title>
    <style>
      body {
        font-family: 'Inter', Arial, sans-serif;
        margin: 0;
        padding: 0;
        color: #0f172a;
        background: #f8fafc;
      }
      .cover {
        background: linear-gradient(135deg, #1e293b, #334155);
        color: white;
        padding: 80px 60px;
        min-height: 320px;
      }
      .cover h1 {
        font-size: 32px;
        margin-bottom: 12px;
      }
      .cover p {
        margin: 4px 0;
        font-size: 15px;
      }
      .badge {
        display: inline-block;
        margin-top: 16px;
        padding: 8px 16px;
        background: rgba(255,255,255,0.15);
        border-radius: 999px;
        font-weight: 600;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        font-size: 12px;
      }
      .content {
        padding: 40px 60px 60px;
      }
      h2 {
        font-size: 20px;
        margin-bottom: 16px;
        color: #0f172a;
        border-bottom: 2px solid #e2e8f0;
        padding-bottom: 8px;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 28px;
      }
      th, td {
        text-align: left;
        padding: 12px;
        border-bottom: 1px solid #e2e8f0;
        font-size: 13px;
      }
      th {
        background: #f1f5f9;
        font-weight: 600;
        text-transform: uppercase;
        font-size: 12px;
        letter-spacing: 0.03em;
      }
      .metric {
        font-weight: 600;
        color: #0369a1;
      }
      .finding {
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        padding: 16px;
        margin-bottom: 16px;
        background: white;
        box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08);
      }
      .finding h4 {
        margin: 0 0 8px;
        font-size: 16px;
      }
      .finding p {
        margin: 4px 0;
        font-size: 13px;
        line-height: 1.5;
      }
      .finding-meta {
        margin-top: 12px;
        font-size: 12px;
        color: #475569;
      }
      footer {
        margin-top: 40px;
        font-size: 12px;
        color: #64748b;
        text-align: center;
      }
    </style>
  </head>
  <body>
    <section class="cover">
      <h1>${escapeHtml(data.projectName)}</h1>
      <p>${escapeHtml(data.companyName)}</p>
      ${data.ownerName ? `<p>Responsable: ${escapeHtml(data.ownerName)}</p>` : ''}
      <p>Generado: ${escapeHtml(generatedAt)}</p>
      <span class="badge">${escapeHtml(stateLabel)}</span>
    </section>
    <section class="content">
      <h2>Indicadores Clave</h2>
      ${
        data.kpis.length > 0
          ? `<table>
          <thead>
            <tr>
              <th>Indicador</th>
              <th>Valor</th>
              <th>Fecha</th>
            </tr>
          </thead>
          <tbody>${kpiRows}</tbody>
        </table>`
          : '<p>No hay KPIs registrados.</p>'
      }

      <h2>Hallazgos Prioritarios</h2>
      ${data.findings.length > 0 ? findingsRows : '<p>No hay hallazgos abiertos.</p>'}

      <footer>Reporte generado automáticamente por la plataforma de auditoría.</footer>
    </section>
  </body>
</html>`;
};
