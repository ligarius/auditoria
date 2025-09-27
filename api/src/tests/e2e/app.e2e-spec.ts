import request from 'supertest';

import { app } from '../../server.js';

describe.skip('API e2e', () => {
  it('placeholder', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(404);
  });
});
