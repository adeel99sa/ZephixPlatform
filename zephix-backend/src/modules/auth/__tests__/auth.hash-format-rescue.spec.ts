/**
 * AUTH-MISMATCH-1 — format-aware verify + opportunistic argon2→bcrypt rescue.
 *
 * Background: the org-signup path historically wrote $argon2 password hashes,
 * but login() only ran bcrypt.compare — so those users were locked out on their
 * next login, indistinguishable from a wrong password. login() now dispatches on
 * the stored hash's prefix and re-hashes argon2 users to bcrypt on success.
 *
 * These tests isolate the verify/rescue logic by stubbing createLoginResult and
 * ensureEmailVerificationAllowed (the heavy session machinery is out of scope).
 */
import { UnauthorizedException } from '@nestjs/common';
import { Repository, DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as argon2 from 'argon2';
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

// Keep hashSync real (AuthService lazily builds the timing-dummy with it); mock
// compare + hash so we can spy on the verify dispatch and the rescue write.
jest.mock('bcrypt', () => {
  const real = jest.requireActual('bcrypt');
  return { __esModule: true, ...real, compare: jest.fn(), hash: jest.fn() };
});
jest.mock('argon2', () => ({ verify: jest.fn(), hash: jest.fn() }));

const ARGON2_HASH = '$argon2id$v=19$m=65536,t=3,p=4$c29tZXNhbHQ$aGFzaGhhc2g';
const BCRYPT_HASH = '$2b$10$abcdefghijklmnopqrstuvwxyABCDEFGHIJKLMNOPQRSTUV0123456';
const REHASHED = '$2b$10$rehashedrehashedrehashedrehashedrehashedrehashedrehash';

describe('AuthService.login() — AUTH-MISMATCH-1 hash-format rescue', () => {
  const OLD_JWT = process.env.JWT_SECRET;
  const OLD_REFRESH = process.env.JWT_REFRESH_SECRET;

  let service: AuthService;
  let userRepo: jest.Mocked<Pick<Repository<User>, 'findOne' | 'update'>>;
  const compareMock = bcrypt.compare as unknown as jest.Mock;
  const bcryptHashMock = bcrypt.hash as unknown as jest.Mock;
  const argonVerifyMock = argon2.verify as unknown as jest.Mock;

  beforeAll(() => {
    // Throwaway ≥32-char test secrets. Built via padEnd so the source carries
    // only a short, low-entropy dictionary literal — no high-entropy token for
    // gitleaks' generic-api-key rule to fire on (keeps .gitleaks.toml frozen).
    process.env.JWT_SECRET = 'test-jwt-secret-'.padEnd(40, 'x');
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-'.padEnd(40, 'x');
  });
  afterAll(() => {
    if (OLD_JWT === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = OLD_JWT;
    if (OLD_REFRESH === undefined) delete process.env.JWT_REFRESH_SECRET;
    else process.env.JWT_REFRESH_SECRET = OLD_REFRESH;
  });

  beforeEach(() => {
    compareMock.mockReset();
    bcryptHashMock.mockReset().mockResolvedValue(REHASHED);
    argonVerifyMock.mockReset();

    userRepo = { findOne: jest.fn(), update: jest.fn().mockResolvedValue({}) };

    const stubRepo = {} as any;
    service = new AuthService(
      userRepo as unknown as Repository<User>,
      stubRepo as Repository<Organization>,
      stubRepo as Repository<UserOrganization>,
      stubRepo as Repository<AuthSession>,
      stubRepo as Repository<PasswordResetToken>,
      stubRepo as Repository<RefreshToken>,
      stubRepo as Repository<Workspace>,
      {} as JwtService,
      {} as DataSource,
      {} as EmailService,
      null,
      undefined,
      undefined,
    );

    // Isolate: session issuance + email-verification gate are out of scope.
    jest
      .spyOn(service as any, 'ensureEmailVerificationAllowed')
      .mockResolvedValue(undefined);
    jest
      .spyOn(service as any, 'createLoginResult')
      .mockResolvedValue({ accessToken: 'a', refreshToken: 'r' });
  });

  it('rescues an argon2 user: argon2.verify succeeds, no bcrypt.compare, hash migrated to bcrypt', async () => {
    userRepo.findOne.mockResolvedValue({
      id: 'u-argon',
      email: 'legacy@example.com',
      password: ARGON2_HASH,
    } as User);
    argonVerifyMock.mockResolvedValue(true);

    const res = await service.login({
      email: 'legacy@example.com',
      password: 'correct-horse',
    });

    expect(res).toEqual({ accessToken: 'a', refreshToken: 'r' });
    // Verify dispatched to argon2, NOT bcrypt.compare.
    expect(argonVerifyMock).toHaveBeenCalledWith(ARGON2_HASH, 'correct-horse');
    expect(compareMock).not.toHaveBeenCalled();
    // Rescue: re-hashed to bcrypt and persisted.
    expect(bcryptHashMock).toHaveBeenCalledWith('correct-horse', 10);
    expect(userRepo.update).toHaveBeenCalledWith(
      { id: 'u-argon' },
      { password: REHASHED },
    );
  });

  it('rescue is FAIL-OPEN: login still succeeds when the re-hash write throws', async () => {
    userRepo.findOne.mockResolvedValue({
      id: 'u-argon',
      email: 'legacy@example.com',
      password: ARGON2_HASH,
    } as User);
    argonVerifyMock.mockResolvedValue(true);
    userRepo.update.mockRejectedValue(new Error('db down'));
    const warnSpy = jest
      .spyOn((service as any).logger, 'warn')
      .mockImplementation(() => undefined);

    const res = await service.login({
      email: 'legacy@example.com',
      password: 'correct-horse',
    });

    // Session already issued — the rescue failure must not become the jailer.
    expect(res).toEqual({ accessToken: 'a', refreshToken: 'r' });
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('AUTH_REHASH_FAILED'),
    );
  });

  it('argon2 user with WRONG password: 401, no rescue write', async () => {
    userRepo.findOne.mockResolvedValue({
      id: 'u-argon',
      email: 'legacy@example.com',
      password: ARGON2_HASH,
    } as User);
    argonVerifyMock.mockResolvedValue(false);

    await expect(
      service.login({ email: 'legacy@example.com', password: 'nope' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(userRepo.update).not.toHaveBeenCalled();
    expect(bcryptHashMock).not.toHaveBeenCalled();
  });

  it('bcrypt user: verifies via bcrypt.compare, argon2 untouched, no rescue', async () => {
    userRepo.findOne.mockResolvedValue({
      id: 'u-bcrypt',
      email: 'normal@example.com',
      password: BCRYPT_HASH,
    } as User);
    compareMock.mockResolvedValue(true);

    const res = await service.login({
      email: 'normal@example.com',
      password: 'right',
    });

    expect(res).toEqual({ accessToken: 'a', refreshToken: 'r' });
    expect(compareMock).toHaveBeenCalledWith('right', BCRYPT_HASH);
    expect(argonVerifyMock).not.toHaveBeenCalled();
    expect(userRepo.update).not.toHaveBeenCalled();
  });
});
