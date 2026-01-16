/**
 * PROMPT 8 C1: Backend E2E Tests for Workspace Member Suspend
 *
 * Tests:
 * A. Owner suspends member, member loses read access
 * B. Reinstate restores access
 * C. Last owner protection
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
import { PlatformRole } from '../src/shared/enums/platform-roles.enum';

describe('Workspace Members Suspend (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let ownerToken: string;
  let memberToken: string;
  let ownerUserId: string;
  let memberUserId: string;
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

    // Create workspace members
    const memberRepo = dataSource.getRepository(WorkspaceMember);
    await memberRepo.save([
      {
        workspaceId: savedWorkspace.id,
        userId: ownerUserId,
        role: 'workspace_owner',
        createdBy: ownerUserId,
        status: 'active',
      },
      {
        workspaceId: savedWorkspace.id,
        userId: memberUserId,
        role: 'workspace_member',
        createdBy: ownerUserId,
        status: 'active',
      },
    ]);

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
  });

  afterAll(async () => {
    // Cleanup
    const memberRepo = dataSource.getRepository(WorkspaceMember);
    const workspaceRepo = dataSource.getRepository(Workspace);
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

  describe('A. Owner suspends member, member loses read access', () => {
    it('should suspend member and block read access', async () => {
      // Get member record ID
      const memberRepo = dataSource.getRepository(WorkspaceMember);
      const member = await memberRepo.findOne({
        where: { workspaceId, userId: memberUserId },
      });

      if (!member) {
        throw new Error('Member not found');
      }

      // Owner suspends member
      const suspendResponse = await request(app.getHttpServer())
        .patch(`/workspaces/${workspaceId}/members/${member.id}/suspend`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({});

      expect(suspendResponse.status).toBe(200);
      expect(suspendResponse.body.data).toHaveProperty('status', 'suspended');

      // Member tries to access workspace
      const workspaceResponse = await request(app.getHttpServer())
        .get(`/workspaces/${workspaceId}`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(workspaceResponse.status).toBe(403);
      expect(workspaceResponse.body).toHaveProperty('code', 'SUSPENDED');
      expect(workspaceResponse.body).toHaveProperty('message', 'Access suspended');

      // Member tries to list members
      const membersResponse = await request(app.getHttpServer())
        .get(`/workspaces/${workspaceId}/members`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(membersResponse.status).toBe(403);
      expect(membersResponse.body).toHaveProperty('code', 'SUSPENDED');
    });
  });

  describe('B. Reinstate restores access', () => {
    it('should reinstate member and restore access', async () => {
      // Get member record ID
      const memberRepo = dataSource.getRepository(WorkspaceMember);
      const member = await memberRepo.findOne({
        where: { workspaceId, userId: memberUserId },
      });

      if (!member) {
        throw new Error('Member not found');
      }

      // Owner reinstates member
      const reinstateResponse = await request(app.getHttpServer())
        .patch(`/workspaces/${workspaceId}/members/${member.id}/reinstate`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({});

      expect(reinstateResponse.status).toBe(200);
      expect(reinstateResponse.body.data).toHaveProperty('status', 'active');

      // Member retries workspace access
      const workspaceResponse = await request(app.getHttpServer())
        .get(`/workspaces/${workspaceId}`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(workspaceResponse.status).toBe(200);
    });
  });

  describe('C. Last owner protection', () => {
    it('should prevent suspending last owner', async () => {
      // Get owner member record ID
      const memberRepo = dataSource.getRepository(WorkspaceMember);
      const ownerMember = await memberRepo.findOne({
        where: { workspaceId, userId: ownerUserId, role: 'workspace_owner' },
      });

      if (!ownerMember) {
        throw new Error('Owner member not found');
      }

      // Attempt to suspend owner (should fail)
      const suspendResponse = await request(app.getHttpServer())
        .patch(`/workspaces/${workspaceId}/members/${ownerMember.id}/suspend`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({});

      expect(suspendResponse.status).toBe(409);
      expect(suspendResponse.body).toHaveProperty('code', 'CANNOT_SUSPEND_OWNER');
    });
  });
});
