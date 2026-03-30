import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
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
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  describe('POST /api/auth/register (self-serve)', () => {
    it('returns 200 with neutral message for valid RegisterDto', async () => {
      const ts = Date.now();
      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: `integration-${ts}@example.com`,
          password: 'SecurePass123!@#',
          fullName: 'Integration User',
        })
        .expect(200);

      const msg =
        response.body?.data?.message ?? response.body?.message ?? '';
      expect(String(msg)).toContain('If an account with this email exists');
    });

    it('returns 400 for weak password', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: `weak-${Date.now()}@example.com`,
          password: 'weak',
          fullName: 'Test User',
        })
        .expect(400);
    });
  });

  describe('POST /api/auth/signup (alias)', () => {
    it('accepts same body as register', async () => {
      const ts = Date.now();
      const response = await request(app.getHttpServer())
        .post('/api/auth/signup')
        .send({
          email: `alias-${ts}@example.com`,
          password: 'SecurePass123!@#',
          fullName: 'Alias User',
        })
        .expect(200);

      const msg =
        response.body?.data?.message ?? response.body?.message ?? '';
      expect(String(msg)).toContain('If an account with this email exists');
    });
  });

  describe('POST /api/auth/login', () => {
    it('returns 401 for unknown user', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: `nouser-${Date.now()}@example.com`,
          password: 'SecurePass123!@#',
        })
        .expect(401);
    });
  });
});
