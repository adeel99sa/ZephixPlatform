import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';

/**
 * E2E tests for work management task stats endpoint.
 *
 * Unified endpoint: GET /work/tasks/stats/completion
 * - Uses x-workspace-id header for workspace scope
 * - Optional ?projectId query param for project scope
 *
 * Verifies:
 * 1. 403 WORKSPACE_REQUIRED without header
 * 2. 200 with stats for workspace-level (no projectId)
 * 3. 200 with stats for project-level (?projectId=...)
 * 4. CANCELED tasks are NOT counted as completed
 * 5. Deleted tasks are excluded from stats
 * 6. Ratio is rounded to 4 decimals
 */
describe('WorkManagement Stats E2E', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let authToken: string;
  let testWorkspaceId: string;
  let testProjectId: string;
  let testOrganizationId: string;
  let testUserId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    dataSource = app.get(DataSource);

    // Setup test data
    // 1. Create test organization
    const orgResult = await dataSource.query(`
      INSERT INTO organizations (id, name, slug, created_at, updated_at)
      VALUES (gen_random_uuid(), 'Stats Test Org', 'stats-test-org-${Date.now()}', NOW(), NOW())
      RETURNING id
    `);
    testOrganizationId = orgResult[0].id;

    // 2. Create test user
    const userResult = await dataSource.query(`
      INSERT INTO users (id, email, password_hash, platform_role, organization_id, created_at, updated_at)
      VALUES (gen_random_uuid(), 'stats-test-${Date.now()}@test.com', 'hashedpassword', 'ADMIN', $1, NOW(), NOW())
      RETURNING id
    `, [testOrganizationId]);
    testUserId = userResult[0].id;

    // 3. Create test workspace
    const wsResult = await dataSource.query(`
      INSERT INTO workspaces (id, organization_id, name, description, created_at, updated_at)
      VALUES (gen_random_uuid(), $1, 'Stats Test Workspace', 'Test workspace for stats', NOW(), NOW())
      RETURNING id
    `, [testOrganizationId]);
    testWorkspaceId = wsResult[0].id;

    // 4. Add user to workspace as ADMIN
    await dataSource.query(`
      INSERT INTO workspace_members (id, workspace_id, user_id, role, created_at, updated_at)
      VALUES (gen_random_uuid(), $1, $2, 'ADMIN', NOW(), NOW())
    `, [testWorkspaceId, testUserId]);

    // 5. Create test project
    const projResult = await dataSource.query(`
      INSERT INTO projects (id, organization_id, workspace_id, name, status, created_at, updated_at)
      VALUES (gen_random_uuid(), $1, $2, 'Stats Test Project', 'ACTIVE', NOW(), NOW())
      RETURNING id
    `, [testOrganizationId, testWorkspaceId]);
    testProjectId = projResult[0].id;

    // 6. Create test tasks with different statuses
    // 3 TODO, 2 IN_PROGRESS, 4 DONE, 1 CANCELED, 1 DELETED
    // Total non-deleted: 10, Completed (DONE only): 4
    for (let i = 0; i < 3; i++) {
      await dataSource.query(`
        INSERT INTO work_tasks (id, organization_id, workspace_id, project_id, title, status, type, priority, reporter_user_id, created_at, updated_at)
        VALUES (gen_random_uuid(), $1, $2, $3, $4, 'TODO', 'TASK', 'MEDIUM', $5, NOW(), NOW())
      `, [testOrganizationId, testWorkspaceId, testProjectId, `Todo Task ${i + 1}`, testUserId]);
    }
    for (let i = 0; i < 2; i++) {
      await dataSource.query(`
        INSERT INTO work_tasks (id, organization_id, workspace_id, project_id, title, status, type, priority, reporter_user_id, created_at, updated_at)
        VALUES (gen_random_uuid(), $1, $2, $3, $4, 'IN_PROGRESS', 'TASK', 'MEDIUM', $5, NOW(), NOW())
      `, [testOrganizationId, testWorkspaceId, testProjectId, `InProgress Task ${i + 1}`, testUserId]);
    }
    for (let i = 0; i < 4; i++) {
      await dataSource.query(`
        INSERT INTO work_tasks (id, organization_id, workspace_id, project_id, title, status, type, priority, reporter_user_id, created_at, updated_at)
        VALUES (gen_random_uuid(), $1, $2, $3, $4, 'DONE', 'TASK', 'MEDIUM', $5, NOW(), NOW())
      `, [testOrganizationId, testWorkspaceId, testProjectId, `Done Task ${i + 1}`, testUserId]);
    }
    // 1 CANCELED task - should NOT count as completed
    await dataSource.query(`
      INSERT INTO work_tasks (id, organization_id, workspace_id, project_id, title, status, type, priority, reporter_user_id, created_at, updated_at)
      VALUES (gen_random_uuid(), $1, $2, $3, 'Canceled Task', 'CANCELED', 'TASK', 'MEDIUM', $4, NOW(), NOW())
    `, [testOrganizationId, testWorkspaceId, testProjectId, testUserId]);
    // 1 DELETED task - should NOT be counted at all
    await dataSource.query(`
      INSERT INTO work_tasks (id, organization_id, workspace_id, project_id, title, status, type, priority, reporter_user_id, deleted_at, deleted_by_user_id, created_at, updated_at)
      VALUES (gen_random_uuid(), $1, $2, $3, 'Deleted Task', 'DONE', 'TASK', 'MEDIUM', $4, NOW(), $4, NOW(), NOW())
    `, [testOrganizationId, testWorkspaceId, testProjectId, testUserId]);

    // 7. Get auth token for test user
    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: `stats-test-${Date.now()}@test.com`,
        password: 'testpassword123',
      });

    if (loginRes.status !== 200) {
      const jwt = require('jsonwebtoken');
      authToken = jwt.sign(
        {
          sub: testUserId,
          organizationId: testOrganizationId,
          platformRole: 'ADMIN',
          email: `stats-test@test.com`,
        },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' },
      );
    } else {
      authToken = loginRes.body.data?.accessToken || loginRes.body.accessToken;
    }
  });

  afterAll(async () => {
    if (dataSource) {
      try {
        await dataSource.query(`DELETE FROM work_tasks WHERE workspace_id = $1`, [testWorkspaceId]);
        await dataSource.query(`DELETE FROM projects WHERE workspace_id = $1`, [testWorkspaceId]);
        await dataSource.query(`DELETE FROM workspace_members WHERE workspace_id = $1`, [testWorkspaceId]);
        await dataSource.query(`DELETE FROM workspaces WHERE id = $1`, [testWorkspaceId]);
        await dataSource.query(`DELETE FROM users WHERE id = $1`, [testUserId]);
        await dataSource.query(`DELETE FROM organizations WHERE id = $1`, [testOrganizationId]);
      } catch (e) {
        console.log('Cleanup error (may be expected):', e.message);
      }
    }
    await app?.close();
  });

  describe('GET /work/tasks/stats/completion', () => {
    it('should return 403 WORKSPACE_REQUIRED without x-workspace-id header', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/work/tasks/stats/completion')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('WORKSPACE_REQUIRED');
    });

    it('should return 200 with workspace-level stats (no projectId)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/work/tasks/stats/completion')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-workspace-id', testWorkspaceId);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      // 10 total (3 TODO + 2 IN_PROGRESS + 4 DONE + 1 CANCELED), deleted excluded
      expect(res.body.data.total).toBe(10);
      // 4 completed (DONE only, CANCELED not counted)
      expect(res.body.data.completed).toBe(4);
      // Ratio: 4/10 = 0.4
      expect(res.body.data.ratio).toBe(0.4);
    });

    it('should return 200 with project-level stats when projectId provided', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/work/tasks/stats/completion?projectId=${testProjectId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-workspace-id', testWorkspaceId);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.total).toBe(10);
      expect(res.body.data.completed).toBe(4);
      expect(res.body.data.ratio).toBe(0.4);
    });

    it('should exclude CANCELED tasks from completed count', async () => {
      // Already verified above: 4 DONE + 1 CANCELED = only 4 completed
      const res = await request(app.getHttpServer())
        .get('/api/work/tasks/stats/completion')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-workspace-id', testWorkspaceId);

      expect(res.status).toBe(200);
      // CANCELED is counted in total but NOT in completed
      expect(res.body.data.total).toBe(10);
      expect(res.body.data.completed).toBe(4);
    });

    it('should exclude deleted tasks from stats entirely', async () => {
      // We have 1 deleted DONE task - it should not be in total or completed
      // Without the deleted task: total would be 11, completed would be 5
      // With deleted excluded: total is 10, completed is 4
      const res = await request(app.getHttpServer())
        .get('/api/work/tasks/stats/completion')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-workspace-id', testWorkspaceId);

      expect(res.status).toBe(200);
      expect(res.body.data.total).toBe(10);
      expect(res.body.data.completed).toBe(4);
    });

    it('should return ratio 0 when total is 0', async () => {
      // Create an empty project
      const emptyProjResult = await dataSource.query(`
        INSERT INTO projects (id, organization_id, workspace_id, name, status, created_at, updated_at)
        VALUES (gen_random_uuid(), $1, $2, 'Empty Project', 'ACTIVE', NOW(), NOW())
        RETURNING id
      `, [testOrganizationId, testWorkspaceId]);
      const emptyProjectId = emptyProjResult[0].id;

      const res = await request(app.getHttpServer())
        .get(`/api/work/tasks/stats/completion?projectId=${emptyProjectId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-workspace-id', testWorkspaceId);

      expect(res.status).toBe(200);
      expect(res.body.data.total).toBe(0);
      expect(res.body.data.completed).toBe(0);
      expect(res.body.data.ratio).toBe(0);

      // Cleanup
      await dataSource.query(`DELETE FROM projects WHERE id = $1`, [emptyProjectId]);
    });
  });
});
