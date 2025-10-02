import { BarcodeLabelType, InventoryCountStatus } from '@prisma/client';
import { Router } from 'express';
import multer from 'multer';

import { authenticate, requireProjectRole, type AuthenticatedRequest } from '../../core/middleware/auth.js';
import { enforceProjectAccess } from '../../core/security/enforce-project-access.js';
import { inventoryService } from './inventory.service.js';

const upload = multer({ storage: multer.memoryStorage() });

const viewerRoles = ['ConsultorLider', 'Auditor', 'SponsorPM', 'Invitado'];
const editorRoles = ['ConsultorLider', 'Auditor'];

const inventoryRouter = Router();

inventoryRouter.use(authenticate);

const parseOptionalNumber = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

const parseCountStatus = (value: unknown): InventoryCountStatus | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const normalized = value.trim().toLowerCase() as InventoryCountStatus;
  return (Object.values(InventoryCountStatus) as InventoryCountStatus[]).includes(normalized)
    ? normalized
    : undefined;
};

inventoryRouter.get('/skus/:projectId', requireProjectRole(viewerRoles), async (req: AuthenticatedRequest, res) => {
  const { projectId } = req.params;
  const skus = await inventoryService.listSkus(projectId);
  res.json(skus);
});

inventoryRouter.post(
  '/skus/import/:projectId',
  requireProjectRole(editorRoles),
  upload.single('file'),
  async (req: AuthenticatedRequest, res) => {
    const { projectId } = req.params;
    if (!req.file) {
      return res.status(400).json({ message: 'Archivo CSV requerido' });
    }
    const result = await inventoryService.importSkus(projectId, req.file.buffer);
    return res.json(result);
  },
);

inventoryRouter.get(
  '/locations/:projectId',
  requireProjectRole(viewerRoles),
  async (req: AuthenticatedRequest, res) => {
    const { projectId } = req.params;
    const locations = await inventoryService.listLocations(projectId);
    res.json(locations);
  },
);

inventoryRouter.post(
  '/locations/:projectId/bulk',
  requireProjectRole(editorRoles),
  async (req: AuthenticatedRequest, res) => {
    const { projectId } = req.params;
    const { definitions } = req.body as { definitions?: unknown };

    if (!Array.isArray(definitions) || definitions.length === 0) {
      return res.status(400).json({ message: 'definitions requerido' });
    }

    const parsedDefinitions = definitions
      .map((definition) => {
        if (typeof definition !== 'object' || definition === null) return null;
        const value = definition as Record<string, any>;
        if (!value.zone || !value.rack) return null;
        return {
          zone: {
            code: String(value.zone.code ?? ''),
            name: value.zone.name ? String(value.zone.name) : undefined,
          },
          rack: {
            code: String(value.rack.code ?? ''),
            name: value.rack.name ? String(value.rack.name) : undefined,
          },
          rowStart: Number(value.rowStart ?? value.row ?? 0),
          rowEnd: Number(value.rowEnd ?? value.row ?? value.rowStart ?? 0),
          levelStart: Number(value.levelStart ?? value.level ?? 0),
          levelEnd: Number(value.levelEnd ?? value.level ?? value.levelStart ?? 0),
          positionStart: Number(value.positionStart ?? value.posStart ?? value.pos ?? 0),
          positionEnd: Number(value.positionEnd ?? value.posEnd ?? value.pos ?? value.positionStart ?? 0),
        };
      })
      .filter(Boolean);

    if (parsedDefinitions.length === 0) {
      return res.status(400).json({ message: 'No hay definiciones válidas' });
    }

    const result = await inventoryService.bulkCreateLocations(projectId, parsedDefinitions);
    res.status(201).json(result);
  },
);

inventoryRouter.get(
  '/counts/:projectId',
  requireProjectRole(viewerRoles),
  async (req: AuthenticatedRequest, res) => {
    const { projectId } = req.params;
    const counts = await inventoryService.listCounts(projectId);
    res.json(counts);
  },
);

