import { Router } from 'express';
import { z } from 'zod';

import {
  authenticate,
  requireProjectMembership,
  requireRole
} from '../../core/middleware/auth';
import { enforceProjectAccess } from '../../core/security/enforce-project-access';

import { checklistService, type ChecklistItemInput } from './checklist.service';

const checklistRouter = Router();

checklistRouter.use(authenticate);

const itemSchema = z.object({
  id: z.string().optional(),
  text: z.string().min(1, 'Detalle requerido'),
  isDone: z.boolean().optional()
});

const baseSchema = z.object({
  projectId: z.string().min(1, 'Proyecto requerido'),
  sopId: z.string().min(1, 'SOP requerido'),
  assigneeId: z.string().optional().nullable(),
  status: z.enum(['open', 'in_progress', 'completed', 'signed']).optional(),
  items: z.array(itemSchema).optional()
});

const updateSchema = baseSchema.partial({
  projectId: true,
  sopId: true,
  items: true
});

checklistRouter.get('/', requireProjectMembership(), async (req, res) => {
  const projectId = (req as any).projectId as string;
  const sopId =
    typeof req.query.sopId === 'string' ? req.query.sopId : undefined;
  const checklists = await checklistService.list(projectId, sopId);
  res.json(checklists);
});

checklistRouter.get('/:id', async (req, res) => {
  const checklist = await checklistService.get(req.params.id);
  await enforceProjectAccess(req.user, checklist.sop.process.projectId);
  const { sop, ...rest } = checklist as any;
  res.json({ ...rest, sop: { id: sop.id, title: sop.title } });
});

checklistRouter.post(
  '/',
  requireRole('admin', 'consultor'),
  requireProjectMembership(),
  async (req, res) => {
    const payload = baseSchema.parse(req.body);
    await enforceProjectAccess(req.user, payload.projectId);
    const created = await checklistService.create(
      {
        sopId: payload.sopId,
        assigneeId: payload.assigneeId ?? undefined,
        status: payload.status,
        items: payload.items
      },
      req.user!.id
    );
    res.status(201).json(created);
  }
);

checklistRouter.patch(
  '/:id',
  requireRole('admin', 'consultor'),
  async (req, res) => {
    const payload = updateSchema.parse(req.body);
    const checklist = await checklistService.get(req.params.id);
    await enforceProjectAccess(req.user, checklist.sop.process.projectId);
    const updated = await checklistService.update(
      req.params.id,
      {
        assigneeId: payload.assigneeId ?? undefined,
        status: payload.status
      },
      req.user!.id
    );
    res.json(updated);
  }
);

checklistRouter.patch(
  '/:id/items/:itemId',
  requireRole('admin', 'consultor'),
  async (req, res) => {
    const payload = itemSchema.partial({ text: true }).parse(req.body);
    const fixedPayload: ChecklistItemInput = {
      ...payload,
      text: payload.text ?? ''
    };
    const checklist = await checklistService.get(req.params.id);
    await enforceProjectAccess(req.user, checklist.sop.process.projectId);
    const updated = await checklistService.updateItem(
      req.params.id,
      req.params.itemId,
      fixedPayload,
      req.user!.id
    );
    res.json(updated);
  }
);

checklistRouter.post(
  '/:id/sign',
  requireRole('admin', 'consultor'),
  async (req, res) => {
    const checklist = await checklistService.get(req.params.id);
    await enforceProjectAccess(req.user, checklist.sop.process.projectId);
    const signed = await checklistService.sign(req.params.id, req.user!.id);
    res.json(signed);
  }
);

export { checklistRouter };
