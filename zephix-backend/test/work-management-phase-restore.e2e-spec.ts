import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';

/**
 * E2E tests for phase restore functionality.
 *
 * Verifies:
 * 1. Admin can delete a phase → phase appears in deleted list (deletedOnly=true)
 * 2. Admin can restore a phase → phase disappears from deleted, appears in active
 * 3. Viewer cannot delete or restore phases (403)
 * 4. 404 PHASE_NOT_FOUND if phase doesn't exist
 * 5. 400 PHASE_NOT_DELETED if phase is already active
 */
describe('WorkManagement Phase Restore E2E', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let adminToken: string;
  let viewerToken: string;
  let testWorkspaceId: string;
  let testProjectId: string;
  let testOrganizationId: string;
  let adminUserId: string;
  let viewerUserId: string;
  let testPhaseId: string;

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
      VALUES (gen_random_uuid(), 'Phase Restore Test Org', 'phase-restore-test-org-${Date.now()}', NOW(), NOW())
      RETURNING id
    `);
    testOrganizationId = orgResult[0].id;

    // 2. Create admin user
    const adminResult = await dataSource.query(`
      INSERT INTO users (id, email, password_hash, platform_role, organization_id, created_at, updated_at)
      VALUES (gen_random_uuid(), 'phase-restore-admin-${Date.now()}@test.com', 'hashedpassword', 'ADMIN', $1, NOW(), NOW())
      RETURNING id
    `, [testOrganizationId]);
    adminUserId = adminResult[0].id;

    // 3. Create viewer user
    const viewerResult = await dataSource.query(`
      INSERT INTO users (id, email, password_hash, platform_role, organization_id, created_at, updated_at)
      VALUES (gen_random_uuid(), 'phase-restore-viewer-${Date.now()}@test.com', 'hashedpassword', 'VIEWER', $1, NOW(), NOW())
      RETURNING id
    `, [testOrganizationId]);
    viewerUserId = viewerResult[0].id;

    // 4. Create test workspace
    const wsResult = await dataSource.query(`
      INSERT INTO workspaces (id, organization_id, name, description, created_at, updated_at)
      VALUES (gen_random_uuid(), $1, 'Phase Restore Test Workspace', 'Test workspace for phase restore', NOW(), NOW())
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
      VALUES (gen_random_uuid(), $1, $2, 'Phase Restore Test Project', 'ACTIVE', NOW(), NOW())
      RETURNING id
    `, [testOrganizationId, testWorkspaceId]);
    testProjectId = projResult[0].id;

    // 8. Create test phase
    const phaseResult = await dataSource.query(`
      INSERT INTO work_phases (id, organization_id, workspace_id, project_id, name, sort_order, reporting_key, is_milestone, is_locked, created_at, updated_at)
      VALUES (gen_random_uuid(), $1, $2, $3, 'Phase to Delete and Restore', 1, 'PHASE-1', false, false, NOW(), NOW())
      RETURNING id
    `, [testOrganizationId, testWorkspaceId, testProjectId]);
    testPhaseId = phaseResult[0].id;

    // 9. Generate tokens
    const jwt = require('jsonwebtoken');
    adminToken = jwt.sign(
      {
        sub: adminUserId,
        organizationId: testOrganizationId,
        platformRole: 'ADMIN',
        email: 'phase-restore-admin@test.com',
      },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' },
    );
    viewerToken = jwt.sign(
      {
        sub: viewerUserId,
        organizationId: testOrganizationId,
        platformRole: 'VIEWER',
        email: 'phase-restore-viewer@test.com',
      },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' },
    );
  });

  afterAll(async () => {
    if (dataSource) {
      try {
        await dataSource.query(`DELETE FROM work_tasks WHERE workspace_id = $1`, [testWorkspaceId]);
        await dataSource.query(`DELETE FROM work_phases WHERE workspace_id = $1`, [testWorkspaceId]);
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
    it('should delete phase and show it in deletedOnly list', async () => {
      // 1. Delete the phase
      const deleteRes = await request(app.getHttpServer())
        .delete(`/api/work/phases/${testPhaseId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-workspace-id', testWorkspaceId);

      expect(deleteRes.status).toBe(200);

      // 2. Normal list should NOT include deleted phase
      const normalListRes = await request(app.getHttpServer())
        .get('/api/work/phases')
        .query({ projectId: testProjectId })
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-workspace-id', testWorkspaceId);

      expect(normalListRes.status).toBe(200);
      const normalItems = normalListRes.body.items || normalListRes.body.data?.items || [];
      expect(normalItems.find((p: any) => p.id === testPhaseId)).toBeUndefined();

      // 3. deletedOnly list should include deleted phase
      const deletedListRes = await request(app.getHttpServer())
        .get('/api/work/phases')
        .query({ projectId: testProjectId, deletedOnly: true })
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-workspace-id', testWorkspaceId);

      expect(deletedListRes.status).toBe(200);
      const deletedItems = deletedListRes.body.items || deletedListRes.body.data?.items || [];
      const deletedPhase = deletedItems.find((p: any) => p.id === testPhaseId);
      expect(deletedPhase).toBeDefined();
      expect(deletedPhase.deletedAt || deletedPhase.deleted_at).toBeTruthy();
    });

    it('should restore phase and move it back to active list', async () => {
      // Restore the phase
      const restoreRes = await request(app.getHttpServer())
        .post(`/api/work/phases/${testPhaseId}/restore`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-workspace-id', testWorkspaceId);

      expect(restoreRes.status).toBe(200);
      const restoredPhase = restoreRes.body.data || restoreRes.body;
      expect(restoredPhase.deletedAt || restoredPhase.deleted_at).toBeNull();

      // Verify it's back in normal list
      const normalListRes = await request(app.getHttpServer())
        .get('/api/work/phases')
        .query({ projectId: testProjectId })
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-workspace-id', testWorkspaceId);

      expect(normalListRes.status).toBe(200);
      const items = normalListRes.body.items || normalListRes.body.data?.items || [];
      expect(items.find((p: any) => p.id === testPhaseId)).toBeDefined();
    });
  });

  describe('Error cases', () => {
    it('should return 400 PHASE_NOT_DELETED when restoring an active phase', async () => {
      // Phase is now active, trying to restore again should fail
      const res = await request(app.getHttpServer())
        .post(`/api/work/phases/${testPhaseId}/restore`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-workspace-id', testWorkspaceId);

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('PHASE_NOT_DELETED');
    });

    it('should return 404 PHASE_NOT_FOUND for non-existent phase', async () => {
      const fakePhaseId = '00000000-0000-0000-0000-000000000000';
      const res = await request(app.getHttpServer())
        .post(`/api/work/phases/${fakePhaseId}/restore`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-workspace-id', testWorkspaceId);

      expect(res.status).toBe(404);
      expect(res.body.code).toBe('PHASE_NOT_FOUND');
    });
  });

  describe('Viewer cannot delete or restore', () => {
    it('should return 403 when viewer tries to delete a phase', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/work/phases/${testPhaseId}`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .set('x-workspace-id', testWorkspaceId);

      expect(res.status).toBe(403);
    });

    it('should return 403 when viewer tries to restore a phase', async () => {
      // First delete the phase again
      await dataSource.query(`
        UPDATE work_phases
        SET deleted_at = NOW(), deleted_by_user_id = $1
        WHERE id = $2
      `, [adminUserId, testPhaseId]);

      // Viewer attempts to restore
      const res = await request(app.getHttpServer())
        .post(`/api/work/phases/${testPhaseId}/restore`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .set('x-workspace-id', testWorkspaceId);

      expect(res.status).toBe(403);

      // Clean up - restore the phase
      await dataSource.query(`
        UPDATE work_phases
        SET deleted_at = NULL, deleted_by_user_id = NULL
        WHERE id = $1
      `, [testPhaseId]);
    });

    it('should return 403 when viewer tries to list deleted phases', async () => {
      // Viewer should not be able to access deletedOnly list
      const res = await request(app.getHttpServer())
        .get('/api/work/phases')
        .query({ projectId: testProjectId, deletedOnly: true })
        .set('Authorization', `Bearer ${viewerToken}`)
        .set('x-workspace-id', testWorkspaceId);

      expect(res.status).toBe(403);
    });
  });
});
