import { Router } from 'express';

import { HttpError } from '../../core/errors/http-error.js';
import { logger } from '../../core/config/logger.js';

import { generateProjectReportPdf } from './report.service.js';

const router = Router();

router.get('/projects/:id/pdf', async (req, res) => {
  try {
    const pdf = await generateProjectReportPdf(req.params.id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="proyecto-${req.params.id}.pdf"`
    );
    res.send(pdf);
  } catch (error: unknown) {
    if (error instanceof HttpError) {
      return res.status(error.status).json({ error: error.message });
    }

    logger.error(
      { err: error, projectId: req.params.id },
      'Unexpected error generating project report PDF'
    );

    res.status(500).json({ error: 'No se pudo generar el PDF' });
  }
});

export default router;
