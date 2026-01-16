/**
 * PHASE 7 MODULE 7.2: My Work Controller
 * Primary endpoint: GET /api/my-work
 */
import {
  Controller,
  Get,
  UseGuards,
  ForbiddenException,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { MyWorkService } from './services/my-work.service';
import {
  normalizePlatformRole,
  PlatformRole,
} from '../../shared/enums/platform-roles.enum';
import { AuthRequest } from '../../common/http/auth-request';
import { getAuthContext } from '../../common/http/get-auth-context';

type UserJwt = {
  id: string;
  organizationId: string;
  role: 'admin' | 'member' | 'guest';
};

@Controller('my-work')
@UseGuards(JwtAuthGuard)
export class MyWorkController {
  constructor(private readonly myWorkService: MyWorkService) {}

  @Get()
  async getMyWork(@CurrentUser() user: UserJwt, @Req() req: AuthRequest) {
    const { platformRole } = getAuthContext(req);

    // PHASE 7 MODULE 7.2: Block Guest (VIEWER)
    const userRole = normalizePlatformRole(platformRole);
    if (userRole === PlatformRole.VIEWER) {
      throw new ForbiddenException('Forbidden');
    }

    return this.myWorkService.getMyWork(user.id, platformRole);
  }
}
