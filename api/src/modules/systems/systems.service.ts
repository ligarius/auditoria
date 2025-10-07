import type { CostLicensing, Prisma } from '@prisma/client';

import { prisma } from '../../core/config/db';
import { HttpError } from '../../core/errors/http-error';
import { auditService } from '../audit/audit.service';

const auditResourceNames = {
  inventory: 'SystemInventory',
  coverage: 'ProcessCoverage',
  integrations: 'Integration',
  'data-quality': 'DataModelQuality',
  security: 'SecurityPosture',
  performance: 'Performance',
  costs: 'CostLicensing'
} as const;

type EntityKey = keyof typeof auditResourceNames;

type CostWithTco = CostLicensing & { tco3y: number };

type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE';

const recordAudit = async (
  key: EntityKey,
  id: string,
  action: AuditAction,
  userId: string,
  projectId: string,
  before: unknown,
  after: unknown
) => {
  await auditService.record(
    auditResourceNames[key],
    id,
    action,
    userId,
    projectId,
    before,
    after
  );
};

const withTco = (cost: CostLicensing): CostWithTco => ({
  ...cost,
  tco3y: computeTco(cost)
});

export const systemsService = {
  async list(projectId: string, key: EntityKey) {
    switch (key) {
      case 'inventory':
        return prisma.systemInventory.findMany({ where: { projectId } });
      case 'coverage':
        return prisma.processCoverage.findMany({ where: { projectId } });
      case 'integrations':
        return prisma.integration.findMany({ where: { projectId } });
      case 'data-quality':
        return prisma.dataModelQuality.findMany({ where: { projectId } });
      case 'security':
        return prisma.securityPosture.findMany({ where: { projectId } });
      case 'performance':
        return prisma.performance.findMany({ where: { projectId } });
      case 'costs': {
        const costs = await prisma.costLicensing.findMany({
          where: { projectId }
        });
        return costs.map(withTco);
      }
      default:
        throw new HttpError(400, 'Categoría inválida');
    }
  },

  async create(
    projectId: string,
    key: EntityKey,
    payload: unknown,
    userId: string
  ) {
    switch (key) {
      case 'inventory': {
        const data = {
          ...(payload as Prisma.SystemInventoryUncheckedCreateInput),
          projectId
        };
        const created = await prisma.systemInventory.create({ data });
        await recordAudit(
          key,
          created.id,
          'CREATE',
          userId,
          projectId,
          null,
          created
        );
        return created;
      }
      case 'coverage': {
        const data = {
          ...(payload as Prisma.ProcessCoverageUncheckedCreateInput),
          projectId
        };
        const created = await prisma.processCoverage.create({ data });
        await recordAudit(
          key,
          created.id,
          'CREATE',
          userId,
          projectId,
          null,
          created
        );
        return created;
      }
      case 'integrations': {
        const data = {
          ...(payload as Prisma.IntegrationUncheckedCreateInput),
          projectId
        };
        const created = await prisma.integration.create({ data });
        await recordAudit(
          key,
          created.id,
          'CREATE',
          userId,
          projectId,
          null,
          created
        );
        return created;
      }
      case 'data-quality': {
        const data = {
          ...(payload as Prisma.DataModelQualityUncheckedCreateInput),
          projectId
        };
        const created = await prisma.dataModelQuality.create({ data });
        await recordAudit(
          key,
          created.id,
          'CREATE',
          userId,
          projectId,
          null,
          created
        );
        return created;
      }
      case 'security': {
        const data = {
          ...(payload as Prisma.SecurityPostureUncheckedCreateInput),
          projectId
        };
        const created = await prisma.securityPosture.create({ data });
        await recordAudit(
          key,
          created.id,
          'CREATE',
          userId,
          projectId,
          null,
          created
        );
        return created;
      }
      case 'performance': {
        const data = {
          ...(payload as Prisma.PerformanceUncheckedCreateInput),
          projectId
        };
        const created = await prisma.performance.create({ data });
        await recordAudit(
          key,
          created.id,
          'CREATE',
          userId,
          projectId,
          null,
          created
        );
        return created;
      }
      case 'costs': {
        const data = {
          ...(payload as Prisma.CostLicensingUncheckedCreateInput),
          projectId
        };
        const created = await prisma.costLicensing.create({ data });
        await recordAudit(
          key,
          created.id,
          'CREATE',
          userId,
          projectId,
          null,
          created
        );
        return withTco(created);
      }
      default:
        throw new HttpError(400, 'Categoría inválida');
    }
  },

  async update(id: string, key: EntityKey, payload: unknown, userId: string) {
    switch (key) {
      case 'inventory': {
        const before = await prisma.systemInventory.findUnique({
          where: { id }
        });
        if (!before) throw new HttpError(404, 'Registro no encontrado');
        const updated = await prisma.systemInventory.update({
          where: { id },
          data: payload as Prisma.SystemInventoryUncheckedUpdateInput
        });
        await recordAudit(
          key,
          id,
          'UPDATE',
          userId,
          before.projectId,
          before,
          updated
        );
        return updated;
      }
      case 'coverage': {
        const before = await prisma.processCoverage.findUnique({
          where: { id }
        });
        if (!before) throw new HttpError(404, 'Registro no encontrado');
        const updated = await prisma.processCoverage.update({
          where: { id },
          data: payload as Prisma.ProcessCoverageUncheckedUpdateInput
        });
        await recordAudit(
          key,
          id,
          'UPDATE',
          userId,
          before.projectId,
          before,
          updated
        );
        return updated;
      }
      case 'integrations': {
        const before = await prisma.integration.findUnique({ where: { id } });
        if (!before) throw new HttpError(404, 'Registro no encontrado');
        const updated = await prisma.integration.update({
          where: { id },
          data: payload as Prisma.IntegrationUncheckedUpdateInput
        });
        await recordAudit(
          key,
          id,
          'UPDATE',
          userId,
          before.projectId,
          before,
          updated
        );
        return updated;
      }
      case 'data-quality': {
        const before = await prisma.dataModelQuality.findUnique({
          where: { id }
        });
        if (!before) throw new HttpError(404, 'Registro no encontrado');
        const updated = await prisma.dataModelQuality.update({
          where: { id },
          data: payload as Prisma.DataModelQualityUncheckedUpdateInput
        });
        await recordAudit(
          key,
          id,
          'UPDATE',
          userId,
          before.projectId,
          before,
          updated
        );
        return updated;
      }
      case 'security': {
        const before = await prisma.securityPosture.findUnique({
          where: { id }
        });
        if (!before) throw new HttpError(404, 'Registro no encontrado');
        const updated = await prisma.securityPosture.update({
          where: { id },
          data: payload as Prisma.SecurityPostureUncheckedUpdateInput
        });
        await recordAudit(
          key,
          id,
          'UPDATE',
          userId,
          before.projectId,
          before,
          updated
        );
        return updated;
      }
      case 'performance': {
        const before = await prisma.performance.findUnique({ where: { id } });
        if (!before) throw new HttpError(404, 'Registro no encontrado');
        const updated = await prisma.performance.update({
          where: { id },
          data: payload as Prisma.PerformanceUncheckedUpdateInput
        });
        await recordAudit(
          key,
          id,
          'UPDATE',
          userId,
          before.projectId,
          before,
          updated
        );
        return updated;
      }
      case 'costs': {
        const before = await prisma.costLicensing.findUnique({ where: { id } });
        if (!before) throw new HttpError(404, 'Registro no encontrado');
        const updated = await prisma.costLicensing.update({
          where: { id },
          data: payload as Prisma.CostLicensingUncheckedUpdateInput
        });
        await recordAudit(
          key,
          id,
          'UPDATE',
          userId,
          before.projectId,
          before,
          updated
        );
        return withTco(updated);
      }
      default:
        throw new HttpError(400, 'Categoría inválida');
    }
  },

  async remove(id: string, key: EntityKey, userId: string) {
    switch (key) {
      case 'inventory': {
        const before = await prisma.systemInventory.findUnique({
          where: { id }
        });
        if (!before) throw new HttpError(404, 'Registro no encontrado');
        await prisma.systemInventory.delete({ where: { id } });
        await recordAudit(
          key,
          id,
          'DELETE',
          userId,
          before.projectId,
          before,
          null
        );
        return;
      }
      case 'coverage': {
        const before = await prisma.processCoverage.findUnique({
          where: { id }
        });
        if (!before) throw new HttpError(404, 'Registro no encontrado');
        await prisma.processCoverage.delete({ where: { id } });
        await recordAudit(
          key,
          id,
          'DELETE',
          userId,
          before.projectId,
          before,
          null
        );
        return;
      }
      case 'integrations': {
        const before = await prisma.integration.findUnique({ where: { id } });
        if (!before) throw new HttpError(404, 'Registro no encontrado');
        await prisma.integration.delete({ where: { id } });
        await recordAudit(
          key,
          id,
          'DELETE',
          userId,
          before.projectId,
          before,
          null
        );
        return;
      }
      case 'data-quality': {
        const before = await prisma.dataModelQuality.findUnique({
          where: { id }
        });
        if (!before) throw new HttpError(404, 'Registro no encontrado');
        await prisma.dataModelQuality.delete({ where: { id } });
        await recordAudit(
          key,
          id,
          'DELETE',
          userId,
          before.projectId,
          before,
          null
        );
        return;
      }
      case 'security': {
        const before = await prisma.securityPosture.findUnique({
          where: { id }
        });
        if (!before) throw new HttpError(404, 'Registro no encontrado');
        await prisma.securityPosture.delete({ where: { id } });
        await recordAudit(
          key,
          id,
          'DELETE',
          userId,
          before.projectId,
          before,
          null
        );
        return;
      }
      case 'performance': {
        const before = await prisma.performance.findUnique({ where: { id } });
        if (!before) throw new HttpError(404, 'Registro no encontrado');
        await prisma.performance.delete({ where: { id } });
        await recordAudit(
          key,
          id,
          'DELETE',
          userId,
          before.projectId,
          before,
          null
        );
        return;
      }
      case 'costs': {
        const before = await prisma.costLicensing.findUnique({ where: { id } });
        if (!before) throw new HttpError(404, 'Registro no encontrado');
        await prisma.costLicensing.delete({ where: { id } });
        await recordAudit(
          key,
          id,
          'DELETE',
          userId,
          before.projectId,
          before,
          null
        );
        return;
      }
      default:
        throw new HttpError(400, 'Categoría inválida');
    }
  }
};

const computeTco = (cost: CostLicensing) => {
  const costAnnual = cost.costAnnual ?? 0;
  const implUSD = cost.implUSD ?? 0;
  const infraUSD = cost.infraUSD ?? 0;
  const supportUSD = cost.supportUSD ?? 0;
  const otherUSD = cost.otherUSD ?? 0;
  return costAnnual * 3 + implUSD + infraUSD * 3 + supportUSD * 3 + otherUSD;
};
