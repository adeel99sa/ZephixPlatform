import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor() {
    super();
    console.log('🔐 [JwtAuthGuard LOADED] (path:', __filename, ')');
  }

  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    console.log('🔐 [JwtAuthGuard HIT]:', req.method, req.url, 'auth header:', !!req.headers?.authorization);
    return super.canActivate(context);
  }
}
