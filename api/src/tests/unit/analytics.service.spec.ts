import { analyticsService, bucketizePbcItems, buildRlsClause } from '../../modules/analytics/analytics.service';
import { HttpError } from '../../core/errors/http-error';

type MockedPrisma = {
  project: { findUnique: jest.Mock };
  $queryRaw: jest.Mock;
  dataRequestItem: { findMany: jest.Mock };
};

jest.mock('../../core/config/db.js', () => {
  const prisma = {
    project: { findUnique: jest.fn() },
    $queryRaw: jest.fn(),
    dataRequestItem: { findMany: jest.fn() }
  } as MockedPrisma;

  (globalThis as { __mockPrisma?: MockedPrisma }).__mockPrisma = prisma;

  return {
    prisma
  };
});

const getMockPrisma = (): MockedPrisma => {
  const prisma = (globalThis as { __mockPrisma?: MockedPrisma }).__mockPrisma;
  if (!prisma) {
    throw new Error('Mock Prisma no inicializado');
  }
  return prisma;
};

describe('analyticsService.getKpis', () => {
  beforeEach(() => {
    const prisma = getMockPrisma();
    prisma.project.findUnique.mockReset();
    prisma.$queryRaw.mockReset();
    prisma.dataRequestItem.findMany.mockReset();
  });

  it('throws when project does not belong to company', async () => {
    const prisma = getMockPrisma();
    prisma.project.findUnique.mockResolvedValue(null);
    await expect(
      analyticsService.getKpis({ companyId: 'c1', projectId: 'p1' })
    ).rejects.toBeInstanceOf(HttpError);
  });

  it('returns aggregated datasets for charts', async () => {
    const now = new Date('2024-01-10T12:00:00Z');
    jest.useFakeTimers().setSystemTime(now);
    try {
      const prisma = getMockPrisma();
      prisma.project.findUnique.mockResolvedValue({ id: 'p1', companyId: 'c1' });
      prisma.$queryRaw
        .mockResolvedValueOnce([
          { day: new Date('2024-01-01T00:00:00Z'), projectId: 'p1', pct: 80 as unknown as any }
        ])
        .mockResolvedValueOnce([{ severity: 'OPEN', projectId: 'p1', qty: BigInt(5) }]);
      prisma.dataRequestItem.findMany.mockResolvedValue([
        { dueDate: new Date('2024-01-09T00:00:00Z'), status: 'Pending' },
        { dueDate: new Date('2023-12-31T00:00:00Z'), status: 'Pending' },
        { dueDate: null, status: 'Pending' },
        { dueDate: new Date('2024-01-05T00:00:00Z'), status: 'Completed' }
      ]);

      const result = await analyticsService.getKpis({ companyId: 'c1', projectId: 'p1' });

      expect(result.progress).toEqual([
        { day: '2024-01-01T00:00:00.000Z', pct: 80 }
      ]);
      expect(result.findingsBySeverity).toEqual([{ severity: 'OPEN', qty: 5 }]);
      expect(result.pbcAging.find((bucket) => bucket.bucket === 'on_time')?.count).toBe(0);
      expect(result.pbcAging.find((bucket) => bucket.bucket === 'overdue_0_3')?.count).toBe(1);
      expect(result.pbcAging.find((bucket) => bucket.bucket === 'overdue_8_plus')?.count).toBe(1);
      expect(result.pbcAging.find((bucket) => bucket.bucket === 'no_due_date')?.count).toBe(1);
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('helper utilities', () => {
  it('sanitizes values in RLS clause', () => {
    expect(buildRlsClause("c'1", "p'1")).toBe("company_id = 'c''1' AND project_id = 'p''1'");
  });

  it('bucketizes PBC items by overdue days', () => {
    const reference = new Date('2024-05-10T00:00:00Z');
    const result = bucketizePbcItems(
      [
        { dueDate: new Date('2024-05-10T00:00:00Z'), status: 'Pending' },
        { dueDate: new Date('2024-05-08T00:00:00Z'), status: 'Pending' },
        { dueDate: new Date('2024-05-05T00:00:00Z'), status: 'Pending' },
        { dueDate: null, status: 'Pending' },
        { dueDate: new Date('2024-05-01T00:00:00Z'), status: 'Completed' }
      ],
      reference
    );

    expect(result.find((bucket) => bucket.bucket === 'on_time')?.count).toBe(1);
    expect(result.find((bucket) => bucket.bucket === 'overdue_0_3')?.count).toBe(1);
    expect(result.find((bucket) => bucket.bucket === 'overdue_4_7')?.count).toBe(1);
    expect(result.find((bucket) => bucket.bucket === 'no_due_date')?.count).toBe(1);
  });
});
