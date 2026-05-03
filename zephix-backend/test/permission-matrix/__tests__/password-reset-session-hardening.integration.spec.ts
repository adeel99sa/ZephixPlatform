/**
 * DATABASE_URL: Engine 1 PR #3 — password reset almost-E2E + session hardening (Gate 2).
 *
 * Option D: HTTP forgot-password / reset-password; raw token captured at EmailService
 * boundary (SendGrid not exercised). RateLimiterGuard overridden — limits tested elsewhere.
 *
 * Suite A: SENDGRID_API_KEY unset at bootstrap → POST /auth/forgot-password returns 503.
 * Suite B: dummy SENDGRID_API_KEY so EmailService configures; spy skips outbound send.
 */
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import request from 'supertest';
import bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

import { AppModule } from '../../../src/app.module';
import { EmailService } from '../../../src/shared/services/email.service';
import { TokenHashUtil } from '../../../src/common/security/token-hash.util';
import { ErrorCode } from '../../../src/shared/errors/error-codes';
import { RateLimiterGuard } from '../../../src/common/guards/rate-limiter.guard';

const describeDb = process.env.DATABASE_URL ? describe : describe.skip;

async function cleanupPwdResetScope(
  dataSource: DataSource,
  userId: string,
  orgId: string,
): Promise<void> {
  await dataSource.query(`DELETE FROM password_reset_tokens WHERE user_id = $1`, [
    userId,
  ]);
  await dataSource.query(`DELETE FROM auth_sessions WHERE user_id = $1`, [userId]);
  await dataSource.query(
    `DELETE FROM user_organizations WHERE user_id = $1 OR organization_id = $2`,
    [userId, orgId],
  );
  await dataSource.query(`DELETE FROM users WHERE id = $1`, [userId]);
  await dataSource.query(`DELETE FROM organizations WHERE id = $1`, [orgId]);
}

describeDb(
  'Password reset — POST /auth/forgot-password 503 when SendGrid unset (DATABASE_URL)',
  () => {
    jest.setTimeout(120000);

    let app: INestApplication;
    let dataSource: DataSource;
    let savedSendgridKey: string | undefined;
    let email: string;
    let slug: string;
    let orgId: string;
    let userId: string;
    let uoId: string;

    beforeAll(async () => {
      orgId = randomUUID();
      userId = randomUUID();
      uoId = randomUUID();

      savedSendgridKey = process.env.SENDGRID_API_KEY;
      delete process.env.SENDGRID_API_KEY;

      slug = `pwd-sg-off-${Date.now()}`;
      email = `pwd-sg-off-${Date.now()}@test.dev`;

      const moduleRef = await Test.createTestingModule({
        imports: [AppModule],
      })
        .overrideGuard(RateLimiterGuard)
        .useValue({ canActivate: () => true })
        .compile();

      app = moduleRef.createNestApplication();
      app.setGlobalPrefix('api');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      app.use(require('cookie-parser')());
      await app.init();
      dataSource = app.get(DataSource);

      await cleanupPwdResetScope(dataSource, userId, orgId);
      const passwordHash = await bcrypt.hash('SeedPass1!', 10);
      await dataSource.query(
        `INSERT INTO organizations (id, name, slug, status, plan_code, plan_status, settings, created_at, updated_at)
         VALUES ($1, $2, $3, 'trial', 'enterprise', 'active', '{}', NOW(), NOW())`,
        [orgId, 'Pwd Reset SG Off Org', slug],
      );
      await dataSource.query(
        `INSERT INTO users (
           id, email, password, role, organization_id, is_active, is_email_verified,
           failed_login_attempts, created_at, updated_at
         ) VALUES (
           $1, $2, $3, 'admin', $4, true, true,
           0, NOW(), NOW()
         )`,
        [userId, email, passwordHash, orgId],
      );
      await dataSource.query(
        `INSERT INTO user_organizations (id, user_id, organization_id, "userId", "organizationId", role, "isActive", permissions, "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $2, $3, 'owner', true, '{}', NOW(), NOW())`,
        [uoId, userId, orgId],
      );
    });

    afterAll(async () => {
      try {
        await cleanupPwdResetScope(dataSource, userId, orgId);
      } catch {
        /* ignore */
      }
      try {
        await app?.close();
      } catch {
        /* ignore */
      }
      if (savedSendgridKey === undefined) {
        delete process.env.SENDGRID_API_KEY;
      } else {
        process.env.SENDGRID_API_KEY = savedSendgridKey;
      }
    });

    it('returns 503 SERVICE_UNAVAILABLE for an existing user (no silent success)', async () => {
      const before = await dataSource.query(
        `SELECT COUNT(*)::int AS c FROM password_reset_tokens WHERE user_id = $1`,
        [userId],
      );

      await request(app.getHttpServer())
        .post('/api/auth/forgot-password')
        .send({ email })
        .expect(503)
        .expect((res) => {
          expect(res.body.code).toBe(ErrorCode.SERVICE_UNAVAILABLE);
        });

      const after = await dataSource.query(
        `SELECT COUNT(*)::int AS c FROM password_reset_tokens WHERE user_id = $1`,
        [userId],
      );
      expect(after[0].c).toBe(before[0].c);
    });
  },
);

