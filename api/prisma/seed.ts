import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import {
  PrismaClient,
  ProjectWorkflowState,
  Prisma,
  ProcessType,
  SopStatus,
  ChecklistStatus,
  ActionCategory,
  ActionStatus
} from '@prisma/client';
import bcrypt from 'bcryptjs';

const runMigrations = (): void => {
  if (process.env.SKIP_MIGRATE_ON_SEED === 'true') {
    console.log('[seed] SKIP_MIGRATE_ON_SEED=true, omitiendo prisma migrate deploy');
    return;
  }

  const apiRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  console.log('[seed] Ejecutando prisma migrate deploy antes de sembrar datos…');
  try {
    execSync('npx prisma migrate deploy', {
      cwd: apiRoot,
      stdio: 'inherit',
    });
  } catch (error) {
    console.error('\n[seed] No se pudieron aplicar las migraciones automáticamente. Ejecuta `npx prisma migrate deploy` y reintenta.');
    throw error;
  }
};

runMigrations();

const prisma = new PrismaClient();

const ensureWorkflowEnum = (): void => {
  const expected: ProjectWorkflowState[] = [
    'planificacion',
    'recoleccion_datos',
    'analisis',
    'recomendaciones',
    'cierre',
  ];
  const values = Object.values(
    ProjectWorkflowState,
  ) as ProjectWorkflowState[];
  for (const item of expected) {
    if (!values.includes(item)) {
      throw new Error(
        'El enum ProjectWorkflowState no contiene todas las opciones requeridas. Ejecuta las migraciones antes de correr la semilla.',
      );
    }
  }
};

type UserRole = Prisma.UserCreateInput['role'];

async function upsertUser(email: string, name: string, role: UserRole, password: string) {
  const passwordHash = await bcrypt.hash(password, 10);
  return prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name, role, passwordHash },
  });
}

async function findOrCreateCompany(name: string, taxId: string) {
  const existing = await prisma.company.findFirst({ where: { name } });
  if (existing) {
    return existing;
  }
  return prisma.company.create({ data: { name, taxId } });
}

