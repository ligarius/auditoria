import fs from 'fs/promises';

import {
  Prisma,
  type CapacityCalc,
  type File as FileRecord
} from '@prisma/client';

import { prisma } from '../../core/config/db';
import { fileService } from '../files/file.service';

interface SimulationRow {
  zoneId: string;
  rackType: string;
  aisles: number;
  pp: number;
}

const normalizeMemo = (
  memo: unknown,
  totalPP: number
): Prisma.InputJsonValue => {
  const timestamp = new Date().toISOString();
  if (memo === null || memo === undefined) {
    return { totalPP, savedAt: timestamp } as Prisma.InputJsonValue;
  }
  if (typeof memo === 'string') {
    return {
      notes: memo,
      totalPP,
      savedAt: timestamp
    } as Prisma.InputJsonValue;
  }
  if (typeof memo === 'object') {
    return {
      ...(memo as Record<string, unknown>),
      totalPP,
      savedAt: timestamp
    } as Prisma.InputJsonValue;
  }
  return { value: memo, totalPP, savedAt: timestamp } as Prisma.InputJsonValue;
};

const readPlanDataUrl = async (file: FileRecord) => {
  try {
    const buffer = await fs.readFile(file.path);
    const base64 = buffer.toString('base64');
    return `data:${file.mime};base64,${base64}`;
  } catch {
    return null;
  }
};

const toPlanResponse = (file: FileRecord, dataUrl: string | null) => ({
  id: file.id,
  filename: file.filename,
  mime: file.mime,
  size: file.size,
  createdAt: file.createdAt,
  uploadedBy: file.uploadedBy,
  dataUrl
});

export const layoutService = {
  async getProjectLayout(projectId: string) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { settings: true }
    });

    if (!project) {
      throw new Error('Proyecto no encontrado');
    }

    const rawSettings = project.settings;
    const settings =
      rawSettings && typeof rawSettings === 'object'
        ? (rawSettings as Record<string, unknown>)
        : {};
    const planFileId =
      typeof settings.layoutPlanFileId === 'string'
        ? settings.layoutPlanFileId
        : null;

    let plan: ReturnType<typeof toPlanResponse> | null = null;
    if (planFileId) {
      const planFile = await prisma.file.findUnique({
        where: { id: planFileId }
      });
      if (planFile) {
        const dataUrl = await readPlanDataUrl(planFile);
        plan = toPlanResponse(planFile, dataUrl);
      }
    }

    const zones = await prisma.warehouseZone.findMany({
      where: { projectId },
      orderBy: { code: 'asc' },
      include: {
        capacityCalcs: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    const zoneEntries = zones.map((zone) => {
      const latest = zone.capacityCalcs[0] ?? null;
      return {
        id: zone.id,
        code: zone.code,
        name: zone.name,
        latestCalc: latest
          ? {
              id: latest.id,
              rackType: latest.rackType,
              aisles: latest.aisles,
              pp: latest.pp,
              memo: latest.memo,
              createdAt: latest.createdAt,
              updatedAt: latest.updatedAt
            }
          : null
      };
    });

    const totalPP = zoneEntries.reduce(
      (sum, zone) => sum + (zone.latestCalc?.pp ?? 0),
      0
    );

    return { plan, zones: zoneEntries, totalPP };
  },

  async updatePlan(
    projectId: string,
    file: Express.Multer.File,
    userId: string
  ) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, settings: true }
    });

    if (!project) {
      throw new Error('Proyecto no encontrado');
    }

    const savedFile = await fileService.save(projectId, file, userId);

    const rawSettings = project.settings;
    const settings =
      rawSettings && typeof rawSettings === 'object'
        ? (rawSettings as Record<string, unknown>)
        : {};

    await prisma.project.update({
      where: { id: projectId },
      data: {
        settings: { ...settings, layoutPlanFileId: savedFile.id }
      }
    });

    const dataUrl = await readPlanDataUrl(savedFile);

    return toPlanResponse(savedFile, dataUrl);
  },

  async saveSimulation(
    projectId: string,
    rows: SimulationRow[],
    memo: unknown
  ) {
    if (rows.length === 0) {
      return { totalPP: 0, created: [] as CapacityCalc[] };
    }

    const zoneIds = rows.map((row) => row.zoneId);
    const zones = await prisma.warehouseZone.findMany({
      where: { projectId, id: { in: zoneIds } },
      select: { id: true }
    });

    if (zones.length !== rows.length) {
      throw new Error('Una o más zonas no pertenecen al proyecto');
    }

    const totalPP = rows.reduce((sum, row) => sum + row.pp, 0);
    const memoPayload = normalizeMemo(memo, totalPP);

    const created = await prisma.$transaction(
      rows.map((row) =>
        prisma.capacityCalc.create({
          data: {
            zoneId: row.zoneId,
            rackType: row.rackType,
            aisles: row.aisles,
            pp: row.pp,
            memo: memoPayload
          }
        })
      )
    );

    return { totalPP, created };
  },

  async listZoneCalcs(zoneId: string) {
    const zone = await prisma.warehouseZone.findUnique({
      where: { id: zoneId },
      select: { id: true }
    });

    if (!zone) {
      throw new Error('Zona no encontrada');
    }

    return prisma.capacityCalc.findMany({
      where: { zoneId },
      orderBy: { createdAt: 'desc' }
    });
  },

  async getZoneProject(zoneId: string) {
    const zone = await prisma.warehouseZone.findUnique({
      where: { id: zoneId },
      select: { projectId: true }
    });
    return zone?.projectId ?? null;
  }
};
