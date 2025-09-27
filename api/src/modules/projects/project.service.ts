import { prisma } from '../../core/config/db.js';
import { HttpError } from '../../core/errors/http-error.js';
import { auditService } from '../audit/audit.service.js';

export const projectService = {
  async listByUser(userId: string) {
    return prisma.project.findMany({
      where: { memberships: { some: { userId } } },
      include: { company: true }
    });
  },

  async getById(id: string) {
    const project = await prisma.project.findUnique({
      where: { id },
      include: { company: true, memberships: { include: { user: true } } }
    });
    if (!project) {
      throw new HttpError(404, 'Proyecto no encontrado');
    }
    return project;
  },

  async create(data: { companyId: string; name: string; status: string; startDate?: Date; endDate?: Date }, userId: string) {
    const project = await prisma.project.create({
      data,
      include: { company: true }
    });
    await auditService.record('Project', project.id, 'CREATE', userId, project.id, null, project);
    return project;
  },

  async update(id: string, data: Record<string, unknown>, userId: string) {
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
  }
};
