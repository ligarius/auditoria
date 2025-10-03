import type {
  InventoryCountStatus,
  Prisma,
  RoutePlanStatus
} from '@prisma/client';
import * as puppeteer from 'puppeteer';

import { prisma } from '../../core/config/db.js';
import { HttpError } from '../../core/errors/http-error.js';
import { logger } from '../../core/config/logger.js';

import { renderExecutiveReport } from './templates/executive-report.js';
import {
  renderModuleReport,
  type ModuleReportTemplateData,
  type ReportEntry,
  type ReportSection
} from './templates/module-report.js';

const CLOSED_FINDING_STATUSES = [
  'closed',
  'cerrado',
  'implemented',
  'implementado',
  'resolved',
  'resuelto'
];

const INVENTORY_STATUS_LABELS: Record<InventoryCountStatus, string> = {
  planned: 'Planificado',
  running: 'En ejecución',
  closed: 'Cerrado'
};

const ROUTE_STATUS_LABELS: Record<RoutePlanStatus, string> = {
  draft: 'Borrador',
  optimizing: 'En optimización',
  completed: 'Completado'
};

const REPORT_TYPE_LABELS = {
  diagnostico: 'Informe de diagnóstico',
  '5s': 'Informe programa 5S',
  inventario: 'Informe maestro e inventario',
  rutas: 'Informe de planeamiento de rutas',
  final: 'Informe final del proyecto'
} as const;

export type ModuleReportType = keyof typeof REPORT_TYPE_LABELS;

const isModuleReportType = (value: string): value is ModuleReportType =>
  Object.prototype.hasOwnProperty.call(REPORT_TYPE_LABELS, value);

const numberFormatter = new Intl.NumberFormat('es-CL');
const currencyFormatter = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0
});

const dateFormatter = new Intl.DateTimeFormat('es-CL', { dateStyle: 'medium' });

const formatNumber = (value: number | null | undefined, fallback = '—') => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return fallback;
  }
  return numberFormatter.format(value);
};

const formatDecimal = (value: number | null | undefined, digits = 1) => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '—';
  }
  return value.toFixed(digits);
};

const formatPercent = (value: number | null | undefined) => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '—';
  }
  return `${value.toFixed(1)}%`;
};

const formatCurrency = (value: number | null | undefined) => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '—';
  }
  return currencyFormatter.format(value);
};

const formatDate = (value: Date | string | null | undefined) => {
  if (!value) {
    return '—';
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  return dateFormatter.format(date);
};

const slugify = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

const sectionId = (scope: string, title: string, index: number) => {
  const slug = slugify(title);
  if (!slug) {
    return `${scope}-${index + 1}`;
  }
  return `${scope}-${slug}`;
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const parseJsonArray = (value: Prisma.JsonValue | null | undefined) => {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      logger.warn({ err: error }, 'No se pudo parsear JSON del reporte');
      return [];
    }
  }
  return [];
};

const createPdfFromHtml = async (
  html: string,
  preparedBy: string,
  generatedAt: Date
) => {
  let browser: puppeteer.Browser | null = null;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await page.emulateMediaType('screen');

    const footerTemplate =
      `<div style="width: 100%; font-size: 9px; padding: 0 24px 12px; color: #64748b; display: flex; justify-content: space-between; align-items: center;">` +
      `<span>${escapeHtml(dateFormatter.format(generatedAt))}</span>` +
      `<span>Generado por ${escapeHtml(preparedBy)}</span>` +
      '<span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span>' +
      '</div>';

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '25mm', bottom: '32mm', left: '18mm', right: '18mm' },
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate
    });

    return pdf;
  } finally {
    await browser?.close();
  }
};

