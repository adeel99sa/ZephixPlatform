import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { Organization } from '../src/organizations/entities/organization.entity';
import { User } from '../src/modules/users/entities/user.entity';
import { UserOrganization } from '../src/organizations/entities/user-organization.entity';
import { OrgInvite } from '../src/modules/org-invites/entities/org-invite.entity';
import { AuthSession } from '../src/modules/auth/entities/auth-session.entity';
import { TokenHashUtil } from '../src/common/security/token-hash.util';
import * as bcrypt from 'bcrypt';

/**
 * Phase 0A Slice 3B: E2E test for invite accept endpoint
 *
 * Tests:
 * 1. POST /api/org-invites/accept returns auth payload identical to login
 * 2. User and UserOrganization are created correctly
 * 3. Auth session is created with refresh token hash and request metadata
 * 4. Invite acceptedAt is set after acceptance
 */
describe('Org Invites Accept E2E Tests (Phase 0A Slice 3B)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  // Test data IDs
  let orgId: string;
  let adminUserId: string;
  let inviteToken: string;
  let inviteTokenHash: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
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

    // Run migrations before tests
    if (dataSource.isInitialized) {
      await dataSource.runMigrations();
    }

    await setupTestData();
  });

  afterAll(async () => {
    if (dataSource && dataSource.isInitialized) {
      await cleanupTestData();
      // Drop database and destroy connection for clean teardown
      // SAFETY GUARD: Prevent dropping production databases
      const dbUrl = process.env.DATABASE_URL || '';
      const dbName = dbUrl.split('/').pop()?.split('?')[0] || '';
      if (dbName && !dbName.toLowerCase().includes('test') && !dbName.toLowerCase().includes('e2e')) {
        throw new Error(
          `SAFETY GUARD: Refusing to drop database "${dbName}" - database name must contain "test" or "e2e" to prevent accidental production data loss`,
        );
      }
      try {
        await dataSource.dropDatabase();
      } catch (error) {
        // Ignore errors if database doesn't exist or is already dropped
        console.warn('Warning: Could not drop test database:', error.message);
      }
      await dataSource.destroy();
    }
    if (app) {
      await app.close();
    }
  });

  /**
   * Helper: Setup test data (org, admin user, invite)
   */
  async function setupTestData() {
    // Create organization
    const orgRepo = dataSource.getRepository(Organization);
    const organization = orgRepo.create({
      name: 'Test Org for Invites',
      slug: 'test-org-invites',
      settings: {},
    });
    const savedOrg = await orgRepo.save(organization);
    orgId = savedOrg.id;

    // Create admin user with real bcrypt hash
    const userRepo = dataSource.getRepository(User);
    const hashedPassword = await bcrypt.hash('AdminPass123!', 12);

    const adminUser = userRepo.create({
      email: 'admin@test-org.com',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      organizationId: orgId,
      role: 'admin',
      isEmailVerified: true,
      isActive: true,
    });
    const savedAdmin = await userRepo.save(adminUser);
    adminUserId = savedAdmin.id;

    // Create UserOrganization for admin
    const userOrgRepo = dataSource.getRepository(UserOrganization);
    const adminUserOrg = userOrgRepo.create({
      userId: adminUserId,
      organizationId: orgId,
      role: 'admin',
      isActive: true,
      joinedAt: new Date(),
    });
    await userOrgRepo.save(adminUserOrg);

    // Create invite directly in database for test
    const inviteRepo = dataSource.getRepository(OrgInvite);
    inviteToken = TokenHashUtil.generateRawToken();
    inviteTokenHash = TokenHashUtil.hashToken(inviteToken);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    const invite = inviteRepo.create({
      organizationId: orgId,
      email: 'newuser@test-org.com',
      role: 'member',
      tokenHash: inviteTokenHash,
      invitedByUserId: adminUserId,
      expiresAt,
      acceptedAt: null,
      revokedAt: null,
    });
    await inviteRepo.save(invite);
  }

  /**
   * Helper: Cleanup test data
   */
  async function cleanupTestData() {
    const inviteRepo = dataSource.getRepository(OrgInvite);
    const userRepo = dataSource.getRepository(User);
    const userOrgRepo = dataSource.getRepository(UserOrganization);
    const orgRepo = dataSource.getRepository(Organization);
    const sessionRepo = dataSource.getRepository(AuthSession);

    // Find and delete all created users
    const createdUsers = await userRepo.find({
      where: [
        { email: 'newuser@test-org.com' },
        { email: 'testmember@test-org.com' },
        { email: 'sessiontest@test-org.com' },
      ],
    });
    for (const user of createdUsers) {
      await userOrgRepo.delete({ userId: user.id });
      await sessionRepo.delete({ userId: user.id });
      await userRepo.delete({ id: user.id });
    }

    // Delete invite
    await inviteRepo.delete({ tokenHash: inviteTokenHash });

    // Delete admin user and org
    await userOrgRepo.delete({ userId: adminUserId });
    await userRepo.delete({ id: adminUserId });
    await orgRepo.delete({ id: orgId });
  }

  describe('POST /api/org-invites/accept', () => {
    it('should accept invite and return auth payload identical to login', async () => {
      const testUserAgent = 'Mozilla/5.0 Test Browser';
      const testIpAddress = '192.168.1.100';

      const response = await request(app.getHttpServer())
        .post('/api/org-invites/accept')
        .set('user-agent', testUserAgent)
        .set('x-forwarded-for', testIpAddress)
        .send({
          token: inviteToken,
          fullName: 'New User',
          password: 'SecurePass123!',
        })
        .expect(200);

      // Verify response structure matches login
      expect(response.body).toHaveProperty('data');
      const data = response.body.data;

      // Verify auth payload fields
      expect(data).toHaveProperty('accessToken');
      expect(data).toHaveProperty('refreshToken');
      expect(data).toHaveProperty('sessionId');
      expect(data).toHaveProperty('organizationId');
      expect(data).toHaveProperty('expiresIn');
      expect(data).toHaveProperty('user');

      // Verify user object
      expect(data.user).toHaveProperty('id');
      expect(data.user).toHaveProperty('email');
      expect(data.user).toHaveProperty('firstName');
      expect(data.user).toHaveProperty('lastName');
      expect(data.user).toHaveProperty('role');
      expect(data.user).toHaveProperty('platformRole');
      expect(data.user).toHaveProperty('permissions');
      expect(data.user).toHaveProperty('organizationId');

      // Verify user email matches invite email
      expect(data.user.email).toBe('newuser@test-org.com');
      expect(data.user.organizationId).toBe(orgId);

      // Verify tokens are valid JWT format
      expect(data.accessToken).toMatch(/^eyJ/);
      expect(data.refreshToken).toMatch(/^eyJ/);

      // Verify expiresIn is a number
      expect(typeof data.expiresIn).toBe('number');
      expect(data.expiresIn).toBeGreaterThan(0);

      // Verify invite acceptedAt is set
      const inviteRepo = dataSource.getRepository(OrgInvite);
      const acceptedInvite = await inviteRepo.findOne({
        where: { tokenHash: inviteTokenHash },
      });
      expect(acceptedInvite).toBeDefined();
      expect(acceptedInvite!.acceptedAt).not.toBeNull();
      expect(acceptedInvite!.acceptedAt).toBeInstanceOf(Date);

      // Verify session metadata is saved (userAgent and ipAddress)
      const sessionRepo = dataSource.getRepository(AuthSession);
      const session = await sessionRepo.findOne({
        where: { id: data.sessionId },
      });
      expect(session).toBeDefined();
      expect(session!.userAgent).toBe(testUserAgent);
      expect(session!.ipAddress).toBe(testIpAddress);
    });

    it('should create UserOrganization row with correct role mapping', async () => {
      // Create a new invite for this test (previous test already accepted the first one)
      const inviteRepo = dataSource.getRepository(OrgInvite);
      const testToken = TokenHashUtil.generateRawToken();
      const testTokenHash = TokenHashUtil.hashToken(testToken);

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const testInvite = inviteRepo.create({
        organizationId: orgId,
        email: 'testmember@test-org.com',
        role: 'member',
        tokenHash: testTokenHash,
        invitedByUserId: adminUserId,
        expiresAt,
        acceptedAt: null,
        revokedAt: null,
      });
      await inviteRepo.save(testInvite);

      // Accept invite
      await request(app.getHttpServer())
        .post('/api/org-invites/accept')
        .send({
          token: testToken,
          fullName: 'Test Member',
          password: 'SecurePass123!',
        })
        .expect(200);

      // Verify UserOrganization was created
      const userRepo = dataSource.getRepository(User);
      const userOrgRepo = dataSource.getRepository(UserOrganization);

      const createdUser = await userRepo.findOne({
        where: { email: 'testmember@test-org.com' },
      });
      expect(createdUser).toBeDefined();

      const userOrg = await userOrgRepo.findOne({
        where: {
          userId: createdUser!.id,
          organizationId: orgId,
          isActive: true,
        },
      });

      expect(userOrg).toBeDefined();
      // Invite role 'member' maps to UserOrganization role 'pm'
      expect(userOrg!.role).toBe('pm');

      // Verify invite acceptedAt is set
      const acceptedInvite = await inviteRepo.findOne({
        where: { tokenHash: testTokenHash },
      });
      expect(acceptedInvite!.acceptedAt).not.toBeNull();

      // Cleanup
      await userOrgRepo.delete({ userId: createdUser!.id });
      await userRepo.delete({ id: createdUser!.id });
      await inviteRepo.delete({ tokenHash: testTokenHash });
    });

    it('should create auth session with refresh token hash', async () => {
      // Create a new invite for this test
      const inviteRepo = dataSource.getRepository(OrgInvite);
      const testToken = TokenHashUtil.generateRawToken();
      const testTokenHash = TokenHashUtil.hashToken(testToken);

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const testInvite = inviteRepo.create({
        organizationId: orgId,
        email: 'sessiontest@test-org.com',
        role: 'viewer',
        tokenHash: testTokenHash,
        invitedByUserId: adminUserId,
        expiresAt,
        acceptedAt: null,
        revokedAt: null,
      });
      await inviteRepo.save(testInvite);

      const response = await request(app.getHttpServer())
        .post('/api/org-invites/accept')
        .send({
          token: testToken,
          fullName: 'Test User',
          password: 'SecurePass123!',
        })
        .expect(200);

      const sessionId = response.body.data.sessionId;
      expect(sessionId).toBeDefined();

      // Verify session exists in database
      const sessionRepo = dataSource.getRepository(AuthSession);
      const session = await sessionRepo.findOne({
        where: { id: sessionId },
      });

      expect(session).toBeDefined();
      expect(session!.userId).toBeDefined();
      expect(session!.organizationId).toBe(orgId);
      expect(session!.currentRefreshTokenHash).toBeDefined();
      expect(session!.currentRefreshTokenHash).not.toBeNull();
      expect(session!.refreshExpiresAt).toBeInstanceOf(Date);

      // Verify invite acceptedAt is set
      const acceptedInvite = await inviteRepo.findOne({
        where: { tokenHash: testTokenHash },
      });
      expect(acceptedInvite!.acceptedAt).not.toBeNull();

      // Cleanup
      const userRepo = dataSource.getRepository(User);
      const userOrgRepo = dataSource.getRepository(UserOrganization);
      const createdUser = await userRepo.findOne({
        where: { email: 'sessiontest@test-org.com' },
      });
      if (createdUser) {
        await userOrgRepo.delete({ userId: createdUser.id });
        await sessionRepo.delete({ userId: createdUser.id });
        await userRepo.delete({ id: createdUser.id });
      }
      await inviteRepo.delete({ tokenHash: testTokenHash });
    });

    it('should reject invalid token with ORG_INVITE_NOT_FOUND', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/org-invites/accept')
        .send({
          token: 'invalid-token',
          fullName: 'Test User',
          password: 'SecurePass123!',
        });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message');
      // Verify error code if global exception filter returns it
      if (response.body.code) {
        expect(response.body.code).toBe('ORG_INVITE_NOT_FOUND');
      }
    });
  });
});
