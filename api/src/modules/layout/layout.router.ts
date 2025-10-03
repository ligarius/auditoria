import path from 'path';
import { randomUUID } from 'crypto';

import { Router } from 'express';
import multer from 'multer';

import {
  authenticate,
  requireProjectRole,
  type AuthenticatedRequest
} from '../../core/middleware/auth';
import { enforceProjectAccess } from '../../core/security/enforce-project-access';

import { layoutService } from './layout.service';

const upload = multer({
  dest: path.join(process.cwd(), 'tmp'),
  storage: multer.diskStorage({
    destination: path.join(process.cwd(), 'tmp'),
    filename: (_req, file, cb) =>
      cb(null, `${randomUUID()}-${file.originalname}`)
  })
});

const viewerRoles = ['ConsultorLider', 'Auditor', 'SponsorPM', 'Invitado'];
const editorRoles = ['ConsultorLider', 'Auditor'];

const layoutRouter = Router();

layoutRouter.use(authenticate);

layoutRouter.get(
  '/projects/:projectId',
  requireProjectRole(viewerRoles),
  async (req: AuthenticatedRequest, res) => {
    const { projectId } = req.params;
    const result = await layoutService.getProjectLayout(projectId);
    res.json(result);
  }
);

layoutRouter.post(
  '/projects/:projectId/plan',
  requireProjectRole(editorRoles),
  upload.single('plan'),
  async (req: AuthenticatedRequest, res) => {
    const { projectId } = req.params;
    if (!req.file) {
      return res.status(400).json({ message: 'Archivo de plano requerido' });
    }
    const plan = await layoutService.updatePlan(
      projectId,
      req.file,
      req.user!.id
    );
    res.status(201).json(plan);
  }
);

layoutRouter.post(
  '/projects/:projectId/capacity',
  requireProjectRole(editorRoles),
  async (req: AuthenticatedRequest, res) => {
    const { projectId } = req.params;
    const body = req.body as { rows?: unknown; memo?: unknown };

    if (!Array.isArray(body.rows) || body.rows.length === 0) {
      return res.status(400).json({ message: 'rows requerido' });
    }

    const parsedRows = body.rows
      .map((row) => {
        if (typeof row !== 'object' || row === null) {
          return null;
        }
        const value = row as Record<string, unknown>;
        const zoneId = typeof value.zoneId === 'string' ? value.zoneId : null;
        const rackType =
          typeof value.rackType === 'string' ? value.rackType.trim() : null;
        const aislesRaw = value.aisles as unknown;
        const ppRaw = value.pp as unknown;
        const aisles = Number(aislesRaw);
        const pp = Number(ppRaw);

        if (!zoneId || !rackType) {
          return null;
        }

        if (!Number.isFinite(aisles) || !Number.isFinite(pp)) {
          return null;
        }

        return {
          zoneId,
          rackType,
          aisles: Math.max(0, Math.round(aisles)),
          pp: Math.max(0, Math.round(pp))
        };
      })
      .filter(Boolean) as {
      zoneId: string;
      rackType: string;
      aisles: number;
      pp: number;
    }[];

    if (parsedRows.length === 0) {
      return res.status(400).json({ message: 'rows inválido' });
    }

    const simulation = await layoutService.saveSimulation(
      projectId,
      parsedRows,
      body.memo ?? null
    );
    res.status(201).json(simulation);
  }
);

layoutRouter.get(
  '/zones/:zoneId/capacity',
  async (req: AuthenticatedRequest, res) => {
    const { zoneId } = req.params;
    const projectId = await layoutService.getZoneProject(zoneId);
    if (!projectId) {
      return res.status(404).json({ message: 'Zona no encontrada' });
    }

    await enforceProjectAccess(req.user, projectId);

    const calcs = await layoutService.listZoneCalcs(zoneId);
    res.json(calcs);
  }
);

export { layoutRouter };
