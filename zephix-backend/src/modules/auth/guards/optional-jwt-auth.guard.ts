import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = any>(
    err: any,
    user: any,
    info: any,
    _context: any,
    _status?: any,
  ): TUser {
    if (user) {
      return user as TUser;
    }

    const infoMessage =
      typeof info === 'string'
        ? info
        : typeof (info as { message?: unknown })?.message === 'string'
          ? ((info as { message?: string }).message as string)
          : '';

    if (!err && /no auth token/i.test(infoMessage)) {
      return null as TUser;
    }

    // passport-jwt passes JsonWebTokenError / TokenExpiredError as `err`.
    // Re-throwing those breaks Nest's HTTP layer (500). Treat as unauthenticated.
    if (err) {
      const msg =
        err instanceof Error ? err.message : String(err);
      throw new UnauthorizedException(
        msg || 'Invalid or expired session token',
      );
    }

    throw new UnauthorizedException(infoMessage || 'Unauthorized');
  }
}
