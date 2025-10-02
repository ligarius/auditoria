import { BarcodeLabelType } from '@prisma/client';
import bwipjs from 'bwip-js';
import { parse } from 'csv-parse/sync';
import PDFDocument from 'pdfkit';

import { prisma } from '../../core/config/db.js';

interface CsvSkuRow {
  code?: string;
  name?: string;
  uom?: string;
  length?: string;
  width?: string;
  height?: string;
  weight?: string;
}

interface LocationRangeDefinition {
  zone: { code: string; name?: string };
  rack: { code: string; name?: string };
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

const buildLocationCode = (
  zoneCode: string,
  rackCode: string,
  row: number,
  level: number,
  pos: number,
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
    select: { id: true, name: true },
  });

  const grouped = new Map<string, { id: string; name: string }[]>();
  skus.forEach((sku) => {
    const key = sku.name ? normalizeString(sku.name).replace(/[^a-z0-9]/g, '') : '';
    if (!key) return;
    const bucket = grouped.get(key) ?? [];
    bucket.push({ id: sku.id, name: sku.name });
    grouped.set(key, bucket);
  });

  const candidates: { projectId: string; skuAId: string; skuBId: string; similarity: number }[] = [];
  grouped.forEach((items) => {
    if (items.length < 2) return;
    for (let i = 0; i < items.length; i += 1) {
      for (let j = i + 1; j < items.length; j += 1) {
        candidates.push({
          projectId,
          skuAId: items[i]!.id,
          skuBId: items[j]!.id,
          similarity: 1,
        });
      }
    }
  });

  await prisma.skuDupCandidate.deleteMany({ where: { projectId } });
  if (candidates.length > 0) {
    await prisma.skuDupCandidate.createMany({ data: candidates, skipDuplicates: true });
  }

  return candidates.length;
};

const generatePdf = async (
  items: { code: string; title: string; subtitle?: string }[],
): Promise<Buffer> => {
  const doc = new PDFDocument({ size: 'A4', margin: 36 });
  const buffers: Buffer[] = [];
  doc.on('data', (chunk) => buffers.push(chunk));
  const resultPromise = new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', (error) => reject(error));
  });

  const columns = 2;
  const availableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const availableHeight = doc.page.height - doc.page.margins.top - doc.page.margins.bottom;
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
      height: 24,
    });

    if (items[index]!.subtitle) {
      doc.fontSize(9).fillColor('#475569');
      doc.text(items[index]!.subtitle!, x + 12, y + 32, {
        width: boxWidth - 24,
      });
    }

    // eslint-disable-next-line no-await-in-loop
    const barcodeBuffer = await bwipjs.toBuffer({
      bcid: 'code128',
      text: items[index]!.code,
      scale: 3,
      height: 12,
      includetext: false,
      paddingwidth: 6,
    });

    const barcodeWidth = boxWidth - 24;
    doc.image(barcodeBuffer, x + 12, y + 60, {
      width: barcodeWidth,
      height: 70,
      align: 'center',
    });

    doc.fontSize(11).fillColor('#0f172a');
    doc.text(items[index]!.code, x + 12, y + 138, {
      width: boxWidth - 24,
      align: 'center',
    });
  }

  doc.end();
  return resultPromise;
};

