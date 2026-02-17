import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
  ValidationPipe,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { WorkspaceRoleGuardService } from '../../workspace-access/workspace-role-guard.service';
import { KpiDefinitionsService } from '../services/kpi-definitions.service';
import { ProjectKpiConfigsService } from '../services/project-kpi-configs.service';
import { ProjectKpiValuesService } from '../services/project-kpi-values.service';
import { ProjectKpiComputeService } from '../services/project-kpi-compute.service';
import { UpdateKpiConfigDto } from '../dto/update-kpi-config.dto';
import { UpdateSingleKpiConfigDto } from '../dto/update-single-kpi-config.dto';
import { GetKpiValuesQuery } from '../dto/get-kpi-values.query';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from '../../projects/entities/project.entity';

interface AuthRequest {
  user?: {
    userId: string;
    organizationId: string;
    platformRole?: string;
  };
}

function getAuthContext(req: AuthRequest) {
  const user = req.user;
  if (!user) throw new Error('Unauthenticated');
  return { userId: user.userId, organizationId: user.organizationId };
}

@Controller('work/workspaces/:workspaceId/projects/:projectId/kpis')
@UseGuards(JwtAuthGuard)
export class ProjectKpisController {
  constructor(
    private readonly definitionsService: KpiDefinitionsService,
    private readonly configsService: ProjectKpiConfigsService,
    private readonly valuesService: ProjectKpiValuesService,
    private readonly computeService: ProjectKpiComputeService,
    private readonly workspaceRoleGuard: WorkspaceRoleGuardService,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
  ) {}

  /**
   * GET /definitions — list all KPI definitions from the registry.
   * Read access: all workspace members.
   */
  @Get('definitions')
  async getDefinitions(
    @Param('workspaceId') workspaceId: string,
    @Req() req: AuthRequest,
    @Query('includeDisabledByGovernance') includeDisabled?: string,
  ) {
    const auth = getAuthContext(req);
    await this.workspaceRoleGuard.requireWorkspaceRead(
      workspaceId,
      auth.userId,
    );

    const include = includeDisabled !== 'false';
    const definitions = await this.definitionsService.listDefinitions(
      include,
      auth.organizationId,
    );
    return { data: definitions };
  }

  /**
   * GET /config — list project KPI configs (auto-creates defaults).
   * Read access: all workspace members.
   */
  @Get('config')
  async getConfig(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Req() req: AuthRequest,
  ) {
    const auth = getAuthContext(req);
    await this.workspaceRoleGuard.requireWorkspaceRead(
      workspaceId,
      auth.userId,
    );

    const configs = await this.configsService.getConfigs(
      workspaceId,
      projectId,
    );
    return { data: configs };
  }

  /**
   * PATCH /config — upsert KPI configs.
   * Write access: OWNER/ADMIN only.
   */
  @Patch('config')
  async updateConfig(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    dto: UpdateKpiConfigDto,
    @Req() req: AuthRequest,
  ) {
    const auth = getAuthContext(req);
    await this.workspaceRoleGuard.requireWorkspaceWrite(
      workspaceId,
      auth.userId,
    );

    const project = await this.projectRepo.findOne({
      where: { id: projectId },
    });

    const flags: Record<string, boolean> = {
      iterationsEnabled: project?.iterationsEnabled ?? false,
      costTrackingEnabled: project?.costTrackingEnabled ?? false,
      baselinesEnabled: project?.baselinesEnabled ?? false,
      earnedValueEnabled: project?.earnedValueEnabled ?? false,
      capacityEnabled: project?.capacityEnabled ?? false,
      changeManagementEnabled: project?.changeManagementEnabled ?? false,
    };

    const configs = await this.configsService.upsertConfigs(
      workspaceId,
      projectId,
      dto.items,
      flags,
    );
    return { data: configs };
  }

  /**
   * PATCH /configs/:kpiDefinitionId — update a single KPI config.
   * Write access: OWNER/ADMIN only.
   */
  @Patch('configs/:kpiDefinitionId')
  async updateSingleConfig(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Param('kpiDefinitionId') kpiDefinitionId: string,
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    dto: UpdateSingleKpiConfigDto,
    @Req() req: AuthRequest,
  ) {
    const auth = getAuthContext(req);
    await this.workspaceRoleGuard.requireWorkspaceWrite(
      workspaceId,
      auth.userId,
    );

    const project = await this.projectRepo.findOne({
      where: { id: projectId },
    });

    const flags: Record<string, boolean> = {
      iterationsEnabled: project?.iterationsEnabled ?? false,
      costTrackingEnabled: project?.costTrackingEnabled ?? false,
      baselinesEnabled: project?.baselinesEnabled ?? false,
      earnedValueEnabled: project?.earnedValueEnabled ?? false,
      capacityEnabled: project?.capacityEnabled ?? false,
      changeManagementEnabled: project?.changeManagementEnabled ?? false,
    };

    const config = await this.configsService.upsertSingleConfig(
      workspaceId,
      projectId,
      kpiDefinitionId,
      {
        enabled: dto.enabled,
        targetValue: dto.targetValue,
        thresholdsJson: dto.thresholdsJson,
      },
      flags,
      auth.organizationId,
    );
    return { data: config };
  }

  /**
   * POST /compute — trigger computation for enabled KPIs.
   * Compute access: OWNER/ADMIN/MEMBER.
   */
  @Post('compute')
  async compute(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Req() req: AuthRequest,
  ) {
    const auth = getAuthContext(req);
    await this.requireComputeAccess(workspaceId, auth.userId);

    const result = await this.computeService.computeForProject(
      workspaceId,
      projectId,
    );
    return {
      data: {
        computed: result.computed,
        skipped: result.skipped,
      },
    };
  }

  /**
   * GET /values — query KPI values by date range.
   * Read access: all workspace members.
   */
  @Get('values')
  async getValues(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Query(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
    query: GetKpiValuesQuery,
    @Req() req: AuthRequest,
  ) {
    const auth = getAuthContext(req);
    await this.workspaceRoleGuard.requireWorkspaceRead(
      workspaceId,
      auth.userId,
    );

    const today = new Date().toISOString().slice(0, 10);
    const from = query.from ?? today;
    const to = query.to ?? today;

    const values = await this.valuesService.getValues(
      workspaceId,
      projectId,
      from,
      to,
    );
    return { data: values };
  }

  /**
   * Compute requires at least workspace_member role.
   * write roles (delivery_owner, workspace_owner) and workspace_member can compute.
   */
  private async requireComputeAccess(
    workspaceId: string,
    userId: string,
  ): Promise<void> {
    const role = await this.workspaceRoleGuard.getWorkspaceRole(
      workspaceId,
      userId,
    );
    if (!role) {
      throw new ForbiddenException({
        code: 'FORBIDDEN_ROLE',
        message: 'Not a member of this workspace',
      });
    }
    const allowedRoles = [
      'workspace_owner',
      'delivery_owner',
      'workspace_member',
    ];
    if (!allowedRoles.includes(role)) {
      throw new ForbiddenException({
        code: 'FORBIDDEN_ROLE',
        message: 'Compute requires at least workspace_member role',
      });
    }
  }
}
