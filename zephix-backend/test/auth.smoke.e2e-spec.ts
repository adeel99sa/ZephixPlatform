import * as request from 'supertest';

const base = process.env.E2E_BASE_URL!;
const email = process.env.E2E_EMAIL ?? 'adeel99sa@yahoo.com';
const password = process.env.E2E_PASSWORD ?? 'ReAdY4wK73967#!@';

describe('Auth smoke', () => {
  it('login + guarded probe', async () => {
    const login = await request(base)
      .post('/api/auth/login')
      .send({ email, password })
      .expect(201);
    const token = login.body?.data?.accessToken ?? login.body?.accessToken;
    expect(token).toBeTruthy();

    await request(base)
      .get('/api/auth-debug')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });
});
