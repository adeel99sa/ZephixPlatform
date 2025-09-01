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
import { AdminGuard } from '../../modules/auth/guards/admin.guard';
import { OrganizationGuard } from '../guards/organization.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { CurrentOrg } from '../decorators/current-org.decorator';

@ApiTags('Organizations')
@ApiBearerAuth()
@Controller('organizations')
@UseGuards(JwtAuthGuard)
export class OrganizationsController {
  constructor(
    private readonly organizationsService: OrganizationsService,
    private readonly auditService: AuditService
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new organization' })
  @ApiResponse({
    status: 201,
    description: 'Organization created successfully',
  })
  async create(
    @Body() createOrganizationDto: CreateOrganizationDto,
    @Request() req,
  ) {
    return this.organizationsService.create(createOrganizationDto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all organizations for the current user' })
  @ApiResponse({
    status: 200,
    description: 'User organizations retrieved successfully',
  })
  async findAll(@Request() req) {
    return this.organizationsService.findByUser(req.user.id);
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
    @Request() req,
  ) {
    return this.organizationsService.update(
      id,
      updateOrganizationDto,
      req.user.id,
    );
  }

  @Post(':id/invite')
  @UseGuards(OrganizationGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Invite user to organization' })
  @ApiResponse({ status: 201, description: 'User invited successfully' })
  async inviteUser(
    @Param('id') id: string,
    @Body() inviteUserDto: InviteUserDto,
    @Request() req,
  ) {
    return this.organizationsService.inviteUser(id, inviteUserDto, req.user.id);
  }

  @Delete(':organizationId/users/:userId')
  @UseGuards(OrganizationGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Remove user from organization' })
  @ApiResponse({ status: 200, description: 'User removed successfully' })
  async removeUser(
    @Param('organizationId') organizationId: string,
    @Param('userId') userId: string,
    @Request() req,
  ) {
    await this.organizationsService.removeUser(
      organizationId,
      userId,
      req.user.id,
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
    @Request() req,
  ) {
    await this.organizationsService.updateUserRole(
      organizationId,
      userId,
      body.role,
      req.user.id,
    );
    return { message: 'User role updated successfully' };
  }

  @Post(':id/switch')
  @ApiOperation({ summary: 'Switch to a different organization' })
  @ApiResponse({
    status: 200,
    description: 'Organization switched successfully',
  })
  async switchOrganization(@Param('id') id: string, @Request() req) {
    return this.organizationsService.switchOrganization(req.user.id, id);
  }

  @Get('admin/users')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ summary: 'Get all users for admin management' })
  @ApiResponse({
    status: 200,
    description: 'Users retrieved successfully for admin',
  })
  async getAdminUsers(@Request() req) {
    // Log admin action
    await this.auditService.logAction('admin.users.list', {
      userId: req.user.id,
      action: 'admin.users.list',
      timestamp: new Date()
    });
    
    return this.organizationsService.findAllUsers();
  }
}
