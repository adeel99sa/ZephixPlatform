import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';

describe('Auth + Guarded smoke', () => {
  let app: INestApplication;
  beforeAll(async () => {
    // bootstrap your e2e app here (project-specific)
    // app = await bootstrapTestApp();
  });
  afterAll(async () => { await app?.close(); });

  it('logs in and hits a guarded route', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'adeel99sa@yahoo.com', password: 'ReAdY4wK73967#!@' })
      .expect(201);

    const token = res.body?.data?.accessToken || res.body?.accessToken;
    expect(token).toBeTruthy();

    await request(app.getHttpServer())
      .get('/api/projects')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });
});