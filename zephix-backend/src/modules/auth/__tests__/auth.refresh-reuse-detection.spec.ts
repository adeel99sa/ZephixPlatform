/**
 * ADR-002 family reuse-detection — focused unit test.
 *
 * Asserts that when AuthService.refreshToken() is called with a token whose
 * session has already been rotated (replaced_at IS NOT NULL), the entire
 * family is invalidated, an `auth.token_refresh_reuse_detected` event is
 * published, and the call throws `REFRESH_TOKEN_REUSE_DETECTED`.
 *
 * The new-row rotation happy path is exercised end-to-end via an
 * integration test (separate commit). This unit test isolates the theft
 * detection path because that's the security-critical contract.
 */

import { UnauthorizedException } from '@nestjs/common';
import { Repository, DataSource } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from '../auth.service';
import { User } from '../../users/entities/user.entity';
import { Organization } from '../../../organizations/entities/organization.entity';
import { UserOrganization } from '../../../organizations/entities/user-organization.entity';
import { AuthSession } from '../entities/auth-session.entity';
import { PasswordResetToken } from '../entities/password-reset-token.entity';
import { RefreshToken } from '../entities/refresh-token.entity';
import { Workspace } from '../../workspaces/entities/workspace.entity';
import { EmailService } from '../../../shared/services/email.service';
import {
  IdentityEvent,
  AuthTokenRefreshReuseDetectedEvent,
} from '../../../common/events/identity-events';
import { IdentityEventBus } from '../../../common/events/identity-event-bus';

