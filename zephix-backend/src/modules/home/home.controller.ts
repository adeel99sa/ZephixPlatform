import {
  Controller,
  Get,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AdminHomeService } from './services/admin-home.service';
import { MemberHomeService } from './services/member-home.service';
import { GuestHomeService } from './services/guest-home.service';
import { formatResponse } from '../../shared/helpers/response.helper';
import {
  PlatformRole,
  normalizePlatformRole,
} from '../../shared/enums/platform-roles.enum';

@ApiTags('home')
@Controller('home')
@UseGuards(JwtAuthGuard)
export class HomeController {
  constructor(
    private readonly adminHomeService: AdminHomeService,
    private readonly memberHomeService: MemberHomeService,
    private readonly guestHomeService: GuestHomeService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get role-scoped home data' })
  @ApiResponse({ status: 200, description: 'Home data based on user role' })
  async getHome(@CurrentUser() user: any) {
    // Fix 1: Use platformRole first (source of truth), fallback to role only if missing
    const userRole = normalizePlatformRole(user.platformRole || user.role);
    const userId = user.id;
    const organizationId = user.organizationId;

    if (!userId || !organizationId) {
      // Fix 3: Use BadRequestException instead of Error to avoid 500 and stack traces
      throw new BadRequestException('Missing user ID or organization ID');
    }

    // Return role-scoped payload
    if (userRole === PlatformRole.ADMIN) {
      const data = await this.adminHomeService.getAdminHomeData(
        userId,
        organizationId,
      );
      return formatResponse(data);
    } else if (userRole === PlatformRole.MEMBER) {
      const data = await this.memberHomeService.getMemberHomeData(
        userId,
        organizationId,
      );
      return formatResponse(data);
    } else {
      // VIEWER (Guest)
      const data = await this.guestHomeService.getGuestHomeData(
        userId,
        organizationId,
      );
      return formatResponse(data);
    }
  }
}
