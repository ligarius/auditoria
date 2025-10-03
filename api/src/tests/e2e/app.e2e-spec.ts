import type { Express } from 'express';
import request from 'supertest';

import { signAccessToken } from '../../core/utils/jwt.js';
interface MockMembership {
  userId: string;
  projectId: string;
  role: string;
}

interface MockProject {
  id: string;
  ownerId: string;
  settings: { enabledFeatures: string[] } | null;
  company: { id: string; name: string };
  owner: { id: string; name: string; email: string };
}

interface MockCompany {
  id: string;
  name: string;
  taxId: string | null;
  createdAt: Date;
  updatedAt: Date;
  projectsCount: number;
}

const seedMemberships = (): MockMembership[] => [
  { userId: 'admin-user', projectId: 'project-a', role: 'Admin' },
  { userId: 'consultant-user', projectId: 'project-a', role: 'ConsultorLider' }
];

const seedProjects = (): MockProject[] => [
  {
    id: 'project-a',
    ownerId: 'consultant-user',
    settings: { enabledFeatures: ['reception', 'picking'] },
    company: { id: 'company-1', name: 'Nutrial' },
    owner: {
      id: 'consultant-user',
      name: 'Consultor',
      email: 'consultor@test.com'
    }
  },
  {
    id: 'project-b',
    ownerId: 'consultant-user',
    settings: null,
    company: { id: 'company-1', name: 'Nutrial' },
    owner: {
      id: 'consultant-user',
      name: 'Consultor',
      email: 'consultor@test.com'
    }
  }
];

const seedCompanies = (): MockCompany[] => [
  {
    id: 'company-1',
    name: 'Nutrial',
    taxId: '76.543.210-9',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
    projectsCount: 1
  },
  {
    id: 'company-2',
    name: 'DemoCorp',
    taxId: null,
    createdAt: new Date('2024-02-01T00:00:00Z'),
    updatedAt: new Date('2024-02-01T00:00:00Z'),
    projectsCount: 0
  }
];

let memberships = seedMemberships();
let projects = seedProjects();
let companies = seedCompanies();

let app: Express;

type DelegateMock = {
  findMany: jest.Mock;
  create: jest.Mock;
  findUnique: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
};

