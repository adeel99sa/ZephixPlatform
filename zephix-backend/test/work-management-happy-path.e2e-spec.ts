import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { ProjectTemplate } from '../src/modules/templates/entities/project-template.entity';

/**
 * Happy Path E2E Test: Work Management Spine
 *
 * Proves the critical user journey:
 * 1. Create workspace
 * 2. Create template with 1 phase + 1 task
 * 3. Instantiate v5.1 into a project
 * 4. GET /work/projects/:id/plan returns phase and task
 * 5. POST /work/tasks creates a second task
 * 6. GET plan returns both tasks
 *
 * Pass criteria:
 * - Uses x-workspace-id header
 * - Status 200 and 201 only
 * - No legacy endpoints used
 */
describe('Work Management Happy Path (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let authToken: string;
  let organizationId: string;
  let workspaceId: string;
  let templateId: string;
  let projectId: string;
  let phaseId: string;

  beforeAll(async () => {
    process.env.DEMO_BOOTSTRAP = 'false';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    dataSource = moduleFixture.get<DataSource>(DataSource);
    await app.init();
  });

  afterAll(async () => {
    // Cleanup test template
    if (templateId) {
      try {
        const templateRepo = dataSource.getRepository(ProjectTemplate);
        await templateRepo.delete({ id: templateId });
      } catch {
        // Ignore cleanup errors
      }
    }
    await app.close();
  });

  const server = () => request(app.getHttpServer());

  const authHeaders = () => ({
    Authorization: `Bearer ${authToken}`,
    'x-workspace-id': workspaceId,
  });

  it('Step 1: Login and get auth token', async () => {
    const res = await server()
      .post('/api/auth/login')
      .send({
        email: process.env.TEST_USER_EMAIL || 'test@example.com',
        password: process.env.TEST_USER_PASSWORD || 'password123',
      });

    expect(res.status).toBe(200);
    authToken = res.body.data?.accessToken || res.body.accessToken;
    organizationId = res.body.data?.organizationId || res.body.organizationId;
    expect(authToken).toBeDefined();
    expect(organizationId).toBeDefined();
  });

  it('Step 2: Create or get workspace', async () => {
    // Try to get existing workspace first
    const listRes = await server()
      .get('/api/workspaces')
      .set('Authorization', `Bearer ${authToken}`);

    if (listRes.status === 200 && listRes.body.data?.length > 0) {
      workspaceId = listRes.body.data[0].id;
    } else {
      // Create new workspace
      const createRes = await server()
        .post('/api/workspaces')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: `HappyPath Test ${Date.now()}` });

      expect(createRes.status).toBe(201);
      workspaceId = createRes.body.data?.id || createRes.body.id;
    }

    expect(workspaceId).toBeDefined();
  });

  it('Step 3: Create template with 1 phase and 1 task', async () => {
    const templateRepo = dataSource.getRepository(ProjectTemplate);
    const template = templateRepo.create({
      name: `HappyPath Template ${Date.now()}`,
      organizationId,
      structure: {
        phases: [
          {
            name: 'Planning Phase',
            order: 0,
            tasks: [
              { name: 'Initial Task', description: 'Created from template' },
            ],
          },
        ],
      },
      isActive: true,
    });
    const saved = await templateRepo.save(template);
    templateId = saved.id;
    expect(templateId).toBeDefined();
  });

  it('Step 4: Instantiate template v5.1 into a project', async () => {
    const res = await server()
      .post('/api/work/projects')
      .set(authHeaders())
      .send({
        name: `HappyPath Project ${Date.now()}`,
        templateId,
        startDate: new Date().toISOString().split('T')[0],
      });

    expect(res.status).toBe(201);
    projectId = res.body.data?.id || res.body.id;
    expect(projectId).toBeDefined();
  });

  it('Step 5: GET /work/projects/:id/plan returns phase and task', async () => {
    const res = await server()
      .get(`/api/work/projects/${projectId}/plan`)
      .set(authHeaders());

    expect(res.status).toBe(200);

    const plan = res.body.data || res.body;
    expect(plan).toBeDefined();

    // Should have at least one phase
    const phases = plan.phases || [];
    expect(phases.length).toBeGreaterThanOrEqual(1);

    // First phase should have at least one task (from template)
    const firstPhase = phases[0];
    expect(firstPhase).toBeDefined();
    phaseId = firstPhase.id || firstPhase.phaseId;
    expect(phaseId).toBeDefined();

    const tasks = firstPhase.tasks || [];
    expect(tasks.length).toBeGreaterThanOrEqual(1);
    expect(tasks[0].title || tasks[0].name).toBeDefined();
  });

  it('Step 6: POST /work/tasks creates a second task', async () => {
    const res = await server()
      .post('/api/work/tasks')
      .set(authHeaders())
      .send({
        projectId,
        phaseId,
        title: 'Second Task - Added via API',
        description: 'Created in happy path test',
      });

    expect(res.status).toBe(201);
    const task = res.body.data || res.body;
    expect(task.id).toBeDefined();
    expect(task.title).toBe('Second Task - Added via API');
  });

  it('Step 7: GET plan returns both tasks', async () => {
    const res = await server()
      .get(`/api/work/projects/${projectId}/plan`)
      .set(authHeaders());

    expect(res.status).toBe(200);

    const plan = res.body.data || res.body;
    const phases = plan.phases || [];
    expect(phases.length).toBeGreaterThanOrEqual(1);

    // Find the phase we added the task to
    const targetPhase = phases.find((p: any) => (p.id || p.phaseId) === phaseId);
    expect(targetPhase).toBeDefined();

    const tasks = targetPhase.tasks || [];
    expect(tasks.length).toBeGreaterThanOrEqual(2);

    // Verify both tasks exist
    const taskTitles = tasks.map((t: any) => t.title || t.name);
    expect(taskTitles).toContain('Initial Task');
    expect(taskTitles).toContain('Second Task - Added via API');
  });

  it('Step 8: Verify no legacy endpoints used (sanity check)', async () => {
    // Attempt legacy POST - should return 410
    const legacyRes = await server()
      .post(`/api/projects/${projectId}/tasks`)
      .set(authHeaders())
      .send({ title: 'Should fail' });

    expect(legacyRes.status).toBe(410);
    expect(legacyRes.body?.code).toBe('LEGACY_ENDPOINT_DISABLED');
  });
});
