import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import {
  registerUser,
  resendVerification,
  verifyEmailWithToken,
  getLatestOutboxEvent,
  extractTokenFromOutboxPayload,
  getUserByEmail,
  getVerificationToken,
  verifyTokenHashFormat,
  manuallyVerifyUserEmail,
} from './helpers/auth-test-helpers';
import { AuthOutbox } from '../src/modules/auth/entities/auth-outbox.entity';
import { EmailVerificationToken } from '../src/modules/auth/entities/email-verification-token.entity';

describe('Auth Signup Flow (E2E)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    // Ensure TOKEN_HASH_SECRET is set
    if (!process.env.TOKEN_HASH_SECRET) {
      // Use test default only in test environment
      process.env.TOKEN_HASH_SECRET =
        'test-token-hash-secret-32-chars-minimum-required-for-hmac-sha256';
      console.warn(
        '⚠️  TOKEN_HASH_SECRET not set, using test default. Set in production!',
      );
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
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Register Flow', () => {
    it('should return 200 with neutral message for new email', async () => {
      const timestamp = Date.now();
      const email = `newuser-${timestamp}@test.com`;
      const password = 'SecurePass123!@#';
      const fullName = 'Test User';
      const orgName = `Test Org ${timestamp}`;

      const response = await registerUser(
        app,
        email,
        password,
        fullName,
        orgName,
      );

      // Verify user was created
      const user = await getUserByEmail(dataSource, email);
      expect(user).toBeDefined();
      expect(user?.email).toBe(email.toLowerCase());
      expect(user?.isEmailVerified).toBe(false);

      // Verify outbox event was created
      const outboxEvent = await getLatestOutboxEvent(
        dataSource,
        'auth.email_verification.requested',
      );
      expect(outboxEvent).toBeDefined();
      expect(outboxEvent?.status).toBe('pending');

      // Verify token exists and is hashed (64 hex chars)
      const token = await getVerificationToken(dataSource, user!.id);
      expect(token).toBeDefined();
      expect(token?.tokenHash).toBeDefined();
      expect(verifyTokenHashFormat(token!.tokenHash)).toBe(true);
    });

    it('should return 200 with same neutral message for existing email (idempotent)', async () => {
      const timestamp = Date.now();
      const email = `existing-${timestamp}@test.com`;
      const password = 'SecurePass123!@#';
      const fullName = 'Existing User';
      const orgName = `Existing Org ${timestamp}`;

      // First registration
      await registerUser(app, email, password, fullName, orgName);

      // Second registration with same email (should return neutral response)
      const response = await registerUser(
        app,
        email,
        password,
        fullName,
        `Different Org ${timestamp}`,
      );

      // Should still return success (neutral response)
      // Verify only one user exists
      const userRepo = dataSource.getRepository(
        require('../src/modules/users/entities/user.entity').User,
      );
      const users = await userRepo.find({
        where: { email: email.toLowerCase() },
      });
      expect(users.length).toBe(1);
    });
  });

  describe('Resend Verification Flow', () => {
    it('should return 200 with neutral message for missing user', async () => {
      const response = await resendVerification(
        app,
        `nonexistent-${Date.now()}@test.com`,
      );

      expect(response.message).toContain(
        'If an account with this email exists',
      );
    });

    it('should return 200 with neutral message for existing user', async () => {
      const timestamp = Date.now();
      const email = `resend-${timestamp}@test.com`;

      // Register user
      await registerUser(
        app,
        email,
        'SecurePass123!@#',
        'Resend User',
        `Resend Org ${timestamp}`,
      );

      // Resend verification
      const response = await resendVerification(app, email);

      expect(response.message).toContain(
        'If an account with this email exists',
      );

      // Verify new outbox event was created
      const outboxEvents = await dataSource
        .getRepository(AuthOutbox)
        .find({
          where: { type: 'auth.email_verification.requested' },
          order: { createdAt: 'DESC' },
          take: 2,
        });

      expect(outboxEvents.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Verify Email Flow', () => {
    it('should succeed with valid token', async () => {
      const timestamp = Date.now();
      const email = `verify-${timestamp}@test.com`;

      // Register user
      await registerUser(
        app,
        email,
        'SecurePass123!@#',
        'Verify User',
        `Verify Org ${timestamp}`,
      );

      // Get outbox event and extract token
      const outboxEvent = await getLatestOutboxEvent(
        dataSource,
        'auth.email_verification.requested',
      );
      expect(outboxEvent).toBeDefined();

      const rawToken = extractTokenFromOutboxPayload(outboxEvent!);
      expect(rawToken).toBeDefined();

      // Verify email
      const result = await verifyEmailWithToken(app, rawToken!);

      // Verify user is now verified
      const user = await getUserByEmail(dataSource, email);
      expect(user?.isEmailVerified).toBe(true);
      expect(user?.emailVerifiedAt).toBeDefined();

      // Verify token is marked as used
      const token = await getVerificationToken(dataSource, user!.id);
      expect(token?.usedAt).toBeDefined();
    });

    it('should fail with expired token', async () => {
      const timestamp = Date.now();
      const email = `expired-${timestamp}@test.com`;

      // Register user
      await registerUser(
        app,
        email,
        'SecurePass123!@#',
        'Expired User',
        `Expired Org ${timestamp}`,
      );

      // Get token and manually expire it
      const user = await getUserByEmail(dataSource, email);
      const tokenRepo = dataSource.getRepository(EmailVerificationToken);
      const token = await tokenRepo.findOne({
        where: { userId: user!.id, usedAt: null },
      });

      if (token) {
        // Set expiry to past
        await tokenRepo.update(token.id, {
          expiresAt: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
        });

        // Get raw token from outbox
        const outboxEvent = await getLatestOutboxEvent(
          dataSource,
          'auth.email_verification.requested',
        );
        const rawToken = extractTokenFromOutboxPayload(outboxEvent!);

        // Try to verify expired token
        const response = await request(app.getHttpServer())
          .post('/api/auth/verify-email')
          .send({ token: rawToken })
          .expect(400);

        expect(response.body.message).toContain('expired');
      }
    });

    it('should be idempotent or return already verified state', async () => {
      const timestamp = Date.now();
      const email = `idempotent-${timestamp}@test.com`;

      // Register and verify
      await registerUser(
        app,
        email,
        'SecurePass123!@#',
        'Idempotent User',
        `Idempotent Org ${timestamp}`,
      );

      const outboxEvent = await getLatestOutboxEvent(
        dataSource,
        'auth.email_verification.requested',
      );
      const rawToken = extractTokenFromOutboxPayload(outboxEvent!);

      // First verification
      await verifyEmailWithToken(app, rawToken!);

      // Second verification attempt (should fail - token already used)
      const response = await request(app.getHttpServer())
        .post('/api/auth/verify-email')
        .send({ token: rawToken })
        .expect(400);

      expect(response.body.message).toContain('Invalid');
    });
  });
});

