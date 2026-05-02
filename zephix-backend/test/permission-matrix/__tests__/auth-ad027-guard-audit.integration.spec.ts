/**
 * DB-backed: verifies AD-027 @AuditGuardDecision ALLOW rows for auth + sessions
 * endpoints (Gate 2 — Engine 1 PR #1). Skipped without DATABASE_URL.
 *
 * Cross-tenant test 5: N/A for this surface (architect Gate 2 decision).
 */
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DataSource } from 'typeorm';
import request from 'supertest';
import bcrypt from 'bcrypt';

import { AppModule } from '../../../src/app.module';

const ORG_ID = 'b1111111-1111-4111-8111-111111111111';
const USER_ID = 'b2222222-2222-4222-8222-222222222222';
const SESS_A = 'b3333333-3333-4333-8333-333333333333';
const SESS_B = 'b4444444-4444-4444-8444-444444444444';
const SESS_C = 'b5555555-5555-4555-8555-555555555555';

const describeOrSkip = process.env.DATABASE_URL ? describe : describe.skip;

describeOrSkip('AD-027 auth + sessions guard-audit (DATABASE_URL)', () => {
  jest.setTimeout(120000);

  let app: INestApplication;
  let dataSource: DataSource;
  let jwtService: JwtService;
  let email: string;
  let slug: string;

  async function seedFixtures(): Promise<void> {
    await dataSource.query(`DELETE FROM audit_events WHERE organization_id = $1`, [
      ORG_ID,
    ]);
    await dataSource.query(`DELETE FROM auth_sessions WHERE user_id = $1`, [USER_ID]);
    await dataSource.query(`DELETE FROM user_organizations WHERE user_id = $1`, [USER_ID]);
    await dataSource.query(`DELETE FROM users WHERE id = $1`, [USER_ID]);
    await dataSource.query(`DELETE FROM organizations WHERE id = $1`, [ORG_ID]);

    const passwordHash = await bcrypt.hash('CurrentPass1!', 10);
    await dataSource.query(
      `INSERT INTO organizations (id, name, slug, status, plan_code, plan_status, settings, created_at, updated_at)
       VALUES ($1, $2, $3, 'trial', 'enterprise', 'active', '{}', NOW(), NOW())`,
      [ORG_ID, 'AD027 Audit Org', slug],
    );
    await dataSource.query(
      `INSERT INTO users (
         id, email, password, role, organization_id, is_active, is_email_verified,
         failed_login_attempts, created_at, updated_at
       ) VALUES (
         $1, $2, $3, 'admin', $4, true, true,
         0, NOW(), NOW()
       )`,
      [USER_ID, email, passwordHash, ORG_ID],
    );

    await dataSource.query(
      `INSERT INTO auth_sessions (
         id, organization_id, user_id, user_agent, ip_address,
         created_at, last_seen_at, revoked_at, revoke_reason,
         current_refresh_token_hash, refresh_expires_at, last_active_organization_id
       ) VALUES (
         $1, $2, $3, 'jest', '127.0.0.1',
         NOW(), NOW(), NULL, NULL,
         NULL, NULL, NULL
       )`,
      [SESS_A, ORG_ID, USER_ID],
    );
  }

  async function addSecondSession(): Promise<void> {
    await dataSource.query(
      `INSERT INTO auth_sessions (
         id, organization_id, user_id, user_agent, ip_address,
         created_at, last_seen_at, revoked_at, revoke_reason,
         current_refresh_token_hash, refresh_expires_at, last_active_organization_id
       ) VALUES (
         $1, $2, $3, 'jest', '127.0.0.1',
         NOW(), NOW() - INTERVAL '1 hour', NULL, NULL,
         NULL, NULL, NULL
       )`,
      [SESS_B, ORG_ID, USER_ID],
    );
  }

  async function addThirdSessionNewer(): Promise<void> {
    await dataSource.query(
      `INSERT INTO auth_sessions (
         id, organization_id, user_id, user_agent, ip_address,
         created_at, last_seen_at, revoked_at, revoke_reason,
         current_refresh_token_hash, refresh_expires_at, last_active_organization_id
       ) VALUES (
         $1, $2, $3, 'jest', '127.0.0.1',
         NOW(), NOW(), NULL, NULL,
         NULL, NULL, NULL
       )`,
      [SESS_C, ORG_ID, USER_ID],
    );
  }

  beforeAll(async () => {
    slug = `ad027-audit-${Date.now()}`;
    email = `ad027-audit-${Date.now()}@test.dev`;

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    app.use(require('cookie-parser')());
    await app.init();
    dataSource = app.get(DataSource);
    jwtService = app.get(JwtService);
    await seedFixtures();
  });

  afterAll(async () => {
    try {
      await dataSource?.query(`DELETE FROM audit_events WHERE organization_id = $1`, [
        ORG_ID,
      ]);
      await dataSource?.query(`DELETE FROM auth_sessions WHERE user_id = $1`, [USER_ID]);
      await dataSource?.query(`DELETE FROM user_organizations WHERE user_id = $1`, [USER_ID]);
      await dataSource?.query(`DELETE FROM users WHERE id = $1`, [USER_ID]);
      await dataSource?.query(`DELETE FROM organizations WHERE id = $1`, [ORG_ID]);
    } catch {
      /* ignore */
    }
    try {
      await app?.close();
      if (dataSource?.isInitialized) await dataSource.destroy();
    } catch {
      /* ignore */
    }
  });

  function bearer(): string {
    return jwtService.sign({
      sub: USER_ID,
      email,
      organizationId: ORG_ID,
      platformRole: 'ADMIN',
    });
  }

  it('POST /auth/change-password emits guard_allow with requiredRole authenticated', async () => {
    await dataSource.query(`DELETE FROM audit_events WHERE organization_id = $1`, [ORG_ID]);

    const agent = request.agent(app.getHttpServer());
    const csrf = await agent.get('/api/auth/csrf').expect(200);
    const xsrf = csrf.body.csrfToken ?? csrf.body.token;

    await agent
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${bearer()}`)
      .set('X-CSRF-Token', xsrf)
      .send({ currentPassword: 'CurrentPass1!', newPassword: 'NewPassw0rd!' })
      .expect(200);

    const rows = await dataSource.query<
      { action: string; metadata_json: { requiredRole?: string } }[]
    >(
      `SELECT action, metadata_json FROM audit_events
       WHERE organization_id = $1 AND entity_type = 'authorization_decision'
       ORDER BY created_at DESC LIMIT 5`,
      [ORG_ID],
    );
    expect(rows.some((r) => r.action === 'guard_allow')).toBe(true);
    const allow = rows.find((r) => r.action === 'guard_allow');
    expect(allow?.metadata_json?.requiredRole).toBe('authenticated');
  });

  it('POST /auth/sessions/:id/revoke emits guard_allow (destructive)', async () => {
    await seedFixtures();
    await addSecondSession();
    await dataSource.query(`DELETE FROM audit_events WHERE organization_id = $1`, [ORG_ID]);

    const agent = request.agent(app.getHttpServer());
    const csrf = await agent.get('/api/auth/csrf').expect(200);
    const xsrf = csrf.body.csrfToken ?? csrf.body.token;

    await agent
      .post(`/api/auth/sessions/${SESS_B}/revoke`)
      .set('Authorization', `Bearer ${bearer()}`)
      .set('X-CSRF-Token', xsrf)
      .send({})
      .expect(200);

    const rows = await dataSource.query<{ action: string }[]>(
      `SELECT action FROM audit_events WHERE organization_id = $1 ORDER BY created_at DESC LIMIT 8`,
      [ORG_ID],
    );
    expect(rows.some((r) => r.action === 'guard_allow')).toBe(true);
  });

  it('POST /auth/sessions/revoke-others emits guard_allow (destructive)', async () => {
    await seedFixtures();
    await addSecondSession();
    await addThirdSessionNewer();
    await dataSource.query(`DELETE FROM audit_events WHERE organization_id = $1`, [ORG_ID]);

    const agent = request.agent(app.getHttpServer());
    const csrf = await agent.get('/api/auth/csrf').expect(200);
    const xsrf = csrf.body.csrfToken ?? csrf.body.token;

    await agent
      .post('/api/auth/sessions/revoke-others')
      .set('Authorization', `Bearer ${bearer()}`)
      .set('X-CSRF-Token', xsrf)
      .send({ currentSessionId: SESS_C })
      .expect(200);

    const rows = await dataSource.query<{ action: string }[]>(
      `SELECT action FROM audit_events WHERE organization_id = $1 ORDER BY created_at DESC LIMIT 8`,
      [ORG_ID],
    );
    expect(rows.some((r) => r.action === 'guard_allow')).toBe(true);
  });
});
