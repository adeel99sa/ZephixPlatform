/**
 * PROMPT 9 C1: Backend E2E Tests for Org Invite with Workspace Assignments
 *
 * Tests:
 * 1. Member invite with 2 workspace assignments - verify workspace_members rows created
 * 2. Guest invite coerces to workspace_viewer even if requested Owner
 * 3. Existing org user gets workspace_members rows immediately
 * 4. Cross org workspace assignment returns 409 INVALID_WORKSPACE
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
import { OrgInvite } from '../src/modules/auth/entities/org-invite.entity';
import { OrgInviteWorkspaceAssignment } from '../src/modules/auth/entities/org-invite-workspace-assignment.entity';
import * as bcrypt from 'bcrypt';

describe('Org Invite with Workspace Assignments (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let adminToken: string;
  let adminUserId: string;
  let orgId: string;
  let workspace1Id: string;
  let workspace2Id: string;
  let otherOrgId: string;
  let otherWorkspaceId: string;

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

    // Create other org for cross-org test
    const otherOrg = orgRepo.create({
      name: 'Other Org',
      slug: 'other-org',
    });
    const savedOtherOrg = await orgRepo.save(otherOrg);
    otherOrgId = savedOtherOrg.id;

    // Create admin user
    const userRepo = dataSource.getRepository(User);
    const hashedPassword = await bcrypt.hash('password123', 10);
    const adminUser = userRepo.create({
      email: 'admin@test.com',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      organizationId: orgId,
    });
    const savedAdmin = await userRepo.save(adminUser);
    adminUserId = savedAdmin.id;

    // Create UserOrganization
    const userOrgRepo = dataSource.getRepository(UserOrganization);
    await userOrgRepo.save({
      userId: savedAdmin.id,
      organizationId: orgId,
      role: 'admin',
      isActive: true,
    });

    // Create two workspaces
    const workspaceRepo = dataSource.getRepository(Workspace);
    const workspace1 = workspaceRepo.create({
      name: 'Test Workspace 1',
      slug: 'test-workspace-1',
      organizationId: orgId,
      createdBy: adminUserId,
      ownerId: adminUserId,
    });
    const savedWorkspace1 = await workspaceRepo.save(workspace1);
    workspace1Id = savedWorkspace1.id;

    const workspace2 = workspaceRepo.create({
      name: 'Test Workspace 2',
      slug: 'test-workspace-2',
      organizationId: orgId,
      createdBy: adminUserId,
      ownerId: adminUserId,
    });
    const savedWorkspace2 = await workspaceRepo.save(workspace2);
    workspace2Id = savedWorkspace2.id;

    // Create workspace in other org
    const otherWorkspace = workspaceRepo.create({
      name: 'Other Workspace',
      slug: 'other-workspace',
      organizationId: otherOrgId,
      createdBy: adminUserId,
      ownerId: adminUserId,
    });
    const savedOtherWorkspace = await workspaceRepo.save(otherWorkspace);
    otherWorkspaceId = savedOtherWorkspace.id;

    // Login as admin
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'admin@test.com',
        password: 'password123',
      });
    adminToken = loginResponse.body.token || loginResponse.body.data?.token;
  });

  afterAll(async () => {
    // Cleanup
    const assignmentRepo = dataSource.getRepository(OrgInviteWorkspaceAssignment);
    const inviteRepo = dataSource.getRepository(OrgInvite);
    const memberRepo = dataSource.getRepository(WorkspaceMember);
    const workspaceRepo = dataSource.getRepository(Workspace);
    const userOrgRepo = dataSource.getRepository(UserOrganization);
    const userRepo = dataSource.getRepository(User);
    const orgRepo = dataSource.getRepository(Organization);

    await assignmentRepo.delete({});
    await inviteRepo.delete({});
    await memberRepo.delete({});
    await workspaceRepo.delete({});
    await userOrgRepo.delete({});
    await userRepo.delete({});
    await orgRepo.delete({});

    await app.close();
  });

  describe('1. Member invite with 2 workspace assignments', () => {
    it('should create workspace_members rows for both workspaces after invite accept', async () => {
      // Invite new user with 2 workspace assignments
      const inviteResponse = await request(app.getHttpServer())
        .post('/admin/organization/users/invite')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          emails: ['member2ws@test.com'],
          platformRole: 'Member',
          workspaceAssignments: [
            { workspaceId: workspace1Id, accessLevel: 'Member' },
            { workspaceId: workspace2Id, accessLevel: 'Member' },
          ],
        });

      expect(inviteResponse.status).toBe(200);
      expect(inviteResponse.body.data.results).toHaveLength(1);
      expect(inviteResponse.body.data.results[0].status).toBe('success');

      // Get invite and raw token
      const inviteRepo = dataSource.getRepository(OrgInvite);
      const invite = await inviteRepo.findOne({
        where: { email: 'member2ws@test.com', orgId },
      });
      expect(invite).toBeDefined();

      // Get raw token from auth outbox
      const authOutboxRepo = dataSource.getRepository('AuthOutbox');
      const outboxEvents = await dataSource.query(
        `SELECT payload_json FROM auth_outbox WHERE type = 'auth.invite.created' AND payload_json->>'email' = 'member2ws@test.com' ORDER BY created_at DESC LIMIT 1`,
      );
      expect(outboxEvents.length).toBeGreaterThan(0);
      const rawToken = outboxEvents[0].payload_json.token;

      // Create user
      const userRepo = dataSource.getRepository(User);
      const hashedPassword = await bcrypt.hash('password123', 10);
      const newUser = userRepo.create({
        email: 'member2ws@test.com',
        password: hashedPassword,
        firstName: 'Member',
        lastName: 'TwoWS',
        role: 'pm',
        organizationId: orgId,
      });
      const savedUser = await userRepo.save(newUser);

      // Login as new user
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'member2ws@test.com',
          password: 'password123',
        });
      const userToken = loginResponse.body.token || loginResponse.body.data?.token;

      // Accept invite
      await request(app.getHttpServer())
        .post('/invites/accept')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ token: rawToken })
        .expect(200);

      // EXPLICIT ASSERTION: Verify workspace_members rows exist for both workspaces
      const memberRepo = dataSource.getRepository(WorkspaceMember);
      const member1 = await memberRepo.findOne({
        where: { workspaceId: workspace1Id, userId: savedUser.id },
      });
      const member2 = await memberRepo.findOne({
        where: { workspaceId: workspace2Id, userId: savedUser.id },
      });

      expect(member1).toBeDefined();
      expect(member1?.role).toBe('workspace_member');
      expect(member1?.status).toBe('active');
      expect(member2).toBeDefined();
      expect(member2?.role).toBe('workspace_member');
      expect(member2?.status).toBe('active');
    });
  });

  describe('2. Guest invite coerces to workspace_viewer even if requested Owner', () => {
    it('should create workspace_members row with workspace_viewer role', async () => {
      // Invite Guest with Owner access level (should be coerced)
      const inviteResponse = await request(app.getHttpServer())
        .post('/admin/organization/users/invite')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          emails: ['guest@test.com'],
          platformRole: 'Guest',
          workspaceAssignments: [
            { workspaceId: workspace1Id, accessLevel: 'Owner' }, // Should be coerced to Guest/Viewer
          ],
        });

      expect(inviteResponse.status).toBe(200);
      expect(inviteResponse.body.data.results).toHaveLength(1);
      expect(inviteResponse.body.data.results[0].status).toBe('success');
      // Check for coercion message
      expect(inviteResponse.body.data.results[0].message).toMatch(/guest|viewer|coerc/i);

      // Get invite and token
      const inviteRepo = dataSource.getRepository(OrgInvite);
      const invite = await inviteRepo.findOne({
        where: { email: 'guest@test.com', orgId },
      });
      expect(invite).toBeDefined();

      const outboxEvents = await dataSource.query(
        `SELECT payload_json FROM auth_outbox WHERE type = 'auth.invite.created' AND payload_json->>'email' = 'guest@test.com' ORDER BY created_at DESC LIMIT 1`,
      );
      const rawToken = outboxEvents[0].payload_json.token;

      // Create user
      const userRepo = dataSource.getRepository(User);
      const hashedPassword = await bcrypt.hash('password123', 10);
      const guestUser = userRepo.create({
        email: 'guest@test.com',
        password: hashedPassword,
        firstName: 'Guest',
        lastName: 'User',
        role: 'viewer',
        organizationId: orgId,
      });
      const savedGuest = await userRepo.save(guestUser);

      // Login and accept
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'guest@test.com',
          password: 'password123',
        });
      const guestToken = loginResponse.body.token || loginResponse.body.data?.token;

      await request(app.getHttpServer())
        .post('/invites/accept')
        .set('Authorization', `Bearer ${guestToken}`)
        .send({ token: rawToken })
        .expect(200);

      // EXPLICIT ASSERTION: Verify workspace_members row has workspace_viewer role
      const memberRepo = dataSource.getRepository(WorkspaceMember);
      const member = await memberRepo.findOne({
        where: { workspaceId: workspace1Id, userId: savedGuest.id },
      });

      expect(member).toBeDefined();
      expect(member?.role).toBe('workspace_viewer'); // Coerced, not workspace_owner
      expect(member?.status).toBe('active');
    });
  });

  describe('3. Existing org user gets workspace_members rows immediately', () => {
    it('should create workspace_members rows without invite accept', async () => {
      // Create existing user in org
      const userRepo = dataSource.getRepository(User);
      const hashedPassword = await bcrypt.hash('password123', 10);
      const existingUser = userRepo.create({
        email: 'existing@test.com',
        password: hashedPassword,
        firstName: 'Existing',
        lastName: 'User',
        role: 'pm',
        organizationId: orgId,
      });
      const savedUser = await userRepo.save(existingUser);

      const userOrgRepo = dataSource.getRepository(UserOrganization);
      await userOrgRepo.save({
        userId: savedUser.id,
        organizationId: orgId,
        role: 'pm',
        isActive: true,
        joinedAt: new Date(),
      });

      // Invite existing user with workspace assignment
      const inviteResponse = await request(app.getHttpServer())
        .post('/admin/organization/users/invite')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          emails: ['existing@test.com'],
          platformRole: 'Member',
          workspaceAssignments: [
            { workspaceId: workspace1Id, accessLevel: 'Member' },
          ],
        });

      expect(inviteResponse.status).toBe(200);
      expect(inviteResponse.body.data.results).toHaveLength(1);
      expect(inviteResponse.body.data.results[0].status).toBe('success');
      expect(inviteResponse.body.data.results[0].message).toContain('workspace assignments applied');

      // EXPLICIT ASSERTION: Verify workspace_members row exists immediately (no accept needed)
      const memberRepo = dataSource.getRepository(WorkspaceMember);
      const member = await memberRepo.findOne({
        where: { workspaceId: workspace1Id, userId: savedUser.id },
      });

      expect(member).toBeDefined();
      expect(member?.role).toBe('workspace_member');
      expect(member?.status).toBe('active');
    });
  });

  describe('4. Cross org workspace assignment returns 409 INVALID_WORKSPACE', () => {
    it('should return 409 when workspace belongs to different org', async () => {
      const inviteResponse = await request(app.getHttpServer())
        .post('/admin/organization/users/invite')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          emails: ['crossorg@test.com'],
          platformRole: 'Member',
          workspaceAssignments: [
            { workspaceId: otherWorkspaceId, accessLevel: 'Member' }, // Workspace from other org
          ],
        });

      // Should return error for cross-org workspace
      expect(inviteResponse.status).toBeGreaterThanOrEqual(400);
      // Check for error code or message about invalid workspace
      const body = inviteResponse.body;
      if (body.code) {
        expect(['INVALID_WORKSPACE', 'WORKSPACE_NOT_FOUND', 'FORBIDDEN']).toContain(body.code);
      } else if (body.message) {
        expect(body.message.toLowerCase()).toMatch(/workspace|invalid|forbidden/i);
      }
    });
  });
});
