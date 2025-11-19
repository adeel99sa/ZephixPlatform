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

describe('Resource Intelligence v1 (E2E)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  // Test data
  let org1: Organization;
  let org2: Organization;
  let adminUser: User;
  let workspace1: Workspace;
  let project1: Project;
  let resource1: Resource;
  let resource2: Resource;
  let allocation1: ResourceAllocation;

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

    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true
    }));

    app.setGlobalPrefix('api');

    await app.init();

    dataSource = app.get(DataSource);

    if (dataSource && dataSource.isInitialized) {
      await cleanupTestData();
    }

    // Create test organization
    const timestamp = Date.now();
    org1 = await createTestOrganization(`Resource Test Org ${timestamp}`);
    org2 = await createTestOrganization(`Resource Test Org 2 ${timestamp}`);

    // Create test user
    const testEmailSuffix = `-${timestamp}@resource-test.com`;
    adminUser = await createTestUser(`admin${testEmailSuffix}`, 'Admin', 'User', org1.id, 'admin');

    // Create UserOrganization entry
    await createUserOrganization(adminUser.id, org1.id, 'admin');

    // Create test workspace
    workspace1 = await createTestWorkspace('Resource Test Workspace', org1.id, adminUser.id);

    // Create test project
    project1 = await createTestProject('Resource Test Project', org1.id, workspace1.id);

    // Create test resources
    resource1 = await createTestResource(
      'Resource One',
      'resource1@test.com',
      'developer',
      ['JavaScript', 'TypeScript', 'React'],
      org1.id,
    );

    resource2 = await createTestResource(
      'Resource Two',
      'resource2@test.com',
      'designer',
      ['Figma', 'UI/UX'],
      org1.id,
    );

    // Create test allocation
    const startDate = new Date();
    const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

    allocation1 = await createTestAllocation(
      resource1.id,
      project1.id,
      org1.id,
      startDate,
      endDate,
      50, // 50% allocation
    );

    // Get auth token
    adminToken = await getAuthToken(adminUser.email, 'password123');
  });

  afterAll(async () => {
    if (dataSource && dataSource.isInitialized) {
      await cleanupTestData();
    }
    await app.close();
  });

  describe('Resource Directory Filters', () => {
    it('Should filter resources by skills', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/resources')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ skills: 'JavaScript' });

      expect(response.status).toBe(200);
      // Response format: { data: { data: [...] } } from responseService.success
      const data = response.body.data?.data || response.body.data || response.body;
      expect(Array.isArray(data)).toBe(true);

      // Should include resource1 (has JavaScript skill)
      const found = data.find((r: any) => r.id === resource1.id);
      expect(found).toBeDefined();
      expect(found.skills).toContain('JavaScript');

      // Should not include resource2 (no JavaScript skill)
      const notFound = data.find((r: any) => r.id === resource2.id);
      expect(notFound).toBeUndefined();
    });

    it('Should filter resources by roles', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/resources')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ roles: 'developer' });

      expect(response.status).toBe(200);
      // Response format: { data: { data: [...] } } from responseService.success
      const data = response.body.data?.data || response.body.data || response.body;
      expect(Array.isArray(data)).toBe(true);

      // Should include resource1 (developer role)
      const found = data.find((r: any) => r.id === resource1.id);
      expect(found).toBeDefined();
      expect(found.role).toBe('developer');

      // Should not include resource2 (designer role)
      const notFound = data.find((r: any) => r.id === resource2.id);
      expect(notFound).toBeUndefined();
    });

    it('Should filter resources by workspaceId', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/resources')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ workspaceId: workspace1.id });

      expect(response.status).toBe(200);
      // Response format: { data: { data: [...] } } from responseService.success
      const data = response.body.data?.data || response.body.data || response.body;
      expect(Array.isArray(data)).toBe(true);

      // Should include resource1 (has allocation in workspace1)
      const found = data.find((r: any) => r.id === resource1.id);
      expect(found).toBeDefined();
    });

    it('Should filter resources by date range', async () => {
      const dateFrom = new Date().toISOString().split('T')[0];
      const dateTo = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const response = await request(app.getHttpServer())
        .get('/api/resources')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ dateFrom, dateTo });

      expect(response.status).toBe(200);
      // Response format: { data: { data: [...] } } from responseService.success
      const data = response.body.data?.data || response.body.data || response.body;
      expect(Array.isArray(data)).toBe(true);

      // Should include resource1 (has allocation in date range)
      const found = data.find((r: any) => r.id === resource1.id);
      expect(found).toBeDefined();
    });

    it('Should respect organization isolation', async () => {
      // Create resource in org2
      const org2Resource = await createTestResource(
        'Org2 Resource',
        'org2@test.com',
        'developer',
        ['JavaScript'],
        org2.id,
      );

      const response = await request(app.getHttpServer())
        .get('/api/resources')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ skills: 'JavaScript' });

      expect(response.status).toBe(200);
      // Response format: { data: { data: [...] } } from responseService.success
      const data = response.body.data?.data || response.body.data || response.body;
      expect(Array.isArray(data)).toBe(true);

      // Should not include org2 resource
      const org2Found = data.find((r: any) => r.id === org2Resource.id);
      expect(org2Found).toBeUndefined();
    });
  });

  describe('Capacity Summary Endpoint', () => {
    it('Should return capacity summary for resources', async () => {
      const dateFrom = new Date().toISOString().split('T')[0];
      const dateTo = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const response = await request(app.getHttpServer())
        .get('/api/resources/capacity-summary')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ dateFrom, dateTo });

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);

      // Should include resource1
      const resource1Summary = response.body.data.find((s: any) => s.id === resource1.id);
      expect(resource1Summary).toBeDefined();
      expect(resource1Summary.displayName).toBeDefined();
      expect(resource1Summary.totalCapacityHours).toBeGreaterThan(0);
      expect(resource1Summary.totalAllocatedHours).toBeGreaterThanOrEqual(0);
      expect(resource1Summary.utilizationPercentage).toBeGreaterThanOrEqual(0);
      expect(resource1Summary.utilizationPercentage).toBeLessThanOrEqual(100);
    });

    it('Should filter capacity summary by workspaceId', async () => {
      const dateFrom = new Date().toISOString().split('T')[0];
      const dateTo = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const response = await request(app.getHttpServer())
        .get('/api/resources/capacity-summary')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ dateFrom, dateTo, workspaceId: workspace1.id });

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();

      // Should include resource1 (has allocation in workspace1)
      const resource1Summary = response.body.data.find((s: any) => s.id === resource1.id);
      expect(resource1Summary).toBeDefined();
    });

    it('Should require dateFrom and dateTo', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/resources/capacity-summary')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
    });
  });

  describe('Capacity Breakdown Endpoint', () => {
    it('Should return capacity breakdown for a resource', async () => {
      const dateFrom = new Date().toISOString().split('T')[0];
      const dateTo = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const response = await request(app.getHttpServer())
        .get(`/api/resources/${resource1.id}/capacity-breakdown`)
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ dateFrom, dateTo });

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);

      // Should include project1 breakdown
      const projectBreakdown = response.body.data.find((b: any) => b.projectId === project1.id);
      expect(projectBreakdown).toBeDefined();
      expect(projectBreakdown.projectName).toBe(project1.name);
      expect(projectBreakdown.workspaceId).toBe(workspace1.id);
      expect(projectBreakdown.totalAllocatedHours).toBeGreaterThanOrEqual(0);
      expect(projectBreakdown.percentageOfResourceTime).toBeGreaterThanOrEqual(0);
    });

    it('Should return 404 for cross-org resource', async () => {
      // Create resource in org2
      const org2Resource = await createTestResource(
        'Org2 Resource',
        'org2@test.com',
        'developer',
        [],
        org2.id,
      );

      const dateFrom = new Date().toISOString().split('T')[0];
      const dateTo = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const response = await request(app.getHttpServer())
        .get(`/api/resources/${org2Resource.id}/capacity-breakdown`)
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ dateFrom, dateTo });

      expect(response.status).toBe(404);
    });

    it('Should return empty list if no allocations in range', async () => {
      const dateFrom = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const dateTo = new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const response = await request(app.getHttpServer())
        .get(`/api/resources/${resource1.id}/capacity-breakdown`)
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ dateFrom, dateTo });

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(0);
    });
  });

  describe('Skills Facet Endpoint', () => {
    it('Should return skills with counts', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/resources/skills')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);

      // Should include skills from resource1 and resource2
      const javascriptSkill = response.body.data.find((s: any) => s.name === 'JavaScript');
      expect(javascriptSkill).toBeDefined();
      expect(javascriptSkill.count).toBeGreaterThan(0);
    });

    it('Should only return skills from caller organization', async () => {
      // Create resource in org2 with unique skill
      await createTestResource(
        'Org2 Resource',
        'org2@test.com',
        'developer',
        ['UniqueOrg2Skill'],
        org2.id,
      );

      const response = await request(app.getHttpServer())
        .get('/api/resources/skills')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);

      // Should not include org2 skill
      const org2Skill = response.body.data.find((s: any) => s.name === 'UniqueOrg2Skill');
      expect(org2Skill).toBeUndefined();
    });
  });

  // Helper functions
  async function cleanupTestData() {
    try {
      if (!dataSource || !dataSource.isInitialized) {
        return;
      }

      try {
        await dataSource.getRepository(ResourceAllocation).delete({});
      } catch (e) { /* table might not exist */ }

      try {
        await dataSource.getRepository(Resource).delete({});
      } catch (e) { /* table might not exist */ }

      try {
        await dataSource.getRepository(Project).delete({});
      } catch (e) { /* table might not exist */ }

      try {
        await dataSource.getRepository(Workspace).delete({});
      } catch (e) { /* table might not exist */ }

      try {
        await dataSource.getRepository(UserOrganization).delete({});
      } catch (e) { /* table might not exist */ }

      try {
        await dataSource.getRepository(User).delete({});
      } catch (e) { /* table might not exist */ }

      try {
        await dataSource.getRepository(Organization).delete({});
      } catch (e) { /* table might not exist */ }
    } catch (error) {
      console.warn('Cleanup warning:', error.message);
    }
  }

  async function createTestOrganization(name: string): Promise<Organization> {
    const orgRepo = dataSource.getRepository(Organization);
    const uniqueSlug = `${name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;

    const existing = await orgRepo.findOne({ where: { slug: uniqueSlug } });
    if (existing) {
      return existing;
    }

    const org = orgRepo.create({
      name,
      slug: uniqueSlug,
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
      password: hashedPassword,
      firstName,
      lastName,
      organizationId,
      role,
      isActive: true,
      isEmailVerified: true,
    });
    return userRepo.save(user);
  }

  async function createUserOrganization(
    userId: string,
    organizationId: string,
    role: 'owner' | 'admin' | 'pm' | 'viewer',
  ): Promise<UserOrganization> {
    const userOrgRepo = dataSource.getRepository(UserOrganization);
    const userOrg = userOrgRepo.create({
      userId,
      organizationId,
      role,
      isActive: true,
      joinedAt: new Date(),
    });
    return userOrgRepo.save(userOrg);
  }

  async function createTestWorkspace(
    name: string,
    organizationId: string,
    ownerId: string,
  ): Promise<Workspace> {
    const wsRepo = dataSource.getRepository(Workspace);
    const workspace = wsRepo.create({
      name,
      slug: name.toLowerCase().replace(/\s+/g, '-'),
      organizationId,
      createdBy: ownerId,
      ownerId,
      isPrivate: false,
    });
    return wsRepo.save(workspace);
  }

  async function createTestProject(
    name: string,
    organizationId: string,
    workspaceId: string,
  ): Promise<Project> {
    const projectRepo = dataSource.getRepository(Project);
    const project = projectRepo.create({
      name,
      workspaceId,
      organizationId,
      status: 'planning' as any,
      priority: 'medium' as any,
      riskLevel: 'medium' as any,
      methodology: 'agile',
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
    return resourceRepo.save(resource);
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
    return allocationRepo.save(allocation);
  }

  async function getAuthToken(email: string, password: string): Promise<string> {
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password })
      .expect((res) => {
        if (res.status !== 200 && res.status !== 201) {
          throw new Error(`Expected 200 or 201, got ${res.status}`);
        }
      });

    return response.body.accessToken || response.body.token;
  }
});

