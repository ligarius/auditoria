import { Prisma } from '@prisma/client';
import { z } from 'zod';

import { prisma } from '../../core/config/db';
import { HttpError } from '../../core/errors/http-error';
import { auditService } from '../audit/audit.service';

const photoSchema = z.object({
  type: z.enum(['before', 'after']),
  url: z.string().trim().min(1, 'La URL de la foto es obligatoria'),
  description: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined))
});

const actionSchema = z.object({
  description: z
    .string()
    .trim()
    .min(1, 'La descripción de la acción es obligatoria'),
  responsible: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
  dueDate: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
  status: z.enum(['todo', 'in_progress', 'done']).default('todo'),
  notes: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined))
});

const createSchema = z.object({
  area: z.string().trim().min(1, 'El área es obligatoria'),
  score: z.coerce
    .number()
    .min(0, 'La puntuación debe ser mayor o igual a 0')
    .max(5, 'La puntuación máxima es 5'),
  auditDate: z.coerce.date().optional(),
  notes: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
  photos: z.array(photoSchema).default([]),
  actions: z.array(actionSchema).default([])
});

const updateSchema = createSchema.partial();

const toJsonArray = (
  value: z.infer<typeof photoSchema>[] | z.infer<typeof actionSchema>[]
) => value as unknown as Prisma.JsonArray;

export const fiveSAuditService = {
  async list(projectId: string) {
    return prisma.fiveSAudit.findMany({
      where: { projectId },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: [{ auditDate: 'desc' }, { createdAt: 'desc' }]
    });
  },

  async create(projectId: string, payload: unknown, userId: string) {
    const data = createSchema.parse(payload);
    const created = await prisma.fiveSAudit.create({
      data: {
        projectId,
        area: data.area,
        score: data.score,
        auditDate: data.auditDate ?? new Date(),
        notes: data.notes ?? null,
        photos: toJsonArray(data.photos),
        actions: toJsonArray(data.actions),
        createdById: userId
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    await auditService.record(
      'FiveS_Audit',
      created.id,
      'CREATE',
      userId,
      projectId,
      null,
      created
    );

    return created;
  },

  async update(id: string, payload: unknown, userId: string) {
    const existing = await prisma.fiveSAudit.findUnique({ where: { id } });
    if (!existing) {
      throw new HttpError(404, 'Auditoría 5S no encontrada');
    }

    const data = updateSchema.parse(payload);

    const updated = await prisma.fiveSAudit.update({
      where: { id },
      data: {
        area: data.area,
        score: data.score,
        auditDate: data.auditDate,
        notes: data.notes === undefined ? undefined : (data.notes ?? null),
        photos: data.photos ? toJsonArray(data.photos) : undefined,
        actions: data.actions ? toJsonArray(data.actions) : undefined
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    await auditService.record(
      'FiveS_Audit',
      id,
      'UPDATE',
      userId,
      existing.projectId,
      existing,
      updated
    );

    return updated;
  },

  async getProjectId(auditId: string) {
    const audit = await prisma.fiveSAudit.findUnique({
      where: { id: auditId },
      select: { projectId: true }
    });
    if (!audit) {
      throw new HttpError(404, 'Auditoría 5S no encontrada');
    }
    return audit.projectId;
  }
};
