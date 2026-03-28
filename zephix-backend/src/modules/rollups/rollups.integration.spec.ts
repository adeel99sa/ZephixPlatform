import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../app.module';
import { DataSource } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

/**
 * Phase 6 Module 4: Rollups Integration Tests
 *
 * Tests workspace scoping and 404 behavior for:
 * - GET /api/workspaces/:workspaceId/programs/:programId/rollup
 * - GET /api/workspaces/:workspaceId/portfolios/:portfolioId/rollup
 */
jest.setTimeout(30000);

describe('Rollups Integration Tests (Phase 6 Module 4)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let jwtService: JwtService;
  let configService: ConfigService;

  // Test data IDs
  let orgId: string;
  let adminUserId: string;
  let memberUserId: string;
  let workspaceAId: string;
  let workspaceBId: string;
  let portfolioAId: string;
  let portfolioBId: string;
  let programAId: string;
  let programBId: string;
  let projectA1Id: string;
  let projectA2Id: string;
  let projectB1Id: string;
  let workItemA1Id: string;
  let workItemB1Id: string;

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
  function generateToken(userId: string, organizationId: string, role: string) {
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
    // Create organization (slug is NOT NULL)
    const orgResult = await dataSource.query(
      `INSERT INTO organizations (id, name, slug, created_at, updated_at)
       VALUES (gen_random_uuid(), 'Test Org ' || gen_random_uuid()::text, 'test-org-' || gen_random_uuid()::text, NOW(), NOW())
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

    // Link users to organization
    await dataSource.query(
      `INSERT INTO user_organizations (id, user_id, organization_id, role, created_at, updated_at)
       VALUES
       (gen_random_uuid(), $1, $2, 'admin', NOW(), NOW()),
       (gen_random_uuid(), $3, $2, 'member', NOW(), NOW())`,
      [adminUserId, orgId, memberUserId],
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
      `INSERT INTO projects (id, name, workspace_id, organization_id, program_id, status, health, created_at, updated_at)
       VALUES (gen_random_uuid(), 'Project A1', $1, $2, $3, 'active', 'HEALTHY', NOW(), NOW())
       RETURNING id`,
      [workspaceAId, orgId, programAId],
    );
    projectA1Id = projectA1Result[0].id;

    const projectA2Result = await dataSource.query(
      `INSERT INTO projects (id, name, workspace_id, organization_id, program_id, status, health, created_at, updated_at)
       VALUES (gen_random_uuid(), 'Project A2', $1, $2, $3, 'active', 'AT_RISK', NOW(), NOW())
       RETURNING id`,
      [workspaceAId, orgId, programAId],
    );
    projectA2Id = projectA2Result[0].id;

    // Create project in workspace B
    const projectB1Result = await dataSource.query(
      `INSERT INTO projects (id, name, workspace_id, organization_id, program_id, status, health, created_at, updated_at)
       VALUES (gen_random_uuid(), 'Project B1', $1, $2, $3, 'active', 'HEALTHY', NOW(), NOW())
       RETURNING id`,
      [workspaceBId, orgId, programBId],
    );
    projectB1Id = projectB1Result[0].id;

    // Create work items with due dates
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1); // Yesterday (overdue)

    const workItemA1Result = await dataSource.query(
      `INSERT INTO work_items (id, title, organization_id, workspace_id, project_id, status, due_date, created_by, created_at, updated_at)
       VALUES (gen_random_uuid(), 'Work Item A1', $1, $2, $3, 'todo', $4, $5, NOW(), NOW())
       RETURNING id`,
      [orgId, workspaceAId, projectA1Id, pastDate, memberUserId],
    );
    workItemA1Id = workItemA1Result[0].id;

    const workItemB1Result = await dataSource.query(
      `INSERT INTO work_items (id, title, organization_id, workspace_id, project_id, status, due_date, created_by, created_at, updated_at)
       VALUES (gen_random_uuid(), 'Work Item B1', $1, $2, $3, 'todo', $4, $5, NOW(), NOW())
       RETURNING id`,
      [orgId, workspaceBId, projectB1Id, pastDate, adminUserId],
    );
    workItemB1Id = workItemB1Result[0].id;
  }

  /**
   * Helper: Cleanup test data
   */
  async function cleanupTestData() {
    if (!orgId) return;

    await dataSource.query(`DELETE FROM work_items WHERE organization_id = $1`, [orgId]);
    await dataSource.query(`DELETE FROM projects WHERE organization_id = $1`, [orgId]);
    await dataSource.query(`DELETE FROM programs WHERE organization_id = $1`, [orgId]);
    await dataSource.query(`DELETE FROM portfolios WHERE organization_id = $1`, [orgId]);
    await dataSource.query(`DELETE FROM workspace_members WHERE workspace_id IN ($1, $2)`, [workspaceAId, workspaceBId]);
    await dataSource.query(`DELETE FROM workspaces WHERE organization_id = $1`, [orgId]);
    await dataSource.query(`DELETE FROM user_organizations WHERE organization_id = $1`, [orgId]);
    await dataSource.query(`DELETE FROM users WHERE id IN ($1, $2)`, [adminUserId, memberUserId]);
    await dataSource.query(`DELETE FROM organizations WHERE id = $1`, [orgId]);
  }

  describe('Program Rollup', () => {
    it('Test 1: Member with access to workspace A only - call program rollup in workspace A, gets 200', async () => {
      const token = generateToken(memberUserId, orgId, 'member');

      const response = await request(app.getHttpServer())
        .get(`/api/workspaces/${workspaceAId}/programs/${programAId}/rollup`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('version', 1);
      expect(response.body.data).toHaveProperty('program');
      expect(response.body.data.program.id).toBe(programAId);
      expect(response.body.data).toHaveProperty('totals');
      expect(response.body.data).toHaveProperty('health');
      expect(response.body.data).toHaveProperty('projects');
    });

    it('Test 2: Member with access to workspace A only - call program rollup in workspace B, gets 404', async () => {
      const token = generateToken(memberUserId, orgId, 'member');

      await request(app.getHttpServer())
        .get(`/api/workspaces/${workspaceBId}/programs/${programBId}/rollup`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });

    it('Test 3: Program rollup counts are workspace scoped - work items in workspace B do not affect workspace A rollup', async () => {
      const token = generateToken(adminUserId, orgId, 'admin');

      // Get rollup for workspace A
      const responseA = await request(app.getHttpServer())
        .get(`/api/workspaces/${workspaceAId}/programs/${programAId}/rollup`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Verify workspace A has work items
      expect(responseA.body.data.totals.workItemsOpen).toBeGreaterThan(0);

      // Get rollup for workspace B
      const responseB = await request(app.getHttpServer())
        .get(`/api/workspaces/${workspaceBId}/programs/${programBId}/rollup`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Verify workspace B has its own work items
      expect(responseB.body.data.totals.workItemsOpen).toBeGreaterThan(0);

      // Verify they are different (workspace scoped)
      expect(responseA.body.data.totals.workItemsOpen).not.toBe(
        responseB.body.data.totals.workItemsOpen,
      );
    });

    it('Test 4: Non existent programId in workspace A returns 404', async () => {
      const token = generateToken(adminUserId, orgId, 'admin');
      const fakeProgramId = '00000000-0000-0000-0000-000000000000';

      await request(app.getHttpServer())
        .get(`/api/workspaces/${workspaceAId}/programs/${fakeProgramId}/rollup`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });
  });

  describe('Portfolio Rollup', () => {
    it('Test 5: Member with access to workspace A only - portfolio rollup in workspace B, gets 404', async () => {
      const token = generateToken(memberUserId, orgId, 'member');

      await request(app.getHttpServer())
        .get(`/api/workspaces/${workspaceBId}/portfolios/${portfolioBId}/rollup`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });

    it('Test 6: Admin - portfolio rollup returns totals that match created fixtures', async () => {
      const token = generateToken(adminUserId, orgId, 'admin');

      const response = await request(app.getHttpServer())
        .get(`/api/workspaces/${workspaceAId}/portfolios/${portfolioAId}/rollup`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('version', 1);
      expect(response.body.data).toHaveProperty('portfolio');
      expect(response.body.data.portfolio.id).toBe(portfolioAId);
      expect(response.body.data).toHaveProperty('totals');
      expect(response.body.data.totals.programsTotal).toBeGreaterThanOrEqual(1);
      expect(response.body.data.totals.projectsTotal).toBeGreaterThanOrEqual(2); // We created 2 projects
      expect(response.body.data).toHaveProperty('health');
      expect(response.body.data).toHaveProperty('programs');
      expect(response.body.data).toHaveProperty('projectsDirect');
    });

    it('Test 7: Non existent portfolioId in workspace A returns 404', async () => {
      const token = generateToken(adminUserId, orgId, 'admin');
      const fakePortfolioId = '00000000-0000-0000-0000-000000000000';

      await request(app.getHttpServer())
        .get(`/api/workspaces/${workspaceAId}/portfolios/${fakePortfolioId}/rollup`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });
  });
});
