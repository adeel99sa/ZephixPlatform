import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { User } from '../src/modules/users/entities/user.entity';
import { Organization } from '../src/organizations/entities/organization.entity';
import { Workspace } from '../src/modules/workspaces/entities/workspace.entity';
import { WorkspaceMember } from '../src/modules/workspaces/entities/workspace-member.entity';
import { Resource } from '../src/modules/resources/entities/resource.entity';
import { ResourceConflict } from '../src/modules/resources/entities/resource-conflict.entity';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';

describe('Resources Conflicts Endpoint (E2E)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let testOrg: Organization;
  let testWorkspace: Workspace;
  let testUser: User;
  let authToken: string;
  let testResource: Resource;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    dataSource = moduleFixture.get<DataSource>(DataSource);

    // Create test organization
    const orgRepo = dataSource.getRepository(Organization);
    testOrg = orgRepo.create({
      name: `Test Org ${Date.now()}`,
      slug: `test-org-${Date.now()}`,
      status: 'trial',
    });
    testOrg = await orgRepo.save(testOrg);

    // Create test user
    const userRepo = dataSource.getRepository(User);
    const hashedPassword = await bcrypt.hash('test-password', 12);
    testUser = userRepo.create({
      email: `test-${Date.now()}@example.com`,
      password: hashedPassword,
      firstName: 'Test',
      lastName: 'User',
      organizationId: testOrg.id,
      isEmailVerified: true,
      role: 'admin',
      isActive: true,
    });
    testUser = await userRepo.save(testUser);

    // Create test workspace
    const workspaceRepo = dataSource.getRepository(Workspace);
    testWorkspace = workspaceRepo.create({
      name: 'Test Workspace',
      slug: `test-ws-${Date.now()}`,
      organizationId: testOrg.id,
      createdBy: testUser.id,
      ownerId: testUser.id,
      isPrivate: false,
    });
    testWorkspace = await workspaceRepo.save(testWorkspace);

    // Create workspace membership
    const workspaceMemberRepo = dataSource.getRepository(WorkspaceMember);
    await workspaceMemberRepo.save({
      workspaceId: testWorkspace.id,
      userId: testUser.id,
      role: 'workspace_owner',
      createdBy: testUser.id,
    });

    // Create test resource
    const resourceRepo = dataSource.getRepository(Resource);
    testResource = resourceRepo.create({
      name: 'Test Resource',
      email: `test-resource-${Date.now()}@example.com`,
      organizationId: testOrg.id,
      workspaceId: testWorkspace.id,
    });
    testResource = await resourceRepo.save(testResource);

    // Generate auth token
    const jwtSecret = process.env.JWT_SECRET || 'test-secret';
    authToken = jwt.sign(
      {
        sub: testUser.id,
        email: testUser.email,
        organizationId: testOrg.id,
        role: testUser.role,
        platformRole: 'ADMIN',
      },
      jwtSecret,
      { expiresIn: '1h' },
    );
  });

  afterAll(async () => {
    // Cleanup
    if (dataSource) {
      const conflictRepo = dataSource.getRepository(ResourceConflict);
      await conflictRepo.delete({ organizationId: testOrg.id });

      const resourceRepo = dataSource.getRepository(Resource);
      await resourceRepo.delete({ id: testResource.id });

      const workspaceMemberRepo = dataSource.getRepository(WorkspaceMember);
      await workspaceMemberRepo.delete({ workspaceId: testWorkspace.id });

      const workspaceRepo = dataSource.getRepository(Workspace);
      await workspaceRepo.delete({ id: testWorkspace.id });

      const userRepo = dataSource.getRepository(User);
      await userRepo.delete({ id: testUser.id });

      const orgRepo = dataSource.getRepository(Organization);
      await orgRepo.delete({ id: testOrg.id });
    }

    await app.close();
  });

  describe('GET /api/resources/conflicts', () => {
    it('should return 200 with x-workspace-id header', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/resources/conflicts')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-workspace-id', testWorkspace.id)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should return 200 without workspaceId (org-scoped)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/resources/conflicts')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should ignore invalid workspaceId header value', async () => {
      // Invalid UUID in header should be ignored, not cause 403
      const response = await request(app.getHttpServer())
        .get('/api/resources/conflicts')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-workspace-id', 'conflicts') // Invalid UUID - should be ignored
        .expect(200);

      expect(response.body).toHaveProperty('data');
      // Should return org-scoped conflicts, not crash
    });

    it('should filter by resourceId when provided', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/resources/conflicts?resourceId=${testResource.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-workspace-id', testWorkspace.id)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should return 403 when workspaceId does not belong to org', async () => {
      // Create another org and workspace
      const orgRepo = dataSource.getRepository(Organization);
      const otherOrg = orgRepo.create({
        name: `Other Org ${Date.now()}`,
        slug: `other-org-${Date.now()}`,
        status: 'trial',
      });
      const savedOtherOrg = await orgRepo.save(otherOrg);

      const workspaceRepo = dataSource.getRepository(Workspace);
      const otherWorkspace = workspaceRepo.create({
        name: 'Other Workspace',
        slug: `other-ws-${Date.now()}`,
        organizationId: savedOtherOrg.id,
        createdBy: testUser.id,
        ownerId: testUser.id,
        isPrivate: false,
      });
      const savedOtherWorkspace = await workspaceRepo.save(otherWorkspace);

      // Try to access other org's workspace
      await request(app.getHttpServer())
        .get('/api/resources/conflicts')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-workspace-id', savedOtherWorkspace.id)
        .expect(403);

      // Cleanup
      await workspaceRepo.delete({ id: savedOtherWorkspace.id });
      await orgRepo.delete({ id: savedOtherOrg.id });
    });
  });
});

