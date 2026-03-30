import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import {
  registerUser,
  resendVerification,
  getUserByEmail,
  getLatestOutboxEvent,
  extractTokenFromOutboxPayload,
} from './helpers/auth-test-helpers';
import { AuthOutbox } from '../src/modules/auth/entities/auth-outbox.entity';
import { EmailVerificationService } from '../src/modules/auth/services/email-verification.service';

describe('Auth Phase 1 - Registration and Org Boundary Hardening (E2E)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let emailVerificationService: EmailVerificationService;

  beforeAll(async () => {
    // Ensure TOKEN_HASH_SECRET is set
    if (!process.env.TOKEN_HASH_SECRET) {
      process.env.TOKEN_HASH_SECRET =
        'test-token-hash-secret-32-chars-minimum-required-for-hmac-sha256';
    }

    // Disable demo bootstrap
    process.env.DEMO_BOOTSTRAP = 'false';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    app.setGlobalPrefix('api');
    await app.init();

    dataSource = app.get(DataSource);
    emailVerificationService = app.get(EmailVerificationService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Registration API Contract', () => {
    it('should register a new user without organization (200)', async () => {
      const timestamp = Date.now();
      const email = `new-${timestamp}@test.com`;

      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email,
          password: 'SecurePass123!@#',
          fullName: 'Test User',
        })
        .expect(200);

      expect(response.body.data?.message || response.body.message).toContain(
        'If an account with this email exists',
      );

      const user = await getUserByEmail(dataSource, email);
      expect(user).toBeDefined();
      expect(user?.email).toBe(email.toLowerCase());
      expect(user?.isEmailVerified).toBe(false);
      expect(user?.organizationId).toBeNull();
    });

    it('should return 200 neutral for duplicate email (anti-enumeration)', async () => {
      const timestamp = Date.now();
      const email = `duplicate-email-${timestamp}@test.com`;

      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email,
          password: 'SecurePass123!@#',
          fullName: 'First User',
        })
        .expect(200);

      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email,
          password: 'SecurePass123!@#',
          fullName: 'Second User',
        })
        .expect(200);

      expect(response.body.data?.message || response.body.message).toContain(
        'If an account with this email exists',
      );

      const userRepo = dataSource.getRepository(
        require('../src/modules/users/entities/user.entity').User,
      );
      const users = await userRepo.find({
        where: { email: email.toLowerCase() },
      });
      expect(users.length).toBe(1);
    });

    it('should validate fullName length (2-200 characters)', async () => {
      const timestamp = Date.now();

      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: `short-name-${timestamp}@test.com`,
          password: 'SecurePass123!@#',
          fullName: 'A',
        })
        .expect(400);

      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: `long-name-${timestamp}@test.com`,
          password: 'SecurePass123!@#',
          fullName: 'A'.repeat(201),
        })
        .expect(400);
    });
  });

  describe('Resend Verification Endpoint', () => {
    it('should return 200 neutral for any email (no enumeration)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/resend-verification')
        .send({
          email: `nonexistent-${Date.now()}@test.com`,
        })
        .expect(200);

      expect(response.body.message).toContain(
        'If an account with this email exists',
      );
    });

    it('should create outbox event when user exists and not verified', async () => {
      const timestamp = Date.now();
      const email = `resend-${timestamp}@test.com`;

      // Register user
      await registerUser(app, email, 'SecurePass123!@#', 'Resend User');

      // Count outbox events before resend
      const outboxRepo = dataSource.getRepository(AuthOutbox);
      const beforeCount = await outboxRepo.count({
        where: { type: 'auth.email_verification.requested' },
      });

      // Resend verification
      await resendVerification(app, email);

      // Verify new outbox event was created
      const afterCount = await outboxRepo.count({
        where: { type: 'auth.email_verification.requested' },
      });
      expect(afterCount).toBeGreaterThan(beforeCount);
    });
  });

  describe('Verify Email Endpoint (GET with query param)', () => {
    it('should verify email with token query parameter', async () => {
      const timestamp = Date.now();
      const email = `verify-get-${timestamp}@test.com`;

      // Register user
      await registerUser(app, email, 'SecurePass123!@#', 'Verify User');

      // Get token from outbox
      const outboxEvent = await getLatestOutboxEvent(
        dataSource,
        'auth.email_verification.requested',
      );
      expect(outboxEvent).toBeDefined();

      const rawToken = extractTokenFromOutboxPayload(outboxEvent!);
      expect(rawToken).toBeDefined();

      // Verify email using GET with query param
      const response = await request(app.getHttpServer())
        .get(`/api/auth/verify-email?token=${rawToken}`)
        .expect(200);

      expect(response.body.message).toContain('Email verified successfully');

      // Verify user is now verified
      const user = await getUserByEmail(dataSource, email);
      expect(user?.isEmailVerified).toBe(true);
      expect(user?.emailVerifiedAt).toBeDefined();
    });

    it('should return 400 if token query param is missing', async () => {
      await request(app.getHttpServer())
        .get('/api/auth/verify-email')
        .expect(400);
    });

    it('should return 400 for invalid token', async () => {
      await request(app.getHttpServer())
        .get('/api/auth/verify-email?token=invalid-token')
        .expect(400);
    });

    it('should mark token as single-use', async () => {
      const timestamp = Date.now();
      const email = `single-use-${timestamp}@test.com`;

      // Register and verify
      await registerUser(app, email, 'SecurePass123!@#', 'Single Use User');

      const outboxEvent = await getLatestOutboxEvent(
        dataSource,
        'auth.email_verification.requested',
      );
      const rawToken = extractTokenFromOutboxPayload(outboxEvent!);

      // First verification
      await request(app.getHttpServer())
        .get(`/api/auth/verify-email?token=${rawToken}`)
        .expect(200);

      // Second verification attempt (should fail - token already used)
      await request(app.getHttpServer())
        .get(`/api/auth/verify-email?token=${rawToken}`)
        .expect(400);
    });
  });

  describe('Outbox Correctness', () => {
    it('should create outbox event on successful registration', async () => {
      const timestamp = Date.now();
      const email = `outbox-${timestamp}@test.com`;

      await registerUser(app, email, 'SecurePass123!@#', 'Outbox User');

      const user = await getUserByEmail(dataSource, email);
      const outboxEvents = await emailVerificationService.getLatestOutboxByUserId(
        user!.id,
      );

      expect(outboxEvents.length).toBeGreaterThan(0);
      expect(outboxEvents[0].type).toBe('auth.email_verification.requested');
      expect(outboxEvents[0].payloadJson.userId).toBe(user!.id);
      expect(outboxEvents[0].payloadJson.email).toBe(email.toLowerCase());
      expect(outboxEvents[0].payloadJson.token).toBeDefined();
    });

    it('should create outbox event on resend verification', async () => {
      const timestamp = Date.now();
      const email = `resend-outbox-${timestamp}@test.com`;

      await registerUser(app, email, 'SecurePass123!@#', 'Resend Outbox User');

      const user = await getUserByEmail(dataSource, email);
      const beforeCount = (
        await emailVerificationService.getLatestOutboxByUserId(user!.id)
      ).length;

      await resendVerification(app, email);

      const afterCount = (
        await emailVerificationService.getLatestOutboxByUserId(user!.id)
      ).length;
      expect(afterCount).toBeGreaterThan(beforeCount);
    });
  });
});


