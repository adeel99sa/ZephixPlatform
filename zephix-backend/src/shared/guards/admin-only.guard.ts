import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

@Injectable()
export class AdminOnlyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const role = req?.user?.role || req?.user?.platformRole;
    if (String(role).toUpperCase() !== 'ADMIN') {
      throw new ForbiddenException('Forbidden');
    }
    return true;
  }
}
