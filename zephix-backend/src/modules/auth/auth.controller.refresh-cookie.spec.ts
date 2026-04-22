import { UnauthorizedException } from '@nestjs/common';
import { AuthController } from './auth.controller';

describe('AuthController refresh — cookie fallback', () => {
  it('uses zephix_refresh cookie when body.refreshToken is omitted', async () => {
    const refreshToken = jest.fn().mockResolvedValue({
      accessToken: 'new-access',
      refreshToken: 'new-refresh',
      user: { id: 'u1' },
    });
    const authService = { refreshToken } as any;
    const controller = new AuthController(
      authService,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );

    const req = {
      ip: '127.0.0.1',
      headers: { 'user-agent': 'vitest' },
      cookies: { zephix_refresh: 'cookie-refresh-token' },
      get: () => 'localhost',
    } as any;

    const cookie = jest.fn();
    const json = jest.fn();
    const res = { cookie, json } as any;

    await controller.refreshToken(req, res, {});

    expect(refreshToken).toHaveBeenCalledWith(
      'cookie-refresh-token',
      null,
      '127.0.0.1',
      'vitest',
    );
    expect(cookie).toHaveBeenCalled();
  });

  it('throws Unauthorized when neither body nor cookie provides a refresh token', async () => {
    const authService = { refreshToken: jest.fn() };
    const controller = new AuthController(
      authService as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );

    const req = {
      ip: '127.0.0.1',
      headers: { 'user-agent': 'vitest' },
      cookies: {},
      get: () => 'localhost',
    } as any;

    await expect(controller.refreshToken(req, {} as any, {})).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(authService.refreshToken).not.toHaveBeenCalled();
  });
});
