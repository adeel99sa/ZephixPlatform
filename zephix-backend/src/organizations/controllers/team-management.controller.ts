import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { OrganizationGuard } from '../guards/organization.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { CurrentOrganization } from '../decorators/current-organization.decorator';
import { User } from '../../users/entities/user.entity';
import { InvitationService } from '../services/invitation.service';
import { TeamManagementService } from '../services/team-management.service';
import {
  InviteTeamMemberDto,
  UpdateMemberRoleDto,
  TeamMemberResponseDto,
  InvitationResponseDto,
} from '../dto';

@ApiTags('Team Management')
@Controller('organizations/:organizationId/team')
@UseGuards(JwtAuthGuard, OrganizationGuard)
@ApiBearerAuth()
export class TeamManagementController {
  constructor(
    private readonly invitationService: InvitationService,
    private readonly teamManagementService: TeamManagementService,
  ) {}

  @Get('members')
  @ApiOperation({ summary: 'Get team members' })
  @ApiResponse({
    status: 200,
    description: 'Team members retrieved successfully',
    type: [TeamMemberResponseDto],
  })
  async getTeamMembers(
    @CurrentOrganization() organizationId: string,
    @CurrentUser() user: User,
  ): Promise<TeamMemberResponseDto[]> {
    return this.teamManagementService.getTeamMembers(organizationId, user.id);
  }

  @Post('invite')
  @ApiOperation({ summary: 'Invite a team member' })
  @ApiResponse({
    status: 201,
    description: 'Team member invited successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        invitation: { $ref: '#/components/schemas/InvitationResponseDto' },
      },
    },
  })
  @HttpCode(HttpStatus.CREATED)
  async inviteTeamMember(
    @CurrentOrganization() organizationId: string,
    @CurrentUser() user: User,
    @Body() inviteDto: InviteTeamMemberDto,
  ): Promise<{ success: boolean; invitation: InvitationResponseDto }> {
    return this.invitationService.inviteTeamMember(
      organizationId,
      inviteDto,
      user.id,
    );
  }

  @Get('invitations')
  @ApiOperation({ summary: 'Get pending invitations' })
  @ApiResponse({
    status: 200,
    description: 'Invitations retrieved successfully',
    type: [InvitationResponseDto],
  })
  async getInvitations(
    @CurrentOrganization() organizationId: string,
    @CurrentUser() user: User,
  ): Promise<InvitationResponseDto[]> {
    return this.invitationService.getOrganizationInvitations(
      organizationId,
      user.id,
    );
  }

  @Post('invitations/:invitationId/resend')
  @ApiOperation({ summary: 'Resend an invitation' })
  @ApiResponse({
    status: 200,
    description: 'Invitation resent successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
      },
    },
  })
  async resendInvitation(
    @Param('invitationId') invitationId: string,
    @CurrentUser() user: User,
  ): Promise<{ success: boolean }> {
    return this.invitationService.resendInvitation(invitationId, user.id);
  }

  @Delete('invitations/:invitationId')
  @ApiOperation({ summary: 'Cancel an invitation' })
  @ApiResponse({
    status: 200,
    description: 'Invitation cancelled successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
      },
    },
  })
  async cancelInvitation(
    @Param('invitationId') invitationId: string,
    @CurrentUser() user: User,
  ): Promise<{ success: boolean }> {
    return this.invitationService.cancelInvitation(invitationId, user.id);
  }

  @Put('members/:memberId/role')
  @ApiOperation({ summary: 'Update team member role' })
  @ApiResponse({
    status: 200,
    description: 'Member role updated successfully',
    type: TeamMemberResponseDto,
  })
  async updateMemberRole(
    @CurrentOrganization() organizationId: string,
    @Param('memberId') memberId: string,
    @CurrentUser() user: User,
    @Body() updateRoleDto: UpdateMemberRoleDto,
  ): Promise<TeamMemberResponseDto> {
    return this.teamManagementService.updateMemberRole(
      organizationId,
      memberId,
      updateRoleDto,
      user.id,
    );
  }

  @Delete('members/:memberId')
  @ApiOperation({ summary: 'Remove team member' })
  @ApiResponse({
    status: 200,
    description: 'Team member removed successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
      },
    },
  })
  async removeMember(
    @CurrentOrganization() organizationId: string,
    @Param('memberId') memberId: string,
    @CurrentUser() user: User,
  ): Promise<{ success: boolean }> {
    return this.teamManagementService.removeMember(
      organizationId,
      memberId,
      user.id,
    );
  }

  @Post('leave')
  @ApiOperation({ summary: 'Leave organization' })
  @ApiResponse({
    status: 200,
    description: 'Left organization successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
      },
    },
  })
  async leaveOrganization(
    @CurrentOrganization() organizationId: string,
    @CurrentUser() user: User,
  ): Promise<{ success: boolean }> {
    return this.teamManagementService.leaveOrganization(
      organizationId,
      user.id,
    );
  }

  @Post('transfer-ownership/:newOwnerUserId')
  @ApiOperation({ summary: 'Transfer organization ownership' })
  @ApiResponse({
    status: 200,
    description: 'Ownership transferred successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
      },
    },
  })
  async transferOwnership(
    @CurrentOrganization() organizationId: string,
    @Param('newOwnerUserId') newOwnerUserId: string,
    @CurrentUser() user: User,
  ): Promise<{ success: boolean }> {
    return this.teamManagementService.transferOwnership(
      organizationId,
      newOwnerUserId,
      user.id,
    );
  }
}
