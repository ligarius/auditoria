import { BarcodeLabelType } from '@prisma/client';
import { Router } from 'express';
import multer from 'multer';

import { authenticate, requireProjectRole, type AuthenticatedRequest } from '../../core/middleware/auth.js';
import { inventoryService } from './inventory.service.js';

const upload = multer({ storage: multer.memoryStorage() });

const viewerRoles = ['ConsultorLider', 'Auditor', 'SponsorPM', 'Invitado'];
const editorRoles = ['ConsultorLider', 'Auditor'];

const inventoryRouter = Router();

inventoryRouter.use(authenticate);

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
