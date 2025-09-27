import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { randomUUID } from 'crypto';

import { authenticate, requireProjectRole } from '../../core/middleware/auth.js';
import { fileService } from '../files/file.service.js';
import { interviewService } from './interview.service.js';

const upload = multer({
  dest: path.join(process.cwd(), 'tmp'),
  storage: multer.diskStorage({
    destination: path.join(process.cwd(), 'tmp'),
    filename: (_req, file, cb) => cb(null, `${randomUUID()}-${file.originalname}`)
  })
});

const interviewRouter = Router();

interviewRouter.use(authenticate);

interviewRouter.get('/:projectId', requireProjectRole(['ConsultorLider', 'Auditor', 'SponsorPM']), async (req, res) => {
  const interviews = await interviewService.list(req.params.projectId);
  res.json(interviews);
});

interviewRouter.post('/:projectId', requireProjectRole(['ConsultorLider', 'Auditor']), async (req, res) => {
  const interview = await interviewService.create(req.params.projectId, req.body, req.user!.id);
  res.status(201).json(interview);
});

interviewRouter.post('/:projectId/:interviewId/audio', requireProjectRole(['ConsultorLider', 'Auditor']), upload.single('audio'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Archivo requerido' });
  }
  const file = await fileService.save(req.params.projectId, req.file, req.user!.id);
  const interview = await interviewService.update(req.params.interviewId, { audioFileId: file.id }, req.user!.id);
  res.json(interview);
});

interviewRouter.put('/:projectId/:interviewId', requireProjectRole(['ConsultorLider', 'Auditor']), async (req, res) => {
  const interview = await interviewService.update(req.params.interviewId, req.body, req.user!.id);
  res.json(interview);
});

interviewRouter.delete('/:projectId/:interviewId', requireProjectRole(['ConsultorLider']), async (req, res) => {
  await interviewService.remove(req.params.interviewId, req.user!.id);
  res.status(204).send();
});

export { interviewRouter };
