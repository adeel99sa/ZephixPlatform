import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';

import { AuthService } from '../auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  private readonly logger = new Logger(GoogleStrategy.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    const clientID = configService.get<string>('google.clientId')!;
    const clientSecret = configService.get<string>('google.clientSecret')!;
    const callbackURL = configService.get<string>('google.callbackURL')!;
    const frontend =
      configService.get<string>('app.frontendUrl') || 'http://localhost:5173';
    const failureRedirect = `${frontend.replace(/\/$/, '')}/auth/callback?provider=google&error=oauth_failed`;

    super({
      clientID,
      clientSecret,
      callbackURL,
      scope: ['email', 'profile'],
      passReqToCallback: false,
      // No express-session: OAuth2 `state: true` requires req.session (passport-oauth2 NonceStore).
      failureRedirect,
    });
    this.logger.log('Google OAuth strategy active');
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
  ) {
    const email = profile.emails?.[0]?.value?.toLowerCase()?.trim();
    if (!email) {
      throw new UnauthorizedException('Google account has no email address');
    }

    const emailVerifiedFromGoogle =
      profile.emails?.[0]?.verified === true ||
      (profile as Profile & { _json?: { email_verified?: boolean } })._json
        ?.email_verified === true;

    const googleId = profile.id;
    if (!googleId) {
      throw new UnauthorizedException('Google profile missing subject (sub)');
    }

    const displayName = profile.displayName?.trim() || '';
    const givenName = profile.name?.givenName;
    const familyName = profile.name?.familyName;

    return this.authService.syncGoogleOAuthProfile({
      googleId,
      email,
      emailVerifiedFromGoogle,
      displayName,
      givenName,
      familyName,
    });
  }
}
