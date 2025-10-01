import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationValidationGuard } from '../../guards/organization-validation.guard';
import { UsersService } from '../users/users.service';
import { ProjectsService } from '../projects/services/projects.service';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { InvitationService } from './services/invitation.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { InviteUserDto } from './dto/invite-user.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, OrganizationValidationGuard)
export class AdminController {
  constructor(
    private usersService: UsersService,
    private projectsService: ProjectsService,
    private workspacesService: WorkspacesService,
    private invitationService: InvitationService,
  ) {}

  @Get('users/count')
  async getUserCount(@Query('organizationId') organizationId: string) {
    const count = await this.usersService.countByOrganization(organizationId);
    return { count };
  }

  @Get('invitations/count')
  async getPendingInvitationsCount(@Query('organizationId') organizationId: string) {
    const count = await this.invitationService.getPendingCount(organizationId);
    return { count };
  }

  @Get('projects/count')
  async getProjectCount(@Query('organizationId') organizationId: string) {
    const count = await this.projectsService.countByOrganization(organizationId);
    return { count };
  }

  @Get('workspaces/count')
  async getWorkspaceCount(@Query('organizationId') organizationId: string) {
    const count = await this.workspacesService.countByOrganization(organizationId);
    return { count };
  }

  @Get('users')
  async getUsers(@Query('organizationId') organizationId: string) {
    const users = await this.usersService.findByOrganization(organizationId);
    return users.map(user => ({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      organizationRole: user.organizationRole || 'member',
      createdAt: user.createdAt,
      lastActive: user.updatedAt
    }));
  }

  @Post('users/invite')
  async inviteUser(@Body() inviteDto: InviteUserDto, @CurrentUser() user: any) {
    try {
      const invitation = await this.invitationService.createInvitation(
        inviteDto.email,
        inviteDto.role,
        inviteDto.organizationId,
        user.id
      );

      // TODO: Send actual email invitation
      console.log(`Invitation created for ${inviteDto.email} with token: ${invitation.token}`);

      return { 
        success: true, 
        message: 'Invitation sent successfully',
        data: {
          id: invitation.id,
          email: invitation.email,
          role: invitation.role,
          expiresAt: invitation.expiresAt
        }
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Post('users/:id/role')
  async updateUserRole(@Param('id') userId: string, @Body() roleDto: { role: string }) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    await this.usersService.update(userId, { organizationRole: roleDto.role as 'admin' | 'member' | 'viewer' });
    return { success: true, message: 'User role updated successfully' };
  }

  @Delete('users/:id')
  async deleteUser(@Param('id') userId: string, @Query('organizationId') organizationId: string, @CurrentUser() currentUser: any) {
    // Prevent deleting self
    if (userId === currentUser.id) {
      throw new BadRequestException('Cannot delete your own account');
    }

    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Check if deleting last admin
    if (user.organizationRole === 'admin') {
      const adminCount = await this.usersService.countAdmins(organizationId);
      if (adminCount <= 1) {
        throw new BadRequestException('Cannot delete the last admin user');
      }
    }

    const success = await this.usersService.delete(userId);
    if (!success) {
      throw new BadRequestException('Failed to delete user');
    }
    
    return { success: true, message: 'User deleted successfully' };
  }

  @Get('organizations/:id/activity')
  async getRecentActivity(@Param('id') orgId: string, @Query('limit') limit = 10) {
    // Mock activity data for now
    return [
      {
        id: '1',
        type: 'user',
        description: 'New user joined the organization',
        timestamp: new Date(),
        user: 'System'
      },
      {
        id: '2',
        type: 'project',
        description: 'Project "Website Redesign" was created',
        timestamp: new Date(Date.now() - 3600000),
        user: 'John Doe'
      }
    ];
  }
}
