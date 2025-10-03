import { BarcodeLabelType, InventoryCountStatus } from '@prisma/client';
import bwipjs from 'bwip-js';
import { parse } from 'csv-parse/sync';
import PDFDocument from 'pdfkit';

import { prisma } from '../../core/config/db';

interface CsvSkuRow {
  code?: string;
  name?: string;
  uom?: string;
  length?: string;
  width?: string;
  height?: string;
  weight?: string;
}

export interface LocationRangeDefinition {
  zone: { code: string; name: string | undefined };
  rack: { code: string; name: string | undefined };
  rowStart: number;
  rowEnd: number;
  levelStart: number;
  levelEnd: number;
  positionStart: number;
  positionEnd: number;
}

const normalizeString = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const normalizeCode = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '')
    .toUpperCase();

const parseNumber = (value: unknown) => {
  if (value === null || value === undefined) return null;
  const stringValue = String(value).trim();
  if (!stringValue) return null;
  const normalized = stringValue.replace(',', '.');
  const parsed = Number.parseFloat(normalized);
  if (Number.isFinite(parsed)) {
    return parsed;
  }
  return null;
};

const pad = (value: number, size = 2) => value.toString().padStart(size, '0');

const toFiniteNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const computePercentageDelta = (expected: number, found: number) => {
  if (!Number.isFinite(expected) || expected === 0) {
    return Math.abs(found) > 0 ? 100 : 0;
  }
  return (Math.abs(found - expected) / Math.abs(expected)) * 100;
};

const formatUserSummary = (user?: {
  id: string;
  name: string | null;
  email: string | null;
}) => {
  if (!user) {
    return null;
  }
  return {
    id: user.id,
    name: user.name ?? user.email ?? 'Sin nombre',
    email: user.email
  };
};

const buildLocationCode = (
  zoneCode: string,
  rackCode: string,
  row: number,
  level: number,
  pos: number
) => {
  const zone = normalizeCode(zoneCode);
  const rack = normalizeCode(rackCode);
  const nivelSegment = `${pad(row)}${pad(level)}`;
  return `Z${zone}-R${rack}-N${nivelSegment}-P${pad(pos)}`;
};

const sanitizeRangeValue = (value: number) => {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.trunc(value));
};

const computeDuplicateCandidates = async (projectId: string) => {
  const skus = await prisma.sku.findMany({
    where: { projectId },
    select: { id: true, name: true }
  });

  const grouped = new Map<string, { id: string; name: string }[]>();
  skus.forEach((sku) => {
    const key = sku.name
      ? normalizeString(sku.name).replace(/[^a-z0-9]/g, '')
      : '';
    if (!key) return;
    const bucket = grouped.get(key) ?? [];
    bucket.push({ id: sku.id, name: sku.name });
    grouped.set(key, bucket);
  });

  const candidates: {
    projectId: string;
    skuAId: string;
    skuBId: string;
    similarity: number;
  }[] = [];
  grouped.forEach((items) => {
    if (items.length < 2) return;
    for (let i = 0; i < items.length; i += 1) {
      for (let j = i + 1; j < items.length; j += 1) {
        candidates.push({
          projectId,
          skuAId: items[i]!.id,
          skuBId: items[j]!.id,
          similarity: 1
        });
      }
    }
  });

  await prisma.skuDupCandidate.deleteMany({ where: { projectId } });
  if (candidates.length > 0) {
    await prisma.skuDupCandidate.createMany({
      data: candidates,
      skipDuplicates: true
    });
  }

  return candidates.length;
};

const generatePdf = async (
  items: { code: string; title: string; subtitle?: string }[]
): Promise<Buffer> => {
  const doc = new PDFDocument({ size: 'A4', margin: 36 });
  const buffers: Buffer[] = [];
  doc.on('data', (chunk) => buffers.push(chunk));
  const resultPromise = new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', (error) => reject(error));
  });

  const columns = 2;
  const availableWidth =
    doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const availableHeight =
    doc.page.height - doc.page.margins.top - doc.page.margins.bottom;
  const labelWidth = availableWidth / columns;
  const labelHeight = 160;
  const rowsPerPage = Math.max(1, Math.floor(availableHeight / labelHeight));
  const perPage = rowsPerPage * columns;

  for (let index = 0; index < items.length; index += 1) {
    if (index > 0 && index % perPage === 0) {
      doc.addPage();
    }

    const pageIndex = index % perPage;
    const column = pageIndex % columns;
    const row = Math.floor(pageIndex / columns);

    const x = doc.page.margins.left + column * labelWidth;
    const y = doc.page.margins.top + row * labelHeight;
    const boxWidth = labelWidth - 12;

    doc.roundedRect(x, y, boxWidth, labelHeight - 12, 8).stroke('#CBD5F5');
    doc.fontSize(12).fillColor('#0f172a');
    doc.text(items[index]!.title, x + 12, y + 12, {
      width: boxWidth - 24,
      height: 24
    });

    if (items[index]!.subtitle) {
      doc.fontSize(9).fillColor('#475569');
      doc.text(items[index]!.subtitle!, x + 12, y + 32, {
        width: boxWidth - 24
      });
    }

    // eslint-disable-next-line no-await-in-loop
    const barcodeBuffer = await bwipjs.toBuffer({
      bcid: 'code128',
      text: items[index]!.code,
      scale: 3,
      height: 12,
      includetext: false,
      paddingwidth: 6
    });

    const barcodeWidth = boxWidth - 24;
    doc.image(barcodeBuffer, x + 12, y + 60, {
      width: barcodeWidth,
      height: 70,
      align: 'center'
    });

    doc.fontSize(11).fillColor('#0f172a');
    doc.text(items[index]!.code, x + 12, y + 138, {
      width: boxWidth - 24,
      align: 'center'
    });
  }

  doc.end();
  return resultPromise;
};

