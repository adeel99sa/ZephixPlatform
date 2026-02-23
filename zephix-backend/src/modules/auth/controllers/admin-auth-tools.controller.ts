import {
  Body,
  Controller,
  ForbiddenException,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { OrganizationGuard } from '../../../organizations/guards/organization.guard';
import { RolesGuard } from '../../../organizations/guards/roles.guard';
import { Roles } from '../../../organizations/decorators/roles.decorator';
import { RateLimiterGuard } from '../../../common/guards/rate-limiter.guard';
import { RateLimit } from '../../../common/rate-limit/rate-limit-policy.decorator';
import { RateLimitPolicy } from '../../../common/rate-limit/rate-limit.constants';
import { normalizePlatformRole } from '../../../shared/enums/platform-roles.enum';
import { AdminMarkVerifiedDto } from '../dto/admin-mark-verified.dto';
import { AdminAuthToolsService } from '../services/admin-auth-tools.service';

@ApiTags('admin-auth-tools')
@Controller('admin/auth')
export class AdminAuthToolsController {
  constructor(private readonly adminAuthToolsService: AdminAuthToolsService) {}

  @Post('mark-verified')
  @UseGuards(JwtAuthGuard, OrganizationGuard, RolesGuard, RateLimiterGuard)
  @Roles('admin')
  @RateLimit(RateLimitPolicy.STAGING_ADMIN_MARK_VERIFIED)
  @ApiOperation({
    summary: 'Staging-only: mark user email as verified (admin only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Generic response (no account existence disclosure)',
  })
  async markVerified(
    @Body() dto: AdminMarkVerifiedDto,
    @Req() req: any,
  ): Promise<{ message: string }> {
    const zephixEnv = String(process.env.ZEPHIX_ENV || '').toLowerCase();
    const enabled = process.env.STAGING_ALLOW_MARK_VERIFIED === 'true';
    if (zephixEnv !== 'staging' || !enabled) {
      throw new ForbiddenException('Endpoint is not enabled in this environment');
    }

    const organizationId =
      req.organizationId || req.user?.defaultOrganizationId || req.user?.organizationId;
    if (!organizationId) {
      throw new ForbiddenException('Organization context required');
    }

    await this.adminAuthToolsService.markVerifiedByEmail(dto.email, {
      organizationId,
      actorUserId: String(req.user?.id || ''),
      actorPlatformRole: String(
        normalizePlatformRole(req.user?.platformRole || req.user?.role),
      ),
      ipAddress: req.ip || null,
      userAgent: req.headers?.['user-agent'] || null,
    });

    return {
      message:
        'If an eligible account exists in your organization, it has been marked verified.',
    };
  }
}
