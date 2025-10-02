import { prisma } from '../../core/config/db.js';
import { HttpError } from '../../core/errors/http-error.js';

export interface MinuteInput {
  meetingId: string;
  authorId?: string | null;
  content: string;
}

export interface MinuteUpdateInput {
  content?: string;
  authorId?: string | null;
}

export const minuteService = {
  async list(filters: { projectId?: string; meetingId?: string }) {
    const { projectId, meetingId } = filters;
    return prisma.minute.findMany({
      where: {
        meetingId: meetingId ?? undefined,
        meeting: projectId ? { projectId } : undefined,
      },
      include: {
        meeting: { select: { id: true, projectId: true, title: true, scheduledAt: true } },
        author: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  async get(id: string) {
    const minute = await prisma.minute.findUnique({
      where: { id },
      include: {
        meeting: { select: { id: true, projectId: true, title: true, scheduledAt: true } },
        author: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
    if (!minute) {
      throw new HttpError(404, 'Minuta no encontrada');
    }
    return minute;
  },

  async create(data: MinuteInput) {
    return prisma.minute.create({
      data: {
        meetingId: data.meetingId,
        content: data.content,
        authorId: data.authorId ?? null,
      },
      include: {
        meeting: { select: { id: true, projectId: true, title: true, scheduledAt: true } },
        author: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
  },

  async update(id: string, data: MinuteUpdateInput) {
    const existing = await prisma.minute.findUnique({ where: { id } });
    if (!existing) {
      throw new HttpError(404, 'Minuta no encontrada');
    }
    return prisma.minute.update({
      where: { id },
      data: {
        content: data.content ?? undefined,
        authorId: data.authorId === undefined ? undefined : data.authorId,
      },
      include: {
        meeting: { select: { id: true, projectId: true, title: true, scheduledAt: true } },
        author: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
  },

  async remove(id: string) {
    const existing = await prisma.minute.findUnique({ where: { id } });
    if (!existing) {
      throw new HttpError(404, 'Minuta no encontrada');
    }
    await prisma.minute.delete({ where: { id } });
  },
};
