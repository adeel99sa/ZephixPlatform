import request from 'supertest';

const base = process.env.BASE_URL || 'http://localhost:3000/api';
const email = process.env.E2E_EMAIL || 'adeel99sa@yahoo.com';
const password = process.env.E2E_PASSWORD || 'ReAdY4wK73967#!@';

describe('Greenline Smoke (read-only)', () => {
  let token: string;

  it('login returns token', async () => {
    const res = await request(base.replace('/api',''))
      .post('/api/auth/login')
      .send({ email, password })
      .expect(201);
    token = res.body?.data?.accessToken || res.body?.accessToken;
    expect(token).toBeTruthy();
  });

  it('db ping ok', async () => {
    await request(base.replace('/api',''))
      .get('/api/obs/db/ping')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });

  it('kpi portfolio is 200 (real or fallback)', async () => {
    const r = await request(base.replace('/api',''))
      .get('/api/kpi/portfolio')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(r.body).toHaveProperty('success', true);
  });

  it('projects list is 200 (real or fallback)', async () => {
    const r = await request(base.replace('/api',''))
      .get('/api/projects')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(r.body).toHaveProperty('success', true);
  });
});
