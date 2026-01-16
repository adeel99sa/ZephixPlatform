/**
 * PROMPT 6 E1: Backend E2E Tests for Workspace Admin Creation
 *
 * Tests:
 * 1. Admin creates workspace with owners
 * 2. Admin cannot set Guest as owner
 * 3. Member cannot create workspace
 * 4. Owners update must keep at least one owner
 * 5. Owners update rejects Guest
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { User } from '../src/modules/users/entities/user.entity';
import { UserOrganization } from '../src/organizations/entities/user-organization.entity';
import { Workspace } from '../src/modules/workspaces/entities/workspace.entity';
import { WorkspaceMember } from '../src/modules/workspaces/entities/workspace-member.entity';
import { Organization } from '../src/organizations/entities/organization.entity';

describe('Workspaces Admin Create (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let adminToken: string;
  let memberToken: string;
  let adminUserId: string;
  let memberUserId: string;
  let guestUserId: string;
  let orgId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    dataSource = moduleFixture.get<DataSource>(DataSource);

    // Create test organization
    const orgRepo = dataSource.getRepository(Organization);
    const org = orgRepo.create({
      name: 'Test Org',
      slug: 'test-org',
    });
    const savedOrg = await orgRepo.save(org);
    orgId = savedOrg.id;

    // Create admin user
    const userRepo = dataSource.getRepository(User);
    const adminUser = userRepo.create({
      email: 'admin@test.com',
      password: 'hashed-password',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      organizationId: orgId,
    });
    const savedAdmin = await userRepo.save(adminUser);
    adminUserId = savedAdmin.id;

    // Create member user
    const memberUser = userRepo.create({
      email: 'member@test.com',
      password: 'hashed-password',
      firstName: 'Member',
      lastName: 'User',
      role: 'member',
      organizationId: orgId,
    });
    const savedMember = await userRepo.save(memberUser);
    memberUserId = savedMember.id;

    // Create guest user
    const guestUser = userRepo.create({
      email: 'guest@test.com',
      password: 'hashed-password',
      firstName: 'Guest',
      lastName: 'User',
      role: 'guest',
      organizationId: orgId,
    });
    const savedGuest = await userRepo.save(guestUser);
    guestUserId = savedGuest.id;

    // Create UserOrganization records
    const userOrgRepo = dataSource.getRepository(UserOrganization);
    await userOrgRepo.save([
      {
        userId: adminUserId,
        organizationId: orgId,
        role: 'admin',
        isActive: true,
      },
      {
        userId: memberUserId,
        organizationId: orgId,
        role: 'pm',
        isActive: true,
      },
      {
        userId: guestUserId,
        organizationId: orgId,
        role: 'viewer',
        isActive: true,
      },
    ]);

    // Login as admin to get token
    const adminLoginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'admin@test.com',
        password: 'hashed-password',
      });
    adminToken = adminLoginResponse.body.token;

    // Login as member to get token
    const memberLoginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'member@test.com',
        password: 'hashed-password',
      });
    memberToken = memberLoginResponse.body.token;
  });

  afterAll(async () => {
    // Cleanup
    const workspaceRepo = dataSource.getRepository(Workspace);
    const memberRepo = dataSource.getRepository(WorkspaceMember);
    const userOrgRepo = dataSource.getRepository(UserOrganization);
    const userRepo = dataSource.getRepository(User);
    const orgRepo = dataSource.getRepository(Organization);

    await memberRepo.delete({});
    await workspaceRepo.delete({});
    await userOrgRepo.delete({});
    await userRepo.delete({});
    await orgRepo.delete({});

    await app.close();
  });

  describe('POST /api/workspaces', () => {
    it('1. Admin creates workspace with owners - should return 201 with { data: { workspaceId } }', async () => {
      const response = await request(app.getHttpServer())
        .post('/workspaces')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test Workspace',
          description: 'Test description',
          ownerUserIds: [adminUserId, memberUserId],
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('workspaceId');
      expect(typeof response.body.data.workspaceId).toBe('string');

      // Verify workspace_members rows exist with role workspace_owner
      const memberRepo = dataSource.getRepository(WorkspaceMember);
      const members = await memberRepo.find({
        where: { workspaceId: response.body.data.workspaceId },
      });

      expect(members.length).toBeGreaterThanOrEqual(2);
      const ownerMembers = members.filter(m => m.role === 'workspace_owner');
      expect(ownerMembers.length).toBeGreaterThanOrEqual(2);
      expect(ownerMembers.some(m => m.userId === adminUserId)).toBe(true);
      expect(ownerMembers.some(m => m.userId === memberUserId)).toBe(true);
    });

    it('2. Admin cannot set Guest as owner - should return 409', async () => {
      const response = await request(app.getHttpServer())
        .post('/workspaces')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test Workspace 2',
          ownerUserIds: [guestUserId],
        });

      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty('code');
      expect(response.body).toHaveProperty('message');
    });

    it('3. Member cannot create workspace - should return 403 FORBIDDEN_ROLE', async () => {
      const response = await request(app.getHttpServer())
        .post('/workspaces')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          name: 'Test Workspace 3',
          ownerUserIds: [memberUserId],
        });

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('code', 'FORBIDDEN_ROLE');
      expect(response.body).toHaveProperty('message', 'Read only access');
    });
  });

  describe('PATCH /api/workspaces/:id/owners', () => {
    let workspaceId: string;

    beforeEach(async () => {
      // Create a workspace with one owner for testing
      const workspaceRepo = dataSource.getRepository(Workspace);
      const workspace = workspaceRepo.create({
        name: 'Test Workspace for Owners Update',
        slug: 'test-workspace-owners',
        organizationId: orgId,
        createdBy: adminUserId,
        ownerId: adminUserId,
      });
      const saved = await workspaceRepo.save(workspace);
      workspaceId = saved.id;

      const memberRepo = dataSource.getRepository(WorkspaceMember);
      await memberRepo.save({
        workspaceId: saved.id,
        userId: adminUserId,
        role: 'workspace_owner',
        createdBy: adminUserId,
      });
    });

    it('4. Owners update must keep at least one owner - should return 409', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/workspaces/${workspaceId}/owners`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          ownerUserIds: [],
        });

      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty('code', 'LAST_OWNER_REQUIRED');
      expect(response.body).toHaveProperty('message', 'At least one owner is required');
    });

    it('5. Owners update rejects Guest - should return 409', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/workspaces/${workspaceId}/owners`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          ownerUserIds: [guestUserId],
        });

      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty('code');
      expect(response.body).toHaveProperty('message');
    });
  });
});
