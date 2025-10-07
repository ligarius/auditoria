import { prisma } from '../../core/config/db';
import { HttpError } from '../../core/errors/http-error';
import type { AuthenticatedRequest } from '../../core/middleware/auth';
import { auditService } from '../audit/audit.service';

interface InterviewPayload {
  personName: string;
  role?: string | null;
  area?: string | null;
  date?: string | null;
  transcript?: string | null;
  notes?: string | null;
}

const sanitizePayload = (payload: InterviewPayload) => {
  const personName = (payload.personName ?? '').trim();
  if (!personName) {
    throw new HttpError(400, 'El nombre del entrevistado es obligatorio');
  }

  const role = payload.role ? payload.role.trim() : null;
  const area = payload.area ? payload.area.trim() : null;
  const transcript = payload.transcript ? payload.transcript.trim() : null;
  const notes = payload.notes ? payload.notes.trim() : null;

  let date: Date | null = null;
  if (payload.date) {
    const parsed = new Date(payload.date);
    if (Number.isNaN(parsed.getTime())) {
      throw new HttpError(400, 'La fecha de la entrevista es inválida');
    }
    date = parsed;
  }

  return { personName, role, area, transcript, notes, date };
};

export const interviewService = {
  async list(projectId: string) {
    return prisma.interview.findMany({
      where: { projectId },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }]
    });
  },

  async create(
    projectId: string,
    payload: InterviewPayload,
    user: NonNullable<AuthenticatedRequest['user']>
  ) {
    const data = sanitizePayload(payload);

    const interview = await prisma.interview.create({
      data: {
        projectId,
        personName: data.personName,
        role: data.role,
        area: data.area,
        date: data.date,
        transcript: data.transcript,
        notes: data.notes,
        interviewerId: user.id,
        status: 'completed'
      }
    });

    await auditService.record(
      'Interview',
      interview.id,
      'CREATE',
      user.id,
      projectId,
      null,
      interview
    );
    return interview;
  },

  async update(
    projectId: string,
    interviewId: string,
    payload: InterviewPayload,
    user: NonNullable<AuthenticatedRequest['user']>
  ) {
    const existing = await prisma.interview.findUnique({
      where: { id: interviewId }
    });
    if (!existing || existing.projectId !== projectId) {
      throw new HttpError(404, 'Entrevista no encontrada');
    }

    const data = sanitizePayload(payload);

    const updated = await prisma.interview.update({
      where: { id: interviewId },
      data: {
        personName: data.personName,
        role: data.role,
        area: data.area,
        date: data.date,
        transcript: data.transcript,
        notes: data.notes
      }
    });

    await auditService.record(
      'Interview',
      interviewId,
      'UPDATE',
      user.id,
      projectId,
      existing,
      updated
    );
    return updated;
  },

  async remove(
    projectId: string,
    interviewId: string,
    user: NonNullable<AuthenticatedRequest['user']>
  ) {
    const existing = await prisma.interview.findUnique({
      where: { id: interviewId }
    });
    if (!existing || existing.projectId !== projectId) {
      throw new HttpError(404, 'Entrevista no encontrada');
    }

    await prisma.interview.delete({ where: { id: interviewId } });
    await auditService.record(
      'Interview',
      interviewId,
      'DELETE',
      user.id,
      projectId,
      existing,
      null
    );
  }
};
