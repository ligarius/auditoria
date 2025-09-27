import { NextFunction, Request, Response } from 'express';

import { prisma } from '../config/db.js';
import { HttpError } from '../errors/http-error.js';
import { verifyAccessToken } from '../utils/jwt.js';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    projects: Record<string, string>;
  };
}

export const authenticate = async (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    throw new HttpError(401, 'No autenticado');
  }

  const token = authHeader.replace('Bearer ', '');
  try {
    const payload = verifyAccessToken(token);
    const memberships = await prisma.membership.findMany({
      where: { userId: payload.sub },
      select: { projectId: true, role: true }
    });
    const projectRoles = memberships.reduce<Record<string, string>>((acc, m) => {
      acc[m.projectId] = m.role;
      return acc;
    }, {});
    req.user = { id: payload.sub, email: payload.email, role: payload.role, projects: projectRoles };
    next();
  } catch (error) {
    throw new HttpError(401, 'Token inválido', error);
  }
};

export const requireProjectRole = (roles: string[]) => {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    const projectId = req.params.projectId ?? (req.query.projectId as string);
    if (!projectId) {
      throw new HttpError(400, 'projectId requerido');
    }
    const userRole = req.user?.projects[projectId];
    const globalRole = req.user?.role;
    if (!userRole && globalRole !== 'admin') {
      throw new HttpError(403, 'Sin acceso al proyecto');
    }
    if (globalRole === 'admin' || roles.includes(userRole ?? '')) {
      return next();
    }
    throw new HttpError(403, 'Rol insuficiente');
  };
};
