import { Router } from 'express';
import { z } from 'zod';

import { authenticate, requireProjectRole } from '../../core/middleware/auth.js';
import { kpiService } from './kpi.service.js';

const kpiRouter = Router();

kpiRouter.use(authenticate);

const optionalMetric = z
  .preprocess(
    (value) => (value === '' || value === null || value === undefined ? undefined : value),
    z.coerce.number(),
  )
  .optional();

const createSchema = z.object({
  projectId: z.string().min(1, 'Proyecto requerido'),
  date: z.coerce.date(),
  otif: optionalMetric,
  pickPerHour: optionalMetric,
  inventoryAccuracy: optionalMetric,
  occupancyPct: optionalMetric,
  costPerOrder: optionalMetric,
  kmPerDrop: optionalMetric,
});

const updateSchema = createSchema.partial({ projectId: true }).extend({ date: z.coerce.date().optional() });

const normalizePayload = (payload: z.infer<typeof updateSchema>) => ({
  date: payload.date ?? undefined,
  otif: payload.otif ?? undefined,
  pickPerHour: payload.pickPerHour ?? undefined,
  inventoryAccuracy: payload.inventoryAccuracy ?? undefined,
  occupancyPct: payload.occupancyPct ?? undefined,
  costPerOrder: payload.costPerOrder ?? undefined,
  kmPerDrop: payload.kmPerDrop ?? undefined,
});

kpiRouter.get('/', requireProjectRole(['ConsultorLider', 'Auditor', 'SponsorPM', 'Invitado']), async (req, res) => {
  const projectId = typeof req.query.projectId === 'string' ? req.query.projectId : undefined;
  if (!projectId) {
    return res.status(400).json({ title: 'projectId es requerido' });
  }
  const kpis = await kpiService.list(projectId);
  res.json(kpis);
});

kpiRouter.post('/', requireProjectRole(['ConsultorLider', 'Auditor']), async (req, res) => {
  const payload = createSchema.parse(req.body);
  const kpi = await kpiService.create(
    payload.projectId,
    {
      date: payload.date,
      otif: payload.otif ?? null,
      pickPerHour: payload.pickPerHour ?? null,
      inventoryAccuracy: payload.inventoryAccuracy ?? null,
      occupancyPct: payload.occupancyPct ?? null,
      costPerOrder: payload.costPerOrder ?? null,
      kmPerDrop: payload.kmPerDrop ?? null,
    },
    req.user!.id,
  );
  res.status(201).json(kpi);
});

kpiRouter.put('/:id', requireProjectRole(['ConsultorLider', 'Auditor']), async (req, res) => {
  const payload = updateSchema.parse(req.body);
  const kpi = await kpiService.update(req.params.id, normalizePayload(payload), req.user!.id);
  res.json(kpi);
});

kpiRouter.delete('/:id', requireProjectRole(['ConsultorLider']), async (req, res) => {
  await kpiService.remove(req.params.id, req.user!.id);
  res.status(204).send();
});

// Compatibilidad con rutas anteriores basadas en projectId en el path
kpiRouter.get('/:projectId', requireProjectRole(['ConsultorLider', 'Auditor', 'SponsorPM']), async (req, res) => {
  const kpis = await kpiService.list(req.params.projectId);
  res.json(kpis);
});

kpiRouter.post('/:projectId', requireProjectRole(['ConsultorLider', 'Auditor']), async (req, res) => {
  const payload = updateSchema.parse({ ...req.body, projectId: req.params.projectId });
  const kpi = await kpiService.create(
    req.params.projectId,
    {
      date: payload.date ?? new Date(),
      otif: payload.otif ?? null,
      pickPerHour: payload.pickPerHour ?? null,
      inventoryAccuracy: payload.inventoryAccuracy ?? null,
      occupancyPct: payload.occupancyPct ?? null,
      costPerOrder: payload.costPerOrder ?? null,
      kmPerDrop: payload.kmPerDrop ?? null,
    },
    req.user!.id,
  );
  res.status(201).json(kpi);
});

kpiRouter.put('/:projectId/:kpiId', requireProjectRole(['ConsultorLider', 'Auditor']), async (req, res) => {
  const payload = updateSchema.parse({ ...req.body, projectId: req.params.projectId });
  const kpi = await kpiService.update(req.params.kpiId, normalizePayload(payload), req.user!.id);
  res.json(kpi);
});

kpiRouter.delete('/:projectId/:kpiId', requireProjectRole(['ConsultorLider']), async (req, res) => {
  await kpiService.remove(req.params.kpiId, req.user!.id);
  res.status(204).send();
});

export { kpiRouter };