inventoryRouter.post(
  '/counts/:projectId',
  requireProjectRole(editorRoles),
  async (req: AuthenticatedRequest, res) => {
    const { projectId } = req.params;
    const { tolerancePct } = req.body as { tolerancePct?: unknown };

    let toleranceValue: number | null | undefined;
    if (tolerancePct === null) {
      toleranceValue = null;
    } else {
      toleranceValue = parseOptionalNumber(tolerancePct);
    }

    const count = await inventoryService.createCount(projectId, toleranceValue);
    res.status(201).json(count);
  },
);

inventoryRouter.patch(
  '/counts/:countId',
  requireProjectRole(editorRoles),
  async (req: AuthenticatedRequest, res) => {
    const { countId } = req.params;
    const projectId = await inventoryService.getCountProject(countId);
    await enforceProjectAccess(req.user, projectId);

    const body = req.body as {
      tolerancePct?: unknown;
      status?: unknown;
    };
    const parsedStatus = parseCountStatus(body.status);
    const payload: { tolerancePct?: number | null; status?: InventoryCountStatus } = {};

    if (Object.prototype.hasOwnProperty.call(body ?? {}, 'tolerancePct')) {
      if (body.tolerancePct === null) {
        payload.tolerancePct = null;
      } else {
        const parsedTolerance = parseOptionalNumber(body.tolerancePct);
        if (parsedTolerance === undefined) {
          return res.status(400).json({ message: 'tolerancePct inválido' });
        }
        payload.tolerancePct = parsedTolerance;
      }
    }

    if (parsedStatus) {
      payload.status = parsedStatus;
    }

    const updated = await inventoryService.updateCount(countId, payload);
    res.json(updated);
  },
);

inventoryRouter.get(
  '/counts/:countId/detail',
  requireProjectRole(viewerRoles),
  async (req: AuthenticatedRequest, res) => {
    const { countId } = req.params;
    const projectId = await inventoryService.getCountProject(countId);
    await enforceProjectAccess(req.user, projectId);
    const detail = await inventoryService.getCountDetail(countId);
    res.json(detail);
  },
);

inventoryRouter.get(
  '/counts/:countId/tasks',
  requireProjectRole(viewerRoles),
  async (req: AuthenticatedRequest, res) => {
    const { countId } = req.params;
    const projectId = await inventoryService.getCountProject(countId);
    await enforceProjectAccess(req.user, projectId);
    const tasks = await inventoryService.listTasks(countId);
    res.json(tasks);
  },
);

inventoryRouter.post(
  '/counts/:countId/tasks',
  requireProjectRole(editorRoles),
  async (req: AuthenticatedRequest, res) => {
    const { countId } = req.params;
    const projectId = await inventoryService.getCountProject(countId);
    await enforceProjectAccess(req.user, projectId);
    const { zoneId, assignedToId, blind } = req.body as {
      zoneId?: unknown;
      assignedToId?: unknown;
      blind?: unknown;
    };

    if (!zoneId) {
      return res.status(400).json({ message: 'zoneId requerido' });
    }

    const task = await inventoryService.createTask(countId, {
      zoneId: String(zoneId),
      assignedToId: assignedToId ? String(assignedToId) : undefined,
      blind: typeof blind === 'boolean' ? blind : undefined,
    });
    res.status(201).json(task);
  },
);

inventoryRouter.post(
  '/counts/:countId/tasks/:taskId/scans',
  requireProjectRole(editorRoles),
  async (req: AuthenticatedRequest, res) => {
    const { countId, taskId } = req.params;
    const projectId = await inventoryService.getCountProject(countId);
    await enforceProjectAccess(req.user, projectId);

    const { locationId, skuId, qty, deviceId } = req.body as {
      locationId?: unknown;
      skuId?: unknown;
      qty?: unknown;
      deviceId?: unknown;
    };

    if (!locationId) {
      return res.status(400).json({ message: 'locationId requerido' });
    }

    const parsedQty = parseOptionalNumber(qty);
    if (parsedQty === undefined) {
      return res.status(400).json({ message: 'qty inválido' });
    }

    const scan = await inventoryService.recordScan(countId, taskId, {
      locationId: String(locationId),
      skuId: skuId ? String(skuId) : undefined,
      qty: parsedQty,
      deviceId: deviceId ? String(deviceId) : undefined,
    });
    res.status(201).json(scan);
  },
);