export const inventoryService = {
  async importSkus(projectId: string, fileBuffer: Buffer) {
    const content = fileBuffer.toString('utf-8');
    const rows = parse<CsvSkuRow>(content, {
      columns: (header) =>
        header.map((column) =>
          column.toLowerCase().trim().replace(/\s+/g, '_')
        ),
      skip_empty_lines: true,
      trim: true
    });

    let created = 0;
    let updated = 0;

    await prisma.$transaction(async (tx) => {
      for (const row of rows) {
        const record = row as Record<string, string | undefined>;
        const rawCode =
          row.code ??
          record.sku ??
          record.sku_code ??
          record.product_code ??
          record.codigo ??
          record.id ??
          '';
        const code = normalizeCode(rawCode);
        if (!code) {
          continue;
        }

        const data = {
          name: row.name?.trim() || code,
          uom: row.uom?.trim() || 'UND',
          length: parseNumber(row.length),
          width: parseNumber(row.width),
          height: parseNumber(row.height),
          weight: parseNumber(row.weight)
        };

        const existing = await tx.sku.findUnique({
          where: { projectId_code: { projectId, code } }
        });

        if (existing) {
          await tx.sku.update({
            where: { id: existing.id },
            data
          });
          updated += 1;
        } else {
          await tx.sku.create({
            data: {
              projectId,
              code,
              ...data
            }
          });
          created += 1;
        }
      }
    });

    await computeDuplicateCandidates(projectId);

    return {
      created,
      updated,
      total: created + updated
    };
  },

  async listSkus(projectId: string) {
    const skus = await prisma.sku.findMany({
      where: { projectId },
      orderBy: { code: 'asc' },
      include: {
        labels: {
          orderBy: { printedAt: 'desc' },
          take: 1
        }
      }
    });

    return skus.map((sku) => ({
      id: sku.id,
      code: sku.code,
      name: sku.name,
      uom: sku.uom,
      length: sku.length,
      width: sku.width,
      height: sku.height,
      weight: sku.weight,
      label: sku.labels[0]
        ? {
            id: sku.labels[0]!.id,
            printedAt: sku.labels[0]!.printedAt,
            installedAt: sku.labels[0]!.installedAt
          }
        : null
    }));
  },

  async bulkCreateLocations(
    projectId: string,
    definitions: LocationRangeDefinition[]
  ) {
    let created = 0;
    let reused = 0;

    await prisma.$transaction(async (tx) => {
      for (const definition of definitions) {
        const zoneCode = normalizeCode(definition.zone.code);
        const rackCode = normalizeCode(definition.rack.code);
        if (!zoneCode || !rackCode) {
          continue;
        }

        const zone = await tx.warehouseZone.upsert({
          where: { projectId_code: { projectId, code: zoneCode } },
          update: { name: definition.zone.name?.trim() || zoneCode },
          create: {
            projectId,
            code: zoneCode,
            name: definition.zone.name?.trim() || zoneCode
          }
        });

        const rack = await tx.rack.upsert({
          where: { zoneId_code: { zoneId: zone.id, code: rackCode } },
          update: {
            name: definition.rack.name?.trim() || rackCode
          },
          create: {
            projectId,
            zoneId: zone.id,
            code: rackCode,
            name: definition.rack.name?.trim() || rackCode
          }
        });

        const rowStart = sanitizeRangeValue(definition.rowStart);
        const rowEnd = sanitizeRangeValue(definition.rowEnd);
        const levelStart = sanitizeRangeValue(definition.levelStart);
        const levelEnd = sanitizeRangeValue(definition.levelEnd);
        const positionStart = sanitizeRangeValue(definition.positionStart);
        const positionEnd = sanitizeRangeValue(definition.positionEnd);

        for (
          let row = Math.min(rowStart, rowEnd);
          row <= Math.max(rowStart, rowEnd);
          row += 1
        ) {
          for (
            let level = Math.min(levelStart, levelEnd);
            level <= Math.max(levelStart, levelEnd);
            level += 1
          ) {
            for (
              let pos = Math.min(positionStart, positionEnd);
              pos <= Math.max(positionStart, positionEnd);
              pos += 1
            ) {
              const codeZRNP = buildLocationCode(
                zoneCode,
                rackCode,
                row,
                level,
                pos
              );
              const existing = await tx.location.findUnique({
                where: { codeZRNP }
              });
              if (existing) {
                reused += 1;
                await tx.location.update({
                  where: { id: existing.id },
                  data: {
                    projectId,
                    zoneId: zone.id,
                    rackId: rack.id,
                    row,
                    level,
                    pos
                  }
                });
              } else {
                await tx.location.create({
                  data: {
                    projectId,
                    zoneId: zone.id,
                    rackId: rack.id,
                    row,
                    level,
                    pos,
                    codeZRNP
                  }
                });
                created += 1;
              }
            }
          }
        }
      }
    });

    return {
      created,
      reused,
      total: created + reused
    };
  },

  async listLocations(projectId: string) {
    const locations = await prisma.location.findMany({
      where: { projectId },
      orderBy: { codeZRNP: 'asc' },
      include: {
        zone: true,
        rack: true,
        labels: {
          orderBy: { printedAt: 'desc' },
          take: 1
        }
      }
    });

    const zonesSummary = new Map<
      string,
      {
        zoneId: string;
        zoneCode: string;
        zoneName: string;
        totalLocations: number;
        installedLocations: number;
      }
    >();

    const formatted = locations.map((location) => {
      const latestLabel = location.labels[0]
        ? {
            id: location.labels[0]!.id,
            printedAt: location.labels[0]!.printedAt,
            installedAt: location.labels[0]!.installedAt
          }
        : null;
      const summary = zonesSummary.get(location.zoneId) ?? {
        zoneId: location.zoneId,
        zoneCode: location.zone.code,
        zoneName: location.zone.name,
        totalLocations: 0,
        installedLocations: 0
      };
      summary.totalLocations += 1;
      if (latestLabel?.installedAt) {
        summary.installedLocations += 1;
      }
      zonesSummary.set(location.zoneId, summary);

      return {
        id: location.id,
        codeZRNP: location.codeZRNP,
        row: location.row,
        level: location.level,
        pos: location.pos,
        expectedQty: location.expectedQty ?? null,
        zone: {
          id: location.zone.id,
          code: location.zone.code,
          name: location.zone.name
        },
        rack: {
          id: location.rack.id,
          code: location.rack.code,
          name: location.rack.name
        },
        label: latestLabel
      };
    });

    return {
      locations: formatted,
      zones: Array.from(zonesSummary.values()).sort((a, b) =>
        a.zoneCode.localeCompare(b.zoneCode)
      )
    };
  },

  async generateLabels(
    projectId: string,
    type: BarcodeLabelType,
    ids: string[]
  ) {
    if (ids.length === 0) {
      throw new Error('Sin elementos para generar etiquetas');
    }

    if (type === BarcodeLabelType.SKU) {
      const skus = await prisma.sku.findMany({
        where: { projectId, id: { in: ids } }
      });
      if (skus.length !== ids.length) {
        throw new Error('Algunos SKU no existen en el proyecto');
      }

      const now = new Date();
      const pdfItems = skus.map((sku) => ({
        code: sku.code,
        title: sku.name,
        subtitle: `UOM: ${sku.uom}`
      }));

      for (const sku of skus) {
        // eslint-disable-next-line no-await-in-loop
        await prisma.barcodeLabel.upsert({
          where: {
            projectId_type_code: {
              projectId,
              type,
              code: sku.code
            }
          },
          update: {
            printedAt: now,
            skuId: sku.id
          },
          create: {
            projectId,
            type,
            code: sku.code,
            format: 'CODE128',
            printedAt: now,
            skuId: sku.id
          }
        });
      }

      const buffer = await generatePdf(pdfItems);
      return { buffer };
    }

    const locations = await prisma.location.findMany({
      where: { projectId, id: { in: ids } },
      include: {
        zone: true,
        rack: true
      }
    });

    if (locations.length !== ids.length) {
      throw new Error('Algunas ubicaciones no existen en el proyecto');
    }

    const now = new Date();
    const pdfItems = locations.map((location) => ({
      code: location.codeZRNP,
      title: `${location.zone.code} · Rack ${location.rack.code}`,
      subtitle: `Fila ${location.row} · Nivel ${location.level} · Pos ${location.pos}`
    }));

    for (const location of locations) {
      // eslint-disable-next-line no-await-in-loop
      await prisma.barcodeLabel.upsert({
        where: {
          projectId_type_code: {
            projectId,
            type,
            code: location.codeZRNP
          }
        },
        update: {
          printedAt: now,
          locationId: location.id
        },
        create: {
          projectId,
          type,
          code: location.codeZRNP,
          format: 'CODE128',
          printedAt: now,
          locationId: location.id
        }
      });
    }

    const buffer = await generatePdf(pdfItems);
    return { buffer };
  },

  async markLabelsInstalled(
    projectId: string,
    labelIds: string[],
    userId: string
  ) {
    if (labelIds.length === 0) {
      return [];
    }

    const labels = await prisma.barcodeLabel.findMany({
      where: { id: { in: labelIds }, projectId },
      select: { id: true }
    });

    const now = new Date();
    const updates = await prisma.$transaction(
      labels.map((label) =>
        prisma.barcodeLabel.update({
          where: { id: label.id },
          data: {
            installedAt: now,
            installedById: userId
          }
        })
      )
    );

    return updates;
  },

  async listCounts(projectId: string) {
    const counts = await prisma.inventoryCount.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      include: {
        tasks: {
          include: {
            zone: { select: { id: true, code: true, name: true } },
            assignedTo: { select: { id: true, name: true, email: true } },
            scans: { include: { recount: true } }
          }
        },
        variances: { select: { id: true } }
      }
    });

    return counts.map((count) => {
      let totalScans = 0;
      let totalRecounts = 0;
      count.tasks.forEach((task) => {
        totalScans += task.scans.length;
        totalRecounts += task.scans.filter((scan) =>
          Boolean(scan.recount)
        ).length;
      });

      return {
        id: count.id,
        projectId: count.projectId,
        status: count.status,
        tolerancePct: count.tolerancePct ?? null,
        plannedAt: count.plannedAt,
        startedAt: count.startedAt,
        closedAt: count.closedAt,
        tasks: count.tasks.map((task) => ({
          id: task.id,
          zone: {
            id: task.zone.id,
            code: task.zone.code,
            name: task.zone.name
          },
          assignedTo: formatUserSummary(task.assignedTo ?? undefined),
          blind: task.blind,
          scanCount: task.scans.length,
          recountCount: task.scans.filter((scan) => Boolean(scan.recount))
            .length
        })),
        totals: {
          tasks: count.tasks.length,
          scans: totalScans,
          recounts: totalRecounts,
          variances: count.variances.length
        }
      };
    });
  },

  async getCountProject(countId: string) {
    const count = await prisma.inventoryCount.findUnique({
      where: { id: countId },
      select: { projectId: true }
    });
    if (!count) {
      throw new Error('Conteo no encontrado');
    }
    return count.projectId;
  },

  async getCountDetail(countId: string) {
    const count = await prisma.inventoryCount.findUnique({
      where: { id: countId },
      include: {
        project: { select: { id: true } },
        tasks: {
          include: {
            zone: { select: { id: true, code: true, name: true } },
            assignedTo: { select: { id: true, name: true, email: true } },
            scans: {
              include: {
                recount: true,
                location: {
                  select: {
                    id: true,
                    codeZRNP: true,
                    expectedQty: true
                  }
                },
                sku: { select: { id: true, code: true, name: true } }
              },
              orderBy: { capturedAt: 'desc' }
            }
          }
        }
      }
    });

    if (!count) {
      throw new Error('Conteo no encontrado');
    }

    const variances = await inventoryService.listVariances(countId);

    const zoneSummary = new Map<
      string,
      {
        zoneId: string;
        zoneCode: string;
        zoneName: string;
        varianceCount: number;
        expectedTotal: number;
        foundTotal: number;
        differenceTotal: number;
        absoluteDifference: number;
      }
    >();
    const skuSummary = new Map<
      string,
      {
        skuId: string | null;
        skuCode: string;
        skuName: string;
        varianceCount: number;
        expectedTotal: number;
        foundTotal: number;
        differenceTotal: number;
        absoluteDifference: number;
      }
    >();

    variances.forEach((variance) => {
      const zoneKey = variance.location.zone.id;
      const zoneEntry = zoneSummary.get(zoneKey) ?? {
        zoneId: variance.location.zone.id,
        zoneCode: variance.location.zone.code,
        zoneName: variance.location.zone.name,
        varianceCount: 0,
        expectedTotal: 0,
        foundTotal: 0,
        differenceTotal: 0,
        absoluteDifference: 0
      };
      zoneEntry.varianceCount += 1;
      zoneEntry.expectedTotal += variance.expectedQty;
      zoneEntry.foundTotal += variance.foundQty;
      zoneEntry.differenceTotal += variance.difference;
      zoneEntry.absoluteDifference += Math.abs(variance.difference);
      zoneSummary.set(zoneKey, zoneEntry);

      const skuKey = variance.sku?.id ?? 'unassigned';
      const skuEntry = skuSummary.get(skuKey) ?? {
        skuId: variance.sku?.id ?? null,
        skuCode: variance.sku?.code ?? 'SIN SKU',
        skuName: variance.sku?.name ?? 'Sin SKU',
        varianceCount: 0,
        expectedTotal: 0,
        foundTotal: 0,
        differenceTotal: 0,
        absoluteDifference: 0
      };
      skuEntry.varianceCount += 1;
      skuEntry.expectedTotal += variance.expectedQty;
      skuEntry.foundTotal += variance.foundQty;
      skuEntry.differenceTotal += variance.difference;
      skuEntry.absoluteDifference += Math.abs(variance.difference);
      skuSummary.set(skuKey, skuEntry);
    });

    return {
      id: count.id,
      projectId: count.projectId,
      status: count.status,
      tolerancePct: count.tolerancePct ?? null,
      plannedAt: count.plannedAt,
      startedAt: count.startedAt,
      closedAt: count.closedAt,
      tasks: count.tasks.map((task) => ({
        id: task.id,
        zone: {
          id: task.zone.id,
          code: task.zone.code,
          name: task.zone.name
        },
        assignedTo: formatUserSummary(task.assignedTo ?? undefined),
        blind: task.blind,
        scans: task.scans.map((scan) => ({
          id: scan.id,
          qty: scan.qty,
          finalQty: scan.recount?.qty2 ?? scan.qty,
          recountQty: scan.recount?.qty2 ?? null,
          capturedAt: scan.capturedAt,
          deviceId: scan.deviceId ?? null,
          location: {
            id: scan.location.id,
            codeZRNP: scan.location.codeZRNP,
            expectedQty: scan.location.expectedQty ?? null
          },
          sku: scan.sku
            ? { id: scan.sku.id, code: scan.sku.code, name: scan.sku.name }
            : null
        }))
      })),
      variances,
      zoneSummary: Array.from(zoneSummary.values()).sort((a, b) =>
        a.zoneCode.localeCompare(b.zoneCode)
      ),
      skuSummary: Array.from(skuSummary.values()).sort((a, b) =>
        a.skuCode.localeCompare(b.skuCode)
      )
    };
  },

  async createCount(projectId: string, tolerancePct?: number | null) {
    const payload: { projectId: string; tolerancePct?: number | null } = {
      projectId
    };
    if (typeof tolerancePct === 'number' && Number.isFinite(tolerancePct)) {
      payload.tolerancePct = tolerancePct;
    } else if (tolerancePct === null) {
      payload.tolerancePct = null;
    }

    const count = await prisma.inventoryCount.create({ data: payload });
    return {
      id: count.id,
      projectId: count.projectId,
      status: count.status,
      tolerancePct: count.tolerancePct ?? null,
      plannedAt: count.plannedAt,
      startedAt: count.startedAt,
      closedAt: count.closedAt
    };
  },

  async updateCount(
    countId: string,
    data: { tolerancePct?: number | null; status?: InventoryCountStatus }
  ) {
    const count = await prisma.inventoryCount.findUnique({
      where: { id: countId }
    });
    if (!count) {
      throw new Error('Conteo no encontrado');
    }

    const updateData: {
      tolerancePct?: number | null;
      status?: InventoryCountStatus;
      startedAt?: Date;
    } = {};

    if (Object.prototype.hasOwnProperty.call(data, 'tolerancePct')) {
      if (
        typeof data.tolerancePct === 'number' &&
        Number.isFinite(data.tolerancePct)
      ) {
        updateData.tolerancePct = data.tolerancePct;
      } else {
        updateData.tolerancePct = null;
      }
    }

    if (data.status) {
      if (data.status === InventoryCountStatus.closed) {
        throw new Error('Utiliza la ruta de cierre para finalizar el conteo');
      }

      if (count.status === InventoryCountStatus.closed) {
        throw new Error('El conteo ya fue cerrado');
      }

      if (data.status === InventoryCountStatus.running) {
        if (count.status === InventoryCountStatus.planned) {
          updateData.status = InventoryCountStatus.running;
          updateData.startedAt = count.startedAt ?? new Date();
        }
      }
    }

    if (Object.keys(updateData).length === 0) {
      return count;
    }

    const updated = await prisma.inventoryCount.update({
      where: { id: countId },
      data: updateData
    });

    return updated;
  },

  async createTask(
    countId: string,
    payload: { zoneId: string; assignedToId?: string | null; blind?: boolean }
  ) {
    const count = await prisma.inventoryCount.findUnique({
      where: { id: countId }
    });
    if (!count) {
      throw new Error('Conteo no encontrado');
    }
    if (count.status === InventoryCountStatus.closed) {
      throw new Error('El conteo ya fue cerrado');
    }

    const zone = await prisma.warehouseZone.findUnique({
      where: { id: payload.zoneId },
      select: { id: true, projectId: true, code: true, name: true }
    });
    if (!zone || zone.projectId !== count.projectId) {
      throw new Error('La zona no pertenece al proyecto');
    }

    if (payload.assignedToId) {
      const membership = await prisma.membership.findUnique({
        where: {
          userId_projectId: {
            userId: payload.assignedToId,
            projectId: count.projectId
          }
        }
      });
      if (!membership) {
        throw new Error('El usuario no pertenece al proyecto');
      }
    }

    const task = await prisma.inventoryTask.create({
      data: {
        countId,
        zoneId: zone.id,
        assignedToId: payload.assignedToId ?? null,
        blind: payload.blind ?? true
      },
      include: {
        zone: { select: { id: true, code: true, name: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
        scans: { include: { recount: true } }
      }
    });

    return {
      id: task.id,
      zone: {
        id: task.zone.id,
        code: task.zone.code,
        name: task.zone.name
      },
      assignedTo: formatUserSummary(task.assignedTo ?? undefined),
      blind: task.blind,
      scanCount: task.scans.length,
      recountCount: task.scans.filter((scan) => Boolean(scan.recount)).length
    };
  },

  async listTasks(countId: string) {
    const tasks = await prisma.inventoryTask.findMany({
      where: { countId },
      orderBy: { createdAt: 'asc' },
      include: {
        zone: { select: { id: true, code: true, name: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
        scans: { include: { recount: true } }
      }
    });

    return tasks.map((task) => ({
      id: task.id,
      zone: {
        id: task.zone.id,
        code: task.zone.code,
        name: task.zone.name
      },
      assignedTo: formatUserSummary(task.assignedTo ?? undefined),
      blind: task.blind,
      scanCount: task.scans.length,
      recountCount: task.scans.filter((scan) => Boolean(scan.recount)).length
    }));
  },

  async recordScan(
    countId: string,
    taskId: string,
    payload: {
      locationId: string;
      skuId?: string | null;
      qty: number;
      deviceId?: string | null;
    }
  ) {
    const qty = toFiniteNumber(payload.qty, Number.NaN);
    if (!Number.isFinite(qty) || qty < 0) {
      throw new Error('Cantidad inválida para el conteo');
    }

    const scan = await prisma.$transaction(async (tx) => {
      const task = await tx.inventoryTask.findUnique({
        where: { id: taskId },
        include: {
          count: {
            select: { id: true, status: true, projectId: true, startedAt: true }
          },
          zone: { select: { id: true, projectId: true } }
        }
      });
      if (!task || task.countId !== countId) {
        throw new Error('Tarea de inventario no encontrada');
      }
      if (task.count.status === InventoryCountStatus.closed) {
        throw new Error('El conteo ya fue cerrado');
      }

      const location = await tx.location.findUnique({
        where: { id: payload.locationId },
        include: {
          zone: { select: { id: true, projectId: true } }
        }
      });
      if (!location || location.projectId !== task.count.projectId) {
        throw new Error('La ubicación no pertenece al proyecto');
      }
      if (location.zoneId !== task.zoneId) {
        throw new Error('La ubicación no pertenece a la zona asignada');
      }

      let skuId: string | null = payload.skuId ? String(payload.skuId) : null;
      if (skuId) {
        const sku = await tx.sku.findUnique({
          where: { id: skuId },
          select: { projectId: true }
        });
        if (!sku || sku.projectId !== task.count.projectId) {
          throw new Error('El SKU no pertenece al proyecto');
        }
      } else if (location.skuId) {
        skuId = location.skuId;
      }

      const scanRecord = await tx.inventoryScan.create({
        data: {
          taskId,
          locationId: location.id,
          skuId,
          qty,
          deviceId: payload.deviceId?.trim() ? payload.deviceId.trim() : null
        },
        include: {
          recount: true,
          location: {
            select: {
              id: true,
              codeZRNP: true,
              expectedQty: true
            }
          },
          sku: { select: { id: true, code: true, name: true } }
        }
      });

      if (task.count.status === InventoryCountStatus.planned) {
        await tx.inventoryCount.update({
          where: { id: countId },
          data: {
            status: InventoryCountStatus.running,
            startedAt: task.count.startedAt ?? new Date()
          }
        });
      } else if (
        task.count.status === InventoryCountStatus.running &&
        !task.count.startedAt
      ) {
        await tx.inventoryCount.update({
          where: { id: countId },
          data: {
            startedAt: new Date()
          }
        });
      }

      return scanRecord;
    });

    return {
      id: scan.id,
      qty: scan.qty,
      finalQty: scan.recount?.qty2 ?? scan.qty,
      recountQty: scan.recount?.qty2 ?? null,
      capturedAt: scan.capturedAt,
      deviceId: scan.deviceId ?? null,
      location: {
        id: scan.location.id,
        codeZRNP: scan.location.codeZRNP,
        expectedQty: scan.location.expectedQty ?? null
      },
      sku: scan.sku
        ? { id: scan.sku.id, code: scan.sku.code, name: scan.sku.name }
        : null
    };
  },

  async recordRecount(
    countId: string,
    taskId: string,
    scanId: string,
    payload: { qty2: number }
  ) {
    const qty2 = toFiniteNumber(payload.qty2, Number.NaN);
    if (!Number.isFinite(qty2) || qty2 < 0) {
      throw new Error('Cantidad inválida para el reconteo');
    }

    const updatedScan = await prisma.$transaction(async (tx) => {
      const scan = await tx.inventoryScan.findUnique({
        where: { id: scanId },
        include: {
          task: {
            include: {
              count: {
                select: { id: true, status: true }
              }
            }
          }
        }
      });
      if (!scan || scan.taskId !== taskId || scan.task.countId !== countId) {
        throw new Error('Registro de conteo no encontrado');
      }
      if (scan.task.count.status === InventoryCountStatus.closed) {
        throw new Error('El conteo ya fue cerrado');
      }

      await tx.inventoryRecount.upsert({
        where: { scanId },
        update: { qty2 },
        create: { scanId, qty2 }
      });

      const refreshed = await tx.inventoryScan.findUnique({
        where: { id: scanId },
        include: {
          recount: true,
          location: {
            select: {
              id: true,
              codeZRNP: true,
              expectedQty: true
            }
          },
          sku: { select: { id: true, code: true, name: true } }
        }
      });

      return refreshed!;
    });

    return {
      id: updatedScan.id,
      qty: updatedScan.qty,
      finalQty: updatedScan.recount?.qty2 ?? updatedScan.qty,
      recountQty: updatedScan.recount?.qty2 ?? null,
      capturedAt: updatedScan.capturedAt,
      deviceId: updatedScan.deviceId ?? null,
      location: {
        id: updatedScan.location.id,
        codeZRNP: updatedScan.location.codeZRNP,
        expectedQty: updatedScan.location.expectedQty ?? null
      },
      sku: updatedScan.sku
        ? {
            id: updatedScan.sku.id,
            code: updatedScan.sku.code,
            name: updatedScan.sku.name
          }
        : null
    };
  },

  async closeCount(countId: string) {
    await prisma.$transaction(async (tx) => {
      const count = await tx.inventoryCount.findUnique({
        where: { id: countId },
        include: {
          tasks: {
            include: {
              scans: { include: { recount: true } }
            }
          }
        }
      });
      if (!count) {
        throw new Error('Conteo no encontrado');
      }
      if (count.status === InventoryCountStatus.planned) {
        throw new Error('Debes iniciar el conteo antes de cerrarlo');
      }

      const locations = await tx.location.findMany({
        where: { projectId: count.projectId },
        include: {
          zone: { select: { id: true, code: true, name: true } },
          rack: { select: { id: true, code: true, name: true } },
          sku: { select: { id: true, code: true, name: true } }
        }
      });

      const locationMap = new Map(
        locations.map((location) => [location.id, location])
      );

      const foundByLocationSku = new Map<string, number>();
      count.tasks.forEach((task) => {
        task.scans.forEach((scan) => {
          const effective = scan.recount?.qty2 ?? scan.qty;
          const skuKey = scan.skuId ?? '';
          const key = `${scan.locationId}::${skuKey}`;
          const current = foundByLocationSku.get(key) ?? 0;
          foundByLocationSku.set(key, current + effective);
        });
      });

      const tolerance = toFiniteNumber(count.tolerancePct, 0);
      const epsilon = 1e-6;
      const variancePayload: {
        countId: string;
        locationId: string;
        skuId: string | null;
        expectedQty: number;
        foundQty: number;
        difference: number;
        percentage: number;
        reason: null;
      }[] = [];

      locations.forEach((location) => {
        const expected = toFiniteNumber(location.expectedQty, 0);
        const skuId = location.skuId ?? null;
        const key = `${location.id}::${skuId ?? ''}`;
        const found = toFiniteNumber(foundByLocationSku.get(key), 0);
        foundByLocationSku.delete(key);
        const difference = found - expected;
        const percentage = computePercentageDelta(expected, found);
        if (
          Math.abs(difference) > epsilon &&
          percentage - tolerance > epsilon
        ) {
          variancePayload.push({
            countId,
            locationId: location.id,
            skuId,
            expectedQty: expected,
            foundQty: found,
            difference,
            percentage,
            reason: null
          });
        }
      });

      for (const [key, found] of foundByLocationSku.entries()) {
        const [locationId, skuKey] = key.split('::');
        const location = locationMap.get(locationId);
        if (!location) {
          continue;
        }
        const difference = found;
        const percentage = computePercentageDelta(0, found);
        if (
          Math.abs(difference) > epsilon &&
          percentage - tolerance > epsilon
        ) {
          variancePayload.push({
            countId,
            locationId,
            skuId: skuKey ? skuKey : null,
            expectedQty: 0,
            foundQty: found,
            difference,
            percentage,
            reason: null
          });
        }
      }

      await tx.inventoryVariance.deleteMany({ where: { countId } });
      if (variancePayload.length > 0) {
        await tx.inventoryVariance.createMany({ data: variancePayload });
      }

      const now = new Date();
      await tx.inventoryCount.update({
        where: { id: countId },
        data: {
          status: InventoryCountStatus.closed,
          closedAt: now,
          startedAt: count.startedAt ?? now
        }
      });
    });

    return inventoryService.getCountDetail(countId);
  },

  async listVariances(countId: string) {
    const variances = await prisma.inventoryVariance.findMany({
      where: { countId },
      orderBy: [{ percentage: 'desc' }, { difference: 'desc' }],
      include: {
        location: {
          include: {
            zone: { select: { id: true, code: true, name: true } },
            rack: { select: { id: true, code: true, name: true } }
          }
        },
        sku: { select: { id: true, code: true, name: true } }
      }
    });

    return variances.map((variance) => ({
      id: variance.id,
      countId: variance.countId,
      expectedQty: variance.expectedQty,
      foundQty: variance.foundQty,
      difference: variance.difference,
      percentage: variance.percentage,
      reason: variance.reason ?? null,
      location: {
        id: variance.location.id,
        codeZRNP: variance.location.codeZRNP,
        expectedQty: variance.location.expectedQty ?? null,
        zone: {
          id: variance.location.zone.id,
          code: variance.location.zone.code,
          name: variance.location.zone.name
        },
        rack: {
          id: variance.location.rack.id,
          code: variance.location.rack.code,
          name: variance.location.rack.name
        }
      },
      sku: variance.sku
        ? {
            id: variance.sku.id,
            code: variance.sku.code,
            name: variance.sku.name
          }
        : null
    }));
  },

  async updateVarianceReason(
    countId: string,
    varianceId: string,
    reason?: string | null
  ) {
    const variance = await prisma.inventoryVariance.findUnique({
      where: { id: varianceId },
      select: { countId: true }
    });
    if (!variance || variance.countId !== countId) {
      throw new Error('Variación no encontrada');
    }

    await prisma.inventoryVariance.update({
      where: { id: varianceId },
      data: { reason: reason?.trim() ? reason.trim() : null }
    });

    const [updated] = await inventoryService
      .listVariances(countId)
      .then((list) => list.filter((item) => item.id === varianceId));

    return updated;
  },

  async exportVariances(countId: string) {
    const variances = await inventoryService.listVariances(countId);
    const header = [
      'Zona',
      'Código de zona',
      'Ubicación',
      'SKU',
      'Esperado',
      'Encontrado',
      'Diferencia',
      '% Diferencia',
      'Causa'
    ];

    const rows = variances.map((variance) => {
      const skuLabel = variance.sku
        ? `${variance.sku.code} - ${variance.sku.name}`
        : 'SIN SKU';
      return [
        variance.location.zone.name,
        variance.location.zone.code,
        variance.location.codeZRNP,
        skuLabel,
        variance.expectedQty.toFixed(2),
        variance.foundQty.toFixed(2),
        variance.difference.toFixed(2),
        variance.percentage.toFixed(2),
        variance.reason ?? ''
      ];
    });

    const csvLines = [header, ...rows]
      .map((columns) =>
        columns
          .map((value) => {
            const text = String(value ?? '');
            if (
              text.includes(',') ||
              text.includes('"') ||
              text.includes('\n')
            ) {
              return `"${text.replace(/"/g, '""')}"`;
            }
            return text;
          })
          .join(',')
      )
      .join('\n');

    return Buffer.from(csvLines, 'utf-8');
  }
};
