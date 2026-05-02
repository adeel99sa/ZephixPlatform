/**
 * DATABASE_URL: cross-workspace isolation for PortfolioAnalyticsController
 * (Programs/Portfolios audit 2026-05-02 — Gate 2 approved cases).
 */
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DataSource } from 'typeorm';
import request from 'supertest';
import bcrypt from 'bcrypt';

import { AppModule } from '../../../src/app.module';

const ORG_ID = 'd1111111-1111-4111-8111-111111111111';
const USER_ID = 'd2222222-2222-4222-8222-222222222222';
const WS_A = 'd3333333-3333-4333-8333-333333333333';
const WS_B = 'd4444444-4444-4444-8444-444444444444';
const PORTFOLIO_A = 'd5555555-5555-4555-8555-555555555555';
const PROJECT_B = 'd6666666-6666-4666-8666-666666666666';

const describeOrSkip = process.env.DATABASE_URL ? describe : describe.skip;

describeOrSkip(
  'Portfolio analytics workspace isolation (DATABASE_URL)',
  () => {
    jest.setTimeout(120000);

    let app: INestApplication;
    let dataSource: DataSource;
    let jwtService: JwtService;
    let email: string;
    let slug: string;

    async function cleanup(): Promise<void> {
      await dataSource.query(`DELETE FROM portfolio_projects WHERE organization_id = $1`, [
        ORG_ID,
      ]);
      await dataSource.query(`DELETE FROM projects WHERE organization_id = $1`, [ORG_ID]);
      await dataSource.query(`DELETE FROM portfolios WHERE organization_id = $1`, [ORG_ID]);
      await dataSource.query(`DELETE FROM workspace_members WHERE organization_id = $1`, [
        ORG_ID,
      ]);
      await dataSource.query(`DELETE FROM workspaces WHERE organization_id = $1`, [ORG_ID]);
      await dataSource.query(`DELETE FROM users WHERE organization_id = $1`, [ORG_ID]);
      await dataSource.query(`DELETE FROM organizations WHERE id = $1`, [ORG_ID]);
    }

    async function seedFixtures(): Promise<void> {
      await cleanup();
      const passwordHash = await bcrypt.hash('IsolatePass1!', 10);
      await dataSource.query(
        `INSERT INTO organizations (id, name, slug, status, plan_code, plan_status, settings, created_at, updated_at)
         VALUES ($1, $2, $3, 'trial', 'enterprise', 'active', '{}', NOW(), NOW())`,
        [ORG_ID, 'Portfolio Iso Org', slug],
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
        `INSERT INTO workspaces (id, organization_id, name, created_by, is_private, created_at, updated_at)
         VALUES ($1, $2, 'Workspace A', $3, false, NOW(), NOW()), ($4, $2, 'Workspace B', $3, false, NOW(), NOW())`,
        [WS_A, ORG_ID, USER_ID, WS_B],
      );

      await dataSource.query(
        `INSERT INTO workspace_members (organization_id, workspace_id, user_id, role, status, created_at, updated_at)
         VALUES ($1, $2, $3, 'workspace_owner', 'active', NOW(), NOW()),
                ($1, $4, $3, 'workspace_owner', 'active', NOW(), NOW())`,
        [ORG_ID, WS_A, USER_ID, WS_B],
      );

      await dataSource.query(
        `INSERT INTO portfolios (id, organization_id, workspace_id, name, status, created_at, updated_at)
         VALUES ($1, $2, $3, 'Portfolio A', 'active', NOW(), NOW())`,
        [PORTFOLIO_A, ORG_ID, WS_A],
      );

      await dataSource.query(
        `INSERT INTO projects (
           id, name, organization_id, workspace_id, status, priority, created_at, updated_at
         ) VALUES (
           $1, 'Project B', $2, $3, 'planning', 'medium', NOW(), NOW()
         )`,
        [PROJECT_B, ORG_ID, WS_B],
      );
    }

    function bearer(): string {
      return jwtService.sign({
        sub: USER_ID,
        email,
        organizationId: ORG_ID,
        platformRole: 'ADMIN',
      });
    }

    beforeAll(async () => {
      slug = `pf-iso-${Date.now()}`;
      email = `pf-iso-${Date.now()}@test.dev`;

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
        await cleanup();
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

    it('GET /portfolios/:id/health without x-workspace-id returns 400', async () => {
      await request(app.getHttpServer())
        .get(`/api/portfolios/${PORTFOLIO_A}/health`)
        .set('Authorization', `Bearer ${bearer()}`)
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('Workspace context required');
        });
    });

    it('GET /portfolios/:id/health with wrong workspace header returns 403 AUTH_FORBIDDEN', async () => {
      await request(app.getHttpServer())
        .get(`/api/portfolios/${PORTFOLIO_A}/health`)
        .set('Authorization', `Bearer ${bearer()}`)
        .set('x-workspace-id', WS_B)
        .expect(403)
        .expect((res) => {
          expect(res.body.code).toBe('AUTH_FORBIDDEN');
        });
    });

    it('POST attach cross-workspace project returns 403 before DB join', async () => {
      const agent = request.agent(app.getHttpServer());
      const csrf = await agent.get('/api/auth/csrf').expect(200);
      const xsrf = csrf.body.csrfToken ?? csrf.body.token;

      await agent
        .post(`/api/portfolios/${PORTFOLIO_A}/projects/${PROJECT_B}`)
        .set('Authorization', `Bearer ${bearer()}`)
        .set('X-CSRF-Token', xsrf)
        .set('x-workspace-id', WS_A)
        .expect(403)
        .expect((res) => {
          expect(res.body.code).toBe('AUTH_FORBIDDEN');
        });

      const rows = await dataSource.query(
        `SELECT 1 FROM portfolio_projects WHERE portfolio_id = $1 AND project_id = $2`,
        [PORTFOLIO_A, PROJECT_B],
      );
      expect(rows.length).toBe(0);
    });

    it('DELETE cross-workspace project returns 403', async () => {
      const agent = request.agent(app.getHttpServer());
      const csrf = await agent.get('/api/auth/csrf').expect(200);
      const xsrf = csrf.body.csrfToken ?? csrf.body.token;

      await agent
        .delete(`/api/portfolios/${PORTFOLIO_A}/projects/${PROJECT_B}`)
        .set('Authorization', `Bearer ${bearer()}`)
        .set('X-CSRF-Token', xsrf)
        .set('x-workspace-id', WS_A)
        .expect(403)
        .expect((res) => {
          expect(res.body.code).toBe('AUTH_FORBIDDEN');
        });
    });
  },
);
