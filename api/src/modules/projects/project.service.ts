import type { Prisma } from '@prisma/client';

import { prisma } from '../../core/config/db.js';
import { HttpError } from '../../core/errors/http-error.js';
import { auditService } from '../audit/audit.service.js';
import { enforceProjectAccess } from '../../core/security/enforce-project-access.js';

export const projectService = {
  async listByUser(userId: string, role: string) {
    const baseQuery = { include: { company: true, owner: { select: { id: true, name: true, email: true } } } } as const;
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
      status: string;
      startDate?: Date;
      endDate?: Date;
      settings?: Prisma.JsonValue;
    },
    user: { id: string; role: string }
  ) {
    const companyExists = await prisma.company.findUnique({ where: { id: data.companyId }, select: { id: true } });
    if (!companyExists) {
      throw new HttpError(404, 'Empresa no encontrada');
    }

    const payload = {
      ...data,
      ownerId: user.id,
      settings: data.settings ?? { enabledFeatures: [] }
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
    await auditService.record('Project', project.id, 'CREATE', user.id, project.id, null, project);
    return project;
  },

  async update(id: string, data: Prisma.ProjectUncheckedUpdateInput, user: { id: string; role: string }) {
    const before = await prisma.project.findUnique({ where: { id } });
    if (!before) {
      throw new HttpError(404, 'Proyecto no encontrado');
    }
    if (user.role !== 'admin' && before.ownerId !== user.id) {
      throw new HttpError(403, 'Solo el propietario puede actualizar el proyecto');
    }
    const project = await prisma.project.update({ where: { id }, data });
    await auditService.record('Project', id, 'UPDATE', user.id, id, before, project);
    return project;
  },

  async remove(id: string, userId: string) {
    const before = await prisma.project.findUnique({ where: { id } });
    await prisma.project.delete({ where: { id } });
    await auditService.record('Project', id, 'DELETE', userId, id, before, null);
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

  async getFeatures(id: string, user: { id: string; role: string }) {
    await enforceProjectAccess(user, id);
    const project = await prisma.project.findUnique({ where: { id }, select: { settings: true } });
    if (!project) {
      throw new HttpError(404, 'Proyecto no encontrado');
    }
    const raw = project.settings as { enabledFeatures?: unknown } | null;
    const rawFeatures = Array.isArray(raw?.enabledFeatures) ? raw?.enabledFeatures ?? [] : [];
    const enabled = rawFeatures.filter((feature): feature is string => typeof feature === 'string');
    return { enabled };
  },

  async summary(id: string, user: { id: string; role: string }) {
    await enforceProjectAccess(user, id);
    const project = await prisma.project.findUnique({
      where: { id },
      include: { company: true },
    });
    if (!project) {
      throw new HttpError(404, 'Proyecto no encontrado');
    }

    const enabledFeatures = extractEnabledFeatures(project.settings);

    const [
      dataItems,
      surveys,
      surveyResponses,
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
      tasks,
    ] = await Promise.all([
      prisma.dataRequestItem.findMany({ where: { projectId: id } }),
      prisma.survey.findMany({ where: { projectId: id }, include: { questions: true } }),
      prisma.surveyResponse.count({ where: { survey: { projectId: id } } }),
      prisma.interview.count({ where: { projectId: id } }),
      prisma.processAsset.count({ where: { projectId: id } }),
      prisma.systemInventory.count({ where: { projectId: id } }),
      prisma.processCoverage.findMany({ where: { projectId: id } }),
      prisma.integration.count({ where: { projectId: id } }),
      prisma.dataModelQuality.count({ where: { projectId: id } }),
      prisma.securityPosture.findMany({ where: { projectId: id } }),
      prisma.performance.count({ where: { projectId: id } }),
      prisma.costLicensing.findMany({ where: { projectId: id } }),
      prisma.risk.findMany({ where: { projectId: id } }),
      prisma.finding.findMany({ where: { projectId: id } }),
      prisma.pOCItem.findMany({ where: { projectId: id } }),
      prisma.decisionLog.count({ where: { projectId: id } }),
      prisma.kPI.findMany({ where: { projectId: id }, orderBy: { date: 'desc' } }),
      prisma.projectTask.findMany({ where: { projectId: id } }),
    ]);

    const now = new Date();
    const pendingDataItems = dataItems.filter((item) =>
      ['Pending', 'En progreso', 'Pendiente'].includes(item.status)
    );
    const overdueDataItems = dataItems.filter(
      (item) => item.dueDate && new Date(item.dueDate) < now && item.status !== 'Recibido'
    );

    const coverageAverage = coverages.length
      ? coverages.reduce((acc, item) => acc + (item.coverage ?? 0), 0) / coverages.length
      : null;
    const coverageGaps = coverages.filter((item) => item.hasGap).length;

    const openVulnerabilities = securityEntries.filter(
      (entry) => (entry.openVulns ?? '').trim().length > 0
    ).length;

    const totalTco = costEntries.reduce((acc, item) => acc + computeTco(item), 0);

    const criticalRisks = risks.filter((risk) =>
      risk.severity >= 4 || (risk.rag ?? '').toLowerCase() === 'rojo'
    ).length;

    const openFindings = findings.filter((finding) => {
      const status = (finding.status ?? '').toLowerCase();
      return status !== 'closed' && status !== 'cerrado' && status !== 'implementado';
    }).length;

    const activePoc = pocItems.filter((item) => {
      const status = (item.status ?? '').toLowerCase();
      return status !== 'completado' && status !== 'cerrado';
    }).length;

    const lateTasks = tasks.filter((task) =>
      task.endDate < now && !['completado', 'cerrado'].includes((task.status ?? '').toLowerCase())
    );
    const upcomingTasks = tasks
      .filter((task) => task.startDate >= now)
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
    const nextTask = upcomingTasks[0] ?? null;

    return {
      project: {
        id: project.id,
        name: project.name,
        status: project.status,
        company: project.company,
        startDate: project.startDate,
        endDate: project.endDate,
      },
      sections: {
        preKickoff: {
          total: dataItems.length,
          pending: pendingDataItems.length,
          overdue: overdueDataItems.length,
        },
        surveys: {
          total: surveys.length,
          active: surveys.filter((survey) => survey.isActive).length,
          questions: surveys.reduce((acc, survey) => acc + survey.questions.length, 0),
          responses: surveyResponses,
        },
        interviews: {
          total: interviewsCount,
        },
        processes: {
          deliverables: processAssetsCount,
          featuresEnabled: enabledFeatures.length,
        },
        systems: {
          inventory: inventoryCount,
          integrations: integrationsCount,
          coverage: coverages.length,
          gaps: coverageGaps,
          averageCoverage: coverageAverage,
          dataQuality: dataQualityCount,
        },
        security: {
          posture: securityEntries.length,
          openVulnerabilities,
          performance: performanceCount,
          costs: costEntries.length,
          totalTco,
        },
        risks: {
          total: risks.length,
          critical: criticalRisks,
        },
        findings: {
          total: findings.length,
          open: openFindings,
        },
        poc: {
          total: pocItems.length,
          active: activePoc,
        },
        decisions: {
          total: decisionsCount,
        },
        kpis: {
          total: kpis.length,
          latest: kpis[0]
            ? {
                id: kpis[0].id,
                name: kpis[0].name,
                value: kpis[0].value,
                unit: kpis[0].unit,
                date: kpis[0].date,
              }
            : null,
        },
        gantt: {
          total: tasks.length,
          late: lateTasks.length,
          next: nextTask
            ? {
                id: nextTask.id,
                name: nextTask.name,
                startDate: nextTask.startDate,
              }
            : null,
        },
      },
    };
  }
};

const extractEnabledFeatures = (settings: Prisma.JsonValue | null) => {
  const raw = settings as { enabledFeatures?: unknown } | null;
  const rawFeatures = Array.isArray(raw?.enabledFeatures) ? raw?.enabledFeatures ?? [] : [];
  return rawFeatures.filter((feature): feature is string => typeof feature === 'string');
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
