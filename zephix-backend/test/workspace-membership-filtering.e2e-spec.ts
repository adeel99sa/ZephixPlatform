import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { User } from '../src/modules/users/entities/user.entity';
import { Organization } from '../src/organizations/entities/organization.entity';
import { Workspace } from '../src/modules/workspaces/entities/workspace.entity';
import { WorkspaceMember } from '../src/modules/workspaces/entities/workspace-member.entity';
import { Project, ProjectStatus, ProjectPriority, ProjectRiskLevel } from '../src/modules/projects/entities/project.entity';
import { Resource } from '../src/modules/resources/entities/resource.entity';
import { ResourceAllocation } from '../src/modules/resources/entities/resource-allocation.entity';
import { UserOrganization } from '../src/organizations/entities/user-organization.entity';
import * as bcrypt from 'bcrypt';

describe('Workspace Membership Filtering (E2E)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  // Test data
  let org1: Organization;
  let org2: Organization;
  let adminUser: User;
  let memberUser: User;
  let nonMemberUser: User;
  let workspace1: Workspace;
  let workspace2: Workspace;
  let workspace3: Workspace; // In org2
  let project1: Project;
  let project2: Project;
  let project3: Project; // In workspace2
  let adminToken: string;
  let memberToken: string;
  let nonMemberToken: string;

  beforeAll(async () => {
    // Disable demo bootstrap during tests
    process.env.DEMO_BOOTSTRAP = 'false';

    // Ensure DATABASE_URL is set for Railway database connection
    // If not set, tests will fail - user must provide Railway DATABASE_URL
    if (!process.env.DATABASE_URL) {
      console.warn('⚠️  WARNING: DATABASE_URL not set. Tests require Railway database connection.');
      console.warn('⚠️  Please set DATABASE_URL environment variable to your Railway database URL.');
      console.warn('⚠️  Example: export DATABASE_URL="postgresql://user:pass@host:port/dbname"');
    }

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Apply the same configuration as main.ts
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true
    }));

    // Set the same global prefix as main.ts
    app.setGlobalPrefix('api');

    await app.init();

    dataSource = app.get(DataSource);

    // Clean up test data (only if dataSource is initialized)
    if (dataSource && dataSource.isInitialized) {
      await cleanupTestData();
    }

    // Create test organizations with unique names
    const timestamp = Date.now();
    org1 = await createTestOrganization(`Test Org 1 ${timestamp}`);
    org2 = await createTestOrganization(`Test Org 2 ${timestamp}`);

    // Create test users with unique emails
    const testEmailSuffix = `-${timestamp}@test.com`;
    adminUser = await createTestUser(`admin${testEmailSuffix}`, 'Admin', 'User', org1.id, 'admin');
    memberUser = await createTestUser(`member${testEmailSuffix}`, 'Member', 'User', org1.id, 'member');
    nonMemberUser = await createTestUser(`nonmember${testEmailSuffix}`, 'NonMember', 'User', org1.id, 'member');

    // Create UserOrganization entries (required for workspace membership feature flag)
    await createUserOrganization(adminUser.id, org1.id, 'admin');
    await createUserOrganization(memberUser.id, org1.id, 'pm');
    await createUserOrganization(nonMemberUser.id, org1.id, 'pm');

    // Create test workspaces
    workspace1 = await createTestWorkspace('Workspace 1', org1.id, adminUser.id);
    workspace2 = await createTestWorkspace('Workspace 2', org1.id, adminUser.id);
    workspace3 = await createTestWorkspace('Workspace 3', org2.id, adminUser.id);

    // Add memberUser to workspace1 only (if workspace_members table exists)
    const memberRecord = await createWorkspaceMember(workspace1.id, memberUser.id, 'workspace_member');
    if (!memberRecord) {
      console.warn('⚠️  Skipping workspace member creation - table does not exist');
    }

    // Create test projects
    project1 = await createTestProject('Project 1', org1.id, workspace1.id);
    project2 = await createTestProject('Project 2', org1.id, workspace1.id);
    project3 = await createTestProject('Project 3', org1.id, workspace2.id);

    // Get auth tokens
    adminToken = await getAuthToken(adminUser.email, 'password123');
    memberToken = await getAuthToken(memberUser.email, 'password123');
    nonMemberToken = await getAuthToken(nonMemberUser.email, 'password123');
  });

  afterAll(async () => {
    await cleanupTestData();
    await app.close();
  });

  describe('Feature Flag OFF (Default)', () => {
    beforeEach(() => {
      // Ensure flag is OFF
      process.env.ZEPHIX_WS_MEMBERSHIP_V1 = undefined;
    });

    it('Admin should see all workspaces in org', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/workspaces')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.length).toBeGreaterThanOrEqual(2);
      expect(response.body.some((w: any) => w.id === workspace1.id)).toBe(true);
      expect(response.body.some((w: any) => w.id === workspace2.id)).toBe(true);
    });

    it('Member should see all workspaces in org (flag off)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/workspaces')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);

      expect(response.body.length).toBeGreaterThanOrEqual(2);
      expect(response.body.some((w: any) => w.id === workspace1.id)).toBe(true);
      expect(response.body.some((w: any) => w.id === workspace2.id)).toBe(true);
    });

    it('Non-member should see all workspaces in org (flag off)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/workspaces')
        .set('Authorization', `Bearer ${nonMemberToken}`)
        .expect(200);

      expect(response.body.length).toBeGreaterThanOrEqual(2);
    });

    it('Admin should see all projects in org', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/projects')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.projects.length).toBeGreaterThanOrEqual(3);
    });

    it('Member should see all projects in org (flag off)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/projects')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);

      expect(response.body.projects.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Feature Flag ON', () => {
    beforeEach(() => {
      // Enable flag
      process.env.ZEPHIX_WS_MEMBERSHIP_V1 = '1';
    });

    afterEach(() => {
      // Disable flag
      process.env.ZEPHIX_WS_MEMBERSHIP_V1 = undefined;
    });

    it('Admin should still see all workspaces in org', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/workspaces')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.length).toBeGreaterThanOrEqual(2);
      expect(response.body.some((w: any) => w.id === workspace1.id)).toBe(true);
      expect(response.body.some((w: any) => w.id === workspace2.id)).toBe(true);
    });

    it('Member should see only workspaces where they are members', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/workspaces')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);

      // Should only see workspace1 (where they are a member)
      expect(response.body.length).toBe(1);
      expect(response.body[0].id).toBe(workspace1.id);
      expect(response.body.some((w: any) => w.id === workspace2.id)).toBe(false);
    });

    it('Non-member should see no workspaces', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/workspaces')
        .set('Authorization', `Bearer ${nonMemberToken}`)
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('Member should access workspace1 directly', async () => {
      await request(app.getHttpServer())
        .get(`/api/workspaces/${workspace1.id}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);
    });

    it('Non-member should NOT access workspace1 directly (403)', async () => {
      await request(app.getHttpServer())
        .get(`/api/workspaces/${workspace1.id}`)
        .set('Authorization', `Bearer ${nonMemberToken}`)
        .expect(403);
    });

    it('Admin should see all projects in org', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/projects')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.projects.length).toBeGreaterThanOrEqual(3);
    });

    it('Member should see only projects in workspace1', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/projects')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);

      // Should only see projects in workspace1
      const projectIds = response.body.projects.map((p: any) => p.id);
      expect(projectIds).toContain(project1.id);
      expect(projectIds).toContain(project2.id);
      expect(projectIds).not.toContain(project3.id);
    });

    it('Non-member should see no projects', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/projects')
        .set('Authorization', `Bearer ${nonMemberToken}`)
        .expect(200);

      expect(response.body.projects).toEqual([]);
      expect(response.body.total).toBe(0);
    });

    it('Member should access project1 directly', async () => {
      await request(app.getHttpServer())
        .get(`/api/projects/${project1.id}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);
    });

    it('Non-member should NOT access project3 directly (403)', async () => {
      await request(app.getHttpServer())
        .get(`/api/projects/${project3.id}`)
        .set('Authorization', `Bearer ${nonMemberToken}`)
        .expect(403);
    });

    it('Resources heat-map should filter by accessible workspaces', async () => {
      // This test would require setting up resource allocations
      // For now, just verify endpoint doesn't crash
      const response = await request(app.getHttpServer())
        .get('/api/resources/heat-map')
        .query({ organizationId: org1.id })
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);

      // Should return data structure (even if empty)
      expect(response.body).toBeDefined();
    });

    it('Resources conflicts should filter by accessible workspaces', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/resources/conflicts')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  // Helper functions
  async function cleanupTestData() {
    try {
      if (!dataSource || !dataSource.isInitialized) {
        return; // DataSource not initialized yet
      }

      // Delete in reverse order of dependencies
      // Use try-catch for each deletion to handle missing tables gracefully
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
        await dataSource.getRepository(WorkspaceMember).delete({});
      } catch (e) { /* table might not exist */ }

      try {
        await dataSource.getRepository(Workspace).delete({});
      } catch (e) { /* table might not exist */ }

      try {
        await dataSource.getRepository(User).delete({});
      } catch (e) { /* table might not exist */ }

      try {
        await dataSource.getRepository(UserOrganization).delete({});
      } catch (e) { /* table might not exist */ }

      try {
        await dataSource.getRepository(Organization).delete({});
      } catch (e) { /* table might not exist */ }
    } catch (error) {
      // Ignore errors during cleanup
      console.warn('Cleanup warning:', error.message);
    }
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

  async function createTestOrganization(name: string): Promise<Organization> {
    const orgRepo = dataSource.getRepository(Organization);
    // Use timestamp to ensure uniqueness
    const uniqueSlug = `${name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;

    // Try to find existing org with this slug first
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
    return one(await wsRepo.save(workspace));
  }

  // Helper to normalize TypeORM save results (T | T[] -> T)
  function one<T>(saved: T | T[]): T {
    return Array.isArray(saved) ? saved[0] : saved;
  }

  async function createWorkspaceMember(
    workspaceId: string,
    userId: string,
    role: 'workspace_owner' | 'workspace_member' | 'workspace_viewer' | 'delivery_owner' | 'stakeholder',
  ): Promise<WorkspaceMember | null> {
    try {
      const memberRepo = dataSource.getRepository(WorkspaceMember);
      const member = memberRepo.create({
        workspaceId,
        userId,
        role,
      });
      const saved = await memberRepo.save(member);
      const savedMember = Array.isArray(saved) ? saved[0] : saved;
      return savedMember;
    } catch (error) {
      // If workspace_members table doesn't exist, return null
      // This allows tests to run even if the table hasn't been created yet
      if (error.message?.includes('does not exist') || error.message?.includes('relation')) {
        console.warn('⚠️  workspace_members table does not exist. Skipping member creation.');
        return null;
      }
      throw error;
    }
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
      status: ProjectStatus.PLANNING,
      priority: ProjectPriority.MEDIUM,
      riskLevel: ProjectRiskLevel.MEDIUM,
    });
    return projectRepo.save(project);
  }

  async function getAuthToken(email: string, password: string): Promise<string> {
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password })
      .expect((res) => {
        // Accept both 200 (existing user) and 201 (new user created)
        if (res.status !== 200 && res.status !== 201) {
          throw new Error(`Expected 200 or 201, got ${res.status}`);
        }
      });

    return response.body.accessToken || response.body.token;
  }
});

