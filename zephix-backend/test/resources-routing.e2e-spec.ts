import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { User } from '../src/modules/users/entities/user.entity';
import { Organization } from '../src/organizations/entities/organization.entity';
import { Workspace } from '../src/modules/workspaces/entities/workspace.entity';
import { WorkspaceMember } from '../src/modules/workspaces/entities/workspace-member.entity';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';

describe('Resources Routing (E2E)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let testOrg: Organization;
  let testWorkspace: Workspace;
  let testUser: User;
  let authToken: string;

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

  describe('Route Order Correctness', () => {
    it('A. GET /api/resources/conflicts should return 200 or 403, never 404 "Resource not found"', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/resources/conflicts')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-workspace-id', testWorkspace.id);

      // Should NOT be 404 with "Resource not found" message
      expect(response.status).not.toBe(404);
      if (response.status === 404) {
        expect(response.body.message).not.toBe('Resource not found');
      }

      // Should be either 200 (success) or 403 (access denied), but not 404
      expect([200, 403]).toContain(response.status);
    });

    it('B. GET /api/resources/capacity/resources should return 200 or 403, never 404 "Resource not found"', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/resources/capacity/resources?startDate=2026-01-01&endDate=2026-01-31')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-workspace-id', testWorkspace.id);

      // Should NOT be 404 with "Resource not found" message
      expect(response.status).not.toBe(404);
      if (response.status === 404) {
        expect(response.body.message).not.toBe('Resource not found');
      }

      // Should be either 200 (success) or 400/403 (validation/access denied), but not 404
      expect([200, 400, 403]).toContain(response.status);
    });

    it('C. GET /api/resources/:id with a random UUID should return 404 "Resource not found"', async () => {
      const randomUuid = '123e4567-e89b-12d3-a456-426614174000';
      const response = await request(app.getHttpServer())
        .get(`/api/resources/${randomUuid}`)
        .set('Authorization', `Bearer ${authToken}`);

      // Should be 404 with "Resource not found" message
      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Resource not found');
    });
  });
});

