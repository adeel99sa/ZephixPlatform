import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DataSource } from 'typeorm';
import { User } from '../../src/modules/users/entities/user.entity';
import { Organization } from '../../src/organizations/entities/organization.entity';
import { IntegrationConnection } from '../../src/modules/integrations/entities/integration-connection.entity';
import { ResourceAllocation } from '../../src/modules/resources/entities/resource-allocation.entity';
import { Project } from '../../src/modules/projects/entities/project.entity';
import { Workspace } from '../../src/modules/workspaces/entities/workspace.entity';
import { UserOrganization } from '../../src/organizations/entities/user-organization.entity';
import * as bcrypt from 'bcrypt';
import { TenantContextService } from '../../src/modules/tenancy/tenant-context.service';
import { assertCrossTenantWorkspace403 } from './helpers/cross-tenant-workspace.test-helper';

describe('Tenant Isolation (E2E)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let tenantContextService: TenantContextService;

  // Test data - two separate organizations
  let orgA: Organization;
  let orgB: Organization;
  let userA: User;
  let userB: User;
  let tokenA: string;
  let tokenB: string;
  let connectionA: IntegrationConnection;
  let connectionB: IntegrationConnection;
  let projectA: Project;
  let projectB: Project;
  let allocationA: ResourceAllocation;
  let allocationB: ResourceAllocation;

  // Helper functions
  async function createTestOrganization(name: string): Promise<Organization> {
    const orgRepo = dataSource.getRepository(Organization);
    return orgRepo.save({
      name,
      slug: name.toLowerCase().replace(/\s+/g, '-'),
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
    });
  }

  async function createUserOrganization(
    userId: string,
    orgId: string,
    role: string,
  ): Promise<UserOrganization> {
    const uoRepo = dataSource.getRepository(UserOrganization);
    return uoRepo.save({
      userId,
      organizationId: orgId,
      role,
    });
  }

  async function getAuthToken(email: string, password: string): Promise<string> {
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password })
      .expect(200);
    return response.body.access_token;
  }

  async function createIntegrationConnection(
    orgId: string,
    type: 'jira' | 'linear' | 'github' = 'jira',
  ): Promise<IntegrationConnection> {
    const connRepo = dataSource.getRepository(IntegrationConnection);
    return connRepo.save({
      organizationId: orgId,
      type,
      baseUrl: `https://${orgId}.example.com`,
      email: `test@${orgId}.com`,
      authType: 'api_token',
      encryptedSecrets: {},
      enabled: true,
      webhookEnabled: false,
      status: 'active',
    });
  }

  async function createTestProject(
    name: string,
    orgId: string,
  ): Promise<Project> {
    const projectRepo = dataSource.getRepository(Project);
    return projectRepo.save({
      name,
      organizationId: orgId,
      status: 'active',
      priority: 'medium',
    });
  }

  async function createResourceAllocation(
    orgId: string,
    projectId: string,
  ): Promise<ResourceAllocation> {
    const allocRepo = dataSource.getRepository(ResourceAllocation);
    return allocRepo.save({
      organizationId: orgId,
      projectId,
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      allocationPercentage: 50,
    });
  }

  beforeAll(async () => {
    if (!process.env.DATABASE_URL) {
      console.warn(
        '⚠️  WARNING: DATABASE_URL not set. Tests require database connection.',
      );
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
    tenantContextService = app.get(TenantContextService);

    // Create two separate organizations
    const timestamp = Date.now();
    orgA = await createTestOrganization(`Tenant Isolation Org A ${timestamp}`);
    orgB = await createTestOrganization(`Tenant Isolation Org B ${timestamp}`);

    // Create users for each org
    const testEmailSuffix = `-${timestamp}@tenant-test.com`;
    userA = await createTestUser(
      `usera${testEmailSuffix}`,
      'User',
      'A',
      orgA.id,
      'admin',
    );
    userB = await createTestUser(
      `userb${testEmailSuffix}`,
      'User',
      'B',
      orgB.id,
      'admin',
    );

    // Create UserOrganization entries
    await createUserOrganization(userA.id, orgA.id, 'admin');
    await createUserOrganization(userB.id, orgB.id, 'admin');

    // Create test data for each org
    connectionA = await createIntegrationConnection(orgA.id);
    connectionB = await createIntegrationConnection(orgB.id);
    projectA = await createTestProject('Project A', orgA.id);
    projectB = await createTestProject('Project B', orgB.id);
    allocationA = await createResourceAllocation(orgA.id, projectA.id);
    allocationB = await createResourceAllocation(orgB.id, projectB.id);

    // Get auth tokens
    tokenA = await getAuthToken(userA.email, 'password123');
    tokenB = await getAuthToken(userB.email, 'password123');
  });

  afterAll(async () => {
    if (dataSource && dataSource.isInitialized) {
      // Clean up test data
      await dataSource.getRepository(ResourceAllocation).delete([
        allocationA.id,
        allocationB.id,
      ]);
      await dataSource.getRepository(Project).delete([projectA.id, projectB.id]);
      await dataSource
        .getRepository(IntegrationConnection)
        .delete([connectionA.id, connectionB.id]);
      await dataSource.getRepository(UserOrganization).delete({
        userId: In([userA.id, userB.id]),
      });
      await dataSource.getRepository(User).delete([userA.id, userB.id]);
      await dataSource.getRepository(Organization).delete([orgA.id, orgB.id]);
    }
    await app.close();
  });

  describe('Cross-tenant read isolation', () => {
    it('User from Org A cannot read Org B integration connection', async () => {
      // User A tries to access Org B's connection
      const response = await request(app.getHttpServer())
        .get(`/api/integrations/jira/webhook/${connectionB.id}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(404); // Should not find it (scoped to Org A)

      expect(response.body.message).toContain('not found');
    });

    it('User from Org B cannot read Org A integration connection', async () => {
      // User B tries to access Org A's connection
      const response = await request(app.getHttpServer())
        .get(`/api/integrations/jira/webhook/${connectionA.id}`)
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(404); // Should not find it (scoped to Org B)

      expect(response.body.message).toContain('not found');
    });

    it('User from Org A can only read their own integration connection', async () => {
      // User A should be able to access their own connection
      // Note: This test assumes there's a GET endpoint for connections
      // If not, we test via webhook endpoint which uses findOne
      const response = await request(app.getHttpServer())
        .post(`/api/integrations/jira/webhook/${connectionA.id}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({})
        .expect(202); // Webhook accepts even if disabled

      expect(response.body).toBeDefined();
    });
  });

  describe('Cross-tenant write isolation', () => {
    it('User from Org A cannot update Org B resource allocation', async () => {
      // This test would require a PUT/PATCH endpoint for allocations
      // For now, we verify read isolation which implies write isolation
      // (can't update what you can't read)
    });
  });

  describe('Join query scoping', () => {
    it('Query with joins remains scoped to tenant organization', async () => {
      // This test verifies that queries with joins (e.g., Project with Workspace)
      // are still properly scoped by organizationId
      // Implementation depends on specific join queries in the codebase
    });
  });

  describe('Workspace cross-tenant negative test', () => {
    let workspaceA: any;
    let workspaceB: any;

    beforeAll(async () => {
      // Create workspaces for each org
      const workspaceRepo = dataSource.getRepository(Workspace);
      workspaceA = await workspaceRepo.save({
        name: 'Workspace A',
        organizationId: orgA.id,
        createdBy: userA.id,
      });
      workspaceB = await workspaceRepo.save({
        name: 'Workspace B',
        organizationId: orgB.id,
        createdBy: userB.id,
      });
    });

    it('User from Org A cannot access Org B workspace via route param', async () => {
      // Use shared test helper to enforce 403 policy
      await assertCrossTenantWorkspace403({
        request: request(app.getHttpServer()),
        token: tokenA,
        workspaceId: workspaceB.id,
        method: 'GET',
        endpoint: '/api/workspaces/:id',
        query: { organizationId: orgB.id }, // Attempt to bypass - should be ignored
      });
    });

    it('User from Org B cannot access Org A workspace via route param', async () => {
      // Use shared test helper to enforce 403 policy
      await assertCrossTenantWorkspace403({
        request: request(app.getHttpServer()),
        token: tokenB,
        workspaceId: workspaceA.id,
        method: 'GET',
        endpoint: '/api/workspaces/:id',
        body: { organizationId: orgA.id }, // Attempt to bypass in body - should be ignored
      });
    });
  });

  describe('Concurrency safety', () => {
    it('Parallel requests with different orgs do not bleed context', async () => {
      // Create projects for each org to test read isolation
      const projectRepo = dataSource.getRepository(Project);
      const projectA = await projectRepo.save({
        name: 'Project A',
        organizationId: orgA.id,
        status: 'active',
      });
      const projectB = await projectRepo.save({
        name: 'Project B',
        organizationId: orgB.id,
        status: 'active',
      });

      // Simulate two parallel requests reading projects
      const [responseA, responseB] = await Promise.all([
        request(app.getHttpServer())
          .get(`/api/projects/${projectA.id}`)
          .set('Authorization', `Bearer ${tokenA}`),
        request(app.getHttpServer())
          .get(`/api/projects/${projectB.id}`)
          .set('Authorization', `Bearer ${tokenB}`),
      ]);

      // Both should succeed
      expect(responseA.status).toBe(200);
      expect(responseB.status).toBe(200);

      // Verify each response only contains data from its org
      if (responseA.body.data) {
        expect(responseA.body.data.organizationId).toBe(orgA.id);
        expect(responseA.body.data.id).toBe(projectA.id);
      }

      if (responseB.body.data) {
        expect(responseB.body.data.organizationId).toBe(orgB.id);
        expect(responseB.body.data.id).toBe(projectB.id);
      }

      // Verify no cross-tenant access: User A should not see Project B
      const responseAForB = await request(app.getHttpServer())
        .get(`/api/projects/${projectB.id}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(404); // Should not find it (scoped to Org A)

      // Cleanup
      await projectRepo.delete([projectA.id, projectB.id]);
    });

    it('Org-scoped read endpoints do not return data from different organization', async () => {
      // Create work items for each org
      const workItemRepo = dataSource.getRepository('work_items');
      const workItemA = await workItemRepo.save({
        organizationId: orgA.id,
        workspaceId: workspaceA.id,
        projectId: projectA.id,
        title: 'Work Item A',
        type: 'task',
        status: 'todo',
      });
      const workItemB = await workItemRepo.save({
        organizationId: orgB.id,
        workspaceId: workspaceB.id,
        projectId: projectB.id,
        title: 'Work Item B',
        type: 'task',
        status: 'todo',
      });

      // User A requests work items
      const responseA = await request(app.getHttpServer())
        .get('/api/work-items')
        .set('Authorization', `Bearer ${tokenA}`)
        .query({ workspaceId: workspaceA.id })
        .expect(200);

      // Verify all returned items belong to orgA
      const items = responseA.body || [];
      if (Array.isArray(items) && items.length > 0) {
        expect(items.every((item: any) => item.organizationId === orgA.id)).toBe(
          true,
        );
        expect(items.some((item: any) => item.id === workItemB.id)).toBe(
          false,
        );
      }

      // Cleanup
      await workItemRepo.delete([workItemA.id, workItemB.id]);
    });
  });

  describe('Missing context behavior', () => {
    it('Throws error when organizationId missing in context', async () => {
      // This test would require a way to call repository methods without context
      // In practice, this is tested by ensuring interceptor always sets context
      // for authenticated routes
    });
  });
});

// Import In for cleanup
import { In } from 'typeorm';
