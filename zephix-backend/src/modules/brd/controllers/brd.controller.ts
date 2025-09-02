import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpStatus,
  UseGuards,
  Req,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { OrganizationGuard } from '../modules/organizations/guards/organization.guard';
import { CurrentOrg } from '../modules/organizations/decorators/current-org.decorator';
import { BRDService } from '../services/brd.service';
import { BRDAnalysisService } from '../services/brd-analysis.service';
import {
  CreateBRDDto,
  UpdateBRDDto,
  PublishBRDDto,
  BRDResponseDto,
  BRDListResponseDto,
  BRDCreateResponseDto,
  BRDUpdateResponseDto,
  AnalyzeBRDDto,
  GenerateProjectPlanDto,
  BRDAnalysisResponseDto,
  GeneratedProjectPlanResponseDto,
  BRDAnalysisListResponseDto,
  GeneratedProjectPlanListResponseDto,
} from '../dto';
import { BRDListQueryDto } from '../dto/brd-list-query.dto';
import { BRDStatus } from '../entities/brd.entity';

@ApiTags('BRD Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard) // Temporarily disabled OrganizationGuard
@Controller('pm/brds')
export class BRDController {
  constructor(
    private readonly brdService: BRDService,
    private readonly brdAnalysisService: BRDAnalysisService,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new BRD',
    description:
      'Creates a new Business Requirements Document with the provided payload structure',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'BRD created successfully',
    type: BRDCreateResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid payload structure or validation errors',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Authentication required',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  async create(
    @Body() createBRDDto: CreateBRDDto,
    @Req() req: any,
    @CurrentOrg() organizationId: string,
  ): Promise<BRDCreateResponseDto> {
    const brd = await this.brdService.create(createBRDDto);

    return {
      id: brd.id,
      version: brd.version,
      created_at: brd.created_at,
    };
  }

  @Get()
  @ApiOperation({
    summary: 'List BRDs with filtering and pagination',
    description:
      'Retrieves a paginated list of BRDs with optional filtering by status, project, and search query',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'BRDs retrieved successfully',
    type: BRDListResponseDto,
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 20)',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: BRDStatus,
    description: 'Filter by status',
  })
  @ApiQuery({
    name: 'project_id',
    required: false,
    type: String,
    description: 'Filter by project ID',
  })
  @ApiQuery({
    name: 'q',
    required: false,
    type: String,
    description: 'Search query for full-text search',
  })
  @ApiQuery({
    name: 'sort',
    required: false,
    type: String,
    description: 'Sort field (created_at, updated_at, version, status)',
  })
  @ApiQuery({
    name: 'order',
    required: false,
    enum: ['ASC', 'DESC'],
    description: 'Sort order',
  })
  async findAll(
    @Query() queryDto: BRDListQueryDto,
    @Req() req: any,
    @CurrentOrg() organizationId: string,
  ): Promise<BRDListResponseDto> {
    const options = {
      organizationId: organizationId,
      page: queryDto.page || 1,
      limit: queryDto.limit || 20,
      status: queryDto.status,
      project_id: queryDto.project_id,
      search: queryDto.q,
      sort: queryDto.sort || 'updated_at',
      order: queryDto.order || 'DESC',
    };

    const result = await this.brdService.findMany(options);

    return {
      data: result.data.map((brd) => this.mapToResponseDto(brd)),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }

  @Get('search')
  @ApiOperation({
    summary: 'Search BRDs using full-text search',
    description:
      'Performs a full-text search across BRD content using PostgreSQL full-text search',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Search results retrieved successfully',
    type: [BRDResponseDto],
  })
  @ApiQuery({
    name: 'q',
    required: true,
    type: String,
    description: 'Search query',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Maximum results (default: 10)',
  })
  async search(
    @Query('q') query: string,
    @Query('limit') limit: number = 10,
    @Req() req: any,
  ): Promise<BRDResponseDto[]> {
    const organizationId = req.user.organizationId;
    const brds = await this.brdService.search(organizationId, query, limit);

    return brds.map((brd) => this.mapToResponseDto(brd));
  }

  @Get('statistics')
  @ApiOperation({
    summary: 'Get BRD statistics for the tenant',
    description:
      'Retrieves summary statistics including counts by status and recent activity',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Statistics retrieved successfully',
  })
  async getStatistics(@Req() req: any) {
    const organizationId = req.user.organizationId;
    return this.brdService.getStatistics(organizationId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get BRD by ID',
    description: 'Retrieves a specific BRD by its unique identifier',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'BRD retrieved successfully',
    type: BRDResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'BRD not found',
  })
  @ApiParam({ name: 'id', type: String, description: 'BRD unique identifier' })
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: any,
  ): Promise<BRDResponseDto> {
    const organizationId = req.user.organizationId;
    const brd = await this.brdService.findById(id, organizationId);

    return this.mapToResponseDto(brd);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update BRD',
    description:
      'Updates an existing BRD with new payload data. Only draft and in-review BRDs can be updated.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'BRD updated successfully',
    type: BRDUpdateResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'BRD not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'BRD cannot be edited in current status',
  })
  @ApiParam({ name: 'id', type: String, description: 'BRD unique identifier' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateBRDDto: UpdateBRDDto,
    @Req() req: any,
  ): Promise<BRDUpdateResponseDto> {
    const organizationId = req.user.organizationId;
    const brd = await this.brdService.update(id, organizationId, updateBRDDto);

    return {
      id: brd.id,
      version: brd.version,
      updated_at: brd.updated_at,
    };
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete BRD',
    description: 'Deletes a BRD. Only draft BRDs can be deleted.',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'BRD deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'BRD not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Can only delete draft BRDs',
  })
  @ApiParam({ name: 'id', type: String, description: 'BRD unique identifier' })
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: any,
  ): Promise<void> {
    const organizationId = req.user.organizationId;
    await this.brdService.delete(id, organizationId);
  }

  @Post(':id/submit')
  @ApiOperation({
    summary: 'Submit BRD for review',
    description:
      'Submits a draft BRD for review. BRD must be complete before submission.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'BRD submitted for review successfully',
    type: BRDResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'BRD is not complete or cannot be submitted',
  })
  @ApiParam({ name: 'id', type: String, description: 'BRD unique identifier' })
  async submitForReview(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: any,
  ): Promise<BRDResponseDto> {
    const organizationId = req.user.organizationId;
    const brd = await this.brdService.submitForReview(id, organizationId);

    return this.mapToResponseDto(brd);
  }

  @Post(':id/approve')
  @ApiOperation({
    summary: 'Approve BRD',
    description: 'Approves a BRD that is in review status',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'BRD approved successfully',
    type: BRDResponseDto,
  })
  @ApiParam({ name: 'id', type: String, description: 'BRD unique identifier' })
  async approve(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: any,
  ): Promise<BRDResponseDto> {
    const organizationId = req.user.organizationId;
    const brd = await this.brdService.approve(id, organizationId);

    return this.mapToResponseDto(brd);
  }

  @Post(':id/publish')
  @ApiOperation({
    summary: 'Publish BRD',
    description: 'Publishes an approved BRD',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'BRD published successfully',
    type: BRDResponseDto,
  })
  @ApiParam({ name: 'id', type: String, description: 'BRD unique identifier' })
  async publish(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() publishDto: PublishBRDDto,
    @Req() req: any,
  ): Promise<BRDResponseDto> {
    const organizationId = req.user.organizationId;
    const brd = await this.brdService.publish(id, organizationId);

    return this.mapToResponseDto(brd);
  }

  @Post(':id/duplicate')
  @ApiOperation({
    summary: 'Duplicate BRD',
    description: 'Creates a copy of an existing BRD with optional new title',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'BRD duplicated successfully',
    type: BRDCreateResponseDto,
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'BRD unique identifier to duplicate',
  })
  async duplicate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { title?: string },
    @Req() req: any,
  ): Promise<BRDCreateResponseDto> {
    const organizationId = req.user.organizationId;
    const brd = await this.brdService.duplicate(id, organizationId, body.title);

    return {
      id: brd.id,
      version: brd.version,
      created_at: brd.created_at,
    };
  }

  @Get(':id/validation')
  @ApiOperation({
    summary: 'Get BRD validation summary',
    description:
      'Retrieves validation status and completion percentage for a BRD',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Validation summary retrieved successfully',
  })
  @ApiParam({ name: 'id', type: String, description: 'BRD unique identifier' })
  async getValidationSummary(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: any,
  ) {
    const organizationId = req.user.organizationId;
    return this.brdService.getValidationSummary(id, organizationId);
  }

  @Get('project/:projectId')
  @ApiOperation({
    summary: 'Get BRDs by project',
    description: 'Retrieves all BRDs associated with a specific project',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Project BRDs retrieved successfully',
    type: [BRDResponseDto],
  })
  @ApiParam({
    name: 'projectId',
    type: String,
    description: 'Project unique identifier',
  })
  async findByProject(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Req() req: any,
  ): Promise<BRDResponseDto[]> {
    const organizationId = req.user.organizationId;
    const brds = await this.brdService.findByProject(projectId, organizationId);

    return brds.map((brd) => this.mapToResponseDto(brd));
  }

  @Post(':id/analyze')
  @ApiOperation({
    summary: 'Analyze BRD with AI',
    description:
      'Performs AI-powered analysis of a BRD to extract key elements and insights',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'BRD analysis completed successfully',
    type: BRDAnalysisResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'BRD not found',
  })
  @ApiParam({ name: 'id', type: String, description: 'BRD unique identifier' })
  async analyzeBRD(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() analyzeDto: AnalyzeBRDDto,
    @Req() req: any,
  ): Promise<BRDAnalysisResponseDto> {
    const organizationId = req.user.organizationId;
    const userId = req.user.id;

    const analysis = await this.brdAnalysisService.analyzeBRD(
      id,
      organizationId,
      userId,
    );

    return this.mapToAnalysisResponseDto(analysis);
  }

  @Post('analysis/:analysisId/generate-plan')
  @ApiOperation({
    summary: 'Generate project plan from BRD analysis',
    description:
      'Generates a methodology-specific project plan based on BRD analysis results',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Project plan generated successfully',
    type: GeneratedProjectPlanResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'BRD analysis not found',
  })
  @ApiParam({
    name: 'analysisId',
    type: String,
    description: 'BRD analysis unique identifier',
  })
  async generateProjectPlan(
    @Param('analysisId', ParseUUIDPipe) analysisId: string,
    @Body() generateDto: GenerateProjectPlanDto,
    @Req() req: any,
  ): Promise<GeneratedProjectPlanResponseDto> {
    const organizationId = req.user.organizationId;
    const userId = req.user.id;

    // Get the analysis first
    const analysis = await this.brdAnalysisService.getAnalysisById(
      analysisId,
      organizationId,
    );

    const projectPlan = await this.brdAnalysisService.generateProjectPlan(
      {
        id: analysis.id,
        extractedElements: analysis.extractedElements,
        analysisMetadata: analysis.analysisMetadata,
      },
      generateDto.methodology,
      organizationId,
      userId,
    );

    return this.mapToProjectPlanResponseDto(projectPlan);
  }

  @Get('analysis/:analysisId')
  @ApiOperation({
    summary: 'Get BRD analysis by ID',
    description: 'Retrieves a specific BRD analysis by its unique identifier',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'BRD analysis retrieved successfully',
    type: BRDAnalysisResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'BRD analysis not found',
  })
  @ApiParam({
    name: 'analysisId',
    type: String,
    description: 'BRD analysis unique identifier',
  })
  async getAnalysisById(
    @Param('analysisId', ParseUUIDPipe) analysisId: string,
    @Req() req: any,
  ): Promise<BRDAnalysisResponseDto> {
    const organizationId = req.user.organizationId;
    const analysis = await this.brdAnalysisService.getAnalysisById(
      analysisId,
      organizationId,
    );

    return this.mapToAnalysisResponseDto(analysis);
  }

  @Get('analysis/:analysisId/project-plans')
  @ApiOperation({
    summary: 'Get project plans by BRD analysis',
    description:
      'Retrieves all project plans generated from a specific BRD analysis',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Project plans retrieved successfully',
    type: GeneratedProjectPlanListResponseDto,
  })
  @ApiParam({
    name: 'analysisId',
    type: String,
    description: 'BRD analysis unique identifier',
  })
  async getProjectPlansByAnalysis(
    @Param('analysisId', ParseUUIDPipe) analysisId: string,
    @Req() req: any,
  ): Promise<GeneratedProjectPlanListResponseDto> {
    const organizationId = req.user.organizationId;
    const plans = await this.brdAnalysisService.listGeneratedPlansByAnalysis(
      analysisId,
      organizationId,
    );

    return {
      data: plans.map((plan) => this.mapToProjectPlanResponseDto(plan)),
      total: plans.length,
      page: 1,
      limit: plans.length,
      totalPages: 1,
    };
  }

  @Get(':id/analyses')
  @ApiOperation({
    summary: 'Get BRD analyses by BRD ID',
    description: 'Retrieves all analyses performed on a specific BRD',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'BRD analyses retrieved successfully',
    type: BRDAnalysisListResponseDto,
  })
  @ApiParam({ name: 'id', type: String, description: 'BRD unique identifier' })
  async getAnalysesByBRD(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: any,
  ): Promise<BRDAnalysisListResponseDto> {
    const organizationId = req.user.organizationId;
    const analyses = await this.brdAnalysisService.listAnalysesByBRD(
      id,
      organizationId,
    );

    return {
      data: analyses.map((analysis) => this.mapToAnalysisResponseDto(analysis)),
      total: analyses.length,
      page: 1,
      limit: analyses.length,
      totalPages: 1,
    };
  }

  @Get('project-plans/:planId')
  @ApiOperation({
    summary: 'Get generated project plan by ID',
    description:
      'Retrieves a specific generated project plan by its unique identifier',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Project plan retrieved successfully',
    type: GeneratedProjectPlanResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Project plan not found',
  })
  @ApiParam({
    name: 'planId',
    type: String,
    description: 'Project plan unique identifier',
  })
  async getProjectPlanById(
    @Param('planId', ParseUUIDPipe) planId: string,
    @Req() req: any,
  ): Promise<GeneratedProjectPlanResponseDto> {
    const organizationId = req.user.organizationId;
    const plan = await this.brdAnalysisService.getGeneratedPlanById(
      planId,
      organizationId,
    );

    return this.mapToProjectPlanResponseDto(plan);
  }

  /**
   * Helper method to map BRD entity to response DTO
   */
  private mapToResponseDto(brd: any): BRDResponseDto {
    return {
      id: brd.id,
      organizationId: brd.organizationId,
      project_id: brd.project_id,
      version: brd.version,
      status: brd.status,
      payload: brd.payload,
      created_at: brd.created_at,
      updated_at: brd.updated_at,
      title: brd.getTitle(),
      summary: brd.getSummary(),
      industry: brd.getIndustry(),
      department: brd.getDepartment(),
    };
  }

  /**
   * Helper method to map BRD analysis entity to response DTO
   */
  private mapToAnalysisResponseDto(analysis: any): BRDAnalysisResponseDto {
    return {
      id: analysis.id,
      brdId: analysis.brdId,
      extractedElements: analysis.extractedElements,
      analysisMetadata: analysis.analysisMetadata,
      analyzedBy: analysis.analyzedBy,
      createdAt: analysis.createdAt,
      updatedAt: analysis.updatedAt,
    };
  }

  /**
   * Helper method to map generated project plan entity to response DTO
   */
  private mapToProjectPlanResponseDto(
    plan: any,
  ): GeneratedProjectPlanResponseDto {
    return {
      id: plan.id,
      brdAnalysisId: plan.brdAnalysisId,
      organizationId: plan.organizationId,
      methodology: plan.methodology,
      planStructure: plan.planStructure,
      resourcePlan: plan.resourcePlan,
      riskRegister: plan.riskRegister,
      generationMetadata: plan.generationMetadata,
      generatedBy: plan.generatedBy,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
    };
  }
}
