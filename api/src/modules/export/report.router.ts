import { Router } from 'express';

import { getHttpErrorPayload } from '../../core/errors/http-error';
import { logger } from '../../core/config/logger';

import { generateProjectReportPdf } from './report.service';

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
    const payload = getHttpErrorPayload(error);
    if (payload) {
      return res.status(payload.status).json({ error: payload.message });
    }

    logger.error(
      { err: error, projectId: req.params.id },
      'Unexpected error generating project report PDF'
    );

    return res.status(500).json({ error: 'No se pudo generar el PDF' });
  }
});

export default router;
