import request from 'supertest';
import type { Express } from 'express';
import express from 'express';

describe('server CORS configuration', () => {
  let app: Express;

  beforeAll(async () => {
    const serverModule = await import('../../server');
    app = serverModule.configureApp(express());
  });

  it('responds with the configured CORS headers for auth preflight requests', async () => {
    const origin = process.env.FRONTEND_ORIGIN ?? 'http://localhost:8080';

    const response = await request(app)
      .options('/api/auth/login')
      .set('Origin', origin)
      .set('Access-Control-Request-Method', 'POST');

    expect(response.status).toBe(204);
    expect(response.headers['access-control-allow-origin']).toBe(origin);
    expect(response.headers['access-control-allow-credentials']).toBe('true');
  });
});
