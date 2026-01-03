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
import { ResourceConflict } from '../src/modules/resources/entities/resource-conflict.entity';
import { UserOrganization } from '../src/organizations/entities/user-organization.entity';
import * as bcrypt from 'bcrypt';

describe('Resources Phase 2 E2E Tests', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  // Test data
  let org1: Organization;
  let org2: Organization;
  let adminUser1: User;
  let adminUser2: User;
  let workspace1: Workspace;
  let project1: Project;
  let resource1: Resource;
  let resource2: Resource;

  let adminToken1: string;
  let adminToken2: string;

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

  async function createTestResource(
    name: string,
    email: string,
    role: string,
    skills: string[],
    orgId: string,
    workspaceId?: string,
  ): Promise<Resource> {
    const resourceRepo = dataSource.getRepository(Resource);
    return resourceRepo.save({
      name,
      email,
      role,
      skills,
      organizationId: orgId,
      workspaceId: workspaceId || null,
      isActive: true,
    });
  }

  async function loginUser(email: string, password: string): Promise<string> {
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password });
    return response.body.accessToken;
  }

  async function cleanupTestData() {
    const allocationRepo = dataSource.getRepository(ResourceAllocation);
    const conflictRepo = dataSource.getRepository(ResourceConflict);
    const resourceRepo = dataSource.getRepository(Resource);
    const projectRepo = dataSource.getRepository(Project);
    const workspaceRepo = dataSource.getRepository(Workspace);
    const uoRepo = dataSource.getRepository(UserOrganization);
    const userRepo = dataSource.getRepository(User);
    const orgRepo = dataSource.getRepository(Organization);

    await allocationRepo.delete({});
    await conflictRepo.delete({});
    await resourceRepo.delete({});
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

    // Create test organizations
    const timestamp = Date.now();
    org1 = await createTestOrganization(`Phase2 Test Org ${timestamp}`);
    org2 = await createTestOrganization(`Phase2 Test Org 2 ${timestamp}`);

    // Create test users
    const testEmailSuffix = `-${timestamp}@phase2-test.com`;
    adminUser1 = await createTestUser(
      `admin1${testEmailSuffix}`,
      'Admin',
      'One',
      org1.id,
      'admin',
    );
    adminUser2 = await createTestUser(
      `admin2${testEmailSuffix}`,
      'Admin',
      'Two',
      org2.id,
      'admin',
    );

    // Create UserOrganization entries
    await createUserOrganization(adminUser1.id, org1.id, 'admin' as 'admin');
    await createUserOrganization(adminUser2.id, org2.id, 'admin' as 'admin');

    // Create test workspace
    workspace1 = await createTestWorkspace(
      'Phase2 Test Workspace',
      org1.id,
      adminUser1.id,
    );

    // Create test project
    project1 = await createTestProject(
      'Phase2 Test Project',
      org1.id,
      workspace1.id,
    );

    // Create test resources
    resource1 = await createTestResource(
      'Phase2 Resource One',
      'resource1@phase2-test.com',
      'developer',
      ['JavaScript', 'TypeScript'],
      org1.id,
      workspace1.id,
    );

    resource2 = await createTestResource(
      'Phase2 Resource Two',
      'resource2@phase2-test.com',
      'designer',
      ['Figma'],
      org1.id,
      workspace1.id,
    );

    // Login users
    adminToken1 = await loginUser(adminUser1.email, 'password123');
    adminToken2 = await loginUser(adminUser2.email, 'password123');
  });

  afterAll(async () => {
    if (dataSource && dataSource.isInitialized) {
      await cleanupTestData();
    }
    await app.close();
  });

  describe('A. HARD overallocation blocks', () => {
    it('should return 409 Conflict when HARD allocation exceeds 100%', async () => {
      // Create first HARD allocation (60%)
      const startDate = new Date();
      const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      const allocation1Response = await request(app.getHttpServer())
        .post('/api/resource-allocations')
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          resourceId: resource1.id,
          projectId: project1.id,
          allocationPercentage: 60,
          unitsType: 'PERCENT',
          type: 'HARD',
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
        });

      expect(allocation1Response.status).toBe(201);

      // Try to create second HARD allocation (50%) - should return 409
      const allocation2Response = await request(app.getHttpServer())
        .post('/api/resource-allocations')
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          resourceId: resource1.id,
          projectId: project1.id,
          allocationPercentage: 50,
          unitsType: 'PERCENT',
          type: 'HARD',
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
        });

      expect(allocation2Response.status).toBe(409);
      expect(allocation2Response.body.message).toContain('exceed 100% capacity');
    });
  });

  describe('B. SOFT overallocation creates conflict', () => {
    it('should create conflict row when SOFT allocation exceeds 100%', async () => {
      // Clean up previous allocations for resource2
      const allocationRepo = dataSource.getRepository(ResourceAllocation);
      await allocationRepo.delete({ resourceId: resource2.id });

      const conflictRepo = dataSource.getRepository(ResourceConflict);
      await conflictRepo.delete({ resourceId: resource2.id });

      // Create first SOFT allocation (60%)
      const startDate = new Date();
      const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const allocation1Response = await request(app.getHttpServer())
        .post('/api/resource-allocations')
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          resourceId: resource2.id,
          projectId: project1.id,
          allocationPercentage: 60,
          unitsType: 'PERCENT',
          type: 'SOFT',
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
        });

      expect(allocation1Response.status).toBe(201);

      // Create second SOFT allocation (50%) - should succeed
      const allocation2Response = await request(app.getHttpServer())
        .post('/api/resource-allocations')
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          resourceId: resource2.id,
          projectId: project1.id,
          allocationPercentage: 50,
          unitsType: 'PERCENT',
          type: 'SOFT',
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
        });

      expect(allocation2Response.status).toBe(201);

      // Wait a bit for conflict creation (if async)
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Query conflicts endpoint
      const conflictsResponse = await request(app.getHttpServer())
        .get(`/api/resources/conflicts?resourceId=${resource2.id}&resolved=false`)
        .set('Authorization', `Bearer ${adminToken1}`);

      expect(conflictsResponse.status).toBe(200);
      expect(conflictsResponse.body.data).toBeDefined();
      expect(Array.isArray(conflictsResponse.body.data)).toBe(true);

      // Should have at least one conflict with totalAllocation > 100
      const conflicts = conflictsResponse.body.data.filter(
        (c: ResourceConflict) => c.resourceId === resource2.id && !c.resolved,
      );
      expect(conflicts.length).toBeGreaterThan(0);

      const conflict = conflicts.find(
        (c: ResourceConflict) => parseFloat(c.totalAllocation.toString()) > 100,
      );
      expect(conflict).toBeDefined();
      expect(parseFloat(conflict.totalAllocation.toString())).toBeGreaterThan(100);
    });

    it('should return conflicts with workspaceId query param', async () => {
      // Query conflicts endpoint with workspaceId
      const conflictsResponse = await request(app.getHttpServer())
        .get(`/api/resources/conflicts?workspaceId=${workspace1.id}&resourceId=${resource2.id}&resolved=false`)
        .set('Authorization', `Bearer ${adminToken1}`);

      expect(conflictsResponse.status).toBe(200);
      expect(conflictsResponse.body.data).toBeDefined();
      expect(Array.isArray(conflictsResponse.body.data)).toBe(true);

      // All returned conflicts should be for resources in the specified workspace
      const conflicts = conflictsResponse.body.data;
      if (conflicts.length > 0) {
        for (const conflict of conflicts) {
          expect(conflict.organizationId).toBe(org1.id);
          expect(conflict.resourceId).toBe(resource2.id);
        }
      }
    });
  });

  describe('C. unitsType enforcement', () => {
    it('should return 400 when PERCENT has both allocationPercentage and hours fields', async () => {
      const startDate = new Date();
      const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const response = await request(app.getHttpServer())
        .post('/api/resource-allocations')
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          resourceId: resource1.id,
          projectId: project1.id,
          allocationPercentage: 50,
          hoursPerWeek: 20,
          unitsType: 'PERCENT',
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
        });

      // Should fail validation
      expect([400, 422]).toContain(response.status);
    });

    it('should return 400 when HOURS has both hoursPerWeek and allocationPercentage', async () => {
      const startDate = new Date();
      const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const response = await request(app.getHttpServer())
        .post('/api/resource-allocations')
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          resourceId: resource1.id,
          projectId: project1.id,
          allocationPercentage: 50,
          hoursPerWeek: 20,
          unitsType: 'HOURS',
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
        });

      // Should fail validation
      expect([400, 422]).toContain(response.status);
    });

    it('should succeed when HOURS has only hoursPerWeek', async () => {
      const startDate = new Date();
      const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const response = await request(app.getHttpServer())
        .post('/api/resource-allocations')
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          resourceId: resource1.id,
          projectId: project1.id,
          hoursPerWeek: 20,
          unitsType: 'HOURS',
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
        });

      expect([200, 201]).toContain(response.status);
    });
  });

  describe('D. Tenant isolation', () => {
    it('should prevent Org B from reading Org A resources', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/resources/${resource1.id}`)
        .set('Authorization', `Bearer ${adminToken2}`); // Org 2 user

      // Should return 404 or 403
      expect([404, 403]).toContain(response.status);
    });

    it('should prevent Org B from creating allocation against Org A resource', async () => {
      const startDate = new Date();
      const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const response = await request(app.getHttpServer())
        .post('/api/resource-allocations')
        .set('Authorization', `Bearer ${adminToken2}`) // Org 2 user
        .send({
          resourceId: resource1.id, // Org 1 resource
          projectId: project1.id,
          allocationPercentage: 50,
          unitsType: 'PERCENT',
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
        });

      // Should return 404 or 403
      expect([404, 403, 400]).toContain(response.status);
    });
  });

  describe('E. Resource CRUD endpoints', () => {
    it('GET /api/resources/:id should return org scoped result', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/resources/${resource1.id}`)
        .set('Authorization', `Bearer ${adminToken1}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBe(resource1.id);
      expect(response.body.data.organizationId).toBe(org1.id);
    });

    it('PATCH /api/resources/:id should update and stay org scoped', async () => {
      const newName = 'Updated Resource Name ' + Date.now();
      const response = await request(app.getHttpServer())
        .patch(`/api/resources/${resource1.id}`)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({ name: newName });

      expect(response.status).toBe(200);
      expect(response.body.data.name).toBe(newName);
      expect(response.body.data.organizationId).toBe(org1.id);
    });
  });

  describe('F. Capacity rollup endpoint', () => {
    it('GET /api/resources/capacity/resources should return weekly rollups', async () => {
      const startDate = new Date();
      const endDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 2 weeks

      const response = await request(app.getHttpServer())
        .get(
          `/api/resources/capacity/resources?startDate=${startDate.toISOString().split('T')[0]}&endDate=${endDate.toISOString().split('T')[0]}`,
        )
        .set('Authorization', `Bearer ${adminToken1}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);

      if (response.body.data.length > 0) {
        const resource = response.body.data[0];
        expect(resource.resourceId).toBeDefined();
        expect(resource.weeks).toBeDefined();
        expect(Array.isArray(resource.weeks)).toBe(true);

        if (resource.weeks.length > 0) {
          const week = resource.weeks[0];
          expect(week.weekStart).toBeDefined();
          expect(week.weekEnd).toBeDefined();
          expect(week.totalHard).toBeDefined();
          expect(week.totalSoft).toBeDefined();
          expect(week.total).toBeDefined();
          expect(week.remaining).toBeDefined();
        }
      }
    });
  });

  // Phase 3: Workspace scoping tests - Ensure workspace access is enforced
  describe('Phase 3: Workspace Scoping', () => {
    let testAllocation: ResourceAllocation;

    beforeAll(async () => {
      // Create a test allocation for PATCH/DELETE tests
      const allocationRepo = dataSource.getRepository(ResourceAllocation);
      testAllocation = await allocationRepo.save({
        organizationId: org1.id,
        resourceId: resource1.id,
        projectId: project1.id,
        allocationPercentage: 50,
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-01-31'),
        type: 'SOFT' as any,
        unitsType: 'PERCENT' as any,
        bookingSource: 'MANUAL' as any,
      });
    });

    describe('Missing x-workspace-id header', () => {
      it('POST /api/resource-allocations should return 403', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/resource-allocations')
          .set('Authorization', `Bearer ${adminToken1}`)
          .send({
            resourceId: resource1.id,
            projectId: project1.id,
            allocationPercentage: 50,
            startDate: '2026-01-01',
            endDate: '2026-01-31',
            type: 'SOFT',
          });

        expect(response.status).toBe(403);
        expect(response.body.error?.message).toContain('Workspace ID is required');
      });

      it('GET /api/resource-allocations should return 403', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/resource-allocations')
          .set('Authorization', `Bearer ${adminToken1}`);

        expect(response.status).toBe(403);
        expect(response.body.error?.message).toContain('Workspace ID is required');
      });

      it('GET /api/resource-allocations/:id should return 403', async () => {
        const response = await request(app.getHttpServer())
          .get(`/api/resource-allocations/${testAllocation.id}`)
          .set('Authorization', `Bearer ${adminToken1}`);

        expect(response.status).toBe(403);
        expect(response.body.error?.message).toContain('Workspace ID is required');
      });

      it('PATCH /api/resource-allocations/:id should return 403', async () => {
        const response = await request(app.getHttpServer())
          .patch(`/api/resource-allocations/${testAllocation.id}`)
          .set('Authorization', `Bearer ${adminToken1}`)
          .send({ allocationPercentage: 60 });

        expect(response.status).toBe(403);
        expect(response.body.error?.message).toContain('Workspace ID is required');
      });

      it('DELETE /api/resource-allocations/:id should return 403', async () => {
        const response = await request(app.getHttpServer())
          .delete(`/api/resource-allocations/${testAllocation.id}`)
          .set('Authorization', `Bearer ${adminToken1}`);

        expect(response.status).toBe(403);
        expect(response.body.error?.message).toContain('Workspace ID is required');
      });

      it('GET /api/resources/conflicts should return 403', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/resources/conflicts')
          .set('Authorization', `Bearer ${adminToken1}`);

        expect(response.status).toBe(403);
      });

      it('GET /api/resources/capacity/resources should return 403', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/resources/capacity/resources')
          .query({
            startDate: '2026-01-01',
            endDate: '2026-01-31',
          })
          .set('Authorization', `Bearer ${adminToken1}`);

        expect(response.status).toBe(403);
      });
    });

    describe('Invalid x-workspace-id header', () => {
      it('should return 403 for invalid UUID', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/resource-allocations')
          .set('Authorization', `Bearer ${adminToken1}`)
          .set('x-workspace-id', 'not-a-uuid');

        expect(response.status).toBe(403);
      });
    });

    describe('Wrong workspace (different org)', () => {
      it('should return 403 when workspace belongs to different org', async () => {
        // Create a workspace in a different org (org2)
        const otherWorkspace = await createTestWorkspace(
          'Other Workspace',
          org2.id,
          adminUser2.id,
        );

        // Try to access with wrong workspace
        const response = await request(app.getHttpServer())
          .get('/api/resource-allocations')
          .set('Authorization', `Bearer ${adminToken1}`)
          .set('x-workspace-id', otherWorkspace.id);

        expect(response.status).toBe(403);
        expect(response.body.error?.message).toContain('Workspace does not belong');
      });
    });

    describe('Valid x-workspace-id header', () => {
      it('GET /api/resource-allocations should return 200', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/resource-allocations')
          .set('Authorization', `Bearer ${adminToken1}`)
          .set('x-workspace-id', workspace1.id);

        expect(response.status).toBe(200);
        expect(response.body.data).toBeDefined();
      });

      it('GET /api/resource-allocations/:id should return 200', async () => {
        const response = await request(app.getHttpServer())
          .get(`/api/resource-allocations/${testAllocation.id}`)
          .set('Authorization', `Bearer ${adminToken1}`)
          .set('x-workspace-id', workspace1.id);

        expect(response.status).toBe(200);
        expect(response.body.data).toBeDefined();
      });

      it('POST /api/resource-allocations should return 201', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/resource-allocations')
          .set('Authorization', `Bearer ${adminToken1}`)
          .set('x-workspace-id', workspace1.id)
          .send({
            resourceId: resource1.id,
            projectId: project1.id,
            allocationPercentage: 30,
            startDate: '2026-02-01',
            endDate: '2026-02-28',
            type: 'SOFT',
          });

        expect(response.status).toBe(201);
        expect(response.body.data).toBeDefined();
      });

      it('GET /api/resources/conflicts should return 200', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/resources/conflicts')
          .set('Authorization', `Bearer ${adminToken1}`)
          .set('x-workspace-id', workspace1.id);

        expect(response.status).toBe(200);
        expect(response.body.data).toBeDefined();
      });

      it('GET /api/resources/capacity/resources should return 200', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/resources/capacity/resources')
          .query({
            startDate: '2026-01-01',
            endDate: '2026-01-31',
          })
          .set('Authorization', `Bearer ${adminToken1}`)
          .set('x-workspace-id', workspace1.id);

        expect(response.status).toBe(200);
        expect(response.body.data).toBeDefined();
      });
    });
  });

  // Phase 3: Conflict lifecycle tests
  describe('Phase 3: Conflict Lifecycle', () => {
    let testResource: Resource;
    let conflictId: string;
    let allocation1: ResourceAllocation;
    let allocation2: ResourceAllocation;

    beforeAll(async () => {
      // Create resource with specific capacity
      testResource = await createTestResource(
        'Test Resource Phase3',
        'test-resource-phase3@test.com',
        'Developer',
        ['TypeScript'],
        org1.id,
        workspace1.id,
      );

      // Update resource capacity
      const resourceRepo = dataSource.getRepository(Resource);
      testResource.capacityHoursPerWeek = 20;
      await resourceRepo.save(testResource);

      // Create two SOFT allocations that exceed 100% for overlapping window
      const allocationRepo = dataSource.getRepository(ResourceAllocation);
      const startDate = new Date('2026-03-01');
      const endDate = new Date('2026-03-31');

      allocation1 = await allocationRepo.save({
        organizationId: org1.id,
        resourceId: testResource.id,
        projectId: project1.id,
        allocationPercentage: 60,
        startDate,
        endDate,
        type: 'SOFT' as any,
        unitsType: 'PERCENT' as any,
        bookingSource: 'MANUAL' as any,
      });

      allocation2 = await allocationRepo.save({
        organizationId: org1.id,
        resourceId: testResource.id,
        projectId: project1.id,
        allocationPercentage: 50,
        startDate,
        endDate,
        type: 'SOFT' as any,
        unitsType: 'PERCENT' as any,
        bookingSource: 'MANUAL' as any,
      });

      // Wait a bit for conflict detection
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Fetch conflicts via API to get one conflict ID
      const response = await request(app.getHttpServer())
        .get(`/api/resources/conflicts?resourceId=${testResource.id}&resolved=false`)
        .set('Authorization', `Bearer ${adminToken1}`)
        .set('x-workspace-id', workspace1.id);

      if (response.status === 200 && response.body.data && response.body.data.length > 0) {
        conflictId = response.body.data[0].id;
      } else {
        // If no conflicts found via API, create one manually for testing
        const conflictRepo = dataSource.getRepository(ResourceConflict);
        const conflict = await conflictRepo.save({
          organizationId: org1.id,
          resourceId: testResource.id,
          conflictDate: startDate,
          totalAllocation: 110,
          severity: 'low',
          resolved: false,
          affectedProjects: [
            {
              projectId: project1.id,
              projectName: project1.name,
              allocation: 60,
            },
            {
              projectId: project1.id,
              projectName: project1.name,
              allocation: 50,
            },
          ],
        });
        conflictId = conflict.id;
      }
    });

    describe('Resolve conflict', () => {
      it('should resolve conflict with resolutionNote', async () => {
        const response = await request(app.getHttpServer())
          .patch(`/api/resources/conflicts/${conflictId}/resolve`)
          .set('Authorization', `Bearer ${adminToken1}`)
          .set('x-workspace-id', workspace1.id)
          .send({
            resolutionNote: 'Test resolution note',
          });

        expect(response.status).toBe(200);
        expect(response.body.data).toBeDefined();
        expect(response.body.data.resolved).toBe(true);
        expect(response.body.data.resolvedByUserId).toBe(adminUser1.id);
        expect(response.body.data.resolutionNote).toBe('Test resolution note');
        expect(response.body.data.resolvedAt).toBeDefined();
      });

      it('should return 403 without x-workspace-id header', async () => {
        const response = await request(app.getHttpServer())
          .patch(`/api/resources/conflicts/${conflictId}/resolve`)
          .set('Authorization', `Bearer ${adminToken1}`)
          .send({
            resolutionNote: 'Test',
          });

        expect(response.status).toBe(403);
      });
    });

    describe('Reopen conflict', () => {
      it('should reopen resolved conflict', async () => {
        const response = await request(app.getHttpServer())
          .patch(`/api/resources/conflicts/${conflictId}/reopen`)
          .set('Authorization', `Bearer ${adminToken1}`)
          .set('x-workspace-id', workspace1.id);

        expect(response.status).toBe(200);
        expect(response.body.data).toBeDefined();
        expect(response.body.data.resolved).toBe(false);
        expect(response.body.data.resolvedByUserId).toBeNull();
        expect(response.body.data.resolutionNote).toBeNull();
        expect(response.body.data.resolvedAt).toBeNull();
      });

      it('should return 403 without x-workspace-id header', async () => {
        const response = await request(app.getHttpServer())
          .patch(`/api/resources/conflicts/${conflictId}/reopen`)
          .set('Authorization', `Bearer ${adminToken1}`);

        expect(response.status).toBe(403);
      });

      it('should return 403 with wrong workspace', async () => {
        const otherWorkspace = await createTestWorkspace(
          'Other Workspace Phase3',
          org2.id,
          adminUser2.id,
        );

        const response = await request(app.getHttpServer())
          .patch(`/api/resources/conflicts/${conflictId}/reopen`)
          .set('Authorization', `Bearer ${adminToken1}`)
          .set('x-workspace-id', otherWorkspace.id);

        expect(response.status).toBe(403);
      });
    });
  });

  // Routing order guard: Ensure static routes come before dynamic routes
  // This prevents regression where /api/resources/conflicts matches @Get(':id') instead of @Get('conflicts')
  describe('Route Order Guard', () => {
    it('should route /api/resources/conflicts to conflicts handler, not :id handler', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/resources/conflicts?resolved=false')
        .set('Authorization', `Bearer ${adminToken1}`)
        .set('x-workspace-id', workspace1.id);

      // Should NOT be 404 "Resource not found" (which would indicate :id handler)
      expect(response.status).not.toBe(404);
      if (response.status === 404) {
        expect(response.body.message).not.toBe('Resource not found');
      }

      // Should be either 200 (success) or 403 (access denied), but not 404
      expect([200, 403]).toContain(response.status);
    });

    it('should route /api/resources/capacity/resources to capacity handler, not :id handler', async () => {
      const startDate = new Date();
      const endDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
      const response = await request(app.getHttpServer())
        .get(
          `/api/resources/capacity/resources?startDate=${startDate.toISOString().split('T')[0]}&endDate=${endDate.toISOString().split('T')[0]}`,
        )
        .set('Authorization', `Bearer ${adminToken1}`)
        .set('x-workspace-id', workspace1.id);

      // Should NOT be 404 "Resource not found" (which would indicate :id handler)
      expect(response.status).not.toBe(404);
      if (response.status === 404) {
        expect(response.body.message).not.toBe('Resource not found');
      }

      // Should be either 200 (success) or 400/403 (validation/access), but not 404
      expect([200, 400, 403]).toContain(response.status);
    });
  });

  // HOURS allocation tests
  describe('HOURS Allocation Tests', () => {
    let testResource: Resource;

    beforeAll(async () => {
      // Create a test resource with capacityHoursPerWeek
      const resourceRepo = dataSource.getRepository(Resource);
      testResource = await resourceRepo.save({
        organizationId: org1.id,
        name: 'Test Resource HOURS',
        email: 'test-hours@example.com',
        role: 'Developer',
        skills: ['TypeScript'],
        capacityHoursPerWeek: 40,
        costPerHour: 100,
        isActive: true,
      });
    });

    it('should create HOURS allocation with hoursPerWeek successfully', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 30);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 7);

      const response = await request(app.getHttpServer())
        .post('/api/resource-allocations')
        .set('Authorization', `Bearer ${adminToken1}`)
        .set('x-workspace-id', workspace1.id)
        .send({
          resourceId: testResource.id,
          projectId: project1.id,
          unitsType: 'HOURS',
          hoursPerWeek: 20,
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          type: 'SOFT',
        });

      expect(response.status).toBe(201);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.unitsType).toBe('HOURS');
      expect(response.body.data.allocationPercentage).toBeDefined();
      expect(typeof response.body.data.allocationPercentage).toBe('number');
    });

    it('should return 400 when HOURS allocation missing both hoursPerWeek and hoursPerDay', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 30);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 7);

      const response = await request(app.getHttpServer())
        .post('/api/resource-allocations')
        .set('Authorization', `Bearer ${adminToken1}`)
        .set('x-workspace-id', workspace1.id)
        .send({
          resourceId: testResource.id,
          projectId: project1.id,
          unitsType: 'HOURS',
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          type: 'SOFT',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.message).toContain('hoursPerWeek or hoursPerDay is required');
    });

    it('should create HOURS allocation with hoursPerDay successfully', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 30);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 7);

      const response = await request(app.getHttpServer())
        .post('/api/resource-allocations')
        .set('Authorization', `Bearer ${adminToken1}`)
        .set('x-workspace-id', workspace1.id)
        .send({
          resourceId: testResource.id,
          projectId: project1.id,
          unitsType: 'HOURS',
          hoursPerDay: 4,
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          type: 'SOFT',
        });

      expect(response.status).toBe(201);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.unitsType).toBe('HOURS');
      expect(response.body.data.allocationPercentage).toBeDefined();
      // hoursPerDay 4 should convert to hoursPerWeek 20 (4 * 5)
      // With capacity 40, that's 50%
      expect(response.body.data.allocationPercentage).toBe(50);
    });
  });
});

