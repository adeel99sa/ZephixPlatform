import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import {
  TenantAwareRepository,
  getTenantAwareRepositoryToken,
} from '../../tenancy/tenancy.module';
import { WorkspaceAccessService } from '../../workspace-access/workspace-access.service';
import { WorkspaceRoleGuardService } from '../../workspace-access/workspace-role-guard.service';
import {
  WorkRisk,
  RiskSeverity,
  RiskStatus,
} from '../entities/work-risk.entity';
import { CreateWorkRiskDto, ListWorkRisksQueryDto } from '../dto';
import { TenantContextService } from '../../tenancy/tenant-context.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Project } from '../../projects/entities/project.entity';

interface AuthContext {
  organizationId: string;
  userId: string;
  platformRole?: string;
}

@Injectable()
export class WorkRisksService {
  constructor(
    @Inject(getTenantAwareRepositoryToken(WorkRisk))
    private readonly riskRepo: TenantAwareRepository<WorkRisk>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    private readonly workspaceAccessService: WorkspaceAccessService,
    private readonly workspaceRoleGuard: WorkspaceRoleGuardService,
    private readonly tenantContext: TenantContextService,
  ) {}

  // ============================================================
  // WORKSPACE SCOPE HELPERS - Centralized tenant safety
  // ============================================================

  /**
   * Assert workspace access for the current user.
   * Always throws 403 WORKSPACE_REQUIRED if:
   * - workspaceId is missing
   * - user doesn't have access to the workspace
   * - workspace doesn't belong to user's organization
   */
  private async assertWorkspaceAccess(
    auth: AuthContext,
    workspaceId: string | undefined | null,
  ): Promise<string> {
    if (!workspaceId) {
      throw new ForbiddenException({
        code: 'WORKSPACE_REQUIRED',
        message: 'Workspace ID is required. Include x-workspace-id header.',
      });
    }

    const organizationId = this.tenantContext.assertOrganizationId();
    const hasAccess = await this.workspaceAccessService.canAccessWorkspace(
      workspaceId,
      organizationId,
      auth.userId,
      auth.platformRole,
    );

    if (!hasAccess) {
      throw new ForbiddenException({
        code: 'WORKSPACE_REQUIRED',
        message: 'Access denied to workspace',
      });
    }

    return workspaceId;
  }

  /**
   * Assert write access (admin or member with write).
   * Viewers cannot create/update/delete.
   * Platform ADMINs can always write.
   */
  private async assertWriteAccess(
    auth: AuthContext,
    workspaceId: string,
  ): Promise<void> {
    // Platform ADMINs can always write
    if (auth.platformRole === 'ADMIN') {
      return;
    }

    // Use workspace role guard to check write access
    await this.workspaceRoleGuard.requireWorkspaceWrite(
      workspaceId,
      auth.userId,
    );
  }

  // ============================================================
  // LIST RISKS
  // ============================================================

  async listRisks(
    auth: AuthContext,
    workspaceId: string,
    query: ListWorkRisksQueryDto,
  ): Promise<{ items: WorkRisk[]; total: number }> {
    await this.assertWorkspaceAccess(auth, workspaceId);
    const organizationId = this.tenantContext.assertOrganizationId();

    const qb = this.riskRepo
      .createQueryBuilder('risk')
      .where('risk.organizationId = :organizationId', { organizationId })
      .andWhere('risk.workspaceId = :workspaceId', { workspaceId })
      .andWhere('risk.projectId = :projectId', { projectId: query.projectId })
      .andWhere('risk.deletedAt IS NULL');

    if (query.severity) {
      qb.andWhere('risk.severity = :severity', { severity: query.severity });
    }

    if (query.status) {
      qb.andWhere('risk.status = :status', { status: query.status });
    }

    qb.orderBy('risk.updatedAt', 'DESC');

    const [items, total] = await qb.getManyAndCount();

    return { items, total };
  }

  // ============================================================
  // CREATE RISK
  // ============================================================

  async createRisk(
    auth: AuthContext,
    workspaceId: string,
    dto: CreateWorkRiskDto,
  ): Promise<WorkRisk> {
    await this.assertWorkspaceAccess(auth, workspaceId);
    await this.assertWriteAccess(auth, workspaceId);
    const organizationId = this.tenantContext.assertOrganizationId();

    // Verify project exists in this workspace
    const project = await this.projectRepository.findOne({
      where: {
        id: dto.projectId,
        workspaceId,
        organizationId,
      },
    });

    if (!project) {
      throw new NotFoundException({
        code: 'PROJECT_NOT_FOUND',
        message: 'Project not found in this workspace',
      });
    }

    const risk = this.riskRepo.create({
      organizationId,
      workspaceId,
      projectId: dto.projectId,
      title: dto.title,
      description: dto.description || null,
      severity: dto.severity || RiskSeverity.MEDIUM,
      status: dto.status || RiskStatus.OPEN,
      ownerUserId: dto.ownerUserId || null,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
    });

    return this.riskRepo.save(risk);
  }

  // ============================================================
  // GET RISK BY ID (for future use)
  // ============================================================

  async getRiskById(
    auth: AuthContext,
    workspaceId: string,
    riskId: string,
  ): Promise<WorkRisk> {
    await this.assertWorkspaceAccess(auth, workspaceId);
    const organizationId = this.tenantContext.assertOrganizationId();

    const risk = await this.riskRepo.findOne({
      where: {
        id: riskId,
        organizationId,
        workspaceId,
        deletedAt: IsNull(),
      },
    });

    if (!risk) {
      throw new NotFoundException({
        code: 'RISK_NOT_FOUND',
        message: 'Risk not found',
      });
    }

    return risk;
  }
}