const buildDiagnosticSections = async (
  projectId: string
): Promise<ReportSection[]> => {
  const [kpis, findings, risks, decisionCount, totalFindings, totalKpis] =
    await Promise.all([
      prisma.kPI.findMany({
        where: { projectId },
        orderBy: { date: 'desc' },
        take: 6
      }),
      prisma.finding.findMany({
        where: { projectId },
        orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
        take: 8
      }),
      prisma.risk.findMany({
        where: { projectId },
        orderBy: { severity: 'desc' },
        take: 8
      }),
      prisma.decision.count({ where: { projectId } }),
      prisma.finding.count({ where: { projectId } }),
      prisma.kPI.count({ where: { projectId } })
    ]);

  const openFindings = await prisma.finding.count({
    where: {
      projectId,
      NOT: { status: { in: CLOSED_FINDING_STATUSES } }
    }
  });

  const severeRisks = await prisma.risk.count({
    where: { projectId, severity: { gte: 4 } }
  });

  const sections: ReportSection[] = [];

  sections.push({
    id: sectionId('diagnostico', 'Resumen de diagnóstico', sections.length),
    title: 'Resumen de diagnóstico',
    description:
      'Panorama de avance del diagnóstico del proyecto, integrando los principales hallazgos, riesgos y decisiones documentadas.',
    metrics: [
      { label: 'KPIs registrados', value: formatNumber(totalKpis) },
      { label: 'Hallazgos abiertos', value: formatNumber(openFindings) },
      { label: 'Riesgos severos', value: formatNumber(severeRisks) },
      { label: 'Decisiones documentadas', value: formatNumber(decisionCount) }
    ]
  });

  if (kpis.length > 0) {
    const entries: ReportEntry[] = kpis.map((kpi) => ({
      title: kpi.name,
      subtitle: `Medición ${formatDate(kpi.date)}`,
      metadata: [
        {
          label: 'Valor',
          value: formatDecimal(kpi.value, 2) + (kpi.unit ? ` ${kpi.unit}` : '')
        },
        { label: 'Última actualización', value: formatDate(kpi.date) }
      ]
    }));

    sections.push({
      id: sectionId('diagnostico', 'Indicadores clave', sections.length),
      title: 'Indicadores clave',
      description:
        'KPIs más recientes registrados dentro del proyecto y su evolución temporal.',
      entries
    });
  }

  if (findings.length > 0) {
    const findingEntries: ReportEntry[] = findings.map((finding) => ({
      title: finding.title,
      subtitle: `${finding.severity?.toString?.() ?? '—'} · ${finding.area ?? 'Sin área definida'}`,
      description: finding.impact ?? 'Sin descripción de impacto',
      metadata: [
        {
          label: 'Recomendación',
          value: finding.recommendation ?? 'Sin recomendación'
        },
        {
          label: 'Responsable',
          value: finding.responsibleR ?? 'Sin responsable'
        },
        { label: 'Estado', value: finding.status ?? 'Sin estado' },
        { label: 'Fecha objetivo', value: formatDate(finding.targetDate) }
      ]
    }));

    sections.push({
      id: sectionId('diagnostico', 'Hallazgos críticos', sections.length),
      title: 'Hallazgos críticos',
      description:
        'Detalle de los principales hallazgos identificados durante el diagnóstico y sus planes de acción asociados.',
      entries: findingEntries
    });
  }

  if (risks.length > 0) {
    const riskEntries: ReportEntry[] = risks.map((risk) => ({
      title: risk.description,
      subtitle: `${risk.category} · Severidad ${risk.severity}`,
      description: risk.mitigation ?? 'Sin plan de mitigación documentado',
      metadata: [
        { label: 'Probabilidad', value: `${risk.probability}/5` },
        { label: 'Impacto', value: `${risk.impact}/5` },
        { label: 'Responsable', value: risk.owner ?? 'Sin responsable' },
        { label: 'Fecha compromiso', value: formatDate(risk.dueDate) }
      ]
    }));

    sections.push({
      id: sectionId('diagnostico', 'Riesgos prioritarios', sections.length),
      title: 'Riesgos prioritarios',
      description:
        'Riesgos con mayor severidad que requieren seguimiento cercano y definición de planes de mitigación.',
      entries: riskEntries
    });
  }

  sections.push({
    id: sectionId('diagnostico', 'Totales del diagnóstico', sections.length),
    title: 'Totales del diagnóstico',
    description: 'Consolidado cuantitativo de la fase diagnóstica.',
    metrics: [
      { label: 'Hallazgos totales', value: formatNumber(totalFindings) },
      { label: 'Hallazgos abiertos', value: formatNumber(openFindings) },
      { label: 'Riesgos registrados', value: formatNumber(risks.length) }
    ]
  });

  return sections;
};

