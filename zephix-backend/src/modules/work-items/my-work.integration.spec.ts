/**
 * PHASE 7 MODULE 7.2: My Work Integration Tests
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
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../app.module';
import { DataSource } from 'typeorm';
import { WorkItem } from './entities/work-item.entity';
import { Project } from '../projects/entities/project.entity';
import { Workspace } from '../workspaces/entities/workspace.entity';
import { User } from '../users/entities/user.entity';
import { Organization } from '../../organizations/entities/organization.entity';
import { WorkspaceMember } from '../workspaces/entities/workspace-member.entity';
import { WorkItemStatus } from './entities/work-item.entity';

describe('My Work API (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let org: Organization;
  let adminUser: User;
  let memberUser: User;
  let guestUser: User;
  let workspaceA: Workspace;
  let workspaceB: Workspace;
  let projectA: Project;
  let projectB: Project;
  let adminToken: string;
  let memberToken: string;
  let guestToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    dataSource = moduleFixture.get<DataSource>(DataSource);

    // Create test data
    // Note: This is a simplified setup - adjust based on your test setup
    // You may need to use factories or seeders
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clean up test data
    await dataSource.query('DELETE FROM work_items');
    await dataSource.query('DELETE FROM workspace_members');
    await dataSource.query('DELETE FROM projects');
    await dataSource.query('DELETE FROM workspaces');
    await dataSource.query('DELETE FROM users');
    await dataSource.query('DELETE FROM organizations');

    // Create test organization
    const orgRepo = dataSource.getRepository(Organization);
    org = orgRepo.create({
      name: 'Test Org',
      slug: 'test-org',
    });
    org = await orgRepo.save(org);

    // Create users
    const userRepo = dataSource.getRepository(User);
    adminUser = await userRepo.save(
      userRepo.create({
        email: 'admin@test.com',
        firstName: 'Admin',
        lastName: 'User',
        organizationId: org.id,
        role: 'ADMIN',
        platformRole: 'ADMIN',
      }),
    );
    memberUser = await userRepo.save(
      userRepo.create({
        email: 'member@test.com',
        firstName: 'Member',
        lastName: 'User',
        organizationId: org.id,
        role: 'MEMBER',
        platformRole: 'MEMBER',
      }),
    );
    guestUser = await userRepo.save(
      userRepo.create({
        email: 'guest@test.com',
        firstName: 'Guest',
        lastName: 'User',
        organizationId: org.id,
        role: 'VIEWER',
        platformRole: 'VIEWER',
      }),
    );

    // Create workspaces
    const workspaceRepo = dataSource.getRepository(Workspace);
    workspaceA = await workspaceRepo.save(
      workspaceRepo.create({
        name: 'Workspace A',
        organizationId: org.id,
        slug: 'workspace-a',
      }),
    );
    workspaceB = await workspaceRepo.save(
      workspaceRepo.create({
        name: 'Workspace B',
        organizationId: org.id,
        slug: 'workspace-b',
      }),
    );

    // Add member to workspace A only
    const memberRepo = dataSource.getRepository(WorkspaceMember);
    await memberRepo.save(
      memberRepo.create({
        workspaceId: workspaceA.id,
        userId: memberUser.id,
        organizationId: org.id,
        role: 'workspace_member',
      }),
    );

    // Create projects
    const projectRepo = dataSource.getRepository(Project);
    projectA = await projectRepo.save(
      projectRepo.create({
        name: 'Project A',
        organizationId: org.id,
        workspaceId: workspaceA.id,
      }),
    );
    projectB = await projectRepo.save(
      projectRepo.create({
        name: 'Project B',
        organizationId: org.id,
        workspaceId: workspaceB.id,
      }),
    );

    // Create work items
    const workItemRepo = dataSource.getRepository(WorkItem);
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Overdue task in workspace A (member can see)
    await workItemRepo.save(
      workItemRepo.create({
        title: 'Overdue Task',
        organizationId: org.id,
        workspaceId: workspaceA.id,
        projectId: projectA.id,
        assigneeId: memberUser.id,
        status: WorkItemStatus.TODO,
        dueDate: yesterday,
        createdBy: adminUser.id,
      }),
    );

    // Task in workspace B (member cannot see)
    await workItemRepo.save(
      workItemRepo.create({
        title: 'Hidden Task',
        organizationId: org.id,
        workspaceId: workspaceB.id,
        projectId: projectB.id,
        assigneeId: memberUser.id,
        status: WorkItemStatus.TODO,
        createdBy: adminUser.id,
      }),
    );

    // Get auth tokens (adjust based on your auth setup)
    // This is a placeholder - you'll need to implement actual token generation
    adminToken = 'admin-token';
    memberToken = 'member-token';
    guestToken = 'guest-token';
  });

  describe('GET /my-work', () => {
    it('should return 403 for Guest (VIEWER)', async () => {
      const response = await request(app.getHttpServer())
        .get('/my-work')
        .set('Authorization', `Bearer ${guestToken}`)
        .expect(403);

      expect(response.body.message).toBe('Forbidden');
    });

    it('should return only tasks from accessible workspaces for Member', async () => {
      const response = await request(app.getHttpServer())
        .get('/my-work')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);

      expect(response.body.version).toBe(1);
      expect(response.body.counts.total).toBe(1); // Only workspace A task
      expect(response.body.items).toHaveLength(1);
      expect(response.body.items[0].title).toBe('Overdue Task');
      expect(response.body.items[0].workspaceId).toBe(workspaceA.id);
    });

    it('should return empty if Member has no accessible workspaces', async () => {
      // Remove member from workspace A
      await dataSource.query(
        `DELETE FROM workspace_members WHERE user_id = '${memberUser.id}'`,
      );

      const response = await request(app.getHttpServer())
        .get('/my-work')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);

      expect(response.body.counts.total).toBe(0);
      expect(response.body.items).toHaveLength(0);
    });

    it('should sort overdue items first', async () => {
      // Add more tasks
      const workItemRepo = dataSource.getRepository(WorkItem);
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      await workItemRepo.save(
        workItemRepo.create({
          title: 'Future Task',
          organizationId: org.id,
          workspaceId: workspaceA.id,
          projectId: projectA.id,
          assigneeId: memberUser.id,
          status: WorkItemStatus.TODO,
          dueDate: tomorrow,
          createdBy: adminUser.id,
        }),
      );

      const response = await request(app.getHttpServer())
        .get('/my-work')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);

      expect(response.body.items.length).toBeGreaterThan(1);
      // First item should be overdue
      expect(response.body.items[0].title).toBe('Overdue Task');
    });

    it('should return all tasks for Admin', async () => {
      // Assign tasks to admin
      const workItemRepo = dataSource.getRepository(WorkItem);
      await workItemRepo.save(
        workItemRepo.create({
          title: 'Admin Task',
          organizationId: org.id,
          workspaceId: workspaceA.id,
          projectId: projectA.id,
          assigneeId: adminUser.id,
          status: WorkItemStatus.TODO,
          createdBy: adminUser.id,
        }),
      );

      const response = await request(app.getHttpServer())
        .get('/my-work')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.counts.total).toBeGreaterThan(0);
    });
  });
});
