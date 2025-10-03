import type { Express } from 'express';
import request from 'supertest';
import { BarcodeLabelType, SopStatus } from '@prisma/client';

import { signAccessToken } from '../../core/utils/jwt';
import { approvalService } from '../../modules/governance/approval.service';

const prismaMock = {
  membership: {
    findMany: jest.fn()
  },
  sop: {
    findUnique: jest.fn(),
    update: jest.fn()
  },
  approvalWorkflow: {
    findFirst: jest.fn()
  },
  routePlan: {
    findUnique: jest.fn()
  }
};

jest.mock('../../core/config/db', () => ({
  get prisma() {
    return prismaMock;
  }
}));

jest.mock('../../core/security/enforce-project-access', () => ({
  enforceProjectAccess: jest.fn().mockResolvedValue(undefined)
}));

jest.mock('../../core/security/enforce-scope', () => ({
  ensureScopedAccess: jest.fn().mockResolvedValue(undefined)
}));

jest.mock('../../modules/audit/audit.service', () => ({
  auditService: {
    record: jest.fn().mockResolvedValue(undefined)
  }
}));

jest.mock('../../services/queue', () => ({
  initializeQueueWorkers: jest.fn().mockResolvedValue(undefined)
}));

jest.mock('../../services/approval-sla', () => ({
  startApprovalSlaMonitor: jest.fn()
}));

jest.mock('../../modules/kpis/kpi-snapshot.job', () => ({
  startKpiSnapshotCron: jest.fn()
}));

const generateLabelsMock = jest.fn();
const getCountProjectMock = jest.fn();
const closeCountMock = jest.fn();

jest.mock('../../modules/inventory/inventory.service', () => ({
  inventoryService: {
    generateLabels: (...args: Parameters<typeof generateLabelsMock>) =>
      generateLabelsMock(...args),
    getCountProject: (...args: Parameters<typeof getCountProjectMock>) =>
      getCountProjectMock(...args),
    closeCount: (...args: Parameters<typeof closeCountMock>) =>
      closeCountMock(...args)
  }
}));

const buildExcelMock = jest.fn();

jest.mock('../../modules/routes/routes-export.service', () => ({
  routeExportService: {
    buildExcel: (...args: Parameters<typeof buildExcelMock>) =>
      buildExcelMock(...args)
  }
}));

describe('Critical endpoints smoke tests', () => {
  let app: Express;
  const accessToken = signAccessToken({
    sub: 'user-1',
    email: 'user@example.com',
    role: 'consultor'
  });

  beforeAll(async () => {
    ({ app } = await import('../../server'));
  });

  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock.membership.findMany.mockResolvedValue([
      { projectId: 'project-123', role: 'ConsultorLider' }
    ]);
  });

  it('publishes a SOP and enqueues approval workflow when none exists', async () => {
    const draftSop = {
      id: 'sop-123',
      status: SopStatus.draft,
      process: { id: 'process-1', projectId: 'project-123' }
    };

    const publishedSop = {
      ...draftSop,
      status: SopStatus.published,
      steps: [],
      title: 'SOP Seguridad'
    };

    prismaMock.sop.findUnique
      .mockResolvedValueOnce(draftSop)
      .mockResolvedValueOnce({ ...publishedSop, process: draftSop.process });
    prismaMock.sop.update.mockResolvedValue(publishedSop);
    prismaMock.approvalWorkflow.findFirst.mockResolvedValue(null);

    const approvalSpy = jest
      .spyOn(approvalService, 'create')
      .mockResolvedValueOnce(
        {} as unknown as Awaited<ReturnType<typeof approvalService.create>>
      );

    const response = await request(app)
      .post('/api/sops/sop-123/publish')
      .set('Authorization', `Bearer ${accessToken}`)
      .send();

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('published');
    expect(prismaMock.sop.update).toHaveBeenCalledWith({
      where: { id: 'sop-123' },
      data: { status: SopStatus.published },
      include: { process: true }
    });
    expect(approvalSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: 'project-123',
        resourceId: 'sop-123',
        resourceType: 'SOP'
      }),
      'user-1'
    );
  });

  it('generates barcode labels as PDF', async () => {
    const pdfBuffer = Buffer.from('label-pdf');
    generateLabelsMock.mockResolvedValue({ buffer: pdfBuffer });

    const response = await request(app)
      .post('/api/inventory/labels/project-123/generate')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ type: BarcodeLabelType.SKU, ids: ['sku-1'] });

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('application/pdf');
    expect(generateLabelsMock).toHaveBeenCalledWith(
      'project-123',
      BarcodeLabelType.SKU,
      ['sku-1']
    );
  });

  it('closes an inventory count and returns its detail', async () => {
    getCountProjectMock.mockResolvedValue('project-123');
    closeCountMock.mockResolvedValue({ id: 'count-1', status: 'closed' });

    const response = await request(app)
      .post('/api/inventory/counts/count-1/close')
      .query({ projectId: 'project-123' })
      .set('Authorization', `Bearer ${accessToken}`)
      .send();

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ id: 'count-1', status: 'closed' });
    expect(getCountProjectMock).toHaveBeenCalledWith('count-1');
    expect(closeCountMock).toHaveBeenCalledWith('count-1');
  });

  it('exports routes plan as Excel workbook', async () => {
    prismaMock.routePlan.findUnique.mockResolvedValue({
      id: 'plan-9',
      projectId: 'project-123'
    });
    buildExcelMock.mockResolvedValue({
      buffer: Buffer.from('excel-data'),
      filename: 'plan.xlsx',
      projectId: 'project-123'
    });

    const response = await request(app)
      .get('/api/routes/export/excel')
      .query({ planId: 'plan-9' })
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    expect(buildExcelMock).toHaveBeenCalledWith('plan-9');
  });
});
