/**
 * ADR-008 (account enumeration prevention) — focused unit test.
 *
 * Asserts that login() invokes bcrypt.compare on BOTH the user-not-found
 * and wrong-password code paths, so that response timing does not betray
 * account existence. The dummy compare in the not-found branch is fed a
 * static hash; the result is discarded.
 *
 * The test does not measure timing directly (flaky in unit tests). The
 * structural assertion — bcrypt.compare invoked once per call regardless
 * of whether the user exists — is the load-bearing check. Sub-50ms timing
 * parity in CI is deferred per pre-paying-customers.md item S5.
 */

// Mock bcrypt at module level: keep hashSync real (so AuthService can
// generate the dummy hash), but mock compare so we can spy on it.
jest.mock('bcrypt', () => {
  const real = jest.requireActual('bcrypt');
  return {
    ...real,
    compare: jest.fn(),
  };
});

import { UnauthorizedException } from '@nestjs/common';
import { Repository, DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { AuthService } from '../auth.service';
import { User } from '../../users/entities/user.entity';
import { Organization } from '../../../organizations/entities/organization.entity';
import { UserOrganization } from '../../../organizations/entities/user-organization.entity';
import { AuthSession } from '../entities/auth-session.entity';
import { PasswordResetToken } from '../entities/password-reset-token.entity';
import { RefreshToken } from '../entities/refresh-token.entity';
import { Workspace } from '../../workspaces/entities/workspace.entity';
import { JwtService } from '@nestjs/jwt';
import { EmailService } from '../../../shared/services/email.service';

describe('AuthService.login() — enumeration prevention (ADR-008)', () => {
  const OLD_JWT = process.env.JWT_SECRET;
  const OLD_REFRESH = process.env.JWT_REFRESH_SECRET;

  let service: AuthService;
  let userRepo: jest.Mocked<Pick<Repository<User>, 'findOne'>>;
  const compareMock = bcrypt.compare as unknown as jest.Mock;

  beforeAll(() => {
    process.env.JWT_SECRET = 'test-jwt-secret-must-be-at-least-32-chars-long';
    process.env.JWT_REFRESH_SECRET =
      'test-refresh-secret-must-be-at-least-32-chars';
  });

  afterAll(() => {
    if (OLD_JWT === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = OLD_JWT;
    if (OLD_REFRESH === undefined) delete process.env.JWT_REFRESH_SECRET;
    else process.env.JWT_REFRESH_SECRET = OLD_REFRESH;
  });

  beforeEach(() => {
    compareMock.mockReset();
    compareMock.mockResolvedValue(false);

    userRepo = { findOne: jest.fn() };

    const stubRepo = {} as any;
    const stubDataSource = {} as DataSource;
    const stubJwt = {} as JwtService;
    const stubEmail = {} as EmailService;

    service = new AuthService(
      userRepo as unknown as Repository<User>,
      stubRepo as Repository<Organization>,
      stubRepo as Repository<UserOrganization>,
      stubRepo as Repository<AuthSession>,
      stubRepo as Repository<PasswordResetToken>,
      stubRepo as Repository<RefreshToken>,
      stubRepo as Repository<Workspace>,
      stubJwt,
      stubDataSource,
      stubEmail,
      null,
      undefined,
      undefined,
    );
  });

  it('runs bcrypt.compare on user-not-found (dummy verify) — equalizes timing with wrong-password', async () => {
    userRepo.findOne.mockResolvedValue(null);

    await expect(
      service.login({ email: 'unknown@example.com', password: 'whatever' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(compareMock).toHaveBeenCalledTimes(1);
    // The compare receives the dummy hash. Since hashSync is real, the
    // hash structurally matches bcrypt format $2[ab]$<cost>$<22 salt><31 hash>
    const hashArg = compareMock.mock.calls[0][1] as string;
    expect(hashArg).toMatch(/^\$2[ab]\$\d{2}\$/);
  });

  it('runs bcrypt.compare on wrong-password — same number of calls as not-found path', async () => {
    userRepo.findOne.mockResolvedValue({
      id: 'u1',
      email: 'known@example.com',
      password:
        '$2b$10$realbutstillforgedhashforunittestonly..............',
    } as User);

    await expect(
      service.login({ email: 'known@example.com', password: 'wrong-password' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(compareMock).toHaveBeenCalledTimes(1);
  });

  it('throws identical exception type and message regardless of user existence', async () => {
    let unknownErr: unknown;
    let wrongPasswordErr: unknown;

    userRepo.findOne.mockResolvedValueOnce(null);
    try {
      await service.login({
        email: 'unknown@example.com',
        password: 'whatever',
      });
    } catch (e) {
      unknownErr = e;
    }

    userRepo.findOne.mockResolvedValueOnce({
      id: 'u1',
      email: 'known@example.com',
      password:
        '$2b$10$dummy.................................................',
    } as User);
    try {
      await service.login({
        email: 'known@example.com',
        password: 'wrong-password',
      });
    } catch (e) {
      wrongPasswordErr = e;
    }

    expect(unknownErr).toBeInstanceOf(UnauthorizedException);
    expect(wrongPasswordErr).toBeInstanceOf(UnauthorizedException);
    expect((unknownErr as UnauthorizedException).message).toBe(
      (wrongPasswordErr as UnauthorizedException).message,
    );
  });

  it('does not invoke bcrypt.compare more than once per login attempt', async () => {
    userRepo.findOne.mockResolvedValue(null);
    await expect(
      service.login({ email: 'unknown@example.com', password: 'whatever' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(compareMock).toHaveBeenCalledTimes(1);
  });
});
