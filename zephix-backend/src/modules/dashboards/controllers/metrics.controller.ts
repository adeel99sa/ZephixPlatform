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
  BadRequestException,
  Headers,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiHeader,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CreateMetricDto } from '../dto/create-metric.dto';
import { UpdateMetricDto } from '../dto/update-metric.dto';
import { ResponseService } from '../../../shared/services/response.service';
import { AuthRequest } from '../../../common/http/auth-request';
import { getAuthContext } from '../../../common/http/get-auth-context';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MetricDefinition } from '../entities/metric-definition.entity';
import { WorkspaceAccessService } from '../../workspace-access/workspace-access.service';
import { NotFoundException } from '@nestjs/common';
import { normalizePlatformRole } from '../../../shared/enums/platform-roles.enum';

@Controller('metrics')
@ApiTags('metrics')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MetricsController {
  constructor(
    @InjectRepository(MetricDefinition)
    private readonly metricRepository: Repository<MetricDefinition>,
    private readonly responseService: ResponseService,
    private readonly workspaceAccessService: WorkspaceAccessService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List metric definitions' })
  @ApiHeader({
    name: 'x-workspace-id',
    description: 'Workspace ID (optional)',
    required: false,
  })
  @ApiResponse({ status: 200, description: 'Metrics retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Workspace not found' })
  async list(
    @Req() req: AuthRequest,
    @Headers('x-workspace-id') workspaceId?: string,
  ) {
    const { organizationId, userId, platformRole } = getAuthContext(req);

    if (!organizationId) {
      throw new BadRequestException('Organization ID is required');
    }

    // If workspaceId provided, validate access before querying
    if (workspaceId) {
      const hasAccess = await this.workspaceAccessService.canAccessWorkspace(
        workspaceId,
        organizationId,
        userId,
        normalizePlatformRole(platformRole),
      );
      if (!hasAccess) {
        throw new NotFoundException('Workspace not found');
      }
    }

    const where: any = { organizationId };
    if (workspaceId) {
      where.workspaceId = workspaceId;
    }

    const metrics = await this.metricRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });

    return this.responseService.success(metrics);
  }

  @Post()
  @ApiOperation({ summary: 'Create metric definition' })
  @ApiHeader({
    name: 'x-workspace-id',
    description: 'Workspace ID (optional)',
    required: false,
  })
  @ApiResponse({ status: 201, description: 'Metric created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Workspace not found' })
  async create(@Body() createDto: CreateMetricDto, @Req() req: AuthRequest) {
    const { organizationId, userId, platformRole } = getAuthContext(req);

    if (!organizationId || !userId) {
      throw new BadRequestException('Organization ID and User ID are required');
    }

    // Validate workspace access if workspaceId provided in DTO
    const targetWorkspaceId = createDto.workspaceId;
    if (targetWorkspaceId) {
      const hasAccess = await this.workspaceAccessService.canAccessWorkspace(
        targetWorkspaceId,
        organizationId,
        userId,
        normalizePlatformRole(platformRole),
      );
      if (!hasAccess) {
        throw new NotFoundException('Workspace not found');
      }
    }

    const metric = this.metricRepository.create({
      ...createDto,
      organizationId,
      createdByUserId: userId,
      workspaceId: targetWorkspaceId || null,
    });

    const saved = await this.metricRepository.save(metric);
    return this.responseService.success(saved);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get metric definition by ID' })
  @ApiParam({ name: 'id', description: 'Metric ID', type: String })
  @ApiResponse({ status: 200, description: 'Metric retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 404,
    description: 'Metric not found or workspace access denied',
  })
  async getById(@Param('id') id: string, @Req() req: AuthRequest) {
    const { organizationId, userId, platformRole } = getAuthContext(req);

    if (!organizationId) {
      throw new BadRequestException('Organization ID is required');
    }

    const metric = await this.metricRepository.findOne({
      where: { id, organizationId },
    });

    if (!metric) {
      throw new NotFoundException(`Metric with ID ${id} not found`);
    }

    // If metric has workspaceId, validate access
    if (metric.workspaceId) {
      const hasAccess = await this.workspaceAccessService.canAccessWorkspace(
        metric.workspaceId,
        organizationId,
        userId,
        normalizePlatformRole(platformRole),
      );
      if (!hasAccess) {
        throw new NotFoundException('Metric not found');
      }
    }

    return this.responseService.success(metric);
  }

  @Patch(':id')
  @ApiOperation({
    summary:
      'Update metric definition. Authorization uses stored metric workspaceId, header x-workspace-id is ignored.',
  })
  @ApiParam({ name: 'id', description: 'Metric ID', type: String })
  @ApiHeader({
    name: 'x-workspace-id',
    description: 'Workspace ID (optional)',
    required: false,
  })
  @ApiResponse({ status: 200, description: 'Metric updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 404,
    description: 'Metric not found or workspace access denied',
  })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateMetricDto,
    @Req() req: AuthRequest,
  ) {
    const { organizationId, userId, platformRole } = getAuthContext(req);

    if (!organizationId) {
      throw new BadRequestException('Organization ID is required');
    }

    // Load metric and authorize off stored record
    const metric = await this.metricRepository.findOne({
      where: { id, organizationId },
    });

    if (!metric) {
      throw new NotFoundException(`Metric with ID ${id} not found`);
    }

    // Validate access to stored workspaceId (authorize off record, not header)
    if (metric.workspaceId) {
      const hasAccess = await this.workspaceAccessService.canAccessWorkspace(
        metric.workspaceId,
        organizationId,
        userId,
        normalizePlatformRole(platformRole),
      );
      if (!hasAccess) {
        throw new NotFoundException('Metric not found');
      }
    }

    // If updating workspaceId, validate access to target workspace
    if (
      updateDto.workspaceId !== undefined &&
      updateDto.workspaceId !== metric.workspaceId
    ) {
      const targetWorkspaceId = updateDto.workspaceId;
      if (targetWorkspaceId) {
        const hasAccess = await this.workspaceAccessService.canAccessWorkspace(
          targetWorkspaceId,
          organizationId,
          userId,
          normalizePlatformRole(platformRole),
        );
        if (!hasAccess) {
          throw new NotFoundException('Workspace not found');
        }
      }
    }

    Object.assign(metric, updateDto);
    if (updateDto.workspaceId !== undefined) {
      metric.workspaceId = updateDto.workspaceId || null;
    }

    const saved = await this.metricRepository.save(metric);
    return this.responseService.success(saved);
  }

  @Delete(':id')
  @ApiOperation({
    summary:
      'Delete metric definition. Authorization uses stored metric workspaceId.',
  })
  @ApiParam({ name: 'id', description: 'Metric ID', type: String })
  @ApiResponse({ status: 200, description: 'Metric deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 404,
    description: 'Metric not found or workspace access denied',
  })
  async delete(@Param('id') id: string, @Req() req: AuthRequest) {
    const { organizationId, userId, platformRole } = getAuthContext(req);

    if (!organizationId) {
      throw new BadRequestException('Organization ID is required');
    }

    // Load metric and authorize off stored record
    const metric = await this.metricRepository.findOne({
      where: { id, organizationId },
    });

    if (!metric) {
      throw new NotFoundException(`Metric with ID ${id} not found`);
    }

    // Validate access to stored workspaceId (authorize off record, not header)
    if (metric.workspaceId) {
      const hasAccess = await this.workspaceAccessService.canAccessWorkspace(
        metric.workspaceId,
        organizationId,
        userId,
        normalizePlatformRole(platformRole),
      );
      if (!hasAccess) {
        throw new NotFoundException('Metric not found');
      }
    }

    await this.metricRepository.remove(metric);
    return this.responseService.success({ message: 'Metric deleted' });
  }
}
