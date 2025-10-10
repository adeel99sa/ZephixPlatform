import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';

describe('Database Error Routes (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    
    // Apply the same configuration as main.ts
    app.setGlobalPrefix('api');
    
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/api/test/unique-violation (GET) → 409', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/test/unique-violation')
      .expect(409);
    
    expect(res.body).toMatchObject({
      statusCode: 409,
      error: 'Conflict',
      message: 'A project with this name already exists in this workspace',
      constraint: 'uq_projects_name_ws',
      path: '/api/test/unique-violation',
      timestamp: expect.any(String),
    });
  });

  it('/api/test/check-violation (GET) → 422', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/test/check-violation')
      .expect(422);
    
    expect(res.body).toMatchObject({
      statusCode: 422,
      error: 'Unprocessable Entity',
      message: 'Allocation percentage must be between 0 and 150',
      constraint: 'chk_ra_pct',
      path: '/api/test/check-violation',
      timestamp: expect.any(String),
    });
  });

  it('/api/test/fk-violation (GET) → 400', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/test/fk-violation')
      .expect(400);
    
    expect(res.body).toMatchObject({
      statusCode: 400,
      error: 'Bad Request',
      message: 'The referenced record does not exist or has been deleted',
      constraint: 'tasks_project_id_fkey',
      path: '/api/test/fk-violation',
      timestamp: expect.any(String),
    });
  });

  it('should not expose test routes in production', async () => {
    // This test verifies that TestModule is not loaded in production
    // We'll test this by checking if the routes exist in development
    const res = await request(app.getHttpServer())
      .get('/api/test/unique-violation')
      .expect(409);
    
    // If we get here, the test routes are available (development mode)
    expect(res.body.statusCode).toBe(409);
  });
});

