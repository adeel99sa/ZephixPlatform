import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Auth pipeline smoke', () => {
  let app: INestApplication;
  let token: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Get auth token
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'adeel99sa@yahoo.com', password: 'ReAdY4wK73967#!@' })
      .expect(201);
    
    token = res.body.data?.accessToken || res.body.accessToken;
    
    if (!token) {
      throw new Error('Failed to get authentication token');
    }
  });

  afterAll(async () => {
    await app.close();
  });

  it('kpi/portfolio is guarded and 200 with token', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/kpi/portfolio')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
  });

  it('projects is guarded and 200 with token', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/projects')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  it('kpi/portfolio returns 401 without token', async () => {
    await request(app.getHttpServer())
      .get('/api/kpi/portfolio')
      .expect(401);
  });

  it('projects returns 401 without token', async () => {
    await request(app.getHttpServer())
      .get('/api/projects')
      .expect(401);
  });

  it('health endpoint is not guarded', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/health')
      .expect(200);

    expect(response.body.status).toBe('healthy');
  });
});
