import {
  Controller,
  Get,
  Post,
  UseGuards,
  Req,
  Body,
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
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ResponseService } from '../../../shared/services/response.service';
import { AuthRequest } from '../../../common/http/auth-request';
import { getAuthContext } from '../../../common/http/get-auth-context';
import { WorkRisksService } from '../services/work-risks.service';
import { CreateWorkRiskDto, ListWorkRisksQueryDto } from '../dto';
import { RiskSeverity, RiskStatus } from '../entities/work-risk.entity';

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

@Controller('work/risks')
@ApiTags('Work Management - Risks')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WorkRisksController {
  constructor(
    private readonly workRisksService: WorkRisksService,
    private readonly responseService: ResponseService,
  ) {}

  // GET /api/work/risks
  @Get()
  @ApiOperation({ summary: 'List project risks' })
  @ApiHeader({
    name: 'x-workspace-id',
    description: 'Workspace ID',
    required: true,
  })
  @ApiQuery({ name: 'projectId', required: true, type: String })
  @ApiQuery({ name: 'severity', required: false, enum: RiskSeverity })
  @ApiQuery({ name: 'status', required: false, enum: RiskStatus })
  @ApiResponse({ status: 200, description: 'List of risks' })
  @ApiResponse({ status: 403, description: 'Workspace access denied' })
  async listRisks(
    @Req() req: AuthRequest,
    @Headers('x-workspace-id') workspaceId: string,
    @Query() query: ListWorkRisksQueryDto,
  ) {
    const wsId = validateWorkspaceId(workspaceId);
    const auth = getAuthContext(req);

    const result = await this.workRisksService.listRisks(auth, wsId, query);

    return this.responseService.success(result);
  }

  // POST /api/work/risks
  @Post()
  @ApiOperation({ summary: 'Create a risk' })
  @ApiHeader({
    name: 'x-workspace-id',
    description: 'Workspace ID',
    required: true,
  })
  @ApiResponse({ status: 201, description: 'Risk created' })
  @ApiResponse({ status: 403, description: 'Write access denied' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async createRisk(
    @Req() req: AuthRequest,
    @Headers('x-workspace-id') workspaceId: string,
    @Body() dto: CreateWorkRiskDto,
  ) {
    const wsId = validateWorkspaceId(workspaceId);
    const auth = getAuthContext(req);

    const risk = await this.workRisksService.createRisk(auth, wsId, dto);

    return this.responseService.success(risk);
  }
}
