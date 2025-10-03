import ExcelJS from 'exceljs';

import { prisma } from '../../core/config/db';
import { HttpError } from '../../core/errors/http-error';

const sanitizeForFilename = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'export';

export const routeExportService = {
  async buildExcel(planId: string) {
    const plan = await prisma.routePlan.findUnique({
      where: { id: planId },
      include: {
        project: { select: { id: true, name: true } },
        carrier: { select: { id: true, name: true } },
        stops: { orderBy: { sequence: 'asc' } },
        vehicles: { orderBy: { name: 'asc' } },
        tariffs: { orderBy: [{ fromClient: 'asc' }, { toClient: 'asc' }] }
      }
    });

    if (!plan) {
      throw new HttpError(404, 'Plan de rutas no encontrado');
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Auditoría';
    workbook.created = new Date();

    const summarySheet = workbook.addWorksheet('Resumen');
    summarySheet.columns = [
      { header: 'Campo', key: 'field', width: 24 },
      { header: 'Valor', key: 'value', width: 48 }
    ];

    summarySheet.addRows([
      { field: 'Proyecto', value: plan.project.name },
      { field: 'Escenario', value: plan.scenario },
      { field: 'Estado', value: plan.status },
      { field: 'Transportista', value: plan.carrier?.name ?? 'No asignado' },
      { field: 'Aprobado', value: plan.approved ? 'Sí' : 'No' }
    ]);

    const capacitySheet = workbook.addWorksheet('Capacidades');
    capacitySheet.columns = [
      { header: 'Vehículo', key: 'name', width: 32 },
      { header: 'Capacidad', key: 'capacity', width: 16 },
      { header: 'Costo por km', key: 'costKm', width: 16 },
      { header: 'Costo fijo', key: 'fixed', width: 16 }
    ];
    plan.vehicles.forEach((vehicle) =>
      capacitySheet.addRow({
        name: vehicle.name,
        capacity: vehicle.capacity ?? 0,
        costKm: vehicle.costKm ?? 0,
        fixed: vehicle.fixed ?? 0
      })
    );

    const costsSheet = workbook.addWorksheet('Costos');
    costsSheet.columns = [
      { header: 'Origen', key: 'fromClient', width: 28 },
      { header: 'Destino', key: 'toClient', width: 28 },
      { header: 'Distancia (km)', key: 'distanceKm', width: 18 },
      { header: 'Costo', key: 'cost', width: 16 }
    ];
    plan.tariffs.forEach((tariff) =>
      costsSheet.addRow({
        fromClient: tariff.fromClient,
        toClient: tariff.toClient,
        distanceKm: tariff.distanceKm ?? 0,
        cost: tariff.cost
      })
    );

    const windowsSheet = workbook.addWorksheet('Ventanas');
    windowsSheet.columns = [
      { header: 'Cliente', key: 'client', width: 32 },
      { header: 'Inicio', key: 'windowStart', width: 24 },
      { header: 'Fin', key: 'windowEnd', width: 24 }
    ];
    plan.stops.forEach((stop) =>
      windowsSheet.addRow({
        client: stop.client,
        windowStart: stop.windowStart ? stop.windowStart.toISOString() : '',
        windowEnd: stop.windowEnd ? stop.windowEnd.toISOString() : ''
      })
    );

    const demandSheet = workbook.addWorksheet('Demandas');
    demandSheet.columns = [
      { header: 'Cliente', key: 'client', width: 32 },
      { header: 'Demanda Volumen', key: 'demandVol', width: 20 },
      { header: 'Demanda Peso', key: 'demandKg', width: 20 }
    ];
    plan.stops.forEach((stop) =>
      demandSheet.addRow({
        client: stop.client,
        demandVol: stop.demandVol ?? 0,
        demandKg: stop.demandKg ?? 0
      })
    );

    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    const projectSlug = sanitizeForFilename(plan.project.name);
    const scenarioSlug = sanitizeForFilename(plan.scenario);

    const filename = `vrp-${projectSlug}-${scenarioSlug}.xlsx`;

    return {
      buffer,
      filename,
      projectId: plan.projectId
    };
  }
};
