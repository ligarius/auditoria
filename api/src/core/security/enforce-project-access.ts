import { prisma } from '../config/db.js';
import { HttpError } from '../errors/http-error.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';

export const enforceProjectAccess = async (
  user:
    | (Pick<NonNullable<AuthenticatedRequest['user']>, 'id' | 'role'> &
        Partial<
          Pick<NonNullable<AuthenticatedRequest['user']>, 'email' | 'projects'>
        >)
    | undefined,
  projectId: string
) => {
  if (!user) {
    throw new HttpError(401, 'No autenticado');
  }

  if (user.role === 'admin') {
    return;
  }

  const membership = await prisma.membership.findUnique({
    where: { userId_projectId: { userId: user.id, projectId } }
  });

  if (!membership) {
    throw new HttpError(403, 'Sin acceso al proyecto');
  }
};
