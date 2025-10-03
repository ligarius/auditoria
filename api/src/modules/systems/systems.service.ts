import { prisma } from '../../core/config/db';
import { HttpError } from '../../core/errors/http-error';
import { auditService } from '../audit/audit.service';

const entityMap = {
  inventory: prisma.systemInventory,
  coverage: prisma.processCoverage,
  integrations: prisma.integration,
  'data-quality': prisma.dataModelQuality,
  security: prisma.securityPosture,
  performance: prisma.performance,
  costs: prisma.costLicensing
} as const;

type EntityKey = keyof typeof entityMap;

type RepoLike<T> = {
  findMany: (args: any) => Promise<T[]>;
  findUnique?: (args: any) => Promise<T | null>;
  create?: (args: any) => Promise<T>;
  update?: (args: any) => Promise<T>;
  delete?: (args: any) => Promise<T>;
};

export const systemsService = {
  async list(projectId: string, key: EntityKey) {
    const repo = entityMap[key] as RepoLike<any>;
    const items = await repo.findMany({ where: { projectId } });
    if (key === 'costs') {
      return items.map((item) => ({ ...item, tco3y: computeTco(item) }));
    }
    return items;
  },

  async create(
    projectId: string,
    key: EntityKey,
    payload: any,
    userId: string
  ) {
    const repo = entityMap[key] as RepoLike<any>;
    const created = await repo.create!({ data: { ...payload, projectId } });
    await auditService.record(
      repoName(key),
      created.id,
      'CREATE',
      userId,
      projectId,
      null,
      created
    );
    return key === 'costs'
      ? { ...created, tco3y: computeTco(created) }
      : created;
  },

  async update(id: string, key: EntityKey, payload: any, userId: string) {
    const repo = entityMap[key] as RepoLike<any>;
    const before = await repo.findUnique!({ where: { id } });
    if (!before) throw new HttpError(404, 'Registro no encontrado');
    const updated = await repo.update!({ where: { id }, data: payload });
    await auditService.record(
      repoName(key),
      id,
      'UPDATE',
      userId,
      before.projectId,
      before,
      updated
    );
    return key === 'costs'
      ? { ...updated, tco3y: computeTco(updated) }
      : updated;
  },

  async remove(id: string, key: EntityKey, userId: string) {
    const repo = entityMap[key] as RepoLike<any>;
    const before = await repo.findUnique!({ where: { id } });
    if (!before) throw new HttpError(404, 'Registro no encontrado');
    await repo.delete!({ where: { id } });
    await auditService.record(
      repoName(key),
      id,
      'DELETE',
      userId,
      before.projectId,
      before,
      null
    );
  }
};

const repoName = (key: EntityKey) =>
  ({
    inventory: 'SystemInventory',
    coverage: 'ProcessCoverage',
    integrations: 'Integration',
    'data-quality': 'DataModelQuality',
    security: 'SecurityPosture',
    performance: 'Performance',
    costs: 'CostLicensing'
  })[key];

const computeTco = (cost: any) => {
  const costAnnual = cost.costAnnual ?? 0;
  const implUSD = cost.implUSD ?? 0;
  const infraUSD = cost.infraUSD ?? 0;
  const supportUSD = cost.supportUSD ?? 0;
  const otherUSD = cost.otherUSD ?? 0;
  return costAnnual * 3 + implUSD + infraUSD * 3 + supportUSD * 3 + otherUSD;
};
