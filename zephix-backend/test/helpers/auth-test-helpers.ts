import { DataSource, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { User } from '../../src/modules/users/entities/user.entity';
import { Organization } from '../../src/organizations/entities/organization.entity';
import { UserOrganization } from '../../src/organizations/entities/user-organization.entity';
import { Workspace } from '../../src/modules/workspaces/entities/workspace.entity';
import { WorkspaceMember } from '../../src/modules/workspaces/entities/workspace-member.entity';
import { AuthOutbox } from '../../src/modules/auth/entities/auth-outbox.entity';
import { EmailVerificationToken } from '../../src/modules/auth/entities/email-verification-token.entity';
import { OrgInvite } from '../../src/modules/auth/entities/org-invite.entity';

/**
 * Test Helpers for Auth Signup and Invite E2E Tests
 */

export interface RegisterUserResult {
  userId: string;
  orgId: string;
  workspaceId: string;
  email: string;
}

export interface LoginResult {
  accessToken: string;
  user: any;
}

/**
 * Create organization and default workspace
 */
export async function createOrgAndWorkspace(
  dataSource: DataSource,
  name: string,
  ownerId: string,
): Promise<{ org: Organization; workspace: Workspace }> {
  const orgRepo = dataSource.getRepository(Organization);
  const workspaceRepo = dataSource.getRepository(Workspace);
  const memberRepo = dataSource.getRepository(WorkspaceMember);

  const uniqueSlug = `${name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;

  const org = orgRepo.create({
    name,
    slug: uniqueSlug,
    status: 'trial',
  });
  const savedOrg = await orgRepo.save(org);

  const workspace = workspaceRepo.create({
    name: 'Default Workspace',
    slug: 'default',
    organizationId: savedOrg.id,
    createdBy: ownerId,
    ownerId,
    isPrivate: false,
  });
  const savedWorkspace = await workspaceRepo.save(workspace);

  const member = memberRepo.create({
    workspaceId: savedWorkspace.id,
    userId: ownerId,
    role: 'workspace_owner',
    createdBy: ownerId,
  });
  await memberRepo.save(member);

  return { org: savedOrg, workspace: savedWorkspace };
}

/**
 * Register a new user via API
 */
export async function registerUser(
  app: INestApplication,
  email: string,
  password: string,
  fullName: string,
  orgName: string,
): Promise<RegisterUserResult> {
  const response = await request(app.getHttpServer())
    .post('/api/auth/register')
    .send({
      email,
      password,
      fullName,
      orgName,
    })
    .expect(200);

  // Response is neutral, so we need to find the user by email
  const dataSource = app.get(DataSource);
  const userRepo = dataSource.getRepository(User);
  const user = await userRepo.findOne({ where: { email: email.toLowerCase() } });

  if (!user) {
    throw new Error('User not found after registration');
  }

  const orgRepo = dataSource.getRepository(Organization);
  const org = await orgRepo.findOne({ where: { id: user.organizationId } });

  if (!org) {
    throw new Error('Organization not found after registration');
  }

  const workspaceRepo = dataSource.getRepository(Workspace);
  const workspace = await workspaceRepo.findOne({
    where: { organizationId: org.id },
  });

  if (!workspace) {
    throw new Error('Workspace not found after registration');
  }

  return {
    userId: user.id,
    orgId: org.id,
    workspaceId: workspace.id,
    email: user.email,
  };
}

/**
 * Login user via API
 */
export async function loginUser(
  app: INestApplication,
  email: string,
  password: string,
): Promise<LoginResult> {
  const response = await request(app.getHttpServer())
    .post('/api/auth/login')
    .send({ email, password })
    .expect(200);

  return {
    accessToken: response.body.accessToken,
    user: response.body.user,
  };
}

/**
 * Get latest outbox event by type
 */
export async function getLatestOutboxEvent(
  dataSource: DataSource,
  type: string,
): Promise<AuthOutbox | null> {
  const outboxRepo = dataSource.getRepository(AuthOutbox);
  return outboxRepo.findOne({
    where: { type },
    order: { createdAt: 'DESC' },
  });
}

/**
 * Extract token from outbox payload
 * Works for both email_verification.requested and invite.created events
 */
export function extractTokenFromOutboxPayload(
  outboxEvent: AuthOutbox,
): string | null {
  if (!outboxEvent || !outboxEvent.payloadJson) {
    return null;
  }

  // Both event types store token in payload
  return outboxEvent.payloadJson.token || null;
}

/**
 * Verify email with token (Phase 1: GET with query param)
 */
export async function verifyEmailWithToken(
  app: INestApplication,
  token: string,
): Promise<{ userId: string }> {
  const response = await request(app.getHttpServer())
    .get(`/api/auth/verify-email?token=${encodeURIComponent(token)}`)
    .expect(200);

  return { userId: response.body.userId };
}

/**
 * Create invite via API
 */
export async function createInvite(
  app: INestApplication,
  accessToken: string,
  orgId: string,
  email: string,
  role: 'owner' | 'admin' | 'pm' | 'viewer' = 'pm',
  message?: string,
): Promise<{ message: string }> {
  const response = await request(app.getHttpServer())
    .post(`/api/orgs/${orgId}/invites`)
    .set('Authorization', `Bearer ${accessToken}`)
    .send({ email, role, message })
    .expect(200);

  return response.body;
}

/**
 * Accept invite via API
 */
export async function acceptInvite(
  app: INestApplication,
  accessToken: string,
  token: string,
): Promise<{ orgId: string; message: string }> {
  const response = await request(app.getHttpServer())
    .post('/api/invites/accept')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({ token })
    .expect(200);

  return response.body;
}

/**
 * Resend verification email
 */
export async function resendVerification(
  app: INestApplication,
  email: string,
): Promise<{ message: string }> {
  const response = await request(app.getHttpServer())
    .post('/api/auth/resend-verification')
    .send({ email })
    .expect(200);

  return response.body;
}

/**
 * Get user by email
 */
export async function getUserByEmail(
  dataSource: DataSource,
  email: string,
): Promise<User | null> {
  const userRepo = dataSource.getRepository(User);
  return userRepo.findOne({ where: { email: email.toLowerCase() } });
}

/**
 * Get verification token by user ID
 */
export async function getVerificationToken(
  dataSource: DataSource,
  userId: string,
): Promise<EmailVerificationToken | null> {
  const tokenRepo = dataSource.getRepository(EmailVerificationToken);
  return tokenRepo.findOne({
    where: { userId, usedAt: null },
    order: { createdAt: 'DESC' },
  });
}

/**
 * Get invite by token hash (for verification)
 */
export async function getInviteByTokenHash(
  dataSource: DataSource,
  tokenHash: string,
): Promise<OrgInvite | null> {
  const inviteRepo = dataSource.getRepository(OrgInvite);
  return inviteRepo.findOne({ where: { tokenHash } });
}

/**
 * Verify token hash is 64 hex chars
 */
export function verifyTokenHashFormat(tokenHash: string): boolean {
  return /^[0-9a-f]{64}$/i.test(tokenHash);
}

/**
 * Manually verify user email (for test setup)
 */
export async function manuallyVerifyUserEmail(
  dataSource: DataSource,
  userId: string,
): Promise<void> {
  const userRepo = dataSource.getRepository(User);
  await userRepo.update(userId, {
    isEmailVerified: true,
    emailVerifiedAt: new Date(),
  });
}