const buildFiveSSections = async (
  projectId: string
): Promise<ReportSection[]> => {
  const audits = await prisma.fiveSAudit.findMany({
    where: { projectId },
    orderBy: { auditDate: 'desc' },
    take: 12,
    include: { createdBy: { select: { name: true } } }
  });

  if (audits.length === 0) {
    return [
      {
        id: sectionId('cinco-s', 'Programa 5S', 0),
        title: 'Programa 5S',
        description:
          'Aún no se han registrado auditorías 5S para este proyecto.'
      }
    ];
  }

  const totalScore = audits.reduce((acc, audit) => acc + audit.score, 0);
  const averageScore = audits.length > 0 ? totalScore / audits.length : null;
  const totalActions = audits.reduce(
    (acc, audit) => acc + parseJsonArray(audit.actions).length,
    0
  );

  const sections: ReportSection[] = [
    {
      id: sectionId('cinco-s', 'Programa 5S', 0),
      title: 'Programa 5S',
      description:
        'Consolidado de las auditorías 5S realizadas, sus resultados y focos de mejora.',
      metrics: [
        { label: 'Auditorías registradas', value: formatNumber(audits.length) },
        { label: 'Score promedio', value: formatDecimal(averageScore, 1) },
        { label: 'Acciones generadas', value: formatNumber(totalActions) }
      ]
    }
  ];

  const auditEntries: ReportEntry[] = audits.map((audit) => {
    const actions = parseJsonArray(audit.actions);
    const photos = parseJsonArray(audit.photos);

    return {
      title: audit.area,
      subtitle: `Auditoría del ${formatDate(audit.auditDate)} · Score ${formatDecimal(audit.score, 1)}`,
      description: audit.notes ?? undefined,
      metadata: [
        {
          label: 'Responsable',
          value: audit.createdBy?.name ?? 'Sin registro'
        },
        { label: 'Acciones', value: formatNumber(actions.length) },
        { label: 'Evidencias', value: formatNumber(photos.length) }
      ]
    };
  });

  sections.push({
    id: sectionId('cinco-s', 'Detalle de auditorías', sections.length),
    title: 'Detalle de auditorías',
    description:
      'Resultados obtenidos en cada área evaluada, incluyendo acciones y evidencias levantadas.',
    entries: auditEntries
  });

  return sections;
};

const buildInventorySections = async (
  projectId: string
): Promise<ReportSection[]> => {
  const [skuCount, locationCount, counts] = await Promise.all([
    prisma.sku.count({ where: { projectId } }),
    prisma.location.count({ where: { projectId } }),
    prisma.inventoryCount.findMany({
      where: { projectId },
      orderBy: { plannedAt: 'desc' },
      take: 8,
      select: {
        id: true,
        status: true,
        tolerancePct: true,
        plannedAt: true,
        startedAt: true,
        closedAt: true,
        _count: {
          select: {
            tasks: true,
            variances: true
          }
        }
      }
    })
  ]);

  const varianceTotal = counts.reduce(
    (acc, count) => acc + (count._count?.variances ?? 0),
    0
  );
  const activeCounts = counts.filter(
    (count) => count.status !== 'closed'
  ).length;

  const sections: ReportSection[] = [
    {
      id: sectionId('inventario', 'Resumen de inventario', 0),
      title: 'Resumen de inventario',
      description:
        'Visión general del maestro de materiales, ubicaciones y conteos cíclicos realizados.',
      metrics: [
        { label: 'SKU registrados', value: formatNumber(skuCount) },
        { label: 'Ubicaciones creadas', value: formatNumber(locationCount) },
        { label: 'Conteos activos', value: formatNumber(activeCounts) },
        { label: 'Variaciones detectadas', value: formatNumber(varianceTotal) }
      ]
    }
  ];

  if (counts.length > 0) {
    const countEntries: ReportEntry[] = counts.map((count) => ({
      title: `Conteo ${count.id.slice(0, 8).toUpperCase()}`,
      subtitle: `${INVENTORY_STATUS_LABELS[count.status]} · Tolerancia ${formatPercent(count.tolerancePct)}`,
      metadata: [
        { label: 'Planificado', value: formatDate(count.plannedAt) },
        { label: 'Inicio', value: formatDate(count.startedAt) },
        { label: 'Cierre', value: formatDate(count.closedAt) },
        {
          label: 'Tareas asignadas',
          value: formatNumber(count._count?.tasks ?? 0)
        },
        {
          label: 'Variaciones',
          value: formatNumber(count._count?.variances ?? 0)
        }
      ]
    }));

    sections.push({
      id: sectionId('inventario', 'Detalle de conteos', sections.length),
      title: 'Detalle de conteos',
      description:
        'Conteos ejecutados con su tolerancia, fechas relevantes y desviaciones encontradas.',
      entries: countEntries
    });
  }

  return sections;
};

