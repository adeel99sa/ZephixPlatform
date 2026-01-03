import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ResourceAllocationService } from './resource-allocation.service';
import { CreateAllocationDto } from './dto/create-allocation.dto';
import { UpdateAllocationDto } from './dto/update-allocation.dto';
import { AuthRequest } from '../../common/http/auth-request';
import { getAuthContext } from '../../common/http/get-auth-context';
import { TenantContextService } from '../tenancy/tenant-context.service';
import { WorkspaceAccessService } from '../workspaces/services/workspace-access.service';
import { WorkspaceScopeHelper } from './helpers/workspace-scope.helper';

@Controller('resource-allocations')
@ApiTags('resource-allocations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ResourceAllocationController {
  constructor(
    private readonly allocationService: ResourceAllocationService,
    private readonly tenantContextService: TenantContextService,
    private readonly workspaceAccessService: WorkspaceAccessService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new resource allocation' })
  @ApiResponse({
    status: 201,
    description: 'Resource allocation created successfully',
  })
  @ApiResponse({ status: 403, description: 'Workspace access denied' })
  async create(
    @Body() createAllocationDto: CreateAllocationDto,
    @Req() req: AuthRequest,
  ) {
    const { organizationId, userId, platformRole } = getAuthContext(req);
    
    // Validate workspace access (required for workspace-scoped operations)
    await WorkspaceScopeHelper.getValidatedWorkspaceId(
      this.tenantContextService,
      this.workspaceAccessService,
      organizationId,
      userId,
      platformRole,
      true, // Required
    );
    
    return this.allocationService.create(
      createAllocationDto,
      organizationId,
      userId,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get all resource allocations' })
  @ApiResponse({
    status: 200,
    description: 'Resource allocations retrieved successfully',
  })
  @ApiResponse({ status: 403, description: 'Workspace access denied' })
  async findAll(
    @Req() req: AuthRequest,
    @Query('resourceId') resourceId?: string,
    @Query('projectId') projectId?: string,
  ) {
    const { organizationId, userId, platformRole } = getAuthContext(req);
    
    // Validate workspace access (required for workspace-scoped operations)
    await WorkspaceScopeHelper.getValidatedWorkspaceId(
      this.tenantContextService,
      this.workspaceAccessService,
      organizationId,
      userId,
      platformRole,
      true, // Required
    );
    
    return this.allocationService.findAll(
      organizationId,
      resourceId,
      projectId,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific resource allocation' })
  @ApiResponse({
    status: 200,
    description: 'Resource allocation retrieved successfully',
  })
  @ApiResponse({ status: 403, description: 'Workspace access denied' })
  @ApiResponse({ status: 404, description: 'Resource allocation not found' })
  async findOne(@Param('id') id: string, @Req() req: AuthRequest) {
    const { organizationId, userId, platformRole } = getAuthContext(req);
    
    // Validate workspace access (required for workspace-scoped operations)
    await WorkspaceScopeHelper.getValidatedWorkspaceId(
      this.tenantContextService,
      this.workspaceAccessService,
      organizationId,
      userId,
      platformRole,
      true, // Required
    );
    
    return this.allocationService.findOne(id, organizationId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a resource allocation' })
  @ApiResponse({
    status: 200,
    description: 'Resource allocation updated successfully',
  })
  @ApiResponse({ status: 403, description: 'Workspace access denied' })
  @ApiResponse({ status: 404, description: 'Resource allocation not found' })
  @ApiResponse({ status: 409, description: 'HARD allocation would exceed capacity' })
  async update(
    @Param('id') id: string,
    @Body() updateAllocationDto: UpdateAllocationDto,
    @Req() req: AuthRequest,
  ) {
    const { organizationId, userId, platformRole } = getAuthContext(req);
    
    // Validate workspace access (required for workspace-scoped operations)
    await WorkspaceScopeHelper.getValidatedWorkspaceId(
      this.tenantContextService,
      this.workspaceAccessService,
      organizationId,
      userId,
      platformRole,
      true, // Required
    );
    
    return this.allocationService.update(
      id,
      updateAllocationDto,
      organizationId,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a resource allocation' })
  @ApiResponse({
    status: 200,
    description: 'Resource allocation deleted successfully',
  })
  @ApiResponse({ status: 403, description: 'Workspace access denied' })
  @ApiResponse({ status: 404, description: 'Resource allocation not found' })
  async remove(@Param('id') id: string, @Req() req: AuthRequest) {
    const { organizationId, userId, platformRole } = getAuthContext(req);
    
    // Validate workspace access (required for workspace-scoped operations)
    await WorkspaceScopeHelper.getValidatedWorkspaceId(
      this.tenantContextService,
      this.workspaceAccessService,
      organizationId,
      userId,
      platformRole,
      true, // Required
    );
    
    return this.allocationService.remove(id, organizationId);
  }

  @Get('resource/:resourceId')
  @ApiOperation({ summary: 'Get all allocations for a specific resource' })
  @ApiResponse({
    status: 200,
    description: 'Resource allocations retrieved successfully',
  })
  @ApiResponse({ status: 403, description: 'Workspace access denied' })
  async findByResource(
    @Param('resourceId') resourceId: string,
    @Req() req: AuthRequest,
  ) {
    const { organizationId, userId, platformRole } = getAuthContext(req);
    
    // Validate workspace access (required for workspace-scoped operations)
    await WorkspaceScopeHelper.getValidatedWorkspaceId(
      this.tenantContextService,
      this.workspaceAccessService,
      organizationId,
      userId,
      platformRole,
      true, // Required
    );
    
    return this.allocationService.findByResource(resourceId, organizationId);
  }

  @Get('project/:projectId')
  @ApiOperation({ summary: 'Get all allocations for a specific project' })
  @ApiResponse({
    status: 200,
    description: 'Project allocations retrieved successfully',
  })
  @ApiResponse({ status: 403, description: 'Workspace access denied' })
  async findByProject(
    @Param('projectId') projectId: string,
    @Req() req: AuthRequest,
  ) {
    const { organizationId, userId, platformRole } = getAuthContext(req);
    
    // Validate workspace access (required for workspace-scoped operations)
    await WorkspaceScopeHelper.getValidatedWorkspaceId(
      this.tenantContextService,
      this.workspaceAccessService,
      organizationId,
      userId,
      platformRole,
      true, // Required
    );
    
    return this.allocationService.findByProject(projectId, organizationId);
  }
}
