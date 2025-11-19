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
import { UserOrganization } from '../src/organizations/entities/user-organization.entity';
import * as bcrypt from 'bcrypt';

describe('Workspace RBAC (E2E)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  // Test data
  let org1: Organization;
  let orgAdmin: User;
  let userOwner: User;
  let userMember: User;
  let userViewer: User;
  let workspace1: Workspace;
  let project1: Project;

  let orgAdminToken: string;
  let ownerToken: string;
  let memberToken: string;
  let viewerToken: string;

  beforeAll(async () => {
    // Ensure DATABASE_URL is set for Railway database connection
    if (!process.env.DATABASE_URL) {
      console.warn('⚠️  WARNING: DATABASE_URL not set. Tests require Railway database connection.');
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

    // Create test organization with unique name
    const timestamp = Date.now();
    org1 = await createTestOrganization(`RBAC Test Org ${timestamp}`);

    // Create test users with unique emails
    const testEmailSuffix = `-${timestamp}@rbac-test.com`;
    orgAdmin = await createTestUser(`admin${testEmailSuffix}`, 'Org', 'Admin', org1.id, 'admin');
    userOwner = await createTestUser(`owner${testEmailSuffix}`, 'Workspace', 'Owner', org1.id, 'member');
    userMember = await createTestUser(`member${testEmailSuffix}`, 'Workspace', 'Member', org1.id, 'member');
    userViewer = await createTestUser(`viewer${testEmailSuffix}`, 'Workspace', 'Viewer', org1.id, 'member');

    // Create UserOrganization entries (required for workspace member management)
    await createUserOrganization(orgAdmin.id, org1.id, 'admin');
    await createUserOrganization(userOwner.id, org1.id, 'pm');
    await createUserOrganization(userMember.id, org1.id, 'pm');
    await createUserOrganization(userViewer.id, org1.id, 'viewer');

    // Create test workspace
    workspace1 = await createTestWorkspace('RBAC Test Workspace', org1.id, userOwner.id);

    // Add workspace members with different roles
    await createWorkspaceMember(workspace1.id, userOwner.id, 'owner');
    await createWorkspaceMember(workspace1.id, userMember.id, 'member');
    await createWorkspaceMember(workspace1.id, userViewer.id, 'viewer');

    // Create test project
    project1 = await createTestProject('RBAC Test Project', org1.id, workspace1.id);

    // Get auth tokens
    orgAdminToken = await getAuthToken(orgAdmin.email, 'password123');
    ownerToken = await getAuthToken(userOwner.email, 'password123');
    memberToken = await getAuthToken(userMember.email, 'password123');
    viewerToken = await getAuthToken(userViewer.email, 'password123');
  });

  afterAll(async () => {
    if (dataSource && dataSource.isInitialized) {
      await cleanupTestData();
    }
    await app.close();
  });

  describe('Feature Flag OFF (Backwards Compatibility)', () => {
    beforeEach(() => {
      // Ensure flag is OFF
      process.env.ZEPHIX_WS_MEMBERSHIP_V1 = undefined;
    });

    it('Should allow all users to access workspaces (backwards compatible)', async () => {
      // With flag OFF, existing behavior should be maintained
      // This is already tested in workspace-membership-filtering.e2e-spec.ts
      // So we keep this test minimal
      const response = await request(app.getHttpServer())
        .get('/api/workspaces')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
    });
  });

  describe('Feature Flag ON - Workspace Level RBAC', () => {
    beforeEach(() => {
      // Enable flag
      process.env.ZEPHIX_WS_MEMBERSHIP_V1 = '1';
    });

    afterEach(() => {
      // Disable flag
      process.env.ZEPHIX_WS_MEMBERSHIP_V1 = undefined;
    });

    describe('Workspace Deletion', () => {
      it('Org admin can delete workspace', async () => {
        // Create a workspace for deletion test
        const testWs = await createTestWorkspace('Delete Test WS', org1.id, userOwner.id);
        await createWorkspaceMember(testWs.id, userOwner.id, 'owner');

        await request(app.getHttpServer())
          .delete(`/api/workspaces/${testWs.id}`)
          .set('Authorization', `Bearer ${orgAdminToken}`)
          .expect(200);
      });

      it('Workspace owner can delete workspace', async () => {
        // Create a workspace for deletion test
        const testWs = await createTestWorkspace('Owner Delete Test WS', org1.id, userOwner.id);
        await createWorkspaceMember(testWs.id, userOwner.id, 'owner');

        await request(app.getHttpServer())
          .delete(`/api/workspaces/${testWs.id}`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .expect(200);
      });

      it('Workspace member cannot delete workspace (403)', async () => {
        await request(app.getHttpServer())
          .delete(`/api/workspaces/${workspace1.id}`)
          .set('Authorization', `Bearer ${memberToken}`)
          .expect(403);
      });

      it('Workspace viewer cannot delete workspace (403)', async () => {
        await request(app.getHttpServer())
          .delete(`/api/workspaces/${workspace1.id}`)
          .set('Authorization', `Bearer ${viewerToken}`)
          .expect(403);
      });
    });

    describe('Member Management', () => {
      let testUser: User;
      let testUserToken: string;

      beforeAll(async () => {
        // Create a test user to add as member
        const timestamp = Date.now();
        testUser = await createTestUser(`testuser-${timestamp}@rbac-test.com`, 'Test', 'User', org1.id, 'member');
        // Create UserOrganization entry for testUser
        await createUserOrganization(testUser.id, org1.id, 'pm');
        testUserToken = await getAuthToken(testUser.email, 'password123');
      });

      it('Workspace owner can add a member', async () => {
        const response = await request(app.getHttpServer())
          .post(`/api/workspaces/${workspace1.id}/members`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({ userId: testUser.id, role: 'member' })
          .expect(201);

        expect(response.body).toBeDefined();
      });

      it('Workspace member cannot add a member (403)', async () => {
        const newUser = await createTestUser(`newuser-${Date.now()}@rbac-test.com`, 'New', 'User', org1.id, 'member');

        await request(app.getHttpServer())
          .post(`/api/workspaces/${workspace1.id}/members`)
          .set('Authorization', `Bearer ${memberToken}`)
          .send({ userId: newUser.id, role: 'member' })
          .expect(403);
      });

      it('Workspace viewer cannot add a member (403)', async () => {
        const newUser = await createTestUser(`newuser2-${Date.now()}@rbac-test.com`, 'New', 'User', org1.id, 'member');

        await request(app.getHttpServer())
          .post(`/api/workspaces/${workspace1.id}/members`)
          .set('Authorization', `Bearer ${viewerToken}`)
          .send({ userId: newUser.id, role: 'member' })
          .expect(403);
      });

      it('Workspace owner can change member role from member to viewer', async () => {
        // First add testUser as member if not already
        const member = await dataSource.getRepository(WorkspaceMember).findOne({
          where: { workspaceId: workspace1.id, userId: testUser.id },
        });

        if (!member) {
          await createWorkspaceMember(workspace1.id, testUser.id, 'member');
        }

        const response = await request(app.getHttpServer())
          .patch(`/api/workspaces/${workspace1.id}/members/${testUser.id}`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({ role: 'viewer' })
          .expect(200);

        // changeRole returns { ok: true }, verify by checking the member directly
        expect(response.body.ok).toBe(true);

        // Verify the role was actually changed
        const updatedMember = await dataSource.getRepository(WorkspaceMember).findOne({
          where: { workspaceId: workspace1.id, userId: testUser.id },
        });
        expect(updatedMember?.role).toBe('viewer');
      });

      it('Workspace member cannot change roles (403)', async () => {
        await request(app.getHttpServer())
          .patch(`/api/workspaces/${workspace1.id}/members/${testUser.id}`)
          .set('Authorization', `Bearer ${memberToken}`)
          .send({ role: 'member' })
          .expect(403);
      });

      it('Workspace viewer cannot change roles (403)', async () => {
        await request(app.getHttpServer())
          .patch(`/api/workspaces/${workspace1.id}/members/${testUser.id}`)
          .set('Authorization', `Bearer ${viewerToken}`)
          .send({ role: 'member' })
          .expect(403);
      });

      it('Workspace owner can remove members', async () => {
        // Add a user to remove
        const removeUser = await createTestUser(`remove-${Date.now()}@rbac-test.com`, 'Remove', 'User', org1.id, 'member');
        await createWorkspaceMember(workspace1.id, removeUser.id, 'member');

        await request(app.getHttpServer())
          .delete(`/api/workspaces/${workspace1.id}/members/${removeUser.id}`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .expect(200);
      });
    });

    describe('Change Owner Endpoint', () => {
      it('Only org admin can call change owner endpoint', async () => {
        const newOwner = await createTestUser(`newowner-${Date.now()}@rbac-test.com`, 'New', 'Owner', org1.id, 'member');
        // Create UserOrganization entry for newOwner
        await createUserOrganization(newOwner.id, org1.id, 'pm');
        await createWorkspaceMember(workspace1.id, newOwner.id, 'member');

        const response = await request(app.getHttpServer())
          .post(`/api/workspaces/${workspace1.id}/change-owner`)
          .set('Authorization', `Bearer ${orgAdminToken}`)
          .send({ newOwnerId: newOwner.id })
          .expect(201);

        expect(response.body).toBeDefined();
      });

      it('Owner calling change owner returns 403', async () => {
        await request(app.getHttpServer())
          .post(`/api/workspaces/${workspace1.id}/change-owner`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({ newOwnerId: userMember.id })
          .expect(403);
      });

      it('Member calling change owner returns 403', async () => {
        await request(app.getHttpServer())
          .post(`/api/workspaces/${workspace1.id}/change-owner`)
          .set('Authorization', `Bearer ${memberToken}`)
          .send({ newOwnerId: userMember.id })
          .expect(403);
      });

      it('Viewer calling change owner returns 403', async () => {
        await request(app.getHttpServer())
          .post(`/api/workspaces/${workspace1.id}/change-owner`)
          .set('Authorization', `Bearer ${viewerToken}`)
          .send({ newOwnerId: userMember.id })
          .expect(403);
      });
    });
  });

  describe('Feature Flag ON - Project Level RBAC', () => {
    beforeEach(() => {
      // Enable flag
      process.env.ZEPHIX_WS_MEMBERSHIP_V1 = '1';
    });

    afterEach(() => {
      // Disable flag
      process.env.ZEPHIX_WS_MEMBERSHIP_V1 = undefined;
    });

    it('Workspace member can create project in their workspace', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/projects')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          name: 'Member Created Project',
          workspaceId: workspace1.id,
          status: 'planning',
          priority: 'medium',
          riskLevel: 'medium',
        })
        .expect(201);

      expect(response.body).toBeDefined();
      expect(response.body.name).toBe('Member Created Project');
    });

    it('Workspace viewer cannot create project (403)', async () => {
      await request(app.getHttpServer())
        .post('/api/projects')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({
          name: 'Viewer Created Project',
          workspaceId: workspace1.id,
          status: 'planning',
          priority: 'medium',
          riskLevel: 'medium',
        })
        .expect(403);
    });

    it('Workspace member can update project in their workspace', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/projects/${project1.id}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ name: 'Updated by Member' })
        .expect(200);

      expect(response.body.name).toBe('Updated by Member');
    });

    it('Workspace viewer cannot update project (403)', async () => {
      await request(app.getHttpServer())
        .patch(`/api/projects/${project1.id}`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({ name: 'Updated by Viewer' })
        .expect(403);
    });

    it('Workspace member can delete project in their workspace', async () => {
      // Create a project to delete
      const deleteProject = await createTestProject('Delete Me', org1.id, workspace1.id);

      await request(app.getHttpServer())
        .delete(`/api/projects/${deleteProject.id}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);
    });

    it('Workspace viewer cannot delete project (403)', async () => {
      await request(app.getHttpServer())
        .delete(`/api/projects/${project1.id}`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .expect(403);
    });

      it('Non member cannot create or update project in that workspace (403)', async () => {
        // Create a user who is not a member
        const timestamp = Date.now();
        const nonMember = await createTestUser(`nonmember-${timestamp}@rbac-test.com`, 'Non', 'Member', org1.id, 'member');
        // Create UserOrganization entry for nonMember
        await createUserOrganization(nonMember.id, org1.id, 'pm');
        const nonMemberToken = await getAuthToken(nonMember.email, 'password123');

      // Try to create project
      await request(app.getHttpServer())
        .post('/api/projects')
        .set('Authorization', `Bearer ${nonMemberToken}`)
        .send({
          name: 'Non Member Project',
          workspaceId: workspace1.id,
          status: 'planning',
          priority: 'medium',
          riskLevel: 'medium',
        })
        .expect(403);

      // Try to update project
      await request(app.getHttpServer())
        .patch(`/api/projects/${project1.id}`)
        .set('Authorization', `Bearer ${nonMemberToken}`)
        .send({ name: 'Updated by Non Member' })
        .expect(403);
    });

    it('Org admin can create and update projects in any workspace', async () => {
      // Create project
      const response = await request(app.getHttpServer())
        .post('/api/projects')
        .set('Authorization', `Bearer ${orgAdminToken}`)
        .send({
          name: 'Admin Created Project',
          workspaceId: workspace1.id,
          status: 'planning',
          priority: 'medium',
          riskLevel: 'medium',
        })
        .expect(201);

      expect(response.body).toBeDefined();

      // Update project
      const updateResponse = await request(app.getHttpServer())
        .patch(`/api/projects/${response.body.id}`)
        .set('Authorization', `Bearer ${orgAdminToken}`)
        .send({ name: 'Admin Updated Project' })
        .expect(200);

      expect(updateResponse.body.name).toBe('Admin Updated Project');
    });
  });

  describe('Workspace creation transactions', () => {
    beforeEach(() => {
      // Enable flag for transaction tests
      process.env.ZEPHIX_WS_MEMBERSHIP_V1 = '1';
    });

    afterEach(() => {
      process.env.ZEPHIX_WS_MEMBERSHIP_V1 = undefined;
    });

    it('Should create workspace with owner atomically (happy path)', async () => {
      const timestamp = Date.now();
      const testUser = await createTestUser(`trans-test-${timestamp}@rbac-test.com`, 'Trans', 'Test', org1.id, 'member');
      await createUserOrganization(testUser.id, org1.id, 'pm');
      const testToken = await getAuthToken(orgAdmin.email, 'password123');

      const workspaceName = `Transaction Test WS ${timestamp}`;
      const response = await request(app.getHttpServer())
        .post('/api/workspaces')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          name: workspaceName,
          slug: `trans-test-ws-${timestamp}`,
          ownerId: testUser.id,
        })
        .expect(201);

      expect(response.body).toBeDefined();
      expect(response.body.name).toBe(workspaceName);

      // Verify workspace exists
      const workspaceRepo = dataSource.getRepository(Workspace);
      const workspace = await workspaceRepo.findOne({
        where: { id: response.body.id },
      });
      expect(workspace).toBeDefined();
      expect(workspace?.name).toBe(workspaceName);

      // Verify owner member exists
      const memberRepo = dataSource.getRepository(WorkspaceMember);
      const member = await memberRepo.findOne({
        where: { workspaceId: response.body.id, userId: testUser.id },
      });
      expect(member).toBeDefined();
      expect(member?.role).toBe('owner');
    });

    it('Should rollback workspace creation if member creation fails', async () => {
      const timestamp = Date.now();
      const testToken = await getAuthToken(orgAdmin.email, 'password123');

      // Use an invalid userId that doesn't exist in the organization
      // This should cause member creation to fail
      const invalidUserId = '00000000-0000-0000-0000-000000000000';
      const workspaceName = `Rollback Test WS ${timestamp}`;
      const workspaceSlug = `rollback-test-ws-${timestamp}`;

      const response = await request(app.getHttpServer())
        .post('/api/workspaces')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          name: workspaceName,
          slug: workspaceSlug,
          ownerId: invalidUserId,
        });

      // Should fail (either 400, 404, or 500 depending on validation)
      expect([400, 404, 500]).toContain(response.status);

      // Verify NO workspace exists with this name or slug
      const workspaceRepo = dataSource.getRepository(Workspace);
      const workspaceByName = await workspaceRepo.findOne({
        where: { name: workspaceName },
      });
      const workspaceBySlug = await workspaceRepo.findOne({
        where: { slug: workspaceSlug },
      });
      expect(workspaceByName).toBeNull();
      expect(workspaceBySlug).toBeNull();

      // Verify NO workspace_members row exists for this would-be workspace
      // Since workspace wasn't created, we can't check by workspaceId
      // But we can verify no orphaned members exist
      const memberRepo = dataSource.getRepository(WorkspaceMember);
      const allMembers = await memberRepo.find();
      const orphanedMember = allMembers.find(m => m.userId === invalidUserId);
      expect(orphanedMember).toBeUndefined();
    });

    it('Should rollback if owner user is not in organization', async () => {
      const timestamp = Date.now();
      const testToken = await getAuthToken(orgAdmin.email, 'password123');

      // Create a user in a different organization
      const otherOrg = await createTestOrganization(`Other Org ${timestamp}`);
      const otherOrgUser = await createTestUser(`otherorg-${timestamp}@rbac-test.com`, 'Other', 'Org', otherOrg.id, 'member');
      // Do NOT create UserOrganization entry - this should cause failure

      const workspaceName = `Cross Org Test WS ${timestamp}`;
      const workspaceSlug = `cross-org-ws-${timestamp}`;

      const response = await request(app.getHttpServer())
        .post('/api/workspaces')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          name: workspaceName,
          slug: workspaceSlug,
          ownerId: otherOrgUser.id,
        });

      // Should fail because user is not in the organization
      expect([400, 403, 404, 500]).toContain(response.status);

      // Verify NO workspace exists
      const workspaceRepo = dataSource.getRepository(Workspace);
      const workspace = await workspaceRepo.findOne({
        where: { name: workspaceName },
      });
      expect(workspace).toBeNull();

      // Verify NO workspace_members row exists
      const memberRepo = dataSource.getRepository(WorkspaceMember);
      const member = await memberRepo.findOne({
        where: { userId: otherOrgUser.id },
      });
      expect(member).toBeNull();
    });
  });

  // Helper functions
  async function cleanupTestData() {
    try {
      if (!dataSource || !dataSource.isInitialized) {
        return;
      }

      try {
        await dataSource.getRepository(Project).delete({});
      } catch (e) { /* table might not exist */ }

      try {
        await dataSource.getRepository(WorkspaceMember).delete({});
      } catch (e) { /* table might not exist */ }

      try {
        await dataSource.getRepository(UserOrganization).delete({});
      } catch (e) { /* table might not exist */ }

      try {
        await dataSource.getRepository(Workspace).delete({});
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

  async function createWorkspaceMember(
    workspaceId: string,
    userId: string,
    role: 'owner' | 'member' | 'viewer',
  ): Promise<WorkspaceMember | null> {
    try {
      const memberRepo = dataSource.getRepository(WorkspaceMember);
      const member = memberRepo.create({
        workspaceId,
        userId,
        role,
      });
      return await memberRepo.save(member);
    } catch (error) {
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
        if (res.status !== 200 && res.status !== 201) {
          throw new Error(`Expected 200 or 201, got ${res.status}`);
        }
      });

    return response.body.accessToken || response.body.token;
  }
});
