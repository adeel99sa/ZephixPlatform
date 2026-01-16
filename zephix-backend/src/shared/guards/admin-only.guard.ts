import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import {
  normalizePlatformRole,
  PlatformRole,
} from '../enums/platform-roles.enum';

@Injectable()
export class AdminOnlyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const rawRole = req?.user?.platformRole || req?.user?.role;
    const role = normalizePlatformRole(rawRole);
    if (role !== PlatformRole.ADMIN) {
      throw new ForbiddenException('Forbidden');
    }
    return true;
  }
}
