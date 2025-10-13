import { ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthVerboseGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthVerboseGuard.name);

  canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest();
    this.logger.debug(`canActivate ${req.method} ${req.url} auth=${(req.headers?.authorization||'').slice(0,20)}`);
    return super.canActivate(ctx);
  }

  handleRequest(err: any, user: any, info: any, ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest();
    if (err || !user) {
      const why = err?.message || info?.message || info || 'unknown';
      this.logger.error(`401 at ${req.method} ${req.url} -> reason=${why}`);
      return super.handleRequest(err, user, info, ctx);
    }
    this.logger.debug(`OK user=${user?.id} org=${user?.organizationId}`);
    return user;
  }
}
