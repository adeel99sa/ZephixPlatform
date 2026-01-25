import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Request,
} from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RequireOrgRoleGuard } from '../../workspaces/guards/require-org-role.guard';
import { RequireOrgRole } from '../../workspaces/guards/require-org-role.guard';
import { PlatformRole } from '../../../shared/enums/platform-roles.enum';
import { normalizePlatformRole } from '../../../shared/enums/platform-roles.enum';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { formatResponse } from '../../../shared/helpers/response.helper';
import {
  OrgInvitesService,
  InviteContext,
} from '../services/org-invites.service';
import { AuthService } from '../../auth/auth.service';
import { CreateOrgInviteDto } from '../dto/create-org-invite.dto';
import { ValidateOrgInviteDto } from '../dto/validate-org-invite.dto';
import { AcceptOrgInviteDto } from '../dto/accept-org-invite.dto';

@ApiTags('org-invites')
@Controller('org-invites')
export class OrgInvitesController {
  constructor(
    private readonly orgInvitesService: OrgInvitesService,
    private readonly authService: AuthService,
  ) {}

  /**
   * POST /api/org-invites
   * Create an organization invite (admin only)
   */
  @Post()
  @UseGuards(JwtAuthGuard, RequireOrgRoleGuard)
  @RequireOrgRole(PlatformRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create organization invite' })
  @ApiResponse({
    status: 200,
    description: 'Invite created successfully',
  })
  @ApiResponse({ status: 403, description: 'Forbidden - admin only' })
  @ApiResponse({
    status: 409,
    description: 'Conflict - user exists or active invite exists',
  })
  async createInvite(
    @CurrentUser() user: any,
    @Body() dto: CreateOrgInviteDto,
  ) {
    // Build context from user object
    const rawRole = user.platformRole ?? user.role ?? '';
    const platformRole = ['ADMIN', 'MEMBER', 'VIEWER'].includes(rawRole)
      ? rawRole
      : normalizePlatformRole(rawRole);

    const ctx: InviteContext = {
      organizationId: user.organizationId,
      userId: user.id,
      platformRole,
    };

    const result = await this.orgInvitesService.createInvite(ctx, dto);

    return formatResponse(result);
  }

  /**
   * GET /api/org-invites/validate
   * Validate an invite token (public endpoint)
   */
  @Get('validate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validate invite token' })
  @ApiResponse({
    status: 200,
    description: 'Invite token is valid',
  })
  @ApiResponse({ status: 404, description: 'Invite not found or invalid' })
  async validateInvite(@Query() dto: ValidateOrgInviteDto) {
    const result = await this.orgInvitesService.validateInviteToken(dto);
    return formatResponse(result);
  }

  /**
   * POST /api/org-invites/accept
   * Accept an invite and create user account (public endpoint)
   */
  @Post('accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept invite and create account' })
  @ApiResponse({
    status: 200,
    description: 'Invite accepted and user created',
  })
  @ApiResponse({ status: 404, description: 'Invite not found or invalid' })
  @ApiResponse({ status: 409, description: 'Conflict - user already exists' })
  async acceptInvite(
    @Body() dto: AcceptOrgInviteDto,
    @Request() req: ExpressRequest,
  ) {
    // Extract request metadata for audit
    const userAgent =
      typeof req.headers['user-agent'] === 'string'
        ? req.headers['user-agent']
        : null;

    // Handle x-forwarded-for (can be string or string[])
    const xff = req.headers['x-forwarded-for'];
    const xffStr = Array.isArray(xff) ? xff[0] : xff;
    const ipAddress =
      typeof xffStr === 'string' && xffStr.length > 0
        ? xffStr.split(',')[0].trim()
        : req.ip || null;

    // Accept invite and create user (returns userId and organizationId)
    const acceptResult = await this.orgInvitesService.acceptInvite(dto);

    // Issue login tokens using existing AuthService (reuses login logic)
    const authPayload = await this.authService.issueLoginForUser(
      acceptResult.userId,
      acceptResult.organizationId,
      {
        userAgent,
        ipAddress,
      },
    );

    return formatResponse(authPayload);
  }
}
