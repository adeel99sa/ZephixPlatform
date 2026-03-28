import {
  Injectable,
  Inject,
  Optional,
  Logger,
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
import { CreateWorkRiskDto, UpdateWorkRiskDto, ListWorkRisksQueryDto } from '../dto';
import { TenantContextService } from '../../tenancy/tenant-context.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Project } from '../../projects/entities/project.entity';
import { DomainEventEmitterService } from '../../kpi-queue/services/domain-event-emitter.service';
import { DOMAIN_EVENTS } from '../../kpi-queue/constants/queue.constants';

interface AuthContext {
  organizationId: string;
  userId: string;
  platformRole?: string;
}

@Injectable()
export class WorkRisksService {
  private readonly logger = new Logger(WorkRisksService.name);

  constructor(
    @Inject(getTenantAwareRepositoryToken(WorkRisk))
    private readonly riskRepo: TenantAwareRepository<WorkRisk>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    private readonly workspaceAccessService: WorkspaceAccessService,
    private readonly workspaceRoleGuard: WorkspaceRoleGuardService,
    private readonly tenantContext: TenantContextService,
    @Optional()
    private readonly domainEventEmitter?: DomainEventEmitterService,
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
      probability: dto.probability ?? 3,
      impact: dto.impact ?? 3,
      mitigationPlan: dto.mitigationPlan || null,
      ownerUserId: dto.ownerUserId || null,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
      createdBy: auth.userId,
    });

    const saved = await this.riskRepo.save(risk);

    // Wave 10: Emit domain event for KPI recompute
    if (this.domainEventEmitter) {
      this.domainEventEmitter
        .emit(DOMAIN_EVENTS.RISK_CREATED, {
          workspaceId,
          organizationId,
          projectId: dto.projectId,
          entityId: saved.id,
          entityType: 'RISK',
        })
        .catch((err) => this.logger.warn(`Domain event emit failed: ${err}`));
    }

    return saved;
  }

  // ============================================================
  // GET RISK BY ID
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

  // ============================================================
  // UPDATE RISK
  // ============================================================

  async updateRisk(
    auth: AuthContext,
    workspaceId: string,
    riskId: string,
    dto: UpdateWorkRiskDto,
  ): Promise<WorkRisk> {
    await this.assertWorkspaceAccess(auth, workspaceId);
    await this.assertWriteAccess(auth, workspaceId);

    const risk = await this.getRiskById(auth, workspaceId, riskId);

    if (dto.title !== undefined) risk.title = dto.title;
    if (dto.description !== undefined) risk.description = dto.description || null;
    if (dto.severity !== undefined) risk.severity = dto.severity;
    if (dto.status !== undefined) risk.status = dto.status;
    if (dto.probability !== undefined) risk.probability = dto.probability;
    if (dto.impact !== undefined) risk.impact = dto.impact;
    if (dto.mitigationPlan !== undefined) risk.mitigationPlan = dto.mitigationPlan || null;
    if (dto.ownerUserId !== undefined) risk.ownerUserId = dto.ownerUserId || null;
    if (dto.dueDate !== undefined) risk.dueDate = dto.dueDate ? new Date(dto.dueDate) : null;

    const saved = await this.riskRepo.save(risk);

    // Wave 10: Emit domain event for KPI recompute
    if (this.domainEventEmitter) {
      const organizationId = this.tenantContext.assertOrganizationId();
      this.domainEventEmitter
        .emit(DOMAIN_EVENTS.RISK_UPDATED, {
          workspaceId,
          organizationId,
          projectId: risk.projectId,
          entityId: saved.id,
          entityType: 'RISK',
        })
        .catch((err) => this.logger.warn(`Domain event emit failed: ${err}`));
    }

    return saved;
  }

  // ============================================================
  // DELETE RISK (soft delete)
  // ============================================================

  async deleteRisk(
    auth: AuthContext,
    workspaceId: string,
    riskId: string,
  ): Promise<void> {
    await this.assertWorkspaceAccess(auth, workspaceId);
    await this.assertWriteAccess(auth, workspaceId);

    const risk = await this.getRiskById(auth, workspaceId, riskId);
    risk.deletedAt = new Date();
    await this.riskRepo.save(risk);
  }
}
