import type {
  Prisma,
  ProjectWorkflowState as ProjectWorkflowStateType
} from '@prisma/client';
import { ProjectWorkflowState } from '@prisma/client';

import { prisma } from '../../core/config/db';
import { HttpError } from '../../core/errors/http-error';
import { auditService } from '../audit/audit.service';
import { enforceProjectAccess } from '../../core/security/enforce-project-access';

const WORKFLOW_STATES: readonly ProjectWorkflowStateType[] = [
  ProjectWorkflowState.planificacion,
  ProjectWorkflowState.recoleccion_datos,
  ProjectWorkflowState.analisis,
  ProjectWorkflowState.recomendaciones,
  ProjectWorkflowState.cierre
];

const WORKFLOW_TRANSITIONS: Record<
  ProjectWorkflowStateType,
  ProjectWorkflowStateType[]
> = {
  planificacion: [ProjectWorkflowState.recoleccion_datos],
  recoleccion_datos: [ProjectWorkflowState.analisis],
  analisis: [ProjectWorkflowState.recomendaciones],
  recomendaciones: [ProjectWorkflowState.cierre],
  cierre: []
};

const WORKFLOW_SYNONYMS: Record<string, ProjectWorkflowStateType> = {
  PLANIFICACION: ProjectWorkflowState.planificacion,
  PLANNING: ProjectWorkflowState.planificacion,
  TRABAJO_CAMPO: ProjectWorkflowState.recoleccion_datos,
  FIELDWORK: ProjectWorkflowState.recoleccion_datos,
  RECOLECCION_DATOS: ProjectWorkflowState.recoleccion_datos,
  DATA_COLLECTION: ProjectWorkflowState.recoleccion_datos,
  INFORME: ProjectWorkflowState.analisis,
  REPORT: ProjectWorkflowState.analisis,
  ANALISIS: ProjectWorkflowState.analisis,
  ANALYSIS: ProjectWorkflowState.analisis,
  RECOMENDACIONES: ProjectWorkflowState.recomendaciones,
  RECOMMENDATIONS: ProjectWorkflowState.recomendaciones,
  CIERRE: ProjectWorkflowState.cierre,
  CLOSE: ProjectWorkflowState.cierre,
  CLOSING: ProjectWorkflowState.cierre
};

const coerceWorkflowState = (
  value: unknown,
  defaultState: ProjectWorkflowStateType = ProjectWorkflowState.planificacion
): ProjectWorkflowStateType => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return defaultState;
  }
  const normalizedKey = value.trim().toUpperCase().replace(/\s+/g, '_');
  const mapped = WORKFLOW_SYNONYMS[normalizedKey];
  if (mapped) {
    return mapped;
  }
  const lowerKey = value.trim().toLowerCase() as ProjectWorkflowStateType;
  if (
    (WORKFLOW_STATES as readonly ProjectWorkflowStateType[]).includes(lowerKey)
  ) {
    return lowerKey;
  }
  throw new HttpError(400, 'Estado de proyecto inválido');
};

