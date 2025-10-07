import type { Request, Response } from 'express';
import puppeteer, { type Browser } from 'puppeteer-core';

const CHROME_PATH =
  process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium';

export async function pdfCheck(_req: Request, res: Response) {
  let browser: Browser | undefined;
  try {
    browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage'
      ]
    });

    const page = await browser.newPage();
    await page.setContent(
      `<html><body><h1>PDF OK</h1><p>${new Date().toISOString()}</p></body></html>`,
      { waitUntil: 'networkidle0' }
    );

    const pdfArray = await page.pdf({
      printBackground: true,
      format: 'A4',
      preferCSSPageSize: true
    });
    const pdfBuffer = Buffer.from(pdfArray);

    res.status(200);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      'inline; filename="auditoria-pdf-check.pdf"'
    );
    res.setHeader('Content-Length', String(pdfBuffer.length));
    res.end(pdfBuffer);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).type('text/plain').end(`PDF error: ${message}`);
  } finally {
    await browser?.close().catch(() => {});
  }
}
