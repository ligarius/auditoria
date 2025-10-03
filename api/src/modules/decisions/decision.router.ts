import { Router } from 'express';
import { z } from 'zod';

import { authenticate, requireProjectRole } from '../../core/middleware/auth';

import { decisionService } from './decision.service';

const decisionRouter = Router();

decisionRouter.use(authenticate);

const decisionSchema = z.object({
  topic: z.string().min(1, 'Tema requerido'),
  decision: z.string().min(1, 'Descripción de la decisión requerida'),
  rationale: z.string().optional().default(''),
  approverA: z.string().min(1, 'Aprobador requerido'),
  date: z.coerce.date().optional(),
  committeeId: z.string().min(1).optional(),
  meetingId: z.string().min(1).optional()
});

decisionRouter.get(
  '/:projectId',
  requireProjectRole(['ConsultorLider', 'Auditor', 'SponsorPM']),
  async (req, res) => {
    const decisions = await decisionService.list(req.params.projectId);
    res.json(decisions);
  }
);

decisionRouter.post(
  '/:projectId',
  requireProjectRole(['ConsultorLider', 'Auditor']),
  async (req, res) => {
    const payload = decisionSchema.parse(req.body);
    const decision = await decisionService.create(
      req.params.projectId,
      {
        ...payload,
        committeeId: payload.committeeId || undefined,
        meetingId: payload.meetingId || undefined,
        date: (payload.date ?? new Date()).toISOString()
      },
      req.user!.id
    );
    res.status(201).json(decision);
  }
);

decisionRouter.put(
  '/:projectId/:decisionId',
  requireProjectRole(['ConsultorLider', 'Auditor']),
  async (req, res) => {
    const payload = decisionSchema.partial().parse(req.body);
    const decision = await decisionService.update(
      req.params.decisionId,
      {
        ...payload,
        committeeId: payload.committeeId || undefined,
        meetingId: payload.meetingId || undefined,
        date: payload.date ? payload.date.toISOString() : undefined
      },
      req.user!.id
    );
    res.json(decision);
  }
);

decisionRouter.delete(
  '/:projectId/:decisionId',
  requireProjectRole(['ConsultorLider']),
  async (req, res) => {
    await decisionService.remove(req.params.decisionId, req.user!.id);
    res.status(204).send();
  }
);

export { decisionRouter };