export const projectService = {
  async listByUser(userId: string, role: string) {
    const baseQuery = {
      include: {
        company: true,
        owner: { select: { id: true, name: true, email: true } }
      }
    } as const;
    if (role === 'admin') {
      return prisma.project.findMany(baseQuery);
    }

    return prisma.project.findMany({
      where: { memberships: { some: { userId } } },
      ...baseQuery
    });
  },

  async getById(id: string, user: { id: string; role: string }) {
    await enforceProjectAccess(user, id);
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        company: true,
        owner: { select: { id: true, name: true, email: true } },
        memberships: { include: { user: true } }
      }
    });
    if (!project) {
      throw new HttpError(404, 'Proyecto no encontrado');
    }
    return project;
  },

  async create(
    data: {
      companyId: string;
      name: string;
      status?: ProjectWorkflowStateType | string;
      startDate?: Date;
      endDate?: Date;
      settings?: Prisma.JsonValue;
    },
    user: { id: string; role: string }
  ) {
    const companyExists = await prisma.company.findUnique({
      where: { id: data.companyId },
      select: { id: true }
    });
    if (!companyExists) {
      throw new HttpError(404, 'Empresa no encontrada');
    }

    const { status: statusInput, settings, ...rest } = data;
    const status = coerceWorkflowState(statusInput);

    const payload = {
      ...rest,
      status,
      ownerId: user.id,
      settings: settings ?? { enabledFeatures: [] }
    } satisfies Prisma.ProjectUncheckedCreateInput;

    const project = await prisma.project.create({
      data: payload,
      include: {
        company: true,
        owner: { select: { id: true, name: true, email: true } }
      }
    });
    const membershipRole = user.role === 'admin' ? 'Admin' : 'ConsultorLider';
    await prisma.membership.upsert({
      where: { userId_projectId: { userId: user.id, projectId: project.id } },
      update: { role: membershipRole },
      create: { userId: user.id, projectId: project.id, role: membershipRole }
    });
    await auditService.record(
      'Project',
      project.id,
      'CREATE',
      user.id,
      project.id,
      null,
      project
    );
    return project;
  },

  async update(
    id: string,
    data: Prisma.ProjectUncheckedUpdateInput,
    user: { id: string; role: string }
  ) {
    const before = await prisma.project.findUnique({ where: { id } });
    if (!before) {
      throw new HttpError(404, 'Proyecto no encontrado');
    }
    if (user.role !== 'admin' && before.ownerId !== user.id) {
      throw new HttpError(
        403,
        'Solo el propietario puede actualizar el proyecto'
      );
    }
    if (Object.prototype.hasOwnProperty.call(data, 'status')) {
      throw new HttpError(
        400,
        'El estado del proyecto debe modificarse mediante el workflow'
      );
    }
    const project = await prisma.project.update({ where: { id }, data });
    await auditService.record(
      'Project',
      id,
      'UPDATE',
      user.id,
      id,
      before,
      project
    );
    return project;
  },

  async remove(id: string, userId: string) {
    const before = await prisma.project.findUnique({ where: { id } });
    await prisma.project.delete({ where: { id } });
    await auditService.record(
      'Project',
      id,
      'DELETE',
      userId,
      id,
      before,
      null
    );
  },

  async invite(projectId: string, email: string, role: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new HttpError(404, 'Usuario no encontrado');
    }
    await prisma.membership.upsert({
      where: { userId_projectId: { userId: user.id, projectId } },
      update: { role },
      create: { userId: user.id, projectId, role }
    });
    return user;
  },

  async getWorkflow(projectId: string, user: { id: string; role: string }) {
    await enforceProjectAccess(user, projectId);
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { status: true, workflowDefinition: true }
    });
    if (!project) {
      throw new HttpError(404, 'Proyecto no encontrado');
    }
    return { state: project.status, definition: project.workflowDefinition };
  },

  async saveWorkflowDiagram(
    projectId: string,
    definition: Prisma.InputJsonValue,
    user: { id: string; role: string }
  ) {
    await enforceProjectAccess(user, projectId);
    const before = await prisma.project.findUnique({
      where: { id: projectId },
      select: { workflowDefinition: true, status: true }
    });
    if (!before) {
      throw new HttpError(404, 'Proyecto no encontrado');
    }
    const updated = await prisma.project.update({
      where: { id: projectId },
      data: { workflowDefinition: definition }
    });
    await auditService.record(
      'Project',
      projectId,
      'WORKFLOW_DIAGRAM',
      user.id,
      projectId,
      before.workflowDefinition,
      updated.workflowDefinition
    );
    return { state: updated.status, definition: updated.workflowDefinition };
  },

  async transitionWorkflow(
    projectId: string,
    nextStateInput: ProjectWorkflowStateType | string,
    user: { id: string; role: string }
  ) {
    await enforceProjectAccess(user, projectId);
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { status: true }
    });
    if (!project) {
      throw new HttpError(404, 'Proyecto no encontrado');
    }
    const nextState = coerceWorkflowState(nextStateInput, project.status);
    if (project.status === nextState) {
      return { state: project.status };
    }
    const currentStatus = project.status as ProjectWorkflowStateType;
    const allowedTargets = WORKFLOW_TRANSITIONS[currentStatus];
    if (!allowedTargets.includes(nextState)) {
      throw new HttpError(400, 'Transición de estado no permitida');
    }
    const updated = await prisma.project.update({
      where: { id: projectId },
      data: { status: nextState }
    });
    await auditService.record(
      'Project',
      projectId,
      'WORKFLOW_STATE',
      user.id,
      projectId,
      project.status,
      updated.status
    );
    return { state: updated.status };
  },

  async getFeatures(id: string, user: { id: string; role: string }) {
    await enforceProjectAccess(user, id);
    const project = await prisma.project.findUnique({
      where: { id },
      select: { settings: true }
    });
    if (!project) {
      throw new HttpError(404, 'Proyecto no encontrado');
    }
    const raw = project.settings as { enabledFeatures?: unknown } | null;
    const rawFeatures = Array.isArray(raw?.enabledFeatures)
      ? (raw?.enabledFeatures ?? [])
      : [];
    const enabled = rawFeatures.filter(
      (feature): feature is string => typeof feature === 'string'
    );
    return { enabled };
  },

  async summary(id: string, user: { id: string; role: string }) {
    await enforceProjectAccess(user, id);
    const project = await prisma.project.findUnique({
      where: { id },
      include: { company: true }
    });
    if (!project) {
      throw new HttpError(404, 'Proyecto no encontrado');
    }

    const enabledFeatures = extractEnabledFeatures(project.settings);

    const dataItemsPromise = prisma.dataRequestItem.findMany({
      where: { projectId: id }
    });
    const surveyLinksPromise = prisma.surveyLink.findMany({
      where: { projectId: id },
      include: { version: { select: { formJson: true, status: true } } }
    });
    const questionnaireResponsesCountPromise =
      prisma.questionnaireResponse.count({
        where: { projectId: id }
      });
    const interviewsCountPromise = prisma.interview.count({
      where: { projectId: id }
    });
    const processAssetsCountPromise = prisma.processAsset.count({
      where: { projectId: id }
    });
    const inventoryCountPromise = prisma.systemInventory.count({
      where: { projectId: id }
    });
    const coveragesPromise = prisma.processCoverage.findMany({
      where: { projectId: id }
    });
    const integrationsCountPromise = prisma.integration.count({
      where: { projectId: id }
    });
    const dataQualityCountPromise = prisma.dataModelQuality.count({
      where: { projectId: id }
    });
    const securityEntriesPromise = prisma.securityPosture.findMany({
      where: { projectId: id }
    });
    const performanceCountPromise = prisma.performance.count({
      where: { projectId: id }
    });
    const costEntriesPromise = prisma.costLicensing.findMany({
      where: { projectId: id }
    });
    const risksPromise = prisma.risk.findMany({ where: { projectId: id } });
    const findingsPromise = prisma.finding.findMany({
      where: { projectId: id }
    });
    const pocItemsPromise = prisma.pOCItem.findMany({
      where: { projectId: id }
    });
    const decisionsCountPromise = prisma.decision.count({
      where: { projectId: id }
    });
    const kpisPromise = prisma.kPI.findMany({
      where: { projectId: id },
      orderBy: { date: 'desc' }
    });
    const tasksPromise = prisma.projectTask.findMany({
      where: { projectId: id }
    });

    const [
      dataItems,
      surveyLinks,
      questionnaireResponsesCount,
      interviewsCount,
      processAssetsCount,
      inventoryCount,
      coverages,
      integrationsCount,
      dataQualityCount,
      securityEntries,
      performanceCount,
      costEntries,
      risks,
      findings,
      pocItems,
      decisionsCount,
      kpis,
      tasks
    ] = await Promise.all([
      dataItemsPromise,
      surveyLinksPromise,
      questionnaireResponsesCountPromise,
      interviewsCountPromise,
      processAssetsCountPromise,
      inventoryCountPromise,
      coveragesPromise,
      integrationsCountPromise,
      dataQualityCountPromise,
      securityEntriesPromise,
      performanceCountPromise,
      costEntriesPromise,
      risksPromise,
      findingsPromise,
      pocItemsPromise,
      decisionsCountPromise,
      kpisPromise,
      tasksPromise
    ]);

    const now = new Date();
    type DataRequestItemRecord = (typeof dataItems)[number];
    type SurveyLinkWithVersion = (typeof surveyLinks)[number];
    type ProcessCoverageRecord = (typeof coverages)[number];
    type SecurityPostureRecord = (typeof securityEntries)[number];
    type RiskRecord = (typeof risks)[number];
    type FindingRecord = (typeof findings)[number];
    type PocItemRecord = (typeof pocItems)[number];
    type ProjectTaskRecord = (typeof tasks)[number];

    const pendingDataItems = dataItems.filter((item: DataRequestItemRecord) => {
      const status = (item.status ?? '').toString();
      return ['Pending', 'En progreso', 'Pendiente'].includes(status);
    });
    const overdueDataItems = dataItems.filter((item: DataRequestItemRecord) => {
      if (!item.dueDate) {
        return false;
      }
      const dueDate =
        item.dueDate instanceof Date ? item.dueDate : new Date(item.dueDate);
      const status = (item.status ?? '').toString();
      return dueDate < now && status !== 'Recibido';
    });

    const activeSurveyLinks = surveyLinks.filter(
      (link: SurveyLinkWithVersion) => !link.expiresAt || link.expiresAt > now
    );
    const publishedSurveyLinks = surveyLinks.filter(
      (link: SurveyLinkWithVersion) => link.version.status === 'PUBLISHED'
    );
    let totalQuestions = 0;
    for (const link of surveyLinks) {
      totalQuestions += countFormComponents(link.version.formJson);
    }

    let totalCoverage = 0;
    for (const coverage of coverages) {
      totalCoverage += coverage.coverage ?? 0;
    }
    const coverageAverage = coverages.length
      ? totalCoverage / coverages.length
      : null;
    const coverageGaps = coverages.filter((item: ProcessCoverageRecord) =>
      Boolean(item.hasGap)
    ).length;

    const openVulnerabilities = securityEntries.filter(
      (entry: SecurityPostureRecord) =>
        ((entry.openVulns ?? '') as string).trim().length > 0
    ).length;

    let totalTco = 0;
    for (const entry of costEntries) {
      totalTco += computeTco(entry);
    }

    const criticalRisks = risks.filter((risk: RiskRecord) => {
      const severity = risk.severity ?? 0;
      const rag = (risk.rag ?? '').toLowerCase();
      return severity >= 4 || rag === 'rojo';
    }).length;

    const openFindings = findings.filter((finding: FindingRecord) => {
      const status = (finding.status ?? '').toLowerCase();
      return (
        status !== 'closed' && status !== 'cerrado' && status !== 'implementado'
      );
    }).length;

    const activePoc = pocItems.filter((item: PocItemRecord) => {
      const status = (item.status ?? '').toLowerCase();
      return status !== 'completado' && status !== 'cerrado';
    }).length;

    const lateTasks = tasks.filter((task: ProjectTaskRecord) => {
      if (!task.endDate) {
        return false;
      }
      const status = (task.status ?? '').toLowerCase();
      return task.endDate < now && !['completado', 'cerrado'].includes(status);
    });
    const upcomingTasks = tasks
      .filter(
        (task): task is ProjectTaskRecord & { startDate: Date } =>
          Boolean(task.startDate) && task.startDate >= now
      )
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
    const nextTask = upcomingTasks[0] ?? null;

    return {
      project: {
        id: project.id,
        name: project.name,
        status: project.status,
        company: project.company,
        startDate: project.startDate,
        endDate: project.endDate
      },
      sections: {
        preKickoff: {
          total: dataItems.length,
          pending: pendingDataItems.length,
          overdue: overdueDataItems.length
        },
        surveys: {
          total: surveyLinks.length,
          active: activeSurveyLinks.length,
          published: publishedSurveyLinks.length,
          questions: totalQuestions,
          responses: questionnaireResponsesCount
        },
        interviews: {
          total: interviewsCount
        },
        processes: {
          deliverables: processAssetsCount,
          featuresEnabled: enabledFeatures.length
        },
        systems: {
          inventory: inventoryCount,
          integrations: integrationsCount,
          coverage: coverages.length,
          gaps: coverageGaps,
          averageCoverage: coverageAverage,
          dataQuality: dataQualityCount
        },
        security: {
          posture: securityEntries.length,
          openVulnerabilities,
          performance: performanceCount,
          costs: costEntries.length,
          totalTco
        },
        risks: {
          total: risks.length,
          critical: criticalRisks
        },
        findings: {
          total: findings.length,
          open: openFindings
        },
        poc: {
          total: pocItems.length,
          active: activePoc
        },
        decisions: {
          total: decisionsCount
        },
        kpis: {
          total: kpis.length,
          latest: kpis[0]
            ? {
                id: kpis[0].id,
                name: kpis[0].name,
                value: kpis[0].value,
                unit: kpis[0].unit,
                date: kpis[0].date
              }
            : null
        },
        gantt: {
          total: tasks.length,
          late: lateTasks.length,
          next: nextTask
            ? {
                id: nextTask.id,
                name: nextTask.name,
                startDate: nextTask.startDate
              }
            : null
        }
      }
    };
  }
};

