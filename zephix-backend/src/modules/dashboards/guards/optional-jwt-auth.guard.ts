import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

/**
 * Optional JWT Auth Guard
 * Allows requests to proceed if:
 * 1. JWT token is present and valid, OR
 * 2. Share token is present in query params (for dashboard sharing)
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();

    // If share token is present, allow request without JWT
    if (request.query?.share) {
      return true;
    }

    // Otherwise, require JWT authentication
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();

    // If share token is present, don't require user
    if (request.query?.share) {
      return null; // No user required for share token access
    }

    // Otherwise, require valid JWT user
    if (err || !user) {
      throw err || new Error('Authentication required');
    }
    return user;
  }
}