describe('AuthService.refreshToken() — family reuse-detection (ADR-002)', () => {
  const OLD_REFRESH = process.env.JWT_REFRESH_SECRET;
  const OLD_TOKEN_HASH = process.env.TOKEN_HASH_SECRET;
  const OLD_PEPPER = process.env.REFRESH_TOKEN_PEPPER;

  let service: AuthService;
  let userRepo: jest.Mocked<Pick<Repository<User>, 'findOne'>>;
  let sessionRepo: any;
  let jwt: { verify: jest.Mock };
  let queryBuilderUpdateExecute: jest.Mock;
  let eventBus: CapturingEventBus;

  const FAMILY_ID = '11111111-1111-1111-1111-111111111111';
  const OLD_SESSION_ID = 'aaaaaaaa-1111-1111-1111-aaaaaaaaaaaa';
  const USER_ID = '22222222-2222-2222-2222-222222222222';
  const ORG_ID = '33333333-3333-3333-3333-333333333333';

  beforeAll(() => {
    process.env.JWT_REFRESH_SECRET =
      'test-refresh-secret-must-be-at-least-32-chars';
    process.env.TOKEN_HASH_SECRET =
      'test-token-hash-secret-32-chars-mini';
    process.env.REFRESH_TOKEN_PEPPER =
      'test-refresh-pepper-32-chars-minimum';
  });

  afterAll(() => {
    if (OLD_REFRESH === undefined) delete process.env.JWT_REFRESH_SECRET;
    else process.env.JWT_REFRESH_SECRET = OLD_REFRESH;
    if (OLD_TOKEN_HASH === undefined) delete process.env.TOKEN_HASH_SECRET;
    else process.env.TOKEN_HASH_SECRET = OLD_TOKEN_HASH;
    if (OLD_PEPPER === undefined) delete process.env.REFRESH_TOKEN_PEPPER;
    else process.env.REFRESH_TOKEN_PEPPER = OLD_PEPPER;
  });

  beforeEach(() => {
    queryBuilderUpdateExecute = jest.fn().mockResolvedValue({ affected: 3 });
    const queryBuilder = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      execute: queryBuilderUpdateExecute,
    };

    sessionRepo = {
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(() => queryBuilder),
    };

    userRepo = { findOne: jest.fn() };
    userRepo.findOne.mockResolvedValue({
      id: USER_ID,
      email: 'reused@example.com',
      organizationId: ORG_ID,
      isActive: true,
    } as User);

    jwt = {
      verify: jest.fn().mockReturnValue({
        sub: USER_ID,
        sid: OLD_SESSION_ID,
        email: 'reused@example.com',
        organizationId: ORG_ID,
      }),
    };

    eventBus = new CapturingEventBus();

    const stubRepo = {} as any;
    const stubDataSource = {} as DataSource;
    const stubEmail = {} as EmailService;

    service = new AuthService(
      userRepo as unknown as Repository<User>,
      stubRepo as Repository<Organization>,
      stubRepo as Repository<UserOrganization>,
      sessionRepo as Repository<AuthSession>,
      stubRepo as Repository<PasswordResetToken>,
      stubRepo as Repository<RefreshToken>,
      stubRepo as Repository<Workspace>,
      jwt as unknown as JwtService,
      stubDataSource,
      stubEmail,
      null,
      undefined,
      undefined,
      eventBus,
    );
  });

  it('detects reuse when presented session has replaced_at set; invalidates family + throws REFRESH_TOKEN_REUSE_DETECTED', async () => {
    sessionRepo.findOne.mockResolvedValue({
      id: OLD_SESSION_ID,
      userId: USER_ID,
      organizationId: ORG_ID,
      familyId: FAMILY_ID,
      replacedAt: new Date('2026-05-01T00:00:00Z'), // session has been rotated already
      replacedBySessionId: 'new-session-id',
      revokedAt: null,
      currentRefreshTokenHash: 'preserved-hash',
      isRevoked: () => false,
      isExpired: () => false,
    } as unknown as AuthSession);

    let caught: unknown;
    try {
      await service.refreshToken(
        'forged-or-stolen-old-refresh-token',
        OLD_SESSION_ID,
        '203.0.113.7',
        'Mozilla/5.0',
      );
    } catch (e) {
      caught = e;
    }

    expect(caught).toBeInstanceOf(UnauthorizedException);
    const response = (caught as UnauthorizedException).getResponse() as {
      code: string;
      message: string;
    };
    expect(response.code).toBe('REFRESH_TOKEN_REUSE_DETECTED');
    expect(response.message).toMatch(/Re-authentication required/i);

    // Family invalidation query ran exactly once
    expect(queryBuilderUpdateExecute).toHaveBeenCalledTimes(1);
    expect(sessionRepo.createQueryBuilder).toHaveBeenCalledTimes(1);

    // Event published with the right family + invalidatedSessionCount
    const event = eventBus.events[0] as
      | AuthTokenRefreshReuseDetectedEvent
      | undefined;
    expect(event?.type).toBe('auth.token_refresh_reuse_detected');
    expect(event?.familyId).toBe(FAMILY_ID);
    expect(event?.userId).toBe(USER_ID);
    expect(event?.organizationId).toBe(ORG_ID);
    expect(event?.invalidatedSessionCount).toBe(3);
    expect(event?.ipAddress).toBe('203.0.113.7');
    expect(event?.userAgent).toBe('Mozilla/5.0');
  });

  it('does NOT trip reuse-detection when session.replacedAt is null (normal first refresh)', async () => {
    // Session has not been rotated yet — refresh proceeds to hash verify path.
    // Hash verification fails because we feed a wrong hash, so we end up at
    // the generic "Invalid refresh token for session" error — NOT the
    // REFRESH_TOKEN_REUSE_DETECTED code. Proves the reuse branch is only
    // reached when replacedAt is set.
    sessionRepo.findOne.mockResolvedValue({
      id: OLD_SESSION_ID,
      userId: USER_ID,
      organizationId: ORG_ID,
      familyId: FAMILY_ID,
      replacedAt: null,
      replacedBySessionId: null,
      revokedAt: null,
      currentRefreshTokenHash: 'will-not-match-our-token',
      isRevoked: () => false,
      isExpired: () => false,
    } as unknown as AuthSession);

    let caught: unknown;
    try {
      await service.refreshToken(
        'token-not-matching-stored-hash',
        OLD_SESSION_ID,
        '203.0.113.8',
        'Mozilla/5.0',
      );
    } catch (e) {
      caught = e;
    }

    expect(caught).toBeInstanceOf(UnauthorizedException);
    const response = (caught as UnauthorizedException).getResponse() as
      | string
      | { code?: string; message?: string };
    // The response must NOT carry the structured REUSE_DETECTED code (proves
    // the reuse branch was bypassed). Whether it's a generic Nest envelope
    // or a string is implementation detail.
    if (typeof response === 'object' && response !== null) {
      expect(response.code).not.toBe('REFRESH_TOKEN_REUSE_DETECTED');
    }
    expect(queryBuilderUpdateExecute).not.toHaveBeenCalled();
    expect(eventBus.events).toHaveLength(0);
  });

  it('event payload omits user-agent / ip when caller passes empty strings', async () => {
    sessionRepo.findOne.mockResolvedValue({
      id: OLD_SESSION_ID,
      userId: USER_ID,
      organizationId: ORG_ID,
      familyId: FAMILY_ID,
      replacedAt: new Date('2026-05-01T00:00:00Z'),
      replacedBySessionId: 'new-session-id',
      revokedAt: null,
      currentRefreshTokenHash: 'preserved-hash',
      isRevoked: () => false,
      isExpired: () => false,
    } as unknown as AuthSession);

    await service
      .refreshToken('reused-token', OLD_SESSION_ID, '', '')
      .catch(() => undefined);

    const event = eventBus.events[0] as
      | AuthTokenRefreshReuseDetectedEvent
      | undefined;
    expect(event?.ipAddress).toBeNull(); // empty string normalized to null
    expect(event?.userAgent).toBeNull();
  });
});

class CapturingEventBus implements IdentityEventBus {
  events: IdentityEvent[] = [];
  async publish(event: IdentityEvent): Promise<void> {
    this.events.push(event);
  }
}
