import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../app.module';
import { DataSource } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Organization } from '../../organizations/entities/organization.entity';
import { User } from '../users/entities/user.entity';
import { UserOrganization } from '../../organizations/entities/user-organization.entity';
import { OrgInvite } from './entities/org-invite.entity';
import { AuthSession } from '../auth/entities/auth-session.entity';
import { TokenHashUtil } from '../../common/security/token-hash.util';

/**
 * Phase 0A Slice 3B: Integration test for invite accept endpoint
 *
 * Tests:
 * 1. POST /api/org-invites/accept returns auth payload identical to login
 * 2. User and UserOrganization are created correctly
 * 3. Auth session is created with refresh token hash
 */
describe('Org Invites Accept Integration Tests (Phase 0A Slice 3B)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let jwtService: JwtService;
  let configService: ConfigService;

  // Test data IDs
  let orgId: string;
  let adminUserId: string;
  let adminAccessToken: string;
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
    jwtService = moduleFixture.get<JwtService>(JwtService);
    configService = moduleFixture.get<ConfigService>(ConfigService);

    await setupTestData();
  });

  afterAll(async () => {
    if (dataSource && dataSource.isInitialized) {
      await cleanupTestData();
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

    // Create admin user
    const userRepo = dataSource.getRepository(User);
    const adminUser = userRepo.create({
      email: 'admin@test-org.com',
      password: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyY5Y5Y5Y5Y5', // bcrypt hash of 'AdminPass123!'
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

    // Generate admin access token for creating invite
    const payload = {
      sub: adminUserId,
      email: adminUser.email,
      organizationId: orgId,
      role: 'admin',
      platformRole: 'ADMIN',
    };
    adminAccessToken = jwtService.sign(payload, {
      secret: configService.get<string>('jwt.secret') || 'fallback-secret',
      expiresIn: '15m',
    });

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
      const response = await request(app.getHttpServer())
        .post('/api/org-invites/accept')
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

    it('should reject invalid token', async () => {
      await request(app.getHttpServer())
        .post('/api/org-invites/accept')
        .send({
          token: 'invalid-token',
          fullName: 'Test User',
          password: 'SecurePass123!',
        })
        .expect(404);

      // Verify response has correct error code
      const response = await request(app.getHttpServer())
        .post('/api/org-invites/accept')
        .send({
          token: 'invalid-token',
          fullName: 'Test User',
          password: 'SecurePass123!',
        });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message');
    });
  });
});
