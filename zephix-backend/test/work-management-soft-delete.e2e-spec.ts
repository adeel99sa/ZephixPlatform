import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { Project, ProjectState } from '../src/modules/projects/entities/project.entity';
import { User } from '../src/modules/users/entities/user.entity';
import { Organization } from '../src/organizations/entities/organization.entity';
import { Workspace } from '../src/modules/workspaces/entities/workspace.entity';
import { WorkspaceMember } from '../src/modules/workspaces/entities/workspace-member.entity';
import { UserOrganization } from '../src/organizations/entities/user-organization.entity';
import { WorkPhase } from '../src/modules/work-management/entities/work-phase.entity';
import { WorkTask } from '../src/modules/work-management/entities/work-task.entity';
import { TaskStatus } from '../src/modules/work-management/enums/task.enums';
import { ApiErrorFilter } from '../src/shared/filters/api-error.filter';
import * as bcrypt from 'bcrypt';

/**
 * Work Management Soft Delete Tests
 *
 * Tests:
 * 1. DELETE sets deletedAt and deletedByUserId
 * 2. GET by ID returns 404 for deleted task
 * 3. List excludes deleted tasks by default
 * 4. List with includeDeleted=true returns deleted tasks
 * 5. Restore clears deletedAt and returns task
 * 6. Update on deleted task returns 404
 * 7. Add comment on deleted task returns 404
 * 8. Add dependency on deleted task returns 404
 */
