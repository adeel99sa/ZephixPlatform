import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';

/**
 * E2E tests for task restore functionality.
 *
 * Verifies:
 * 1. Admin can delete a task → task appears in deleted list (includeDeleted=true)
 * 2. Admin can restore a task → task disappears from deleted, appears in active
 * 3. Viewer cannot see restore UI (403 on restore endpoint)
 * 4. 404 TASK_NOT_FOUND if task doesn't exist
 * 5. 400 TASK_NOT_DELETED if task is already active
 */
describe('WorkManagement Task Restore E2E', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let adminToken: string;
  let viewerToken: string;
  let testWorkspaceId: string;
  let testProjectId: string;
  let testOrganizationId: string;
  let adminUserId: string;
  let viewerUserId: string;
  let testTaskId: string;

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
      VALUES (gen_random_uuid(), 'Restore Test Org', 'restore-test-org-${Date.now()}', NOW(), NOW())
      RETURNING id
    `);
    testOrganizationId = orgResult[0].id;

    // 2. Create admin user
    const adminResult = await dataSource.query(`
      INSERT INTO users (id, email, password_hash, platform_role, organization_id, created_at, updated_at)
      VALUES (gen_random_uuid(), 'restore-admin-${Date.now()}@test.com', 'hashedpassword', 'ADMIN', $1, NOW(), NOW())
      RETURNING id
    `, [testOrganizationId]);
    adminUserId = adminResult[0].id;

    // 3. Create viewer user
    const viewerResult = await dataSource.query(`
      INSERT INTO users (id, email, password_hash, platform_role, organization_id, created_at, updated_at)
      VALUES (gen_random_uuid(), 'restore-viewer-${Date.now()}@test.com', 'hashedpassword', 'VIEWER', $1, NOW(), NOW())
      RETURNING id
    `, [testOrganizationId]);
    viewerUserId = viewerResult[0].id;

    // 4. Create test workspace
    const wsResult = await dataSource.query(`
      INSERT INTO workspaces (id, organization_id, name, description, created_at, updated_at)
      VALUES (gen_random_uuid(), $1, 'Restore Test Workspace', 'Test workspace for restore', NOW(), NOW())
      RETURNING id
    `, [testOrganizationId]);
    testWorkspaceId = wsResult[0].id;

    // 5. Add admin to workspace as ADMIN
    await dataSource.query(`
      INSERT INTO workspace_members (id, workspace_id, user_id, role, created_at, updated_at)
      VALUES (gen_random_uuid(), $1, $2, 'ADMIN', NOW(), NOW())
    `, [testWorkspaceId, adminUserId]);

    // 6. Add viewer to workspace as VIEWER
    await dataSource.query(`
      INSERT INTO workspace_members (id, workspace_id, user_id, role, created_at, updated_at)
      VALUES (gen_random_uuid(), $1, $2, 'VIEWER', NOW(), NOW())
    `, [testWorkspaceId, viewerUserId]);

    // 7. Create test project
    const projResult = await dataSource.query(`
      INSERT INTO projects (id, organization_id, workspace_id, name, status, created_at, updated_at)
      VALUES (gen_random_uuid(), $1, $2, 'Restore Test Project', 'ACTIVE', NOW(), NOW())
      RETURNING id
    `, [testOrganizationId, testWorkspaceId]);
    testProjectId = projResult[0].id;

    // 8. Create test task
    const taskResult = await dataSource.query(`
      INSERT INTO work_tasks (id, organization_id, workspace_id, project_id, title, status, type, priority, reporter_user_id, created_at, updated_at)
      VALUES (gen_random_uuid(), $1, $2, $3, 'Task to Delete and Restore', 'TODO', 'TASK', 'MEDIUM', $4, NOW(), NOW())
      RETURNING id
    `, [testOrganizationId, testWorkspaceId, testProjectId, adminUserId]);
    testTaskId = taskResult[0].id;

    // 9. Generate tokens
    const jwt = require('jsonwebtoken');
    adminToken = jwt.sign(
      {
        sub: adminUserId,
        organizationId: testOrganizationId,
        platformRole: 'ADMIN',
        email: 'restore-admin@test.com',
      },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' },
    );
    viewerToken = jwt.sign(
      {
        sub: viewerUserId,
        organizationId: testOrganizationId,
        platformRole: 'VIEWER',
        email: 'restore-viewer@test.com',
      },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' },
    );
  });

  afterAll(async () => {
    if (dataSource) {
      try {
        await dataSource.query(`DELETE FROM work_tasks WHERE workspace_id = $1`, [testWorkspaceId]);
        await dataSource.query(`DELETE FROM projects WHERE workspace_id = $1`, [testWorkspaceId]);
        await dataSource.query(`DELETE FROM workspace_members WHERE workspace_id = $1`, [testWorkspaceId]);
        await dataSource.query(`DELETE FROM workspaces WHERE id = $1`, [testWorkspaceId]);
        await dataSource.query(`DELETE FROM users WHERE id IN ($1, $2)`, [adminUserId, viewerUserId]);
        await dataSource.query(`DELETE FROM organizations WHERE id = $1`, [testOrganizationId]);
      } catch (e) {
        console.log('Cleanup error (may be expected):', e.message);
      }
    }
    await app?.close();
  });

  describe('Delete → Appears in Deleted List → Restore Flow', () => {
    it('should delete task and show it in includeDeleted list', async () => {
      // 1. Delete the task
      const deleteRes = await request(app.getHttpServer())
        .delete(`/api/work/tasks/${testTaskId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-workspace-id', testWorkspaceId);

      expect(deleteRes.status).toBe(200);

      // 2. Normal list should NOT include deleted task
      const normalListRes = await request(app.getHttpServer())
        .get('/api/work/tasks')
        .query({ projectId: testProjectId })
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-workspace-id', testWorkspaceId);

      expect(normalListRes.status).toBe(200);
      const normalItems = normalListRes.body.items || normalListRes.body.data?.items || [];
      expect(normalItems.find((t: any) => t.id === testTaskId)).toBeUndefined();

      // 3. includeDeleted list should include deleted task
      const deletedListRes = await request(app.getHttpServer())
        .get('/api/work/tasks')
        .query({ projectId: testProjectId, includeDeleted: true })
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-workspace-id', testWorkspaceId);

      expect(deletedListRes.status).toBe(200);
      const deletedItems = deletedListRes.body.items || deletedListRes.body.data?.items || [];
      const deletedTask = deletedItems.find((t: any) => t.id === testTaskId);
      expect(deletedTask).toBeDefined();
      expect(deletedTask.deletedAt || deletedTask.deleted_at).toBeTruthy();
    });

    it('should restore task and move it back to active list', async () => {
      // Restore the task
      const restoreRes = await request(app.getHttpServer())
        .post(`/api/work/tasks/${testTaskId}/restore`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-workspace-id', testWorkspaceId);

      expect(restoreRes.status).toBe(200);
      const restoredTask = restoreRes.body.data || restoreRes.body;
      expect(restoredTask.deletedAt || restoredTask.deleted_at).toBeNull();

      // Verify it's back in normal list
      const normalListRes = await request(app.getHttpServer())
        .get('/api/work/tasks')
        .query({ projectId: testProjectId })
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-workspace-id', testWorkspaceId);

      expect(normalListRes.status).toBe(200);
      const items = normalListRes.body.items || normalListRes.body.data?.items || [];
      expect(items.find((t: any) => t.id === testTaskId)).toBeDefined();
    });
  });

  describe('Error cases', () => {
    it('should return 400 TASK_NOT_DELETED when restoring an active task', async () => {
      // Task is now active, trying to restore again should fail
      const res = await request(app.getHttpServer())
        .post(`/api/work/tasks/${testTaskId}/restore`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-workspace-id', testWorkspaceId);

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('TASK_NOT_DELETED');
    });

    it('should return 404 TASK_NOT_FOUND for non-existent task', async () => {
      const fakeTaskId = '00000000-0000-0000-0000-000000000000';
      const res = await request(app.getHttpServer())
        .post(`/api/work/tasks/${fakeTaskId}/restore`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-workspace-id', testWorkspaceId);

      expect(res.status).toBe(404);
      expect(res.body.code).toBe('TASK_NOT_FOUND');
    });
  });

  describe('Viewer cannot restore', () => {
    it('should return 403 when viewer tries to restore a task', async () => {
      // First delete the task again
      await dataSource.query(`
        UPDATE work_tasks
        SET deleted_at = NOW(), deleted_by_user_id = $1
        WHERE id = $2
      `, [adminUserId, testTaskId]);

      // Viewer attempts to restore
      const res = await request(app.getHttpServer())
        .post(`/api/work/tasks/${testTaskId}/restore`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .set('x-workspace-id', testWorkspaceId);

      expect(res.status).toBe(403);

      // Clean up - restore the task
      await dataSource.query(`
        UPDATE work_tasks
        SET deleted_at = NULL, deleted_by_user_id = NULL
        WHERE id = $1
      `, [testTaskId]);
    });
  });
});
