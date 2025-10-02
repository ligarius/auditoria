import { prisma } from '../../core/config/db.js';
import { HttpError } from '../../core/errors/http-error.js';

export interface MeetingInput {
  projectId: string;
  committeeId?: string;
  title: string;
  agenda?: string;
  scheduledAt: Date;
  location?: string;
  status?: string;
}

export interface MeetingUpdateInput {
  committeeId?: string | null;
  title?: string;
  agenda?: string | null;
  scheduledAt?: Date;
  location?: string | null;
  status?: string;
}

export const meetingService = {
  async list(filters: { projectId?: string; committeeId?: string }) {
    const { projectId, committeeId } = filters;
    return prisma.meeting.findMany({
      where: {
        projectId: projectId ?? undefined,
        committeeId: committeeId ?? undefined,
      },
      orderBy: { scheduledAt: 'desc' },
    });
  },

  async get(id: string) {
    const meeting = await prisma.meeting.findUnique({ where: { id } });
    if (!meeting) {
      throw new HttpError(404, 'Reunión no encontrada');
    }
    return meeting;
  },

  async create(data: MeetingInput) {
    return prisma.meeting.create({
      data,
    });
  },

  async update(id: string, data: MeetingUpdateInput) {
    const existing = await prisma.meeting.findUnique({ where: { id } });
    if (!existing) {
      throw new HttpError(404, 'Reunión no encontrada');
    }
    return prisma.meeting.update({
      where: { id },
      data,
    });
  },

  async remove(id: string) {
    const existing = await prisma.meeting.findUnique({ where: { id } });
    if (!existing) {
      throw new HttpError(404, 'Reunión no encontrada');
    }
    await prisma.meeting.delete({ where: { id } });
  },
};
