import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { Organization } from '../src/organizations/entities/organization.entity';
import { User } from '../src/modules/users/entities/user.entity';
import { Workspace } from '../src/modules/workspaces/entities/workspace.entity';
import { UserOrganization } from '../src/organizations/entities/user-organization.entity';
import { WorkspaceMember } from '../src/modules/workspaces/entities/workspace-member.entity';
import * as bcrypt from 'bcrypt';
import {
  getTaskTrafficCounters,
  resetTaskTrafficCounters,
  taskTrafficCounterHandler,
} from '../src/middleware/task-traffic-counter.middleware';

/**
 * MVP flow must hit /api/work/tasks only; legacy counters must stay zero.
 * Uses same AppModule middleware chain as prod (TaskTrafficCounterMiddleware forRoutes('*')).
 */
describe('Work task traffic counters (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let authToken: string;
  let workspaceId: string;
  let savedLegacyFlag: string | undefined;

  beforeAll(async () => {
    savedLegacyFlag = process.env.LEGACY_TASKS_ENABLED;
    process.env.LEGACY_TASKS_ENABLED = 'false';
    process.env.DEMO_BOOTSTRAP = 'false';

    resetTaskTrafficCounters();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    // Prepend counter in same path as production so workTasks increments (e2e uses same AppModule but handler must run before response)
    const expressApp = app.getHttpAdapter().getInstance();
    expressApp.use(taskTrafficCounterHandler);
    dataSource = moduleFixture.get<DataSource>(DataSource);
    await app.init();

    const orgRepo = dataSource.getRepository(Organization);
    const org = await orgRepo.save({
      name: 'Traffic Counter Org',
      slug: 'traffic-counter-' + Date.now(),
      domain: 'trafficcounter.com',
    });

    const hashedPassword = await bcrypt.hash('password123', 10);
    const userRepo = dataSource.getRepository(User);
    const user = await userRepo.save({
      email: `traffic-${Date.now()}@example.com`,
      firstName: 'Traffic',
      lastName: 'User',
      password: hashedPassword,
      emailVerifiedAt: new Date(),
      organizationId: org.id,
    });

    const uoRepo = dataSource.getRepository(UserOrganization);
    await uoRepo.save({ userId: user.id, organizationId: org.id, role: 'pm' });

    const workspaceRepo = dataSource.getRepository(Workspace);
    const workspace = await workspaceRepo.save({
      name: 'Traffic Counter Workspace',
      organizationId: org.id,
      createdBy: user.id,
      isPrivate: false,
    });
    workspaceId = workspace.id;

    const memberRepo = dataSource.getRepository(WorkspaceMember);
    await memberRepo.save({
      workspaceId,
      userId: user.id,
      role: 'workspace_owner',
    });

    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: user.email, password: 'password123' });
    if (loginRes.status !== 200 && loginRes.status !== 201) {
      throw new Error(`Login failed: ${JSON.stringify(loginRes.body)}`);
    }
    authToken = loginRes.body.data?.accessToken || loginRes.body.accessToken;
  });

  afterAll(async () => {
    if (savedLegacyFlag !== undefined) {
      process.env.LEGACY_TASKS_ENABLED = savedLegacyFlag;
    } else {
      delete process.env.LEGACY_TASKS_ENABLED;
    }
    await app.close();
  });

  it('MVP flow uses /api/work/tasks only; legacy counters stay zero', async () => {
    // Reset after app.init so boot traffic (login, etc.) cannot mask regression
    resetTaskTrafficCounters();

    const server = request(app.getHttpServer());
    const auth = { Authorization: `Bearer ${authToken}`, 'x-workspace-id': workspaceId };

    await server.get('/api/work/tasks').set(auth);
    await server.get('/api/work/tasks').query({ limit: 10 }).set(auth);

    const counters = getTaskTrafficCounters();
    expect(counters.legacyTasks).toBe(0);
    expect(counters.legacyProjectTasks).toBe(0);
    expect(counters.workTasks).toBeGreaterThan(0);
  });

  /** Contract: key MVP flows must not hit legacy routes. Assert no traffic to /api/tasks or /api/projects/:id/tasks. */
  it('MVP flows do not hit legacy task routes (exclusivity)', async () => {
    resetTaskTrafficCounters();

    const server = request(app.getHttpServer());
    const auth = { Authorization: `Bearer ${authToken}`, 'x-workspace-id': workspaceId };

    await server.get('/api/work/tasks').set(auth);
    await server.get('/api/work/tasks').query({ limit: 5, offset: 0 }).set(auth);

    const counters = getTaskTrafficCounters();
    expect(counters.legacyTasks).toBe(0);
    expect(counters.legacyProjectTasks).toBe(0);
    expect(counters.workTasks).toBeGreaterThan(0);
  });
});
