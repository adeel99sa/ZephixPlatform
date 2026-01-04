import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { User } from '../src/modules/users/entities/user.entity';
import { Organization } from '../src/organizations/entities/organization.entity';
import { Workspace } from '../src/modules/workspaces/entities/workspace.entity';
import { Project } from '../src/modules/projects/entities/project.entity';
import { Portfolio, PortfolioStatus } from '../src/modules/portfolios/entities/portfolio.entity';
import { Program, ProgramStatus } from '../src/modules/programs/entities/program.entity';
import { PortfolioProject } from '../src/modules/portfolios/entities/portfolio-project.entity';
import { UserOrganization } from '../src/organizations/entities/user-organization.entity';
import * as bcrypt from 'bcrypt';

describe('Portfolios and Programs Phase 4.1 (E2E)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  // Increase timeout for module initialization
  jest.setTimeout(60000);

  // Test data
  let org1: Organization;
  let org2: Organization;
  let adminUser1: User;
  let adminUser2: User;
  let workspace1: Workspace;
  let workspace2: Workspace;
  let project1: Project;
  let project2: Project;
  let portfolio1: Portfolio;
  let program1: Program;

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

  async function loginUser(email: string, password: string): Promise<string> {
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password });
    return response.body.data?.accessToken || response.body.accessToken;
  }

  async function cleanupTestData() {
    const portfolioProjectRepo = dataSource.getRepository(PortfolioProject);
    const portfolioRepo = dataSource.getRepository(Portfolio);
    const programRepo = dataSource.getRepository(Program);
    const projectRepo = dataSource.getRepository(Project);
    const workspaceRepo = dataSource.getRepository(Workspace);
    const uoRepo = dataSource.getRepository(UserOrganization);
    const userRepo = dataSource.getRepository(User);
    const orgRepo = dataSource.getRepository(Organization);

    await portfolioProjectRepo.delete({});
    await portfolioRepo.delete({});
    await programRepo.delete({});
    await projectRepo.delete({});
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

    // Create test organizations
    const timestamp = Date.now();
    org1 = await createTestOrganization(`Portfolio Test Org ${timestamp}`);
    org2 = await createTestOrganization(`Portfolio Test Org 2 ${timestamp}`);

    // Create test users
    const testEmailSuffix = `-${timestamp}@portfolio-test.com`;
    adminUser1 = await createTestUser(
      `admin1${testEmailSuffix}`,
      'Admin',
      'User',
      org1.id,
      'admin',
    );
    adminUser2 = await createTestUser(
      `admin2${testEmailSuffix}`,
      'Admin',
      'User',
      org2.id,
      'admin',
    );

    // Create UserOrganization entries
    await createUserOrganization(adminUser1.id, org1.id, 'admin');
    await createUserOrganization(adminUser2.id, org2.id, 'admin');

    // Create test workspaces
    workspace1 = await createTestWorkspace(
      'Portfolio Test Workspace',
      org1.id,
      adminUser1.id,
    );
    workspace2 = await createTestWorkspace(
      'Portfolio Test Workspace 2',
      org2.id,
      adminUser2.id,
    );

    // Create test projects
    project1 = await createTestProject(
      'Portfolio Test Project',
      org1.id,
      workspace1.id,
    );
    project2 = await createTestProject(
      'Portfolio Test Project 2',
      org1.id,
      workspace1.id,
    );

    // Login to get tokens
    adminToken1 = await loginUser(adminUser1.email, 'password123');
    adminToken2 = await loginUser(adminUser2.email, 'password123');
  });

  afterAll(async () => {
    if (dataSource && dataSource.isInitialized) {
      await cleanupTestData();
    }
    await app.close();
  });

  // A. Workspace header enforcement for portfolio summary
  describe('Portfolio Summary - Workspace Header Enforcement', () => {
    let testPortfolio: Portfolio;

    beforeAll(async () => {
      // Ensure dataSource is initialized
      if (!dataSource || !dataSource.isInitialized) {
        throw new Error('DataSource not initialized');
      }
      // Create a test portfolio
      const portfolioRepo = dataSource.getRepository(Portfolio);
      testPortfolio = await portfolioRepo.save({
        name: 'Test Portfolio',
        organizationId: org1.id,
        createdById: adminUser1.id,
        status: PortfolioStatus.ACTIVE,
      });
    });

    it('should return 403 when x-workspace-id header is missing', async () => {
      const startDate = new Date().toISOString().split('T')[0];
      const endDate = new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000,
      ).toISOString().split('T')[0];

      const response = await request(app.getHttpServer())
        .get(
          `/api/portfolios/${testPortfolio.id}/summary?startDate=${startDate}&endDate=${endDate}`,
        )
        .set('Authorization', `Bearer ${adminToken1}`);

      expect(response.status).toBe(403);
      expect(response.body.message || response.body.error?.message).toContain(
        'workspace',
      );
    });

    it('should return 403 when x-workspace-id is invalid UUID', async () => {
      const startDate = new Date().toISOString().split('T')[0];
      const endDate = new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000,
      ).toISOString().split('T')[0];

      const response = await request(app.getHttpServer())
        .get(
          `/api/portfolios/${testPortfolio.id}/summary?startDate=${startDate}&endDate=${endDate}`,
        )
        .set('Authorization', `Bearer ${adminToken1}`)
        .set('x-workspace-id', 'invalid-uuid');

      expect(response.status).toBe(403);
    });

    it('should return 403 when x-workspace-id belongs to different org', async () => {
      const startDate = new Date().toISOString().split('T')[0];
      const endDate = new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000,
      ).toISOString().split('T')[0];

      const response = await request(app.getHttpServer())
        .get(
          `/api/portfolios/${testPortfolio.id}/summary?startDate=${startDate}&endDate=${endDate}`,
        )
        .set('Authorization', `Bearer ${adminToken1}`)
        .set('x-workspace-id', workspace2.id); // Workspace from org2

      expect(response.status).toBe(403);
    });
  });

  // B. Create and list portfolios
  describe('Portfolio CRUD', () => {
    it('should create a portfolio', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/portfolios')
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          name: 'Q1 2025 Portfolio',
          description: 'All Q1 initiatives',
          status: 'active',
        });

      expect(response.status).toBe(201);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.name).toBe('Q1 2025 Portfolio');
      portfolio1 = response.body.data;
    });

    it('should list portfolios and include created portfolio', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/portfolios')
        .set('Authorization', `Bearer ${adminToken1}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(
        response.body.data.find((p: Portfolio) => p.id === portfolio1.id),
      ).toBeDefined();
    });
  });

  // C. Add projects and remove projects
  describe('Portfolio Project Management', () => {
    it('should add projects to portfolio', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/portfolios/${portfolio1.id}/projects`)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          projectIds: [project1.id, project2.id],
        });

      expect(response.status).toBe(200);
      expect(response.body.data.success).toBe(true);
    });

    it('should get portfolio by id and confirm membership', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/portfolios/${portfolio1.id}`)
        .set('Authorization', `Bearer ${adminToken1}`);

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(portfolio1.id);
      // Portfolio should have portfolioProjects relation loaded
      expect(response.body.data.portfolioProjects).toBeDefined();
    });

    it('should remove projects from portfolio', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/api/portfolios/${portfolio1.id}/projects`)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          projectIds: [project1.id],
        });

      expect(response.status).toBe(200);
      expect(response.body.data.success).toBe(true);
    });

    it('should confirm project removed from portfolio', async () => {
      if (!dataSource || !dataSource.isInitialized) {
        throw new Error('DataSource not initialized');
      }
      const portfolioProjectRepo = dataSource.getRepository(PortfolioProject);
      const membership = await portfolioProjectRepo.findOne({
        where: {
          portfolioId: portfolio1.id,
          projectId: project1.id,
        },
      });

      expect(membership).toBeNull();
    });
  });

  // D. Summary returns expected structure
  describe('Portfolio Summary Structure', () => {
    beforeAll(async () => {
      // Ensure dataSource is initialized
      if (!dataSource || !dataSource.isInitialized) {
        throw new Error('DataSource not initialized');
      }
      // Re-add project1 to portfolio for summary test
      const portfolioProjectRepo = dataSource.getRepository(PortfolioProject);
      await portfolioProjectRepo.save({
        organizationId: org1.id,
        portfolioId: portfolio1.id,
        projectId: project1.id,
      });
    });

    it('should return summary with expected structure', async () => {
      const startDate = new Date().toISOString().split('T')[0];
      const endDate = new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000,
      ).toISOString().split('T')[0];

      const response = await request(app.getHttpServer())
        .get(
          `/api/portfolios/${portfolio1.id}/summary?startDate=${startDate}&endDate=${endDate}`,
        )
        .set('Authorization', `Bearer ${adminToken1}`)
        .set('x-workspace-id', workspace1.id);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.weeks).toBeInstanceOf(Array);
      expect(response.body.data.weeks.length).toBeGreaterThan(0);
      expect(response.body.data.projectCounts).toBeDefined();
      expect(response.body.data.projectCounts.total).toBeDefined();
      expect(response.body.data.projectCounts.byStatus).toBeDefined();

      // Check week structure
      const week = response.body.data.weeks[0];
      expect(week.weekStart).toBeDefined();
      expect(week.weekEnd).toBeDefined();
      expect(week.totalHardPercent).toBeDefined();
      expect(week.totalSoftPercent).toBeDefined();
      expect(week.totalPercent).toBeDefined();
      expect(week.utilizationPercent).toBeDefined();
      expect(week.conflictCount).toBeDefined();
      expect(week.unresolvedConflictCount).toBeDefined();
      expect(week.conflictDensity).toBeDefined();
    });
  });

  // E. Workspace header enforcement for program summary
  describe('Program Summary - Workspace Header Enforcement', () => {
    let testProgram: Program;

    beforeAll(async () => {
      // Ensure dataSource is initialized
      if (!dataSource || !dataSource.isInitialized) {
        throw new Error('DataSource not initialized');
      }
      // Create a test portfolio and program
      const portfolioRepo = dataSource.getRepository(Portfolio);
      const testPortfolio = await portfolioRepo.save({
        name: 'Test Portfolio for Program',
        organizationId: org1.id,
        createdById: adminUser1.id,
        status: PortfolioStatus.ACTIVE,
      });

      const programRepo = dataSource.getRepository(Program);
      testProgram = await programRepo.save({
        name: 'Test Program',
        organizationId: org1.id,
        portfolioId: testPortfolio.id,
        createdById: adminUser1.id,
        status: ProgramStatus.ACTIVE,
      });
    });

    it('should return 403 when x-workspace-id header is missing', async () => {
      const startDate = new Date().toISOString().split('T')[0];
      const endDate = new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000,
      ).toISOString().split('T')[0];

      const response = await request(app.getHttpServer())
        .get(
          `/api/programs/${testProgram.id}/summary?startDate=${startDate}&endDate=${endDate}`,
        )
        .set('Authorization', `Bearer ${adminToken1}`);

      expect(response.status).toBe(403);
    });

    it('should return 403 when x-workspace-id is invalid UUID', async () => {
      const startDate = new Date().toISOString().split('T')[0];
      const endDate = new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000,
      ).toISOString().split('T')[0];

      const response = await request(app.getHttpServer())
        .get(
          `/api/programs/${testProgram.id}/summary?startDate=${startDate}&endDate=${endDate}`,
        )
        .set('Authorization', `Bearer ${adminToken1}`)
        .set('x-workspace-id', 'invalid-uuid');

      expect(response.status).toBe(403);
    });

    it('should return 403 when x-workspace-id belongs to different org', async () => {
      const startDate = new Date().toISOString().split('T')[0];
      const endDate = new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000,
      ).toISOString().split('T')[0];

      const response = await request(app.getHttpServer())
        .get(
          `/api/programs/${testProgram.id}/summary?startDate=${startDate}&endDate=${endDate}`,
        )
        .set('Authorization', `Bearer ${adminToken1}`)
        .set('x-workspace-id', workspace2.id);

      expect(response.status).toBe(403);
    });
  });

  // F. Create and list programs
  describe('Program CRUD', () => {
    it('should create a program', async () => {
      // Ensure dataSource is initialized
      if (!dataSource || !dataSource.isInitialized) {
        throw new Error('DataSource not initialized');
      }
      // First create a portfolio for the program
      const portfolioRepo = dataSource.getRepository(Portfolio);
      const testPortfolio = await portfolioRepo.save({
        name: 'Program Test Portfolio',
        organizationId: org1.id,
        createdById: adminUser1.id,
        status: PortfolioStatus.ACTIVE,
      });

      const response = await request(app.getHttpServer())
        .post('/api/programs')
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          portfolioId: testPortfolio.id,
          name: 'Mobile App Development',
          description: 'All mobile initiatives',
          status: 'active',
        });

      expect(response.status).toBe(201);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.name).toBe('Mobile App Development');
      program1 = response.body.data;
    });

    it('should list programs and include created program', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/programs')
        .set('Authorization', `Bearer ${adminToken1}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(
        response.body.data.find((p: Program) => p.id === program1.id),
      ).toBeDefined();
    });
  });

  // G. Assign and unassign project
  describe('Program Project Assignment', () => {
    it('should assign program to a project', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/programs/${program1.id}/assign-project`)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          projectId: project1.id,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.success).toBe(true);
    });

    it('should confirm project.programId is set after assignment', async () => {
      if (!dataSource || !dataSource.isInitialized) {
        throw new Error('DataSource not initialized');
      }
      const projectRepo = dataSource.getRepository(Project);
      const updatedProject = await projectRepo.findOne({
        where: { id: project1.id },
      });

      expect(updatedProject?.programId).toBe(program1.id);
    });

    it('should get program summary and confirm project counts reflect assignment', async () => {
      const startDate = new Date().toISOString().split('T')[0];
      const endDate = new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000,
      ).toISOString().split('T')[0];

      const response = await request(app.getHttpServer())
        .get(
          `/api/programs/${program1.id}/summary?startDate=${startDate}&endDate=${endDate}`,
        )
        .set('Authorization', `Bearer ${adminToken1}`)
        .set('x-workspace-id', workspace1.id);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.projectCounts).toBeDefined();
      expect(response.body.data.projectCounts.total).toBeGreaterThan(0);
    });

    it('should unassign project from program', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/programs/${program1.id}/unassign-project`)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({
          projectId: project1.id,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.success).toBe(true);
    });

    it('should confirm project.programId is null after unassign', async () => {
      if (!dataSource || !dataSource.isInitialized) {
        throw new Error('DataSource not initialized');
      }
      const projectRepo = dataSource.getRepository(Project);
      const updatedProject = await projectRepo.findOne({
        where: { id: project1.id },
      });

      expect(updatedProject?.programId).toBeNull();
    });
  });

  // H. Routing guard
  describe('Route Order Guard', () => {
    it('should route /api/portfolios/:id/summary correctly and not hit :id handler', async () => {
      const startDate = new Date().toISOString().split('T')[0];
      const endDate = new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000,
      ).toISOString().split('T')[0];

      const response = await request(app.getHttpServer())
        .get(
          `/api/portfolios/${portfolio1.id}/summary?startDate=${startDate}&endDate=${endDate}`,
        )
        .set('Authorization', `Bearer ${adminToken1}`)
        .set('x-workspace-id', workspace1.id);

      // Should NOT be 404 "Portfolio not found" (which would indicate :id handler)
      expect(response.status).not.toBe(404);
      if (response.status === 404) {
        expect(response.body.message).not.toBe('Portfolio not found');
      }

      // Should be either 200 (success) or 400/403 (validation/access), but not 404
      expect([200, 400, 403]).toContain(response.status);
    });

    it('should route /api/programs/:id/summary correctly and not hit :id handler', async () => {
      const startDate = new Date().toISOString().split('T')[0];
      const endDate = new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000,
      ).toISOString().split('T')[0];

      const response = await request(app.getHttpServer())
        .get(
          `/api/programs/${program1.id}/summary?startDate=${startDate}&endDate=${endDate}`,
        )
        .set('Authorization', `Bearer ${adminToken1}`)
        .set('x-workspace-id', workspace1.id);

      // Should NOT be 404 "Program not found" (which would indicate :id handler)
      expect(response.status).not.toBe(404);
      if (response.status === 404) {
        expect(response.body.message).not.toBe('Program not found');
      }

      // Should be either 200 (success) or 400/403 (validation/access), but not 404
      expect([200, 400, 403]).toContain(response.status);
    });

    it('should return 404 for non-existent route /api/portfolios/conflicts', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/portfolios/conflicts')
        .set('Authorization', `Bearer ${adminToken1}`);

      // Should be 404, but NOT "Portfolio not found" (which would indicate :id handler)
      expect(response.status).toBe(404);
      if (response.body.message) {
        expect(response.body.message).not.toBe('Portfolio not found');
      }
    });
  });
});

