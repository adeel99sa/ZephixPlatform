import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../app.module';

jest.setTimeout(30000);

describe('Auth Integration Tests', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  describe('Signup', () => {
    it('should create a new user', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/signup')
        .send({
          email: 'test@example.com',
          password: 'SecurePass123!@#',
          firstName: 'Test',
          lastName: 'User',
          organizationName: 'Test Org',
        })
        .expect(201);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user.email).toBe('test@example.com');
    });

    it('should reject weak passwords', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/signup')
        .send({
          email: 'weak@example.com',
          password: 'weak',
          firstName: 'Test',
          lastName: 'User',
          organizationName: 'Test Org',
        })
        .expect(400);
    });
  });

  describe('Login', () => {
    it('should login with valid credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'SecurePass123!@#',
        })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.headers['set-cookie']).toBeDefined();
    });

    it('should reject invalid credentials', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword',
        })
        .expect(401);
    });

    it('should lock account after 5 failed attempts', async () => {
      for (let i = 0; i < 6; i++) {
        await request(app.getHttpServer())
          .post('/api/auth/login')
          .send({
            email: 'test@example.com',
            password: 'wrongpassword',
          });
      }

      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'SecurePass123!@#',
        })
        .expect(403);

      expect(response.body.message).toContain('locked');
    });
  });
});
