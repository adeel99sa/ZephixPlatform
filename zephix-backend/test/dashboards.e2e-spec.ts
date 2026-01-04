import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { User } from '../src/modules/users/entities/user.entity';
import { Organization } from '../src/organizations/entities/organization.entity';
import { Workspace } from '../src/modules/workspaces/entities/workspace.entity';
import { UserOrganization } from '../src/organizations/entities/user-organization.entity';
import { Dashboard } from '../src/modules/dashboards/entities/dashboard.entity';
import { DashboardWidget } from '../src/modules/dashboards/entities/dashboard-widget.entity';
import { DashboardTemplate } from '../src/modules/dashboards/entities/dashboard-template.entity';
import * as bcrypt from 'bcrypt';

describe('Dashboards E2E Tests', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  // Test data
  let org1: Organization;
  let adminUser1: User;
  let workspace1: Workspace;
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

  async function loginUser(email: string, password: string): Promise<string> {
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password });
    return response.body.data?.accessToken || response.body.accessToken;
  }

  async function cleanupTestData() {
    const widgetRepo = dataSource.getRepository(DashboardWidget);
    const dashboardRepo = dataSource.getRepository(Dashboard);
    const templateRepo = dataSource.getRepository(DashboardTemplate);
    const workspaceRepo = dataSource.getRepository(Workspace);
    const uoRepo = dataSource.getRepository(UserOrganization);
    const userRepo = dataSource.getRepository(User);
    const orgRepo = dataSource.getRepository(Organization);

    await widgetRepo.delete({});
    await dashboardRepo.delete({});
    await templateRepo.delete({});
    await workspaceRepo.delete({});
    await uoRepo.delete({});
    await userRepo.delete({});
    await orgRepo.delete({});
  }

  beforeAll(async () => {
    // Disable demo bootstrap during tests
    process.env.DEMO_BOOTSTRAP = 'false';

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

    // Wait for dataSource to be initialized with retries
    if (dataSource) {
      let retries = 10;
      while (!dataSource.isInitialized && retries > 0) {
        try {
          if (!dataSource.isInitialized) {
            await dataSource.initialize();
          }
        } catch (e) {
          // Ignore initialization errors, will retry
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
        retries--;
      }
    }

    if (dataSource && dataSource.isInitialized) {
      await cleanupTestData();
    }

    // Create test organization
    const timestamp = Date.now();
    org1 = await createTestOrganization(`Dashboard Test Org ${timestamp}`);

    // Create test user
    const testEmailSuffix = `-${timestamp}@dashboard-test.com`;
    adminUser1 = await createTestUser(
      `admin1${testEmailSuffix}`,
      'Admin',
      'User',
      org1.id,
      'admin',
    );

    // Create UserOrganization entry
    await createUserOrganization(adminUser1.id, org1.id, 'admin');

    // Create test workspace
    workspace1 = await createTestWorkspace(
      'Dashboard Test Workspace',
      org1.id,
      adminUser1.id,
    );

    // Login to get token
    adminToken1 = await loginUser(adminUser1.email, 'password123');
  });

  afterAll(async () => {
    if (dataSource && dataSource.isInitialized) {
      await cleanupTestData();
    }
    await app.close();
  });

  // A. Route order guard
  describe('Route Order Guard', () => {
    it('should route GET /api/dashboards/templates correctly and not hit :id handler', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/dashboards/templates')
        .set('Authorization', `Bearer ${adminToken1}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      // Should not be a single dashboard object (which would indicate :id route matched)
      expect(response.body.data.id).toBeUndefined();
    });
  });

  // B. Template activation
  describe('Template Activation', () => {
    it('should activate template and create dashboard with widgets', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/dashboards/activate-template')
        .set('Authorization', `Bearer ${adminToken1}`)
        .set('x-workspace-id', workspace1.id)
        .send({
          templateKey: 'resource_utilization_conflicts',
        });

      expect(response.status).toBe(201);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.isTemplateInstance).toBe(true);
      expect(response.body.data.templateKey).toBe('resource_utilization_conflicts');
      expect(response.body.data.widgets).toBeDefined();
      expect(Array.isArray(response.body.data.widgets)).toBe(true);
      expect(response.body.data.widgets.length).toBeGreaterThan(0);
    });
  });

  // C. Workspace scoping
  describe('Workspace Scoping', () => {
    it('should return 403 when calling analytics widget endpoint without x-workspace-id', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/analytics/widgets/project-health')
        .set('Authorization', `Bearer ${adminToken1}`);

      expect(response.status).toBe(403);
    });
  });

  // D. Widget allowlist enforcement
  describe('Widget Allowlist Enforcement', () => {
    let testDashboard: Dashboard;

    beforeAll(async () => {
      // Create a test dashboard
      const createResponse = await request(app.getHttpServer())
        .post('/api/dashboards')
        .set('Authorization', `Bearer ${adminToken1}`)
        .set('x-workspace-id', workspace1.id)
        .send({
          name: 'Test Dashboard',
          visibility: 'WORKSPACE',
        });

      testDashboard = createResponse.body.data;
    });

    it('should return 400 when creating widget with invalid widgetKey', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/dashboards/${testDashboard.id}/widgets`)
        .set('Authorization', `Bearer ${adminToken1}`)
        .set('x-workspace-id', workspace1.id)
        .send({
          widgetKey: 'invalid_widget_key',
          title: 'Invalid Widget',
          config: {},
          layout: { x: 0, y: 0, w: 4, h: 3 },
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('not allowed');
    });
  });

  // E. AI suggest
  describe('AI Suggest', () => {
    it('should return known templateKey for RESOURCE_MANAGER persona', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/ai/dashboards/suggest')
        .set('Authorization', `Bearer ${adminToken1}`)
        .set('x-workspace-id', workspace1.id)
        .send({
          persona: 'RESOURCE_MANAGER',
        });

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.templateKey).toBe('resource_utilization_conflicts');
      expect(response.body.data.widgetSuggestions).toBeDefined();
      expect(Array.isArray(response.body.data.widgetSuggestions)).toBe(true);
    });
  });

  // F. AI generate
  describe('AI Generate', () => {
    it('should return schema-valid dashboard patch', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/ai/dashboards/generate')
        .set('Authorization', `Bearer ${adminToken1}`)
        .set('x-workspace-id', workspace1.id)
        .send({
          prompt: 'Show me resource utilization and conflicts',
          persona: 'RESOURCE_MANAGER',
        });

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.name).toBeDefined();
      expect(response.body.data.visibility).toBe('WORKSPACE');
      expect(response.body.data.widgets).toBeDefined();
      expect(Array.isArray(response.body.data.widgets)).toBe(true);

      // Validate widget structure
      for (const widget of response.body.data.widgets) {
        expect(widget.widgetKey).toBeDefined();
        expect(widget.title).toBeDefined();
        expect(widget.config).toBeDefined();
        expect(widget.layout).toBeDefined();
        expect(typeof widget.layout.x).toBe('number');
        expect(typeof widget.layout.y).toBe('number');
        expect(typeof widget.layout.w).toBe('number');
        expect(typeof widget.layout.h).toBe('number');
      }
    });
  });
});

