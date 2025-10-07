import path from 'path';
import { randomUUID } from 'crypto';

import { Router } from 'express';
import multer from 'multer';

import { authenticate } from '../../core/middleware/auth';

import { fileService } from './file.service';

const upload = multer({
  dest: path.join(process.cwd(), 'tmp'),
  storage: multer.diskStorage({
    destination: path.join(process.cwd(), 'tmp'),
    filename: (_req, file, cb) =>
      cb(null, `${randomUUID()}-${file.originalname}`)
  })
});

const fileRouter = Router();

fileRouter.use(authenticate);

fileRouter.get('/:projectId', async (req, res) => {
  const { projectId } = req.params;
  const files = await fileService.list(projectId);
  res.json(files);
});

fileRouter.post('/:projectId', upload.single('file'), async (req, res) => {
  const { projectId } = req.params;
  const userId = req.user!.id;
  if (!req.file) {
    return res.status(400).json({ message: 'Archivo requerido' });
  }
  const file = await fileService.save(projectId, req.file, userId);
  res.status(201).json(file);
});

export { fileRouter };
