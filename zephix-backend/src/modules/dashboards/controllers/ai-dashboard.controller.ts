import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  BadRequestException,
  Headers,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiHeader,
} from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, IsUUID, IsEnum } from 'class-validator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ResponseService } from '../../../shared/services/response.service';
import { AuthRequest } from '../../../common/http/auth-request';
import { getAuthContext } from '../../../common/http/get-auth-context';
import { WorkspaceScopeHelper } from '../../resources/helpers/workspace-scope.helper';
import { TenantContextService } from '../../tenancy/tenant-context.service';
import { WorkspaceAccessService } from '../../workspace-access/workspace-access.service';
import { DashboardPersona } from '../entities/dashboard-template.entity';
import { DashboardVisibility } from '../entities/dashboard.entity';
import { isWidgetKeyAllowed, WIDGET_ALLOWLIST } from '../widgets/widget-allowlist';

class SuggestDto {
  persona: DashboardPersona;
  methodology?: string;
  workspaceId?: string;
}

class GenerateDto {
  @Transform(({ value, obj }) => value ?? obj.prompt ?? obj.userPrompt ?? obj.text ?? obj.description ?? obj.query)
  @IsString()
  @IsNotEmpty()
  prompt: string;

  @IsEnum(DashboardPersona)
  @IsOptional()
  persona?: DashboardPersona;

  @IsUUID()
  @IsOptional()
  workspaceId?: string;
}

