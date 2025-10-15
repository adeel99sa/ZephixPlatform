import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    if (process.env.ENABLE_AUTH_DEBUG === 'true') {
      const req = context.switchToHttp().getRequest();
      const h = req?.headers?.authorization;
      console.log('🔐[JwtAuthGuard] HIT', { method: req?.method, url: req?.url, hasAuth: Boolean(h) });
    }
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    if (process.env.ENABLE_AUTH_DEBUG === 'true') {
      console.log('🔐[JwtAuthGuard] handleRequest', {
        err: err ? String(err) : null,
        userPresent: Boolean(user),
        infoName: info?.name || null,
        infoMsg: info?.message || null,
      });
    }
    if (err || !user) {
      throw err || new UnauthorizedException(info?.message || 'Unauthorized');
    }
    return user;
  }
}
