import { prisma } from '../../core/config/db.js';
import { HttpError } from '../../core/errors/http-error.js';

export interface CommitteeInput {
  projectId: string;
  name: string;
  description?: string;
  ownerId?: string;
}

export interface CommitteeUpdateInput {
  name?: string;
  description?: string | null;
  ownerId?: string | null;
}

export const committeeService = {
  async list(projectId?: string) {
    return prisma.committee.findMany({
      where: projectId ? { projectId } : undefined,
      orderBy: { createdAt: 'desc' }
    });
  },

  async get(id: string) {
    const committee = await prisma.committee.findUnique({ where: { id } });
    if (!committee) {
      throw new HttpError(404, 'Comité no encontrado');
    }
    return committee;
  },

  async create(data: CommitteeInput) {
    return prisma.committee.create({
      data
    });
  },

  async update(id: string, data: CommitteeUpdateInput) {
    const existing = await prisma.committee.findUnique({ where: { id } });
    if (!existing) {
      throw new HttpError(404, 'Comité no encontrado');
    }
    return prisma.committee.update({
      where: { id },
      data
    });
  },

  async remove(id: string) {
    const existing = await prisma.committee.findUnique({ where: { id } });
    if (!existing) {
      throw new HttpError(404, 'Comité no encontrado');
    }
    await prisma.committee.delete({ where: { id } });
  }
};
