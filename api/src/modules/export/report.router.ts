import { Router } from 'express';
import { generateProjectReportPdf } from './report.service.js';

const router = Router();

router.get('/projects/:id/pdf', async (req, res) => {
  try {
    const pdf = await generateProjectReportPdf(req.params.id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="proyecto-${req.params.id}.pdf"`);
    res.send(pdf);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
