import { Router } from 'express';
import * as puppeteer from 'puppeteer';

import { createPuppeteerLaunchOptions } from '../../core/browser/puppeteer.js';

const debugRouter = Router();

const pdfCheckHtml = `<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <title>Auditoria PDF Check</title>
    <style>
      body {
        font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif;
        margin: 3rem;
        color: #0f172a;
      }
      h1 {
        font-size: 2rem;
        margin-bottom: 0.5rem;
      }
      p {
        margin: 0;
        font-size: 1rem;
        color: #475569;
      }
    </style>
  </head>
  <body>
    <h1>Verificación de PDF</h1>
    <p>Este documento confirma que Puppeteer puede generar PDFs en este entorno.</p>
  </body>
</html>`;

debugRouter.get('/pdf-check', async (_req, res, next) => {
  let browser: puppeteer.Browser | null = null;

  try {
    browser = await puppeteer.launch(createPuppeteerLaunchOptions());
    const page = await browser.newPage();

    await page.setContent(pdfCheckHtml, { waitUntil: 'networkidle0' });
    await page.emulateMediaType('screen');

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '16mm', bottom: '18mm', left: '14mm', right: '14mm' }
    });

    await page.close();

    const browserProcess = browser.process();

    if (browserProcess?.spawnfile) {
      res.setHeader('X-Puppeteer-Executable', browserProcess.spawnfile);
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      'inline; filename="auditoria-pdf-check.pdf"'
    );

    res.status(200).send(pdf);
  } catch (error) {
    next(error);
  } finally {
    await browser?.close();
  }
});

export { debugRouter };