const extractEnabledFeatures = (settings: Prisma.JsonValue | null) => {
  const raw = settings as { enabledFeatures?: unknown } | null;
  const rawFeatures = Array.isArray(raw?.enabledFeatures)
    ? (raw?.enabledFeatures ?? [])
    : [];
  return rawFeatures.filter(
    (feature): feature is string => typeof feature === 'string'
  );
};

const countFormComponents = (formJson: Prisma.JsonValue): number => {
  const visited = new Set<unknown>();
  const walk = (components: unknown): number => {
    if (!components) return 0;
    if (visited.has(components)) {
      return 0;
    }
    visited.add(components);
    if (Array.isArray(components)) {
      return components.reduce((acc, item) => acc + walk(item), 0);
    }
    if (typeof components === 'object') {
      const component = components as {
        components?: unknown;
        columns?: { components?: unknown }[];
      };
      const nestedFromComponents = walk(component.components ?? []);
      const nestedFromColumns = Array.isArray(component.columns)
        ? component.columns.reduce(
            (acc, col) => acc + walk(col.components ?? []),
            0
          )
        : 0;
      return 1 + nestedFromComponents + nestedFromColumns;
    }
    return 0;
  };

  const form = formJson as { components?: unknown } | null;
  return walk(form?.components ?? []);
};

const computeTco = (cost: {
  costAnnual?: number | null;
  implUSD?: number | null;
  infraUSD?: number | null;
  supportUSD?: number | null;
  otherUSD?: number | null;
}) => {
  const costAnnual = cost.costAnnual ?? 0;
  const implUSD = cost.implUSD ?? 0;
  const infraUSD = cost.infraUSD ?? 0;
  const supportUSD = cost.supportUSD ?? 0;
  const otherUSD = cost.otherUSD ?? 0;
  return costAnnual * 3 + implUSD + infraUSD * 3 + supportUSD * 3 + otherUSD;
};
