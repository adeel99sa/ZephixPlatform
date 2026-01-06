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

describe('Resource Intelligence (E2E)', () => {
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
      name: `Resource Intelligence Test Org ${Date.now()}`,
      slug: `ri-test-${Date.now()}`,
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
      email: `ri-test-${Date.now()}@test.com`,
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

  describe('Allocation creation with defaults', () => {
    it('should default type to SOFT and bookingSource to MANUAL when omitted', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/resource-allocations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          resourceId: testResource.id,
          projectId: testProject.id,
          allocationPercentage: 30,
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          // type and bookingSource omitted
        })
        .expect(201);

      expect(response.body.type).toBe('SOFT');
      expect(response.body.bookingSource).toBe('MANUAL');

      // Cleanup
      await dataSource
        .getRepository(ResourceAllocation)
        .delete({ id: response.body.id });
    });
  });

  describe('Governance rejection flows', () => {
    let existingAllocationId: string;

    beforeEach(async () => {
      // Create an existing allocation for testing
      const allocationRepo = dataSource.getRepository(ResourceAllocation);
      const existing = allocationRepo.create({
        resourceId: testResource.id,
        projectId: testProject.id,
        organizationId: testOrg.id,
        userId: testUser.id,
        allocationPercentage: 100, // High allocation
        startDate,
        endDate,
        type: 'HARD',
        bookingSource: 'MANUAL',
      });
      const saved = await allocationRepo.save(existing);
      existingAllocationId = saved.id;
    });

    afterEach(async () => {
      // Cleanup
      await dataSource
        .getRepository(ResourceAllocation)
        .delete({ id: existingAllocationId });
    });

    it('should reject allocation when hardCap is exceeded', async () => {
      // Try to add 60% more (total would be 160%, exceeds hardCap of 150%)
      await request(app.getHttpServer())
        .post('/api/resource-allocations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          resourceId: testResource.id,
          projectId: testProject.id,
          allocationPercentage: 60,
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          type: 'SOFT',
          bookingSource: 'MANUAL',
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('hard cap');
        });
    });

    it('should reject allocation when requireJustificationAbove is exceeded without justification', async () => {
      // Try to add 20% more (total would be 120%, exceeds requireJustificationAbove of 100%)
      await request(app.getHttpServer())
        .post('/api/resource-allocations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          resourceId: testResource.id,
          projectId: testProject.id,
          allocationPercentage: 20,
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          type: 'HARD',
          bookingSource: 'MANUAL',
          // No justification
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('Justification');
        });
    });

    it('should accept allocation when requireJustificationAbove is exceeded with justification', async () => {
      // Try to add 20% more (total would be 120%, exceeds requireJustificationAbove of 100%)
      // But with justification, should succeed
      const response = await request(app.getHttpServer())
        .post('/api/resource-allocations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          resourceId: testResource.id,
          projectId: testProject.id,
          allocationPercentage: 20,
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          type: 'HARD',
          bookingSource: 'MANUAL',
          justification: 'Critical project requirement',
        })
        .expect(201);

      expect(response.body.justification).toBe('Critical project requirement');

      // Cleanup
      await dataSource
        .getRepository(ResourceAllocation)
        .delete({ id: response.body.id });
    });
  });
});






