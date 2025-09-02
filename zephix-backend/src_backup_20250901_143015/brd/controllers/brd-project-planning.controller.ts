import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { OrganizationGuard } from '../modules/organizations/guards/organization.guard';
import { CurrentOrg } from '../modules/organizations/decorators/current-org.decorator';
import { CurrentUser } from '../../modules/auth/decorators/current-user.decorator';
import { BRDAnalysisService } from '../services/brd-analysis.service';
import { BRDService } from '../services/brd.service';
import {
  RefinePlanDto,
  CreateProjectFromPlanDto,
  ProjectPlanRefinementResponseDto,
  ProjectCreationResponseDto,
} from '../dto/brd-project-planning.dto';
import {
  BRDAnalysisResponseDto,
  GenerateProjectPlanDto,
} from '../dto/brd-analysis.dto';
import { GeneratedProjectPlanResponseDto } from '../dto/brd-response.dto';

@ApiTags('BRD Project Planning')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard) // Temporarily disabled OrganizationGuard
@Controller('pm/brd/project-planning')
export class BRDProjectPlanningController {
  constructor(
    private brdAnalysisService: BRDAnalysisService,
    private brdService: BRDService,
  ) {}

  @Post(':brdId/analyze')
  @ApiOperation({
    summary: 'Analyze BRD for project planning',
    description:
      'Performs comprehensive analysis of a BRD to extract key elements for project planning',
  })
  @ApiParam({ name: 'brdId', description: 'ID of the BRD to analyze' })
  @ApiResponse({
    status: 200,
    description: 'BRD analysis completed successfully',
    type: BRDAnalysisResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'BRD not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid BRD ID or analysis failed',
  })
  async analyzeBRD(
    @Param('brdId', ParseUUIDPipe) brdId: string,
    @CurrentOrg() orgId: string,
    @CurrentUser() user: any,
  ) {
    return this.brdAnalysisService.analyzeBRD(brdId, orgId, user.id);
  }

  @Post(':brdId/generate-plan')
  @ApiOperation({
    summary: 'Generate project plan from BRD analysis',
    description:
      'Creates a comprehensive project plan based on BRD analysis and specified methodology',
  })
  @ApiParam({ name: 'brdId', description: 'ID of the BRD' })
  @ApiResponse({
    status: 201,
    description: 'Project plan generated successfully',
    type: GeneratedProjectPlanResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'BRD or analysis not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid methodology or generation failed',
  })
  async generateProjectPlan(
    @Param('brdId', ParseUUIDPipe) brdId: string,
    @Body() dto: GenerateProjectPlanDto,
    @CurrentOrg() orgId: string,
    @CurrentUser() user: any,
  ) {
    const analysis = await this.brdAnalysisService.getLatestAnalysis(brdId);
    return this.brdAnalysisService.generateProjectPlan(
      analysis,
      dto.methodology,
      orgId,
      user.id,
    );
  }

  @Get(':brdId/analysis')
  @ApiOperation({
    summary: 'Get BRD analysis results',
    description: 'Retrieves all analysis results for a specific BRD',
  })
  @ApiParam({ name: 'brdId', description: 'ID of the BRD' })
  @ApiResponse({
    status: 200,
    description: 'BRD analysis results retrieved successfully',
    type: [BRDAnalysisResponseDto],
  })
  @ApiResponse({
    status: 404,
    description: 'BRD not found',
  })
  async getBRDAnalysis(
    @Param('brdId', ParseUUIDPipe) brdId: string,
    @CurrentOrg() orgId: string,
  ) {
    return this.brdAnalysisService.getAnalysisByBRD(brdId, orgId);
  }

  @Get(':brdId/plans')
  @ApiOperation({
    summary: 'Get generated project plans',
    description: 'Retrieves all generated project plans for a specific BRD',
  })
  @ApiParam({ name: 'brdId', description: 'ID of the BRD' })
  @ApiResponse({
    status: 200,
    description: 'Generated project plans retrieved successfully',
    type: [GeneratedProjectPlanResponseDto],
  })
  @ApiResponse({
    status: 404,
    description: 'BRD not found',
  })
  async getGeneratedPlans(
    @Param('brdId', ParseUUIDPipe) brdId: string,
    @CurrentOrg() orgId: string,
  ) {
    return this.brdAnalysisService.getGeneratedPlans(brdId, orgId);
  }

  @Post('plans/:planId/refine')
  @ApiOperation({
    summary: 'Refine project plan',
    description: 'Refines an existing project plan based on refinement request',
  })
  @ApiParam({ name: 'planId', description: 'ID of the project plan to refine' })
  @ApiResponse({
    status: 200,
    description: 'Project plan refined successfully',
    type: ProjectPlanRefinementResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Project plan not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid refinement request',
  })
  async refinePlan(
    @Param('planId', ParseUUIDPipe) planId: string,
    @Body() dto: RefinePlanDto,
    @CurrentOrg() orgId: string,
  ) {
    const refinedPlan = await this.brdAnalysisService.refinePlan(
      planId,
      dto.refinementRequest,
    );

    return {
      id: refinedPlan.id,
      originalPlanId: planId,
      refinementRequest: dto.refinementRequest,
      refinedPlanStructure: refinedPlan.planStructure,
      changesMade: refinedPlan.changesMade || [],
      createdAt: refinedPlan.createdAt,
    };
  }

  @Post('plans/:planId/create-project')
  @ApiOperation({
    summary: 'Create project from plan',
    description: 'Creates a new project based on a generated project plan',
  })
  @ApiParam({ name: 'planId', description: 'ID of the project plan' })
  @ApiResponse({
    status: 201,
    description: 'Project created successfully from plan',
    type: ProjectCreationResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Project plan not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid project data or creation failed',
  })
  async createProjectFromPlan(
    @Param('planId', ParseUUIDPipe) planId: string,
    @Body() dto: CreateProjectFromPlanDto,
    @CurrentOrg() orgId: string,
    @CurrentUser() user: any,
  ) {
    const result = await this.brdAnalysisService.createProjectFromPlan(
      planId,
      dto,
      orgId,
      user.id,
    );

    return {
      projectId: result.id,
      projectName: result.name,
      status: 'success',
      message: 'Project successfully created from plan',
      createdAt: result.createdAt,
    };
  }
}
