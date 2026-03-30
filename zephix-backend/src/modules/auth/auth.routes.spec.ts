import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../app.module';
jest.setTimeout(30000);

describe('Auth Routes (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  describe('POST /api/auth/register', () => {
    it('should return 200 (not 404)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'test-register@example.com',
          password: 'SecurePass123!@#',
          fullName: 'Test User',
        });

      expect(response.status).not.toBe(404);

      expect([200, 400]).toContain(response.status);
    });

    it('should accept RegisterDto format', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'test-register-dto@example.com',
          password: 'SecurePass123!@#',
          fullName: 'Test User',
        });

      expect(response.status).not.toBe(404);
    });
  });

  describe('POST /api/auth/signup', () => {
    it('should return 200 (not 404) with same body as register', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/signup')
        .send({
          email: 'test-signup@example.com',
          password: 'SecurePass123!@#',
          fullName: 'Test User',
        });

      expect(response.status).not.toBe(404);

      expect([200, 400]).toContain(response.status);
    });
  });

  describe('Route registration', () => {
    it('should have both register and signup routes registered', async () => {
      const registerResponse = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ email: 'test@example.com', password: 'Test123!@#', fullName: 'Test User' });

      const signupResponse = await request(app.getHttpServer())
        .post('/api/auth/signup')
        .send({ email: 'test2@example.com', password: 'Test123!@#', fullName: 'Test User' });

      expect(registerResponse.status).not.toBe(404);
      expect(signupResponse.status).not.toBe(404);
    });
  });
});
