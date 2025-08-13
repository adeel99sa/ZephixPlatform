import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Optional,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from "../../modules/users/entities/user.entity"
import { InvitationService } from '../services/invitation.service';
import { Organization } from '../entities/organization.entity';

@ApiTags('Invitation Acceptance')
@Controller('invitations')
export class InvitationAcceptanceController {
  constructor(private readonly invitationService: InvitationService) {}

  @Get(':token')
  @ApiOperation({ summary: 'Get invitation details by token' })
  @ApiResponse({
    status: 200,
    description: 'Invitation details retrieved',
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string' },
        role: { type: 'string', enum: ['admin', 'pm', 'viewer'] },
        organization: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            slug: { type: 'string' },
            description: { type: 'string' },
          },
        },
        invitedBy: {
          type: 'object',
          properties: {
            firstName: { type: 'string' },
            lastName: { type: 'string' },
          },
        },
        expiresAt: { type: 'string', format: 'date-time' },
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Invitation not found' })
  async getInvitationDetails(@Param('token') token: string) {
    const invitation = await this.invitationService.getInvitationByToken(token);

    if (!invitation) {
      return { error: 'Invitation not found' };
    }

    if (!invitation.canBeAccepted()) {
      return {
        error: 'Invitation has expired or is no longer valid',
        expired: true,
      };
    }

    return {
      email: invitation.email,
      role: invitation.role,
      organization: {
        id: invitation.organization.id,
        name: invitation.organization.name,
        slug: invitation.organization.slug,
        description: invitation.organization.description,
      },
      invitedBy: invitation.invitedBy
        ? {
            firstName: invitation.invitedBy.firstName,
            lastName: invitation.invitedBy.lastName,
          }
        : null,
      expiresAt: invitation.expiresAt,
      message: invitation.message,
    };
  }

  @Post(':token/accept')
  @ApiOperation({ summary: 'Accept invitation' })
  @ApiResponse({
    status: 200,
    description: 'Invitation accepted successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        organization: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            slug: { type: 'string' },
          },
        },
        requiresSignup: { type: 'boolean' },
      },
    },
  })
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async acceptInvitation(
    @Param('token') token: string,
    @CurrentUser() @Optional() user?: User,
  ): Promise<{
    success: boolean;
    organization: Organization;
    requiresSignup: boolean;
  }> {
    return this.invitationService.acceptInvitation(token, user?.id);
  }

  @Post(':token/accept-anonymous')
  @ApiOperation({
    summary: 'Check invitation for anonymous user',
    description: 'Returns invitation details and whether signup is required',
  })
  @ApiResponse({
    status: 200,
    description: 'Invitation check completed',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        organization: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            slug: { type: 'string' },
          },
        },
        requiresSignup: { type: 'boolean' },
      },
    },
  })
  @HttpCode(HttpStatus.OK)
  async checkInvitationAnonymous(@Param('token') token: string): Promise<{
    success: boolean;
    organization: Organization;
    requiresSignup: boolean;
  }> {
    return this.invitationService.acceptInvitation(token);
  }
}