type PrismaMock = {
  membership: {
    findMany: jest.Mock;
    findUnique: jest.Mock;
    upsert: jest.Mock;
  };
  project: {
    findUnique: jest.Mock;
    findMany: jest.Mock;
    create: jest.Mock;
  };
  company: {
    findMany: jest.Mock;
    findUnique: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  auditLog: {
    create: jest.Mock;
  };
  user: {
    findUnique: jest.Mock;
  };
  survey: {
    findMany: jest.Mock;
    create: jest.Mock;
    findFirst: jest.Mock;
  };
  surveyQuestion: {
    create: jest.Mock;
  };
  systemInventory: DelegateMock;
  processCoverage: DelegateMock;
  integration: DelegateMock;
  dataModelQuality: DelegateMock;
  securityPosture: DelegateMock;
  performance: DelegateMock;
  costLicensing: DelegateMock;
};

let prismaMock: PrismaMock;

jest.mock('../../core/config/db', () => ({
  get prisma() {
    return prismaMock;
  }
}));

prismaMock = {
  membership: {
    findMany: jest.fn(({ where }) =>
      Promise.resolve(
        memberships.filter((item) => item.userId === where?.userId)
      )
    ),
    findUnique: jest.fn(({ where }) => {
      const { userId_projectId } = where;
      const membership = memberships.find(
        (item) =>
          item.userId === userId_projectId.userId &&
          item.projectId === userId_projectId.projectId
      );
      return Promise.resolve(membership ?? null);
    }),
    upsert: jest.fn()
  },
  project: {
    findUnique: jest.fn(({ where, select, include }) => {
      const project = projects.find((item) => item.id === where.id);
      if (!project) return Promise.resolve(null);
      if (select?.settings) {
        return Promise.resolve({ settings: project.settings });
      }
      const base = {
        id: project.id,
        settings: project.settings,
        ownerId: project.ownerId,
        company: project.company,
        owner: project.owner,
        memberships: []
      };
      if (include?.memberships) {
        return Promise.resolve({ ...base, memberships: [] });
      }
      return Promise.resolve(base);
    }),
    findMany: jest.fn(() => Promise.resolve(projects)),
    create: jest.fn(({ data }) => {
      const newProject = {
        id: `project-${projects.length + 1}`,
        ownerId: data.ownerId,
        settings: data.settings,
        company: { id: data.companyId, name: 'Nueva' },
        owner: { id: data.ownerId, name: 'Owner', email: 'owner@test.com' }
      };
      projects.push(newProject as (typeof projects)[number]);
      return Promise.resolve(newProject);
    })
  },
  company: {
    findMany: jest.fn(() =>
      Promise.resolve(
        companies.map((company) => ({
          id: company.id,
          name: company.name,
          taxId: company.taxId,
          createdAt: company.createdAt,
          updatedAt: company.updatedAt,
          _count: { projects: company.projectsCount }
        }))
      )
    ),
    findUnique: jest.fn(({ where, select, include }) => {
      const company = companies.find((item) => item.id === where.id);
      if (!company) return Promise.resolve(null);
      const base = {
        id: company.id,
        name: company.name,
        taxId: company.taxId,
        createdAt: company.createdAt,
        updatedAt: company.updatedAt,
        _count: { projects: company.projectsCount }
      };
      if (select) {
        const result: Record<string, unknown> = {};
        for (const key of Object.keys(select)) {
          if (key === '_count' && select._count) {
            result._count = base._count;
          } else if (select[key as keyof typeof base]) {
            result[key] = base[key as keyof typeof base];
          }
        }
        return Promise.resolve(result);
      }
      if (include?._count) {
        return Promise.resolve(base);
      }
      return Promise.resolve(base);
    }),
    create: jest.fn(({ data }) => {
      const newCompany = {
        id: `company-${companies.length + 1}`,
        name: data.name as string,
        taxId: (data.taxId ?? null) as string | null,
        createdAt: new Date(),
        updatedAt: new Date(),
        projectsCount: 0
      };
      companies.push(newCompany);
      return Promise.resolve({
        id: newCompany.id,
        name: newCompany.name,
        taxId: newCompany.taxId,
        createdAt: newCompany.createdAt,
        updatedAt: newCompany.updatedAt,
        _count: { projects: 0 }
      });
    }),
    update: jest.fn(({ where, data }) => {
      const company = companies.find((item) => item.id === where.id);
      if (!company) return Promise.resolve(null);
      company.name = (data.name ?? company.name) as string;
      company.taxId = (data.taxId ?? company.taxId) as string | null;
      company.updatedAt = new Date();
      return Promise.resolve({
        id: company.id,
        name: company.name,
        taxId: company.taxId,
        createdAt: company.createdAt,
        updatedAt: company.updatedAt,
        _count: { projects: company.projectsCount }
      });
    }),
    delete: jest.fn(({ where }) => {
      const index = companies.findIndex((item) => item.id === where.id);
      if (index >= 0) {
        companies.splice(index, 1);
      }
      return Promise.resolve();
    })
  },
  systemInventory: {
    findMany: jest.fn(),
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  },
  processCoverage: {
    findMany: jest.fn(),
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  },
  integration: {
    findMany: jest.fn(),
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  },
  dataModelQuality: {
    findMany: jest.fn(),
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  },
  securityPosture: {
    findMany: jest.fn(),
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  },
  performance: {
    findMany: jest.fn(),
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  },
  costLicensing: {
    findMany: jest.fn(),
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  },
  survey: {
    findMany: jest.fn(() => Promise.resolve([])),
    create: jest.fn(({ data }) =>
      Promise.resolve({
        id: 'survey-created',
        projectId: data.projectId,
        title: data.title,
        description: data.description ?? null,
        isActive: data.isActive ?? true,
        createdAt: new Date(),
        updatedAt: new Date(),
        questions: []
      })
    ),
    findFirst: jest.fn(() => Promise.resolve(null))
  },
  surveyQuestion: {
    create: jest.fn(({ data }) =>
      Promise.resolve({
        id: 'question-created',
        surveyId: data.surveyId,
        type: data.type,
        text: data.text,
        scaleMin: data.scaleMin ?? null,
        scaleMax: data.scaleMax ?? null,
        required: data.required ?? true,
        createdAt: new Date(),
        updatedAt: new Date()
      })
    )
  },
  auditLog: {
    create: jest.fn()
  },
  user: {
    findUnique: jest.fn(() => Promise.resolve(null))
  }
};

beforeEach(() => {
  memberships = seedMemberships();
  projects = seedProjects();
  companies = seedCompanies();
});

afterEach(() => {
  jest.clearAllMocks();
});

beforeAll(async () => {
  ({ app } = await import('../../server.js'));
});

describe('GET /api/projects/:id/features', () => {
  const adminToken = signAccessToken({
    sub: 'admin-user',
    email: 'admin@test.com',
    role: 'admin'
  });
  const consultantToken = signAccessToken({
    sub: 'consultant-user',
    email: 'consultor@test.com',
    role: 'consultor'
  });
  const outsiderToken = signAccessToken({
    sub: 'outsider',
    email: 'outsider@test.com',
    role: 'consultor'
  });

  it('returns enabled features for an admin without requiring membership', async () => {
    const response = await request(app)
      .get('/api/projects/project-a/features')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ enabled: ['reception', 'picking'] });
    expect(prismaMock.project.findUnique).toHaveBeenCalledWith({
      where: { id: 'project-a' },
      select: { settings: true }
    });
  });

  it('returns enabled features for a consultant with membership', async () => {
    const response = await request(app)
      .get('/api/projects/project-a/features')
      .set('Authorization', `Bearer ${consultantToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ enabled: ['reception', 'picking'] });
    expect(prismaMock.membership.findUnique).toHaveBeenCalled();
  });

  it('denies access for users without membership', async () => {
    const response = await request(app)
      .get('/api/projects/project-a/features')
      .set('Authorization', `Bearer ${outsiderToken}`);

    expect(response.status).toBe(403);
    expect(response.body.title).toBe('Sin acceso al proyecto');
  });
});

describe('Companies API', () => {
  const adminToken = signAccessToken({
    sub: 'admin-user',
    email: 'admin@test.com',
    role: 'admin'
  });
  const consultantToken = signAccessToken({
    sub: 'consultant-user',
    email: 'consultor@test.com',
    role: 'consultor'
  });

  it('lists companies for admin users', async () => {
    const response = await request(app)
      .get('/api/companies')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body[0]).toHaveProperty('name');
  });

  it('prevents non-admin users from creating companies', async () => {
    const response = await request(app)
      .post('/api/companies')
      .set('Authorization', `Bearer ${consultantToken}`)
      .send({ name: 'Nueva Empresa' });

    expect(response.status).toBe(403);
  });

  it('allows admins to create companies', async () => {
    const response = await request(app)
      .post('/api/companies')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Nueva Empresa', taxId: '99.999.999-9' });

    expect(response.status).toBe(201);
    expect(response.body.name).toBe('Nueva Empresa');
    expect(response.body.taxId).toBe('99.999.999-9');
    expect(response.body._count.projects).toBe(0);
  });
});

describe('Project surveys API', () => {
  const adminToken = signAccessToken({
    sub: 'admin-user',
    email: 'admin@test.com',
    role: 'admin'
  });

  it('lista encuestas del proyecto', async () => {
    const mockSurveys = [
      {
        id: 'survey-1',
        projectId: 'project-a',
        title: 'Satisfacción',
        description: 'Encuesta de satisfacción',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        questions: []
      }
    ];
    prismaMock.survey.findMany.mockResolvedValueOnce(mockSurveys);

    const response = await request(app)
      .get('/api/projects/project-a/surveys')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'survey-1' })])
    );
    expect(prismaMock.survey.findMany).toHaveBeenCalledWith({
      where: { projectId: 'project-a' },
      orderBy: { createdAt: 'desc' },
      include: { questions: { orderBy: { createdAt: 'asc' } } }
    });
  });

  it('crea una nueva encuesta', async () => {
    prismaMock.survey.create.mockResolvedValueOnce({
      id: 'survey-new',
      projectId: 'project-a',
      title: 'Clima laboral',
      description: 'Pulso interno',
      isActive: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      questions: []
    });

    const response = await request(app)
      .post('/api/projects/project-a/surveys')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Clima laboral',
        description: 'Pulso interno',
        isActive: false
      });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ id: 'survey-new', isActive: false });
    expect(prismaMock.survey.create).toHaveBeenCalledWith({
      data: {
        projectId: 'project-a',
        title: 'Clima laboral',
        description: 'Pulso interno',
        isActive: false
      },
      include: { questions: true }
    });
  });

  it('agrega una pregunta a la encuesta', async () => {
    prismaMock.survey.findFirst.mockResolvedValueOnce({ id: 'survey-1' });
    prismaMock.surveyQuestion.create.mockResolvedValueOnce({
      id: 'question-1',
      surveyId: 'survey-1',
      type: 'Likert',
      text: 'Califique el servicio',
      scaleMin: 1,
      scaleMax: 5,
      required: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const response = await request(app)
      .post('/api/projects/project-a/surveys/survey-1/questions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        type: 'Likert',
        text: 'Califique el servicio',
        scaleMin: 1,
        scaleMax: 5,
        required: true
      });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ id: 'question-1', type: 'Likert' });
    expect(prismaMock.surveyQuestion.create).toHaveBeenCalledWith({
      data: {
        surveyId: 'survey-1',
        type: 'Likert',
        text: 'Califique el servicio',
        scaleMin: 1,
        scaleMax: 5,
        required: true
      }
    });
  });

  it('devuelve el resumen de respuestas', async () => {
    prismaMock.survey.findFirst.mockResolvedValueOnce({
      id: 'survey-1',
      title: 'Feedback',
      description: null,
      isActive: true,
      questions: [
        {
          id: 'q1',
          surveyId: 'survey-1',
          type: 'Likert',
          text: 'Satisfacción',
          scaleMin: 1,
          scaleMax: 5,
          required: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ],
      responses: [
        {
          id: 'r1',
          surveyId: 'survey-1',
          submittedAt: new Date(),
          createdAt: new Date(),
          answers: [
            {
              id: 'a1',
              responseId: 'r1',
              questionId: 'q1',
              value: 4,
              createdAt: new Date()
            }
          ]
        },
        {
          id: 'r2',
          surveyId: 'survey-1',
          submittedAt: new Date(),
          createdAt: new Date(),
          answers: [
            {
              id: 'a2',
              responseId: 'r2',
              questionId: 'q1',
              value: 5,
              createdAt: new Date()
            }
          ]
        }
      ]
    });

    const response = await request(app)
      .get('/api/projects/project-a/surveys/survey-1/summary')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.summaries[0]).toMatchObject({
      responses: 2,
      average: 4.5
    });
    expect(prismaMock.survey.findFirst).toHaveBeenCalledWith({
      where: { id: 'survey-1', projectId: 'project-a' },
      include: {
        questions: { orderBy: { createdAt: 'asc' } },
        responses: { include: { answers: true } }
      }
    });
  });
});
