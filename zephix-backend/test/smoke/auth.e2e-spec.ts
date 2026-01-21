import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { loginAndGetToken, authHeader } from '../utils/e2e-auth';
import { seedWorkspaceMvp } from '../utils/e2e-seed';

describe('Auth Smoke Tests (e2e)', () => {
  let app: INestApplication;
  let seeded: Awaited<ReturnType<typeof seedWorkspaceMvp>>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();

    // Seed test data
    seeded = await seedWorkspaceMvp(app);
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /api/auth/login should return accessToken', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: seeded.email,
        password: seeded.password,
      })
      .expect(201);

    expect(response.body).toHaveProperty('data');
    expect(response.body.data).toHaveProperty('accessToken');
    expect(typeof response.body.data.accessToken).toBe('string');
    expect(response.body.data.accessToken.length).toBeGreaterThan(0);
  });

  it('GET /api/auth/me should return user and organization', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set(authHeader(seeded.token))
      .expect(200);

    expect(response.body).toHaveProperty('data');
    const { data } = response.body;
    expect(data).toHaveProperty('id');
    expect(data).toHaveProperty('email');
    expect(data).toHaveProperty('organizationId');
    expect(typeof data.organizationId).toBe('string');
    expect(data.organizationId).toBe(seeded.orgId);
    expect(data.organizationId.length).toBeGreaterThan(0);
  });
});
