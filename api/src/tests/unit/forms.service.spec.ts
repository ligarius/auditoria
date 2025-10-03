import { formsService } from '../../modules/forms/forms.service.js';
import { HttpError } from '../../core/errors/http-error.js';

const mockSurveyLinkFindUnique = jest.fn();
const mockTransaction = jest.fn();

jest.mock('../../core/config/db', () => {
  const mockPrisma = {
    project: { findFirst: jest.fn(), findUnique: jest.fn() },
    membership: { findUnique: jest.fn(), findMany: jest.fn() },
    questionnaireTemplate: { findUnique: jest.fn(), create: jest.fn() },
    questionnaireVersion: {
      findUnique: jest.fn(),
      aggregate: jest.fn(),
      create: jest.fn(),
      update: jest.fn()
    },
    surveyLink: {
      findUnique: (...args: unknown[]) => mockSurveyLinkFindUnique(...args),
      create: jest.fn(),
      update: jest.fn()
    },
    respondent: {
      findFirst: jest.fn(),
      update: jest.fn(),
      create: jest.fn()
    },
    questionnaireResponse: {
      create: jest.fn()
    },
    $transaction: (callback: (tx: any) => Promise<unknown> | unknown) => {
      const tx = {
        respondent: {
          findFirst: jest.fn(),
          update: jest.fn(),
          create: jest.fn()
        },
        questionnaireResponse: {
          create: jest.fn().mockResolvedValue({
            id: 'response-1',
            scoreTotal: 8,
            submittedAt: new Date().toISOString()
          })
        },
        surveyLink: {
          update: jest.fn().mockResolvedValue({})
        }
      };
      mockTransaction(tx);
      return Promise.resolve(callback(tx));
    }
  } satisfies Record<string, unknown>;

  return { prisma: mockPrisma };
});

describe('formsService.getFormByToken', () => {
  afterEach(() => {
    mockSurveyLinkFindUnique.mockReset();
    mockTransaction.mockReset();
  });

  it('throws a 404 when the link does not exist', async () => {
    mockSurveyLinkFindUnique.mockResolvedValue(null);
    await expect(formsService.getFormByToken('missing')).rejects.toThrow(
      HttpError
    );
  });

  it('throws a 410 when the link is expired', async () => {
    mockSurveyLinkFindUnique.mockResolvedValue({
      token: 'expired',
      projectId: 'project-1',
      versionId: 'version-1',
      expiresAt: new Date(Date.now() - 1000),
      maxResponses: null,
      usedCount: 0,
      version: {
        formJson: {},
        template: { id: 'tpl', name: 'Demo', type: 'SURVEY' }
      },
      project: { id: 'project-1' }
    });

    await expect(formsService.getFormByToken('expired')).rejects.toThrow(
      HttpError
    );
  });

  it('returns minimal metadata when the link is valid', async () => {
    mockSurveyLinkFindUnique.mockResolvedValue({
      token: 'valid',
      projectId: 'project-1',
      versionId: 'version-1',
      expiresAt: null,
      maxResponses: null,
      usedCount: 0,
      version: {
        formJson: { display: 'form' },
        template: { id: 'tpl', name: 'Demo', type: 'SURVEY' }
      },
      project: { id: 'project-1' }
    });

    await expect(formsService.getFormByToken('valid')).resolves.toMatchObject({
      token: 'valid',
      template: { name: 'Demo', type: 'SURVEY' }
    });
  });
});
