import request from 'supertest';

import { app } from '../../server.js';
import { signAccessToken } from '../../core/utils/jwt.js';
const memberships = [
  { userId: 'admin-user', projectId: 'project-a', role: 'Admin' },
  { userId: 'consultant-user', projectId: 'project-a', role: 'ConsultorLider' }
];

const projects = [
  { id: 'project-a', settings: { enabledFeatures: ['reception', 'picking'] } },
  { id: 'project-b', settings: null }
];

const prismaMock = {
  membership: {
    findMany: jest.fn(({ where }) =>
      Promise.resolve(memberships.filter((item) => item.userId === where?.userId))
    ),
    findUnique: jest.fn(({ where }) => {
      const { userId_projectId } = where;
      const membership = memberships.find(
        (item) => item.userId === userId_projectId.userId && item.projectId === userId_projectId.projectId
      );
      return Promise.resolve(membership ?? null);
    }),
    upsert: jest.fn()
  },
  project: {
    findUnique: jest.fn(({ where, select }) => {
      const project = projects.find((item) => item.id === where.id);
      if (!project) return Promise.resolve(null);
      if (select?.settings) {
        return Promise.resolve({ settings: project.settings });
      }
      return Promise.resolve({
        ...project,
        company: { id: 'company-1', name: 'Nutrial' },
        memberships: []
      });
    }),
    findMany: jest.fn(() => Promise.resolve(projects))
  },
  user: {
    findUnique: jest.fn(() => Promise.resolve(null))
  }
};

jest.mock('../../core/config/db.js', () => ({ prisma: prismaMock }));

describe('GET /api/projects/:id/features', () => {
  const adminToken = signAccessToken({ sub: 'admin-user', email: 'admin@test.com', role: 'admin' });
  const consultantToken = signAccessToken({ sub: 'consultant-user', email: 'consultor@test.com', role: 'consultor' });
  const outsiderToken = signAccessToken({ sub: 'outsider', email: 'outsider@test.com', role: 'consultor' });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns enabled features for an admin without requiring membership', async () => {
    const response = await request(app)
      .get('/api/projects/project-a/features')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ enabled: ['reception', 'picking'] });
    expect(prismaMock.project.findUnique).toHaveBeenCalledWith({ where: { id: 'project-a' }, select: { settings: true } });
  });

  it('returns enabled features for a consultant with membership', async () => {
    const response = await request(app)
      .get('/api/projects/project-b/features')
      .set('Authorization', `Bearer ${consultantToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ enabled: [] });
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
