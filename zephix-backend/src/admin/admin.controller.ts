import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Query,
  Param,
  Body,
  UseGuards,
  Request,
  InternalServerErrorException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../modules/auth/guards/jwt-auth.guard';
import { AdminGuard } from './guards/admin.guard';
import { AdminService } from './admin.service';
import { OrganizationsService } from '../organizations/services/organizations.service';
import { WorkspacesService } from '../modules/workspaces/workspaces.service';
import { TeamsService } from '../modules/teams/teams.service';
import { CreateTeamDto } from '../modules/teams/dto/create-team.dto';
import { UpdateTeamDto } from '../modules/teams/dto/update-team.dto';
import { ListTeamsQueryDto } from '../modules/teams/dto/list-teams-query.dto';
import { AuthRequest } from '../common/http/auth-request';
import { getAuthContext } from '../common/http/get-auth-context';

@ApiTags('Admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  private readonly logger = new Logger(AdminController.name);

  constructor(
    private readonly adminService: AdminService,
    private readonly organizationsService: OrganizationsService,
    private readonly workspacesService: WorkspacesService,
    private readonly teamsService: TeamsService,
  ) {}

  // Helper to map frontend visibility to backend enum
  private mapVisibilityToBackend(visibility: string): string {
    const map: Record<string, string> = {
      public: 'ORG',
      workspace: 'WORKSPACE',
      private: 'PRIVATE',
    };
    return map[visibility?.toLowerCase()] || 'ORG';
  }

  // Helper to map backend visibility to frontend format
  private mapVisibilityToFrontend(visibility: string): string {
    const map: Record<string, string> = {
      ORG: 'public',
      WORKSPACE: 'workspace',
      PRIVATE: 'private',
    };
    return map[visibility] || visibility.toLowerCase();
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get admin statistics' })
  @ApiResponse({
    status: 200,
    description: 'Admin statistics retrieved successfully',
  })
  async getStats(@Request() req: AuthRequest) {
    try {
      const { organizationId } = getAuthContext(req);
      const stats = await this.adminService.getStatistics(organizationId);
      // Standardized response contract: { data: Stats }
      return { data: stats };
    } catch (_error) {
      // Never throw 500 - return safe defaults
      const requestId = req.headers['x-request-id'] || 'unknown';
      const { organizationId, userId } = getAuthContext(req);
      this.logger.error('Failed to get admin stats', {
        error: _error instanceof Error ? _error.message : String(_error),
        errorClass:
          _error instanceof Error ? _error.constructor.name : 'Unknown',
        organizationId,
        userId,
        requestId,
        endpoint: 'GET /api/admin/stats',
      });
      // Return safe defaults
      return {
        data: {
          userCount: 0,
          activeUsers: 0,
          templateCount: 0,
          projectCount: 0,
          totalItems: 0,
        },
      };
    }
  }

  @Get('health')
  @ApiOperation({ summary: 'Get system health' })
  @ApiResponse({
    status: 200,
    description: 'System health retrieved successfully',
  })
  async getSystemHealth(@Request() req: AuthRequest) {
    try {
      const { organizationId } = getAuthContext(req);
      const health = await this.adminService.getSystemHealth(organizationId);
      // Standardized response contract: { data: SystemHealth }
      return { data: health };
    } catch (_error) {
      // Never throw 500 - return error status
      const requestId = req.headers['x-request-id'] || 'unknown';
      const { organizationId, userId } = getAuthContext(req);
      this.logger.error('Failed to get system health', {
        error: _error instanceof Error ? _error.message : String(_error),
        errorClass:
          _error instanceof Error ? _error.constructor.name : 'Unknown',
        organizationId,
        userId,
        requestId,
        endpoint: 'GET /api/admin/health',
      });
      // Return error status but never throw
      return {
        data: {
          status: 'error',
          timestamp: new Date().toISOString(),
          database: 'error',
          details: {
            message: 'Health check failed',
          },
        },
      };
    }
  }

  @Get('org/summary')
  @ApiOperation({ summary: 'Get organization summary' })
  @ApiResponse({
    status: 200,
    description: 'Organization summary retrieved successfully',
  })
  async getOrgSummary(@Request() req: AuthRequest) {
    try {
      const { organizationId } = getAuthContext(req);
      const summary = await this.adminService.getOrgSummary(organizationId);
      // Standardized response contract: { data: OrgSummary }
      return { data: summary };
    } catch (_error) {
      // Never throw 500 - return safe defaults
      const requestId = req.headers['x-request-id'] || 'unknown';
      const { organizationId, userId } = getAuthContext(req);
      this.logger.error('Failed to get org summary', {
        error: _error instanceof Error ? _error.message : String(_error),
        errorClass:
          _error instanceof Error ? _error.constructor.name : 'Unknown',
        organizationId,
        userId,
        requestId,
        endpoint: 'GET /api/admin/org/summary',
      });
      // Return safe defaults
      return {
        data: {
          name: 'Organization',
          id: organizationId || 'unknown',
          slug: 'unknown',
          totalUsers: 0,
          totalWorkspaces: 0,
        },
      };
    }
  }

  @Get('users/summary')
  @ApiOperation({ summary: 'Get users summary' })
  @ApiResponse({
    status: 200,
    description: 'Users summary retrieved successfully',
  })
  async getUsersSummary(@Request() req: AuthRequest) {
    try {
      const { organizationId } = getAuthContext(req);
      const summary = await this.adminService.getUsersSummary(organizationId);
      // Standardized response contract: { data: UserSummary }
      return { data: summary };
    } catch (_error) {
      // Never throw 500 - return safe defaults
      const requestId = req.headers['x-request-id'] || 'unknown';
      const { organizationId, userId } = getAuthContext(req);
      this.logger.error('Failed to get users summary', {
        error: _error instanceof Error ? _error.message : String(_error),
        errorClass:
          _error instanceof Error ? _error.constructor.name : 'Unknown',
        organizationId,
        userId,
        requestId,
        endpoint: 'GET /api/admin/users/summary',
      });
      // Return safe defaults
      return {
        data: {
          total: 0,
          byRole: {
            owners: 0,
            admins: 0,
            members: 0,
            viewers: 0,
          },
        },
      };
    }
  }

  @Get('workspaces/summary')
  @ApiOperation({ summary: 'Get workspaces summary' })
  @ApiResponse({
    status: 200,
    description: 'Workspaces summary retrieved successfully',
  })
  async getWorkspacesSummary(@Request() req: AuthRequest) {
    try {
      const { organizationId } = getAuthContext(req);
      const summary =
        await this.adminService.getWorkspacesSummary(organizationId);
      // Standardized response contract: { data: WorkspaceSummary }
      return { data: summary };
    } catch (_error) {
      // Never throw 500 - return safe defaults
      const requestId = req.headers['x-request-id'] || 'unknown';
      const { organizationId, userId } = getAuthContext(req);
      this.logger.error('Failed to get workspaces summary', {
        error: _error instanceof Error ? _error.message : String(_error),
        errorClass:
          _error instanceof Error ? _error.constructor.name : 'Unknown',
        organizationId,
        userId,
        requestId,
        endpoint: 'GET /api/admin/workspaces/summary',
      });
      // Return safe defaults
      return {
        data: {
          total: 0,
          byType: {
            public: 0,
            private: 0,
          },
          byStatus: {
            active: 0,
            archived: 0,
          },
        },
      };
    }
  }

  @Get('risk/summary')
  @ApiOperation({ summary: 'Get risk summary' })
  @ApiResponse({
    status: 200,
    description: 'Risk summary retrieved successfully',
  })
  async getRiskSummary(@Request() req: AuthRequest) {
    try {
      const { organizationId } = getAuthContext(req);
      const summary = await this.adminService.getRiskSummary(organizationId);
      // Standardized response contract: { data: RiskSummary }
      return { data: summary };
    } catch (_error) {
      // Never throw 500 - return safe defaults
      const requestId = req.headers['x-request-id'] || 'unknown';
      const { organizationId, userId } = getAuthContext(req);
      this.logger.error('Failed to get risk summary', {
        error: _error instanceof Error ? _error.message : String(_error),
        errorClass:
          _error instanceof Error ? _error.constructor.name : 'Unknown',
        organizationId,
        userId,
        requestId,
        endpoint: 'GET /api/admin/risk/summary',
      });
      // Return safe defaults
      return {
        data: {
          projectsAtRisk: 0,
          overallocatedResources: 0,
        },
      };
    }
  }

  @Get('users')
  @ApiOperation({ summary: 'Get paginated users for admin management' })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  async getUsers(
    @Request() req: AuthRequest,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('role') _role?: string,
    @Query('status') _status?: string,
  ) {
    try {
      const pageNum = page ? parseInt(page, 10) : 1;
      const limitNum = limit ? parseInt(limit, 10) : 20;
      const offset = (pageNum - 1) * limitNum;

      const { organizationId } = getAuthContext(req);
      const result = await this.organizationsService.getOrganizationUsers(
        organizationId,
        {
          limit: limitNum,
          offset,
          search,
        },
      );

      // Apply role and status filters client-side for now
      let filteredUsers = result.users;
      if (_role && _role !== 'all') {
        filteredUsers = filteredUsers.filter((u: any) => u.role === _role);
      }
      if (_status && _status !== 'all') {
        // Map status based on isActive or other criteria
        // For now, we'll assume all users in the result are active
        // This can be enhanced based on actual status field
      }

      const totalPages = Math.ceil(result.total / limitNum);

      return {
        users: filteredUsers.map((u: any) => ({
          id: u.id,
          email: u.email,
          firstName: u.firstName || '',
          lastName: u.lastName || '',
          role: u.role,
          status: 'active', // Default to active for now
          lastActive: u.lastActive
            ? new Date(u.lastActive).toISOString()
            : null,
          joinedAt: u.joinedAt
            ? new Date(u.joinedAt).toISOString()
            : new Date().toISOString(),
        })),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: result.total,
          totalPages,
        },
      };
    } catch (_error) {
      throw new InternalServerErrorException('Failed to fetch users');
    }
  }

  @Post('users')
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  async createUser(
    @Request() _req: AuthRequest,
    @Body()
    _body: {
      firstName: string;
      lastName: string;
      email: string;
      role: 'admin' | 'member' | 'viewer';
      status?: 'active' | 'inactive';
    },
  ) {
    // TODO: Implement user creation logic
    // For now, return a placeholder
    throw new InternalServerErrorException('User creation not yet implemented');
  }

  @Get('users/:userId')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, description: 'User retrieved successfully' })
  async getUser(@Request() req: AuthRequest, @Param('userId') userId: string) {
    try {
      const { organizationId } = getAuthContext(req);
      const result = await this.organizationsService.getOrganizationUsers(
        organizationId,
        { limit: 1000, offset: 0 },
      );
      const user = result.users.find((u: any) => u.id === userId);
      if (!user) {
        throw new InternalServerErrorException('User not found');
      }
      return {
        id: user.id,
        email: user.email,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        role: user.role,
        status: 'active', // Default to active for now
        lastActive: user.lastActive
          ? new Date(user.lastActive).toISOString()
          : null,
        joinedAt: user.joinedAt
          ? new Date(user.joinedAt).toISOString()
          : new Date().toISOString(),
      };
    } catch (_error) {
      throw new InternalServerErrorException('Failed to fetch user');
    }
  }

  @Patch('users/:userId')
  @ApiOperation({ summary: 'Update user' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  async updateUser(
    @Request() req: AuthRequest,
    @Param('userId') userId: string,
    @Body()
    body: {
      firstName?: string;
      lastName?: string;
      role?: 'admin' | 'member' | 'viewer';
      status?: 'active' | 'inactive';
    },
  ) {
    try {
      const { organizationId, userId: currentUserId } = getAuthContext(req);
      // TODO: Implement full user update logic
      if (body.role) {
        // Map 'member' to 'pm' for backend compatibility
        const backendRole = body.role === 'member' ? 'pm' : body.role;
        await this.organizationsService.updateUserRole(
          organizationId,
          userId,
          backendRole,
          currentUserId,
        );
      }
      return { message: 'User updated successfully' };
    } catch (_error) {
      throw new InternalServerErrorException('Failed to update user');
    }
  }

  @Delete('users/:userId')
  @ApiOperation({ summary: 'Delete user' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  async deleteUser(
    @Request() req: AuthRequest,
    @Param('userId') userId: string,
  ) {
    try {
      const { organizationId } = getAuthContext(req);
      // TODO: Implement user deletion logic
      // For now, deactivate the user organization relationship
      await this.organizationsService['userOrganizationRepository'].update(
        {
          organizationId,
          userId,
        },
        { isActive: false },
      );
      return { message: 'User removed successfully' };
    } catch (_error) {
      throw new InternalServerErrorException('Failed to delete user');
    }
  }

  @Patch('users/:userId/role')
  @ApiOperation({ summary: 'Update user role' })
  @ApiResponse({ status: 200, description: 'User role updated successfully' })
  async updateUserRole(
    @Request() req: AuthRequest,
    @Param('userId') userId: string,
    @Body() body: { role: 'admin' | 'member' | 'viewer' },
  ) {
    try {
      const { organizationId, userId: currentUserId } = getAuthContext(req);
      // Map 'member' to 'pm' for backend compatibility
      const backendRole = body.role === 'member' ? 'pm' : body.role;
      await this.organizationsService.updateUserRole(
        organizationId,
        userId,
        backendRole,
        currentUserId,
      );
      return { message: 'User role updated successfully' };
    } catch (_error) {
      throw new InternalServerErrorException('Failed to update user role');
    }
  }

  @Get('workspaces')
  @ApiOperation({ summary: 'Get all workspaces for admin management' })
  @ApiResponse({
    status: 200,
    description: 'Workspaces retrieved successfully',
  })
  async getWorkspaces(@Request() req: AuthRequest) {
    try {
      const { organizationId, userId, platformRole } = getAuthContext(req);
      const workspaces = await this.workspacesService.listByOrg(
        organizationId,
        userId,
        platformRole || 'viewer',
      );

      // Fetch owner information for each workspace
      const workspacesWithOwners = await Promise.all(
        (workspaces || []).map(async (ws) => {
          let owner = null;
          if (ws.ownerId) {
            try {
              const ownerUserOrg = await this.organizationsService[
                'userOrganizationRepository'
              ].findOne({
                where: {
                  organizationId,
                  userId: ws.ownerId,
                  isActive: true,
                },
                relations: ['user'],
              });
              if (ownerUserOrg?.user) {
                owner = {
                  id: ownerUserOrg.user.id,
                  email: ownerUserOrg.user.email,
                  name:
                    `${ownerUserOrg.user.firstName || ''} ${ownerUserOrg.user.lastName || ''}`.trim() ||
                    ownerUserOrg.user.email,
                };
              }
            } catch {
              // Silently fail owner lookup - workspace still valid
            }
          }

          return {
            id: ws.id,
            name: ws.name,
            owner,
            visibility: ws.isPrivate ? 'private' : 'public',
            status: ws.deletedAt ? 'archived' : 'active',
            createdAt: ws.createdAt
              ? new Date(ws.createdAt).toISOString()
              : new Date().toISOString(),
          };
        }),
      );

      // Standardized response contract: { data: Workspace[] }
      return { data: workspacesWithOwners || [] };
    } catch (_error) {
      // Never throw 500 - return safe defaults
      const requestId = req.headers['x-request-id'] || 'unknown';
      const { organizationId: orgId, userId: uid } = getAuthContext(req);
      this.logger.error('Failed to get admin workspaces', {
        error: _error instanceof Error ? _error.message : String(_error),
        errorClass:
          _error instanceof Error ? _error.constructor.name : 'Unknown',
        organizationId: orgId,
        userId: uid,
        requestId,
        endpoint: 'GET /api/admin/workspaces',
      });
      // Return safe defaults
      return { data: [] };
    }
  }

  @Post('workspaces')
  @ApiOperation({ summary: 'Create workspace' })
  @ApiResponse({ status: 201, description: 'Workspace created successfully' })
  async createWorkspace(
    @Request() req: AuthRequest,
    @Body()
    body: {
      name: string;
      description?: string;
      ownerId: string;
      visibility?: 'public' | 'private';
      defaultMethodology?: string;
      memberIds?: string[];
    },
  ) {
    try {
      const { organizationId, userId } = getAuthContext(req);
      // Generate slug from name
      const slug = body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

      // TODO: Implement workspace creation with member assignment
      const workspace = await this.workspacesService.create({
        name: body.name,
        slug,
        ownerId: body.ownerId,
        isPrivate: body.visibility === 'private',
        organizationId,
        createdBy: userId,
      });
      return workspace;
    } catch (_error) {
      throw new InternalServerErrorException('Failed to create workspace');
    }
  }

  @Get('workspaces/:id')
  @ApiOperation({ summary: 'Get workspace by ID' })
  @ApiResponse({ status: 200, description: 'Workspace retrieved successfully' })
  async getWorkspace(
    @Request() req: AuthRequest,
    @Param('id') workspaceId: string,
  ) {
    try {
      const { organizationId } = getAuthContext(req);
      const workspace = await this.workspacesService.getById(
        organizationId,
        workspaceId,
      );
      if (!workspace) {
        // Return null if not found (200 status)
        return { data: null };
      }

      // Fetch owner information
      let owner = null;
      if (workspace.ownerId) {
        try {
          const ownerUserOrg = await this.organizationsService[
            'userOrganizationRepository'
          ].findOne({
            where: {
              organizationId,
              userId: workspace.ownerId,
              isActive: true,
            },
            relations: ['user'],
          });
          if (ownerUserOrg?.user) {
            owner = {
              id: ownerUserOrg.user.id,
              email: ownerUserOrg.user.email,
              name:
                `${ownerUserOrg.user.firstName || ''} ${ownerUserOrg.user.lastName || ''}`.trim() ||
                ownerUserOrg.user.email,
            };
          }
        } catch {
          // Silently fail owner lookup - workspace still valid
        }
      }

      // Standardized response contract: { data: Workspace | null }
      return {
        data: {
          id: workspace.id,
          name: workspace.name,
          description: workspace.description,
          owner,
          visibility: workspace.isPrivate ? 'private' : 'public',
          status: workspace.deletedAt ? 'archived' : 'active',
          createdAt: workspace.createdAt
            ? new Date(workspace.createdAt).toISOString()
            : new Date().toISOString(),
          updatedAt: workspace.updatedAt
            ? new Date(workspace.updatedAt).toISOString()
            : new Date().toISOString(),
        },
      };
    } catch (_error) {
      // Never throw 500 - return null for not found
      const requestId = req.headers['x-request-id'] || 'unknown';
      const { organizationId, userId } = getAuthContext(req);
      this.logger.error('Failed to get admin workspace', {
        error: _error instanceof Error ? _error.message : String(_error),
        errorClass:
          _error instanceof Error ? _error.constructor.name : 'Unknown',
        organizationId,
        userId,
        workspaceId,
        requestId,
        endpoint: 'GET /api/admin/workspaces/:id',
      });
      // Return null for not found (200 status)
      return { data: null };
    }
  }

  @Patch('workspaces/:id')
  @ApiOperation({ summary: 'Update workspace (owner, visibility, status)' })
  @ApiResponse({ status: 200, description: 'Workspace updated successfully' })
  async updateWorkspace(
    @Request() req: AuthRequest,
    @Param('id') workspaceId: string,
    @Body()
    body: {
      ownerId?: string;
      visibility?: 'public' | 'private';
      status?: 'active' | 'archived';
      name?: string;
      description?: string;
    },
  ) {
    try {
      const { organizationId, userId } = getAuthContext(req);
      const workspace = await this.workspacesService.getById(
        organizationId,
        workspaceId,
      );
      if (!workspace) {
        throw new InternalServerErrorException('Workspace not found');
      }

      const updates: Record<string, unknown> = {};
      if (body.name !== undefined) {
        updates.name = body.name;
      }
      if (body.description !== undefined) {
        updates.description = body.description;
      }
      if (body.ownerId !== undefined) {
        updates.ownerId = body.ownerId;
      }
      if (body.visibility !== undefined) {
        updates.isPrivate = body.visibility === 'private';
      }
      if (body.status === 'archived' && !workspace.deletedAt) {
        // Soft delete for archived
        updates.deletedAt = new Date();
        updates.deletedBy = userId;
      } else if (body.status === 'active' && workspace.deletedAt) {
        // Restore
        updates.deletedAt = null;
        updates.deletedBy = null;
      }

      if (Object.keys(updates).length > 0) {
        await this.workspacesService['repo'].update(workspaceId, updates);
      }

      return { message: 'Workspace updated successfully' };
    } catch (_error) {
      throw new InternalServerErrorException('Failed to update workspace');
    }
  }

  @Delete('workspaces/:id')
  @ApiOperation({ summary: 'Delete workspace' })
  @ApiResponse({ status: 200, description: 'Workspace deleted successfully' })
  async deleteWorkspace(
    @Request() _req: AuthRequest,
    @Param('id') _workspaceId: string,
  ) {
    // TODO: Implement workspace deletion logic
    throw new InternalServerErrorException(
      'Workspace deletion not yet implemented',
    );
  }

  // Groups endpoints (stubs for Phase 2)
  @Get('groups')
  @ApiOperation({ summary: 'Get all groups' })
  @ApiResponse({ status: 200, description: 'Groups retrieved successfully' })
  getGroups(@Request() _req: AuthRequest) {
    // TODO: Implement groups API
    return [];
  }

  @Post('groups')
  @ApiOperation({ summary: 'Create group' })
  @ApiResponse({ status: 201, description: 'Group created successfully' })
  async createGroup(
    @Request() _req: AuthRequest,
    @Body() _body: { name: string; description?: string },
  ) {
    // TODO: Implement group creation
    throw new InternalServerErrorException(
      'Group creation not yet implemented',
    );
  }

  @Get('groups/:id')
  @ApiOperation({ summary: 'Get group by ID' })
  @ApiResponse({ status: 200, description: 'Group retrieved successfully' })
  async getGroup(@Request() _req: AuthRequest, @Param('id') _groupId: string) {
    // TODO: Implement get group
    throw new InternalServerErrorException('Get group not yet implemented');
  }

  @Patch('groups/:id')
  @ApiOperation({ summary: 'Update group' })
  @ApiResponse({ status: 200, description: 'Group updated successfully' })
  async updateGroup(
    @Request() _req: AuthRequest,
    @Param('id') _groupId: string,
    @Body() _body: { name?: string; description?: string },
  ) {
    // TODO: Implement group update
    throw new InternalServerErrorException('Group update not yet implemented');
  }

  @Delete('groups/:id')
  @ApiOperation({ summary: 'Delete group' })
  @ApiResponse({ status: 200, description: 'Group deleted successfully' })
  async deleteGroup(
    @Request() _req: AuthRequest,
    @Param('id') _groupId: string,
  ) {
    // TODO: Implement group deletion
    throw new InternalServerErrorException(
      'Group deletion not yet implemented',
    );
  }

  // ==================== Teams Endpoints ====================

  @Get('teams')
  @ApiOperation({ summary: 'Get all teams for admin management' })
  @ApiResponse({ status: 200, description: 'Teams retrieved successfully' })
  async getTeams(
    @Request() req: AuthRequest,
    @Query() query: ListTeamsQueryDto,
  ) {
    try {
      const { organizationId } = getAuthContext(req);
      const result = await this.teamsService.listTeams(organizationId, query);

      // Map to frontend expected shape
      return result.teams.map((team) => {
        const visibility = this.mapVisibilityToFrontend(team.visibility);

        return {
          id: team.id,
          name: team.name,
          shortCode: team.slug, // Frontend expects shortCode
          color: team.color,
          visibility, // Frontend expects: 'public' | 'private' | 'workspace'
          description: team.description,
          workspaceId: team.workspaceId,
          status: team.isArchived ? 'archived' : 'active',
          memberCount: (team as any).membersCount || 0,
          projectCount: (team as any).projectsCount || 0,
          createdAt: team.createdAt.toISOString(),
          updatedAt: team.updatedAt.toISOString(),
        };
      });
    } catch (_error) {
      throw new InternalServerErrorException('Failed to fetch teams');
    }
  }

  @Get('teams/:id')
  @ApiOperation({ summary: 'Get team by ID' })
  @ApiResponse({ status: 200, description: 'Team retrieved successfully' })
  async getTeam(@Request() req: AuthRequest, @Param('id') teamId: string) {
    try {
      const { organizationId } = getAuthContext(req);
      const team = await this.teamsService.getTeamById(organizationId, teamId);

      const frontendVisibility = this.mapVisibilityToFrontend(team.visibility);

      return {
        id: team.id,
        name: team.name,
        shortCode: team.slug,
        color: team.color,
        visibility: frontendVisibility,
        description: team.description,
        workspaceId: team.workspaceId,
        status: team.isArchived ? 'archived' : 'active',
        memberCount: (team as any).membersCount || 0,
        projectCount: (team as any).projectsCount || 0,
        createdAt: team.createdAt.toISOString(),
        updatedAt: team.updatedAt.toISOString(),
        members:
          team.members?.map((m) => ({
            id: m.id,
            userId: m.userId,
            role: m.role,
            user: m.user
              ? {
                  id: m.user.id,
                  email: m.user.email,
                  firstName: m.user.firstName,
                  lastName: m.user.lastName,
                }
              : null,
          })) || [],
      };
    } catch (_error) {
      if (_error instanceof NotFoundException) {
        throw _error;
      }
      throw new InternalServerErrorException('Failed to fetch team');
    }
  }

  @Post('teams')
  @ApiOperation({ summary: 'Create a new team' })
  @ApiResponse({ status: 201, description: 'Team created successfully' })
  async createTeam(
    @Request() req: AuthRequest,
    @Body() body: Record<string, unknown>, // Accept any to handle frontend format
  ) {
    try {
      const { organizationId, userId } = getAuthContext(req);
      const backendVisibility = this.mapVisibilityToBackend(
        (body.visibility as string) || 'public',
      );

      // Map frontend format to backend DTO
      const createDto: CreateTeamDto = {
        name: body.name as string,
        slug: body.shortCode as string, // Frontend sends shortCode, backend uses slug
        color: body.color as string,
        visibility: backendVisibility as any,
        description: body.description as string,
        workspaceId: body.workspaceId as string,
      };

      const team = await this.teamsService.createTeam(
        organizationId,
        createDto,
        userId,
      );

      const frontendVisibility = this.mapVisibilityToFrontend(team.visibility);

      return {
        id: team.id,
        name: team.name,
        shortCode: team.slug,
        color: team.color,
        visibility: frontendVisibility,
        description: team.description,
        workspaceId: team.workspaceId,
        status: team.isArchived ? 'archived' : 'active',
        memberCount: (team as any).membersCount || 0,
        projectCount: (team as any).projectsCount || 0,
        createdAt: team.createdAt.toISOString(),
        updatedAt: team.updatedAt.toISOString(),
      };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to create team');
    }
  }

  @Patch('teams/:id')
  @ApiOperation({ summary: 'Update team' })
  @ApiResponse({ status: 200, description: 'Team updated successfully' })
  async updateTeam(
    @Request() req: AuthRequest,
    @Param('id') teamId: string,
    @Body() body: Record<string, unknown>, // Accept any to handle frontend format
  ) {
    try {
      // Map frontend visibility to backend enum if provided
      let backendVisibility = undefined;
      if (body.visibility && typeof body.visibility === 'string') {
        backendVisibility = this.mapVisibilityToBackend(body.visibility);
      }

      const { organizationId } = getAuthContext(req);
      // Map frontend format to backend DTO
      const updateDto: UpdateTeamDto = {
        name: body.name as string,
        slug: body.shortCode as string, // Frontend sends shortCode, backend uses slug
        color: body.color as string,
        visibility: backendVisibility,
        description: body.description as string,
        workspaceId: body.workspaceId as string,
        isArchived: body.status === 'archived', // Frontend sends status, backend uses isArchived
      };

      const team = await this.teamsService.updateTeam(
        organizationId,
        teamId,
        updateDto,
      );

      const frontendVisibility = this.mapVisibilityToFrontend(team.visibility);

      return {
        id: team.id,
        name: team.name,
        shortCode: team.slug,
        color: team.color,
        visibility: frontendVisibility,
        description: team.description,
        workspaceId: team.workspaceId,
        status: team.isArchived ? 'archived' : 'active',
        memberCount: (team as any).membersCount || 0,
        projectCount: (team as any).projectsCount || 0,
        createdAt: team.createdAt.toISOString(),
        updatedAt: team.updatedAt.toISOString(),
      };
    } catch (_error) {
      if (
        _error instanceof NotFoundException ||
        _error instanceof BadRequestException
      ) {
        throw _error;
      }
      throw new InternalServerErrorException('Failed to update team');
    }
  }

  @Delete('teams/:id')
  @ApiOperation({ summary: 'Delete (archive) team' })
  @ApiResponse({ status: 200, description: 'Team archived successfully' })
  async deleteTeam(@Request() req: AuthRequest, @Param('id') teamId: string) {
    try {
      const { organizationId } = getAuthContext(req);
      const team = await this.teamsService.deleteTeam(organizationId, teamId);

      const frontendVisibility = this.mapVisibilityToFrontend(team.visibility);

      return {
        id: team.id,
        name: team.name,
        shortCode: team.slug,
        color: team.color,
        visibility: frontendVisibility,
        description: team.description,
        workspaceId: team.workspaceId,
        status: 'archived',
        memberCount: (team as any).membersCount || 0,
        projectCount: (team as any).projectsCount || 0,
        createdAt: team.createdAt.toISOString(),
        updatedAt: team.updatedAt.toISOString(),
      };
    } catch (_error) {
      if (_error instanceof NotFoundException) {
        throw _error;
      }
      throw new InternalServerErrorException('Failed to delete team');
    }
  }
}
