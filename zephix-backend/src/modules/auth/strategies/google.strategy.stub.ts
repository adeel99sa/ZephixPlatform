import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-google-oauth20';

/**
 * Registered when GOOGLE_* env is missing so Passport has a named `google` strategy.
 * {@link GoogleOAuthEnabledGuard} returns 503 before this runs on normal requests.
 */
@Injectable()
export class GoogleOAuthDisabledStrategy extends PassportStrategy(Strategy, 'google') {
  constructor() {
    super({
      clientID: 'unconfigured',
      clientSecret: 'unconfigured',
      callbackURL: 'http://127.0.0.1/api/auth/google/callback',
      scope: ['email', 'profile'],
    });
  }

  authenticate(): void {
    const strat = this as unknown as { fail: (c: unknown, code?: number) => void };
    strat.fail(
      {
        code: 'GOOGLE_OAUTH_NOT_CONFIGURED',
        message: 'Google OAuth is not configured on this server.',
      },
      503,
    );
  }

  async validate(): Promise<never> {
    throw new Error('GoogleOAuthDisabledStrategy.validate must not run');
  }
}
