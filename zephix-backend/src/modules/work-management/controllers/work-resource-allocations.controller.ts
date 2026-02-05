import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  UseGuards,
  Req,
  Body,
  Param,
  Query,
  Headers,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiHeader,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ResponseService } from '../../../shared/services/response.service';
import { AuthRequest } from '../../../common/http/auth-request';
import { getAuthContext } from '../../../common/http/get-auth-context';
import { WorkResourceAllocationsService } from '../services/work-resource-allocations.service';
import {
  CreateWorkResourceAllocationDto,
  UpdateWorkResourceAllocationDto,
  ListWorkResourceAllocationsQueryDto,
} from '../dto';

// UUID validation regex
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validateWorkspaceId(workspaceId: string | undefined): string {
  if (!workspaceId) {
    throw new ForbiddenException({
      code: 'WORKSPACE_REQUIRED',
      message: 'Workspace header x-workspace-id is required',
    });
  }
  if (!UUID_REGEX.test(workspaceId)) {
    throw new ForbiddenException({
      code: 'WORKSPACE_REQUIRED',
      message: 'Workspace header x-workspace-id must be a valid UUID',
    });
  }
  return workspaceId;
}

@Controller('work/resources/allocations')
@ApiTags('Work Management - Resource Allocations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WorkResourceAllocationsController {
  constructor(
    private readonly allocationsService: WorkResourceAllocationsService,
    private readonly responseService: ResponseService,
  ) {}

  // GET /api/work/resources/allocations
  @Get()
  @ApiOperation({ summary: 'List project resource allocations' })
  @ApiHeader({
    name: 'x-workspace-id',
    description: 'Workspace ID',
    required: true,
  })
  @ApiQuery({ name: 'projectId', required: true, type: String })
  @ApiResponse({ status: 200, description: 'List of allocations' })
  @ApiResponse({ status: 403, description: 'Workspace access denied' })
  async listAllocations(
    @Req() req: AuthRequest,
    @Headers('x-workspace-id') workspaceId: string,
    @Query() query: ListWorkResourceAllocationsQueryDto,
  ) {
    const wsId = validateWorkspaceId(workspaceId);
    const auth = getAuthContext(req);

    const result = await this.allocationsService.listAllocations(
      auth,
      wsId,
      query,
    );

    return this.responseService.success(result);
  }

  // POST /api/work/resources/allocations
  @Post()
  @ApiOperation({ summary: 'Create a resource allocation' })
  @ApiHeader({
    name: 'x-workspace-id',
    description: 'Workspace ID',
    required: true,
  })
  @ApiResponse({ status: 201, description: 'Allocation created' })
  @ApiResponse({ status: 403, description: 'Write access denied' })
  @ApiResponse({ status: 404, description: 'Project or user not found' })
  @ApiResponse({ status: 409, description: 'Allocation already exists' })
  async createAllocation(
    @Req() req: AuthRequest,
    @Headers('x-workspace-id') workspaceId: string,
    @Body() dto: CreateWorkResourceAllocationDto,
  ) {
    const wsId = validateWorkspaceId(workspaceId);
    const auth = getAuthContext(req);

    const allocation = await this.allocationsService.createAllocation(
      auth,
      wsId,
      dto,
    );

    return this.responseService.success(allocation);
  }

  // GET /api/work/resources/allocations/:id
  @Get(':id')
  @ApiOperation({ summary: 'Get a specific allocation' })
  @ApiHeader({
    name: 'x-workspace-id',
    description: 'Workspace ID',
    required: true,
  })
  @ApiParam({ name: 'id', description: 'Allocation ID' })
  @ApiResponse({ status: 200, description: 'Allocation details' })
  @ApiResponse({ status: 404, description: 'Allocation not found' })
  async getAllocation(
    @Req() req: AuthRequest,
    @Headers('x-workspace-id') workspaceId: string,
    @Param('id') allocationId: string,
  ) {
    const wsId = validateWorkspaceId(workspaceId);
    const auth = getAuthContext(req);

    const allocation = await this.allocationsService.getAllocationById(
      auth,
      wsId,
      allocationId,
    );

    return this.responseService.success(allocation);
  }

  // PATCH /api/work/resources/allocations/:id
  @Patch(':id')
  @ApiOperation({ summary: 'Update a resource allocation' })
  @ApiHeader({
    name: 'x-workspace-id',
    description: 'Workspace ID',
    required: true,
  })
  @ApiParam({ name: 'id', description: 'Allocation ID' })
  @ApiResponse({ status: 200, description: 'Allocation updated' })
  @ApiResponse({ status: 403, description: 'Write access denied' })
  @ApiResponse({ status: 404, description: 'Allocation not found' })
  async updateAllocation(
    @Req() req: AuthRequest,
    @Headers('x-workspace-id') workspaceId: string,
    @Param('id') allocationId: string,
    @Body() dto: UpdateWorkResourceAllocationDto,
  ) {
    const wsId = validateWorkspaceId(workspaceId);
    const auth = getAuthContext(req);

    const allocation = await this.allocationsService.updateAllocation(
      auth,
      wsId,
      allocationId,
      dto,
    );

    return this.responseService.success(allocation);
  }

  // DELETE /api/work/resources/allocations/:id
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a resource allocation (Admin only)' })
  @ApiHeader({
    name: 'x-workspace-id',
    description: 'Workspace ID',
    required: true,
  })
  @ApiParam({ name: 'id', description: 'Allocation ID' })
  @ApiResponse({ status: 200, description: 'Allocation deleted' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  @ApiResponse({ status: 404, description: 'Allocation not found' })
  async deleteAllocation(
    @Req() req: AuthRequest,
    @Headers('x-workspace-id') workspaceId: string,
    @Param('id') allocationId: string,
  ) {
    const wsId = validateWorkspaceId(workspaceId);
    const auth = getAuthContext(req);

    await this.allocationsService.deleteAllocation(auth, wsId, allocationId);

    return this.responseService.success({ deleted: true });
  }
}
