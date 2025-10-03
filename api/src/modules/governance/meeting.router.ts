import { Router } from 'express';
import { z } from 'zod';

import { authenticate, requireRole } from '../../core/middleware/auth.js';
import { enforceProjectAccess } from '../../core/security/enforce-project-access.js';

import { meetingService } from './meeting.service.js';

const meetingRouter = Router();

meetingRouter.use(authenticate);

const baseSchema = z.object({
  projectId: z.string().min(1, 'Proyecto requerido'),
  committeeId: z.string().min(1).optional(),
  title: z.string().min(1, 'Título requerido'),
  agenda: z.string().optional(),
  scheduledAt: z.coerce.date(),
  location: z.string().optional(),
  status: z.string().optional()
});

const updateSchema = z.object({
  committeeId: z.string().min(1).or(z.literal('')).optional(),
  title: z.string().min(1).optional(),
  agenda: z.string().optional().nullable(),
  scheduledAt: z.coerce.date().optional(),
  location: z.string().optional().nullable(),
  status: z.string().optional()
});

meetingRouter.get('/', async (req, res) => {
  const projectId =
    typeof req.query.projectId === 'string' ? req.query.projectId : undefined;
  const committeeId =
    typeof req.query.committeeId === 'string'
      ? req.query.committeeId
      : undefined;
  if (projectId) {
    await enforceProjectAccess(req.user, projectId);
  }
  const meetings = await meetingService.list({ projectId, committeeId });
  res.json(meetings);
});

meetingRouter.post('/', requireRole('admin', 'consultor'), async (req, res) => {
  const payload = baseSchema.parse(req.body);
  await enforceProjectAccess(req.user, payload.projectId);
  const meeting = await meetingService.create({
    ...payload,
    committeeId: payload.committeeId || undefined,
    scheduledAt: payload.scheduledAt
  });
  res.status(201).json(meeting);
});

meetingRouter.get('/:id', async (req, res) => {
  const meeting = await meetingService.get(req.params.id);
  await enforceProjectAccess(req.user, meeting.projectId);
  res.json(meeting);
});

meetingRouter.put(
  '/:id',
  requireRole('admin', 'consultor'),
  async (req, res) => {
    const payload = updateSchema.parse(req.body);
    const meeting = await meetingService.get(req.params.id);
    await enforceProjectAccess(req.user, meeting.projectId);
    const updated = await meetingService.update(req.params.id, {
      ...payload,
      committeeId:
        payload.committeeId === undefined
          ? undefined
          : payload.committeeId === ''
            ? null
            : payload.committeeId,
      scheduledAt: payload.scheduledAt ?? undefined,
      agenda: payload.agenda ?? undefined,
      location: payload.location ?? undefined
    });
    res.json(updated);
  }
);

meetingRouter.delete('/:id', requireRole('admin'), async (req, res) => {
  const meeting = await meetingService.get(req.params.id);
  await enforceProjectAccess(req.user, meeting.projectId);
  await meetingService.remove(req.params.id);
  res.status(204).end();
});

export { meetingRouter };
