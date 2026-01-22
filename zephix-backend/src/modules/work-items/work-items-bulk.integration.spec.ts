/**
 * PHASE 7 MODULE 7.4.3: Bulk Actions Integration Tests
 */
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
import { WorkItem } from './entities/work-item.entity';
import { WorkItemActivity } from './entities/work-item-activity.entity';
import { Project } from '../projects/entities/project.entity';
import { Workspace } from '../workspaces/entities/workspace.entity';
import { User } from '../users/entities/user.entity';
import { Organization } from '../../organizations/entities/organization.entity';
import { WorkspaceMember } from '../workspaces/entities/workspace-member.entity';
import { WorkItemStatus } from './entities/work-item.entity';

jest.setTimeout(60000);

describe('Work Items Bulk Actions (e2e)', () => {
  let app: INestApplication;
  let moduleFixture: TestingModule;
  let dataSource: DataSource;
  let jwtService: JwtService;
  let configService: ConfigService;

  // Test data IDs
  let orgId: string;
  let adminUserId: string;
  let memberUserId: string;
  let guestUserId: string;
  let workspace1Id: string;
  let workspace2Id: string;
  let project1Id: string;
  let project2Id: string;
  let task1Id: string;
  let task2Id: string;
  let task3Id: string;
  let task4Id: string;
  let task5Id: string;
  let task6Id: string;
  let taskU1Id: string;
  let taskU2Id: string;
  let taskU3Id: string;
  let taskU4Id: string;

  let adminToken: string;
  let memberToken: string;
  let guestToken: string;

  beforeAll(async () => {
    console.log('beforeAll start', new Date().toISOString());
    moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    console.log('module compiled', new Date().toISOString());

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );
    await app.init();
    console.log('app initialized', new Date().toISOString());

    dataSource = moduleFixture.get<DataSource>(DataSource);
    jwtService = moduleFixture.get<JwtService>(JwtService);
    configService = moduleFixture.get<ConfigService>(ConfigService);

    await setupTestData();
  });

  afterAll(async () => {
    const cleanupTimeout = setTimeout(() => {
      console.error('⚠️  Test cleanup taking too long, forcing exit');
      process.exit(1);
    }, 30000); // 30 second timeout

    try {
      // Cleanup test data first
      if (dataSource && dataSource.isInitialized) {
        await cleanupTestData();
      }

      // Close app first (this will close connections)
      if (app) {
        await app.close();
      }

      // Get and destroy DataSource from Nest app if available
      try {
        const appDataSource = app?.get(DataSource, { strict: false });
        if (appDataSource && appDataSource.isInitialized) {
          await appDataSource.destroy();
        }
      } catch (e) {
        // Ignore if DataSource not available
      }

      // Close module fixture
      if (moduleFixture) {
        await moduleFixture.close();
      }

      // Finally destroy DataSource if still initialized
      if (dataSource && dataSource.isInitialized) {
        await dataSource.destroy();
      }

      clearTimeout(cleanupTimeout);
    } catch (error) {
      clearTimeout(cleanupTimeout);
      // Suppress cleanup errors in test mode
      if (process.env.NODE_ENV !== 'test') {
        console.error('Error during test cleanup:', error);
      }
    }
  }, 60000); // 60 second timeout for afterAll

  /**
   * Helper: Generate JWT token for test user
   */
  function generateToken(
    userId: string,
    email: string,
    organizationId: string,
    role: string,
  ) {
    const secret =
      configService.get<string>('jwt.secret') ||
      process.env.JWT_SECRET ||
      'test-secret';
    return jwtService.sign(
      {
        sub: userId,
        email,
        organizationId,
        role,
      },
      { secret, expiresIn: '1h' },
    );
  }

  /**
   * Helper: Setup test data
   */
  async function setupTestData() {
    // Generate unique emails per test run to avoid conflicts with protected users
    const run = Date.now();
    const adminEmail = `admin+${run}@test.com`;
    const memberEmail = `member+${run}@test.com`;
    const guestEmail = `guest+${run}@test.com`;

    // Create organization with unique slug
    // Generate a unique slug: test-org-<first-8-chars-of-uuid>
    const orgResult = await dataSource.query(
      `INSERT INTO organizations (id, name, slug, created_at, updated_at)
       VALUES (
         gen_random_uuid(),
         'Test Org ' || gen_random_uuid()::text,
         'test-org-' || substring(gen_random_uuid()::text, 1, 8),
         NOW(),
         NOW()
       )
       RETURNING id`,
    );
    orgId = orgResult[0].id;

    // Create users
    // Note: platform_role is not a column in users table - it's derived from UserOrganization.role
    // We use the legacy 'role' column for backward compatibility
    // Password is required (NOT NULL) - using a dummy hash for test users
    const dummyPasswordHash = '$2b$10$dummy.hash.for.test.users.only';
    const adminResult = await dataSource.query(
      `INSERT INTO users (id, email, password, first_name, last_name, organization_id, role, created_at, updated_at)
       VALUES (gen_random_uuid(), $2, $1, 'Admin', 'User', $3, 'admin', NOW(), NOW())
       RETURNING id`,
      [dummyPasswordHash, adminEmail, orgId],
    );
    adminUserId = adminResult[0].id;

    const memberResult = await dataSource.query(
      `INSERT INTO users (id, email, password, first_name, last_name, organization_id, role, created_at, updated_at)
       VALUES (gen_random_uuid(), $2, $1, 'Member', 'User', $3, 'member', NOW(), NOW())
       RETURNING id`,
      [dummyPasswordHash, memberEmail, orgId],
    );
    memberUserId = memberResult[0].id;

    const guestResult = await dataSource.query(
      `INSERT INTO users (id, email, password, first_name, last_name, organization_id, role, created_at, updated_at)
       VALUES (gen_random_uuid(), $2, $1, 'Guest', 'User', $3, 'viewer', NOW(), NOW())
       RETURNING id`,
      [dummyPasswordHash, guestEmail, orgId],
    );
    guestUserId = guestResult[0].id;

    // Create workspaces
    const ws1Result = await dataSource.query(
      `INSERT INTO workspaces (id, name, organization_id, slug, created_by, owner_id, created_at, updated_at)
       VALUES (gen_random_uuid(), 'Workspace 1', $1, 'workspace-1', $2, $2, NOW(), NOW())
       RETURNING id`,
      [orgId, adminUserId],
    );
    workspace1Id = ws1Result[0].id;

    const ws2Result = await dataSource.query(
      `INSERT INTO workspaces (id, name, organization_id, slug, created_by, owner_id, created_at, updated_at)
       VALUES (gen_random_uuid(), 'Workspace 2', $1, 'workspace-2', $2, $2, NOW(), NOW())
       RETURNING id`,
      [orgId, adminUserId],
    );
    workspace2Id = ws2Result[0].id;

    // Create memberships
    // Admin has access to both workspaces
    await dataSource.query(
      `INSERT INTO workspace_members (id, workspace_id, user_id, role, status, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, 'workspace_owner', 'active', NOW(), NOW())`,
      [workspace1Id, adminUserId],
    );
    await dataSource.query(
      `INSERT INTO workspace_members (id, workspace_id, user_id, role, status, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, 'workspace_owner', 'active', NOW(), NOW())`,
      [workspace2Id, adminUserId],
    );

    // Member M1 has access to W1 only
    await dataSource.query(
      `INSERT INTO workspace_members (id, workspace_id, user_id, role, status, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, 'workspace_member', 'active', NOW(), NOW())`,
      [workspace1Id, memberUserId],
    );

    // Guest G1 has access to W1 only
    await dataSource.query(
      `INSERT INTO workspace_members (id, workspace_id, user_id, role, status, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, 'workspace_viewer', 'active', NOW(), NOW())`,
      [workspace1Id, guestUserId],
    );

    // Create projects
    const p1Result = await dataSource.query(
      `INSERT INTO projects (id, name, organization_id, workspace_id, created_at, updated_at)
       VALUES (gen_random_uuid(), 'Project 1', $1, $2, NOW(), NOW())
       RETURNING id`,
      [orgId, workspace1Id],
    );
    project1Id = p1Result[0].id;

    const p2Result = await dataSource.query(
      `INSERT INTO projects (id, name, organization_id, workspace_id, created_at, updated_at)
       VALUES (gen_random_uuid(), 'Project 2', $1, $2, NOW(), NOW())
       RETURNING id`,
      [orgId, workspace2Id],
    );
    project2Id = p2Result[0].id;

    // Create work items in P1 (T1..T6)
    const workItemRepo = dataSource.getRepository(WorkItem);
    const tasks = [];
    for (let i = 1; i <= 6; i++) {
      const task = workItemRepo.create({
        title: `Task ${i}`,
        organizationId: orgId,
        workspaceId: workspace1Id,
        projectId: project1Id,
        status: WorkItemStatus.TODO,
        createdBy: adminUserId,
        assigneeId: i <= 2 ? memberUserId : null, // T1, T2 assigned to M1
      });
      const saved = await workItemRepo.save(task);
      tasks.push(saved);
    }
    task1Id = tasks[0].id;
    task2Id = tasks[1].id;
    task3Id = tasks[2].id;
    task4Id = tasks[3].id;
    task5Id = tasks[4].id;
    task6Id = tasks[5].id;

    // Create work items in P2 (U1..U4)
    const tasksU = [];
    for (let i = 1; i <= 4; i++) {
      const task = workItemRepo.create({
        title: `Task U${i}`,
        organizationId: orgId,
        workspaceId: workspace2Id,
        projectId: project2Id,
        status: WorkItemStatus.TODO,
        createdBy: adminUserId,
      });
      const saved = await workItemRepo.save(task);
      tasksU.push(saved);
    }
    taskU1Id = tasksU[0].id;
    taskU2Id = tasksU[1].id;
    taskU3Id = tasksU[2].id;
    taskU4Id = tasksU[3].id;

    // Generate tokens
    adminToken = generateToken(adminUserId, adminEmail, orgId, 'admin');
    memberToken = generateToken(memberUserId, memberEmail, orgId, 'member');
    guestToken = generateToken(guestUserId, guestEmail, orgId, 'guest');
  }

  /**
   * Helper: Cleanup test data
   */
  async function cleanupTestData() {
    await dataSource.query('DELETE FROM work_item_activities WHERE organization_id = $1', [orgId]);
    await dataSource.query('DELETE FROM work_item_comments WHERE organization_id = $1', [orgId]);
    await dataSource.query('DELETE FROM work_items WHERE organization_id = $1', [orgId]);
    await dataSource.query('DELETE FROM projects WHERE organization_id = $1', [orgId]);
    await dataSource.query('DELETE FROM workspace_members WHERE organization_id = $1', [orgId]);
    await dataSource.query('DELETE FROM workspaces WHERE organization_id = $1', [orgId]);
    await dataSource.query('DELETE FROM users WHERE organization_id = $1', [orgId]);
    await dataSource.query('DELETE FROM organizations WHERE id = $1', [orgId]);
  }

  describe('POST /work-items/bulk/update', () => {
    it('1. Guest bulk update blocked', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/work-items/bulk/update')
        .set('Authorization', `Bearer ${guestToken}`)
        .send({
          workspaceId: workspace1Id,
          projectId: project1Id,
          ids: [task1Id, task2Id],
          patch: { status: WorkItemStatus.IN_PROGRESS },
        })
        .expect(403);

      expect(response.body.message).toBe('Forbidden');
    });

    it('2. Member bulk update allowed in own workspace', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/work-items/bulk/update')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          workspaceId: workspace1Id,
          projectId: project1Id,
          ids: [task1Id, task2Id],
          patch: { status: WorkItemStatus.IN_PROGRESS },
        })
        .expect(200);

      expect(response.body.updatedCount).toBe(2);
      expect(response.body.skippedCount).toBe(0);
      expect(response.body.errors).toHaveLength(0);

      // Verify DB status updated
      const workItemRepo = dataSource.getRepository(WorkItem);
      const t1 = await workItemRepo.findOne({ where: { id: task1Id, organizationId: orgId } });
      const t2 = await workItemRepo.findOne({ where: { id: task2Id, organizationId: orgId } });
      expect(t1?.status).toBe(WorkItemStatus.IN_PROGRESS);
      expect(t2?.status).toBe(WorkItemStatus.IN_PROGRESS);

      // Verify WorkItemActivity inserted
      const activityRepo = dataSource.getRepository(WorkItemActivity);
      const activities = await activityRepo.find({
        where: { workItemId: task1Id, organizationId: orgId },
      });
      expect(activities.length).toBeGreaterThan(0);
      const bulkActivity = activities.find(a => a.payload?.bulkUpdate === true);
      expect(bulkActivity).toBeDefined();
    });

    it('3. Member bulk update cannot cross workspace', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/work-items/bulk/update')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          workspaceId: workspace2Id,
          projectId: project2Id,
          ids: [taskU1Id],
          patch: { status: WorkItemStatus.IN_PROGRESS },
        })
        .expect(404);

      expect(response.body.message).toContain('not found');
    });

    it('4. Admin bulk update can operate across workspaces when access exists', async () => {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7);
      const dueDateStr = dueDate.toISOString().split('T')[0];

      const response = await request(app.getHttpServer())
        .post('/api/work-items/bulk/update')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          workspaceId: workspace2Id,
          projectId: project2Id,
          ids: [taskU1Id, taskU2Id],
          patch: { dueDate: dueDateStr },
        })
        .expect(200);

      expect(response.body.updatedCount).toBe(2);
      expect(response.body.skippedCount).toBe(0);

      // Verify DB dueDate updated
      const workItemRepo = dataSource.getRepository(WorkItem);
      const u1 = await workItemRepo.findOne({ where: { id: taskU1Id, organizationId: orgId } });
      const u2 = await workItemRepo.findOne({ where: { id: taskU2Id, organizationId: orgId } });
      expect(u1?.dueDate).toBeDefined();
      expect(u2?.dueDate).toBeDefined();
    });

    it('5. Validation: ids max 200 enforced', async () => {
      const ids = Array.from({ length: 201 }, () => '00000000-0000-0000-0000-000000000000');

      const response = await request(app.getHttpServer())
        .post('/api/work-items/bulk/update')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          workspaceId: workspace1Id,
          projectId: project1Id,
          ids,
          patch: { status: WorkItemStatus.IN_PROGRESS },
        })
        .expect(400);

      expect(response.body.message[0]).toContain('Maximum 200 items');
    });

    it('6. Cross project ID mixing blocked', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/work-items/bulk/update')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          workspaceId: workspace1Id,
          projectId: project1Id,
          ids: [task1Id, taskU1Id], // taskU1Id is in project2Id
          patch: { status: WorkItemStatus.IN_PROGRESS },
        });

      // Implementation choice: Atomic - if any ID is invalid, return 404
      // OR Partial - update valid ones, skip invalid ones
      // Based on the service implementation, it validates all IDs first and throws 404 if any missing
      expect([400, 404]).toContain(response.status);

      if (response.status === 404) {
        expect(response.body.message).toContain('not found');
      } else {
        // If partial update is implemented
        expect(response.body.errors).toBeDefined();
        const u1Error = response.body.errors.find((e: any) => e.id === taskU1Id);
        expect(u1Error).toBeDefined();
      }
    });

    it('7. Status transition validation applies per item', async () => {
      // Make T3 DONE
      const workItemRepo = dataSource.getRepository(WorkItem);
      const t3 = await workItemRepo.findOne({ where: { id: task3Id, organizationId: orgId } });
      if (t3) {
        t3.status = WorkItemStatus.DONE;
        await workItemRepo.save(t3);
      }

      // Try bulk update to TODO
      const response = await request(app.getHttpServer())
        .post('/api/work-items/bulk/update')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          workspaceId: workspace1Id,
          projectId: project1Id,
          ids: [task3Id],
          patch: { status: WorkItemStatus.TODO },
        })
        .expect(200);

      expect(response.body.skippedCount).toBe(1);
      expect(response.body.errors).toHaveLength(1);
      expect(response.body.errors[0].id).toBe(task3Id);
      expect(response.body.errors[0].reason).toContain('Invalid status transition');

      // Verify no status change
      const t3After = await workItemRepo.findOne({ where: { id: task3Id, organizationId: orgId } });
      expect(t3After?.status).toBe(WorkItemStatus.DONE);

      // Verify no activity row for the skipped item (or verify it's marked as skipped)
      const activityRepo = dataSource.getRepository(WorkItemActivity);
      const recentActivities = await activityRepo.find({
        where: { workItemId: task3Id, organizationId: orgId },
        order: { createdAt: 'DESC' },
        take: 1,
      });
      // The activity should not be a successful bulk update
      if (recentActivities.length > 0) {
        expect(recentActivities[0].payload?.bulkUpdate).not.toBe(true);
      }
    });
  });

  describe('POST /work-items/bulk/delete', () => {
    it('8. Member bulk delete forbidden', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/work-items/bulk/delete')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          workspaceId: workspace1Id,
          projectId: project1Id,
          ids: [task1Id],
        })
        .expect(403);

      expect(response.body.message).toBe('Forbidden');
    });

    it('9. Admin bulk delete allowed and scoped', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/work-items/bulk/delete')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          workspaceId: workspace1Id,
          projectId: project1Id,
          ids: [task4Id, task5Id],
        })
        .expect(200);

      expect(response.body.updatedCount).toBe(2);
      expect(response.body.skippedCount).toBe(0);

      // Verify soft delete or status DONE
      const workItemRepo = dataSource.getRepository(WorkItem);
      const t4 = await workItemRepo.findOne({ where: { id: task4Id, organizationId: orgId } });
      const t5 = await workItemRepo.findOne({ where: { id: task5Id, organizationId: orgId } });

      if (t4?.deletedAt) {
        // Soft delete supported
        expect(t4.deletedAt).toBeDefined();
        expect(t5?.deletedAt).toBeDefined();
      } else {
        // Fallback: status DONE
        expect(t4?.status).toBe(WorkItemStatus.DONE);
        expect(t5?.status).toBe(WorkItemStatus.DONE);
      }

      // Verify activity rows created
      const activityRepo = dataSource.getRepository(WorkItemActivity);
      const t4Activities = await activityRepo.find({
        where: { workItemId: task4Id, organizationId: orgId },
        order: { createdAt: 'DESC' },
        take: 1,
      });
      expect(t4Activities.length).toBeGreaterThan(0);
      expect(t4Activities[0].payload?.bulkDelete).toBe(true);
    });

    it('10. Non-member gets 404', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/work-items/bulk/update')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          workspaceId: workspace2Id,
          projectId: project2Id,
          ids: [taskU1Id],
          patch: { status: WorkItemStatus.IN_PROGRESS },
        })
        .expect(404);

      expect(response.body.message).toContain('not found');
    });
  });
});