const buildRoutesSections = async (
  projectId: string
): Promise<ReportSection[]> => {
  const [carrierCount, plans] = await Promise.all([
    prisma.carrier.count({ where: { projectId } }),
    prisma.routePlan.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      take: 6,
      include: {
        carrier: { select: { name: true } },
        vehicles: {
          select: { name: true, capacity: true, costKm: true, fixed: true }
        },
        stops: {
          select: {
            client: true,
            demandKg: true,
            demandVol: true,
            windowStart: true,
            windowEnd: true
          }
        }
      }
    })
  ]);

  if (plans.length === 0) {
    return [
      {
        id: sectionId('rutas', 'Planeamiento de rutas', 0),
        title: 'Planeamiento de rutas',
        description:
          'Aún no se han creado escenarios de rutas para este proyecto.',
        metrics: [
          {
            label: 'Transportistas registrados',
            value: formatNumber(carrierCount)
          },
          { label: 'Escenarios planificados', value: '0' }
        ]
      }
    ];
  }

  const totalStops = plans.reduce((acc, plan) => acc + plan.stops.length, 0);
  const totalVehicles = plans.reduce(
    (acc, plan) => acc + plan.vehicles.length,
    0
  );
  const totalDemandKg = plans.reduce(
    (acc, plan) =>
      acc + plan.stops.reduce((inner, stop) => inner + (stop.demandKg ?? 0), 0),
    0
  );

  const sections: ReportSection[] = [
    {
      id: sectionId('rutas', 'Planeamiento de rutas', 0),
      title: 'Planeamiento de rutas',
      description:
        'Escenarios optimizados para distribución y transporte asociados al proyecto.',
      metrics: [
        {
          label: 'Transportistas registrados',
          value: formatNumber(carrierCount)
        },
        { label: 'Escenarios planificados', value: formatNumber(plans.length) },
        { label: 'Clientes programados', value: formatNumber(totalStops) },
        {
          label: 'Demanda consolidada (kg)',
          value: formatNumber(Math.round(totalDemandKg))
        },
        { label: 'Vehículos considerados', value: formatNumber(totalVehicles) }
      ]
    }
  ];

  const planEntries: ReportEntry[] = plans.map((plan) => {
    const fixedCost = plan.vehicles.reduce(
      (acc, vehicle) => acc + (vehicle.fixed ?? 0),
      0
    );
    const variableCost = plan.vehicles.reduce(
      (acc, vehicle) => acc + (vehicle.costKm ?? 0),
      0
    );
    const demand = plan.stops.reduce(
      (acc, stop) => ({
        kg: acc.kg + (stop.demandKg ?? 0),
        vol: acc.vol + (stop.demandVol ?? 0)
      }),
      { kg: 0, vol: 0 }
    );

    return {
      title: plan.scenario,
      subtitle: `${ROUTE_STATUS_LABELS[plan.status]} · ${plan.approved ? 'Aprobado' : 'Pendiente'}`,
      description: plan.notes ?? undefined,
      metadata: [
        { label: 'Transportista', value: plan.carrier?.name ?? 'Sin asignar' },
        { label: 'Clientes', value: formatNumber(plan.stops.length) },
        { label: 'Demanda (kg)', value: formatNumber(Math.round(demand.kg)) },
        { label: 'Demanda (m³)', value: formatNumber(Math.round(demand.vol)) },
        { label: 'Vehículos', value: formatNumber(plan.vehicles.length) },
        { label: 'Costo fijo', value: formatCurrency(fixedCost) },
        { label: 'Costo variable', value: formatCurrency(variableCost) }
      ]
    };
  });

  sections.push({
    id: sectionId('rutas', 'Detalle de escenarios', sections.length),
    title: 'Detalle de escenarios',
    description:
      'Resumen por escenario con demanda cubierta, flota utilizada y costos asociados.',
    entries: planEntries
  });

  return sections;
};

const buildFinalSections = async (
  projectId: string
): Promise<ReportSection[]> => {
  const [
    diagnosticSections,
    fiveSSections,
    inventorySections,
    routesSections,
    kpiCount,
    findingsOpen,
    routePlans
  ] = await Promise.all([
    buildDiagnosticSections(projectId),
    buildFiveSSections(projectId),
    buildInventorySections(projectId),
    buildRoutesSections(projectId),
    prisma.kPI.count({ where: { projectId } }),
    prisma.finding.count({
      where: {
        projectId,
        NOT: { status: { in: CLOSED_FINDING_STATUSES } }
      }
    }),
    prisma.routePlan.count({ where: { projectId } })
  ]);

  const [fiveSAuditCount, inventoryCounts] = await Promise.all([
    prisma.fiveSAudit.count({ where: { projectId } }),
    prisma.inventoryCount.count({ where: { projectId } })
  ]);

  const sections: ReportSection[] = [
    {
      id: sectionId('final', 'Resumen integral', 0),
      title: 'Resumen integral del proyecto',
      description:
        'Consolidado ejecutivo del proyecto incluyendo indicadores clave, hallazgos abiertos y módulos operativos ejecutados.',
      metrics: [
        { label: 'KPIs medidos', value: formatNumber(kpiCount) },
        { label: 'Hallazgos abiertos', value: formatNumber(findingsOpen) },
        { label: 'Auditorías 5S', value: formatNumber(fiveSAuditCount) },
        {
          label: 'Conteos de inventario',
          value: formatNumber(inventoryCounts)
        },
        { label: 'Escenarios de rutas', value: formatNumber(routePlans) }
      ]
    }
  ];

  const prefixSections = (scope: string, items: ReportSection[]) =>
    items.map((section, index) => ({
      ...section,
      id: sectionId(scope, section.title, index)
    }));

  sections.push(
    ...prefixSections('final-diagnostico', diagnosticSections),
    ...prefixSections('final-5s', fiveSSections),
    ...prefixSections('final-inventario', inventorySections),
    ...prefixSections('final-rutas', routesSections)
  );

  return sections;
};

