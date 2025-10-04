import express from 'express';
import request from 'supertest';

import reportRouter from '../../../modules/export/report.router.js';
import { HttpError } from '../../../core/errors/http-error.js';
import { generateProjectReportPdf } from '../../../modules/export/report.service.js';
import { logger } from '../../../core/config/logger.js';

jest.mock('../../../modules/export/report.service.js', () => ({
  generateProjectReportPdf: jest.fn()
}));

jest.mock('../../../core/config/logger.js', () => ({
  logger: {
    error: jest.fn()
  }
}));

const generateProjectReportPdfMock =
  generateProjectReportPdf as jest.MockedFunction<
    typeof generateProjectReportPdf
  >;
const loggerErrorMock = logger.error as jest.Mock;

describe('reportRouter - project PDF export', () => {
  const app = express();
  app.use(reportRouter);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the HttpError status when report generation fails gracefully', async () => {
    generateProjectReportPdfMock.mockRejectedValueOnce(
      new HttpError(404, 'Reporte no encontrado')
    );

    const response = await request(app).get('/projects/demo/pdf');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Reporte no encontrado' });
    expect(loggerErrorMock).not.toHaveBeenCalled();
  });

  it('returns status 500 when report generation throws unexpectedly', async () => {
    const unexpectedError = new Error('boom');
    generateProjectReportPdfMock.mockRejectedValueOnce(unexpectedError);

    const response = await request(app).get('/projects/demo/pdf');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'No se pudo generar el PDF' });
    expect(loggerErrorMock).toHaveBeenCalledWith(
      { err: unexpectedError, projectId: 'demo' },
      'Unexpected error generating project report PDF'
    );
  });
});
