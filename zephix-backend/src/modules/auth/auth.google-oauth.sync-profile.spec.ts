import { ConflictException, Logger } from '@nestjs/common';
import { AuthService } from './auth.service';

function createAuthServiceWithUserRepo(userRepository: {
  findOne: jest.Mock;
}): AuthService {
  return new AuthService(
    userRepository as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    { sign: jest.fn().mockReturnValue('jwt') } as any,
    { transaction: jest.fn() } as any,
    {} as any,
    null,
    undefined,
    { provisionNewOrganization: jest.fn().mockResolvedValue(undefined) } as any,
  );
}

describe('AuthService.syncGoogleOAuthProfile', () => {
  it('returns user when googleId already linked', async () => {
    const existing = {
      id: 'u1',
      email: 'a@b.com',
      googleId: 'google-sub-1',
    };
    const userRepository = {
      findOne: jest.fn().mockResolvedValue(existing),
    };
    const svc = createAuthServiceWithUserRepo(userRepository);
    const result = await svc.syncGoogleOAuthProfile({
      googleId: 'google-sub-1',
      email: 'a@b.com',
      emailVerifiedFromGoogle: true,
      displayName: 'A User',
    });
    expect(result).toEqual(existing);
    expect(userRepository.findOne).toHaveBeenCalledTimes(1);
  });

  it('throws ACCOUNT_EXISTS_PASSWORD when email exists without googleId', async () => {
    const userRepository = {
      findOne: jest
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 'u1',
          email: 'a@b.com',
          googleId: null,
        }),
    };
    const svc = createAuthServiceWithUserRepo(userRepository);
    let err: unknown;
    try {
      await svc.syncGoogleOAuthProfile({
        googleId: 'new-google',
        email: 'a@b.com',
        emailVerifiedFromGoogle: true,
        displayName: 'A',
      });
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(ConflictException);
    expect((err as ConflictException).getResponse()).toMatchObject({
      code: 'ACCOUNT_EXISTS_PASSWORD',
    });
    expect(userRepository.findOne).toHaveBeenCalledTimes(2);
  });

  it('throws GOOGLE_ACCOUNT_MISMATCH when email linked to another googleId', async () => {
    const warnSpy = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
    const userRepository = {
      findOne: jest
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 'u1',
          email: 'a@b.com',
          googleId: 'other-google',
        }),
    };
    const svc = createAuthServiceWithUserRepo(userRepository);
    let err: unknown;
    try {
      await svc.syncGoogleOAuthProfile({
        googleId: 'attacker-google',
        email: 'a@b.com',
        emailVerifiedFromGoogle: true,
        displayName: 'A',
      });
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(ConflictException);
    expect((err as ConflictException).getResponse()).toMatchObject({
      code: 'GOOGLE_ACCOUNT_MISMATCH',
    });
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