describeDb(
  'Password reset + session hardening — integration (DATABASE_URL)',
  () => {
    jest.setTimeout(120000);

    let app: INestApplication;
    let dataSource: DataSource;
    let sendSpy: ReturnType<typeof jest.spyOn>;
    let savedSendgridForFlow: string | undefined;

    let email: string;
    let slug: string;
    let capturedToken: string | undefined;
    let orgId: string;
    let userId: string;
    let uoId: string;

    beforeAll(async () => {
      orgId = randomUUID();
      userId = randomUUID();
      uoId = randomUUID();

      /**
       * CI often injects a real SENDGRID_API_KEY; invalid keys cause sgMail 401 and bypass
       * instance-level spies if Nest resolves a different EmailService reference. Force a
       * placeholder before module bootstrap and stub at prototype level so no network I/O.
       */
      savedSendgridForFlow = process.env.SENDGRID_API_KEY;
      process.env.SENDGRID_API_KEY =
        'SG.test_placeholder_permission_matrix_no_network';

      sendSpy = jest
        .spyOn(EmailService.prototype, 'sendPasswordResetEmail')
        .mockImplementation(async (_addr: string, token: string) => {
          capturedToken = token;
        });

      slug = `pwd-int-${Date.now()}`;
      email = `pwd-int-${Date.now()}@test.dev`;

      const moduleRef = await Test.createTestingModule({
        imports: [AppModule],
      })
        .overrideGuard(RateLimiterGuard)
        .useValue({ canActivate: () => true })
        .compile();

      app = moduleRef.createNestApplication();
      app.setGlobalPrefix('api');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      app.use(require('cookie-parser')());
      await app.init();
      dataSource = app.get(DataSource);

      await cleanupPwdResetScope(dataSource, userId, orgId);
      const passwordHash = await bcrypt.hash('SeedPass1!', 10);
      await dataSource.query(
        `INSERT INTO organizations (id, name, slug, status, plan_code, plan_status, settings, created_at, updated_at)
         VALUES ($1, $2, $3, 'trial', 'enterprise', 'active', '{}', NOW(), NOW())`,
        [orgId, 'Pwd Reset Int Org', slug],
      );
      await dataSource.query(
        `INSERT INTO users (
           id, email, password, role, organization_id, is_active, is_email_verified,
           failed_login_attempts, created_at, updated_at
         ) VALUES (
           $1, $2, $3, 'admin', $4, true, true,
           0, NOW(), NOW()
         )`,
        [userId, email, passwordHash, orgId],
      );
      await dataSource.query(
        `INSERT INTO user_organizations (id, user_id, organization_id, "userId", "organizationId", role, "isActive", permissions, "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $2, $3, 'owner', true, '{}', NOW(), NOW())`,
        [uoId, userId, orgId],
      );
    });

    beforeEach(() => {
      capturedToken = undefined;
    });

    afterAll(async () => {
      sendSpy.mockRestore();
      try {
        await cleanupPwdResetScope(dataSource, userId, orgId);
      } catch {
        /* ignore */
      }
      try {
        await app?.close();
      } catch {
        /* ignore */
      }
      if (savedSendgridForFlow === undefined) {
        delete process.env.SENDGRID_API_KEY;
      } else {
        process.env.SENDGRID_API_KEY = savedSendgridForFlow;
      }
    });

    async function requestForgotPassword(): Promise<void> {
      await request(app.getHttpServer())
        .post('/api/auth/forgot-password')
        .send({ email })
        .expect(200)
        .expect((res) => {
          expect(res.body.ok).toBe(true);
        });
      expect(capturedToken).toBeDefined();
    }

    it('happy path: forgot → reset → login with new password', async () => {
      await requestForgotPassword();
      const tok = capturedToken as string;

      const rows = await dataSource.query(
        `SELECT token_hash FROM password_reset_tokens WHERE user_id = $1 AND consumed = false ORDER BY created_at DESC LIMIT 1`,
        [userId],
      );
      expect(rows.length).toBe(1);
      expect(TokenHashUtil.hashToken(tok)).toBe(rows[0].token_hash);

      await request(app.getHttpServer())
        .post('/api/auth/reset-password')
        .send({ token: tok, newPassword: 'NewPass-A1!' })
        .expect(200);

      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email, password: 'NewPass-A1!' })
        .expect(200);

      await dataSource.query(
        `UPDATE users SET password = $1 WHERE id = $2`,
        [await bcrypt.hash('SeedPass1!', 10), userId],
      );
      await dataSource.query(`DELETE FROM password_reset_tokens WHERE user_id = $1`, [
        userId,
      ]);
    });

    it('token reuse: second reset with same token returns 401', async () => {
      await requestForgotPassword();
      const tok = capturedToken as string;

      await request(app.getHttpServer())
        .post('/api/auth/reset-password')
        .send({ token: tok, newPassword: 'ReusePass-A1!' })
        .expect(200);

      await request(app.getHttpServer())
        .post('/api/auth/reset-password')
        .send({ token: tok, newPassword: 'ReusePass-B1!' })
        .expect(401);

      await dataSource.query(
        `UPDATE users SET password = $1 WHERE id = $2`,
        [await bcrypt.hash('SeedPass1!', 10), userId],
      );
      await dataSource.query(`DELETE FROM password_reset_tokens WHERE user_id = $1`, [
        userId,
      ]);
    });

    it('expired token: reset returns 401', async () => {
      await requestForgotPassword();
      const tok = capturedToken as string;

      await dataSource.query(
        `UPDATE password_reset_tokens SET expires_at = NOW() - INTERVAL '2 hours' WHERE user_id = $1 AND consumed = false`,
        [userId],
      );

      await request(app.getHttpServer())
        .post('/api/auth/reset-password')
        .send({ token: tok, newPassword: 'ExpirePass1!' })
        .expect(401);

      await dataSource.query(`DELETE FROM password_reset_tokens WHERE user_id = $1`, [
        userId,
      ]);
    });

    it('unknown email: neutral 200 and no password_reset_tokens rows added', async () => {
      const before = await dataSource.query(
        `SELECT COUNT(*)::int AS c FROM password_reset_tokens`,
      );
      const ghost = `ghost-${Date.now()}@no-account.example`;

      await request(app.getHttpServer())
        .post('/api/auth/forgot-password')
        .send({ email: ghost })
        .expect(200)
        .expect((res) => {
          expect(res.body.ok).toBe(true);
        });

      const after = await dataSource.query(
        `SELECT COUNT(*)::int AS c FROM password_reset_tokens`,
      );
      expect(after[0].c).toBe(before[0].c);
    });

    it('reset-password revokes all auth_sessions for the user', async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email, password: 'SeedPass1!' })
        .expect(200);

      const refreshToken = loginRes.body.refreshToken as string;
      const sessionId = loginRes.body.sessionId as string;
      expect(refreshToken).toBeDefined();

      await requestForgotPassword();
      const tok = capturedToken as string;

      await request(app.getHttpServer())
        .post('/api/auth/reset-password')
        .send({ token: tok, newPassword: 'RevokePass1!' })
        .expect(200);

      await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken, sessionId })
        .expect(401);

      const rows = await dataSource.query(
        `SELECT COUNT(*)::int AS c FROM auth_sessions WHERE user_id = $1 AND revoked_at IS NULL`,
        [userId],
      );
      expect(rows[0].c).toBe(0);

      await dataSource.query(
        `UPDATE users SET password = $1 WHERE id = $2`,
        [await bcrypt.hash('SeedPass1!', 10), userId],
      );
      await dataSource.query(`DELETE FROM password_reset_tokens WHERE user_id = $1`, [
        userId,
      ]);
    });

    it('change-password revokes prior refresh session', async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email, password: 'SeedPass1!' })
        .expect(200);

      const accessToken = loginRes.body.accessToken as string;
      const refreshToken = loginRes.body.refreshToken as string;
      const sessionId = loginRes.body.sessionId as string;

      const agent = request.agent(app.getHttpServer());
      const csrfRes = await agent.get('/api/auth/csrf').expect(200);
      const xsrf =
        (csrfRes.body as { csrfToken?: string; token?: string }).csrfToken ??
        (csrfRes.body as { token?: string }).token;
      expect(xsrf).toEqual(expect.any(String));

      await agent
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('X-CSRF-Token', xsrf as string)
        .send({ currentPassword: 'SeedPass1!', newPassword: 'ChangedPass1!' })
        .expect(200);

      await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken, sessionId })
        .expect(401);

      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email, password: 'ChangedPass1!' })
        .expect(200);

      await dataSource.query(
        `UPDATE users SET password = $1 WHERE id = $2`,
        [await bcrypt.hash('SeedPass1!', 10), userId],
      );
    });
  },
);
