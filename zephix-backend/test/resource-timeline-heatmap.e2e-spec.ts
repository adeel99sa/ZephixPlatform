import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { User } from '../src/modules/users/entities/user.entity';
import { Organization } from '../src/organizations/entities/organization.entity';
import { Resource } from '../src/modules/resources/entities/resource.entity';
import { ResourceAllocation } from '../src/modules/resources/entities/resource-allocation.entity';
import { Project } from '../src/modules/projects/entities/project.entity';
import { Workspace } from '../src/modules/workspaces/entities/workspace.entity';
import * as bcrypt from 'bcrypt';

describe('Resource Timeline and Heatmap (E2E)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  let testOrg: Organization;
  let testUser: User;
  let testResource: Resource;
  let testProject: Project;
  let testWorkspace: Workspace;
  let authToken: string;

  const startDate = new Date();
  startDate.setDate(startDate.getDate() + 1); // Tomorrow
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 7); // 7 days later

  beforeAll(async () => {
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

    // Create test organization
    const orgRepo = dataSource.getRepository(Organization);
    testOrg = orgRepo.create({
      name: `Timeline Test Org ${Date.now()}`,
      slug: `timeline-test-${Date.now()}`,
      status: 'active',
      settings: {
        resourceManagementSettings: {
          warningThreshold: 80,
          criticalThreshold: 100,
          hardCap: 150,
          requireJustificationAbove: 100,
        },
      },
    });
    testOrg = await orgRepo.save(testOrg);

    // Create test user
    const userRepo = dataSource.getRepository(User);
    const hashedPassword = await bcrypt.hash('password123', 10);
    testUser = userRepo.create({
      email: `timeline-test-${Date.now()}@test.com`,
      password: hashedPassword,
      firstName: 'Test',
      lastName: 'User',
      organizationId: testOrg.id,
      role: 'admin',
      isActive: true,
    });
    testUser = await userRepo.save(testUser);

    // Create test workspace
    const workspaceRepo = dataSource.getRepository(Workspace);
    testWorkspace = workspaceRepo.create({
      name: 'Test Workspace',
      organizationId: testOrg.id,
      createdBy: testUser.id,
      ownerId: testUser.id,
    });
    testWorkspace = await workspaceRepo.save(testWorkspace);

    // Create test project
    const projectRepo = dataSource.getRepository(Project);
    testProject = projectRepo.create({
      name: 'Test Project',
      organizationId: testOrg.id,
      workspaceId: testWorkspace.id,
      createdById: testUser.id,
    });
    testProject = await projectRepo.save(testProject);

    // Create test resource
    const resourceRepo = dataSource.getRepository(Resource);
    testResource = resourceRepo.create({
      name: 'Test Resource',
      email: `resource-${Date.now()}@test.com`,
      role: 'Developer',
      organizationId: testOrg.id,
      userId: testUser.id,
      isActive: true,
    });
    testResource = await resourceRepo.save(testResource);

    // Get auth token
    const loginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: 'password123',
      });
    authToken = loginResponse.body.accessToken;

    // Create a test allocation to populate timeline
    const allocationRepo = dataSource.getRepository(ResourceAllocation);
    await allocationRepo.save({
      resource: { id: testResource.id },
      projectId: testProject.id,
      organizationId: testOrg.id,
      userId: testUser.id,
      allocationPercentage: 50,
      startDate,
      endDate,
      type: 'HARD',
      bookingSource: 'MANUAL',
    });

    // Wait a bit for timeline update (synchronous for now)
    await new Promise((resolve) => setTimeout(resolve, 500));
  });

  afterAll(async () => {
    // Cleanup
    if (dataSource && dataSource.isInitialized) {
      const allocationRepo = dataSource.getRepository(ResourceAllocation);
      await allocationRepo.delete({ organizationId: testOrg.id });

      const resourceRepo = dataSource.getRepository(Resource);
      await resourceRepo.delete({ id: testResource.id });

      const projectRepo = dataSource.getRepository(Project);
      await projectRepo.delete({ id: testProject.id });

      const workspaceRepo = dataSource.getRepository(Workspace);
      await workspaceRepo.delete({ id: testWorkspace.id });

      const userRepo = dataSource.getRepository(User);
      await userRepo.delete({ id: testUser.id });

      const orgRepo = dataSource.getRepository(Organization);
      await orgRepo.delete({ id: testOrg.id });
    }
    await app.close();
  });

  describe('GET /resources/:id/timeline', () => {
    it('should return timeline data for a resource', async () => {
      const response = await request(app.getHttpServer())
        .get(
          `/api/resources/${testResource.id}/timeline?fromDate=${startDate.toISOString().split('T')[0]}&toDate=${endDate.toISOString().split('T')[0]}`,
        )
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);

      if (response.body.data.length > 0) {
        const firstDay = response.body.data[0];
        expect(firstDay).toHaveProperty('date');
        expect(firstDay).toHaveProperty('capacityPercent');
        expect(firstDay).toHaveProperty('hardLoadPercent');
        expect(firstDay).toHaveProperty('softLoadPercent');
        expect(firstDay).toHaveProperty('classification');
        expect(['NONE', 'WARNING', 'CRITICAL']).toContain(
          firstDay.classification,
        );
      }
    });

    it('should require fromDate and toDate parameters', async () => {
      await request(app.getHttpServer())
        .get(`/api/resources/${testResource.id}/timeline`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });
  });

  describe('GET /resources/heatmap/timeline', () => {
    it('should return heatmap data', async () => {
      const response = await request(app.getHttpServer())
        .get(
          `/api/resources/heatmap/timeline?fromDate=${startDate.toISOString().split('T')[0]}&toDate=${endDate.toISOString().split('T')[0]}`,
        )
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);

      if (response.body.data.length > 0) {
        const firstDay = response.body.data[0];
        expect(firstDay).toHaveProperty('date');
        expect(firstDay).toHaveProperty('resources');
        expect(Array.isArray(firstDay.resources)).toBe(true);
      }
    });

    it('should filter by workspaceId when provided', async () => {
      const response = await request(app.getHttpServer())
        .get(
          `/api/resources/heatmap/timeline?workspaceId=${testWorkspace.id}&fromDate=${startDate.toISOString().split('T')[0]}&toDate=${endDate.toISOString().split('T')[0]}`,
        )
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
    });
  });
});