async function main(): Promise<void> {
  ensureWorkflowEnum();
  const nutrial = await findOrCreateCompany('Nutrial', '76.543.210-9');
  const democorp = await findOrCreateCompany('DemoCorp', '76.000.000-0');

  const admin = await upsertUser('admin@demo.com', 'Admin', 'admin', 'Cambiar123!');
  const consultor = await upsertUser('consultor@demo.com', 'Consultor', 'consultor', 'Cambiar123!');
  const cliente = await upsertUser('cliente@demo.com', 'Cliente', 'cliente', 'Cambiar123!');

  const nutrialProject = await prisma.project.upsert({
    where: {
      Project_companyId_name_key: {
        companyId: nutrial.id,
        name: 'Nutrial – Auditoría 2025',
      },
    },
    update: {},
    create: {
      companyId: nutrial.id,
      name: 'Nutrial – Auditoría 2025',
      status: ProjectWorkflowState.planificacion,
      ownerId: admin.id,
      settings: { enabledFeatures: ['reception', 'picking', 'dispatch'] },
      memberships: {
        create: [
          { userId: admin.id, role: 'owner' },
          { userId: consultor.id, role: 'editor' },
          { userId: cliente.id, role: 'viewer' },
        ],
      },
    },
  });

  const categories = [
    { name: 'Finanzas', description: 'Estados financieros, presupuestos y proyecciones.' },
    { name: 'Operaciones', description: 'Procesos operativos, indicadores y documentación de control.' },
    { name: 'Tecnología', description: 'Inventario de sistemas, integraciones y seguridad.' },
  ];

  for (const category of categories) {
    await prisma.dataRequestCategory.upsert({
      where: { name: category.name },
      update: { description: category.description },
      create: category,
    });
  }

  const planningTaskId = 'seed-task-planning';
  const assessmentTaskId = 'seed-task-assessment';

  const planningTaskStart = new Date('2025-01-06T00:00:00.000Z');
  const planningTaskEnd = new Date('2025-01-17T00:00:00.000Z');
  const assessmentTaskStart = new Date('2025-01-20T00:00:00.000Z');
  const assessmentTaskEnd = new Date('2025-02-07T00:00:00.000Z');

  await prisma.projectTask.upsert({
    where: { id: planningTaskId },
    update: {
      name: 'Planificación de auditoría',
      description: 'Definir alcance, recursos y cronograma del proyecto.',
      owner: 'Admin',
      status: 'En progreso',
      progress: 60,
      startDate: planningTaskStart,
      endDate: planningTaskEnd,
      sortOrder: 1,
      projectId: nutrialProject.id,
    },
    create: {
      id: planningTaskId,
      projectId: nutrialProject.id,
      name: 'Planificación de auditoría',
      description: 'Definir alcance, recursos y cronograma del proyecto.',
      owner: 'Admin',
      status: 'En progreso',
      progress: 60,
      startDate: planningTaskStart,
      endDate: planningTaskEnd,
      sortOrder: 1,
    },
  });

  await prisma.projectTask.upsert({
    where: { id: assessmentTaskId },
    update: {
      name: 'Levantamiento y evaluación',
      description: 'Entrevistas, levantamiento documental y evaluación preliminar.',
      owner: 'Consultor',
      status: 'Planificado',
      progress: 0,
      startDate: assessmentTaskStart,
      endDate: assessmentTaskEnd,
      sortOrder: 2,
      parentId: planningTaskId,
      projectId: nutrialProject.id,
    },
    create: {
      id: assessmentTaskId,
      projectId: nutrialProject.id,
      parentId: planningTaskId,
      name: 'Levantamiento y evaluación',
      description: 'Entrevistas, levantamiento documental y evaluación preliminar.',
      owner: 'Consultor',
      status: 'Planificado',
      progress: 0,
      startDate: assessmentTaskStart,
      endDate: assessmentTaskEnd,
      sortOrder: 2,
    },
  });

  const dataRequests = [
    {
      id: 'seed-datareq-finanzas-estados',
      category: 'Finanzas',
      title: 'Estados financieros 2024',
      description: 'Estados financieros auditados del ejercicio 2024.',
      format: 'PDF',
      ownerName: 'CFO',
      dueDate: new Date('2025-01-10T00:00:00.000Z'),
      status: 'En progreso',
      notes: 'Incluir notas de gestión y comparativo vs. presupuesto.',
    },
    {
      id: 'seed-datareq-finanzas-capex',
      category: 'Finanzas',
      title: 'Proyección CAPEX 2025',
      description: 'Escenario de inversión y renovación tecnológica.',
      format: 'XLSX',
      ownerName: 'Controller',
      dueDate: new Date('2025-01-15T00:00:00.000Z'),
      status: 'Pendiente',
      notes: 'Agregar desglose de automatizaciones planificadas.',
    },
    {
      id: 'seed-datareq-operaciones-kpi',
      category: 'Operaciones',
      title: 'KPI de recepción inbound',
      description: 'Dashboard con performance semanal de la recepción inbound.',
      format: 'Dashboard',
      ownerName: 'Jefe CD',
      dueDate: null,
      status: 'Completado',
      notes: 'Adjuntar captura semanal en PDF.',
    },
    {
      id: 'seed-datareq-operaciones-turnos',
      category: 'Operaciones',
      title: 'Matriz de turnos peak',
      description: 'Asignación de turnos y refuerzos en semanas de alta demanda.',
      format: 'Excel',
      ownerName: 'PMO',
      dueDate: new Date('2025-01-12T00:00:00.000Z'),
      status: 'Pendiente',
      notes: 'Priorizar semanas 3 y 4 de enero.',
    },
    {
      id: 'seed-datareq-tecnologia-integraciones',
      category: 'Tecnología',
      title: 'Inventario integraciones ERP-WMS',
      description: 'Listado actualizado de integraciones activas entre ERP y WMS.',
      format: 'Spreadsheet',
      ownerName: 'Arquitecto TI',
      dueDate: new Date('2025-01-14T00:00:00.000Z'),
      status: 'En progreso',
      notes: 'Detallar frecuencia, protocolos y owner funcional.',
    },
    {
      id: 'seed-datareq-tecnologia-accesos',
      category: 'Tecnología',
      title: 'Matriz de accesos críticos',
      description: 'Roles con acceso privilegiado en sistemas críticos.',
      format: 'CSV',
      ownerName: 'Seguridad TI',
      dueDate: new Date('2025-01-12T00:00:00.000Z'),
      status: 'Pendiente',
      notes: 'Incluir evidencia de revisión trimestral.',
    },
  ];

  for (const item of dataRequests) {
    await prisma.dataRequestItem.upsert({
      where: { id: item.id },
      update: {
        ...item,
        projectId: nutrialProject.id,
      },
      create: {
        ...item,
        projectId: nutrialProject.id,
      },
    });
  }

  const processAssets = [
    {
      id: 'seed-process-reception-flow',
      type: 'BPMN',
      title: 'Flujo recepción inbound',
      url: 'https://example.com/docs/recepcion-bpmn',
    },
    {
      id: 'seed-process-picking-flow',
      type: 'BPMN',
      title: 'Flujo picking alta exactitud',
      url: 'https://example.com/docs/picking-bpmn',
    },
    {
      id: 'seed-process-dispatch-flow',
      type: 'BPMN',
      title: 'Flujo despacho y devoluciones',
      url: 'https://example.com/docs/despacho-bpmn',
    },
  ];

  for (const asset of processAssets) {
    await prisma.processAsset.upsert({
      where: { id: asset.id },
      update: {
        ...asset,
        projectId: nutrialProject.id,
      },
      create: {
        ...asset,
        projectId: nutrialProject.id,
      },
    });
  }

  await prisma.process.upsert({
    where: { id: 'seed-process-recepcion-as-is' },
    update: {
      projectId: nutrialProject.id,
      name: 'Recepción AS-IS',
      type: ProcessType.AS_IS,
      version: 1,
      description: 'Mapa actual de recepción y control de patio.',
    },
    create: {
      id: 'seed-process-recepcion-as-is',
      projectId: nutrialProject.id,
      name: 'Recepción AS-IS',
      type: ProcessType.AS_IS,
      version: 1,
      description: 'Mapa actual de recepción y control de patio.',
    },
  });

  const toBeProcess = await prisma.process.upsert({
    where: { id: 'seed-process-recepcion-to-be' },
    update: {
      projectId: nutrialProject.id,
      name: 'Recepción TO-BE',
      type: ProcessType.TO_BE,
      version: 1,
      description: 'Flujo objetivo con 5S, etiquetado y SLA de 48 horas.',
    },
    create: {
      id: 'seed-process-recepcion-to-be',
      projectId: nutrialProject.id,
      name: 'Recepción TO-BE',
      type: ProcessType.TO_BE,
      version: 1,
      description: 'Flujo objetivo con 5S, etiquetado y SLA de 48 horas.',
    },
  });

  const sopRecepcion = await prisma.sop.upsert({
    where: { id: 'seed-sop-recepcion' },
    update: {
      processId: toBeProcess.id,
      title: 'SOP – Recepción estandarizada',
      version: 1,
      status: SopStatus.published,
      steps: {
        deleteMany: {},
        create: [
          {
            order: 1,
            text: 'Verificar agenda y asignar andén disponible.',
            kpi: { metric: 'SLA programación', target: '15 minutos' },
          },
          {
            order: 2,
            text: 'Inspeccionar unidad con checklist 5S y registrar evidencia fotográfica.',
            kpi: { metric: 'Checklists completos', target: '100%' },
          },
          {
            order: 3,
            text: 'Etiquetar pallets con código 128 y actualizar WMS.',
            kpi: { metric: 'Exactitud etiquetado', target: '99.5%' },
          },
          {
            order: 4,
            text: 'Liberar andén y enviar confirmación al área de planificación.',
            kpi: { metric: 'Tiempo de ciclo', target: '45 minutos' },
          },
        ],
      },
    },
    create: {
      id: 'seed-sop-recepcion',
      processId: toBeProcess.id,
      title: 'SOP – Recepción estandarizada',
      version: 1,
      status: SopStatus.published,
      steps: {
        create: [
          {
            order: 1,
            text: 'Verificar agenda y asignar andén disponible.',
            kpi: { metric: 'SLA programación', target: '15 minutos' },
          },
          {
            order: 2,
            text: 'Inspeccionar unidad con checklist 5S y registrar evidencia fotográfica.',
            kpi: { metric: 'Checklists completos', target: '100%' },
          },
          {
            order: 3,
            text: 'Etiquetar pallets con código 128 y actualizar WMS.',
            kpi: { metric: 'Exactitud etiquetado', target: '99.5%' },
          },
          {
            order: 4,
            text: 'Liberar andén y enviar confirmación al área de planificación.',
            kpi: { metric: 'Tiempo de ciclo', target: '45 minutos' },
          },
        ],
      },
    },
  });

  await prisma.checklist.upsert({
    where: { id: 'seed-checklist-recepcion' },
    update: {
      sopId: sopRecepcion.id,
      assigneeId: consultor.id,
      status: ChecklistStatus.signed,
      signedById: admin.id,
      signedAt: new Date('2025-01-08T10:30:00.000Z'),
      items: {
        deleteMany: {},
        create: [
          { text: 'Validar orden de compra y cita de transporte.', isDone: true },
          { text: 'Completar checklist HSE y registrar evidencia.', isDone: true },
          { text: 'Confirmar etiquetas y captura fotográfica en WMS.', isDone: true },
        ],
      },
    },
    create: {
      id: 'seed-checklist-recepcion',
      sopId: sopRecepcion.id,
      assigneeId: consultor.id,
      status: ChecklistStatus.signed,
      signedById: admin.id,
      signedAt: new Date('2025-01-08T10:30:00.000Z'),
      items: {
        create: [
          { text: 'Validar orden de compra y cita de transporte.', isDone: true },
          { text: 'Completar checklist HSE y registrar evidencia.', isDone: true },
          { text: 'Confirmar etiquetas y captura fotográfica en WMS.', isDone: true },
        ],
      },
    },
  });

  const dockFinding = await prisma.finding.upsert({
    where: { id: 'seed-finding-dwell-time' },
    update: {
      projectId: nutrialProject.id,
      title: 'Dwell time en andenes supera SLA de 48h',
      impact: 'Se generan cargos por demora y congestión de patio.',
      recommendation: 'Implementar agenda integrada con checklist digital y turnos escalonados.',
      severity: 'alta',
      area: 'Operaciones - Recepción',
      costEstimate: 18000,
      isQuickWin: true,
      effortDays: 12,
      responsibleR: 'Jefe de Patio',
      accountableA: 'Gerente Logística',
      targetDate: new Date('2025-02-28T00:00:00.000Z'),
      evidence: 'Registros históricos de dwell time > 60h.',
      status: 'open',
    },
    create: {
      id: 'seed-finding-dwell-time',
      projectId: nutrialProject.id,
      title: 'Dwell time en andenes supera SLA de 48h',
      impact: 'Se generan cargos por demora y congestión de patio.',
      recommendation: 'Implementar agenda integrada con checklist digital y turnos escalonados.',
      severity: 'alta',
      area: 'Operaciones - Recepción',
      costEstimate: 18000,
      isQuickWin: true,
      effortDays: 12,
      responsibleR: 'Jefe de Patio',
      accountableA: 'Gerente Logística',
      targetDate: new Date('2025-02-28T00:00:00.000Z'),
      evidence: 'Registros históricos de dwell time > 60h.',
      status: 'open',
    },
  });

  await prisma.actionItem.upsert({
    where: { id: 'seed-action-dwell-time' },
    update: {
      projectId: nutrialProject.id,
      findingId: dockFinding.id,
      title: 'Activar agenda digital y turnos escalonados',
      description: 'Configurar agenda con recordatorios automáticos y panel de monitoreo diario.',
      owner: 'PMO Operaciones',
      dueDate: new Date('2025-02-15T00:00:00.000Z'),
      category: ActionCategory.quick_win,
      status: ActionStatus.in_progress,
    },
    create: {
      id: 'seed-action-dwell-time',
      projectId: nutrialProject.id,
      findingId: dockFinding.id,
      title: 'Activar agenda digital y turnos escalonados',
      description: 'Configurar agenda con recordatorios automáticos y panel de monitoreo diario.',
      owner: 'PMO Operaciones',
      dueDate: new Date('2025-02-15T00:00:00.000Z'),
      category: ActionCategory.quick_win,
      status: ActionStatus.in_progress,
    },
  });

  await prisma.systemInventory.upsert({
    where: { id: 'seed-system-logitrack' },
    update: {
      projectId: nutrialProject.id,
      systemName: 'LogiTrack',
      type: 'SaaS',
      ownerArea: 'Operaciones',
      usersActive: 250,
      criticality: 'Alta',
      objective: 'Gestionar el flujo de recepción, picking y despacho.',
      modulesUsed: 'Recepción, Picking, Despacho',
      hosting: 'Nube pública',
      vendor: 'LogiTrack Inc.',
      supportActive: true,
      notes: 'Sistema core de operación logística.',
    },
    create: {
      id: 'seed-system-logitrack',
      projectId: nutrialProject.id,
      systemName: 'LogiTrack',
      type: 'SaaS',
      ownerArea: 'Operaciones',
      usersActive: 250,
      criticality: 'Alta',
      objective: 'Gestionar el flujo de recepción, picking y despacho.',
      modulesUsed: 'Recepción, Picking, Despacho',
      hosting: 'Nube pública',
      vendor: 'LogiTrack Inc.',
      supportActive: true,
      notes: 'Sistema core de operación logística.',
    },
  });

  await prisma.processCoverage.upsert({
    where: { id: 'seed-coverage-cross-docking' },
    update: {
      projectId: nutrialProject.id,
      process: 'Cross-docking',
      subProcess: 'Devoluciones',
      systemNameRef: 'LogiTrack',
      coverage: 85,
      evidence: 'Reporte mensual de cobertura.',
      hasGap: true,
      gapDesc: 'Devoluciones sin automatizar requieren intervención manual.',
      impact: 'Demoras en reposición a tiendas.',
      frequency: 'Diario',
      owner: 'Jefe CD',
    },
    create: {
      id: 'seed-coverage-cross-docking',
      projectId: nutrialProject.id,
      process: 'Cross-docking',
      subProcess: 'Devoluciones',
      systemNameRef: 'LogiTrack',
      coverage: 85,
      evidence: 'Reporte mensual de cobertura.',
      hasGap: true,
      gapDesc: 'Devoluciones sin automatizar requieren intervención manual.',
      impact: 'Demoras en reposición a tiendas.',
      frequency: 'Diario',
      owner: 'Jefe CD',
    },
  });

  await prisma.integration.upsert({
    where: { id: 'seed-integration-erp-wms' },
    update: {
      projectId: nutrialProject.id,
      source: 'ERP',
      target: 'LogiTrack WMS',
      type: 'REST',
      periodicity: 'Diario',
      dailyVolume: 18000,
      format: 'JSON',
      stability: 95,
      notes: 'Replica órdenes de venta y actualiza inventario.',
    },
    create: {
      id: 'seed-integration-erp-wms',
      projectId: nutrialProject.id,
      source: 'ERP',
      target: 'LogiTrack WMS',
      type: 'REST',
      periodicity: 'Diario',
      dailyVolume: 18000,
      format: 'JSON',
      stability: 95,
      notes: 'Replica órdenes de venta y actualiza inventario.',
    },
  });

  await prisma.dataModelQuality.upsert({
    where: { id: 'seed-dataquality-maestro-productos' },
    update: {
      projectId: nutrialProject.id,
      systemName: 'LogiTrack',
      entity: 'Maestro de productos',
      hasCriticalFields: true,
      dataQuality: 88,
      hasBusinessRules: true,
      historyYears: 5,
      traceability: true,
      reports: 'Dashboards semanales de exactitud',
      inventoryAccuracyPct: 97.5,
      notes: 'Revisión mensual con Operaciones.',
    },
    create: {
      id: 'seed-dataquality-maestro-productos',
      projectId: nutrialProject.id,
      systemName: 'LogiTrack',
      entity: 'Maestro de productos',
      hasCriticalFields: true,
      dataQuality: 88,
      hasBusinessRules: true,
      historyYears: 5,
      traceability: true,
      reports: 'Dashboards semanales de exactitud',
      inventoryAccuracyPct: 97.5,
      notes: 'Revisión mensual con Operaciones.',
    },
  });

  await prisma.securityPosture.upsert({
    where: { id: 'seed-security-logitrack' },
    update: {
      projectId: nutrialProject.id,
      systemName: 'LogiTrack',
      userLifecycle: 'Altas/Bajas gestionadas vía Service Desk semanal.',
      rbac: 'Roles segregados por proceso y centro.',
      mfa: true,
      auditLogs: true,
      backupsRPO: '4 horas',
      backupsRTO: '2 horas',
      tlsInTransit: true,
      encryptionAtRest: false,
      openVulns: 'Cifrado en reposo pendiente en base histórica.',
      notes: 'Plan de cierre definido para Q1 2025.',
    },
    create: {
      id: 'seed-security-logitrack',
      projectId: nutrialProject.id,
      systemName: 'LogiTrack',
      userLifecycle: 'Altas/Bajas gestionadas vía Service Desk semanal.',
      rbac: 'Roles segregados por proceso y centro.',
      mfa: true,
      auditLogs: true,
      backupsRPO: '4 horas',
      backupsRTO: '2 horas',
      tlsInTransit: true,
      encryptionAtRest: false,
      openVulns: 'Cifrado en reposo pendiente en base histórica.',
      notes: 'Plan de cierre definido para Q1 2025.',
    },
  });

  await prisma.performance.upsert({
    where: { id: 'seed-performance-logitrack' },
    update: {
      projectId: nutrialProject.id,
      systemName: 'LogiTrack',
      peakUsers: 450,
      latencyMs: 180,
      availabilityPct: 99.2,
      incidents90d: 1,
      topRootCause: 'Sobrecarga en batch de integración nocturna.',
      notes: 'Plan de capacity management en ejecución.',
    },
    create: {
      id: 'seed-performance-logitrack',
      projectId: nutrialProject.id,
      systemName: 'LogiTrack',
      peakUsers: 450,
      latencyMs: 180,
      availabilityPct: 99.2,
      incidents90d: 1,
      topRootCause: 'Sobrecarga en batch de integración nocturna.',
      notes: 'Plan de capacity management en ejecución.',
    },
  });

  await prisma.costLicensing.upsert({
    where: { id: 'seed-costs-logitrack' },
    update: {
      projectId: nutrialProject.id,
      systemName: 'LogiTrack',
      model: 'SaaS',
      usersLicenses: 260,
      costAnnual: 65000,
      implUSD: 120000,
      supportUSD: 18000,
    },
    create: {
      id: 'seed-costs-logitrack',
      projectId: nutrialProject.id,
      systemName: 'LogiTrack',
      model: 'SaaS',
      usersLicenses: 260,
      costAnnual: 65000,
      implUSD: 120000,
      supportUSD: 18000,
    },
  });

  const governanceCommittee = await prisma.committee.upsert({
    where: { id: 'seed-committee-gobernanza' },
    update: {
      projectId: nutrialProject.id,
      name: 'Comité de Gobernanza',
      description: 'Seguimiento de riesgos, decisiones y cambios de alcance.',
      ownerId: consultor.id,
    },
    create: {
      id: 'seed-committee-gobernanza',
      projectId: nutrialProject.id,
      name: 'Comité de Gobernanza',
      description: 'Seguimiento de riesgos, decisiones y cambios de alcance.',
      ownerId: consultor.id,
    },
  });

  const weeklyMeeting = await prisma.meeting.upsert({
    where: { id: 'seed-meeting-semanal' },
    update: {
      projectId: nutrialProject.id,
      committeeId: governanceCommittee.id,
      title: 'Reunión semanal de proyecto',
      agenda: 'Revisar riesgos, KPIs y cambios de alcance.',
      scheduledAt: new Date('2025-01-15T14:00:00.000Z'),
      location: 'Sala híbrida / Teams',
      status: 'scheduled',
    },
    create: {
      id: 'seed-meeting-semanal',
      projectId: nutrialProject.id,
      committeeId: governanceCommittee.id,
      title: 'Reunión semanal de proyecto',
      agenda: 'Revisar riesgos, KPIs y cambios de alcance.',
      scheduledAt: new Date('2025-01-15T14:00:00.000Z'),
      location: 'Sala híbrida / Teams',
      status: 'scheduled',
    },
  });

  await prisma.minute.upsert({
    where: { id: 'seed-minute-reunion-semanal' },
    update: {
      meetingId: weeklyMeeting.id,
      authorId: consultor.id,
      content:
        'Se acordó reforzar el seguimiento de riesgos críticos y preparar propuesta de cambio de alcance para automatización de picking.',
    },
    create: {
      id: 'seed-minute-reunion-semanal',
      meetingId: weeklyMeeting.id,
      authorId: consultor.id,
      content:
        'Se acordó reforzar el seguimiento de riesgos críticos y preparar propuesta de cambio de alcance para automatización de picking.',
    },
  });

  const risks = [
    {
      id: 'seed-risk-continuidad-wms',
      category: 'Continuidad operacional',
      description: 'Caída del WMS en ventana peak',
      probability: 4,
      impact: 5,
      severity: 20,
      rag: 'Rojo',
      mitigation: 'Implementar plan de failover activo-activo',
      owner: 'CIO',
      dueDate: new Date('2025-02-15T00:00:00.000Z'),
      meetingId: weeklyMeeting.id,
    },
    {
      id: 'seed-risk-sla-recepcion',
      category: 'Cumplimiento',
      description: 'Incumplimiento SLA recepción proveedores clave',
      probability: 3,
      impact: 4,
      severity: 12,
      rag: 'Ámbar',
      mitigation: 'Automatizar alertas tempranas y reservas de dock',
      owner: 'Jefe Recepción',
      dueDate: new Date('2025-01-31T00:00:00.000Z'),
      meetingId: weeklyMeeting.id,
    },
    {
      id: 'seed-risk-credenciales-compartidas',
      category: 'Seguridad',
      description: 'Credenciales compartidas en centros regionales',
      probability: 2,
      impact: 3,
      severity: 6,
      rag: 'Verde',
      mitigation: 'Completar enrolamiento MFA y capacitaciones',
      owner: 'Seguridad TI',
      dueDate: new Date('2025-02-20T00:00:00.000Z'),
      meetingId: null,
    },
  ];

  for (const risk of risks) {
    await prisma.risk.upsert({
      where: { id: risk.id },
      update: {
        ...risk,
        projectId: nutrialProject.id,
      },
      create: {
        ...risk,
        projectId: nutrialProject.id,
      },
    });
  }

  const findings = [
    {
      id: 'seed-finding-checklist-recepcion',
      title: 'Estandarizar checklist de recepción nocturna',
      evidence: 'Revisión de procedimientos 09/01/2025',
      impact: 'Alto',
      recommendation: 'Alinear checklist único con foco en controles críticos.',
      quickWin: true,
      effortDays: 5,
      responsibleR: 'Jefe CD',
      accountableA: 'Director Operaciones',
      targetDate: new Date('2025-02-05T00:00:00.000Z'),
      status: 'En progreso',
    },
    {
      id: 'seed-finding-conciliacion-inventario',
      title: 'Automatizar conciliación inventario físico vs. sistema',
      evidence: 'Gap detectado en conteos cíclicos.',
      impact: 'Alto',
      recommendation: 'Implementar conciliación diaria con alertas.',
      quickWin: false,
      effortDays: 20,
      responsibleR: 'Líder Inventarios',
      accountableA: 'CFO',
      targetDate: new Date('2025-03-15T00:00:00.000Z'),
      status: 'Open',
    },
    {
      id: 'seed-finding-sso-wms',
      title: 'Activar Single Sign-On en WMS legacy',
      evidence: 'Usuarios mantienen credenciales duplicadas.',
      impact: 'Medio',
      recommendation: 'Integrar WMS a IdP corporativo.',
      quickWin: true,
      effortDays: 8,
      responsibleR: 'Arquitecto TI',
      accountableA: 'CIO',
      targetDate: new Date('2025-02-28T00:00:00.000Z'),
      status: 'Open',
    },
  ];

  for (const finding of findings) {
    await prisma.finding.upsert({
      where: { id: finding.id },
      update: {
        ...finding,
        projectId: nutrialProject.id,
      },
      create: {
        ...finding,
        projectId: nutrialProject.id,
      },
    });
  }

  const pocs = [
    {
      id: 'seed-poc-rpa-inbound',
      item: 'Automatización RPA de inbound',
      description: 'Robot para acelerar digitación y validación documental.',
      owner: 'PMO logística',
      date: new Date('2025-01-29T00:00:00.000Z'),
      status: 'Pending',
    },
    {
      id: 'seed-poc-iot-temperatura',
      item: 'Piloto sensores IoT temperatura',
      description: 'Monitoreo continuo de cadena de frío.',
      owner: 'Operaciones',
      date: new Date('2025-02-10T00:00:00.000Z'),
      status: 'Planned',
    },
  ];

  for (const poc of pocs) {
    await prisma.pOCItem.upsert({
      where: { id: poc.id },
      update: {
        ...poc,
        projectId: nutrialProject.id,
      },
      create: {
        ...poc,
        projectId: nutrialProject.id,
      },
    });
  }

  const decisions = [
    {
      id: 'seed-decision-iot-recepcion',
      date: new Date('2025-01-11T00:00:00.000Z'),
      topic: 'Adoptar control de temperatura IoT en recepción',
      decision: 'Aprobado',
      rationale: 'ROI estimado menor a 12 meses, reduce mermas.',
      approverA: 'Director de Operaciones',
    },
    {
      id: 'seed-decision-reporte-powerbi',
      date: new Date('2025-01-08T00:00:00.000Z'),
      topic: 'Migrar reportería KPI a PowerBI único',
      decision: 'Aprobado',
      rationale: 'Consolidación de reportes y gobierno de datos.',
      approverA: 'CFO',
    },
  ];

  for (const decision of decisions) {
    await prisma.decision.upsert({
      where: { id: decision.id },
      update: {
        ...decision,
        projectId: nutrialProject.id,
        committeeId: governanceCommittee.id,
        meetingId: weeklyMeeting.id,
      },
      create: {
        ...decision,
        projectId: nutrialProject.id,
        committeeId: governanceCommittee.id,
        meetingId: weeklyMeeting.id,
      },
    });
  }

  const scopeChange = await prisma.scopeChange.upsert({
    where: { id: 'seed-scopechange-rutas' },
    update: {
      projectId: nutrialProject.id,
      meetingId: weeklyMeeting.id,
      title: 'Agregar bodegas regionales al alcance',
      description: 'Extender la revisión operativa a los centros regionales del norte.',
      impact: 'Incrementa duración en 2 semanas y requiere 1 consultor adicional.',
      scheduleImpact: 'Extiende el cronograma estimado en 14 días.',
      costImpact: 'Requiere presupuesto adicional de consultoría por 120 horas.',
      status: 'proposed',
      requestedBy: 'PMO logística',
      requestedAt: new Date('2025-01-14T00:00:00.000Z'),
      decision: null,
    },
    create: {
      id: 'seed-scopechange-rutas',
      projectId: nutrialProject.id,
      meetingId: weeklyMeeting.id,
      title: 'Agregar bodegas regionales al alcance',
      description: 'Extender la revisión operativa a los centros regionales del norte.',
      impact: 'Incrementa duración en 2 semanas y requiere 1 consultor adicional.',
      scheduleImpact: 'Extiende el cronograma estimado en 14 días.',
      costImpact: 'Requiere presupuesto adicional de consultoría por 120 horas.',
      status: 'proposed',
      requestedBy: 'PMO logística',
      requestedAt: new Date('2025-01-14T00:00:00.000Z'),
      decision: null,
    },
  });

  const approvalWorkflow = await prisma.approvalWorkflow.upsert({
    where: { id: 'seed-approval-scopechange' },
    update: {
      projectId: nutrialProject.id,
      resourceType: 'ScopeChange',
      resourceId: scopeChange.id,
      status: 'pending',
      dueAt: new Date('2025-01-20T00:00:00.000Z'),
      overdue: false,
      steps: {
        deleteMany: {},
        create: [
          {
            order: 1,
            approverId: admin.id,
            approverRole: 'Sponsor',
            status: 'pending',
          },
          {
            order: 2,
            approverId: consultor.id,
            approverRole: 'ConsultorLider',
            status: 'pending',
          },
        ],
      },
      slaTimers: {
        deleteMany: {},
        create: [
          {
            startedAt: new Date('2025-01-14T00:00:00.000Z'),
            dueAt: new Date('2025-01-20T00:00:00.000Z'),
            status: 'running',
          },
        ],
      },
    },
    create: {
      id: 'seed-approval-scopechange',
      projectId: nutrialProject.id,
      resourceType: 'ScopeChange',
      resourceId: scopeChange.id,
      status: 'pending',
      dueAt: new Date('2025-01-20T00:00:00.000Z'),
      overdue: false,
      steps: {
        create: [
          {
            order: 1,
            approverId: admin.id,
            approverRole: 'Sponsor',
            status: 'pending',
          },
          {
            order: 2,
            approverId: consultor.id,
            approverRole: 'ConsultorLider',
            status: 'pending',
          },
        ],
      },
      slaTimers: {
        create: [
          {
            startedAt: new Date('2025-01-14T00:00:00.000Z'),
            dueAt: new Date('2025-01-20T00:00:00.000Z'),
            status: 'running',
          },
        ],
      },
      scopeChange: {
        connect: { id: scopeChange.id },
      },
    },
  });

  await prisma.scopeChange.update({
    where: { id: scopeChange.id },
    data: { approvalWorkflowId: approvalWorkflow.id },
  });

  const kpiSnapshots = [
    {
      id: 'seed-kpi-snapshot-2025-01-05',
      date: new Date('2025-01-05T00:00:00.000Z'),
      otif: 91.4,
      pickPerHour: 108,
      inventoryAccuracy: 96.8,
      occupancyPct: 81.2,
      costPerOrder: 3.7,
      kmPerDrop: 7.8,
    },
    {
      id: 'seed-kpi-snapshot-2025-01-12',
      date: new Date('2025-01-12T00:00:00.000Z'),
      otif: 92.6,
      pickPerHour: 111,
      inventoryAccuracy: 97.5,
      occupancyPct: 82.9,
      costPerOrder: 3.6,
      kmPerDrop: 7.5,
    },
    {
      id: 'seed-kpi-snapshot-2025-01-19',
      date: new Date('2025-01-19T00:00:00.000Z'),
      otif: 93.8,
      pickPerHour: 114,
      inventoryAccuracy: 97.9,
      occupancyPct: 83.4,
      costPerOrder: 3.5,
      kmPerDrop: 7.3,
    },
  ];

  for (const snapshot of kpiSnapshots) {
    await prisma.kpiSnapshot.upsert({
      where: { id: snapshot.id },
      update: {
        ...snapshot,
        projectId: nutrialProject.id,
      },
      create: {
        ...snapshot,
        projectId: nutrialProject.id,
      },
    });
  }

  await prisma.reception.upsert({
    where: { id: 'seed-reception-2025-01-05' },
    update: {
      projectId: nutrialProject.id,
      date: new Date('2025-01-05T08:30:00.000Z'),
      truckPlate: 'BCXZ12',
      carrier: 'TransLog',
      dock: 'D-04',
      tArriveGate: new Date('2025-01-05T08:05:00.000Z'),
      tArriveDock: new Date('2025-01-05T08:20:00.000Z'),
      tUnloadStart: new Date('2025-01-05T08:32:00.000Z'),
      tUnloadEnd: new Date('2025-01-05T09:05:00.000Z'),
      tExit: new Date('2025-01-05T09:15:00.000Z'),
      eppOk: true,
      docsOk: true,
      sealNumberDeclared: '778899',
      sealNumberObserved: '778899',
      tempAtOpen: 4.1,
      issues: 'Sin incidencias.',
      inventoryMatchPct: 99.4,
      actions: 'Registrar en dashboard semanal.',
    },
    create: {
      id: 'seed-reception-2025-01-05',
      projectId: nutrialProject.id,
      date: new Date('2025-01-05T08:30:00.000Z'),
      truckPlate: 'BCXZ12',
      carrier: 'TransLog',
      dock: 'D-04',
      tArriveGate: new Date('2025-01-05T08:05:00.000Z'),
      tArriveDock: new Date('2025-01-05T08:20:00.000Z'),
      tUnloadStart: new Date('2025-01-05T08:32:00.000Z'),
      tUnloadEnd: new Date('2025-01-05T09:05:00.000Z'),
      tExit: new Date('2025-01-05T09:15:00.000Z'),
      eppOk: true,
      docsOk: true,
      sealNumberDeclared: '778899',
      sealNumberObserved: '778899',
      tempAtOpen: 4.1,
      issues: 'Sin incidencias.',
      inventoryMatchPct: 99.4,
      actions: 'Registrar en dashboard semanal.',
    },
  });

  console.log('Seed OK', {
    companies: [nutrial.name, democorp.name],
    users: ['admin@demo.com', 'consultor@demo.com', 'cliente@demo.com'],
    dataRequestCategories: categories.map((category) => category.name),
    projectTasks: [planningTaskId, assessmentTaskId],
    dataRequests: dataRequests.map((item) => item.title),
    risks: risks.map((risk) => risk.description),
    findings: findings.map((finding) => finding.title),
    committees: [governanceCommittee.name],
    meetings: [weeklyMeeting.title],
    approvals: [approvalWorkflow.resourceType],
    kpiSnapshots: kpiSnapshots.map((snapshot) => snapshot.date.toISOString()),
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
