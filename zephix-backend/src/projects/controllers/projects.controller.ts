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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';

import { ProjectsService } from '../services/projects.service';
import { CreateProjectDto } from '../dto/create-project.dto';
import { UpdateProjectDto } from '../dto/update-project.dto';
import { AddTeamMemberDto } from '../dto/add-team-member.dto';
import { UpdateTeamMemberDto } from '../dto/update-team-member.dto';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../../users/entities/user.entity';
import { RequirePermissions } from '../decorators/project-permissions.decorator';
import { RoleType } from '../entities/role.entity';

@ApiTags('Projects')
@Controller('projects')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new project' })
  @ApiResponse({ status: 201, description: 'Project created successfully' })
  async create(@Body() createProjectDto: CreateProjectDto, @CurrentUser() user: User) {
    const project = await this.projectsService.create(createProjectDto, user);
    return {
      message: 'Project created successfully',
      project,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all projects for current user' })
  @ApiResponse({ status: 200, description: 'Projects retrieved successfully' })
  async findAll(@CurrentUser() user: User) {
    const projects = await this.projectsService.findAll(user);
    return {
      message: 'Projects retrieved successfully',
      projects,
      count: projects.length,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get project by ID' })
  @ApiParam({ name: 'id', description: 'Project ID' })
  @ApiResponse({ status: 200, description: 'Project retrieved successfully' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const project = await this.projectsService.findOne(id);
    return {
      message: 'Project retrieved successfully',
      project,
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update project' })
  @ApiParam({ name: 'id', description: 'Project ID' })
  @ApiResponse({ status: 200, description: 'Project updated successfully' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateProjectDto: UpdateProjectDto,
    @CurrentUser() user: User,
  ) {
    const project = await this.projectsService.update(id, updateProjectDto, user);
    return {
      message: 'Project updated successfully',
      project,
    };
  }

  @Delete(':id')
  @RequirePermissions(RoleType.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete project (Admin only)' })
  @ApiParam({ name: 'id', description: 'Project ID' })
  @ApiResponse({ status: 204, description: 'Project deleted successfully' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    await this.projectsService.remove(id, user);
    return {
      message: 'Project deleted successfully',
    };
  }

  // Team Management Endpoints

  @Post(':id/team/members')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add team member to project (Admin only)' })
  @ApiParam({ name: 'id', description: 'Project ID' })
  @ApiResponse({ status: 201, description: 'Team member added successfully' })
  async addTeamMember(
    @Param('id', ParseUUIDPipe) projectId: string,
    @Body() addTeamMemberDto: AddTeamMemberDto,
    @CurrentUser() user: User,
  ) {
    const teamMember = await this.projectsService.addTeamMember(projectId, addTeamMemberDto, user);
    return {
      message: 'Team member added successfully',
      teamMember,
    };
  }

  @Patch(':id/team/members/:memberId')
  @ApiOperation({ summary: 'Update team member role (Admin only)' })
  @ApiParam({ name: 'id', description: 'Project ID' })
  @ApiParam({ name: 'memberId', description: 'Team Member ID' })
  @ApiResponse({ status: 200, description: 'Team member updated successfully' })
  async updateTeamMember(
    @Param('id', ParseUUIDPipe) projectId: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @Body() updateTeamMemberDto: UpdateTeamMemberDto,
    @CurrentUser() user: User,
  ) {
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
  }

  @Delete(':id/team/members/:memberId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove team member from project (Admin only)' })
  @ApiParam({ name: 'id', description: 'Project ID' })
  @ApiParam({ name: 'memberId', description: 'Team Member ID' })
  @ApiResponse({ status: 204, description: 'Team member removed successfully' })
  async removeTeamMember(
    @Param('id', ParseUUIDPipe) projectId: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @CurrentUser() user: User,
  ) {
    await this.projectsService.removeTeamMember(projectId, memberId, user);
    return {
      message: 'Team member removed successfully',
    };
  }
} 