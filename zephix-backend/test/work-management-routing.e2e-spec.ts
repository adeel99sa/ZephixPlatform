import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { User } from '../src/modules/users/entities/user.entity';
import { Organization } from '../src/organizations/entities/organization.entity';
import { Workspace } from '../src/modules/workspaces/entities/workspace.entity';
import { Project } from '../src/modules/projects/entities/project.entity';
import { UserOrganization } from '../src/organizations/entities/user-organization.entity';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

describe('Work Management Routing E2E Tests', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  // Test data
  let org1: Organization;
  let adminUser1: User;
  let workspace1: Workspace;
  let project1: Project;
  let adminToken1: string;

  // Helper functions
  async function createTestOrganization(name: string): Promise<Organization> {
    const orgRepo = dataSource.getRepository(Organization);
    return orgRepo.save({
      name,
      slug: name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now(),
      domain: `${name.toLowerCase().replace(/\s+/g, '')}.com`,
    });
  }

  async function createTestUser(
    email: string,
    firstName: string,
    lastName: string,
    orgId: string,
    role: string,
  ): Promise<User> {
    const userRepo = dataSource.getRepository(User);
    const hashedPassword = await bcrypt.hash('password123', 10);
    return userRepo.save({
      email,
      firstName,
      lastName,
      password: hashedPassword,
      emailVerifiedAt: new Date(),
    });
  }

  async function createUserOrganization(
    userId: string,
    orgId: string,
    role: 'owner' | 'admin' | 'pm' | 'viewer',
  ): Promise<UserOrganization> {
    const uoRepo = dataSource.getRepository(UserOrganization);
    return uoRepo.save({
      userId,
      organizationId: orgId,
      role: role as 'owner' | 'admin' | 'pm' | 'viewer',
    });
  }

  async function createTestWorkspace(
    name: string,
    orgId: string,
    createdBy: string,
  ): Promise<Workspace> {
    const workspaceRepo = dataSource.getRepository(Workspace);
    return workspaceRepo.save({
      name,
      organizationId: orgId,
      createdBy,
      isPrivate: false,
    });
  }

  async function createTestProject(
    name: string,
    orgId: string,
    workspaceId: string,
  ): Promise<Project> {
    const projectRepo = dataSource.getRepository(Project);
    return projectRepo.save({
      name,
      organizationId: orgId,
      workspaceId,
      status: 'planning' as any,
      startDate: new Date(),
      endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    });
  }

  async function loginUser(email: string, password: string): Promise<string> {
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password });
    return response.body.accessToken;
  }

  async function cleanupTestData() {
    const projectRepo = dataSource.getRepository(Project);
    const workspaceRepo = dataSource.getRepository(Workspace);
    const uoRepo = dataSource.getRepository(UserOrganization);
    const userRepo = dataSource.getRepository(User);
    const orgRepo = dataSource.getRepository(Organization);

    await projectRepo.delete({});
    await workspaceRepo.delete({});
    await uoRepo.delete({});
    await userRepo.delete({});
    await orgRepo.delete({});
  }

  beforeAll(async () => {
    process.env.DEMO_BOOTSTRAP = 'false';

    if (!process.env.DATABASE_URL) {
      console.warn('⚠️  WARNING: DATABASE_URL not set. Tests require database connection.');
    }

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

    if (dataSource && dataSource.isInitialized) {
      await cleanupTestData();
    }

    // Create test organization
    const timestamp = Date.now();
    org1 = await createTestOrganization(`WorkMgmt Test Org ${timestamp}`);

    // Create test user
    const testEmailSuffix = `-${timestamp}@workmgmt-test.com`;
    adminUser1 = await createTestUser(
      `admin1${testEmailSuffix}`,
      'Admin',
      'One',
      org1.id,
      'admin',
    );

    // Create UserOrganization entry
    await createUserOrganization(adminUser1.id, org1.id, 'admin' as 'admin');

    // Create test workspace
    workspace1 = await createTestWorkspace(
      'WorkMgmt Test Workspace',
      org1.id,
      adminUser1.id,
    );

    // Create test project
    project1 = await createTestProject(
      'WorkMgmt Test Project',
      org1.id,
      workspace1.id,
    );

    // Login user
    adminToken1 = await loginUser(adminUser1.email, 'password123');
  });

  afterAll(async () => {
    if (dataSource && dataSource.isInitialized) {
      await cleanupTestData();
    }
    if (app) {
      await app.close();
    }
  });

  describe('Route Order Guards', () => {
    it('PATCH /api/work/tasks/bulk should not route to :id handler (403 WORKSPACE_REQUIRED, not 404)', async () => {
      // Call bulk endpoint without workspace header
      // Should return 403 WORKSPACE_REQUIRED, not 404 Task not found
      const response = await request(app.getHttpServer())
        .patch('/api/work/tasks/bulk')
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          taskIds: [uuidv4()],
          status: 'IN_PROGRESS',
        });

      expect(response.status).toBe(403);
      expect(response.body.error?.code).toBe('WORKSPACE_REQUIRED');
      expect(response.body.error?.message).toContain('x-workspace-id');
      // Verify path is /bulk, not routed to :id
      expect(response.request.url).toContain('/bulk');
    });

    it('GET /api/work/tasks/:id/comments should route to comments handler (403 WORKSPACE_REQUIRED, not 404)', async () => {
      const randomTaskId = uuidv4();

      // Call comments endpoint without workspace header
      // Should return 403 WORKSPACE_REQUIRED, not 404 Task not found
      const response = await request(app.getHttpServer())
        .get(`/api/work/tasks/${randomTaskId}/comments`)
        .set('Authorization', `Bearer ${adminToken1}`);

      expect(response.status).toBe(403);
      expect(response.body.error?.code).toBe('WORKSPACE_REQUIRED');
      expect(response.body.error?.message).toContain('x-workspace-id');
      // Verify path includes /comments, not routed to :id
      expect(response.request.url).toContain('/comments');
    });

    it('GET /api/work/tasks/:id/activity should route to activity handler (403 WORKSPACE_REQUIRED, not 404)', async () => {
      const randomTaskId = uuidv4();

      // Call activity endpoint without workspace header
      // Should return 403 WORKSPACE_REQUIRED, not 404 Task not found
      const response = await request(app.getHttpServer())
        .get(`/api/work/tasks/${randomTaskId}/activity`)
        .set('Authorization', `Bearer ${adminToken1}`);

      expect(response.status).toBe(403);
      expect(response.body.error?.code).toBe('WORKSPACE_REQUIRED');
      expect(response.body.error?.message).toContain('x-workspace-id');
      // Verify path includes /activity, not routed to :id
      expect(response.request.url).toContain('/activity');
    });

    it('POST /api/work/tasks/:id/dependencies should route to dependencies handler (403 WORKSPACE_REQUIRED, not 404)', async () => {
      const randomTaskId = uuidv4();

      // Call dependencies endpoint without workspace header
      // Should return 403 WORKSPACE_REQUIRED, not 404 Task not found
      const response = await request(app.getHttpServer())
        .post(`/api/work/tasks/${randomTaskId}/dependencies`)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          predecessorTaskId: uuidv4(),
        });

      expect(response.status).toBe(403);
      expect(response.body.error?.code).toBe('WORKSPACE_REQUIRED');
      expect(response.body.error?.message).toContain('x-workspace-id');
      // Verify path includes /dependencies, not routed to :id
      expect(response.request.url).toContain('/dependencies');
    });
  });
});

