import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { Project, ProjectState, ProjectHealth } from '../src/modules/projects/entities/project.entity';
import { WorkTask } from '../src/modules/work-management/entities/work-task.entity';
import { WorkPhase } from '../src/modules/work-management/entities/work-phase.entity';
import { TaskStatus, TaskType } from '../src/modules/work-management/enums/task.enums';
import { Program } from '../src/modules/programs/entities/program.entity';
import { ProjectHealthService } from '../src/modules/work-management/services/project-health.service';

describe('Work Management Overview E2E', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let authToken: string;
  let organizationId: string;
  let workspaceId: string;

  beforeAll(async () => {
    // Prevent demo user restrictions during tests
    process.env.DEMO_BOOTSTRAP = 'false';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    dataSource = moduleFixture.get<DataSource>(DataSource);
    await app.init();

    // Login and get token
    const loginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: process.env.TEST_USER_EMAIL || 'test@example.com',
        password: process.env.TEST_USER_PASSWORD || 'password123',
      });

    if (loginResponse.status !== 200) {
      throw new Error(`Login failed: ${JSON.stringify(loginResponse.body)}`);
    }

    authToken = loginResponse.body.data?.accessToken || loginResponse.body.accessToken;
    organizationId = loginResponse.body.data?.organizationId || loginResponse.body.organizationId;

    // Get or create workspace
    const workspacesResponse = await request(app.getHttpServer())
      .get('/api/workspaces')
      .set('Authorization', `Bearer ${authToken}`);

    if (workspacesResponse.status === 200 && workspacesResponse.body.data?.length > 0) {
      workspaceId = workspacesResponse.body.data[0].id;
    } else {
      // Create workspace if none exists
      const createWorkspaceResponse = await request(app.getHttpServer())
        .post('/api/workspaces')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Test Workspace' });

      workspaceId = createWorkspaceResponse.body.data.id;
    }
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Project Overview', () => {
    let projectId: string;

    afterAll(async () => {
      // Cleanup
      if (projectId) {
        const taskRepo = dataSource.getRepository(WorkTask);
        await taskRepo.delete({ projectId });

        const phaseRepo = dataSource.getRepository(WorkPhase);
        await phaseRepo.delete({ projectId });

        const projectRepo = dataSource.getRepository(Project);
        await projectRepo.delete({ id: projectId });
      }
    });

    it('should return AT_RISK when 3 tasks are overdue', async () => {
      // Arrange: Create project
      const projectRepo = dataSource.getRepository(Project);
      const project = projectRepo.create({
        name: 'AT_RISK Test Project',
        organizationId,
        workspaceId,
        status: 'planning' as any,
        state: ProjectState.DRAFT,
        structureLocked: false,
      });
      const savedProject = await projectRepo.save(project);
      projectId = savedProject.id;

      // Create default phase
      const phaseRepo = dataSource.getRepository(WorkPhase);
      const phase = phaseRepo.create({
        organizationId,
        workspaceId,
        projectId,
        name: 'Work',
        sortOrder: 0,
        reportingKey: 'work',
        isMilestone: false,
        isLocked: false,
      });
      const savedPhase = await phaseRepo.save(phase);

      // Create 3 overdue tasks
      const taskRepo = dataSource.getRepository(WorkTask);
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1); // 1 day ago

      for (let i = 0; i < 3; i++) {
        const task = taskRepo.create({
          organizationId,
          workspaceId,
          projectId,
          phaseId: savedPhase.id,
          title: `Overdue Task ${i + 1}`,
          status: TaskStatus.IN_PROGRESS,
          type: 'TASK' as any,
          priority: 'MEDIUM' as any,
          dueDate: pastDate,
        });
        await taskRepo.save(task);
      }

      // Act: Get project overview
      const response = await request(app.getHttpServer())
        .get(`/api/work/projects/${projectId}/overview`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-workspace-id', workspaceId)
        .expect(200);

      // Assert: Health is AT_RISK
      expect(response.body.data.healthCode).toBe(ProjectHealth.AT_RISK);
      expect(response.body.data.needsAttention.length).toBeGreaterThan(0);
      expect(response.body.data.nextActions.length).toBeLessThanOrEqual(3);
    });

    it('should return BLOCKED when 1 blocked task is due in 3 days', async () => {
      // Arrange: Create project
      const projectRepo = dataSource.getRepository(Project);
      const project = projectRepo.create({
        name: 'BLOCKED Test Project',
        organizationId,
        workspaceId,
        status: 'planning' as any,
        state: ProjectState.DRAFT,
        structureLocked: false,
      });
      const savedProject = await projectRepo.save(project);
      projectId = savedProject.id;

      // Create default phase
      const phaseRepo = dataSource.getRepository(WorkPhase);
      const phase = phaseRepo.create({
        organizationId,
        workspaceId,
        projectId,
        name: 'Work',
        sortOrder: 0,
        reportingKey: 'work',
        isMilestone: false,
        isLocked: false,
      });
      const savedPhase = await phaseRepo.save(phase);

      // Create 1 blocked task due in 3 days
      const taskRepo = dataSource.getRepository(WorkTask);
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 3); // 3 days from now

      const task = taskRepo.create({
        organizationId,
        workspaceId,
        projectId,
        phaseId: savedPhase.id,
        title: 'Blocked Task',
        status: TaskStatus.BLOCKED,
        type: 'TASK' as any,
        priority: 'MEDIUM' as any,
        dueDate: futureDate,
      });
      await taskRepo.save(task);

      // Act: Get project overview
      const response = await request(app.getHttpServer())
        .get(`/api/work/projects/${projectId}/overview`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-workspace-id', workspaceId)
        .expect(200);

      // Assert: Health is BLOCKED
      expect(response.body.data.healthCode).toBe(ProjectHealth.BLOCKED);
      expect(response.body.data.needsAttention.some((item: any) => item.typeCode === 'TASK_BLOCKED')).toBe(true);
    });

    it('should return HEALTHY when all tasks are fixed', async () => {
      // Arrange: Create project
      const projectRepo = dataSource.getRepository(Project);
      const project = projectRepo.create({
        name: 'HEALTHY Test Project',
        organizationId,
        workspaceId,
        status: 'planning' as any,
        state: ProjectState.DRAFT,
        structureLocked: false,
      });
      const savedProject = await projectRepo.save(project);
      projectId = savedProject.id;

      // Create default phase
      const phaseRepo = dataSource.getRepository(WorkPhase);
      const phase = phaseRepo.create({
        organizationId,
        workspaceId,
        projectId,
        name: 'Work',
        sortOrder: 0,
        reportingKey: 'work',
        isMilestone: false,
        isLocked: false,
      });
      const savedPhase = await phaseRepo.save(phase);

      // Create tasks with good statuses
      const taskRepo = dataSource.getRepository(WorkTask);
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30); // 30 days from now

      const task = taskRepo.create({
        organizationId,
        workspaceId,
        projectId,
        phaseId: savedPhase.id,
        title: 'Healthy Task',
        status: TaskStatus.IN_PROGRESS,
        type: 'TASK' as any,
        priority: 'MEDIUM' as any,
        dueDate: futureDate,
      });
      await taskRepo.save(task);

      // Act: Get project overview
      const response = await request(app.getHttpServer())
        .get(`/api/work/projects/${projectId}/overview`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-workspace-id', workspaceId)
        .expect(200);

      // Assert: Health is HEALTHY
      expect(response.body.data.health).toBe(ProjectHealth.HEALTHY);
    });

    it('should verify typeCodes appear in needsAttention', async () => {
      // Arrange: Create project with various issues
      const projectRepo = dataSource.getRepository(Project);
      const project = projectRepo.create({
        name: 'TypeCodes Test Project',
        organizationId,
        workspaceId,
        status: 'planning' as any,
        state: ProjectState.DRAFT,
        structureLocked: false,
      });
      const savedProject = await projectRepo.save(project);
      projectId = savedProject.id;

      // Create default phase
      const phaseRepo = dataSource.getRepository(WorkPhase);
      const phase = phaseRepo.create({
        organizationId,
        workspaceId,
        projectId,
        name: 'Work',
        sortOrder: 0,
        reportingKey: 'work',
        isMilestone: false,
        isLocked: false,
      });
      const savedPhase = await phaseRepo.save(phase);

      // Create task without owner
      const taskRepo = dataSource.getRepository(WorkTask);
      const task = taskRepo.create({
        organizationId,
        workspaceId,
        projectId,
        phaseId: savedPhase.id,
        title: 'Task Without Owner',
        status: TaskStatus.TODO,
        type: 'TASK' as any,
        priority: 'MEDIUM' as any,
        assigneeUserId: null,
      });
      await taskRepo.save(task);

      // Act: Get project overview
      const response = await request(app.getHttpServer())
        .get(`/api/work/projects/${projectId}/overview`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-workspace-id', workspaceId)
        .expect(200);

      // Assert: typeCodes appear
      expect(response.body.data.needsAttention.length).toBeGreaterThan(0);
      const typeCodes = response.body.data.needsAttention.map((item: any) => item.typeCode);
      expect(typeCodes).toContain('MISSING_OWNER');
      expect(response.body.data.nextActions.length).toBeLessThanOrEqual(3);
    });

    it('should ensure reasonText has no quotes and is under 100 chars', async () => {
      // Arrange: Create project with various issues
      const projectRepo = dataSource.getRepository(Project);
      const project = projectRepo.create({
        name: 'ReasonText Format Test Project',
        organizationId,
        workspaceId,
        status: 'planning' as any,
        state: ProjectState.DRAFT,
        structureLocked: false,
      });
      const savedProject = await projectRepo.save(project);
      projectId = savedProject.id;

      // Create default phase
      const phaseRepo = dataSource.getRepository(WorkPhase);
      const phase = phaseRepo.create({
        organizationId,
        workspaceId,
        projectId,
        name: 'Work',
        sortOrder: 0,
        reportingKey: 'work',
        isMilestone: false,
        isLocked: false,
      });
      const savedPhase = await phaseRepo.save(phase);

      // Create overdue task
      const taskRepo = dataSource.getRepository(WorkTask);
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const task = taskRepo.create({
        organizationId,
        workspaceId,
        projectId,
        phaseId: savedPhase.id,
        title: 'Test Task With Long Title That Should Be Truncated If Too Long',
        status: TaskStatus.IN_PROGRESS,
        type: TaskType.TASK,
        priority: 'MEDIUM' as any,
        dueDate: pastDate,
      });
      await taskRepo.save(task);

      // Act: Get project overview
      const response = await request(app.getHttpServer())
        .get(`/api/work/projects/${projectId}/overview`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-workspace-id', workspaceId)
        .expect(200);

      // Assert: No quotes in reasonText, all under 100 chars
      const needsAttention = response.body.data.needsAttention;
      expect(needsAttention.length).toBeGreaterThan(0);

      for (const item of needsAttention) {
        expect(item.reasonText).not.toContain('"');
        expect(item.reasonText).not.toContain("'");
        expect(item.reasonText.length).toBeLessThan(100);
        expect(item.nextStepLabel).toBeDefined();
      }
    });
  });

  describe('behindTargetDays Gating', () => {
    let projectId: string;

    afterAll(async () => {
      // Cleanup
      if (projectId) {
        const taskRepo = dataSource.getRepository(WorkTask);
        await taskRepo.delete({ projectId });

        const phaseRepo = dataSource.getRepository(WorkPhase);
        await phaseRepo.delete({ projectId });

        const projectRepo = dataSource.getRepository(Project);
        await projectRepo.delete({ id: projectId });
      }
    });

    it('should return behindTargetDays null when project has no milestones', async () => {
      // Arrange: Create project with no milestones
      const projectRepo = dataSource.getRepository(Project);
      const project = projectRepo.create({
        name: 'No Milestones Test Project',
        organizationId,
        workspaceId,
        status: 'planning' as any,
        state: ProjectState.DRAFT,
        structureLocked: false,
      });
      const savedProject = await projectRepo.save(project);
      projectId = savedProject.id;

      // Create default phase (not a milestone)
      const phaseRepo = dataSource.getRepository(WorkPhase);
      const phase = phaseRepo.create({
        organizationId,
        workspaceId,
        projectId,
        name: 'Work',
        sortOrder: 0,
        reportingKey: 'work',
        isMilestone: false,
        isLocked: false,
      });
      await phaseRepo.save(phase);

      // Create regular task
      const taskRepo = dataSource.getRepository(WorkTask);
      const task = taskRepo.create({
        organizationId,
        workspaceId,
        projectId,
        phaseId: phase.id,
        title: 'Regular Task',
        status: TaskStatus.IN_PROGRESS,
        type: TaskType.TASK,
        priority: 'MEDIUM' as any,
      });
      await taskRepo.save(task);

      // Act: Get project overview
      const response = await request(app.getHttpServer())
        .get(`/api/work/projects/${projectId}/overview`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-workspace-id', workspaceId)
        .expect(200);

      // Assert: behindTargetDays is null
      expect(response.body.data.behindTargetDays).toBeNull();
    });

    it('should return behindTargetDays >= 1 when milestone task is overdue', async () => {
      // Arrange: Create project with overdue milestone task
      const projectRepo = dataSource.getRepository(Project);
      const project = projectRepo.create({
        name: 'Milestone Overdue Test Project',
        organizationId,
        workspaceId,
        status: 'planning' as any,
        state: ProjectState.DRAFT,
        structureLocked: false,
      });
      const savedProject = await projectRepo.save(project);
      projectId = savedProject.id;

      // Create default phase
      const phaseRepo = dataSource.getRepository(WorkPhase);
      const phase = phaseRepo.create({
        organizationId,
        workspaceId,
        projectId,
        name: 'Work',
        sortOrder: 0,
        reportingKey: 'work',
        isMilestone: false,
        isLocked: false,
      });
      const savedPhase = await phaseRepo.save(phase);

      // Create overdue milestone task (due yesterday)
      const taskRepo = dataSource.getRepository(WorkTask);
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1); // 1 day ago

      const milestoneTask = taskRepo.create({
        organizationId,
        workspaceId,
        projectId,
        phaseId: savedPhase.id,
        title: 'Milestone Task',
        status: TaskStatus.IN_PROGRESS,
        type: TaskType.MILESTONE,
        priority: 'MEDIUM' as any,
        dueDate: yesterday,
      });
      await taskRepo.save(milestoneTask);

      // Trigger health recalculation to persist health
      const projectHealthService = app.get(ProjectHealthService);
      await projectHealthService.recalculateProjectHealth(projectId, organizationId, workspaceId);

      // Act: Get project overview
      const response = await request(app.getHttpServer())
        .get(`/api/work/projects/${projectId}/overview`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-workspace-id', workspaceId)
        .expect(200);

      // Assert: behindTargetDays is exactly 1 (yesterday - today = 1 day)
      expect(response.body.data.behindTargetDays).toBe(1);
    });
  });

  describe('Program Overview', () => {
    let programId: string;
    let project1Id: string;
    let project2Id: string;

    afterAll(async () => {
      // Cleanup
      if (project1Id) {
        const taskRepo = dataSource.getRepository(WorkTask);
        await taskRepo.delete({ projectId: project1Id });

        const phaseRepo = dataSource.getRepository(WorkPhase);
        await phaseRepo.delete({ projectId: project1Id });

        const projectRepo = dataSource.getRepository(Project);
        await projectRepo.delete({ id: project1Id });
      }

      if (project2Id) {
        const taskRepo = dataSource.getRepository(WorkTask);
        await taskRepo.delete({ projectId: project2Id });

        const phaseRepo = dataSource.getRepository(WorkPhase);
        await phaseRepo.delete({ projectId: project2Id });

        const projectRepo = dataSource.getRepository(Project);
        await projectRepo.delete({ id: project2Id });
      }

      if (programId) {
        const programRepo = dataSource.getRepository(Program);
        await programRepo.delete({ id: programId });
      }
    });

    it('should return BLOCKED when one child project is blocked', async () => {
      // Arrange: Create program
      const programRepo = dataSource.getRepository(Program);
      const program = programRepo.create({
        name: 'BLOCKED Program Test',
        organizationId,
        portfolioId: null as any, // Programs might not require portfolio in test
      });
      const savedProgram = await programRepo.save(program);
      programId = savedProgram.id;

      // Create project 1 (blocked)
      const projectRepo = dataSource.getRepository(Project);
      const project1 = projectRepo.create({
        name: 'Blocked Project',
        organizationId,
        workspaceId,
        programId: programId,
        status: 'planning' as any,
        state: ProjectState.DRAFT,
        structureLocked: false,
      });
      const savedProject1 = await projectRepo.save(project1);
      project1Id = savedProject1.id;

      // Create phase and blocked task for project 1
      const phaseRepo = dataSource.getRepository(WorkPhase);
      const phase1 = phaseRepo.create({
        organizationId,
        workspaceId,
        projectId: project1Id,
        name: 'Work',
        sortOrder: 0,
        reportingKey: 'work',
        isMilestone: false,
        isLocked: false,
      });
      const savedPhase1 = await phaseRepo.save(phase1);

      const taskRepo = dataSource.getRepository(WorkTask);
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 3);

      const blockedTask = taskRepo.create({
        organizationId,
        workspaceId,
        projectId: project1Id,
        phaseId: savedPhase1.id,
        title: 'Blocked Task',
        status: TaskStatus.BLOCKED,
        type: 'TASK' as any,
        priority: 'MEDIUM' as any,
        dueDate: futureDate,
      });
      await taskRepo.save(blockedTask);

      // Create project 2 (healthy)
      const project2 = projectRepo.create({
        name: 'Healthy Project',
        organizationId,
        workspaceId,
        programId: programId,
        status: 'planning' as any,
        state: ProjectState.DRAFT,
        structureLocked: false,
      });
      const savedProject2 = await projectRepo.save(project2);
      project2Id = savedProject2.id;

      // Act: Get program overview
      const response = await request(app.getHttpServer())
        .get(`/api/work/programs/${programId}/overview`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-workspace-id', workspaceId)
        .expect(200);

      // Assert: Program health is BLOCKED
      expect(response.body.data.healthCode).toBe(ProjectHealth.BLOCKED);
      expect(response.body.data.needsAttention.length).toBeGreaterThan(0);
      expect(response.body.data.nextActions.length).toBeLessThanOrEqual(3);
    });
  });
});

