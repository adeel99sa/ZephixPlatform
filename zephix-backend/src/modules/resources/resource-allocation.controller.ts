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

@Controller('resource-allocations')
@ApiTags('resource-allocations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ResourceAllocationController {
  constructor(private readonly allocationService: ResourceAllocationService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new resource allocation' })
  @ApiResponse({
    status: 201,
    description: 'Resource allocation created successfully',
  })
  async create(
    @Body() createAllocationDto: CreateAllocationDto,
    @Req() req: AuthRequest,
  ) {
    const { organizationId, userId } = getAuthContext(req);
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
  async findAll(
    @Req() req: AuthRequest,
    @Query('resourceId') resourceId?: string,
    @Query('projectId') projectId?: string,
  ) {
    const { organizationId } = getAuthContext(req);
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
  async findOne(@Param('id') id: string, @Req() req: AuthRequest) {
    const { organizationId } = getAuthContext(req);
    return this.allocationService.findOne(id, organizationId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a resource allocation' })
  @ApiResponse({
    status: 200,
    description: 'Resource allocation updated successfully',
  })
  async update(
    @Param('id') id: string,
    @Body() updateAllocationDto: UpdateAllocationDto,
    @Req() req: AuthRequest,
  ) {
    const { organizationId } = getAuthContext(req);
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
  async remove(@Param('id') id: string, @Req() req: AuthRequest) {
    const { organizationId } = getAuthContext(req);
    return this.allocationService.remove(id, organizationId);
  }

  @Get('resource/:resourceId')
  @ApiOperation({ summary: 'Get all allocations for a specific resource' })
  @ApiResponse({
    status: 200,
    description: 'Resource allocations retrieved successfully',
  })
  async findByResource(
    @Param('resourceId') resourceId: string,
    @Req() req: AuthRequest,
  ) {
    const { organizationId } = getAuthContext(req);
    return this.allocationService.findByResource(resourceId, organizationId);
  }

  @Get('project/:projectId')
  @ApiOperation({ summary: 'Get all allocations for a specific project' })
  @ApiResponse({
    status: 200,
    description: 'Project allocations retrieved successfully',
  })
  async findByProject(
    @Param('projectId') projectId: string,
    @Req() req: AuthRequest,
  ) {
    const { organizationId } = getAuthContext(req);
    return this.allocationService.findByProject(projectId, organizationId);
  }
}
