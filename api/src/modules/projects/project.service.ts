import type { Prisma } from '@prisma/client';

import { prisma } from '../../core/config/db.js';
import { HttpError } from '../../core/errors/http-error.js';
import { auditService } from '../audit/audit.service.js';
import { enforceProjectAccess } from '../../core/security/enforce-project-access.js';

export const projectService = {
  async listByUser(userId: string, role: string) {
    const baseQuery = { include: { company: true } } as const;
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
      include: { company: true, memberships: { include: { user: true } } }
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
    const payload = {
      ...data,
      settings: data.settings ?? { enabledFeatures: [] }
    } satisfies Prisma.ProjectUncheckedCreateInput;

    const project = await prisma.project.create({
      data: payload,
      include: { company: true }
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

  async update(id: string, data: Prisma.ProjectUncheckedUpdateInput, userId: string) {
    const before = await prisma.project.findUnique({ where: { id } });
    const project = await prisma.project.update({ where: { id }, data });
    await auditService.record('Project', id, 'UPDATE', userId, id, before, project);
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
  }
};
