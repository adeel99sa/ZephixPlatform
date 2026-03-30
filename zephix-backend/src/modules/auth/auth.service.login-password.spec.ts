import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as argon2 from 'argon2';
import { AuthService } from './auth.service';

jest.mock('../../common/security/token-hash.util', () => ({
  TokenHashUtil: {
    hashRefreshToken: jest.fn().mockReturnValue('hashed-refresh-token'),
    verifyRefreshToken: jest.fn().mockReturnValue(true),
  },
}));

describe('AuthService login — password hash formats', () => {
  const plain = 'TestPass123!';
  let bcryptHash: string;
  let argon2Hash: string;

  beforeAll(async () => {
    bcryptHash = await bcrypt.hash(plain, 10);
    argon2Hash = await argon2.hash(plain, { type: argon2.argon2id });
  });

  beforeEach(() => {
    process.env.JWT_SECRET =
      process.env.JWT_SECRET || 'test-jwt-secret-32-bytes-minimum!!';
    process.env.JWT_REFRESH_SECRET =
      process.env.JWT_REFRESH_SECRET || 'test-refresh-secret-32-bytes-minimum!!';
  });

  function buildService(userRepository: {
    findOne: jest.Mock;
    update: jest.Mock;
  }) {
    const authSessionRepository = {
      create: jest.fn((v) => ({ ...v })),
      save: jest
        .fn()
        .mockResolvedValueOnce({ id: 'session-1' })
        .mockResolvedValueOnce({ id: 'session-1' }),
    };
    const jwtService = {
      sign: jest.fn().mockReturnValue('signed-token'),
    };
    const rateLimitStore = {
      hit: jest
        .fn()
        .mockResolvedValue({ allowed: true, remaining: Number.MAX_SAFE_INTEGER }),
    };
    return new AuthService(
      userRepository as any,
      {} as any,
      { findOne: jest.fn().mockResolvedValue(null) } as any,
      authSessionRepository as any,
      jwtService as any,
      {} as any,
      rateLimitStore as any,
    );
  }

  it('accepts Argon2id hashes', async () => {
    const userRepository = {
      findOne: jest.fn().mockResolvedValue({
        id: 'u1',
        email: 'a@example.com',
        password: argon2Hash,
        role: 'admin',
        organizationId: null,
        isEmailVerified: true,
        emailVerifiedAt: new Date(),
        isActive: true,
      }),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    const service = buildService(userRepository);

    const result = await service.login({
      email: 'a@example.com',
      password: plain,
    });

    expect(result.accessToken).toBe('signed-token');
    const passwordMigrationCalls = userRepository.update.mock.calls.filter(
      (call) => call[1] && typeof call[1] === 'object' && 'password' in call[1],
    );
    expect(passwordMigrationCalls).toHaveLength(0);
  });

  it('accepts bcrypt hashes and rehashes to Argon2id', async () => {
    const userRepository = {
      findOne: jest.fn().mockResolvedValue({
        id: 'u2',
        email: 'b@example.com',
        password: bcryptHash,
        role: 'admin',
        organizationId: null,
        isEmailVerified: true,
        emailVerifiedAt: new Date(),
        isActive: true,
      }),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    const service = buildService(userRepository);

    const result = await service.login({
      email: 'b@example.com',
      password: plain,
    });

    expect(result.accessToken).toBe('signed-token');
    expect(userRepository.update).toHaveBeenCalledWith(
      'u2',
      expect.objectContaining({
        password: expect.stringMatching(/^\$argon2id\$/),
      }),
    );
  });

  it('rejects wrong password for Argon2id hash', async () => {
    const userRepository = {
      findOne: jest.fn().mockResolvedValue({
        id: 'u3',
        email: 'c@example.com',
        password: argon2Hash,
        role: 'admin',
        organizationId: null,
        isEmailVerified: true,
        emailVerifiedAt: new Date(),
        isActive: true,
      }),
      update: jest.fn(),
    };
    const service = buildService(userRepository);

    await expect(
      service.login({ email: 'c@example.com', password: 'WrongPass123!' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(userRepository.update).not.toHaveBeenCalled();
  });
});
