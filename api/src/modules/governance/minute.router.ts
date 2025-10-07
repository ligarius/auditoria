import { Router } from 'express';
import { z } from 'zod';

import { authenticate, requireRole } from '../../core/middleware/auth';
import { enforceProjectAccess } from '../../core/security/enforce-project-access';

import { meetingService } from './meeting.service';
import { minuteService } from './minute.service';

const minuteRouter = Router();

minuteRouter.use(authenticate);

const baseSchema = z.object({
  meetingId: z.string().min(1, 'Reunión requerida'),
  content: z.string().min(1, 'Contenido requerido'),
  authorId: z.string().min(1).optional(),
  agreements: z
    .array(
      z.object({
        description: z.string().min(1, 'Descripción requerida'),
        responsible: z.string().min(1, 'Responsable requerido'),
        dueDate: z.coerce.date().optional().nullable()
      })
    )
    .optional()
});

const updateSchema = z.object({
  content: z.string().min(1).optional(),
  authorId: z.string().min(1).or(z.literal('')).optional(),
  agreements: z
    .array(
      z.object({
        description: z.string().min(1),
        responsible: z.string().min(1),
        dueDate: z.coerce.date().optional().nullable()
      })
    )
    .optional()
});

minuteRouter.get('/', async (req, res) => {
  const projectId =
    typeof req.query.projectId === 'string' ? req.query.projectId : undefined;
  const meetingId =
    typeof req.query.meetingId === 'string' ? req.query.meetingId : undefined;

  if (!projectId && !meetingId) {
    return res
      .status(400)
      .json({ title: 'projectId o meetingId es requerido' });
  }

  if (projectId) {
    await enforceProjectAccess(req.user, projectId);
  }

  if (meetingId) {
    const meeting = await meetingService.get(meetingId);
    await enforceProjectAccess(req.user, meeting.projectId);
  }

  const minutes = await minuteService.list({ projectId, meetingId });
  res.json(minutes);
});

minuteRouter.post('/', requireRole('admin', 'consultor'), async (req, res) => {
  const payload = baseSchema.parse(req.body);
  const meeting = await meetingService.get(payload.meetingId);
  await enforceProjectAccess(req.user, meeting.projectId);
  const minute = await minuteService.create({
    meetingId: payload.meetingId,
    content: payload.content,
    authorId: payload.authorId ?? null,
    agreements: payload.agreements
  });
  res.status(201).json(minute);
});

minuteRouter.get('/:id', async (req, res) => {
  const minute = await minuteService.get(req.params.id);
  if (!minute.meeting) {
    return res.status(404).json({ title: 'Reunión no encontrada' });
  }
  await enforceProjectAccess(req.user, minute.meeting.projectId);
  res.json(minute);
});

minuteRouter.put(
  '/:id',
  requireRole('admin', 'consultor'),
  async (req, res) => {
    const payload = updateSchema.parse(req.body);
    const minute = await minuteService.get(req.params.id);
    if (!minute.meeting) {
      return res.status(404).json({ title: 'Reunión no encontrada' });
    }
    await enforceProjectAccess(req.user, minute.meeting.projectId);
    const updated = await minuteService.update(req.params.id, {
      content: payload.content ?? undefined,
      authorId:
        payload.authorId === undefined
          ? undefined
          : payload.authorId === ''
            ? null
            : payload.authorId,
      agreements: payload.agreements ?? undefined
    });
    res.json(updated);
  }
);

minuteRouter.delete('/:id', requireRole('admin'), async (req, res) => {
  const minute = await minuteService.get(req.params.id);
  if (!minute.meeting) {
    return res.status(404).json({ title: 'Reunión no encontrada' });
  }
  await enforceProjectAccess(req.user, minute.meeting.projectId);
  await minuteService.remove(req.params.id);
  res.status(204).end();
});

export { minuteRouter };