inventoryRouter.post(
  '/counts/:countId/tasks/:taskId/scans/:scanId/recount',
  requireProjectRole(editorRoles),
  async (req: AuthenticatedRequest, res) => {
    const { countId, taskId, scanId } = req.params;
    const projectId = await inventoryService.getCountProject(countId);
    await enforceProjectAccess(req.user, projectId);

    const { qty2 } = req.body as { qty2?: unknown };
    const parsedQty = parseOptionalNumber(qty2);
    if (parsedQty === undefined) {
      return res.status(400).json({ message: 'qty2 inválido' });
    }

    const recount = await inventoryService.recordRecount(countId, taskId, scanId, {
      qty2: parsedQty,
    });
    res.status(200).json(recount);
  },
);

inventoryRouter.post(
  '/counts/:countId/close',
  requireProjectRole(editorRoles),
  async (req: AuthenticatedRequest, res) => {
    const { countId } = req.params;
    const projectId = await inventoryService.getCountProject(countId);
    await enforceProjectAccess(req.user, projectId);
    const detail = await inventoryService.closeCount(countId);
    res.json(detail);
  },
);

inventoryRouter.get(
  '/counts/:countId/variances',
  requireProjectRole(viewerRoles),
  async (req: AuthenticatedRequest, res) => {
    const { countId } = req.params;
    const projectId = await inventoryService.getCountProject(countId);
    await enforceProjectAccess(req.user, projectId);
    const variances = await inventoryService.listVariances(countId);
    res.json(variances);
  },
);

inventoryRouter.patch(
  '/counts/:countId/variances/:varianceId',
  requireProjectRole(editorRoles),
  async (req: AuthenticatedRequest, res) => {
    const { countId, varianceId } = req.params;
    const projectId = await inventoryService.getCountProject(countId);
    await enforceProjectAccess(req.user, projectId);
    const { reason } = req.body as { reason?: unknown };
    const updated = await inventoryService.updateVarianceReason(
      countId,
      varianceId,
      typeof reason === 'string' ? reason : undefined,
    );
    res.json(updated ?? null);
  },
);

inventoryRouter.get(
  '/counts/:countId/variances/export',
  requireProjectRole(viewerRoles),
  async (req: AuthenticatedRequest, res) => {
    const { countId } = req.params;
    const projectId = await inventoryService.getCountProject(countId);
    await enforceProjectAccess(req.user, projectId);
    const buffer = await inventoryService.exportVariances(countId);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="variaciones-${countId}.csv"`,
    );
    res.send(buffer);
  },
);

inventoryRouter.post(
  '/labels/:projectId/generate',
  requireProjectRole(editorRoles),
  async (req: AuthenticatedRequest, res) => {
    const { projectId } = req.params;
    const { type, ids } = req.body as { type?: BarcodeLabelType; ids?: unknown };

    if (!type || !Object.values(BarcodeLabelType).includes(type)) {
      return res.status(400).json({ message: 'Tipo de etiqueta inválido' });
    }

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'ids requerido' });
    }

    const idList = ids.map((value) => String(value));
    const { buffer } = await inventoryService.generateLabels(projectId, type, idList);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="labels-${type.toLowerCase()}-${Date.now()}.pdf"`);
    res.send(buffer);
  },
);

inventoryRouter.post(
  '/labels/:projectId/install',
  requireProjectRole(editorRoles),
  async (req: AuthenticatedRequest, res) => {
    const { projectId } = req.params;
    const { labelIds } = req.body as { labelIds?: unknown };

    if (!Array.isArray(labelIds) || labelIds.length === 0) {
      return res.status(400).json({ message: 'labelIds requerido' });
    }

    const idList = labelIds.map((value) => String(value));
    const updated = await inventoryService.markLabelsInstalled(projectId, idList, req.user!.id);
    res.json({ updated: updated.map((label) => ({ id: label.id, installedAt: label.installedAt })) });
  },
);

export { inventoryRouter };