const buildReportSections = async (
  projectId: string,
  type: ModuleReportType
) => {
  switch (type) {
    case 'diagnostico':
      return buildDiagnosticSections(projectId);
    case '5s':
      return buildFiveSSections(projectId);
    case 'inventario':
      return buildInventorySections(projectId);
    case 'rutas':
      return buildRoutesSections(projectId);
    case 'final':
      return buildFinalSections(projectId);
    default:
      return [];
  }
};

const createModuleReport = async (
  projectId: string,
  type: ModuleReportType,
  preparedBy: string
): Promise<ModuleReportTemplateData> => {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      company: { select: { name: true } },
      owner: { select: { name: true } }
    }
  });

  if (!project) {
    throw new HttpError(404, 'Proyecto no encontrado');
  }

  const sections = await buildReportSections(projectId, type);

  return {
    projectName: project.name,
    companyName: project.company.name,
    reportTitle: REPORT_TYPE_LABELS[type],
    preparedBy,
    generatedAt: dateFormatter.format(new Date()),
    sections,
    signatures: [
      { label: 'Consultor líder', name: preparedBy },
      { label: 'Representante del cliente', name: project.owner?.name ?? null },
      { label: 'Auditor responsable', name: project.company.name }
    ]
  };
};

export const reportService = {
  async generateExecutivePdf(projectId: string) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        company: { select: { name: true } },
        owner: { select: { name: true } },
        kpis: { orderBy: { date: 'desc' }, take: 5 },
        findings: { orderBy: { targetDate: 'asc' }, take: 8 }
      }
    });

    if (!project) {
      throw new HttpError(404, 'Proyecto no encontrado');
    }

    const openFindings = project.findings.filter((finding) => {
      const status = (finding.status ?? '').toLowerCase();
      return !CLOSED_FINDING_STATUSES.includes(status);
    });

    const template = renderExecutiveReport({
      projectName: project.name,
      companyName: project.company.name,
      ownerName: project.owner?.name ?? null,
      workflowState: project.status,
      generatedAt: new Date(),
      kpis: project.kpis.map((kpi) => ({
        name: kpi.name,
        value: kpi.value,
        unit: kpi.unit,
        date: kpi.date
      })),
      findings: openFindings.slice(0, 5).map((finding) => ({
        title: finding.title,
        impact: finding.impact,
        recommendation: finding.recommendation,
        status: finding.status,
        targetDate: finding.targetDate
      }))
    });

    try {
      return await createPdfFromHtml(
        template,
        project.owner?.name ?? 'Equipo auditor',
        new Date()
      );
    } catch (error) {
      logger.error(
        { err: error, projectId },
        'No se pudo generar el PDF ejecutivo'
      );
      throw new HttpError(500, 'No se pudo generar el reporte PDF');
    }
  },

  async generateModulePdf(projectId: string, type: string, userId?: string) {
    if (!isModuleReportType(type)) {
      throw new HttpError(400, 'Tipo de reporte no soportado');
    }

    const user = userId
      ? await prisma.user.findUnique({
          where: { id: userId },
          select: { name: true, email: true }
        })
      : null;
    const preparedBy = user?.name ?? user?.email ?? 'Equipo auditor';
    const generatedAt = new Date();

    try {
      const report = await createModuleReport(projectId, type, preparedBy);
      const html = renderModuleReport(report);
      return await createPdfFromHtml(html, preparedBy, generatedAt);
    } catch (error) {
      logger.error(
        { err: error, projectId, type },
        'No se pudo generar el reporte del módulo'
      );
      if (error instanceof HttpError) {
        throw error;
      }
      throw new HttpError(500, 'No se pudo generar el reporte PDF');
    }
  }
};
