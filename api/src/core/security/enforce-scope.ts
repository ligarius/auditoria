import type { AuthenticatedRequest } from '../middleware/auth';
import { prisma } from '../config/db';
import { HttpError } from '../errors/http-error';

import { enforceProjectAccess } from './enforce-project-access';

const extractString = (value: unknown): string | undefined => {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value;
  }
  return undefined;
};

const extractFromObject = (
  source: unknown,
  key: string
): string | undefined => {
  if (!source || typeof source !== 'object') {
    return undefined;
  }
  return extractString((source as Record<string, unknown>)[key]);
};

const findProjectId = (req: AuthenticatedRequest): string | undefined => {
  return (
    extractFromObject(req.params, 'projectId') ||
    extractFromObject(req.query, 'projectId') ||
    extractFromObject(req.body, 'projectId')
  );
};

const findCompanyId = (req: AuthenticatedRequest): string | undefined => {
  return (
    extractFromObject(req.params, 'companyId') ||
    extractFromObject(req.query, 'companyId') ||
    extractFromObject(req.body, 'companyId')
  );
};

export const ensureScopedAccess = async (req: AuthenticatedRequest) => {
  if (!req.user || req.user.role === 'admin') {
    return;
  }

  const projectId = findProjectId(req);
  if (projectId) {
    await enforceProjectAccess(req.user, projectId);
  }

  const companyId = findCompanyId(req);
  if (companyId) {
    const hasMembership = await prisma.project.findFirst({
      where: {
        companyId,
        memberships: { some: { userId: req.user.id } }
      },
      select: { id: true }
    });

    if (!hasMembership) {
      throw new HttpError(403, 'Sin acceso a la empresa solicitada');
    }
  }
};
