import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { User } from '../src/modules/users/entities/user.entity';
import { Organization } from '../src/organizations/entities/organization.entity';
import { Workspace } from '../src/modules/workspaces/entities/workspace.entity';
import { WorkspaceInviteLink } from '../src/modules/workspaces/entities/workspace-invite-link.entity';
import { UserOrganization } from '../src/organizations/entities/user-organization.entity';
import * as bcrypt from 'bcrypt';

describe('Workspace invite link flow (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let httpServer: any;

  // Test data
  let org1: Organization;
  let ownerUser: User;
  let workspace1: Workspace;
  let ownerToken: string;

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
    org1 = await createTestOrganization(`Invite Link Test Org ${timestamp}`);

    // Create test user (owner)
    const testEmailSuffix = `-${timestamp}@invite-test.com`;
    ownerUser = await createTestUser(
      `owner${testEmailSuffix}`,
      'Owner',
      'User',
      org1.id,
      'admin',
    );

    // Create UserOrganization entry
    await createUserOrganization(ownerUser.id, org1.id, 'admin');

    // Create test workspace
    workspace1 = await createTestWorkspace(
      'Invite Link Test Workspace',
      org1.id,
      ownerUser.id,
    );

    // Get auth token
    ownerToken = await getAuthToken(ownerUser.email, 'password123');
  });

  afterAll(async () => {
    if (dataSource && dataSource.isInitialized) {
      await cleanupTestData();
    }
    await app.close();
  });

  describe('Invite link lifecycle', () => {
    it('should create then revoke then GET returns null', async () => {
      // Create invite link
      const createRes = await request(httpServer)
        .post(`/api/workspaces/${workspace1.id}/invite-link`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ expiresInDays: 30 })
        .expect(201);

      expect(createRes.body?.data?.url).toBeTruthy();
      expect(createRes.body?.data?.expiresAt).toBeTruthy();

      // Verify active link exists
      const getRes1 = await request(httpServer)
        .get(`/api/workspaces/${workspace1.id}/invite-link`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(getRes1.body?.data?.exists).toBe(true);

      // Revoke active invite link
      await request(httpServer)
        .delete(`/api/workspaces/${workspace1.id}/invite-link/active`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      // Verify active link no longer exists
      const getRes2 = await request(httpServer)
        .get(`/api/workspaces/${workspace1.id}/invite-link`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(getRes2.body?.data).toBeNull();
    });

    it('should revoke be idempotent', async () => {
      // First revoke (may or may not have active link)
      await request(httpServer)
        .delete(`/api/workspaces/${workspace1.id}/invite-link/active`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      // Second revoke should also succeed (idempotent)
      await request(httpServer)
        .delete(`/api/workspaces/${workspace1.id}/invite-link/active`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);
    });

    it('should join without auth returns 401 UNAUTHENTICATED', async () => {
      // Create a new invite link first
      const createRes = await request(httpServer)
        .post(`/api/workspaces/${workspace1.id}/invite-link`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ expiresInDays: 30 })
        .expect(201);

      // Extract token from URL (format: /join/workspace?token=...)
      const url = createRes.body?.data?.url;
      expect(url).toBeTruthy();
      const tokenMatch = url.match(/token=([^&]+)/);
      expect(tokenMatch).toBeTruthy();
      const token = tokenMatch![1];

      // Try to join without auth token
      await request(httpServer)
        .post('/api/workspaces/join')
        .send({ token })
        .expect(401)
        .then((res) => {
          expect(res.body?.code).toBe('UNAUTHENTICATED');
        });
    });
  });

  // Helper functions
  async function cleanupTestData() {
    try {
      const inviteLinkRepo = dataSource.getRepository(WorkspaceInviteLink);
      await inviteLinkRepo.delete({});
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
      const workspaceRepo = dataSource.getRepository(Workspace);
      await workspaceRepo.delete({});
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
