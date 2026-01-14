import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { Project, ProjectState } from '../src/modules/projects/entities/project.entity';
import { WorkPhase } from '../src/modules/work-management/entities/work-phase.entity';
import { WorkTask } from '../src/modules/work-management/entities/work-task.entity';
import { Program } from '../src/modules/programs/entities/program.entity';

describe('Work Management Sprint 2 E2E', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let authToken: string;
  let organizationId: string;
  let workspaceId: string;
  let projectId: string;

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

    // Create a test project in DRAFT state
    const projectRepo = dataSource.getRepository(Project);
    const project = projectRepo.create({
      name: 'Sprint 2 Test Project',
      organizationId,
      workspaceId,
      status: 'planning' as any,
      state: ProjectState.DRAFT,
      structureLocked: false,
      startedAt: null,
      structureSnapshot: null,
    });
    const savedProject = await projectRepo.save(project);
    projectId = savedProject.id;

    // Create a default phase for the project
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
  });

  afterAll(async () => {
    // Cleanup test data
    if (projectId) {
      const taskRepo = dataSource.getRepository(WorkTask);
      await taskRepo.delete({ projectId });

      const phaseRepo = dataSource.getRepository(WorkPhase);
      await phaseRepo.delete({ projectId });

      const projectRepo = dataSource.getRepository(Project);
      await projectRepo.delete({ id: projectId });
    }

    await app.close();
  });

  describe('POST /api/work/projects/:projectId/start', () => {
    it('should start work on DRAFT project and return ACTIVE state', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/work/projects/${projectId}/start`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-workspace-id', workspaceId)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.projectId).toBe(projectId);
      expect(response.body.data.state).toBe(ProjectState.ACTIVE);
      expect(response.body.data.structureLocked).toBe(true);
      expect(response.body.data.startedAt).toBeDefined();
    });

    it('should return 409 INVALID_STATE_TRANSITION when starting again', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/work/projects/${projectId}/start`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-workspace-id', workspaceId)
        .expect(409);

      // All errors serialize as { code, message } at top level
      expect(response.body.code).toBe('INVALID_STATE_TRANSITION');
      expect(response.body.message).toBeDefined();
      expect(response.body.error).toBeUndefined();
    });

    it('should persist phase locking after start', async () => {
      const phaseRepo = dataSource.getRepository(WorkPhase);
      const phases = await phaseRepo.find({
        where: { projectId },
      });

      expect(phases.length).toBeGreaterThan(0);
      for (const phase of phases) {
        expect(phase.isLocked).toBe(true);
      }
    });

    it('should persist project state and structure snapshot', async () => {
      const projectRepo = dataSource.getRepository(Project);
      const project = await projectRepo.findOne({
        where: { id: projectId },
      });

      expect(project).toBeDefined();
      expect(project.state).toBe(ProjectState.ACTIVE);
      expect(project.structureLocked).toBe(true);
      expect(project.startedAt).toBeDefined();
      expect(project.structureSnapshot).toBeDefined();
      expect(project.structureSnapshot.containerType).toBe('PROJECT');
      expect(project.structureSnapshot.containerId).toBe(projectId);
      expect(project.structureSnapshot.phases).toBeDefined();
      expect(Array.isArray(project.structureSnapshot.phases)).toBe(true);
    });
  });

  describe('GET /api/work/projects/:projectId/plan', () => {
    it('should include projectState and structureLocked in plan response', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/work/projects/${projectId}/plan`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-workspace-id', workspaceId)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.projectId).toBe(projectId);
      expect(response.body.data.projectState).toBe(ProjectState.ACTIVE);
      expect(response.body.data.structureLocked).toBe(true);
      expect(response.body.data.phases).toBeDefined();
      expect(Array.isArray(response.body.data.phases)).toBe(true);

      // Check that phases include isLocked
      if (response.body.data.phases.length > 0) {
        expect(response.body.data.phases[0].isLocked).toBeDefined();
        expect(response.body.data.phases[0].isLocked).toBe(true);
      }
    });
  });

  describe('Task creation after start', () => {
    it('should create task successfully after project start', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/work/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-workspace-id', workspaceId)
        .send({
          projectId,
          title: 'Sprint 2 Test Task',
          status: 'TODO',
          type: 'TASK',
          priority: 'MEDIUM',
        })
        .expect(201);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.title).toBe('Sprint 2 Test Task');
      expect(response.body.data.phaseId).toBeDefined(); // Auto-assigned phaseId

      // Cleanup
      const taskRepo = dataSource.getRepository(WorkTask);
      await taskRepo.delete({ id: response.body.data.id });
    });
  });

  describe('A. Lock persisted under plan API', () => {
    let testProjectId: string;
    let testPhaseId: string;

    beforeAll(async () => {
      // Arrange: Create project, create tasks, ensure phases exist
      const projectRepo = dataSource.getRepository(Project);
      const testProject = projectRepo.create({
        name: 'Lock Persisted Test Project',
        organizationId,
        workspaceId,
        status: 'planning' as any,
        state: ProjectState.DRAFT,
        structureLocked: false,
        startedAt: null,
        structureSnapshot: null,
      });
      const savedProject = await projectRepo.save(testProject);
      testProjectId = savedProject.id;

      // Create phase
      const phaseRepo = dataSource.getRepository(WorkPhase);
      const phase = phaseRepo.create({
        organizationId,
        workspaceId,
        projectId: testProjectId,
        name: 'Work',
        sortOrder: 0,
        reportingKey: 'work',
        isMilestone: false,
        isLocked: false,
      });
      const savedPhase = await phaseRepo.save(phase);
      testPhaseId = savedPhase.id;

      // Create a task
      const taskRepo = dataSource.getRepository(WorkTask);
      const task = taskRepo.create({
        organizationId,
        workspaceId,
        projectId: testProjectId,
        phaseId: testPhaseId,
        title: 'Test Task',
        status: 'TODO' as any,
        type: 'TASK' as any,
        priority: 'MEDIUM' as any,
      });
      await taskRepo.save(task);
    });

    afterAll(async () => {
      // Cleanup
      if (testProjectId) {
        const taskRepo = dataSource.getRepository(WorkTask);
        await taskRepo.delete({ projectId: testProjectId });

        const phaseRepo = dataSource.getRepository(WorkPhase);
        await phaseRepo.delete({ projectId: testProjectId });

        const projectRepo = dataSource.getRepository(Project);
        await projectRepo.delete({ id: testProjectId });
      }
    });

    it('should persist lock state in plan API after start', async () => {
      // Act: POST start
      await request(app.getHttpServer())
        .post(`/api/work/projects/${testProjectId}/start`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-workspace-id', workspaceId)
        .expect(200);

      // Act: GET project plan
      const planResponse = await request(app.getHttpServer())
        .get(`/api/work/projects/${testProjectId}/plan`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-workspace-id', workspaceId)
        .expect(200);

      // Assert: projectState ACTIVE, structureLocked true, each phase isLocked true
      expect(planResponse.body.data).toBeDefined();
      expect(planResponse.body.data.projectState).toBe(ProjectState.ACTIVE);
      expect(planResponse.body.data.structureLocked).toBe(true);
      expect(planResponse.body.data.phases).toBeDefined();
      expect(Array.isArray(planResponse.body.data.phases)).toBe(true);

      // Verify all phases are locked
      for (const phase of planResponse.body.data.phases) {
        expect(phase.isLocked).toBe(true);
      }
    });
  });

  describe('B. Program plan shape contract', () => {
    let testProgramId: string;
    let testProject1Id: string;
    let testProject2Id: string;

    beforeAll(async () => {
      // Arrange: Create program
      const programRepo = dataSource.getRepository(Program);
      const program = programRepo.create({
        name: 'Sprint 2 Test Program',
        organizationId,
      });
      const savedProgram = await programRepo.save(program);
      testProgramId = savedProgram.id;

      // Create 2 projects under that program
      const projectRepo = dataSource.getRepository(Project);
      const project1 = projectRepo.create({
        name: 'Program Test Project 1',
        organizationId,
        workspaceId,
        programId: testProgramId,
        status: 'planning' as any,
        state: ProjectState.DRAFT,
        structureLocked: false,
      });
      const savedProject1 = await projectRepo.save(project1);
      testProject1Id = savedProject1.id;

      const project2 = projectRepo.create({
        name: 'Program Test Project 2',
        organizationId,
        workspaceId,
        programId: testProgramId,
        status: 'planning' as any,
        state: ProjectState.DRAFT,
        structureLocked: false,
      });
      const savedProject2 = await projectRepo.save(project2);
      testProject2Id = savedProject2.id;

      // Ensure phases exist for each project
      const phaseRepo = dataSource.getRepository(WorkPhase);
      for (const projId of [testProject1Id, testProject2Id]) {
        const phase = phaseRepo.create({
          organizationId,
          workspaceId,
          projectId: projId,
          name: 'Work',
          sortOrder: 0,
          reportingKey: 'work',
          isMilestone: false,
          isLocked: false,
        });
        await phaseRepo.save(phase);

        // Create a task for each project
        const taskRepo = dataSource.getRepository(WorkTask);
        const task = taskRepo.create({
          organizationId,
          workspaceId,
          projectId: projId,
          phaseId: phase.id,
          title: `Task for ${projId}`,
          status: 'TODO' as any,
          type: 'TASK' as any,
          priority: 'MEDIUM' as any,
        });
        await taskRepo.save(task);
      }
    });

    afterAll(async () => {
      // Cleanup
      if (testProject1Id) {
        const taskRepo = dataSource.getRepository(WorkTask);
        await taskRepo.delete({ projectId: testProject1Id });
        const phaseRepo = dataSource.getRepository(WorkPhase);
        await phaseRepo.delete({ projectId: testProject1Id });
        const projectRepo = dataSource.getRepository(Project);
        await projectRepo.delete({ id: testProject1Id });
      }
      if (testProject2Id) {
        const taskRepo = dataSource.getRepository(WorkTask);
        await taskRepo.delete({ projectId: testProject2Id });
        const phaseRepo = dataSource.getRepository(WorkPhase);
        await phaseRepo.delete({ projectId: testProject2Id });
        const projectRepo = dataSource.getRepository(Project);
        await projectRepo.delete({ id: testProject2Id });
      }
      if (testProgramId) {
        const programRepo = dataSource.getRepository(Program);
        await programRepo.delete({ id: testProgramId });
      }
    });

    it('should return program plan with correct shape', async () => {
      // Act: GET program plan
      const response = await request(app.getHttpServer())
        .get(`/api/work/programs/${testProgramId}/plan`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-workspace-id', workspaceId)
        .expect(200);

      // Assert: programId exists, projects is array length 2, each project has phases array, phases contain tasks array
      expect(response.body.data).toBeDefined();
      expect(response.body.data.programId).toBe(testProgramId);
      expect(response.body.data.projects).toBeDefined();
      expect(Array.isArray(response.body.data.projects)).toBe(true);
      expect(response.body.data.projects.length).toBe(2);

      for (const project of response.body.data.projects) {
        expect(project.projectId).toBeDefined();
        expect(project.projectName).toBeDefined();
        expect(project.projectState).toBeDefined();
        expect(project.structureLocked).toBeDefined();
        expect(project.phases).toBeDefined();
        expect(Array.isArray(project.phases)).toBe(true);

        // Verify phases contain tasks array
        for (const phase of project.phases) {
          expect(phase.tasks).toBeDefined();
          expect(Array.isArray(phase.tasks)).toBe(true);
        }
      }
    });
  });
});

