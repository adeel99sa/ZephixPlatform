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
 * Work Management Status Transition Tests
 *
 * Status Transition Rules:
 * - Terminal states: DONE, CANCELED - no transitions out
 * - BLOCKED: only from TODO or IN_PROGRESS
 * - IN_REVIEW: only from IN_PROGRESS
 *
 * Tests:
 * 1. Valid transitions succeed
 * 2. Invalid transitions fail with 400 INVALID_STATUS_TRANSITION
 * 3. DONE is terminal (no transitions out)
 * 4. CANCELED is terminal (no transitions out)
 */
describe('Work Management Status Transitions (e2e)', () => {
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

    // Setup
    const orgRepo = dataSource.getRepository(Organization);
    org = await orgRepo.save({
      name: `StatusTransition Test Org ${ts}`,
      slug: `statustrans-org-${ts}`,
      domain: `statustrans-${ts}.test`,
    });

    const userRepo = dataSource.getRepository(User);
    adminUser = await userRepo.save({
      email: `statustrans-admin-${ts}@example.com`,
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
      name: `StatusTransition Workspace ${ts}`,
      slug: `statustrans-ws-${ts}`,
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
      name: 'StatusTransition Test Project',
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

  async function createTask(status: TaskStatus = TaskStatus.TODO): Promise<string> {
    const res = await server()
      .post('/api/work/tasks')
      .set(authHeaders())
      .send({
        projectId: project.id,
        phaseId: phase.id,
        title: `Test task ${Date.now()}`,
        status,
      });
    return res.body.data?.id || res.body.id;
  }

  async function updateStatus(taskId: string, status: TaskStatus): Promise<request.Response> {
    return server()
      .patch(`/api/work/tasks/${taskId}`)
      .set(authHeaders())
      .send({ status });
  }

  describe('Valid Status Transitions', () => {
    it('TODO → IN_PROGRESS (allowed)', async () => {
      const taskId = await createTask(TaskStatus.TODO);
      const res = await updateStatus(taskId, TaskStatus.IN_PROGRESS);
      expect(res.status).toBe(200);
    });

    it('TODO → BLOCKED (allowed)', async () => {
      const taskId = await createTask(TaskStatus.TODO);
      const res = await updateStatus(taskId, TaskStatus.BLOCKED);
      expect(res.status).toBe(200);
    });

    it('TODO → CANCELED (allowed)', async () => {
      const taskId = await createTask(TaskStatus.TODO);
      const res = await updateStatus(taskId, TaskStatus.CANCELED);
      expect(res.status).toBe(200);
    });

    it('IN_PROGRESS → BLOCKED (allowed)', async () => {
      const taskId = await createTask(TaskStatus.TODO);
      await updateStatus(taskId, TaskStatus.IN_PROGRESS);
      const res = await updateStatus(taskId, TaskStatus.BLOCKED);
      expect(res.status).toBe(200);
    });

    it('IN_PROGRESS → IN_REVIEW (allowed)', async () => {
      const taskId = await createTask(TaskStatus.TODO);
      await updateStatus(taskId, TaskStatus.IN_PROGRESS);
      const res = await updateStatus(taskId, TaskStatus.IN_REVIEW);
      expect(res.status).toBe(200);
    });

    it('IN_PROGRESS → DONE (allowed)', async () => {
      const taskId = await createTask(TaskStatus.TODO);
      await updateStatus(taskId, TaskStatus.IN_PROGRESS);
      const res = await updateStatus(taskId, TaskStatus.DONE);
      expect(res.status).toBe(200);
    });

    it('IN_REVIEW → DONE (allowed)', async () => {
      const taskId = await createTask(TaskStatus.TODO);
      await updateStatus(taskId, TaskStatus.IN_PROGRESS);
      await updateStatus(taskId, TaskStatus.IN_REVIEW);
      const res = await updateStatus(taskId, TaskStatus.DONE);
      expect(res.status).toBe(200);
    });

    it('BLOCKED → IN_PROGRESS (allowed)', async () => {
      const taskId = await createTask(TaskStatus.TODO);
      await updateStatus(taskId, TaskStatus.BLOCKED);
      const res = await updateStatus(taskId, TaskStatus.IN_PROGRESS);
      expect(res.status).toBe(200);
    });

    it('BLOCKED → TODO (allowed)', async () => {
      const taskId = await createTask(TaskStatus.TODO);
      await updateStatus(taskId, TaskStatus.BLOCKED);
      const res = await updateStatus(taskId, TaskStatus.TODO);
      expect(res.status).toBe(200);
    });
  });

  describe('Invalid Status Transitions', () => {
    it('TODO → DONE (rejected - must go through IN_PROGRESS)', async () => {
      const taskId = await createTask(TaskStatus.TODO);
      const res = await updateStatus(taskId, TaskStatus.DONE);
      expect(res.status).toBe(400);
      expect(res.body?.code).toBe('INVALID_STATUS_TRANSITION');
    });

    it('TODO → IN_REVIEW (rejected - must go through IN_PROGRESS)', async () => {
      const taskId = await createTask(TaskStatus.TODO);
      const res = await updateStatus(taskId, TaskStatus.IN_REVIEW);
      expect(res.status).toBe(400);
      expect(res.body?.code).toBe('INVALID_STATUS_TRANSITION');
    });

    it('IN_REVIEW → TODO (rejected)', async () => {
      const taskId = await createTask(TaskStatus.TODO);
      await updateStatus(taskId, TaskStatus.IN_PROGRESS);
      await updateStatus(taskId, TaskStatus.IN_REVIEW);
      const res = await updateStatus(taskId, TaskStatus.TODO);
      expect(res.status).toBe(400);
      expect(res.body?.code).toBe('INVALID_STATUS_TRANSITION');
    });
  });

  describe('Terminal States', () => {
    it('DONE → any (rejected - terminal state)', async () => {
      const taskId = await createTask(TaskStatus.TODO);
      await updateStatus(taskId, TaskStatus.IN_PROGRESS);
      await updateStatus(taskId, TaskStatus.DONE);

      // Try to transition out of DONE
      const toTodo = await updateStatus(taskId, TaskStatus.TODO);
      expect(toTodo.status).toBe(400);
      expect(toTodo.body?.code).toBe('INVALID_STATUS_TRANSITION');

      const toInProgress = await updateStatus(taskId, TaskStatus.IN_PROGRESS);
      expect(toInProgress.status).toBe(400);
      expect(toInProgress.body?.code).toBe('INVALID_STATUS_TRANSITION');
    });

    it('CANCELED → any (rejected - terminal state)', async () => {
      const taskId = await createTask(TaskStatus.TODO);
      await updateStatus(taskId, TaskStatus.CANCELED);

      // Try to transition out of CANCELED
      const toTodo = await updateStatus(taskId, TaskStatus.TODO);
      expect(toTodo.status).toBe(400);
      expect(toTodo.body?.code).toBe('INVALID_STATUS_TRANSITION');

      const toInProgress = await updateStatus(taskId, TaskStatus.IN_PROGRESS);
      expect(toInProgress.status).toBe(400);
      expect(toInProgress.body?.code).toBe('INVALID_STATUS_TRANSITION');
    });
  });

  describe('Bulk Status Update', () => {
    it('Bulk update with valid transitions succeeds', async () => {
      const taskId1 = await createTask(TaskStatus.TODO);
      const taskId2 = await createTask(TaskStatus.TODO);

      // Move both to IN_PROGRESS
      await updateStatus(taskId1, TaskStatus.IN_PROGRESS);
      await updateStatus(taskId2, TaskStatus.IN_PROGRESS);

      // Bulk update to DONE
      const res = await server()
        .patch('/api/work/tasks/bulk')
        .set(authHeaders())
        .send({
          taskIds: [taskId1, taskId2],
          status: TaskStatus.DONE,
        });

      expect(res.status).toBe(200);
      expect(res.body.data?.updated || res.body.updated).toBe(2);
    });

    it('Bulk update with invalid transitions fails entire request (STRICT mode)', async () => {
      const taskId1 = await createTask(TaskStatus.TODO); // TODO cannot go to DONE directly

      // Bulk update TODO directly to DONE (should fail validation)
      const res = await server()
        .patch('/api/work/tasks/bulk')
        .set(authHeaders())
        .send({
          taskIds: [taskId1],
          status: TaskStatus.DONE,
        });

      // STRICT mode: fails entire request if any transition is invalid
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
      expect(res.body.invalidTransitions).toBeDefined();
      expect(res.body.invalidTransitions).toHaveLength(1);
      expect(res.body.invalidTransitions[0]).toMatchObject({
        id: taskId1,
        from: TaskStatus.TODO,
        to: TaskStatus.DONE,
      });
    });

    it('Bulk update mixed valid/invalid fails all (STRICT mode)', async () => {
      const taskId1 = await createTask(TaskStatus.TODO);
      const taskId2 = await createTask(TaskStatus.TODO);

      // Move taskId2 to IN_PROGRESS (now TODO→DONE fails, IN_PROGRESS→DONE succeeds)
      await updateStatus(taskId2, TaskStatus.IN_PROGRESS);

      // Bulk update both to DONE
      const res = await server()
        .patch('/api/work/tasks/bulk')
        .set(authHeaders())
        .send({
          taskIds: [taskId1, taskId2],
          status: TaskStatus.DONE,
        });

      // STRICT mode: fails entire request because taskId1 cannot transition
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
      expect(res.body.invalidTransitions).toHaveLength(1);
      expect(res.body.invalidTransitions[0].id).toBe(taskId1);
    });
  });
});
