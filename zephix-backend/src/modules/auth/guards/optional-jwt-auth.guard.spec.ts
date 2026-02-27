import { UnauthorizedException } from '@nestjs/common';
import { OptionalJwtAuthGuard } from './optional-jwt-auth.guard';

describe('OptionalJwtAuthGuard', () => {
  const guard = new OptionalJwtAuthGuard();

  it('no cookie => 200 path allowed by returning null user', () => {
    const result = guard.handleRequest(null, null, { message: 'No auth token' }, {});
    expect(result).toBeNull();
  });

  it('invalid cookie => 401 by throwing UnauthorizedException', () => {
    expect(() =>
      guard.handleRequest(null, null, { message: 'invalid signature' }, {}),
    ).toThrow(UnauthorizedException);
  });

  it('valid session => 200 path by returning auth user', () => {
    const authUser = { id: 'user-1', email: 'test@example.com' };
    const result = guard.handleRequest(null, authUser, null, {});
    expect(result).toEqual(authUser);
  });
});
