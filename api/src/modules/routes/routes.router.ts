import { RoutePlanStatus } from '@prisma/client';
import { NextFunction, Response, Router } from 'express';
import { z } from 'zod';

import { prisma } from '../../core/config/db';
import {
  authenticate,
  type AuthenticatedRequest,
  requireProjectMembership
} from '../../core/middleware/auth';
import { HttpError } from '../../core/errors/http-error';

import { routeExportService } from './routes-export.service';

const viewerRoles = ['ConsultorLider', 'Auditor', 'SponsorPM', 'Invitado'];
const editorRoles = ['ConsultorLider', 'Auditor'];

const routesRouter = Router();

routesRouter.use(authenticate);

const planInclude = {
  carrier: { select: { id: true, name: true } },
  stops: { orderBy: { sequence: 'asc' } },
  vehicles: { orderBy: { createdAt: 'asc' } },
  tariffs: { orderBy: { createdAt: 'asc' } }
} as const;

const optionalDateInput = z.union([z.string(), z.date(), z.null()]).optional();
const optionalNumericInput = z
  .union([z.number(), z.string(), z.null()])
  .optional();

const stopSchema = z.object({
  id: z.string().optional(),
  client: z.string().min(1, 'Cliente requerido'),
  windowStart: optionalDateInput,
  windowEnd: optionalDateInput,
  demandVol: optionalNumericInput,
  demandKg: optionalNumericInput,
  sequence: optionalNumericInput,
  notes: z.string().optional().nullable()
});

const vehicleSchema = z.object({
  id: z.string().optional(),
  carrierId: z.string().optional().nullable(),
  name: z.string().min(1, 'Nombre requerido'),
  capacity: optionalNumericInput,
  costKm: optionalNumericInput,
  fixed: optionalNumericInput
});

const tariffSchema = z.object({
  id: z.string().optional(),
  carrierId: z.string().optional().nullable(),
  fromClient: z.string().min(1, 'Origen requerido'),
  toClient: z.string().min(1, 'Destino requerido'),
  distanceKm: optionalNumericInput,
  cost: optionalNumericInput
});

const basePlanSchema = z.object({
  carrierId: z.string().optional().nullable(),
  scenario: z.string().min(1, 'Escenario requerido'),
  status: z.nativeEnum(RoutePlanStatus).optional(),
  approved: z.boolean().optional(),
  notes: z.string().optional().nullable(),
  stops: z.array(stopSchema).optional().default([]),
  vehicles: z.array(vehicleSchema).optional().default([]),
  tariffs: z.array(tariffSchema).optional().default([])
});

const createPlanSchema = basePlanSchema.extend({
  projectId: z.string().min(1, 'projectId requerido')
});

const updatePlanSchema = basePlanSchema.partial().extend({
  scenario: z.string().min(1).optional()
});

const toDateOrNull = (value: unknown) => {
  if (!value || (typeof value === 'string' && value.trim() === '')) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
};

const toNumberOrNull = (value: unknown) => {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') {
      return null;
    }
    const numeric = Number(trimmed);
    if (Number.isFinite(numeric)) {
      return numeric;
    }
  }
  return null;
};

const fetchPlan = async (id: string) =>
  prisma.routePlan.findUnique({
    where: { id },
    include: planInclude
  });

const assertProjectRole = (
  req: AuthenticatedRequest,
  projectId: string,
  allowedRoles: string[]
) => {
  if (!req.user) {
    throw new HttpError(401, 'No autenticado');
  }
  if (req.user.role === 'admin') {
    return;
  }
  const membershipRole = req.user.projects[projectId];
  if (!membershipRole) {
    throw new HttpError(403, 'Sin acceso al proyecto');
  }
  if (!allowedRoles.includes(membershipRole)) {
    throw new HttpError(403, 'Rol insuficiente');
  }
};

routesRouter.get('/plans', requireProjectMembership(), async (req, res) => {
  const projectId = (req as AuthenticatedRequest & { projectId: string })
    .projectId;
  assertProjectRole(req as AuthenticatedRequest, projectId, viewerRoles);
  const plans = await prisma.routePlan.findMany({
    where: { projectId },
    include: planInclude,
    orderBy: { createdAt: 'asc' }
  });
  res.json(plans);
});

