import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Returns 503 when Google OAuth env is incomplete. Runs before Passport Google guard.
 */
@Injectable()
export class GoogleOAuthEnabledGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(_context: ExecutionContext): boolean {
    const clientId = this.configService.get<string>('google.clientId')?.trim();
    const clientSecret = this.configService
      .get<string>('google.clientSecret')
      ?.trim();
    if (!clientId || !clientSecret) {
      throw new HttpException(
        {
          code: 'GOOGLE_OAUTH_NOT_CONFIGURED',
          message: 'Google OAuth is not configured on this server.',
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    return true;
  }
}
