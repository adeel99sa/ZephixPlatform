import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { User } from '../src/modules/users/entities/user.entity';
import { Organization } from '../src/organizations/entities/organization.entity';
import { Workspace } from '../src/modules/workspaces/entities/workspace.entity';
import { Dashboard } from '../src/modules/dashboards/entities/dashboard.entity';
import { DashboardShare } from '../src/modules/dashboards/entities/dashboard-share.entity';
import { WorkspaceMember } from '../src/modules/workspaces/entities/workspace-member.entity';
import { UserOrganization } from '../src/organizations/entities/user-organization.entity';
import { DashboardScope, DashboardShareAccess } from '../src/modules/dashboards/domain/dashboard.enums';
import * as bcrypt from 'bcrypt';

describe('Dashboard Access Model (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let httpServer: any;

  // Test data
  let org1: Organization;
  let adminUser: User;
  let memberUser: User;
  let viewerUser: User;
  let workspace1: Workspace;
  let orgDashboard: Dashboard;
  let workspaceDashboard: Dashboard;

  let adminToken: string;
  let memberToken: string;
  let viewerToken: string;

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

    httpServer = app.getHttpServer();
    dataSource = app.get(DataSource);

    if (dataSource && dataSource.isInitialized) {
      await cleanupTestData();
    }

    // Create test organization
    const timestamp = Date.now();
    org1 = await createTestOrganization(`Dashboard Access Test Org ${timestamp}`);

    // Create test users
    const testEmailSuffix = `-${timestamp}@dashboard-test.com`;
    adminUser = await createTestUser(
      `admin${testEmailSuffix}`,
      'Admin',
      'User',
      org1.id,
      'admin',
    );
    memberUser = await createTestUser(
      `member${testEmailSuffix}`,
      'Member',
      'User',
      org1.id,
      'member',
    );
    viewerUser = await createTestUser(
      `viewer${testEmailSuffix}`,
      'Viewer',
      'User',
      org1.id,
      'viewer',
    );

    // Create UserOrganization entries
    await createUserOrganization(adminUser.id, org1.id, 'admin');
    await createUserOrganization(memberUser.id, org1.id, 'member');
    await createUserOrganization(viewerUser.id, org1.id, 'viewer');

    // Create test workspace
    workspace1 = await createTestWorkspace(
      'Dashboard Access Test Workspace',
      org1.id,
      adminUser.id,
    );

    // Create workspace memberships
    await createWorkspaceMember(workspace1.id, adminUser.id, 'workspace_owner');
    await createWorkspaceMember(workspace1.id, memberUser.id, 'workspace_member');
    await createWorkspaceMember(workspace1.id, viewerUser.id, 'workspace_viewer');

    // Get auth tokens
    adminToken = await getAuthToken(adminUser.email, 'password123');
    memberToken = await getAuthToken(memberUser.email, 'password123');
    viewerToken = await getAuthToken(viewerUser.email, 'password123');

    // Create org dashboard
    const orgDashRes = await request(httpServer)
      .post('/api/org/dashboards')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Org Dashboard', description: 'Test org dashboard' })
      .expect(201);

    orgDashboard = orgDashRes.body.data;

    // Create workspace dashboard
    const wsDashRes = await request(httpServer)
      .post(`/api/workspaces/${workspace1.id}/dashboards`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Workspace Dashboard', description: 'Test workspace dashboard' })
      .expect(201);

    workspaceDashboard = wsDashRes.body.data;
  });

  afterAll(async () => {
    if (dataSource && dataSource.isInitialized) {
      await cleanupTestData();
    }
    await app.close();
  });

  describe('Org Dashboard Access', () => {
    it('should allow Admin to create and access org dashboard', async () => {
      const res = await request(httpServer)
        .get(`/api/org/dashboards/${orgDashboard.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data.id).toBe(orgDashboard.id);
    });

    it('should deny Member not invited to org dashboard', async () => {
      await request(httpServer)
        .get(`/api/org/dashboards/${orgDashboard.id}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(403)
        .then((res) => {
          expect(res.body.code).toBe('DASHBOARD_NOT_INVITED');
        });
    });

    it('should allow Member invited with VIEW access to GET but not PATCH', async () => {
      // Admin invites member with VIEW access
      const shareRepo = dataSource.getRepository(DashboardShare);
      const share = shareRepo.create({
        organizationId: org1.id,
        dashboardId: orgDashboard.id,
        invitedUserId: memberUser.id,
        createdByUserId: adminUser.id,
        access: DashboardShareAccess.VIEW,
        exportAllowed: false,
      });
      await shareRepo.save(share);

      // Member can GET
      await request(httpServer)
        .get(`/api/org/dashboards/${orgDashboard.id}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);

      // Member cannot PATCH
      await request(httpServer)
        .patch(`/api/org/dashboards/${orgDashboard.id}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ name: 'Updated Name' })
        .expect(403)
        .then((res) => {
          expect(res.body.code).toBe('DASHBOARD_EDIT_FORBIDDEN');
        });
    });

    it('should allow Member invited with EDIT access to PATCH', async () => {
      // Update share to EDIT
      const shareRepo = dataSource.getRepository(DashboardShare);
      const share = await shareRepo.findOne({
        where: {
          dashboardId: orgDashboard.id,
          invitedUserId: memberUser.id,
        },
      });
      if (share) {
        share.access = DashboardShareAccess.EDIT;
        await shareRepo.save(share);
      }

      // Member can PATCH
      await request(httpServer)
        .patch(`/api/org/dashboards/${orgDashboard.id}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ name: 'Updated Name' })
        .expect(200);
    });

    it('should enforce Viewer is always view-only even if invited as EDIT', async () => {
      // Admin invites viewer with EDIT access
      const shareRepo = dataSource.getRepository(DashboardShare);
      let share = await shareRepo.findOne({
        where: {
          dashboardId: orgDashboard.id,
          invitedUserId: viewerUser.id,
        },
      });
      if (!share) {
        share = shareRepo.create({
          organizationId: org1.id,
          dashboardId: orgDashboard.id,
          invitedUserId: viewerUser.id,
          createdByUserId: adminUser.id,
          access: DashboardShareAccess.EDIT,
          exportAllowed: false,
        });
      } else {
        share.access = DashboardShareAccess.EDIT;
      }
      await shareRepo.save(share);

      // Viewer can GET
      await request(httpServer)
        .get(`/api/org/dashboards/${orgDashboard.id}`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .expect(200);

      // Viewer cannot PATCH even with EDIT share
      await request(httpServer)
        .patch(`/api/org/dashboards/${orgDashboard.id}`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({ name: 'Updated Name' })
        .expect(403);
    });
  });

  describe('Workspace Dashboard Access', () => {
    it('should allow workspace owner to access workspace dashboard without invite', async () => {
      await request(httpServer)
        .get(`/api/workspaces/${workspace1.id}/dashboards/${workspaceDashboard.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('should deny workspace member not invited to workspace dashboard', async () => {
      await request(httpServer)
        .get(`/api/workspaces/${workspace1.id}/dashboards/${workspaceDashboard.id}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(403)
        .then((res) => {
          expect(res.body.code).toBe('DASHBOARD_NOT_INVITED');
        });
    });

    it('should allow workspace member invited with edit to PATCH', async () => {
      // Admin invites member with EDIT access
      const shareRepo = dataSource.getRepository(DashboardShare);
      const share = shareRepo.create({
        organizationId: org1.id,
        dashboardId: workspaceDashboard.id,
        invitedUserId: memberUser.id,
        createdByUserId: adminUser.id,
        access: DashboardShareAccess.EDIT,
        exportAllowed: false,
      });
      await shareRepo.save(share);

      // Member can PATCH
      await request(httpServer)
        .patch(`/api/workspaces/${workspace1.id}/dashboards/${workspaceDashboard.id}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ name: 'Updated Workspace Dashboard' })
        .expect(200);
    });
  });

  // Helper functions
  async function cleanupTestData() {
    try {
      const shareRepo = dataSource.getRepository(DashboardShare);
      await shareRepo.delete({});
    } catch (e) {
      /* table might not exist */
    }

    try {
      const dashboardRepo = dataSource.getRepository(Dashboard);
      await dashboardRepo.delete({});
    } catch (e) {
      /* table might not exist */
    }

    try {
      const memberRepo = dataSource.getRepository(WorkspaceMember);
      await memberRepo.delete({});
    } catch (e) {
      /* table might not exist */
    }

    try {
      const workspaceRepo = dataSource.getRepository(Workspace);
      await workspaceRepo.delete({});
    } catch (e) {
      /* table might not exist */
    }

    try {
      const userOrgRepo = dataSource.getRepository(UserOrganization);
      await userOrgRepo.delete({});
    } catch (e) {
      /* table might not exist */
    }

    try {
      const userRepo = dataSource.getRepository(User);
      await userRepo.delete({});
    } catch (e) {
      /* table might not exist */
    }

    try {
      const orgRepo = dataSource.getRepository(Organization);
      await orgRepo.delete({});
    } catch (e) {
      /* table might not exist */
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
    role: 'workspace_owner' | 'workspace_member' | 'workspace_viewer',
  ): Promise<WorkspaceMember> {
    const memberRepo = dataSource.getRepository(WorkspaceMember);
    const member = memberRepo.create({
      workspaceId,
      userId,
      role,
      status: 'active',
    });
    return memberRepo.save(member);
  }

  async function getAuthToken(email: string, password: string): Promise<string> {
    const response = await request(httpServer)
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
