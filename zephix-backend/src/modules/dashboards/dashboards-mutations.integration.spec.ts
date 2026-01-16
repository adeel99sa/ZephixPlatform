/**
 * Dashboards Mutations Integration Tests
 *
 * Proves record-based authorization:
 * - Member without workspace access gets 404
 * - Admin with access succeeds
 * - x-workspace-id header does not change authorization outcome
 */
import * as dotenv from 'dotenv';
import * as path from 'path';
if (process.env.NODE_ENV === 'test') {
  dotenv.config({ path: path.resolve(__dirname, '../../../.env.test') });
}
if (
  !process.env.DATABASE_URL ||
  process.env.DATABASE_URL.toLowerCase().includes('production')
) {
  throw new Error(
    '❌ ERROR: DATABASE_URL appears to be production. Use test database only.',
  );
}
if (process.env.NODE_ENV !== 'test') {
  throw new Error(`❌ ERROR: NODE_ENV must be 'test', got: ${process.env.NODE_ENV}`);
}

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../app.module';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../../modules/users/entities/user.entity';
import { Organization } from '../../organizations/entities/organization.entity';
import { UserOrganization } from '../../organizations/entities/user-organization.entity';
import { Workspace } from '../../modules/workspaces/entities/workspace.entity';
import { WorkspaceMember } from '../../modules/workspaces/entities/workspace-member.entity';
import { Dashboard } from '../entities/dashboard.entity';
import { DashboardWidget } from '../entities/dashboard-widget.entity';
import { DashboardVisibility } from '../entities/dashboard.entity';

jest.setTimeout(60000);

