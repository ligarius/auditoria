import path from 'path';
import { randomUUID } from 'crypto';

import { Router } from 'express';
import multer from 'multer';

import {
  authenticate,
  requireProjectRole
} from '../../core/middleware/auth.js';
import { enforceProjectAccess } from '../../core/security/enforce-project-access.js';
import { fileService } from '../files/file.service.js';

import { processService } from './process.service.js';

const upload = multer({
  dest: path.join(process.cwd(), 'tmp'),
  storage: multer.diskStorage({
    destination: path.join(process.cwd(), 'tmp'),
    filename: (_req, file, cb) =>
      cb(null, `${randomUUID()}-${file.originalname}`)
  })
});

const processRouter = Router();

processRouter.use(authenticate);

processRouter.get(
  '/:projectId',
  requireProjectRole(['ConsultorLider', 'Auditor', 'SponsorPM', 'Invitado']),
  async (req, res) => {
    await enforceProjectAccess(req.user, req.params.projectId);
    const processes = await processService.list(req.params.projectId);
    res.json(processes);
  }
);

processRouter.post(
  '/:projectId',
  requireProjectRole(['ConsultorLider', 'Auditor']),
  async (req, res) => {
    const processAsset = await processService.create(
      req.params.projectId,
      req.body,
      req.user!.id
    );
    res.status(201).json(processAsset);
  }
);

processRouter.post(
  '/:projectId/:processId/file',
  requireProjectRole(['ConsultorLider', 'Auditor']),
  upload.single('file'),
  async (req, res) => {
    if (!req.file)
      return res.status(400).json({ message: 'Archivo requerido' });
    const saved = await fileService.save(
      req.params.projectId,
      req.file,
      req.user!.id
    );
    const processAsset = await processService.update(
      req.params.processId,
      { fileId: saved.id },
      req.user!.id
    );
    res.json(processAsset);
  }
);

processRouter.put(
  '/:projectId/:processId',
  requireProjectRole(['ConsultorLider', 'Auditor']),
  async (req, res) => {
    const processAsset = await processService.update(
      req.params.processId,
      req.body,
      req.user!.id
    );
    res.json(processAsset);
  }
);

processRouter.delete(
  '/:projectId/:processId',
  requireProjectRole(['ConsultorLider']),
  async (req, res) => {
    await processService.remove(req.params.processId, req.user!.id);
    res.status(204).send();
  }
);

export { processRouter };
