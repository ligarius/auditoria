import { prisma } from '../../core/config/db.js';
import { HttpError } from '../../core/errors/http-error.js';
import { logger } from '../../core/config/logger.js';
import { renderExecutiveReport } from './templates/executive-report.js';

export const reportService = {
  async generateExecutivePdf(projectId: string) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        company: { select: { name: true } },
        owner: { select: { name: true } },
        kpis: { orderBy: { date: 'desc' }, take: 5 },
        findings: { orderBy: { targetDate: 'asc' }, take: 8 },
      },
    });

    if (!project) {
      throw new HttpError(404, 'Proyecto no encontrado');
    }

    const openFindings = project.findings.filter((finding) => {
      const status = (finding.status ?? '').toLowerCase();
      return !['closed', 'cerrado', 'implemented', 'implementado'].includes(status);
    });

    const template = renderExecutiveReport({
      projectName: project.name,
      companyName: project.company.name,
      ownerName: project.owner?.name ?? null,
      workflowState: project.status,
      generatedAt: new Date(),
      kpis: project.kpis.map((kpi) => ({
        name: kpi.name,
        value: kpi.value,
        unit: kpi.unit,
        date: kpi.date,
      })),
      findings: openFindings.slice(0, 5).map((finding) => ({
        title: finding.title,
        impact: finding.impact,
        recommendation: finding.recommendation,
        status: finding.status,
        targetDate: finding.targetDate,
      })),
    });

    try {
      const puppeteer = await import('puppeteer');
      const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      const page = await browser.newPage();
      await page.setContent(template, { waitUntil: 'networkidle0' });
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
      });
      await browser.close();
      return pdf;
    } catch (error) {
      logger.error({ err: error, projectId }, 'No se pudo generar el PDF ejecutivo');
      throw new HttpError(500, 'No se pudo generar el reporte PDF');
    }
  },
};
