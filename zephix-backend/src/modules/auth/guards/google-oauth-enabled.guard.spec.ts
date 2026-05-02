import { HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleOAuthEnabledGuard } from './google-oauth-enabled.guard';

describe('GoogleOAuthEnabledGuard', () => {
  it('throws 503 when Google client id is missing', () => {
    const configService = {
      get: jest.fn((key: string) => {
        if (key === 'google.clientId') return '';
        if (key === 'google.clientSecret') return 'secret';
        return '';
      }),
    } as unknown as ConfigService;
    const guard = new GoogleOAuthEnabledGuard(configService);
    let err: unknown;
    try {
      guard.canActivate({} as never);
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(HttpException);
    expect((err as HttpException).getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
  });

  it('allows when client id and secret are set', () => {
    const configService = {
      get: jest.fn((key: string) => {
        if (key === 'google.clientId') return 'id.apps.googleusercontent.com';
        if (key === 'google.clientSecret') return 'secret';
        return '';
      }),
    } as unknown as ConfigService;
    const guard = new GoogleOAuthEnabledGuard(configService);
    expect(guard.canActivate({} as never)).toBe(true);
  });
});
