/**
 * PROMPT 7 D1: Backend E2E Tests for Workspace Join
 *
 * Tests:
 * 1. Owner creates invite link - Expect 201, Expect url present
 * 2. Member joins workspace using token - Expect 200, Expect workspace_members row exists with workspace_member
 * 3. Guest joins workspace using token - Expect workspace_members row role workspace_viewer
 * 4. Revoked link fails - Revoke then join, expect 409 INVITE_LINK_REVOKED
 * 5. Expired link fails - Set expiresAt in past, expect 409 INVITE_LINK_EXPIRED
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
import { WorkspaceInviteLink } from '../src/modules/workspaces/entities/workspace-invite-link.entity';
import { Organization } from '../src/organizations/entities/organization.entity';
import { TokenHashUtil } from '../src/common/security/token-hash.util';

describe('Workspace Join (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let ownerToken: string;
  let memberToken: string;
  let guestToken: string;
  let ownerUserId: string;
  let memberUserId: string;
  let guestUserId: string;
  let orgId: string;
  let workspaceId: string;

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

    // Create owner user
    const userRepo = dataSource.getRepository(User);
    const ownerUser = userRepo.create({
      email: 'owner@test.com',
      password: 'hashed-password',
      firstName: 'Owner',
      lastName: 'User',
      role: 'admin',
      organizationId: orgId,
    });
    const savedOwner = await userRepo.save(ownerUser);
    ownerUserId = savedOwner.id;

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
        userId: ownerUserId,
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

    // Create workspace
    const workspaceRepo = dataSource.getRepository(Workspace);
    const workspace = workspaceRepo.create({
      name: 'Test Workspace',
      slug: 'test-workspace',
      organizationId: orgId,
      createdBy: ownerUserId,
      ownerId: ownerUserId,
    });
    const savedWorkspace = await workspaceRepo.save(workspace);
    workspaceId = savedWorkspace.id;

    // Create workspace member for owner
    const memberRepo = dataSource.getRepository(WorkspaceMember);
    await memberRepo.save({
      workspaceId: savedWorkspace.id,
      userId: ownerUserId,
      role: 'workspace_owner',
      createdBy: ownerUserId,
    });

    // Login as owner to get token
    const ownerLoginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'owner@test.com',
        password: 'hashed-password',
      });
    ownerToken = ownerLoginResponse.body.token;

    // Login as member to get token
    const memberLoginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'member@test.com',
        password: 'hashed-password',
      });
    memberToken = memberLoginResponse.body.token;

    // Login as guest to get token
    const guestLoginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'guest@test.com',
        password: 'hashed-password',
      });
    guestToken = guestLoginResponse.body.token;
  });

  afterAll(async () => {
    // Cleanup
    const inviteLinkRepo = dataSource.getRepository(WorkspaceInviteLink);
    const memberRepo = dataSource.getRepository(WorkspaceMember);
    const workspaceRepo = dataSource.getRepository(Workspace);
    const userOrgRepo = dataSource.getRepository(UserOrganization);
    const userRepo = dataSource.getRepository(User);
    const orgRepo = dataSource.getRepository(Organization);

    await inviteLinkRepo.delete({});
    await memberRepo.delete({});
    await workspaceRepo.delete({});
    await userOrgRepo.delete({});
    await userRepo.delete({});
    await orgRepo.delete({});

    await app.close();
  });

  describe('POST /api/workspaces/:id/invite-link', () => {
    it('1. Owner creates invite link - should return 201 with url present', async () => {
      const response = await request(app.getHttpServer())
        .post(`/workspaces/${workspaceId}/invite-link`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          expiresInDays: 7,
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('url');
      expect(response.body.data).toHaveProperty('expiresAt');
      expect(typeof response.body.data.url).toBe('string');
      expect(response.body.data.url).toContain('/join/workspace?token=');
    });
  });

  describe('POST /api/workspaces/join', () => {
    let inviteToken: string;

    beforeEach(async () => {
      // Create invite link for each test
      const response = await request(app.getHttpServer())
        .post(`/workspaces/${workspaceId}/invite-link`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({});

      const url = response.body.data.url;
      const tokenMatch = url.match(/token=([^&]+)/);
      inviteToken = tokenMatch ? tokenMatch[1] : '';
    });

    it('2. Member joins workspace using token - should return 200 and create workspace_member row', async () => {
      const response = await request(app.getHttpServer())
        .post('/workspaces/join')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          token: inviteToken,
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('workspaceId', workspaceId);

      // Verify workspace_members row exists with workspace_member role
      const memberRepo = dataSource.getRepository(WorkspaceMember);
      const member = await memberRepo.findOne({
        where: {
          workspaceId,
          userId: memberUserId,
        },
      });

      expect(member).toBeDefined();
      expect(member?.role).toBe('workspace_member');
    });

    it('3. Guest joins workspace using token - should create workspace_viewer role', async () => {
      const response = await request(app.getHttpServer())
        .post('/workspaces/join')
        .set('Authorization', `Bearer ${guestToken}`)
        .send({
          token: inviteToken,
        });

      expect(response.status).toBe(200);

      // Verify workspace_members row exists with workspace_viewer role
      const memberRepo = dataSource.getRepository(WorkspaceMember);
      const member = await memberRepo.findOne({
        where: {
          workspaceId,
          userId: guestUserId,
        },
      });

      expect(member).toBeDefined();
      expect(member?.role).toBe('workspace_viewer');
    });

    it('4. Revoked link fails - should return 409 INVITE_LINK_REVOKED', async () => {
      // Create and revoke link
      const createResponse = await request(app.getHttpServer())
        .post(`/workspaces/${workspaceId}/invite-link`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({});

      const url = createResponse.body.data.url;
      const tokenMatch = url.match(/token=([^&]+)/);
      const token = tokenMatch ? tokenMatch[1] : '';

      // Get link ID (we need to find it)
      const inviteLinkRepo = dataSource.getRepository(WorkspaceInviteLink);
      const tokenHash = TokenHashUtil.hashToken(token);
      const link = await inviteLinkRepo.findOne({
        where: { tokenHash },
      });

      // Revoke link
      await request(app.getHttpServer())
        .delete(`/workspaces/${workspaceId}/invite-link/${link?.id}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      // Try to join with revoked link
      const joinResponse = await request(app.getHttpServer())
        .post('/workspaces/join')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          token,
        });

      expect(joinResponse.status).toBe(409);
      expect(joinResponse.body).toHaveProperty('code', 'INVITE_LINK_REVOKED');
    });

    it('5. Expired link fails - should return 409 INVITE_LINK_EXPIRED', async () => {
      // Create link with past expiry
      const inviteLinkRepo = dataSource.getRepository(WorkspaceInviteLink);
      const rawToken = TokenHashUtil.generateRawToken();
      const tokenHash = TokenHashUtil.hashToken(rawToken);

      const expiredLink = inviteLinkRepo.create({
        workspaceId,
        createdByUserId: ownerUserId,
        tokenHash,
        status: 'active',
        expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
      });
      await inviteLinkRepo.save(expiredLink);

      // Try to join with expired link
      const joinResponse = await request(app.getHttpServer())
        .post('/workspaces/join')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          token: rawToken,
        });

      expect(joinResponse.status).toBe(409);
      expect(joinResponse.body).toHaveProperty('code', 'INVITE_LINK_EXPIRED');
    });
  });
});
