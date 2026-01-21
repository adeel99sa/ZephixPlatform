// Guardrail: Prevent production DB usage
import * as dotenv from 'dotenv';
import * as path from 'path';
if (process.env.NODE_ENV === 'test') {
  dotenv.config({ path: path.resolve(__dirname, '../../../.env.test') });
}
if (!process.env.DATABASE_URL || process.env.DATABASE_URL.toLowerCase().includes('production')) {
  throw new Error('❌ ERROR: DATABASE_URL appears to be production. Use test database only.');
}
if (process.env.NODE_ENV !== 'test') {
  throw new Error(`❌ ERROR: NODE_ENV must be 'test', got: ${process.env.NODE_ENV}`);
}

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../app.module';
import { DataSource } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

/**
 * Phase 6 Closeout: Comprehensive Integration Tests
 *
 * Tests:
 * 1. Member access boundaries (404 for wrong workspace)
 * 2. Guest read-only access (403 for writes)
 * 3. Admin-only create (403 for Member)
 * 4. Linking scenarios (4a-4e)
 * 5. Rollup accuracy (5a-5b)
 */
describe('Phase 6 Closeout Integration Tests', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let jwtService: JwtService;
  let configService: ConfigService;

  // Test data IDs
  let orgId: string;
  let adminUserId: string;
  let memberUserId: string;
  let guestUserId: string;
  let workspaceAId: string;
  let workspaceBId: string;
  let portfolioAId: string;
  let portfolioBId: string;
  let programAId: string;
  let programBId: string;
  let projectA1Id: string;
  let projectA2Id: string;
  let projectStandaloneId: string;
  let projectB1Id: string;
  let workItemA1Id: string;
  let workItemA2Id: string;

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

    dataSource = moduleFixture.get<DataSource>(DataSource);
    jwtService = moduleFixture.get<JwtService>(JwtService);
    configService = moduleFixture.get<ConfigService>(ConfigService);

    await setupTestData();
  });

  afterAll(async () => {
    if (dataSource && dataSource.isInitialized) {
      await cleanupTestData();
      await app.close();
    }
  });

  /**
   * Helper: Generate JWT token for test user
   */
  function generateToken(
    userId: string,
    organizationId: string,
    role: string,
  ) {
    const secret = configService.get<string>('jwt.secret') || 'test-secret';
    return jwtService.sign(
      {
        id: userId,
        organizationId,
        role,
        platformRole: role.toUpperCase(),
      },
      { secret, expiresIn: '1h' },
    );
  }

  /**
   * Helper: Create test organization, users, workspaces, portfolios, programs, projects
   */
  async function setupTestData() {
    // Create organization
    const orgResult = await dataSource.query(
      `INSERT INTO organizations (id, name, created_at, updated_at)
       VALUES (gen_random_uuid(), 'Test Org ' || gen_random_uuid()::text, NOW(), NOW())
       RETURNING id`,
    );
    orgId = orgResult[0].id;

    // Create admin user
    const adminResult = await dataSource.query(
      `INSERT INTO users (id, email, first_name, last_name, password_hash, created_at, updated_at)
       VALUES (gen_random_uuid(), 'admin@test.com', 'Admin', 'User', 'hash', NOW(), NOW())
       RETURNING id`,
    );
    adminUserId = adminResult[0].id;

    // Create member user
    const memberResult = await dataSource.query(
      `INSERT INTO users (id, email, first_name, last_name, password_hash, created_at, updated_at)
       VALUES (gen_random_uuid(), 'member@test.com', 'Member', 'User', 'hash', NOW(), NOW())
       RETURNING id`,
    );
    memberUserId = memberResult[0].id;

    // Create guest user (VIEWER)
    const guestResult = await dataSource.query(
      `INSERT INTO users (id, email, first_name, last_name, password_hash, created_at, updated_at)
       VALUES (gen_random_uuid(), 'guest@test.com', 'Guest', 'User', 'hash', NOW(), NOW())
       RETURNING id`,
    );
    guestUserId = guestResult[0].id;

    // Link users to organization
    await dataSource.query(
      `INSERT INTO user_organizations (id, user_id, organization_id, role, created_at, updated_at)
       VALUES
       (gen_random_uuid(), $1, $2, 'admin', NOW(), NOW()),
       (gen_random_uuid(), $3, $2, 'member', NOW(), NOW()),
       (gen_random_uuid(), $4, $2, 'viewer', NOW(), NOW())`,
      [adminUserId, orgId, memberUserId, guestUserId],
    );

    // Create workspace A
    const workspaceAResult = await dataSource.query(
      `INSERT INTO workspaces (id, name, slug, organization_id, created_by, created_at, updated_at)
       VALUES (gen_random_uuid(), 'Workspace A', 'workspace-a', $1, $2, NOW(), NOW())
       RETURNING id`,
      [orgId, adminUserId],
    );
    workspaceAId = workspaceAResult[0].id;

    // Create workspace B
    const workspaceBResult = await dataSource.query(
      `INSERT INTO workspaces (id, name, slug, organization_id, created_by, created_at, updated_at)
       VALUES (gen_random_uuid(), 'Workspace B', 'workspace-b', $1, $2, NOW(), NOW())
       RETURNING id`,
      [orgId, adminUserId],
    );
    workspaceBId = workspaceBResult[0].id;

    // Add member to workspace A only
    await dataSource.query(
      `INSERT INTO workspace_members (id, workspace_id, user_id, role, status, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, 'workspace_member', 'active', NOW(), NOW())`,
      [workspaceAId, memberUserId],
    );

    // Add guest to workspace A only
    await dataSource.query(
      `INSERT INTO workspace_members (id, workspace_id, user_id, role, status, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, 'workspace_viewer', 'active', NOW(), NOW())`,
      [workspaceAId, guestUserId],
    );

    // Create portfolio in workspace A
    const portfolioAResult = await dataSource.query(
      `INSERT INTO portfolios (id, name, organization_id, workspace_id, status, created_by_id, created_at, updated_at)
       VALUES (gen_random_uuid(), 'Portfolio A', $1, $2, 'active', $3, NOW(), NOW())
       RETURNING id`,
      [orgId, workspaceAId, adminUserId],
    );
    portfolioAId = portfolioAResult[0].id;

    // Create portfolio in workspace B
    const portfolioBResult = await dataSource.query(
      `INSERT INTO portfolios (id, name, organization_id, workspace_id, status, created_by_id, created_at, updated_at)
       VALUES (gen_random_uuid(), 'Portfolio B', $1, $2, 'active', $3, NOW(), NOW())
       RETURNING id`,
      [orgId, workspaceBId, adminUserId],
    );
    portfolioBId = portfolioBResult[0].id;

    // Create program in portfolio A (workspace A)
    const programAResult = await dataSource.query(
      `INSERT INTO programs (id, name, organization_id, workspace_id, portfolio_id, status, created_by_id, created_at, updated_at)
       VALUES (gen_random_uuid(), 'Program A', $1, $2, $3, 'active', $4, NOW(), NOW())
       RETURNING id`,
      [orgId, workspaceAId, portfolioAId, adminUserId],
    );
    programAId = programAResult[0].id;

    // Create program in portfolio B (workspace B)
    const programBResult = await dataSource.query(
      `INSERT INTO programs (id, name, organization_id, workspace_id, portfolio_id, status, created_by_id, created_at, updated_at)
       VALUES (gen_random_uuid(), 'Program B', $1, $2, $3, 'active', $4, NOW(), NOW())
       RETURNING id`,
      [orgId, workspaceBId, portfolioBId, adminUserId],
    );
    programBId = programBResult[0].id;

    // Create projects in workspace A
    const projectA1Result = await dataSource.query(
      `INSERT INTO projects (id, name, workspace_id, organization_id, program_id, portfolio_id, status, health, created_at, updated_at)
       VALUES (gen_random_uuid(), 'Project A1', $1, $2, $3, $4, 'active', 'HEALTHY', NOW(), NOW())
       RETURNING id`,
      [workspaceAId, orgId, programAId, portfolioAId],
    );
    projectA1Id = projectA1Result[0].id;

    const projectA2Result = await dataSource.query(
      `INSERT INTO projects (id, name, workspace_id, organization_id, program_id, portfolio_id, status, health, created_at, updated_at)
       VALUES (gen_random_uuid(), 'Project A2', $1, $2, $3, $4, 'active', 'AT_RISK', NOW(), NOW())
       RETURNING id`,
      [workspaceAId, orgId, programAId, portfolioAId],
    );
    projectA2Id = projectA2Result[0].id;

    // Create standalone project in workspace A
    const projectStandaloneResult = await dataSource.query(
      `INSERT INTO projects (id, name, workspace_id, organization_id, status, health, created_at, updated_at)
       VALUES (gen_random_uuid(), 'Project Standalone', $1, $2, 'active', 'HEALTHY', NOW(), NOW())
       RETURNING id`,
      [workspaceAId, orgId],
    );
    projectStandaloneId = projectStandaloneResult[0].id;

    // Create project in workspace B
    const projectB1Result = await dataSource.query(
      `INSERT INTO projects (id, name, workspace_id, organization_id, program_id, portfolio_id, status, health, created_at, updated_at)
       VALUES (gen_random_uuid(), 'Project B1', $1, $2, $3, $4, 'active', 'HEALTHY', NOW(), NOW())
       RETURNING id`,
      [workspaceBId, orgId, programBId, portfolioBId],
    );
    projectB1Id = projectB1Result[0].id;

    // Create work items with due dates
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1); // Yesterday (overdue)

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7); // Next week (due soon)

    const workItemA1Result = await dataSource.query(
      `INSERT INTO work_items (id, title, organization_id, workspace_id, project_id, status, due_date, created_by, created_at, updated_at)
       VALUES (gen_random_uuid(), 'Work Item A1 Overdue', $1, $2, $3, 'todo', $4, $5, NOW(), NOW())
       RETURNING id`,
      [orgId, workspaceAId, projectA1Id, pastDate, memberUserId],
    );
    workItemA1Id = workItemA1Result[0].id;

    const workItemA2Result = await dataSource.query(
      `INSERT INTO work_items (id, title, organization_id, workspace_id, project_id, status, due_date, created_by, created_at, updated_at)
       VALUES (gen_random_uuid(), 'Work Item A2 Due Soon', $1, $2, $3, 'todo', $4, $5, NOW(), NOW())
       RETURNING id`,
      [orgId, workspaceAId, projectA2Id, futureDate, memberUserId],
    );
    workItemA2Id = workItemA2Result[0].id;
  }

  /**
   * Helper: Cleanup test data
   */
  async function cleanupTestData() {
    if (!orgId) return;

    await dataSource.query(`DELETE FROM work_items WHERE organization_id = $1`, [
      orgId,
    ]);
    await dataSource.query(`DELETE FROM projects WHERE organization_id = $1`, [
      orgId,
    ]);
    await dataSource.query(`DELETE FROM programs WHERE organization_id = $1`, [
      orgId,
    ]);
    await dataSource.query(`DELETE FROM portfolios WHERE organization_id = $1`, [
      orgId,
    ]);
    await dataSource.query(
      `DELETE FROM workspace_members WHERE workspace_id IN ($1, $2)`,
      [workspaceAId, workspaceBId],
    );
    await dataSource.query(`DELETE FROM workspaces WHERE organization_id = $1`, [
      orgId,
    ]);
    await dataSource.query(
      `DELETE FROM user_organizations WHERE organization_id = $1`,
      [orgId],
    );
    await dataSource.query(
      `DELETE FROM users WHERE id IN ($1, $2, $3)`,
      [adminUserId, memberUserId, guestUserId],
    );
    await dataSource.query(`DELETE FROM organizations WHERE id = $1`, [orgId]);
  }

  describe('Module C.1: Member access boundaries', () => {
    it('Member with access to workspace A only cannot read workspace B portfolios, programs, rollups. Expect 404', async () => {
      const token = generateToken(memberUserId, orgId, 'member');

      // Try to access workspace B portfolio
      await request(app.getHttpServer())
        .get(`/api/workspaces/${workspaceBId}/portfolios`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      // Try to access workspace B program
      await request(app.getHttpServer())
        .get(`/api/workspaces/${workspaceBId}/programs`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      // Try to access workspace B portfolio rollup
      await request(app.getHttpServer())
        .get(`/api/workspaces/${workspaceBId}/portfolios/${portfolioBId}/rollup`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      // Try to access workspace B program rollup
      await request(app.getHttpServer())
        .get(`/api/workspaces/${workspaceBId}/programs/${programBId}/rollup`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });
  });

  describe('Module C.2: Guest read-only access', () => {
    it('Guest with access to workspace A can read lists and rollups for A. Cannot write. Expect 403 Forbidden', async () => {
      const token = generateToken(guestUserId, orgId, 'viewer');

      // Guest can read portfolios list
      await request(app.getHttpServer())
        .get(`/api/workspaces/${workspaceAId}/portfolios`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Guest can read programs list
      await request(app.getHttpServer())
        .get(`/api/workspaces/${workspaceAId}/programs`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Guest can read portfolio rollup
      await request(app.getHttpServer())
        .get(`/api/workspaces/${workspaceAId}/portfolios/${portfolioAId}/rollup`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Guest can read program rollup
      await request(app.getHttpServer())
        .get(`/api/workspaces/${workspaceAId}/programs/${programAId}/rollup`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Guest cannot create portfolio
      await request(app.getHttpServer())
        .post(`/api/workspaces/${workspaceAId}/portfolios`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'New Portfolio', status: 'active' })
        .expect(403);

      // Guest cannot create program
      await request(app.getHttpServer())
        .post(`/api/workspaces/${workspaceAId}/portfolios/${portfolioAId}/programs`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'New Program', status: 'active' })
        .expect(403);

      // Guest cannot link project
      await request(app.getHttpServer())
        .patch(`/api/workspaces/${workspaceAId}/projects/${projectStandaloneId}/link`)
        .set('Authorization', `Bearer ${token}`)
        .send({ programId: programAId })
        .expect(403);
    });
  });

  describe('Module C.3: Admin-only create', () => {
    it('Admin can create portfolio and program in workspace A. Member cannot. Expect 403 Forbidden', async () => {
      const adminToken = generateToken(adminUserId, orgId, 'admin');
      const memberToken = generateToken(memberUserId, orgId, 'member');

      // Admin can create portfolio
      const portfolioResponse = await request(app.getHttpServer())
        .post(`/api/workspaces/${workspaceAId}/portfolios`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Admin Portfolio', status: 'active' })
        .expect(201);

      const newPortfolioId = portfolioResponse.body.data.id;

      // Admin can create program
      await request(app.getHttpServer())
        .post(`/api/workspaces/${workspaceAId}/portfolios/${newPortfolioId}/programs`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Admin Program', status: 'active' })
        .expect(201);

      // Member cannot create portfolio
      await request(app.getHttpServer())
        .post(`/api/workspaces/${workspaceAId}/portfolios`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ name: 'Member Portfolio', status: 'active' })
        .expect(403);

      // Member cannot create program
      await request(app.getHttpServer())
        .post(`/api/workspaces/${workspaceAId}/portfolios/${newPortfolioId}/programs`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ name: 'Member Program', status: 'active' })
        .expect(403);
    });
  });

  describe('Module C.4: Linking scenarios', () => {
    it('4a. Admin links project to program. portfolioId is auto set from program', async () => {
      const token = generateToken(adminUserId, orgId, 'admin');

      // Link standalone project to program
      const response = await request(app.getHttpServer())
        .patch(`/api/workspaces/${workspaceAId}/projects/${projectStandaloneId}/link`)
        .set('Authorization', `Bearer ${token}`)
        .send({ programId: programAId })
        .expect(200);

      // Verify portfolioId was auto-set from program
      expect(response.body.data.portfolioId).toBe(portfolioAId);
      expect(response.body.data.programId).toBe(programAId);
    });

    it('4b. Admin links project to portfolio only. programId stays null', async () => {
      const token = generateToken(adminUserId, orgId, 'admin');

      // First unlink the project
      await request(app.getHttpServer())
        .patch(`/api/workspaces/${workspaceAId}/projects/${projectStandaloneId}/link`)
        .set('Authorization', `Bearer ${token}`)
        .send({ programId: null, portfolioId: null })
        .expect(200);

      // Link to portfolio only
      const response = await request(app.getHttpServer())
        .patch(`/api/workspaces/${workspaceAId}/projects/${projectStandaloneId}/link`)
        .set('Authorization', `Bearer ${token}`)
        .send({ portfolioId: portfolioAId })
        .expect(200);

      // Verify programId is null
      expect(response.body.data.programId).toBeNull();
      expect(response.body.data.portfolioId).toBe(portfolioAId);
    });

    it('4c. Admin tries to link project to program from another workspace. Expect 404 or BadRequest, no leak', async () => {
      const token = generateToken(adminUserId, orgId, 'admin');

      // Try to link project in workspace A to program in workspace B
      await request(app.getHttpServer())
        .patch(`/api/workspaces/${workspaceAId}/projects/${projectStandaloneId}/link`)
        .set('Authorization', `Bearer ${token}`)
        .send({ programId: programBId })
        .expect(404); // Should return 404, not expose that program exists
    });

    it('4d. Admin provides programId and mismatched portfolioId. Expect 400', async () => {
      const token = generateToken(adminUserId, orgId, 'admin');

      // Try to link with mismatched program and portfolio
      await request(app.getHttpServer())
        .patch(`/api/workspaces/${workspaceAId}/projects/${projectStandaloneId}/link`)
        .set('Authorization', `Bearer ${token}`)
        .send({ programId: programAId, portfolioId: portfolioBId })
        .expect(400);
    });

    it('4e. Admin unlinks. programId and portfolioId both null', async () => {
      const token = generateToken(adminUserId, orgId, 'admin');

      // Unlink project
      const response = await request(app.getHttpServer())
        .patch(`/api/workspaces/${workspaceAId}/projects/${projectStandaloneId}/link`)
        .set('Authorization', `Bearer ${token}`)
        .send({ programId: null, portfolioId: null })
        .expect(200);

      // Verify both are null
      expect(response.body.data.programId).toBeNull();
      expect(response.body.data.portfolioId).toBeNull();
    });
  });

  describe('Module C.5: Rollup accuracy', () => {
    it('5a. Program rollup totals match seeded data', async () => {
      const token = generateToken(adminUserId, orgId, 'admin');

      const response = await request(app.getHttpServer())
        .get(`/api/workspaces/${workspaceAId}/programs/${programAId}/rollup`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const rollup = response.body.data;

      // Verify totals match seeded data
      expect(rollup.totals.projectsTotal).toBe(2); // projectA1 and projectA2
      expect(rollup.totals.projectsActive).toBe(2);
      expect(rollup.totals.projectsAtRisk).toBe(1); // projectA2 is AT_RISK
      expect(rollup.totals.workItemsOpen).toBeGreaterThanOrEqual(2); // workItemA1 and workItemA2
      expect(rollup.projects).toHaveLength(2);
    });

    it('5b. Portfolio rollup totals match seeded data', async () => {
      const token = generateToken(adminUserId, orgId, 'admin');

      const response = await request(app.getHttpServer())
        .get(`/api/workspaces/${workspaceAId}/portfolios/${portfolioAId}/rollup`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const rollup = response.body.data;

      // Verify totals match seeded data
      expect(rollup.totals.programsTotal).toBe(1); // programA
      expect(rollup.totals.projectsTotal).toBe(2); // projectA1 and projectA2
      expect(rollup.totals.projectsActive).toBe(2);
      expect(rollup.totals.projectsAtRisk).toBe(1); // projectA2 is AT_RISK
      expect(rollup.programs).toHaveLength(1);
      expect(rollup.programs[0].id).toBe(programAId);
    });
  });
});
