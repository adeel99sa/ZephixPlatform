/**
 * E2E tests for TasksModule tenant isolation
 *
 * Tests verify:
 * 1. Org-scoped read isolation (tasks from org B don't appear in org A)
 * 2. Cross-tenant access blocked (if workspace-scoped endpoints exist)
 */

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DataSource } from 'typeorm';
import { User } from '../../src/modules/users/entities/user.entity';
import { Organization } from '../../src/organizations/entities/organization.entity';
import { Project, ProjectStatus } from '../../src/modules/projects/entities/project.entity';
import { Task } from '../../src/modules/tasks/entities/task.entity';
import { Workspace } from '../../src/modules/workspaces/entities/workspace.entity';
import { UserOrganization } from '../../src/organizations/entities/user-organization.entity';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';

describe('TasksModule Tenant Isolation (E2E)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  let orgA: Organization;
  let orgB: Organization;
  let userA: User;
  let userB: User;
  let workspaceA: Workspace;
  let workspaceB: Workspace;
  let projectA: Project;
  let projectB: Project;
  let taskA: Task;
  let taskB: Task;
  let tokenA: string;
  let tokenB: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.setGlobalPrefix('api');

    await app.init();

    dataSource = app.get(DataSource);

    // Create test organizations
    const orgRepo = dataSource.getRepository(Organization);
    orgA = await orgRepo.save({
      name: 'Org A - Tasks Test',
      slug: `org-a-tasks-${Date.now()}`,
    });
    orgB = await orgRepo.save({
      name: 'Org B - Tasks Test',
      slug: `org-b-tasks-${Date.now()}`,
    });

    // Create test users
    const userRepo = dataSource.getRepository(User);
    const hashedPassword = await bcrypt.hash('test123', 10);
    userA = await userRepo.save({
      email: `user-a-tasks-${Date.now()}@test.com`,
      password: hashedPassword,
      firstName: 'User',
      lastName: 'A',
      organizationId: orgA.id,
      role: 'admin',
    });
    userB = await userRepo.save({
      email: `user-b-tasks-${Date.now()}@test.com`,
      password: hashedPassword,
      firstName: 'User',
      lastName: 'B',
      organizationId: orgB.id,
      role: 'admin',
    });

    // Create UserOrganization entries
    const userOrgRepo = dataSource.getRepository(UserOrganization);
    await userOrgRepo.save({
      userId: userA.id,
      organizationId: orgA.id,
      role: 'admin',
      isActive: true,
    });
    await userOrgRepo.save({
      userId: userB.id,
      organizationId: orgB.id,
      role: 'admin',
      isActive: true,
    });

    // Create workspaces
    const workspaceRepo = dataSource.getRepository(Workspace);
    workspaceA = await workspaceRepo.save({
      name: 'Workspace A - Tasks',
      slug: `ws-a-tasks-${Date.now()}`,
      organizationId: orgA.id,
      createdBy: userA.id,
    });
    workspaceB = await workspaceRepo.save({
      name: 'Workspace B - Tasks',
      slug: `ws-b-tasks-${Date.now()}`,
      organizationId: orgB.id,
      createdBy: userB.id,
    });

    // Create projects
    const projectRepo = dataSource.getRepository(Project);
    const savedA = await projectRepo.save({
      name: 'Project A - Tasks',
      organizationId: orgA.id,
      workspaceId: workspaceA.id,
      status: ProjectStatus.ACTIVE,
      createdBy: userA.id,
    });
    const savedB = await projectRepo.save({
      name: 'Project B - Tasks',
      organizationId: orgB.id,
      workspaceId: workspaceB.id,
      status: ProjectStatus.ACTIVE,
      createdBy: userB.id,
    });
    projectA = Array.isArray(savedA) ? savedA[0] : savedA;
    projectB = Array.isArray(savedB) ? savedB[0] : savedB;

    // Create tasks
    const taskRepo = dataSource.getRepository(Task);
    taskA = await taskRepo.save({
      name: 'Task A',
      projectId: projectA.id,
      organizationId: orgA.id,
      status: 'todo',
    });
    taskB = await taskRepo.save({
      name: 'Task B',
      projectId: projectB.id,
      organizationId: orgB.id,
      status: 'todo',
    });

    // Create JWT tokens
    const jwtSecret = process.env.JWT_SECRET || 'test-secret';
    tokenA = jwt.sign(
      {
        sub: userA.id,
        email: userA.email,
        organizationId: orgA.id,
        role: 'admin',
      },
      jwtSecret,
    );
    tokenB = jwt.sign(
      {
        sub: userB.id,
        email: userB.email,
        organizationId: orgB.id,
        role: 'admin',
      },
      jwtSecret,
    );
  });

  afterAll(async () => {
    // Cleanup
    if (dataSource && dataSource.isInitialized) {
      const taskRepo = dataSource.getRepository(Task);
      const projectRepo = dataSource.getRepository(Project);
      const workspaceRepo = dataSource.getRepository(Workspace);
      const userOrgRepo = dataSource.getRepository(UserOrganization);
      const userRepo = dataSource.getRepository(User);
      const orgRepo = dataSource.getRepository(Organization);

      await taskRepo.delete([taskA.id, taskB.id]);
      await projectRepo.delete([projectA.id, projectB.id]);
      await workspaceRepo.delete([workspaceA.id, workspaceB.id]);
      await userOrgRepo.delete({ user: { id: userA.id }, organization: { id: orgA.id } });
      await userOrgRepo.delete({ user: { id: userB.id }, organization: { id: orgB.id } });
      await userRepo.delete([userA.id, userB.id]);
      await orgRepo.delete([orgA.id, orgB.id]);
    }

    await app.close();
  });

  describe('Org-scoped read isolation', () => {
    it('User from Org A should only see tasks from Org A projects', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/tasks/project/${projectA.id}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);

      const tasks = response.body || [];
      if (Array.isArray(tasks) && tasks.length > 0) {
        // All tasks should belong to orgA
        tasks.forEach((task: any) => {
          expect(task.organizationId).toBe(orgA.id);
        });
        // Should not contain taskB
        expect(tasks.some((t: any) => t.id === taskB.id)).toBe(false);
      }
    });

    it('User from Org A cannot access task from Org B', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/tasks/${taskB.id}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(404); // Task not found (scoped to orgA, taskB is in orgB)

      // Verify it's a not found, not a permission error
      // (Task is org-scoped, not workspace-scoped, so 404 is correct)
    });

    it('User from Org B cannot access task from Org A', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/tasks/${taskA.id}`)
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(404); // Task not found (scoped to orgB, taskA is in orgA)
    });
  });

  describe('Cross-tenant project access', () => {
    it('User from Org A cannot list tasks from Org B project', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/tasks/project/${projectB.id}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200); // Endpoint succeeds but returns empty or only orgA tasks

      const tasks = response.body || [];
      // Should not contain taskB
      expect(tasks.some((t: any) => t.id === taskB.id)).toBe(false);
      // All returned tasks should belong to orgA (if any)
      if (tasks.length > 0) {
        tasks.forEach((task: any) => {
          expect(task.organizationId).toBe(orgA.id);
        });
      }
    });
  });
});



