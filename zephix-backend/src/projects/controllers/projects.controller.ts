import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  HttpException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { OrganizationGuard } from '../../organizations/guards/organization.guard';
import { ProjectsService } from '../services/projects.service';
import { CreateProjectDto } from '../dto/create-project.dto';
import { UpdateProjectDto } from '../dto/update-project.dto';
import { AddTeamMemberDto } from '../dto/add-team-member.dto';
import { UpdateTeamMemberDto } from '../dto/update-team-member.dto';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { CurrentOrg } from '../../organizations/decorators/current-org.decorator';
import { User } from '../../modules/users/entities/user.entity';
import { ProjectResponseDto } from '../dto/project-response.dto';
import { Project } from '../entities/project.entity';

/**
 * Projects Controller
 *
 * Handles all project-related HTTP requests including CRUD operations,
 * team management, and project permissions. All endpoints require
 * JWT authentication and proper authorization.
 *
 * @author Zephix Development Team
 * @version 1.0.0
 */
@ApiTags('Projects')
@Controller('projects')
@UseGuards(JwtAuthGuard, OrganizationGuard) // Use both JWT and Organization guards
@ApiBearerAuth()
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  /**
   * Create a new project
   *
   * Creates a new project for the authenticated user with proper
   * team structure and role assignments.
   *
   * @param createProjectDto - Project creation data
   * @param user - Authenticated user
   * @returns Created project with success message
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new project',
    description:
      'Creates a new project for the authenticated user with team structure',
  })
  @ApiBody({ type: CreateProjectDto })
  @ApiResponse({
    status: 201,
    description: 'Project created successfully',
    type: ProjectResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid project data provided',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Project name already exists in organization',
  })
  async create(
    @Body() createProjectDto: CreateProjectDto,
    @CurrentUser() user: User,
    @CurrentOrg() orgId: string,
  ): Promise<ProjectResponseDto> {
    // CRITICAL: Validate user exists
    if (!user?.id || !orgId) {
      console.error('❌ AUTH ERROR: Invalid user session', {
        user: user,
        hasId: !!user?.id,
        hasOrgId: !!orgId,
      });
      throw new UnauthorizedException(
        'Invalid user session - user or organization not found',
      );
    }

    const userId = user.id;

    console.log('✅ AUTH SUCCESS: User validated', { userId, orgId });

    try {
      return await this.projectsService.create(createProjectDto, userId, orgId);
    } catch (error) {
      // Log for debugging
      console.error('Project creation failed:', error);
      throw error;
    }
  }

  /**
   * Get all projects for the authenticated user
   *
   * Retrieves all projects where the user is a team member,
   * including project details and team information.
   *
   * @param user - Authenticated user
   * @returns Array of projects with metadata
   */
  @Get()
  @ApiOperation({
    summary: 'Get all projects for current user',
    description: 'Retrieves all projects where the user is a team member',
  })
  @ApiResponse({
    status: 200,
    description: 'Projects retrieved successfully',
    type: ProjectResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async findAll(
    @CurrentUser() user: User,
    @CurrentOrg() organizationId: string,
  ): Promise<Project[]> {
    try {
      return await this.projectsService.findAll(user, organizationId);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
      throw error;
    }
  }

  /**
   * Get project by ID
   *
   * Retrieves a specific project by its ID. The user must be
   * a team member of the project to access it.
   *
   * @param id - Project UUID
   * @param user - Authenticated user
   * @returns Project details
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get project by ID',
    description: 'Retrieves a specific project by its unique identifier',
  })
  @ApiParam({
    name: 'id',
    description: 'Project ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Project retrieved successfully',
    type: ProjectResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Project not found',
  })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() _user: User,
  ): Promise<Project> {
    try {
      return await this.projectsService.findOne(id);
    } catch (error) {
      console.error('Failed to fetch project:', error);
      throw error;
    }
  }

  /**
   * Update project
   *
   * Updates a specific project. The user must have admin or editor
   * permissions to modify the project.
   *
   * @param id - Project UUID
   * @param updateProjectDto - Project update data
   * @param user - Authenticated user
   * @returns Updated project details
   */
  @Patch(':id')
  @ApiOperation({
    summary: 'Update project',
    description: 'Updates an existing project with new data',
  })
  @ApiParam({
    name: 'id',
    description: 'Project ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({ type: UpdateProjectDto })
  @ApiResponse({
    status: 200,
    description: 'Project updated successfully',
    type: ProjectResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Project not found',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateProjectDto: UpdateProjectDto,
    @CurrentUser() user: User,
  ): Promise<Project> {
    try {
      return await this.projectsService.update(id, updateProjectDto, user);
    } catch (error) {
      console.error('Failed to update project:', error);
      throw error;
    }
  }

  /**
   * Delete project (Admin only)
   *
   * Deletes a project and all associated data. Only users with
   * admin permissions can delete projects.
   *
   * @param id - Project UUID
   * @param user - Authenticated user
   * @returns Success message
   */
  @Delete(':id')
  @ApiOperation({
    summary: 'Delete project (Admin only)',
    description: 'Permanently deletes a project and all associated data',
  })
  @ApiParam({
    name: 'id',
    description: 'Project ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Project deleted successfully',
    type: ProjectResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Project not found',
  })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    try {
      await this.projectsService.remove(id, user);
    } catch (error) {
      console.error('Failed to delete project:', error);
      throw error;
    }
  }

  // Team Management Endpoints

  /**
   * Add team member to project (Admin only)
   *
   * Adds a new team member to the project with specified role.
   * Only users with admin permissions can add team members.
   *
   * @param projectId - Project UUID
   * @param addTeamMemberDto - Team member data
   * @param user - Authenticated user
   * @returns Created team member
   */
  @Post(':id/team/members')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Add team member to project (Admin only)',
    description:
      'Adds a new team member to the project. Admin permissions required.',
  })
  @ApiParam({
    name: 'id',
    description: 'Project UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({ type: AddTeamMemberDto })
  @ApiResponse({
    status: 201,
    description: 'Team member added successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid team member data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin permissions required',
  })
  @ApiResponse({
    status: 404,
    description: 'Project or role not found',
  })
  @ApiResponse({
    status: 409,
    description: 'User is already a team member',
  })
  async addTeamMember(
    @Param('id', ParseUUIDPipe) projectId: string,
    @Body() addTeamMemberDto: AddTeamMemberDto,
    @CurrentUser() user: User,
  ) {
    try {
      const teamMember = await this.projectsService.addTeamMember(
        projectId,
        addTeamMemberDto,
        user,
      );
      return {
        message: 'Team member added successfully',
        teamMember,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to add team member',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Update team member role (Admin only)
   *
   * Updates the role of an existing team member.
   * Only users with admin permissions can update team member roles.
   *
   * @param projectId - Project UUID
   * @param memberId - Team member UUID
   * @param updateTeamMemberDto - Updated team member data
   * @param user - Authenticated user
   * @returns Updated team member
   */
  @Patch(':id/team/members/:memberId')
  @ApiOperation({
    summary: 'Update team member role (Admin only)',
    description:
      'Updates the role of an existing team member. Admin permissions required.',
  })
  @ApiParam({
    name: 'id',
    description: 'Project UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiParam({
    name: 'memberId',
    description: 'Team Member UUID',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @ApiBody({ type: UpdateTeamMemberDto })
  @ApiResponse({
    status: 200,
    description: 'Team member updated successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin permissions required',
  })
  @ApiResponse({
    status: 404,
    description: 'Project, team member, or role not found',
  })
  async updateTeamMember(
    @Param('id', ParseUUIDPipe) projectId: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @Body() updateTeamMemberDto: UpdateTeamMemberDto,
    @CurrentUser() user: User,
  ) {
    try {
      const teamMember = await this.projectsService.updateTeamMember(
        projectId,
        memberId,
        updateTeamMemberDto,
        user,
      );
      return {
        message: 'Team member updated successfully',
        teamMember,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to update team member',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Remove team member from project (Admin only)
   *
   * Removes a team member from the project.
   * Only users with admin permissions can remove team members.
   *
   * @param projectId - Project UUID
   * @param memberId - Team member UUID
   * @param user - Authenticated user
   * @returns Success message
   */
  @Delete(':id/team/members/:memberId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Remove team member from project (Admin only)',
    description:
      'Removes a team member from the project. Admin permissions required.',
  })
  @ApiParam({
    name: 'id',
    description: 'Project UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiParam({
    name: 'memberId',
    description: 'Team Member UUID',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @ApiResponse({
    status: 204,
    description: 'Team member removed successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin permissions required',
  })
  @ApiResponse({
    status: 404,
    description: 'Project or team member not found',
  })
  async removeTeamMember(
    @Param('id', ParseUUIDPipe) projectId: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @CurrentUser() user: User,
  ) {
    try {
      await this.projectsService.removeTeamMember(projectId, memberId, user);
      return {
        message: 'Team member removed successfully',
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to remove team member',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
