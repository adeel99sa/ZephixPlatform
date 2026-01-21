import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { loginAndGetToken, authHeader } from '../utils/e2e-auth';

describe('Auth Smoke Tests (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /api/auth/login should return accessToken', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'demo@zephix.ai',
        password: 'demo123456',
      })
      .expect(201);

    expect(response.body).toHaveProperty('data');
    expect(response.body.data).toHaveProperty('accessToken');
    expect(typeof response.body.data.accessToken).toBe('string');
    expect(response.body.data.accessToken.length).toBeGreaterThan(0);

    accessToken = response.body.data.accessToken;
  });

  it('GET /api/auth/me should return user and organization', async () => {
    if (!accessToken) {
      accessToken = await loginAndGetToken(
        app,
        'demo@zephix.ai',
        'demo123456',
      );
    }

    const response = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set(authHeader(accessToken))
      .expect(200);

    expect(response.body).toHaveProperty('data');
    const { data } = response.body;
    expect(data).toHaveProperty('id');
    expect(data).toHaveProperty('email');
    expect(data).toHaveProperty('organizationId');
    expect(typeof data.organizationId).toBe('string');
    expect(data.organizationId.length).toBeGreaterThan(0);
  });
});
