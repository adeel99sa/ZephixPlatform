import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import {
  registerUser,
  loginUser,
  createInvite,
  acceptInvite,
  getLatestOutboxEvent,
  extractTokenFromOutboxPayload,
  getUserByEmail,
  manuallyVerifyUserEmail,
  verifyTokenHashFormat,
} from './helpers/auth-test-helpers';
import { UserOrganization } from '../src/organizations/entities/user-organization.entity';
import { OrgInvite } from '../src/modules/auth/entities/org-invite.entity';

describe('Organization Invites (E2E)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    // Ensure TOKEN_HASH_SECRET is set
    if (!process.env.TOKEN_HASH_SECRET) {
      process.env.TOKEN_HASH_SECRET =
        'test-token-hash-secret-32-chars-minimum-required-for-hmac-sha256';
      console.warn(
        '⚠️  TOKEN_HASH_SECRET not set, using test default. Set in production!',
      );
    }

    // Disable demo bootstrap
    process.env.DEMO_BOOTSTRAP = 'false';

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

    dataSource = app.get(DataSource);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Invite Create Flow', () => {
    it('unverified user cannot create invite, expect 403', async () => {
      const timestamp = Date.now();
      const email = `unverified-${timestamp}@test.com`;

      // Register user (not verified)
      const { userId, orgId } = await registerUser(
        app,
        email,
        'SecurePass123!@#',
        'Unverified User',
        `Unverified Org ${timestamp}`,
      );

      // Login
      const { accessToken } = await loginUser(app, email, 'SecurePass123!@#');

      // Try to create invite (should be blocked)
      await request(app.getHttpServer())
        .post(`/api/orgs/${orgId}/invites`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          email: `invitee-${timestamp}@test.com`,
          role: 'pm',
        })
        .expect(403);
    });

    it('verified user can create invite, expect 200 and outbox event created', async () => {
      const timestamp = Date.now();
      const email = `verified-${timestamp}@test.com`;

      // Register and verify user
      const { userId, orgId } = await registerUser(
        app,
        email,
        'SecurePass123!@#',
        'Verified User',
        `Verified Org ${timestamp}`,
      );

      await manuallyVerifyUserEmail(dataSource, userId);

      // Login
      const { accessToken } = await loginUser(app, email, 'SecurePass123!@#');

      // Create invite
      const inviteeEmail = `invitee-${timestamp}@test.com`;
      const response = await createInvite(
        app,
        accessToken,
        orgId,
        inviteeEmail,
        'pm',
      );

      expect(response.message).toContain('successfully');

      // Verify outbox event was created
      const outboxEvent = await getLatestOutboxEvent(
        dataSource,
        'auth.invite.created',
      );
      expect(outboxEvent).toBeDefined();
      expect(outboxEvent?.status).toBe('pending');

      // Verify invite record exists with hashed token
      const inviteRepo = dataSource.getRepository(OrgInvite);
      const invite = await inviteRepo.findOne({
        where: { email: inviteeEmail.toLowerCase() },
      });
      expect(invite).toBeDefined();
      expect(invite?.tokenHash).toBeDefined();
      expect(verifyTokenHashFormat(invite!.tokenHash)).toBe(true);
    });
  });

  describe('Invite Accept Flow', () => {
    it('accept invite creates membership', async () => {
      const timestamp = Date.now();
      const inviterEmail = `inviter-${timestamp}@test.com`;
      const inviteeEmail = `invitee-${timestamp}@test.com`;

      // Create inviter (verified)
      const { userId: inviterId, orgId } = await registerUser(
        app,
        inviterEmail,
        'SecurePass123!@#',
        'Inviter User',
        `Inviter Org ${timestamp}`,
      );

      await manuallyVerifyUserEmail(dataSource, inviterId);

      const { accessToken: inviterToken } = await loginUser(
        app,
        inviterEmail,
        'SecurePass123!@#',
      );

      // Create invite
      await createInvite(app, inviterToken, orgId, inviteeEmail, 'pm');

      // Register invitee
      const { userId: inviteeId } = await registerUser(
        app,
        inviteeEmail,
        'SecurePass123!@#',
        'Invitee User',
        `Invitee Org ${timestamp}`,
      );

      await manuallyVerifyUserEmail(dataSource, inviteeId);

      const { accessToken: inviteeToken } = await loginUser(
        app,
        inviteeEmail,
        'SecurePass123!@#',
      );

      // Get invite token from outbox
      const outboxEvent = await getLatestOutboxEvent(
        dataSource,
        'auth.invite.created',
      );
      const rawToken = extractTokenFromOutboxPayload(outboxEvent!);

      // Accept invite
      const result = await acceptInvite(app, inviteeToken, rawToken!);

      expect(result.orgId).toBe(orgId);

      // Verify membership was created
      const userOrgRepo = dataSource.getRepository(UserOrganization);
      const membership = await userOrgRepo.findOne({
        where: {
          userId: inviteeId,
          organizationId: orgId,
          isActive: true,
        },
      });

      expect(membership).toBeDefined();
      expect(membership?.role).toBe('pm');

      // Verify invite is marked as accepted
      const inviteRepo = dataSource.getRepository(OrgInvite);
      const invite = await inviteRepo.findOne({
        where: { email: inviteeEmail.toLowerCase() },
      });
      expect(invite?.acceptedAt).toBeDefined();
    });

    it('accept invite second time returns 200 success and no duplicate membership rows', async () => {
      const timestamp = Date.now();
      const inviterEmail = `inviter2-${timestamp}@test.com`;
      const inviteeEmail = `invitee2-${timestamp}@test.com`;

      // Setup: Create inviter and invite
      const { userId: inviterId, orgId } = await registerUser(
        app,
        inviterEmail,
        'SecurePass123!@#',
        'Inviter User',
        `Inviter Org ${timestamp}`,
      );

      await manuallyVerifyUserEmail(dataSource, inviterId);
      const { accessToken: inviterToken } = await loginUser(
        app,
        inviterEmail,
        'SecurePass123!@#',
      );

      await createInvite(app, inviterToken, orgId, inviteeEmail, 'pm');

      // Register and verify invitee
      const { userId: inviteeId } = await registerUser(
        app,
        inviteeEmail,
        'SecurePass123!@#',
        'Invitee User',
        `Invitee Org ${timestamp}`,
      );

      await manuallyVerifyUserEmail(dataSource, inviteeId);
      const { accessToken: inviteeToken } = await loginUser(
        app,
        inviteeEmail,
        'SecurePass123!@#',
      );

      // Get token
      const outboxEvent = await getLatestOutboxEvent(
        dataSource,
        'auth.invite.created',
      );
      const rawToken = extractTokenFromOutboxPayload(outboxEvent!);

      // First accept
      await acceptInvite(app, inviteeToken, rawToken!);

      // Count memberships before second accept
      const userOrgRepo = dataSource.getRepository(UserOrganization);
      const membershipsBefore = await userOrgRepo.find({
        where: {
          userId: inviteeId,
          organizationId: orgId,
        },
      });
      const countBefore = membershipsBefore.length;

      // Second accept (idempotent)
      const result = await acceptInvite(app, inviteeToken, rawToken!);

      expect(result.orgId).toBe(orgId);

      // Verify no duplicate membership
      const membershipsAfter = await userOrgRepo.find({
        where: {
          userId: inviteeId,
          organizationId: orgId,
        },
      });
      expect(membershipsAfter.length).toBe(countBefore);
    });

    it('accept expired invite returns 400', async () => {
      const timestamp = Date.now();
      const inviterEmail = `inviter3-${timestamp}@test.com`;
      const inviteeEmail = `invitee3-${timestamp}@test.com`;

      // Setup
      const { userId: inviterId, orgId } = await registerUser(
        app,
        inviterEmail,
        'SecurePass123!@#',
        'Inviter User',
        `Inviter Org ${timestamp}`,
      );

      await manuallyVerifyUserEmail(dataSource, inviterId);
      const { accessToken: inviterToken } = await loginUser(
        app,
        inviterEmail,
        'SecurePass123!@#',
      );

      await createInvite(app, inviterToken, orgId, inviteeEmail, 'pm');

      // Register invitee
      const { userId: inviteeId } = await registerUser(
        app,
        inviteeEmail,
        'SecurePass123!@#',
        'Invitee User',
        `Invitee Org ${timestamp}`,
      );

      await manuallyVerifyUserEmail(dataSource, inviteeId);
      const { accessToken: inviteeToken } = await loginUser(
        app,
        inviteeEmail,
        'SecurePass123!@#',
      );

      // Get invite and expire it
      const inviteRepo = dataSource.getRepository(OrgInvite);
      const invite = await inviteRepo.findOne({
        where: { email: inviteeEmail.toLowerCase() },
      });

      if (invite) {
        await inviteRepo.update(invite.id, {
          expiresAt: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
        });

        // Get token
        const outboxEvent = await getLatestOutboxEvent(
          dataSource,
          'auth.invite.created',
        );
        const rawToken = extractTokenFromOutboxPayload(outboxEvent!);

        // Try to accept expired invite
        await request(app.getHttpServer())
          .post('/api/invites/accept')
          .set('Authorization', `Bearer ${inviteeToken}`)
          .send({ token: rawToken })
          .expect(400);
      }
    });
  });

  describe('Verification Gating', () => {
    it('unverified user cannot access guarded endpoint (e.g., integrations)', async () => {
      const timestamp = Date.now();
      const email = `guarded-${timestamp}@test.com`;

      // Register unverified user
      const { userId } = await registerUser(
        app,
        email,
        'SecurePass123!@#',
        'Guarded User',
        `Guarded Org ${timestamp}`,
      );

      const { accessToken } = await loginUser(app, email, 'SecurePass123!@#');

      // Try to access a guarded endpoint (invite creation is guarded)
      const user = await getUserByEmail(dataSource, email);
      if (user) {
        const response = await request(app.getHttpServer())
          .post(`/api/orgs/${user.organizationId}/invites`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            email: `test-${timestamp}@test.com`,
            role: 'pm',
          })
          .expect(403);

        expect(response.body.message).toContain('verify your email');
      }
    });
  });
});