describe('Dashboards Mutations Authorization (e2e)', () => {
  let app: INestApplication;
  let moduleFixture: TestingModule;
  let dataSource: DataSource;

  // Test data
  let orgId: string;
  let workspace1Id: string;
  let workspace2Id: string;
  let adminUserId: string;
  let memberUserId: string;
  let nonMemberUserId: string;
  let adminToken: string;
  let memberToken: string;
  let nonMemberToken: string;
  let dashboard1Id: string; // In workspace1
  let dashboard2Id: string; // In workspace2
  let widget1Id: string; // In dashboard1

  beforeAll(async () => {
    moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );
    await app.init();

    dataSource = moduleFixture.get<DataSource>(DataSource);
    await setupTestData();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('Share Enable/Disable', () => {
    it('Admin can enable share for dashboard in accessible workspace', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/dashboards/${dashboard1Id}/share-enable`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ expiresAt: null })
        .expect(200);

      expect(response.body.data).toHaveProperty('shareUrlPath');
      expect(response.body.data.shareUrlPath).toContain(dashboard1Id);
    });

    it('Member can enable share for dashboard in their workspace', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/dashboards/${dashboard1Id}/share-enable`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ expiresAt: null })
        .expect(200);

      expect(response.body.data).toHaveProperty('shareUrlPath');
    });

    it('Member without access gets 404 for dashboard in different workspace', async () => {
      // dashboard2 is in workspace2, member only has access to workspace1
      await request(app.getHttpServer())
        .post(`/api/dashboards/${dashboard2Id}/share-enable`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ expiresAt: null })
        .expect(404);
    });

    it('Header x-workspace-id does not change authorization outcome (member)', async () => {
      // Try to spoof workspace2 access by sending header, but dashboard is in workspace2
      // Should still get 404 because authorization uses stored dashboard.workspaceId
      await request(app.getHttpServer())
        .post(`/api/dashboards/${dashboard2Id}/share-enable`)
        .set('Authorization', `Bearer ${memberToken}`)
        .set('x-workspace-id', workspace2Id) // Attempt to spoof
        .send({ expiresAt: null })
        .expect(404);
    });

    it('Admin can disable share for dashboard in accessible workspace', async () => {
      await request(app.getHttpServer())
        .post(`/api/dashboards/${dashboard1Id}/share-disable`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('Member without access gets 404 when disabling share', async () => {
      await request(app.getHttpServer())
        .post(`/api/dashboards/${dashboard2Id}/share-disable`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(404);
    });
  });

  describe('Widget Add/Update/Delete', () => {
    it('Admin can add widget to dashboard in accessible workspace', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/dashboards/${dashboard1Id}/widgets`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          widgetKey: 'project_health',
          title: 'Test Widget',
          config: {},
          layout: { x: 0, y: 0, w: 4, h: 3 },
        })
        .expect(201);

      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.widgetKey).toBe('project_health');
    });

    it('Member can add widget to dashboard in their workspace', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/dashboards/${dashboard1Id}/widgets`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          widgetKey: 'sprint_metrics',
          title: 'Member Widget',
          config: {},
          layout: { x: 4, y: 0, w: 4, h: 3 },
        })
        .expect(201);

      expect(response.body.data).toHaveProperty('id');
    });

    it('Member without access gets 404 when adding widget to dashboard in different workspace', async () => {
      await request(app.getHttpServer())
        .post(`/api/dashboards/${dashboard2Id}/widgets`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          widgetKey: 'project_health',
          title: 'Unauthorized Widget',
          config: {},
          layout: { x: 0, y: 0, w: 4, h: 3 },
        })
        .expect(404);
    });

    it('Header x-workspace-id does not change authorization outcome for widget add', async () => {
      await request(app.getHttpServer())
        .post(`/api/dashboards/${dashboard2Id}/widgets`)
        .set('Authorization', `Bearer ${memberToken}`)
        .set('x-workspace-id', workspace2Id) // Attempt to spoof
        .send({
          widgetKey: 'project_health',
          title: 'Spoofed Widget',
          config: {},
          layout: { x: 0, y: 0, w: 4, h: 3 },
        })
        .expect(404);
    });

    it('Admin can update widget in dashboard', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/dashboards/${dashboard1Id}/widgets/${widget1Id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Updated Widget Title',
        })
        .expect(200);

      expect(response.body.data.title).toBe('Updated Widget Title');
    });

    it('Member without access gets 404 when updating widget in different workspace', async () => {
      // Create a widget in dashboard2 (workspace2)
      const widgetRepo = dataSource.getRepository(DashboardWidget);
      const widget2 = widgetRepo.create({
        organizationId: orgId,
        dashboardId: dashboard2Id,
        widgetKey: 'project_health',
        title: 'Workspace2 Widget',
        config: {},
        layout: { x: 0, y: 0, w: 4, h: 3 },
      });
      const savedWidget2 = await widgetRepo.save(widget2);

      await request(app.getHttpServer())
        .patch(`/api/dashboards/${dashboard2Id}/widgets/${savedWidget2.id}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          title: 'Unauthorized Update',
        })
        .expect(404);
    });

    it('Admin can delete widget in dashboard', async () => {
      // Create a widget to delete
      const widgetRepo = dataSource.getRepository(DashboardWidget);
      const widget = widgetRepo.create({
        organizationId: orgId,
        dashboardId: dashboard1Id,
        widgetKey: 'project_health',
        title: 'To Delete',
        config: {},
        layout: { x: 8, y: 0, w: 4, h: 3 },
      });
      const savedWidget = await widgetRepo.save(widget);

      await request(app.getHttpServer())
        .delete(`/api/dashboards/${dashboard1Id}/widgets/${savedWidget.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('Member without access gets 404 when deleting widget in different workspace', async () => {
      // Use widget2 from previous test
      const widgetRepo = dataSource.getRepository(DashboardWidget);
      const widget2 = await widgetRepo.findOne({
        where: { dashboardId: dashboard2Id },
      });

      if (widget2) {
        await request(app.getHttpServer())
          .delete(`/api/dashboards/${dashboard2Id}/widgets/${widget2.id}`)
          .set('Authorization', `Bearer ${memberToken}`)
          .expect(404);
      }
    });
  });

  describe('Dashboard Update/Delete', () => {
    it('Admin can update dashboard in accessible workspace', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/dashboards/${dashboard1Id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Updated Dashboard Name',
        })
        .expect(200);

      expect(response.body.data.name).toBe('Updated Dashboard Name');
    });

    it('Member can update dashboard in their workspace', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/dashboards/${dashboard1Id}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          description: 'Updated by member',
        })
        .expect(200);

      expect(response.body.data).toHaveProperty('description');
    });

    it('Member without access gets 404 when updating dashboard in different workspace', async () => {
      await request(app.getHttpServer())
        .patch(`/api/dashboards/${dashboard2Id}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          name: 'Unauthorized Update',
        })
        .expect(404);
    });

    it('Header x-workspace-id does not change authorization outcome for update', async () => {
      await request(app.getHttpServer())
        .patch(`/api/dashboards/${dashboard2Id}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .set('x-workspace-id', workspace2Id) // Attempt to spoof
        .send({
          name: 'Spoofed Update',
        })
        .expect(404);
    });

    it('Admin can delete dashboard in accessible workspace', async () => {
      // Create a dashboard to delete
      const dashboardRepo = dataSource.getRepository(Dashboard);
      const dashboard = dashboardRepo.create({
        organizationId: orgId,
        workspaceId: workspace1Id,
        name: 'To Delete',
        ownerUserId: adminUserId,
        visibility: DashboardVisibility.WORKSPACE,
      });
      const savedDashboard = await dashboardRepo.save(dashboard);

      await request(app.getHttpServer())
        .delete(`/api/dashboards/${savedDashboard.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('Member without access gets 404 when deleting dashboard in different workspace', async () => {
      await request(app.getHttpServer())
        .delete(`/api/dashboards/${dashboard2Id}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(404);
    });
  });

  async function setupTestData() {
    const timestamp = Date.now();
    const dummyPasswordHash = await bcrypt.hash('TestPassword123!', 10);

    // Create organization
    const orgRepo = dataSource.getRepository(Organization);
    const org = orgRepo.create({
      name: `Dashboards Mutations Test Org ${timestamp}`,
      slug: `dash-mut-test-${timestamp}`,
      status: 'trial',
    });
    const savedOrg = await orgRepo.save(org);
    orgId = savedOrg.id;

    // Create users
    const userRepo = dataSource.getRepository(User);
    const adminUser = userRepo.create({
      email: `admin-dash-mut-${timestamp}@test.com`,
      password: dummyPasswordHash,
      firstName: 'Admin',
      lastName: 'User',
      organizationId: orgId,
      role: 'admin',
      isEmailVerified: true,
      emailVerifiedAt: new Date(),
    });
    const memberUser = userRepo.create({
      email: `member-dash-mut-${timestamp}@test.com`,
      password: dummyPasswordHash,
      firstName: 'Member',
      lastName: 'User',
      organizationId: orgId,
      role: 'pm',
      isEmailVerified: true,
      emailVerifiedAt: new Date(),
    });
    const nonMemberUser = userRepo.create({
      email: `nonmember-dash-mut-${timestamp}@test.com`,
      password: dummyPasswordHash,
      firstName: 'NonMember',
      lastName: 'User',
      organizationId: orgId,
      role: 'pm',
      isEmailVerified: true,
      emailVerifiedAt: new Date(),
    });
    const savedAdmin = await userRepo.save(adminUser);
    const savedMember = await userRepo.save(memberUser);
    const savedNonMember = await userRepo.save(nonMemberUser);
    adminUserId = savedAdmin.id;
    memberUserId = savedMember.id;
    nonMemberUserId = savedNonMember.id;

    // Create user-organization links
    const userOrgRepo = dataSource.getRepository(UserOrganization);
    await userOrgRepo.save([
      {
        userId: adminUserId,
        organizationId: orgId,
        role: 'admin',
      },
      {
        userId: memberUserId,
        organizationId: orgId,
        role: 'pm',
      },
      {
        userId: nonMemberUserId,
        organizationId: orgId,
        role: 'pm',
      },
    ]);

    // Create workspaces
    const workspaceRepo = dataSource.getRepository(Workspace);
    const workspace1 = workspaceRepo.create({
      name: 'Workspace 1',
      slug: `ws1-${timestamp}`,
      organizationId: orgId,
      createdBy: adminUserId,
      ownerId: adminUserId,
      isPrivate: false,
    });
    const workspace2 = workspaceRepo.create({
      name: 'Workspace 2',
      slug: `ws2-${timestamp}`,
      organizationId: orgId,
      createdBy: adminUserId,
      ownerId: adminUserId,
      isPrivate: false,
    });
    const savedWs1 = await workspaceRepo.save(workspace1);
    const savedWs2 = await workspaceRepo.save(workspace2);
    workspace1Id = savedWs1.id;
    workspace2Id = savedWs2.id;

    // Create workspace memberships
    const memberRepo = dataSource.getRepository(WorkspaceMember);
    await memberRepo.save([
      {
        workspaceId: workspace1Id,
        userId: adminUserId,
        role: 'workspace_owner',
        createdBy: adminUserId,
      },
      {
        workspaceId: workspace1Id,
        userId: memberUserId,
        role: 'workspace_member',
        createdBy: adminUserId,
      },
      {
        workspaceId: workspace2Id,
        userId: adminUserId,
        role: 'workspace_owner',
        createdBy: adminUserId,
      },
      // memberUserId is NOT in workspace2
      // nonMemberUserId is NOT in any workspace
    ]);

    // Create dashboards
    const dashboardRepo = dataSource.getRepository(Dashboard);
    const dashboard1 = dashboardRepo.create({
      organizationId: orgId,
      workspaceId: workspace1Id,
      name: 'Dashboard 1',
      ownerUserId: adminUserId,
      visibility: DashboardVisibility.WORKSPACE,
    });
    const dashboard2 = dashboardRepo.create({
      organizationId: orgId,
      workspaceId: workspace2Id,
      name: 'Dashboard 2',
      ownerUserId: adminUserId,
      visibility: DashboardVisibility.WORKSPACE,
    });
    const savedDashboard1 = await dashboardRepo.save(dashboard1);
    const savedDashboard2 = await dashboardRepo.save(dashboard2);
    dashboard1Id = savedDashboard1.id;
    dashboard2Id = savedDashboard2.id;

    // Create widget in dashboard1
    const widgetRepo = dataSource.getRepository(DashboardWidget);
    const widget1 = widgetRepo.create({
      organizationId: orgId,
      dashboardId: dashboard1Id,
      widgetKey: 'project_health',
      title: 'Widget 1',
      config: {},
      layout: { x: 0, y: 0, w: 4, h: 3 },
    });
    const savedWidget1 = await widgetRepo.save(widget1);
    widget1Id = savedWidget1.id;

    // Login users to get tokens
    const adminLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: adminUser.email,
        password: 'TestPassword123!',
      })
      .expect(200);
    adminToken = adminLogin.body.accessToken;

    const memberLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: memberUser.email,
        password: 'TestPassword123!',
      })
      .expect(200);
    memberToken = memberLogin.body.accessToken;

    const nonMemberLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: nonMemberUser.email,
        password: 'TestPassword123!',
      })
      .expect(200);
    nonMemberToken = nonMemberLogin.body.accessToken;
  }
});
