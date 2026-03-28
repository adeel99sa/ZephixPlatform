import { Controller, Get, Param, Query, UseGuards, Req } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { WorkspaceRoleGuardService } from '../../workspace-access/workspace-role-guard.service';
import { KpiEnqueueService } from '../services/kpi-enqueue.service';
import { ProjectKpiValueEntity } from '../../kpis/entities/project-kpi-value.entity';
import { ComputeKpisQueryDto, ComputeStatusResponseDto } from '../dto/kpi-compute.dto';

interface AuthRequest {
  user?: { id: string; organizationId?: string };
}

/**
 * Wave 10: KPI compute status endpoint.
 * GET /status returns pending job info and lastComputedAt per KPI.
 * POST /compute is handled by ProjectKpisController (same route prefix).
 */
@UseGuards(JwtAuthGuard)
@Controller('work/workspaces/:wsId/projects/:projId/kpis/compute')
export class KpiComputeStatusController {
  constructor(
    private readonly enqueueService: KpiEnqueueService,
    private readonly workspaceRoleGuard: WorkspaceRoleGuardService,
    @InjectRepository(ProjectKpiValueEntity)
    private readonly kpiValueRepo: Repository<ProjectKpiValueEntity>,
  ) {}

  /**
   * GET /status — check compute status for a project.
   * Read access: all workspace members (same as GET /kpis/values).
   * Returns lastComputedAt per KPI and pending job status.
   */
  @Get('status')
  async getStatus(
    @Param('wsId') wsId: string,
    @Param('projId') projId: string,
    @Query() query: ComputeKpisQueryDto,
    @Req() req: AuthRequest,
  ): Promise<ComputeStatusResponseDto> {
    const user = req.user;
    if (!user?.id) throw new Error('Unauthenticated');

    await this.workspaceRoleGuard.requireWorkspaceRead(wsId, user.id);

    const asOfDate = query.asOf || new Date().toISOString().slice(0, 10);

    const jobStatus = await this.enqueueService.getJobStatus(wsId, projId, asOfDate);

    const values = await this.kpiValueRepo.find({
      where: { workspaceId: wsId, projectId: projId, asOfDate },
      relations: ['kpiDefinition'],
    });

    const lastComputedAt: Record<string, string | null> = {};
    for (const v of values) {
      const code = v.kpiDefinition?.code ?? v.kpiDefinitionId;
      lastComputedAt[code] = v.computedAt?.toISOString() ?? null;
    }

    return {
      pending: jobStatus.pending,
      jobId: jobStatus.jobId,
      lastComputedAt,
      lastFailure: null, // Wave 11: query failed jobs from BullMQ
    };
  }
}
