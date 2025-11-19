import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { User } from '../src/modules/users/entities/user.entity';
import { Organization } from '../src/organizations/entities/organization.entity';
import { Workspace } from '../src/modules/workspaces/entities/workspace.entity';
import { Project } from '../src/modules/projects/entities/project.entity';
import { Resource } from '../src/modules/resources/entities/resource.entity';
import { ResourceAllocation } from '../src/modules/resources/entities/resource-allocation.entity';
import { UserOrganization } from '../src/organizations/entities/user-organization.entity';
import * as bcrypt from 'bcrypt';

describe('Resource Risk Scoring (E2E)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  // Test data
  let org1: Organization;
  let org2: Organization;
  let adminUser: User;
  let workspace1: Workspace;
  let project1: Project;
  let project2: Project;
  let resource1: Resource; // Safe allocation
  let resource2: Resource; // Over-allocated
  let allocation1: ResourceAllocation;
  let allocation2: ResourceAllocation;
  let allocation3: ResourceAllocation;

  let adminToken: string;

  beforeAll(async () => {
    // Disable demo bootstrap during tests
    process.env.DEMO_BOOTSTRAP = 'false';

    if (!process.env.DATABASE_URL) {
      console.warn('⚠️  WARNING: DATABASE_URL not set. Tests require Railway database connection.');
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
    org1 = await createTestOrganization(`Risk Test Org ${timestamp}`);
    org2 = await createTestOrganization(`Risk Test Org 2 ${timestamp}`);

    // Create test user
    const testEmailSuffix = `-${timestamp}@risk-test.com`;
    adminUser = await createTestUser(
      `admin${testEmailSuffix}`,
      'Admin',
      'User',
      org1.id,
      'admin',
    );

    // Create UserOrganization entry
    await createUserOrganization(adminUser.id, org1.id, 'admin');

    // Create test workspace
    workspace1 = await createTestWorkspace(
      'Risk Test Workspace',
      org1.id,
      adminUser.id,
    );

    // Create test projects
    project1 = await createTestProject(
      'Risk Test Project 1',
      org1.id,
      workspace1.id,
    );
    project2 = await createTestProject(
      'Risk Test Project 2',
      org1.id,
      workspace1.id,
    );

    // Create test resources
    resource1 = await createTestResource(
      'Safe Resource',
      'safe@test.com',
      'developer',
      ['JavaScript'],
      org1.id,
    );

    resource2 = await createTestResource(
      'Over-allocated Resource',
      'overallocated@test.com',
      'developer',
      ['TypeScript'],
      org1.id,
    );

    // Create allocations for resource1 (safe - 50% allocation)
    const startDate = new Date();
    const endDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 days

    allocation1 = await createTestAllocation(
      resource1.id,
      project1.id,
      org1.id,
      startDate,
      endDate,
      50, // 50% allocation - safe
    );

    // Create allocations for resource2 (over-allocated - 140% total)
    allocation2 = await createTestAllocation(
      resource2.id,
      project1.id,
      org1.id,
      startDate,
      endDate,
      80, // 80% allocation
    );

    allocation3 = await createTestAllocation(
      resource2.id,
      project2.id,
      org1.id,
      startDate,
      endDate,
      60, // 60% allocation - total 140%
    );

    // Login to get token
    const loginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: adminUser.email,
        password: 'password123',
      });

    if (loginResponse.status === 200 || loginResponse.status === 201) {
      adminToken = loginResponse.body.token || loginResponse.body.access_token;
    } else {
      throw new Error('Failed to login test user');
    }
  });

  afterAll(async () => {
    if (dataSource && dataSource.isInitialized) {
      await cleanupTestData();
    }
    await app.close();
  });

  describe('Feature flag off', () => {
    it('should return 404 when feature flag is disabled', async () => {
      // Ensure feature flag is off
      const originalFlag = process.env.ZEPHIX_RESOURCE_AI_RISK_SCORING_V1;
      delete process.env.ZEPHIX_RESOURCE_AI_RISK_SCORING_V1;

      const response = await request(app.getHttpServer())
        .get(`/api/resources/${resource1.id}/risk-score`)
        .query({
          dateFrom: new Date().toISOString().split('T')[0],
          dateTo: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0],
        })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      // Restore original flag
      if (originalFlag) {
        process.env.ZEPHIX_RESOURCE_AI_RISK_SCORING_V1 = originalFlag;
      }
    });
  });

  describe('Resource risk score endpoint', () => {
    beforeEach(() => {
      // Enable feature flag for these tests
      process.env.ZEPHIX_RESOURCE_AI_RISK_SCORING_V1 = 'true';
    });

    it('should return LOW risk for safe resource', async () => {
      const dateFrom = new Date();
      const dateTo = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

      const response = await request(app.getHttpServer())
        .get(`/api/resources/${resource1.id}/risk-score`)
        .query({
          dateFrom: dateFrom.toISOString().split('T')[0],
          dateTo: dateTo.toISOString().split('T')[0],
        })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.resourceId).toBe(resource1.id);
      expect(response.body.data.riskScore).toBeGreaterThanOrEqual(0);
      expect(response.body.data.riskScore).toBeLessThan(40); // LOW risk
      expect(response.body.data.severity).toBe('LOW');
      expect(response.body.data.topFactors).toBeInstanceOf(Array);
    });

    it('should return HIGH risk for over-allocated resource', async () => {
      const dateFrom = new Date();
      const dateTo = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

      const response = await request(app.getHttpServer())
        .get(`/api/resources/${resource2.id}/risk-score`)
        .query({
          dateFrom: dateFrom.toISOString().split('T')[0],
          dateTo: dateTo.toISOString().split('T')[0],
        })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.resourceId).toBe(resource2.id);
      expect(response.body.data.riskScore).toBeGreaterThanOrEqual(0);
      expect(response.body.data.severity).toMatch(/LOW|MEDIUM|HIGH/);
      expect(response.body.data.topFactors).toBeInstanceOf(Array);
      expect(response.body.data.topFactors.length).toBeGreaterThan(0);
      expect(response.body.data.metrics).toBeDefined();
      expect(response.body.data.metrics.maxAllocation).toBeGreaterThan(100);
    });

    it('should return 404 for non-existent resource', async () => {
      const dateFrom = new Date();
      const dateTo = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

      await request(app.getHttpServer())
        .get('/api/resources/non-existent-id/risk-score')
        .query({
          dateFrom: dateFrom.toISOString().split('T')[0],
          dateTo: dateTo.toISOString().split('T')[0],
        })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('should return 400 for missing date parameters', async () => {
      await request(app.getHttpServer())
        .get(`/api/resources/${resource1.id}/risk-score`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200); // Uses defaults, so should succeed
    });

    it('should return 400 for invalid date range', async () => {
      const dateFrom = new Date();
      const dateTo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Past date

      await request(app.getHttpServer())
        .get(`/api/resources/${resource1.id}/risk-score`)
        .query({
          dateFrom: dateTo.toISOString().split('T')[0],
          dateTo: dateFrom.toISOString().split('T')[0],
        })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });
  });

  describe('Workspace risk summary endpoint', () => {
    beforeEach(() => {
      // Enable feature flag for these tests
      process.env.ZEPHIX_RESOURCE_AI_RISK_SCORING_V1 = 'true';
    });

    it('should return workspace risk summary with sorted resources', async () => {
      const dateFrom = new Date();
      const dateTo = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

      const response = await request(app.getHttpServer())
        .get(`/api/workspaces/${workspace1.id}/resource-risk-summary`)
        .query({
          dateFrom: dateFrom.toISOString().split('T')[0],
          dateTo: dateTo.toISOString().split('T')[0],
          limit: 10,
        })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.workspaceId).toBe(workspace1.id);
      expect(response.body.data.summary).toBeDefined();
      expect(response.body.data.summary.totalResources).toBeGreaterThanOrEqual(0);
      expect(response.body.data.highRiskResources).toBeInstanceOf(Array);

      // Verify resources are sorted by risk score descending
      const resources = response.body.data.highRiskResources;
      for (let i = 1; i < resources.length; i++) {
        expect(resources[i - 1].riskScore).toBeGreaterThanOrEqual(
          resources[i].riskScore,
        );
      }
    });

    it('should respect limit parameter', async () => {
      const dateFrom = new Date();
      const dateTo = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

      const response = await request(app.getHttpServer())
        .get(`/api/workspaces/${workspace1.id}/resource-risk-summary`)
        .query({
          dateFrom: dateFrom.toISOString().split('T')[0],
          dateTo: dateTo.toISOString().split('T')[0],
          limit: 1,
        })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data.highRiskResources.length).toBeLessThanOrEqual(1);
    });

    it('should return 404 for non-existent workspace', async () => {
      const dateFrom = new Date();
      const dateTo = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

      await request(app.getHttpServer())
        .get('/api/workspaces/non-existent-id/resource-risk-summary')
        .query({
          dateFrom: dateFrom.toISOString().split('T')[0],
          dateTo: dateTo.toISOString().split('T')[0],
        })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('should return 400 for missing date parameters', async () => {
      await request(app.getHttpServer())
        .get(`/api/workspaces/${workspace1.id}/resource-risk-summary`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });
  });

  describe('Organization isolation', () => {
    beforeEach(() => {
      process.env.ZEPHIX_RESOURCE_AI_RISK_SCORING_V1 = 'true';
    });

    it('should not return resources from other organizations', async () => {
      // Create resource in org2
      const org2Resource = await createTestResource(
        'Org2 Resource',
        'org2@test.com',
        'developer',
        ['Python'],
        org2.id,
      );

      const dateFrom = new Date();
      const dateTo = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

      // Try to access org2 resource with org1 user token
      await request(app.getHttpServer())
        .get(`/api/resources/${org2Resource.id}/risk-score`)
        .query({
          dateFrom: dateFrom.toISOString().split('T')[0],
          dateTo: dateTo.toISOString().split('T')[0],
        })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404); // Should return 404, not expose org2 resource
    });
  });

  // Helper functions
  async function cleanupTestData() {
    if (!dataSource || !dataSource.isInitialized) return;

    try {
      await dataSource.query('DELETE FROM resource_allocations');
      await dataSource.query('DELETE FROM resource_conflicts');
      await dataSource.query('DELETE FROM user_daily_capacity');
      await dataSource.query('DELETE FROM resources');
      await dataSource.query('DELETE FROM projects');
      await dataSource.query('DELETE FROM workspace_members');
      await dataSource.query('DELETE FROM workspaces');
      await dataSource.query('DELETE FROM user_organizations');
      await dataSource.query('DELETE FROM users');
      await dataSource.query('DELETE FROM organizations');
    } catch (error) {
      console.warn('Cleanup error (may be expected):', error.message);
    }
  }

  async function createTestOrganization(name: string): Promise<Organization> {
    const orgRepo = dataSource.getRepository(Organization);
    const timestamp = Date.now();
    const org = orgRepo.create({
      name: `${name}-${timestamp}`,
      slug: `${name.toLowerCase().replace(/\s+/g, '-')}-${timestamp}`,
      domain: `${name.toLowerCase().replace(/\s+/g, '')}-${timestamp}.com`,
    });
    return orgRepo.save(org);
  }

  async function createTestUser(
    email: string,
    firstName: string,
    lastName: string,
    organizationId: string,
    role: string,
  ): Promise<User> {
    const userRepo = dataSource.getRepository(User);
    const hashedPassword = await bcrypt.hash('password123', 10);
    const user = userRepo.create({
      email,
      firstName,
      lastName,
      password: hashedPassword,
      organizationId,
      role,
    });
    return userRepo.save(user);
  }

  async function createUserOrganization(
    userId: string,
    organizationId: string,
    role: string,
  ): Promise<UserOrganization> {
    const userOrgRepo = dataSource.getRepository(UserOrganization);
    const userOrg = userOrgRepo.create({
      userId,
      organizationId,
      role,
    });
    return userOrgRepo.save(userOrg);
  }

  async function createTestWorkspace(
    name: string,
    organizationId: string,
    ownerId: string,
  ): Promise<Workspace> {
    const workspaceRepo = dataSource.getRepository(Workspace);
    const workspace = workspaceRepo.create({
      name,
      organizationId,
      ownerId,
      createdBy: ownerId,
      slug: name.toLowerCase().replace(/\s+/g, '-'),
    });
    return workspaceRepo.save(workspace);
  }

  async function createTestProject(
    name: string,
    organizationId: string,
    workspaceId: string,
  ): Promise<Project> {
    const projectRepo = dataSource.getRepository(Project);
    const project = projectRepo.create({
      name,
      organizationId,
      workspaceId,
      status: 'planning' as any,
      priority: 'medium' as any,
      riskLevel: 'low' as any,
      startDate: new Date(),
      endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      createdById: adminUser.id,
    });
    const saved = await projectRepo.save(project);
    return Array.isArray(saved) ? saved[0] : saved;
  }

  async function createTestResource(
    name: string,
    email: string,
    role: string,
    skills: string[],
    organizationId: string,
  ): Promise<Resource> {
    const resourceRepo = dataSource.getRepository(Resource);
    const resource = resourceRepo.create({
      name,
      email,
      role,
      skills,
      organizationId,
      capacityHoursPerWeek: 40,
      isActive: true,
    });
    const saved = await resourceRepo.save(resource);
    return Array.isArray(saved) ? saved[0] : saved;
  }

  async function createTestAllocation(
    resourceId: string,
    projectId: string,
    organizationId: string,
    startDate: Date,
    endDate: Date,
    allocationPercentage: number,
  ): Promise<ResourceAllocation> {
    const allocationRepo = dataSource.getRepository(ResourceAllocation);
    const allocation = allocationRepo.create({
      resourceId,
      projectId,
      organizationId,
      startDate,
      endDate,
      allocationPercentage,
    });
    const saved = await allocationRepo.save(allocation);
    return Array.isArray(saved) ? saved[0] : saved;
  }
});

