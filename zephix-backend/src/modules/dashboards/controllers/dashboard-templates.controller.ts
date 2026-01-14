import {
  Controller,
  Get,
  Post,
  UseGuards,
  Req,
  Body,
  BadRequestException,
  Headers,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiHeader,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TemplatesService } from '../services/templates.service';
import { ActivateTemplateDto } from '../dto/activate-template.dto';
import { ResponseService } from '../../../shared/services/response.service';
import { AuthRequest } from '../../../common/http/auth-request';
import { getAuthContext } from '../../../common/http/get-auth-context';
import { normalizePlatformRole } from '../../../shared/enums/platform-roles.enum';

@Controller('dashboards')
@ApiTags('dashboard-templates')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DashboardTemplatesController {
  constructor(
    private readonly templatesService: TemplatesService,
    private readonly responseService: ResponseService,
  ) {}

  // GET /api/dashboards/templates (static route before :id)
  @Get('templates')
  @ApiOperation({ summary: 'List dashboard templates' })
  @ApiResponse({ status: 200, description: 'Templates retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async listTemplates(@Req() req: AuthRequest) {
    const { organizationId } = getAuthContext(req);

    if (!organizationId) {
      throw new BadRequestException('Organization ID is required');
    }

    const templates = await this.templatesService.listTemplates(organizationId);
    return this.responseService.success(templates);
  }

  // POST /api/dashboards/activate-template (static route before :id)
  @Post('activate-template')
  @ApiOperation({ summary: 'Activate a dashboard template' })
  @ApiHeader({
    name: 'x-workspace-id',
    description: 'Workspace ID (required for WORKSPACE templates)',
    required: false,
  })
  @ApiResponse({ status: 201, description: 'Template activated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - workspace access denied',
  })
  async activateTemplate(
    @Body() activateDto: ActivateTemplateDto,
    @Req() req: AuthRequest,
  ) {
    const { organizationId, userId, platformRole } = getAuthContext(req);

    if (!organizationId || !userId) {
      throw new BadRequestException('Organization ID and User ID are required');
    }

    // Service validates workspace access using DTO workspaceId, not header
    const dashboard = await this.templatesService.activateTemplate(
      activateDto,
      organizationId,
      userId,
      normalizePlatformRole(platformRole),
    );

    return this.responseService.success(dashboard);
  }
}