routesRouter.post(
  '/plans',
  requireProjectMembership('projectId'),
  async (req, res) => {
    const payload = createPlanSchema.parse(req.body);
    const {
      projectId,
      scenario,
      status,
      carrierId,
      approved = false,
      notes,
      stops = [],
      vehicles = [],
      tariffs = []
    } = payload;

    const authReq = req as AuthenticatedRequest;
    assertProjectRole(authReq, projectId, editorRoles);

    const created = await prisma.$transaction(async (tx) => {
      const plan = await tx.routePlan.create({
        data: {
          projectId,
          scenario,
          status: status ?? RoutePlanStatus.draft,
          carrierId: carrierId ?? null,
          approved,
          notes: notes ?? null
        }
      });

      if (stops.length > 0) {
        await tx.routeStop.createMany({
          data: stops.map((stop, index) => ({
            planId: plan.id,
            client: stop.client,
            windowStart: toDateOrNull(stop.windowStart),
            windowEnd: toDateOrNull(stop.windowEnd),
            demandVol: toNumberOrNull(stop.demandVol),
            demandKg: toNumberOrNull(stop.demandKg),
            sequence: toNumberOrNull(stop.sequence) ?? index,
            notes: stop.notes ?? null
          }))
        });
      }

      if (vehicles.length > 0) {
        await tx.vehicle.createMany({
          data: vehicles.map((vehicle) => ({
            planId: plan.id,
            carrierId: vehicle.carrierId ?? carrierId ?? null,
            name: vehicle.name,
            capacity: toNumberOrNull(vehicle.capacity) ?? 0,
            costKm: toNumberOrNull(vehicle.costKm) ?? 0,
            fixed: toNumberOrNull(vehicle.fixed) ?? 0
          }))
        });
      }

      if (tariffs.length > 0) {
        await tx.tariff.createMany({
          data: tariffs.map((tariff) => ({
            planId: plan.id,
            carrierId: tariff.carrierId ?? carrierId ?? null,
            fromClient: tariff.fromClient,
            toClient: tariff.toClient,
            distanceKm: toNumberOrNull(tariff.distanceKm),
            cost: toNumberOrNull(tariff.cost) ?? 0
          }))
        });
      }

      return plan;
    });

    const plan = await fetchPlan(created.id);
    res.status(201).json(plan);
  }
);

routesRouter.get('/plans/:planId', async (req, res) => {
  const { planId } = req.params;
  const plan = await fetchPlan(planId);
  if (!plan) {
    return res.status(404).json({ title: 'Plan no encontrado' });
  }
  assertProjectRole(req as AuthenticatedRequest, plan.projectId, viewerRoles);
  res.json(plan);
});

routesRouter.put('/plans/:planId', async (req, res) => {
  const { planId } = req.params;
  const existing = await prisma.routePlan.findUnique({ where: { id: planId } });
  if (!existing) {
    return res.status(404).json({ title: 'Plan no encontrado' });
  }
  assertProjectRole(
    req as AuthenticatedRequest,
    existing.projectId,
    editorRoles
  );

  const payload = updatePlanSchema.parse(req.body ?? {});

  const {
    scenario,
    status,
    carrierId,
    approved,
    notes,
    stops,
    vehicles,
    tariffs
  } = payload;

  await prisma.$transaction(async (tx) => {
    await tx.routePlan.update({
      where: { id: planId },
      data: {
        scenario: scenario ?? existing.scenario,
        status: status ?? existing.status,
        carrierId:
          carrierId === undefined ? existing.carrierId : (carrierId ?? null),
        approved: approved ?? existing.approved,
        notes: notes === undefined ? existing.notes : (notes ?? null)
      }
    });

    if (stops) {
      await tx.routeStop.deleteMany({ where: { planId } });
      if (stops.length > 0) {
        await tx.routeStop.createMany({
          data: stops.map((stop, index) => ({
            planId,
            client: stop.client,
            windowStart: toDateOrNull(stop.windowStart),
            windowEnd: toDateOrNull(stop.windowEnd),
            demandVol: toNumberOrNull(stop.demandVol),
            demandKg: toNumberOrNull(stop.demandKg),
            sequence: toNumberOrNull(stop.sequence) ?? index,
            notes: stop.notes ?? null
          }))
        });
      }
    }

    if (vehicles) {
      await tx.vehicle.deleteMany({ where: { planId } });
      if (vehicles.length > 0) {
        await tx.vehicle.createMany({
          data: vehicles.map((vehicle) => ({
            planId,
            carrierId: vehicle.carrierId ?? carrierId ?? null,
            name: vehicle.name,
            capacity: toNumberOrNull(vehicle.capacity) ?? 0,
            costKm: toNumberOrNull(vehicle.costKm) ?? 0,
            fixed: toNumberOrNull(vehicle.fixed) ?? 0
          }))
        });
      }
    }

    if (tariffs) {
      await tx.tariff.deleteMany({ where: { planId } });
      if (tariffs.length > 0) {
        await tx.tariff.createMany({
          data: tariffs.map((tariff) => ({
            planId,
            carrierId: tariff.carrierId ?? carrierId ?? null,
            fromClient: tariff.fromClient,
            toClient: tariff.toClient,
            distanceKm: toNumberOrNull(tariff.distanceKm),
            cost: toNumberOrNull(tariff.cost) ?? 0
          }))
        });
      }
    }
  });

  const plan = await fetchPlan(planId);
  res.json(plan);
});

