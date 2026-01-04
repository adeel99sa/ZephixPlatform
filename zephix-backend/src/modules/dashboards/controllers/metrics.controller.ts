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

@Controller('metrics')
@ApiTags('metrics')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MetricsController {
  constructor(
    @InjectRepository(MetricDefinition)
    private readonly metricRepository: Repository<MetricDefinition>,
    private readonly responseService: ResponseService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List metric definitions' })
  @ApiHeader({ name: 'x-workspace-id', description: 'Workspace ID (optional)', required: false })
  @ApiResponse({ status: 200, description: 'Metrics retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async list(
    @Req() req: AuthRequest,
    @Headers('x-workspace-id') workspaceId?: string,
  ) {
    const { organizationId } = getAuthContext(req);

    if (!organizationId) {
      throw new BadRequestException('Organization ID is required');
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
  @ApiHeader({ name: 'x-workspace-id', description: 'Workspace ID (optional)', required: false })
  @ApiResponse({ status: 201, description: 'Metric created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(
    @Body() createDto: CreateMetricDto,
    @Req() req: AuthRequest,
    @Headers('x-workspace-id') workspaceId?: string,
  ) {
    const { organizationId, userId } = getAuthContext(req);

    if (!organizationId || !userId) {
      throw new BadRequestException('Organization ID and User ID are required');
    }

    const metric = this.metricRepository.create({
      ...createDto,
      organizationId,
      createdByUserId: userId,
      workspaceId: createDto.workspaceId || workspaceId || null,
    });

    const saved = await this.metricRepository.save(metric);
    return this.responseService.success(saved);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get metric definition by ID' })
  @ApiParam({ name: 'id', description: 'Metric ID', type: String })
  @ApiResponse({ status: 200, description: 'Metric retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Metric not found' })
  async getById(@Param('id') id: string, @Req() req: AuthRequest) {
    const { organizationId } = getAuthContext(req);

    if (!organizationId) {
      throw new BadRequestException('Organization ID is required');
    }

    const metric = await this.metricRepository.findOne({
      where: { id, organizationId },
    });

    if (!metric) {
      throw new BadRequestException(`Metric with ID ${id} not found`);
    }

    return this.responseService.success(metric);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update metric definition' })
  @ApiParam({ name: 'id', description: 'Metric ID', type: String })
  @ApiHeader({ name: 'x-workspace-id', description: 'Workspace ID (optional)', required: false })
  @ApiResponse({ status: 200, description: 'Metric updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Metric not found' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateMetricDto,
    @Req() req: AuthRequest,
    @Headers('x-workspace-id') workspaceId?: string,
  ) {
    const { organizationId } = getAuthContext(req);

    if (!organizationId) {
      throw new BadRequestException('Organization ID is required');
    }

    const metric = await this.metricRepository.findOne({
      where: { id, organizationId },
    });

    if (!metric) {
      throw new BadRequestException(`Metric with ID ${id} not found`);
    }

    Object.assign(metric, updateDto);
    if (updateDto.workspaceId !== undefined) {
      metric.workspaceId = updateDto.workspaceId || null;
    }

    const saved = await this.metricRepository.save(metric);
    return this.responseService.success(saved);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete metric definition' })
  @ApiParam({ name: 'id', description: 'Metric ID', type: String })
  @ApiResponse({ status: 200, description: 'Metric deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Metric not found' })
  async delete(@Param('id') id: string, @Req() req: AuthRequest) {
    const { organizationId } = getAuthContext(req);

    if (!organizationId) {
      throw new BadRequestException('Organization ID is required');
    }

    const metric = await this.metricRepository.findOne({
      where: { id, organizationId },
    });

    if (!metric) {
      throw new BadRequestException(`Metric with ID ${id} not found`);
    }

    await this.metricRepository.remove(metric);
    return this.responseService.success({ message: 'Metric deleted' });
  }
}

