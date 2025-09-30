import { Router } from 'express';
import type { EstadoProyecto as EstadoProyectoType } from '@prisma/client';
import { getWorkflow, transition } from './workflow.service.js';

const router = Router();

router.get('/:projectId', async (req, res) => {
  try {
    const data = await getWorkflow(req.params.projectId);
    res.json(data);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.post('/:projectId/transition', async (req, res) => {
  try {
    const next = req.body?.next as EstadoProyectoType;
    const data = await transition(req.params.projectId, next);
    res.json(data);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
