import { Router } from 'express';
import { z } from 'zod';

import { authenticate, requireProjectRole } from '../../core/middleware/auth.js';
import { kpiService } from './kpi.service.js';

const kpiRouter = Router();

kpiRouter.use(authenticate);

const parseQueryDate = (value: unknown, label: string): Date | undefined => {
  if (Array.isArray(value)) {
    return value.length > 0 ? parseQueryDate(value[value.length - 1], label) : undefined;
  }

  if (typeof value !== 'string') return undefined;

  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`${label} inválida`);
  }

  return parsed;
};

const getDateRangeFromQuery = (query: Record<string, unknown>) => {
  const startDate = parseQueryDate(query.startDate, 'Fecha inicial');
  const endDate = parseQueryDate(query.endDate, 'Fecha final');

  if (startDate && endDate && startDate > endDate) {
    throw new Error('El rango de fechas es inválido');
  }

  return { startDate, endDate };
};

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

kpiRouter.get(
  '/',
  requireProjectRole(['ConsultorLider', 'Auditor', 'SponsorPM', 'Invitado']),
  async (req, res) => {
    const projectId = typeof req.query.projectId === 'string' ? req.query.projectId : undefined;
    if (!projectId) {
      return res.status(400).json({ title: 'projectId es requerido' });
    }

    let dateFilters: { startDate?: Date; endDate?: Date };
    try {
      dateFilters = getDateRangeFromQuery(req.query as Record<string, unknown>);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Rango de fechas inválido';
      return res.status(400).json({ title: message });
    }

    const kpis = await kpiService.list(projectId, dateFilters);
    res.json(kpis);
  },
);

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
kpiRouter.get(
  '/:projectId',
  requireProjectRole(['ConsultorLider', 'Auditor', 'SponsorPM']),
  async (req, res) => {
    let dateFilters: { startDate?: Date; endDate?: Date };
    try {
      dateFilters = getDateRangeFromQuery(req.query as Record<string, unknown>);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Rango de fechas inválido';
      return res.status(400).json({ title: message });
    }

    const kpis = await kpiService.list(req.params.projectId, dateFilters);
    res.json(kpis);
  },
);

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
