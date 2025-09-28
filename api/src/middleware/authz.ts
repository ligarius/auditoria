import type { NextFunction, Response } from 'express';

import type { AuthenticatedRequest } from '../core/middleware/auth.js';
import { prisma } from '../core/config/db.js';
import { HttpError } from '../core/errors/http-error.js';
import { enforceProjectAccess } from '../core/security/enforce-project-access.js';

declare module 'express-serve-static-core' {
  interface Request {
    tenant?: {
      companyId?: string;
      projectId?: string;
    };
  }
}

const pickFirst = (...values: Array<string | undefined | null>) =>
  values.find((value): value is string => typeof value === 'string' && value.length > 0);

export const authorizeTenantScope = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    throw new HttpError(401, 'No autenticado');
  }

  const projectId = pickFirst(
    req.params.projectId,
    req.query.projectId as string | undefined,
    (req.body as Record<string, unknown> | undefined)?.projectId as string | undefined
  );

  const companyId = pickFirst(
    req.params.companyId,
    req.query.companyId as string | undefined,
    (req.body as Record<string, unknown> | undefined)?.companyId as string | undefined
  );

  if (!projectId && !companyId) {
    req.tenant = {};
    return next();
  }

  let resolvedCompanyId = companyId;

  if (projectId) {
    await enforceProjectAccess(req.user, projectId);
    if (!resolvedCompanyId) {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { companyId: true }
      });
      if (!project) {
        throw new HttpError(404, 'Proyecto no encontrado');
      }
      resolvedCompanyId = project.companyId;
    }
  }

  if (resolvedCompanyId && req.user.role !== 'admin') {
    const membership = await prisma.membership.findFirst({
      where: { userId: req.user.id, project: { companyId: resolvedCompanyId } },
      select: { id: true }
    });

    if (!membership) {
      throw new HttpError(403, 'Sin acceso a la empresa');
    }
  }

  req.tenant = {
    companyId: resolvedCompanyId,
    projectId: projectId ?? undefined
  };

  next();
};
