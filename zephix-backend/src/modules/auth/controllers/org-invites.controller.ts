import {
  Controller,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  SetMetadata,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RequireEmailVerifiedGuard } from '../guards/require-email-verified.guard';
import { RateLimiterGuard } from '../../../common/guards/rate-limiter.guard';
import { AuthRequest } from '../../../common/http/auth-request';
import { getAuthContext } from '../../../common/http/get-auth-context';
import { OrgInvitesService } from '../services/org-invites.service';
import {
  CreateInviteDto,
  CreateInviteResponseDto,
  AcceptInviteDto,
  AcceptInviteResponseDto,
} from '../dto/invite.dto';
import { PlatformRole } from '../../../shared/enums/platform-roles.enum';
import { normalizePlatformRole } from '../../../shared/enums/platform-roles.enum';

@ApiTags('org-invites')
@Controller('orgs')
@UseGuards(JwtAuthGuard)
export class OrgInvitesController {
  constructor(private readonly orgInvitesService: OrgInvitesService) {}

  /**
   * POST /api/orgs/:orgId/invites
   *
   * Create an organization invitation.
   * Only workspace_owner or Platform ADMIN can create invites.
   * Requires verified email (Option B gating).
   */
  @Post(':orgId/invites')
  @UseGuards(RequireEmailVerifiedGuard, RateLimiterGuard)
  @SetMetadata('rateLimit', { windowMs: 3600000, max: 10 })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create organization invitation' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiResponse({
    status: 200,
    description: 'Invitation created successfully',
    type: CreateInviteResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async createInvite(
    @Param('orgId') orgId: string,
    @Body() dto: CreateInviteDto,
    @Request() req: AuthRequest,
  ): Promise<CreateInviteResponseDto> {
    const { userId, platformRole } = getAuthContext(req);
    const normalizedPlatformRole = normalizePlatformRole(
      platformRole || 'viewer',
    );

    return this.orgInvitesService.createInvite(
      {
        orgId,
        email: dto.email,
        role: dto.role,
        createdBy: userId,
        message: dto.message,
      },
      normalizedPlatformRole,
    );
  }
}

@ApiTags('invites')
@Controller('invites')
export class InvitesController {
  constructor(private readonly orgInvitesService: OrgInvitesService) {}

  /**
   * POST /api/invites/accept
   *
   * Accept an organization invitation.
   * Requires authentication (user must be logged in).
   */
  @Post('accept')
  @UseGuards(JwtAuthGuard, RateLimiterGuard)
  @SetMetadata('rateLimit', { windowMs: 3600000, max: 5 })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept organization invitation' })
  @ApiResponse({
    status: 200,
    description: 'Invitation accepted successfully',
    type: AcceptInviteResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async acceptInvite(
    @Body() dto: AcceptInviteDto,
    @Request() req: AuthRequest,
  ): Promise<AcceptInviteResponseDto> {
    const { userId } = getAuthContext(req);

    const { orgId } = await this.orgInvitesService.acceptInvite({
      rawToken: dto.token,
      userId,
    });

    return {
      orgId,
      message: 'Invitation accepted successfully',
    };
  }
}
