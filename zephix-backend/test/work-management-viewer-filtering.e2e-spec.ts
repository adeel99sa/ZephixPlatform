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
import * as bcrypt from 'bcrypt';
import { ApiErrorFilter } from '../src/shared/filters/api-error.filter';

/**
 * VIEWER filtering and workspace access proof.
 * Ensures service-layer enforcement: viewer cannot access workspace B,
 * viewer cannot write in workspace A; member can write in A, cannot access B.
 */
describe('Work Management VIEWER filtering (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let org: Organization;
  let workspaceA: Workspace;
  let workspaceB: Workspace;
  let projectA: Project;
  let projectB: Project;
  let viewerA: User;
  let memberA: User;
  let viewerAToken: string;
  let memberAToken: string;
  let savedEnvWsMembership: string | undefined;

  beforeAll(async () => {
    savedEnvWsMembership = process.env.ZEPHIX_WS_MEMBERSHIP_V1;
    process.env.ZEPHIX_WS_MEMBERSHIP_V1 = '1';

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
    await dataSource.runMigrations();

    // Smoke check: projects.active_kpi_ids must exist or project inserts will fail
    const hasActiveKpiIds = await dataSource.query(
      `SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'active_kpi_ids'`,
    );
    if (!hasActiveKpiIds?.length) {
      throw new Error(
        'E2E schema drift: projects.active_kpi_ids missing. Run migrations (e.g. npm run migration:run) or use a dedicated test DB with migrations applied.',
      );
    }

    const orgRepo = dataSource.getRepository(Organization);
    org = await orgRepo.save({
      name: 'Viewer Filter Org',
      slug: 'viewer-filter-org-' + Date.now(),
      domain: 'viewerfilter.com',
    });

    const hashedPassword = await bcrypt.hash('password123', 10);
    const userRepo = dataSource.getRepository(User);
    viewerA = await userRepo.save({
      email: `viewer-a-${Date.now()}@example.com`,
      firstName: 'Viewer',
      lastName: 'A',
      password: hashedPassword,
      emailVerifiedAt: new Date(),
      organizationId: org.id,
    });
    memberA = await userRepo.save({
      email: `member-a-${Date.now()}@example.com`,
      firstName: 'Member',
      lastName: 'A',
      password: hashedPassword,
      emailVerifiedAt: new Date(),
      organizationId: org.id,
    });

    const uoRepo = dataSource.getRepository(UserOrganization);
    await uoRepo.save({ userId: viewerA.id, organizationId: org.id, role: 'pm' });
    await uoRepo.save({ userId: memberA.id, organizationId: org.id, role: 'pm' });

    const workspaceRepo = dataSource.getRepository(Workspace);
    workspaceA = await workspaceRepo.save({
      name: 'Workspace A',
      organizationId: org.id,
      createdBy: memberA.id,
      isPrivate: false,
    });
    workspaceB = await workspaceRepo.save({
      name: 'Workspace B',
      organizationId: org.id,
      createdBy: memberA.id,
      isPrivate: false,
    });

    const memberRepo = dataSource.getRepository(WorkspaceMember);
    await memberRepo.save({
      workspaceId: workspaceA.id,
      userId: viewerA.id,
      role: 'workspace_viewer',
    });
    await memberRepo.save({
      workspaceId: workspaceA.id,
      userId: memberA.id,
      role: 'workspace_owner',
    });
    // viewerA and memberA are NOT members of workspace B

    const projectRepo = dataSource.getRepository(Project);
    projectA = await projectRepo.save({
      name: 'Project A',
      organizationId: org.id,
      workspaceId: workspaceA.id,
      state: ProjectState.DRAFT,
      structureLocked: false,
      deliveryOwnerUserId: null,
    });
    projectB = await projectRepo.save({
      name: 'Project B',
      organizationId: org.id,
      workspaceId: workspaceB.id,
      state: ProjectState.DRAFT,
      structureLocked: false,
      deliveryOwnerUserId: null,
    });

    const viewerLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: viewerA.email, password: 'password123' });
    viewerAToken = viewerLogin.body.accessToken || viewerLogin.body.data?.accessToken;

    const memberLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: memberA.email, password: 'password123' });
    memberAToken = memberLogin.body.accessToken || memberLogin.body.data?.accessToken;
  });

  afterAll(async () => {
    if (savedEnvWsMembership !== undefined) {
      process.env.ZEPHIX_WS_MEMBERSHIP_V1 = savedEnvWsMembership;
    } else {
      delete process.env.ZEPHIX_WS_MEMBERSHIP_V1;
    }
    await app.close();
  });

  describe('viewerA cannot access workspace B', () => {
    it('viewerA GET /api/work/tasks with x-workspace-id = workspaceB returns 403', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/work/tasks')
        .set('Authorization', `Bearer ${viewerAToken}`)
        .set('x-workspace-id', workspaceB.id);

      expect(response.status).toBe(403);
      expect(response.body?.code === 'WORKSPACE_REQUIRED' || response.body?.code === 'FORBIDDEN_ROLE' || response.body?.message?.toLowerCase().includes('access')).toBe(true);
    });
  });

  describe('viewerA is read-only in workspace A', () => {
    it('viewerA POST /api/work/tasks in workspaceA returns 403', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/work/tasks')
        .set('Authorization', `Bearer ${viewerAToken}`)
        .set('x-workspace-id', workspaceA.id)
        .send({
          projectId: projectA.id,
          title: 'Task',
          status: 'TODO',
        });

      expect(response.status).toBe(403);
      expect(response.body?.code).toBe('FORBIDDEN_ROLE');
    });

    it('viewerA PATCH /api/work/tasks/:id in workspaceA returns 403', async () => {
      const phaseRepo = dataSource.getRepository(WorkPhase);
      const phase = await phaseRepo.save({
        organizationId: org.id,
        workspaceId: workspaceA.id,
        projectId: projectA.id,
        name: 'Phase',
        sortOrder: 0,
        reportingKey: 'phase',
        isMilestone: false,
        createdByUserId: memberA.id,
      });
      const taskRepo = dataSource.getRepository(WorkTask);
      const task = await taskRepo.save({
        organizationId: org.id,
        workspaceId: workspaceA.id,
        projectId: projectA.id,
        phaseId: phase.id,
        title: 'Task',
        status: TaskStatus.TODO,
      } as Partial<WorkTask>);

      const response = await request(app.getHttpServer())
        .patch(`/api/work/tasks/${task.id}`)
        .set('Authorization', `Bearer ${viewerAToken}`)
        .set('x-workspace-id', workspaceA.id)
        .send({ status: 'IN_PROGRESS' });

      expect(response.status).toBe(403);
      expect(response.body?.code).toBe('FORBIDDEN_ROLE');

      await taskRepo.delete({ id: task.id });
      await phaseRepo.delete({ id: phase.id });
    });

    it('viewerA DELETE /api/work/tasks/:id in workspaceA returns 403', async () => {
      const phaseRepo = dataSource.getRepository(WorkPhase);
      const phase = await phaseRepo.save({
        organizationId: org.id,
        workspaceId: workspaceA.id,
        projectId: projectA.id,
        name: 'Phase',
        sortOrder: 0,
        reportingKey: 'phase',
        isMilestone: false,
        createdByUserId: memberA.id,
      });
      const taskRepo = dataSource.getRepository(WorkTask);
      const task = await taskRepo.save({
        organizationId: org.id,
        workspaceId: workspaceA.id,
        projectId: projectA.id,
        phaseId: phase.id,
        title: 'Task',
        status: TaskStatus.TODO,
      } as Partial<WorkTask>);

      const response = await request(app.getHttpServer())
        .delete(`/api/work/tasks/${task.id}`)
        .set('Authorization', `Bearer ${viewerAToken}`)
        .set('x-workspace-id', workspaceA.id);

      expect(response.status).toBe(403);
      expect(response.body?.code).toBe('FORBIDDEN_ROLE');

      await taskRepo.delete({ id: task.id });
      await phaseRepo.delete({ id: phase.id });
    });
  });

  describe('memberA can read and write in workspace A', () => {
    it('memberA GET /api/work/tasks in workspaceA returns 200', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/work/tasks')
        .set('Authorization', `Bearer ${memberAToken}`)
        .set('x-workspace-id', workspaceA.id);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
    });

    it('memberA POST /api/work/tasks in workspaceA returns 201', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/work/tasks')
        .set('Authorization', `Bearer ${memberAToken}`)
        .set('x-workspace-id', workspaceA.id)
        .send({
          projectId: projectA.id,
          title: 'Member Task',
          status: 'TODO',
        });

      expect(response.status).toBe(201);
      expect(response.body.data?.id).toBeDefined();

      const taskRepo = dataSource.getRepository(WorkTask);
      await taskRepo.delete({ id: response.body.data.id });
    });

    it('memberA PATCH /api/work/tasks/:id in workspaceA returns 200', async () => {
      const phaseRepo = dataSource.getRepository(WorkPhase);
      const phase = await phaseRepo.save({
        organizationId: org.id,
        workspaceId: workspaceA.id,
        projectId: projectA.id,
        name: 'Phase',
        sortOrder: 0,
        reportingKey: 'phase',
        isMilestone: false,
        createdByUserId: memberA.id,
      });
      const taskRepo = dataSource.getRepository(WorkTask);
      const task = await taskRepo.save({
        organizationId: org.id,
        workspaceId: workspaceA.id,
        projectId: projectA.id,
        phaseId: phase.id,
        title: 'Task',
        status: TaskStatus.TODO,
      } as Partial<WorkTask>);

      const response = await request(app.getHttpServer())
        .patch(`/api/work/tasks/${task.id}`)
        .set('Authorization', `Bearer ${memberAToken}`)
        .set('x-workspace-id', workspaceA.id)
        .send({ status: 'IN_PROGRESS' });

      expect(response.status).toBe(200);
      expect(response.body.data?.status).toBe('IN_PROGRESS');

      await taskRepo.delete({ id: task.id });
      await phaseRepo.delete({ id: phase.id });
    });

    it('memberA DELETE /api/work/tasks/:id in workspaceA returns 200', async () => {
      const phaseRepo = dataSource.getRepository(WorkPhase);
      const phase = await phaseRepo.save({
        organizationId: org.id,
        workspaceId: workspaceA.id,
        projectId: projectA.id,
        name: 'Phase',
        sortOrder: 0,
        reportingKey: 'phase',
        isMilestone: false,
        createdByUserId: memberA.id,
      });
      const taskRepo = dataSource.getRepository(WorkTask);
      const task = await taskRepo.save({
        organizationId: org.id,
        workspaceId: workspaceA.id,
        projectId: projectA.id,
        phaseId: phase.id,
        title: 'Task',
        status: TaskStatus.TODO,
      } as Partial<WorkTask>);

      const response = await request(app.getHttpServer())
        .delete(`/api/work/tasks/${task.id}`)
        .set('Authorization', `Bearer ${memberAToken}`)
        .set('x-workspace-id', workspaceA.id);

      expect(response.status).toBe(200);

      await phaseRepo.delete({ id: phase.id });
    });
  });

  describe('memberA cannot access workspace B', () => {
    it('memberA GET /api/work/tasks with x-workspace-id = workspaceB returns 403', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/work/tasks')
        .set('Authorization', `Bearer ${memberAToken}`)
        .set('x-workspace-id', workspaceB.id);

      expect(response.status).toBe(403);
    });
  });

  describe('viewer sub-resources: read allowed in workspace A, write blocked', () => {
    let taskInA: WorkTask;
    let phaseId: string;

    beforeAll(async () => {
      const phaseRepo = dataSource.getRepository(WorkPhase);
      const phase = await phaseRepo.save({
        organizationId: org.id,
        workspaceId: workspaceA.id,
        projectId: projectA.id,
        name: 'Phase',
        sortOrder: 0,
        reportingKey: 'phase',
        isMilestone: false,
        createdByUserId: memberA.id,
      });
      phaseId = phase.id;
      const taskRepo = dataSource.getRepository(WorkTask);
      taskInA = await taskRepo.save({
        organizationId: org.id,
        workspaceId: workspaceA.id,
        projectId: projectA.id,
        phaseId: phase.id,
        title: 'Task for viewer sub-resource',
        status: TaskStatus.TODO,
      } as Partial<WorkTask>);
    });

    afterAll(async () => {
      if (taskInA?.id) {
        const taskRepo = dataSource.getRepository(WorkTask);
        await taskRepo.delete({ id: taskInA.id });
      }
      if (phaseId) {
        const phaseRepo = dataSource.getRepository(WorkPhase);
        await phaseRepo.delete({ id: phaseId });
      }
    });

    it('viewerA GET /api/work/tasks/:id/comments in workspaceA returns 200', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/work/tasks/${taskInA.id}/comments`)
        .set('Authorization', `Bearer ${viewerAToken}`)
        .set('x-workspace-id', workspaceA.id);
      expect(res.status).toBe(200);
    });

    it('viewerA GET /api/work/tasks/:id/activity in workspaceA returns 200', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/work/tasks/${taskInA.id}/activity`)
        .set('Authorization', `Bearer ${viewerAToken}`)
        .set('x-workspace-id', workspaceA.id);
      expect(res.status).toBe(200);
    });

    it('viewerA POST /api/work/tasks/:id/comments in workspaceA returns 403', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/work/tasks/${taskInA.id}/comments`)
        .set('Authorization', `Bearer ${viewerAToken}`)
        .set('x-workspace-id', workspaceA.id)
        .send({ body: 'Viewer comment' });
      expect(res.status).toBe(403);
      expect(res.body?.code).toBe('FORBIDDEN_ROLE');
    });

    it('viewerA POST /api/work/tasks/:id/dependencies in workspaceA returns 403', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/work/tasks/${taskInA.id}/dependencies`)
        .set('Authorization', `Bearer ${viewerAToken}`)
        .set('x-workspace-id', workspaceA.id)
        .send({ predecessorTaskId: taskInA.id, type: 'FINISH_TO_START' });
      expect(res.status).toBe(403);
      expect(res.body?.code).toBe('FORBIDDEN_ROLE');
    });

    it('viewerA DELETE /api/work/tasks/:id/dependencies in workspaceA returns 403', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/work/tasks/${taskInA.id}/dependencies`)
        .set('Authorization', `Bearer ${viewerAToken}`)
        .set('x-workspace-id', workspaceA.id)
        .send({ predecessorTaskId: taskInA.id });
      expect(res.status).toBe(403);
      expect(res.body?.code).toBe('FORBIDDEN_ROLE');
    });
  });

  describe('cross-workspace: viewer with workspace B header returns 403 on sub-resources', () => {
    let taskInA: WorkTask;
    let phaseId: string;

    beforeAll(async () => {
      const phaseRepo = dataSource.getRepository(WorkPhase);
      const phase = await phaseRepo.save({
        organizationId: org.id,
        workspaceId: workspaceA.id,
        projectId: projectA.id,
        name: 'Phase',
        sortOrder: 0,
        reportingKey: 'phase',
        isMilestone: false,
        createdByUserId: memberA.id,
      });
      phaseId = phase.id;
      const taskRepo = dataSource.getRepository(WorkTask);
      taskInA = await taskRepo.save({
        organizationId: org.id,
        workspaceId: workspaceA.id,
        projectId: projectA.id,
        phaseId: phase.id,
        title: 'Task for cross-ws test',
        status: TaskStatus.TODO,
      } as Partial<WorkTask>);
    });

    afterAll(async () => {
      if (taskInA?.id) {
        const taskRepo = dataSource.getRepository(WorkTask);
        await taskRepo.delete({ id: taskInA.id });
      }
      if (phaseId) {
        const phaseRepo = dataSource.getRepository(WorkPhase);
        await phaseRepo.delete({ id: phaseId });
      }
    });

    it('viewerA GET /api/work/tasks/:id with x-workspace-id = workspaceB returns 403', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/work/tasks/${taskInA.id}`)
        .set('Authorization', `Bearer ${viewerAToken}`)
        .set('x-workspace-id', workspaceB.id);
      expect(res.status).toBe(403);
    });

    it('viewerA GET /api/work/tasks/:id/comments with x-workspace-id = workspaceB returns 403', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/work/tasks/${taskInA.id}/comments`)
        .set('Authorization', `Bearer ${viewerAToken}`)
        .set('x-workspace-id', workspaceB.id);
      expect(res.status).toBe(403);
    });

    it('viewerA GET /api/work/tasks/:id/activity with x-workspace-id = workspaceB returns 403', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/work/tasks/${taskInA.id}/activity`)
        .set('Authorization', `Bearer ${viewerAToken}`)
        .set('x-workspace-id', workspaceB.id);
      expect(res.status).toBe(403);
    });
  });
});
