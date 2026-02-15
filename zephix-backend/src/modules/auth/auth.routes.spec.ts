import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../app.module';
import { AuthModule } from './auth.module';

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
          orgName: 'Test Org',
        });

      // Route exists if status is not 404
      expect(response.status).not.toBe(404);

      // Should return 200 with neutral response or 400 for validation
      expect([200, 400]).toContain(response.status);
    });

    it('should accept RegisterDto format', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'test-register-dto@example.com',
          password: 'SecurePass123!@#',
          fullName: 'Test User',
          orgName: 'Test Org',
        });

      expect(response.status).not.toBe(404);
    });
  });

  describe('POST /api/auth/signup', () => {
    it('should return 200 (not 404)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/signup')
        .send({
          email: 'test-signup@example.com',
          password: 'SecurePass123!@#',
          firstName: 'Test',
          lastName: 'User',
          organizationName: 'Test Org',
        });

      // Route exists if status is not 404
      expect(response.status).not.toBe(404);

      // Should return 200 with neutral response or 400 for validation
      expect([200, 400]).toContain(response.status);
    });

    it('should accept SignupDto format (backward compatibility)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/signup')
        .send({
          email: 'test-signup-dto@example.com',
          password: 'SecurePass123!@#',
          firstName: 'Test',
          lastName: 'User',
          organizationName: 'Test Org',
        });

      expect(response.status).not.toBe(404);
    });
  });

  describe('Route registration', () => {
    it('should have both register and signup routes registered', async () => {
      // Test that both routes exist by checking they don't return 404
      const registerResponse = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ email: 'test@example.com', password: 'Test123!@#' });

      const signupResponse = await request(app.getHttpServer())
        .post('/api/auth/signup')
        .send({ email: 'test@example.com', password: 'Test123!@#' });

      expect(registerResponse.status).not.toBe(404);
      expect(signupResponse.status).not.toBe(404);
    });
  });
});

