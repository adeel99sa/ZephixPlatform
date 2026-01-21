import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { Project, ProjectState } from '../src/modules/projects/entities/project.entity';
import { WorkPhase } from '../src/modules/work-management/entities/work-phase.entity';
import { WorkTask } from '../src/modules/work-management/entities/work-task.entity';
import { ProjectTemplate } from '../src/modules/templates/entities/project-template.entity';

describe('Template Instantiate v5.1 E2E', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let authToken: string;
  let organizationId: string;
  let workspaceId: string;
  let templateId: string;

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

    // Create a test template with structure
    const templateRepo = dataSource.getRepository(ProjectTemplate);
    const template = templateRepo.create({
      name: 'Sprint 2.5 Test Template',
      organizationId,
      structure: {
        phases: [
          {
            name: 'Phase 1',
            order: 0,
            tasks: [
              { name: 'Task 1.1', description: 'First task' },
              { name: 'Task 1.2', description: 'Second task' },
            ],
          },
          {
            name: 'Phase 2',
            order: 1,
            tasks: [
              { name: 'Task 2.1', description: 'Third task' },
            ],
          },
        ],
      },
      isActive: true,
    });
    const savedTemplate = await templateRepo.save(template);
    templateId = savedTemplate.id;
  });

  afterAll(async () => {
    // Cleanup test data
    if (templateId) {
      const templateRepo = dataSource.getRepository(ProjectTemplate);
      await templateRepo.delete({ id: templateId });
    }

    await app.close();
  });

  describe('Test 1: Instantiation creates phase linked tasks', () => {
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

    it('should create WorkPhase and WorkTask entities with phaseId links', async () => {
      // Act: Call instantiate-v5_1
      const instantiateResponse = await request(app.getHttpServer())
        .post(`/api/templates/${templateId}/instantiate-v5_1`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-workspace-id', workspaceId)
        .send({
          projectName: 'Sprint 2.5 Test Project',
        })
        .expect(201);

      expect(instantiateResponse.body.data).toBeDefined();
      expect(instantiateResponse.body.data.projectId).toBeDefined();
      expect(instantiateResponse.body.data.projectName).toBe('Sprint 2.5 Test Project');
      expect(instantiateResponse.body.data.state).toBe(ProjectState.DRAFT);
      expect(instantiateResponse.body.data.structureLocked).toBe(false);
      expect(instantiateResponse.body.data.phaseCount).toBe(2);
      expect(instantiateResponse.body.data.taskCount).toBe(3);

      projectId = instantiateResponse.body.data.projectId;

      // Assert: WorkPhase rows exist
      const phaseRepo = dataSource.getRepository(WorkPhase);
      const phases = await phaseRepo.find({
        where: { projectId },
        order: { sortOrder: 'ASC' },
      });

      expect(phases.length).toBe(2);
      expect(phases[0].name).toBe('Phase 1');
      expect(phases[0].sortOrder).toBe(0);
      expect(phases[1].name).toBe('Phase 2');
      expect(phases[1].sortOrder).toBe(1);

      // Assert: WorkTask rows exist with phaseId
      const taskRepo = dataSource.getRepository(WorkTask);
      const tasks = await taskRepo.find({
        where: { projectId },
        order: { rank: 'ASC' },
      });

      expect(tasks.length).toBe(3);
      for (const task of tasks) {
        expect(task.phaseId).not.toBeNull();
        expect(task.phaseId).toBeDefined();
      }

      // Assert: Tasks are linked to correct phases
      const phase1Tasks = tasks.filter((t) => t.phaseId === phases[0].id);
      const phase2Tasks = tasks.filter((t) => t.phaseId === phases[1].id);

      expect(phase1Tasks.length).toBe(2);
      expect(phase2Tasks.length).toBe(1);

      // Act: Call GET project plan
      const planResponse = await request(app.getHttpServer())
        .get(`/api/work/projects/${projectId}/plan`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-workspace-id', workspaceId)
        .expect(200);

      // Assert: Plan contains phases and tasks with matching counts
      expect(planResponse.body.data).toBeDefined();
      expect(planResponse.body.data.phases).toBeDefined();
      expect(Array.isArray(planResponse.body.data.phases)).toBe(true);
      expect(planResponse.body.data.phases.length).toBe(2);

      const planPhase1 = planResponse.body.data.phases.find((p: any) => p.name === 'Phase 1');
      const planPhase2 = planResponse.body.data.phases.find((p: any) => p.name === 'Phase 2');

      expect(planPhase1).toBeDefined();
      expect(planPhase1.tasks).toBeDefined();
      expect(planPhase1.tasks.length).toBe(2);

      expect(planPhase2).toBeDefined();
      expect(planPhase2.tasks).toBeDefined();
      expect(planPhase2.tasks.length).toBe(1);
    });
  });

  describe('Test 2: Lock enforcement', () => {
    let projectId: string;

    beforeAll(async () => {
      // Create a project and start work
      const projectRepo = dataSource.getRepository(Project);
      const project = projectRepo.create({
        name: 'Lock Test Project',
        organizationId,
        workspaceId,
        status: 'planning' as any,
        state: ProjectState.DRAFT,
        structureLocked: false,
      });
      const savedProject = await projectRepo.save(project);
      projectId = savedProject.id;

      // Create a phase
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

      // Start work
      await request(app.getHttpServer())
        .post(`/api/work/projects/${projectId}/start`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-workspace-id', workspaceId)
        .expect(200);
    });

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

    it('should return 409 LOCKED_PHASE_STRUCTURE when instantiating into ACTIVE project', async () => {
      // Act: Try to instantiate into the ACTIVE project
      const response = await request(app.getHttpServer())
        .post(`/api/templates/${templateId}/instantiate-v5_1`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-workspace-id', workspaceId)
        .send({
          projectId,
        })
        .expect(409);

      // Assert: Error code is LOCKED_PHASE_STRUCTURE
      expect(response.body.code).toBe('LOCKED_PHASE_STRUCTURE');
      expect(response.body.message).toBeDefined();
    });
  });

  describe('Test A: Work plan initialized guard', () => {
    let projectId: string;

    beforeAll(async () => {
      // Create a DRAFT project
      const projectRepo = dataSource.getRepository(Project);
      const project = projectRepo.create({
        name: 'Initialized Guard Test Project',
        organizationId,
        workspaceId,
        status: 'planning' as any,
        state: ProjectState.DRAFT,
        structureLocked: false,
      });
      const savedProject = await projectRepo.save(project);
      projectId = savedProject.id;

      // Create a default phase
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

      // Create one task in it
      const taskRepo = dataSource.getRepository(WorkTask);
      const task = taskRepo.create({
        organizationId,
        workspaceId,
        projectId,
        phaseId: savedPhase.id,
        title: 'Existing Task',
        status: 'TODO' as any,
        type: 'TASK' as any,
        priority: 'MEDIUM' as any,
      });
      await taskRepo.save(task);
    });

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

    it('should return 409 WORK_PLAN_ALREADY_INITIALIZED when project has tasks', async () => {
      // Act: Attempt instantiate-v5_1 into same project
      const response = await request(app.getHttpServer())
        .post(`/api/templates/${templateId}/instantiate-v5_1`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-workspace-id', workspaceId)
        .send({
          projectId,
        })
        .expect(409);

      // Assert: Error code is WORK_PLAN_ALREADY_INITIALIZED
      expect(response.body.code).toBe('WORK_PLAN_ALREADY_INITIALIZED');
      expect(response.body.message).toBeDefined();
    });
  });

  describe('Test B: Workspace mismatch', () => {
    let workspaceBId: string;
    let projectInWorkspaceA: string;

    beforeAll(async () => {
      // Create a second workspace
      const createWorkspaceResponse = await request(app.getHttpServer())
        .post('/api/workspaces')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Workspace B' });

      workspaceBId = createWorkspaceResponse.body.data.id;

      // Create a project in workspace A (original workspace)
      const projectRepo = dataSource.getRepository(Project);
      const project = projectRepo.create({
        name: 'Workspace A Project',
        organizationId,
        workspaceId, // Original workspace (workspace A)
        status: 'planning' as any,
        state: ProjectState.DRAFT,
        structureLocked: false,
      });
      const savedProject = await projectRepo.save(project);
      projectInWorkspaceA = savedProject.id;
    });

    afterAll(async () => {
      // Cleanup
      if (projectInWorkspaceA) {
        const projectRepo = dataSource.getRepository(Project);
        await projectRepo.delete({ id: projectInWorkspaceA });
      }
      if (workspaceBId) {
        await request(app.getHttpServer())
          .delete(`/api/workspaces/${workspaceBId}`)
          .set('Authorization', `Bearer ${authToken}`);
      }
    });

    it('should return 403 FORBIDDEN when project workspace does not match header', async () => {
      // Arrange: Project is in workspace A, but we'll use workspace B header
      // Act: Attempt instantiation with workspace B header but project in workspace A
      // This should fail because the project belongs to workspace A, not workspace B
      const response = await request(app.getHttpServer())
        .post(`/api/templates/${templateId}/instantiate-v5_1`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-workspace-id', workspaceBId) // Workspace B header
        .send({
          projectId: projectInWorkspaceA, // Project in workspace A
        })
        .expect(403);

      // Assert: Error code is FORBIDDEN
      expect(response.body.code).toBe('FORBIDDEN');
      expect(response.body.message).toBeDefined();
      expect(response.body.message).toContain('does not belong to the specified workspace');
    });
  });

  describe('Test 3: Plan consistency', () => {
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

    it('should return consistent phase and task ordering across multiple calls', async () => {
      // Arrange: Instantiate template
      const instantiateResponse = await request(app.getHttpServer())
        .post(`/api/templates/${templateId}/instantiate-v5_1`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-workspace-id', workspaceId)
        .send({
          projectName: 'Consistency Test Project',
        })
        .expect(201);

      projectId = instantiateResponse.body.data.projectId;

      // Act: Call GET project plan twice
      const planResponse1 = await request(app.getHttpServer())
        .get(`/api/work/projects/${projectId}/plan`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-workspace-id', workspaceId)
        .expect(200);

      const planResponse2 = await request(app.getHttpServer())
        .get(`/api/work/projects/${projectId}/plan`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-workspace-id', workspaceId)
        .expect(200);

      // Assert: Strict equality of phase IDs in order (phases ordered by sortOrder ASC)
      const phaseIds1 = planResponse1.body.data.phases.map((p: any) => p.id);
      const phaseIds2 = planResponse2.body.data.phases.map((p: any) => p.id);
      expect(phaseIds1).toEqual(phaseIds2);
      expect(phaseIds1.length).toBeGreaterThan(0);

      // Assert: Strict equality of task IDs in order within each phase (tasks ordered by rank ASC)
      for (let i = 0; i < phaseIds1.length; i++) {
        const taskIds1 = planResponse1.body.data.phases[i].tasks.map((t: any) => t.id);
        const taskIds2 = planResponse2.body.data.phases[i].tasks.map((t: any) => t.id);
        expect(taskIds1).toEqual(taskIds2);
      }

      // Assert: Full phase structure equality (including sortOrder and rank)
      const phases1 = planResponse1.body.data.phases.map((p: any) => ({
        id: p.id,
        name: p.name,
        sortOrder: p.sortOrder,
        taskCount: p.tasks.length,
      }));
      const phases2 = planResponse2.body.data.phases.map((p: any) => ({
        id: p.id,
        name: p.name,
        sortOrder: p.sortOrder,
        taskCount: p.tasks.length,
      }));
      expect(phases1).toEqual(phases2);
    });
  });
});