routesRouter.delete('/plans/:planId', async (req, res) => {
  const { planId } = req.params;
  const plan = await prisma.routePlan.findUnique({ where: { id: planId } });
  if (!plan) {
    return res.status(404).json({ title: 'Plan no encontrado' });
  }
  assertProjectRole(req as AuthenticatedRequest, plan.projectId, [
    'ConsultorLider'
  ]);
  await prisma.routePlan.delete({ where: { id: planId } });
  res.status(204).end();
});

routesRouter.post('/plans/:planId/duplicate', async (req, res) => {
  const { planId } = req.params;
  const plan = await prisma.routePlan.findUnique({
    where: { id: planId },
    include: {
      stops: true,
      vehicles: true,
      tariffs: true
    }
  });

  if (!plan) {
    return res.status(404).json({ title: 'Plan no encontrado' });
  }
  assertProjectRole(req as AuthenticatedRequest, plan.projectId, editorRoles);

  const duplicatedScenario = `${plan.scenario} (copia)`;

  const created = await prisma.$transaction(async (tx) => {
    const clone = await tx.routePlan.create({
      data: {
        projectId: plan.projectId,
        carrierId: plan.carrierId,
        scenario: duplicatedScenario,
        status: plan.status,
        approved: false,
        notes: plan.notes
      }
    });

    if (plan.stops.length > 0) {
      await tx.routeStop.createMany({
        data: plan.stops.map((stop) => ({
          planId: clone.id,
          client: stop.client,
          windowStart: stop.windowStart,
          windowEnd: stop.windowEnd,
          demandVol: stop.demandVol,
          demandKg: stop.demandKg,
          sequence: stop.sequence,
          notes: stop.notes
        }))
      });
    }

    if (plan.vehicles.length > 0) {
      await tx.vehicle.createMany({
        data: plan.vehicles.map((vehicle) => ({
          planId: clone.id,
          carrierId: vehicle.carrierId,
          name: vehicle.name,
          capacity: vehicle.capacity,
          costKm: vehicle.costKm,
          fixed: vehicle.fixed
        }))
      });
    }

    if (plan.tariffs.length > 0) {
      await tx.tariff.createMany({
        data: plan.tariffs.map((tariff) => ({
          planId: clone.id,
          carrierId: tariff.carrierId,
          fromClient: tariff.fromClient,
          toClient: tariff.toClient,
          distanceKm: tariff.distanceKm,
          cost: tariff.cost
        }))
      });
    }

    return clone;
  });

  const result = await fetchPlan(created.id);
  res.status(201).json(result);
});

routesRouter.get('/export/excel', async (req, res) => {
  const planId =
    typeof req.query.planId === 'string' ? req.query.planId : undefined;
  if (!planId) {
    return res.status(400).json({ title: 'planId requerido' });
  }

  const plan = await prisma.routePlan.findUnique({ where: { id: planId } });
  if (!plan) {
    return res.status(404).json({ title: 'Plan no encontrado' });
  }
  assertProjectRole(req as AuthenticatedRequest, plan.projectId, viewerRoles);

  const { buffer, filename, projectId } =
    await routeExportService.buildExcel(planId);
  assertProjectRole(req as AuthenticatedRequest, projectId, viewerRoles);

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(buffer);
});

routesRouter.use(
  (
    err: unknown,
    _req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    if (err instanceof HttpError) {
      return res.status(err.status).json({ title: err.message });
    }
    return next(err);
  }
);

export { routesRouter };
