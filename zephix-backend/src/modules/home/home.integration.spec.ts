import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../app.module';
import { DataSource } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

/**
 * CLEANUP 2: Integration tests for Phase 5.3 home endpoints
 *
 * Tests:
 * 1. GET /api/home scoping - Member only sees data from accessible workspaces
 * 2. GET /api/workspaces/slug/:slug/home access behavior - 404 for non-members, 200 for members
 */
describe('Home Endpoints Integration Tests (Phase 5.3)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let jwtService: JwtService;
  let configService: ConfigService;

  // Test data IDs
  let orgId: string;
  let adminUserId: string;
  let memberUserId: string;
  let workspaceAId: string;
  let workspaceASlug: string;
  let workspaceBId: string;
  let workspaceBSlug: string;
  let projectA1Id: string;
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
  });

  afterAll(async () => {
    // Cleanup test data
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
   * Helper: Create test organization and users
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

    // Link users to organization
    await dataSource.query(
      `INSERT INTO user_organizations (id, user_id, organization_id, role, created_at, updated_at)
       VALUES
       (gen_random_uuid(), $1, $2, 'admin', NOW(), NOW()),
       (gen_random_uuid(), $3, $2, 'member', NOW(), NOW())`,
      [adminUserId, orgId, memberUserId],
    );

    // Create workspace A
    workspaceASlug = 'workspace-a';
    const workspaceAResult = await dataSource.query(
      `INSERT INTO workspaces (id, name, slug, organization_id, created_by, created_at, updated_at)
       VALUES (gen_random_uuid(), 'Workspace A', $1, $2, $3, NOW(), NOW())
       RETURNING id`,
      [workspaceASlug, orgId, adminUserId],
    );
    workspaceAId = workspaceAResult[0].id;

    // Create workspace B
    workspaceBSlug = 'workspace-b';
    const workspaceBResult = await dataSource.query(
      `INSERT INTO workspaces (id, name, slug, organization_id, created_by, created_at, updated_at)
       VALUES (gen_random_uuid(), 'Workspace B', $1, $2, $3, NOW(), NOW())
       RETURNING id`,
      [workspaceBSlug, orgId, adminUserId],
    );
    workspaceBId = workspaceBResult[0].id;

    // Add member to workspace A only
    await dataSource.query(
      `INSERT INTO workspace_members (id, workspace_id, user_id, role, status, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, 'workspace_member', 'active', NOW(), NOW())`,
      [workspaceAId, memberUserId],
    );

    // Create project in workspace A (member is delivery owner to match service query logic)
    const projectA1Result = await dataSource.query(
      `INSERT INTO projects (id, name, workspace_id, organization_id, delivery_owner_user_id, status, created_at, updated_at)
       VALUES (gen_random_uuid(), 'Project A1', $1, $2, $3, 'active', NOW(), NOW())
       RETURNING id`,
      [workspaceAId, orgId, memberUserId],
    );
    projectA1Id = projectA1Result[0].id;

    // Create project in workspace B (member is delivery owner, but has no workspace access)
    const projectB1Result = await dataSource.query(
      `INSERT INTO projects (id, name, workspace_id, organization_id, delivery_owner_user_id, status, created_at, updated_at)
       VALUES (gen_random_uuid(), 'Project B1', $1, $2, $3, 'active', NOW(), NOW())
       RETURNING id`,
      [workspaceBId, orgId, memberUserId],
    );
    projectB1Id = projectB1Result[0].id;

    // Create work item in workspace A (assigned to member)
    const workItemA1Result = await dataSource.query(
      `INSERT INTO work_items (id, title, project_id, workspace_id, organization_id, assignee_id, created_by, status, type, created_at, updated_at, deleted_at)
       VALUES (gen_random_uuid(), 'Work Item A1', $1, $2, $3, $4, $4, 'todo', 'task', NOW(), NOW(), NULL)
       RETURNING id`,
      [projectA1Id, workspaceAId, orgId, memberUserId],
    );
    workItemA1Id = workItemA1Result[0].id;

    // Create work item in workspace B (assigned to member, but member has no access)
    const workItemB1Result = await dataSource.query(
      `INSERT INTO work_items (id, title, project_id, workspace_id, organization_id, assignee_id, created_by, status, type, created_at, updated_at, deleted_at)
       VALUES (gen_random_uuid(), 'Work Item B1', $1, $2, $3, $4, $4, 'todo', 'task', NOW(), NOW(), NULL)
       RETURNING id`,
      [projectB1Id, workspaceBId, orgId, memberUserId],
    );
    workItemB1Id = workItemB1Result[0].id;
  }

  /**
   * Helper: Cleanup test data
   */
  async function cleanupTestData() {
    if (!orgId) return;

    // Delete in reverse order of dependencies
    await dataSource.query(`DELETE FROM work_items WHERE id IN ($1, $2)`, [
      workItemA1Id,
      workItemB1Id,
    ]);
    await dataSource.query(`DELETE FROM projects WHERE id IN ($1, $2)`, [
      projectA1Id,
      projectB1Id,
    ]);
    await dataSource.query(
      `DELETE FROM workspace_members WHERE workspace_id IN ($1, $2)`,
      [workspaceAId, workspaceBId],
    );
    await dataSource.query(
      `DELETE FROM workspaces WHERE id IN ($1, $2)`,
      [workspaceAId, workspaceBId],
    );
    await dataSource.query(
      `DELETE FROM user_organizations WHERE organization_id = $1`,
      [orgId],
    );
    await dataSource.query(`DELETE FROM users WHERE id IN ($1, $2)`, [
      adminUserId,
      memberUserId,
    ]);
    await dataSource.query(`DELETE FROM organizations WHERE id = $1`, [orgId]);
  }

  describe('GET /api/home scoping', () => {
    beforeAll(async () => {
      await setupTestData();
    });

    it('should return only workspace A data for Member with access to workspace A only', async () => {
      const token = generateToken(memberUserId, orgId, 'member');

      // Set due date for work items to be "due soon" (within 7 days)
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

      // Update work item A1 to be due soon
      await dataSource.query(
        `UPDATE work_items SET due_date = $1 WHERE id = $2`,
        [sevenDaysFromNow, workItemA1Id],
      );

      // Work item B1 should NOT appear in counts (member has no access to workspace B)

      const response = await request(app.getHttpServer())
        .get('/api/home')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const data = response.body.data;

      // Verify structure
      expect(data).toHaveProperty('myWork');
      expect(data).toHaveProperty('inboxPreview');

      // CRITICAL: Verify assignedWorkItemsDueSoonCount only includes work items from accessible workspace
      // Member has work item A1 (workspace A - accessible) and B1 (workspace B - inaccessible)
      // Count should be 1 (only A1), not 2
      expect(data.myWork.assignedWorkItemsDueSoonCount).toBe(1);

      // CRITICAL: Verify myActiveProjectsCount only includes projects from accessible workspace
      // Member is delivery owner or assigned to projects in workspace A only
      // Project A1 is in workspace A (accessible), Project B1 is in workspace B (inaccessible)
      // Count should reflect only workspace A projects
      expect(data.myWork.myActiveProjectsCount).toBe(1);

      // Verify no workspace B data leaks - explicit assertion
      // If workspace B data leaked, counts would be higher
      const totalWorkItemsInOrg = await dataSource.query(
        `SELECT COUNT(*) as count FROM work_items
         WHERE assignee_id = $1 AND deleted_at IS NULL
         AND due_date <= $2`,
        [memberUserId, sevenDaysFromNow],
      );
      const totalWorkItems = parseInt(totalWorkItemsInOrg[0]?.count || '0', 10);

      // Total work items in org = 2 (A1 + B1), but member should only see 1 (A1)
      expect(totalWorkItems).toBe(2); // Verify test data has both
      expect(data.myWork.assignedWorkItemsDueSoonCount).toBe(1); // But member sees only 1

      // Verify member only has access to workspace A
      const memberWorkspaces = await dataSource.query(
        `SELECT workspace_id FROM workspace_members WHERE user_id = $1`,
        [memberUserId],
      );
      expect(memberWorkspaces.length).toBe(1);
      expect(memberWorkspaces[0].workspace_id).toBe(workspaceAId);
    });

    it('should return org-wide data for Admin', async () => {
      const token = generateToken(adminUserId, orgId, 'admin');

      const response = await request(app.getHttpServer())
        .get('/api/home')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const data = response.body.data;

      // Admin should see organization summary
      expect(data).toHaveProperty('organizationSummary');
      expect(data.organizationSummary.activeWorkspacesCount).toBeGreaterThanOrEqual(
        2,
      ); // At least workspace A and B
    });
  });

  describe('GET /api/workspaces/slug/:slug/home access behavior', () => {
    beforeAll(async () => {
      if (!orgId) {
        await setupTestData();
      }
    });

    it('should return 404 (not 403) when Member without membership calls endpoint', async () => {
      const token = generateToken(memberUserId, orgId, 'member');

      // Member has no membership to workspace B
      const response = await request(app.getHttpServer())
        .get(`/api/workspaces/slug/${workspaceBSlug}/home`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404); // Must be 404, not 403

      expect(response.body.message).toContain('not found');
    });

    it('should return 200 with workspace data when Member with membership calls endpoint', async () => {
      const token = generateToken(memberUserId, orgId, 'member');

      // Member has membership to workspace A
      const response = await request(app.getHttpServer())
        .get(`/api/workspaces/slug/${workspaceASlug}/home`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const data = response.body.data;

      // Verify workspace data structure
      expect(data).toHaveProperty('workspace');
      expect(data.workspace.id).toBe(workspaceAId);
      expect(data.workspace.name).toBe('Workspace A');
      expect(data.workspace.slug).toBe(workspaceASlug);

      expect(data).toHaveProperty('stats');
      expect(data).toHaveProperty('lists');
    });

    it('should return 404 when workspace slug does not exist', async () => {
      const token = generateToken(memberUserId, orgId, 'member');

      await request(app.getHttpServer())
        .get('/api/workspaces/slug/non-existent-slug/home')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });
  });
});
