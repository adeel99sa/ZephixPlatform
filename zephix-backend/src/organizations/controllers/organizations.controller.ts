import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { OrganizationsService } from '../services/organizations.service';
import { AuditService } from '../../shared/services/audit.service';
import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
  InviteUserDto,
} from '../dto';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { AdminGuard } from '../../shared/guards/admin.guard';
import { OrganizationGuard } from '../guards/organization.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { CurrentOrg } from '../decorators/current-org.decorator';
import { AuthRequest } from '../../common/http/auth-request';
import { getAuthContext } from '../../common/http/get-auth-context';

@ApiTags('Organizations')
@ApiBearerAuth()
@Controller('organizations')
@UseGuards(JwtAuthGuard)
export class OrganizationsController {
  constructor(
    private readonly organizationsService: OrganizationsService,
    private readonly auditService: AuditService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new organization' })
  @ApiResponse({
    status: 201,
    description: 'Organization created successfully',
  })
  async create(
    @Body() createOrganizationDto: CreateOrganizationDto,
    @Request() req: AuthRequest,
  ) {
    const { userId } = getAuthContext(req);
    return this.organizationsService.create(createOrganizationDto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all organizations for the current user' })
  @ApiResponse({
    status: 200,
    description: 'User organizations retrieved successfully',
  })
  async findAll(@Request() req: AuthRequest) {
    const { userId } = getAuthContext(req);
    return this.organizationsService.findByUser(userId);
  }

  @Get(':id')
  @UseGuards(OrganizationGuard)
  @ApiOperation({ summary: 'Get organization details' })
  @ApiResponse({
    status: 200,
    description: 'Organization details retrieved successfully',
  })
  async findOne(@Param('id') id: string) {
    return this.organizationsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(OrganizationGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Update organization' })
  @ApiResponse({
    status: 200,
    description: 'Organization updated successfully',
  })
  async update(
    @Param('id') id: string,
    @Body() updateOrganizationDto: UpdateOrganizationDto,
    @Request() req: AuthRequest,
  ) {
    const { userId } = getAuthContext(req);
    return this.organizationsService.update(id, updateOrganizationDto, userId);
  }

  @Post(':id/invite')
  @UseGuards(OrganizationGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Invite user to organization' })
  @ApiResponse({ status: 201, description: 'User invited successfully' })
  async inviteUser(
    @Param('id') id: string,
    @Body() inviteUserDto: InviteUserDto,
    @Request() req: AuthRequest,
  ) {
    const { userId } = getAuthContext(req);
    return this.organizationsService.inviteUser(id, inviteUserDto, userId);
  }

  @Delete(':organizationId/users/:userId')
  @UseGuards(OrganizationGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Remove user from organization' })
  @ApiResponse({ status: 200, description: 'User removed successfully' })
  async removeUser(
    @Param('organizationId') organizationId: string,
    @Param('userId') userId: string,
    @Request() req: AuthRequest,
  ) {
    const { userId: actorUserId } = getAuthContext(req);
    await this.organizationsService.removeUser(
      organizationId,
      userId,
      actorUserId,
    );
    return { message: 'User removed successfully' };
  }

  @Patch(':organizationId/users/:userId/role')
  @UseGuards(OrganizationGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Update user role in organization' })
  @ApiResponse({ status: 200, description: 'User role updated successfully' })
  async updateUserRole(
    @Param('organizationId') organizationId: string,
    @Param('userId') userId: string,
    @Body() body: { role: 'admin' | 'pm' | 'viewer' },
    @Request() req: AuthRequest,
  ) {
    const { userId: actorUserId } = getAuthContext(req);
    await this.organizationsService.updateUserRole(
      organizationId,
      userId,
      body.role,
      actorUserId,
    );
    return { message: 'User role updated successfully' };
  }

  @Post(':id/switch')
  @ApiOperation({ summary: 'Switch to a different organization' })
  @ApiResponse({
    status: 200,
    description: 'Organization switched successfully',
  })
  async switchOrganization(
    @Param('id') id: string,
    @Request() req: AuthRequest,
  ) {
    const { userId } = getAuthContext(req);
    return this.organizationsService.switchOrganization(userId, id);
  }

  @Get('admin/users')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ summary: 'Get all users for admin management' })
  @ApiResponse({
    status: 200,
    description: 'Users retrieved successfully for admin',
  })
  async getAdminUsers(@Request() req: AuthRequest) {
    // Log admin action
    const { userId } = getAuthContext(req);
    await this.auditService.logAction('admin.users.list', {
      userId,
      action: 'admin.users.list',
      timestamp: new Date(),
    });

    return this.organizationsService.findAllUsers();
  }

  @Get('users')
  @ApiOperation({
    summary: 'Get organization users for workspace member selection',
  })
  @ApiResponse({
    status: 200,
    description: 'Organization users retrieved successfully',
  })
  async getOrgUsers(
    @Request() req: AuthRequest,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('search') search?: string,
  ) {
    // Allow admin or workspace owner to list org users
    const { organizationId } = getAuthContext(req);
    return this.organizationsService.getOrganizationUsers(organizationId, {
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
      search,
    });
  }

  // Onboarding endpoints
  @Get('onboarding/status')
  @ApiOperation({ summary: 'Get onboarding status for current user' })
  @ApiResponse({
    status: 200,
    description: 'Onboarding status retrieved successfully',
  })
  async getOnboardingStatus(@Request() req: AuthRequest) {
    const { organizationId, userId } = getAuthContext(req);
    
    // Handle users without organization - return onboarding required state
    if (!organizationId) {
      return {
        hasOrganization: false,
        hasWorkspace: false,
        next: 'CREATE_ORG',
        completed: false,
        currentStep: 'create_organization',
        completedSteps: [],
      };
    }
    
    // User has organization - check onboarding status and workspaces
    let status;
    try {
      status = await this.organizationsService.getOnboardingStatus(organizationId);
    } catch (error) {
      // Organization not found or error - treat as no org
      return {
        hasOrganization: false,
        hasWorkspace: false,
        next: 'CREATE_ORG',
        completed: false,
        currentStep: 'create_organization',
        completedSteps: [],
      };
    }
    
    // Check if user has any workspaces in this organization
    // Query workspace_members directly to avoid tenant context requirements
    const hasWorkspace = await this.organizationsService.userHasWorkspacesInOrg(
      userId,
      organizationId,
    );
    
    return {
      hasOrganization: true,
      hasWorkspace,
      next: hasWorkspace ? 'SELECT_WORKSPACE' : 'CREATE_WORKSPACE',
      completed: status.completed,
      currentStep: status.currentStep,
      completedSteps: status.completedSteps,
    };
  }

  @Get('onboarding/progress')
  @ApiOperation({ summary: 'Get onboarding progress' })
  @ApiResponse({
    status: 200,
    description: 'Onboarding progress retrieved successfully',
  })
  async getOnboardingProgress(@Request() req: AuthRequest) {
    const { organizationId } = getAuthContext(req);
    return this.organizationsService.getOnboardingProgress(organizationId);
  }

  @Post('onboarding/complete-step')
  @ApiOperation({ summary: 'Mark an onboarding step as complete' })
  @ApiResponse({
    status: 200,
    description: 'Step marked as complete',
  })
  async completeStep(
    @Body() body: { step: string },
    @Request() req: AuthRequest,
  ) {
    const { organizationId } = getAuthContext(req);
    return this.organizationsService.completeOnboardingStep(
      organizationId,
      body.step,
    );
  }

  @Post('onboarding/complete')
  @ApiOperation({ summary: 'Mark onboarding as complete' })
  @ApiResponse({
    status: 200,
    description: 'Onboarding completed successfully',
  })
  async completeOnboarding(@Request() req: AuthRequest) {
    const { organizationId } = getAuthContext(req);
    return this.organizationsService.completeOnboarding(organizationId);
  }

  @Post('onboarding/skip')
  @ApiOperation({ summary: 'Skip onboarding' })
  @ApiResponse({
    status: 200,
    description: 'Onboarding skipped successfully',
  })
  async skipOnboarding(@Request() req: AuthRequest) {
    const { organizationId } = getAuthContext(req);
    return this.organizationsService.skipOnboarding(organizationId);
  }
}
