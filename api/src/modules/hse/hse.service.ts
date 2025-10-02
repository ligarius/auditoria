import { Prisma } from '@prisma/client';
import { z } from 'zod';

import { prisma } from '../../core/config/db.js';
import { auditService } from '../audit/audit.service.js';

const optionalString = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value && value.length > 0 ? value : undefined));

const evidenceSchema = z.object({
  url: z.string().trim().min(1, 'La URL de la evidencia es obligatoria'),
  description: optionalString,
});

const checkItemSchema = z.object({
  description: z
    .string()
    .trim()
    .min(1, 'La descripción del ítem es obligatoria'),
  status: z.enum(['ok', 'no_ok', 'na']).default('ok'),
  notes: optionalString,
});

const createCheckSchema = z.object({
  type: z.enum(['induccion', 'checklist', 'inspeccion']),
  title: z.string().trim().min(1, 'El título es obligatorio'),
  conductedBy: optionalString,
  location: optionalString,
  notes: optionalString,
  items: z.array(checkItemSchema).default([]),
  evidence: z.array(evidenceSchema).default([]),
  performedAt: z.coerce.date().optional(),
});

const assignmentItemSchema = z.object({
  item: z.string().trim().min(1, 'El nombre del EPP es obligatorio'),
  quantity: z.coerce
    .number()
    .int()
    .positive('La cantidad debe ser mayor a 0')
    .optional(),
  notes: optionalString,
});

const createPpeSchema = z.object({
  personName: z
    .string()
    .trim()
    .min(1, 'El nombre de la persona es obligatorio'),
  role: optionalString,
  deliveredBy: optionalString,
  notes: optionalString,
  assignedAt: z.coerce.date().optional(),
  items: z
    .array(assignmentItemSchema)
    .min(1, 'Registra al menos un EPP entregado'),
  evidence: z.array(evidenceSchema).default([]),
});

const createIncidentSchema = z.object({
  title: z.string().trim().min(1, 'El título del incidente es obligatorio'),
  severity: z.enum(['baja', 'media', 'alta', 'critica']).default('baja'),
  description: optionalString,
  reportedBy: optionalString,
  occurredAt: z.coerce.date().optional(),
  location: optionalString,
  immediateActions: optionalString,
  correctiveActions: optionalString,
  photos: z.array(evidenceSchema).default([]),
});

const toJsonArray = (
  value:
    | z.infer<typeof evidenceSchema>[]
    | z.infer<typeof checkItemSchema>[]
    | z.infer<typeof assignmentItemSchema>[]
) => value as unknown as Prisma.JsonArray;

export const hseService = {
  async listChecks(projectId: string) {
    return prisma.hSECheck.findMany({
      where: { projectId },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [{ performedAt: 'desc' }, { createdAt: 'desc' }],
    });
  },

  async createCheck(projectId: string, payload: unknown, userId: string) {
    const data = createCheckSchema.parse(payload);

    const created = await prisma.hSECheck.create({
      data: {
        projectId,
        type: data.type,
        title: data.title,
        conductedBy: data.conductedBy ?? null,
        location: data.location ?? null,
        notes: data.notes ?? null,
        items: toJsonArray(data.items),
        evidence: toJsonArray(data.evidence),
        performedAt: data.performedAt ?? new Date(),
        createdById: userId,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    await auditService.record(
      'HSE_Check',
      created.id,
      'CREATE',
      userId,
      projectId,
      null,
      created
    );

    return created;
  },

  async listAssignments(projectId: string) {
    return prisma.pPEAssign.findMany({
      where: { projectId },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [{ assignedAt: 'desc' }, { createdAt: 'desc' }],
    });
  },

  async createAssignment(projectId: string, payload: unknown, userId: string) {
    const data = createPpeSchema.parse(payload);

    const created = await prisma.pPEAssign.create({
      data: {
        projectId,
        personName: data.personName,
        role: data.role ?? null,
        deliveredBy: data.deliveredBy ?? null,
        notes: data.notes ?? null,
        assignedAt: data.assignedAt ?? new Date(),
        items: toJsonArray(data.items),
        evidence: toJsonArray(data.evidence),
        createdById: userId,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    await auditService.record(
      'PPE_Assign',
      created.id,
      'CREATE',
      userId,
      projectId,
      null,
      created
    );

    return created;
  },

  async listIncidents(projectId: string) {
    return prisma.incident.findMany({
      where: { projectId },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [{ occurredAt: 'desc' }, { createdAt: 'desc' }],
    });
  },

  async createIncident(projectId: string, payload: unknown, userId: string) {
    const data = createIncidentSchema.parse(payload);

    const created = await prisma.incident.create({
      data: {
        projectId,
        title: data.title,
        severity: data.severity,
        description: data.description ?? null,
        reportedBy: data.reportedBy ?? null,
        occurredAt: data.occurredAt ?? new Date(),
        location: data.location ?? null,
        immediateActions: data.immediateActions ?? null,
        correctiveActions: data.correctiveActions ?? null,
        photos: toJsonArray(data.photos),
        createdById: userId,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    await auditService.record(
      'Incident',
      created.id,
      'CREATE',
      userId,
      projectId,
      null,
      created
    );

    return created;
  },
};