export const inventoryService = {
  async importSkus(projectId: string, fileBuffer: Buffer) {
    const content = fileBuffer.toString('utf-8');
    const rows = parse<CsvSkuRow>(content, {
      columns: (header) => header.map((column) => column.toLowerCase().trim().replace(/\s+/g, '_')),
      skip_empty_lines: true,
      trim: true,
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
          weight: parseNumber(row.weight),
        };

        const existing = await tx.sku.findUnique({
          where: { projectId_code: { projectId, code } },
        });

        if (existing) {
          await tx.sku.update({
            where: { id: existing.id },
            data,
          });
          updated += 1;
        } else {
          await tx.sku.create({
            data: {
              projectId,
              code,
              ...data,
            },
          });
          created += 1;
        }
      }
    });

    await computeDuplicateCandidates(projectId);

    return {
      created,
      updated,
      total: created + updated,
    };
  },

  async listSkus(projectId: string) {
    const skus = await prisma.sku.findMany({
      where: { projectId },
      orderBy: { code: 'asc' },
      include: {
        labels: {
          orderBy: { printedAt: 'desc' },
          take: 1,
        },
      },
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
            installedAt: sku.labels[0]!.installedAt,
          }
        : null,
    }));
  },

  async bulkCreateLocations(projectId: string, definitions: LocationRangeDefinition[]) {
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
            name: definition.zone.name?.trim() || zoneCode,
          },
        });

        const rack = await tx.rack.upsert({
          where: { zoneId_code: { zoneId: zone.id, code: rackCode } },
          update: {
            name: definition.rack.name?.trim() || rackCode,
          },
          create: {
            projectId,
            zoneId: zone.id,
            code: rackCode,
            name: definition.rack.name?.trim() || rackCode,
          },
        });

        const rowStart = sanitizeRangeValue(definition.rowStart);
        const rowEnd = sanitizeRangeValue(definition.rowEnd);
        const levelStart = sanitizeRangeValue(definition.levelStart);
        const levelEnd = sanitizeRangeValue(definition.levelEnd);
        const positionStart = sanitizeRangeValue(definition.positionStart);
        const positionEnd = sanitizeRangeValue(definition.positionEnd);

        for (let row = Math.min(rowStart, rowEnd); row <= Math.max(rowStart, rowEnd); row += 1) {
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
              const codeZRNP = buildLocationCode(zoneCode, rackCode, row, level, pos);
              const existing = await tx.location.findUnique({ where: { codeZRNP } });
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
                    pos,
                  },
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
                    codeZRNP,
                  },
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
      total: created + reused,
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
          take: 1,
        },
      },
    });

    const zonesSummary = new Map<string, {
      zoneId: string;
      zoneCode: string;
      zoneName: string;
      totalLocations: number;
      installedLocations: number;
    }>();

    const formatted = locations.map((location) => {
      const latestLabel = location.labels[0]
        ? {
            id: location.labels[0]!.id,
            printedAt: location.labels[0]!.printedAt,
            installedAt: location.labels[0]!.installedAt,
          }
        : null;
      const summary = zonesSummary.get(location.zoneId) ?? {
        zoneId: location.zoneId,
        zoneCode: location.zone.code,
        zoneName: location.zone.name,
        totalLocations: 0,
        installedLocations: 0,
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
        zone: {
          id: location.zone.id,
          code: location.zone.code,
          name: location.zone.name,
        },
        rack: {
          id: location.rack.id,
          code: location.rack.code,
          name: location.rack.name,
        },
        label: latestLabel,
      };
    });

    return {
      locations: formatted,
      zones: Array.from(zonesSummary.values()).sort((a, b) =>
        a.zoneCode.localeCompare(b.zoneCode),
      ),
    };
  },

  async generateLabels(projectId: string, type: BarcodeLabelType, ids: string[]) {
    if (ids.length === 0) {
      throw new Error('Sin elementos para generar etiquetas');
    }

    if (type === BarcodeLabelType.SKU) {
      const skus = await prisma.sku.findMany({
        where: { projectId, id: { in: ids } },
      });
      if (skus.length !== ids.length) {
        throw new Error('Algunos SKU no existen en el proyecto');
      }

      const now = new Date();
      const pdfItems = skus.map((sku) => ({
        code: sku.code,
        title: sku.name,
        subtitle: `UOM: ${sku.uom}`,
      }));

      for (const sku of skus) {
        // eslint-disable-next-line no-await-in-loop
        await prisma.barcodeLabel.upsert({
          where: {
            projectId_type_code: {
              projectId,
              type,
              code: sku.code,
            },
          },
          update: {
            printedAt: now,
            skuId: sku.id,
          },
          create: {
            projectId,
            type,
            code: sku.code,
            format: 'CODE128',
            printedAt: now,
            skuId: sku.id,
          },
        });
      }

      const buffer = await generatePdf(pdfItems);
      return { buffer };
    }

    const locations = await prisma.location.findMany({
      where: { projectId, id: { in: ids } },
      include: {
        zone: true,
        rack: true,
      },
    });

    if (locations.length !== ids.length) {
      throw new Error('Algunas ubicaciones no existen en el proyecto');
    }

    const now = new Date();
    const pdfItems = locations.map((location) => ({
      code: location.codeZRNP,
      title: `${location.zone.code} · Rack ${location.rack.code}`,
      subtitle: `Fila ${location.row} · Nivel ${location.level} · Pos ${location.pos}`,
    }));

    for (const location of locations) {
      // eslint-disable-next-line no-await-in-loop
      await prisma.barcodeLabel.upsert({
        where: {
          projectId_type_code: {
            projectId,
            type,
            code: location.codeZRNP,
          },
        },
        update: {
          printedAt: now,
          locationId: location.id,
        },
        create: {
          projectId,
          type,
          code: location.codeZRNP,
          format: 'CODE128',
          printedAt: now,
          locationId: location.id,
        },
      });
    }

    const buffer = await generatePdf(pdfItems);
    return { buffer };
  },

  async markLabelsInstalled(projectId: string, labelIds: string[], userId: string) {
    if (labelIds.length === 0) {
      return [];
    }

    const labels = await prisma.barcodeLabel.findMany({
      where: { id: { in: labelIds }, projectId },
      select: { id: true },
    });

    const now = new Date();
    const updates = await prisma.$transaction(
      labels.map((label) =>
        prisma.barcodeLabel.update({
          where: { id: label.id },
          data: {
            installedAt: now,
            installedById: userId,
          },
        }),
      ),
    );

    return updates;
  },
};