describe('Work Management Soft Delete (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let org: Organization;
  let adminUser: User;
  let workspace: Workspace;
  let project: Project;
  let phase: WorkPhase;
  let adminToken: string;

  beforeAll(async () => {
    process.env.DEMO_BOOTSTRAP = 'false';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new ApiErrorFilter());
    await app.init();

    dataSource = moduleFixture.get<DataSource>(DataSource);
    const hashedPassword = await bcrypt.hash('password123', 10);
    const ts = Date.now();

    // Setup org, user, workspace, project, phase
    const orgRepo = dataSource.getRepository(Organization);
    org = await orgRepo.save({
      name: `SoftDelete Test Org ${ts}`,
      slug: `softdelete-org-${ts}`,
      domain: `softdelete-${ts}.test`,
    });

    const userRepo = dataSource.getRepository(User);
    adminUser = await userRepo.save({
      email: `softdelete-admin-${ts}@example.com`,
      firstName: 'Admin',
      lastName: 'User',
      password: hashedPassword,
      emailVerifiedAt: new Date(),
      organizationId: org.id,
    });

    const uoRepo = dataSource.getRepository(UserOrganization);
    await uoRepo.save({ userId: adminUser.id, organizationId: org.id, role: 'admin' });

    const wsRepo = dataSource.getRepository(Workspace);
    workspace = await wsRepo.save({
      name: `SoftDelete Workspace ${ts}`,
      slug: `softdelete-ws-${ts}`,
      organizationId: org.id,
      ownerId: adminUser.id,
    });

    const wmRepo = dataSource.getRepository(WorkspaceMember);
    await wmRepo.save({
      workspaceId: workspace.id,
      userId: adminUser.id,
      role: 'delivery_owner',
    });

    const projectRepo = dataSource.getRepository(Project);
    project = await projectRepo.save({
      name: 'SoftDelete Test Project',
      organizationId: org.id,
      workspaceId: workspace.id,
      state: ProjectState.ACTIVE,
      createdById: adminUser.id,
    });

    const phaseRepo = dataSource.getRepository(WorkPhase);
    phase = await phaseRepo.save({
      name: 'Test Phase',
      projectId: project.id,
      workspaceId: workspace.id,
      organizationId: org.id,
      sortOrder: 0,
      reportingKey: 'test-phase',
      createdByUserId: adminUser.id,
    });

    // Login
    const server = () => request(app.getHttpServer());
    const loginRes = await server().post('/api/auth/login').send({
      email: adminUser.email,
      password: 'password123',
    });
    adminToken = loginRes.body.data?.accessToken || loginRes.body.accessToken;
  });

  afterAll(async () => {
    // Cleanup
    try {
      const taskRepo = dataSource.getRepository(WorkTask);
      await taskRepo.delete({ projectId: project?.id });

      const phaseRepo = dataSource.getRepository(WorkPhase);
      await phaseRepo.delete({ projectId: project?.id });

      const projectRepo = dataSource.getRepository(Project);
      if (project?.id) await projectRepo.delete({ id: project.id });

      const wmRepo = dataSource.getRepository(WorkspaceMember);
      if (workspace?.id) await wmRepo.delete({ workspaceId: workspace.id });

      const wsRepo = dataSource.getRepository(Workspace);
      if (workspace?.id) await wsRepo.delete({ id: workspace.id });

      const uoRepo = dataSource.getRepository(UserOrganization);
      if (adminUser?.id) await uoRepo.delete({ userId: adminUser.id });

      const userRepo = dataSource.getRepository(User);
      if (adminUser?.id) await userRepo.delete({ id: adminUser.id });

      const orgRepo = dataSource.getRepository(Organization);
      if (org?.id) await orgRepo.delete({ id: org.id });
    } catch {
      // Ignore cleanup errors
    }

    await app.close();
  });

  const server = () => request(app.getHttpServer());
  const authHeaders = () => ({
    Authorization: `Bearer ${adminToken}`,
    'x-workspace-id': workspace.id,
  });

  let taskId: string;

  describe('Soft Delete Workflow', () => {
    it('1. Create a task for testing', async () => {
      const res = await server()
        .post('/api/work/tasks')
        .set(authHeaders())
        .send({
          projectId: project.id,
          phaseId: phase.id,
          title: 'Task to be deleted',
        });

      expect(res.status).toBe(201);
      taskId = res.body.data?.id || res.body.id;
      expect(taskId).toBeDefined();
    });

    it('2. DELETE sets deletedAt (soft delete)', async () => {
      const res = await server()
        .delete(`/api/work/tasks/${taskId}`)
        .set(authHeaders());

      expect(res.status).toBe(200);

      // Verify in DB
      const taskRepo = dataSource.getRepository(WorkTask);
      const task = await taskRepo.findOne({ where: { id: taskId } });
      expect(task?.deletedAt).toBeDefined();
      expect(task?.deletedByUserId).toBe(adminUser.id);
    });

    it('3. GET by ID returns 404 TASK_NOT_FOUND for deleted task', async () => {
      const res = await server()
        .get(`/api/work/tasks/${taskId}`)
        .set(authHeaders());

      expect(res.status).toBe(404);
      expect(res.body.code).toBe('TASK_NOT_FOUND');
    });

    it('4. List excludes deleted tasks by default', async () => {
      const res = await server()
        .get('/api/work/tasks')
        .set(authHeaders())
        .query({ projectId: project.id });

      expect(res.status).toBe(200);
      const items = res.body.data?.items || res.body.items || [];
      const found = items.find((t: any) => t.id === taskId);
      expect(found).toBeUndefined();
    });

    it('5. List with includeDeleted=true returns deleted tasks (admin only)', async () => {
      const res = await server()
        .get('/api/work/tasks')
        .set(authHeaders())
        .query({ projectId: project.id, includeDeleted: true });

      expect(res.status).toBe(200);
      const items = res.body.data?.items || res.body.items || [];
      const found = items.find((t: any) => t.id === taskId);
      expect(found).toBeDefined();
      expect(found.deletedAt).toBeDefined();
    });

    it('6. Update on deleted task returns 404 TASK_NOT_FOUND', async () => {
      const res = await server()
        .patch(`/api/work/tasks/${taskId}`)
        .set(authHeaders())
        .send({ title: 'Should fail' });

      expect(res.status).toBe(404);
      expect(res.body.code).toBe('TASK_NOT_FOUND');
    });

    it('7. Add comment on deleted task returns 404 TASK_NOT_FOUND', async () => {
      const res = await server()
        .post(`/api/work/tasks/${taskId}/comments`)
        .set(authHeaders())
        .send({ body: 'Should fail' });

      expect(res.status).toBe(404);
      expect(res.body.code).toBe('TASK_NOT_FOUND');
    });

    it('8. Restore clears deletedAt and returns task', async () => {
      const res = await server()
        .post(`/api/work/tasks/${taskId}/restore`)
        .set(authHeaders());

      expect(res.status).toBe(200);
      const task = res.body.data || res.body;
      expect(task.id).toBe(taskId);
      expect(task.deletedAt).toBeNull();
    });

    it('9. GET by ID returns task after restore', async () => {
      const res = await server()
        .get(`/api/work/tasks/${taskId}`)
        .set(authHeaders());

      expect(res.status).toBe(200);
      const task = res.body.data || res.body;
      expect(task.id).toBe(taskId);
    });

    it('10. List includes task after restore', async () => {
      const res = await server()
        .get('/api/work/tasks')
        .set(authHeaders())
        .query({ projectId: project.id });

      expect(res.status).toBe(200);
      const items = res.body.data?.items || res.body.items || [];
      const found = items.find((t: any) => t.id === taskId);
      expect(found).toBeDefined();
    });
  });

  describe('Dependency on deleted task', () => {
    let task1Id: string;
    let task2Id: string;

    it('Setup: Create two tasks', async () => {
      const res1 = await server()
        .post('/api/work/tasks')
        .set(authHeaders())
        .send({
          projectId: project.id,
          phaseId: phase.id,
          title: 'Predecessor task',
        });
      task1Id = res1.body.data?.id || res1.body.id;

      const res2 = await server()
        .post('/api/work/tasks')
        .set(authHeaders())
        .send({
          projectId: project.id,
          phaseId: phase.id,
          title: 'Successor task',
        });
      task2Id = res2.body.data?.id || res2.body.id;

      expect(task1Id).toBeDefined();
      expect(task2Id).toBeDefined();
    });

    it('Delete predecessor task', async () => {
      const res = await server()
        .delete(`/api/work/tasks/${task1Id}`)
        .set(authHeaders());

      expect(res.status).toBe(200);
    });

    it('Add dependency on deleted predecessor returns 404 TASK_NOT_FOUND', async () => {
      const res = await server()
        .post(`/api/work/tasks/${task2Id}/dependencies`)
        .set(authHeaders())
        .send({
          predecessorTaskId: task1Id,
          type: 'FINISH_TO_START',
        });

      expect(res.status).toBe(404);
      expect(res.body.code).toBe('TASK_NOT_FOUND');
    });
  });
});