@Controller('ai/dashboards')
@ApiTags('ai-dashboards')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AiDashboardController {
  private readonly logger = new Logger(AiDashboardController.name);

  constructor(
    private readonly responseService: ResponseService,
    private readonly tenantContextService: TenantContextService,
    private readonly workspaceAccessService: WorkspaceAccessService,
  ) {}

  @Post('suggest')
  @ApiOperation({ summary: 'Suggest dashboard template and widgets based on persona' })
  @ApiHeader({ name: 'x-workspace-id', description: 'Workspace ID (optional)', required: false })
  @ApiResponse({ status: 200, description: 'Suggestions retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async suggest(
    @Body() dto: SuggestDto,
    @Req() req: AuthRequest,
    @Headers('x-workspace-id') workspaceId?: string,
  ) {
    const { organizationId, userId, platformRole } = getAuthContext(req);

    if (!organizationId) {
      throw new BadRequestException('Organization ID is required');
    }

    // Validate workspace access if provided
    const effectiveWorkspaceId = dto.workspaceId || workspaceId;
    if (effectiveWorkspaceId) {
      await WorkspaceScopeHelper.getValidatedWorkspaceId(
        this.tenantContextService,
        this.workspaceAccessService,
        organizationId,
        userId,
        platformRole,
        true,
      );
    }

    // Rules-based template suggestion (no LLM yet)
    let templateKey: string;
    const widgetSuggestions: string[] = [];

    switch (dto.persona) {
      case DashboardPersona.RESOURCE_MANAGER:
        templateKey = 'resource_utilization_conflicts';
        widgetSuggestions.push('resource_utilization', 'conflict_trends');
        break;
      case DashboardPersona.PMO:
        templateKey = 'pmo_delivery_health';
        widgetSuggestions.push('project_health', 'budget_variance', 'risk_summary');
        break;
      case DashboardPersona.EXEC:
        templateKey = 'exec_overview';
        widgetSuggestions.push('portfolio_summary', 'program_summary', 'risk_summary');
        break;
      case DashboardPersona.PROGRAM_MANAGER:
        templateKey = 'program_rollup';
        widgetSuggestions.push('program_summary', 'project_health', 'resource_utilization');
        break;
      case DashboardPersona.PROJECT_MANAGER:
        if (dto.methodology === 'AGILE' || dto.methodology === 'SCRUM') {
          templateKey = 'pm_agile_sprint';
          widgetSuggestions.push('sprint_metrics', 'project_health', 'resource_utilization');
        } else {
          templateKey = 'pmo_delivery_health';
          widgetSuggestions.push('project_health', 'budget_variance', 'risk_summary');
        }
        break;
      case DashboardPersona.DELIVERY_LEAD:
        templateKey = 'pmo_delivery_health';
        widgetSuggestions.push('project_health', 'budget_variance', 'resource_utilization');
        break;
      default:
        templateKey = 'pmo_delivery_health';
        widgetSuggestions.push('project_health');
    }

    return this.responseService.success({
      templateKey,
      widgetSuggestions,
    });
  }

  @Post('generate')
  @ApiOperation({ summary: 'Generate dashboard configuration from prompt' })
  @ApiHeader({ name: 'x-workspace-id', description: 'Workspace ID (required)', required: true })
  @ApiResponse({ status: 200, description: 'Dashboard configuration generated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - invalid prompt or schema' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Workspace ID required or access denied' })
  async generate(
    @Body() dto: GenerateDto,
    @Req() req: AuthRequest,
    @Headers('x-workspace-id') workspaceId?: string,
  ) {
    // Debug logging (remove after confirmation)
    this.logger.log(`AI generate payload keys: ${Object.keys(dto || {}).join(',')}`);
    this.logger.log(`AI generate prompt length: ${(dto?.prompt || '').length}`);

    const { organizationId, userId, platformRole } = getAuthContext(req);

    if (!organizationId) {
      throw new BadRequestException('Organization ID is required');
    }

    if (!dto.prompt || dto.prompt.trim().length === 0) {
      throw new BadRequestException('Prompt is required');
    }

    // Require x-workspace-id header
    const effectiveWorkspaceId = dto.workspaceId || workspaceId;
    if (!effectiveWorkspaceId) {
      throw new ForbiddenException('Workspace ID is required. Include x-workspace-id header.');
    }

    await WorkspaceScopeHelper.getValidatedWorkspaceId(
      this.tenantContextService,
      this.workspaceAccessService,
      organizationId,
      userId,
      platformRole,
      true,
    );

    // Keyword matching (no free-form, deterministic)
    const promptLower = dto.prompt.toLowerCase();
    const widgets: Array<{
      widgetKey: string;
      title: string;
      config: Record<string, any>;
      layout: { x: number; y: number; w: number; h: number };
    }> = [];

    let x = 0;
    let y = 0;
    const widgetWidth = 4;
    const widgetHeight = 3;

    // Always include project_health
    widgets.push({
      widgetKey: 'project_health',
      title: 'Project Health',
      config: {},
      layout: { x: x, y: y, w: widgetWidth, h: widgetHeight },
    });
    x += widgetWidth;
    if (x >= 12) {
      x = 0;
      y += widgetHeight;
    }

    // Keyword-based widget inclusion
    if (promptLower.includes('utilization')) {
      widgets.push({
        widgetKey: 'resource_utilization',
        title: 'Resource Utilization',
        config: {},
        layout: { x: x, y: y, w: widgetWidth, h: widgetHeight },
      });
      x += widgetWidth;
      if (x >= 12) {
        x = 0;
        y += widgetHeight;
      }
    }

    if (promptLower.includes('conflict')) {
      widgets.push({
        widgetKey: 'conflict_trends',
        title: 'Conflict Trends',
        config: {},
        layout: { x: x, y: y, w: widgetWidth, h: widgetHeight },
      });
      x += widgetWidth;
      if (x >= 12) {
        x = 0;
        y += widgetHeight;
      }
    }

    if (promptLower.includes('portfolio')) {
      widgets.push({
        widgetKey: 'portfolio_summary',
        title: 'Portfolio Summary',
        config: {},
        layout: { x: x, y: y, w: widgetWidth, h: widgetHeight },
      });
      x += widgetWidth;
      if (x >= 12) {
        x = 0;
        y += widgetHeight;
      }
    }

    if (promptLower.includes('program')) {
      widgets.push({
        widgetKey: 'program_summary',
        title: 'Program Summary',
        config: {},
        layout: { x: x, y: y, w: widgetWidth, h: widgetHeight },
      });
      x += widgetWidth;
      if (x >= 12) {
        x = 0;
        y += widgetHeight;
      }
    }

    // Validate all widget keys are in allowlist
    for (const widget of widgets) {
      if (!isWidgetKeyAllowed(widget.widgetKey)) {
        throw new BadRequestException(
          `Invalid widget key: ${widget.widgetKey}. Must be one of: ${WIDGET_ALLOWLIST.join(', ')}`,
        );
      }
    }

    // Validate layout structure
    for (const widget of widgets) {
      if (
        typeof widget.layout.x !== 'number' ||
        typeof widget.layout.y !== 'number' ||
        typeof widget.layout.w !== 'number' ||
        typeof widget.layout.h !== 'number'
      ) {
        throw new BadRequestException(
          `Invalid layout for widget ${widget.widgetKey}. Layout must have numeric x, y, w, h`,
        );
      }
    }

    // Generate dashboard patch
    const dashboardPatch = {
      name: `Dashboard: ${dto.prompt.substring(0, 50)}`,
      visibility: DashboardVisibility.WORKSPACE,
      widgets,
    };

    return this.responseService.success(dashboardPatch);
  }
}

