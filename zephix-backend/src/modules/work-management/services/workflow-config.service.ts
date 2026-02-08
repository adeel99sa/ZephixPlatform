import {
  Injectable,
  Inject,
  BadRequestException,
} from '@nestjs/common';
import {
  TenantAwareRepository,
  getTenantAwareRepositoryToken,
} from '../../tenancy/tenancy.module';
import { ProjectWorkflowConfig } from '../entities/project-workflow-config.entity';
import { WorkspaceAccessService } from '../../workspace-access/workspace-access.service';
import { TenantContextService } from '../../tenancy/tenant-context.service';
import { TaskStatus } from '../enums/task.enums';
import { UpdateWorkflowConfigDto } from '../dto/update-workflow-config.dto';

interface AuthContext {
  organizationId: string;
  userId: string;
  platformRole?: string;
}

/** Statuses that can never have a WIP limit */
const NON_WIP_STATUSES = new Set<string>([
  TaskStatus.DONE,
  TaskStatus.BACKLOG,
  TaskStatus.CANCELED,
]);

/** All valid statuses that can have a WIP limit */
const WIP_ELIGIBLE_STATUSES = new Set<string>(
  Object.values(TaskStatus).filter((s) => !NON_WIP_STATUSES.has(s)),
);

export interface EffectiveLimits {
  defaultWipLimit: number | null;
  statusWipLimits: Record<string, number> | null;
  derivedEffectiveLimit: Record<string, number | null>;
}

@Injectable()
export class WorkflowConfigService {
  constructor(
    @Inject(getTenantAwareRepositoryToken(ProjectWorkflowConfig))
    private readonly configRepo: TenantAwareRepository<ProjectWorkflowConfig>,
    private readonly workspaceAccessService: WorkspaceAccessService,
    private readonly tenantContext: TenantContextService,
  ) {}

  private async assertWorkspaceAccess(
    auth: AuthContext,
    workspaceId: string,
  ): Promise<void> {
    const canAccess = await this.workspaceAccessService.canAccessWorkspace(
      workspaceId,
      auth.organizationId,
      auth.userId,
      auth.platformRole,
    );
    if (!canAccess) {
      throw new BadRequestException({
        code: 'WORKSPACE_REQUIRED',
        message: 'Workspace access denied',
      });
    }
  }

  /**
   * Get the workflow config for a project. Returns null if none configured.
   */
  async getConfig(
    auth: AuthContext,
    workspaceId: string,
    projectId: string,
  ): Promise<ProjectWorkflowConfig | null> {
    await this.assertWorkspaceAccess(auth, workspaceId);
    return this.configRepo.findOne({
      where: { projectId, workspaceId } as any,
    });
  }

  /**
   * Get workflow config with derived effective limits per status.
   */
  async getEffectiveLimits(
    auth: AuthContext,
    workspaceId: string,
    projectId: string,
  ): Promise<EffectiveLimits> {
    const config = await this.getConfig(auth, workspaceId, projectId);
    return this.deriveEffective(config);
  }

  /**
   * Upsert workflow config for a project.
   */
  async upsertConfig(
    auth: AuthContext,
    workspaceId: string,
    projectId: string,
    dto: UpdateWorkflowConfigDto,
  ): Promise<EffectiveLimits> {
    await this.assertWorkspaceAccess(auth, workspaceId);
    const organizationId = this.tenantContext.assertOrganizationId();

    // Validate statusWipLimits keys
    if (dto.statusWipLimits) {
      for (const [status, limit] of Object.entries(dto.statusWipLimits)) {
        if (NON_WIP_STATUSES.has(status)) {
          throw new BadRequestException({
            code: 'INVALID_WIP_STATUS',
            message: `Cannot set WIP limit on terminal/non-WIP status: ${status}`,
          });
        }
        if (!WIP_ELIGIBLE_STATUSES.has(status)) {
          throw new BadRequestException({
            code: 'UNKNOWN_STATUS',
            message: `Unknown status: ${status}`,
          });
        }
        if (!Number.isInteger(limit) || limit < 1 || limit > 200) {
          throw new BadRequestException({
            code: 'INVALID_WIP_LIMIT',
            message: `WIP limit for ${status} must be an integer between 1 and 200`,
          });
        }
      }
    }

    let config = await this.configRepo.findOne({
      where: { projectId, workspaceId } as any,
    });

    if (config) {
      if (dto.defaultWipLimit !== undefined) {
        config.defaultWipLimit = dto.defaultWipLimit;
      }
      if (dto.statusWipLimits !== undefined) {
        config.statusWipLimits = dto.statusWipLimits;
      }
    } else {
      config = this.configRepo.create({
        organizationId,
        workspaceId,
        projectId,
        defaultWipLimit: dto.defaultWipLimit ?? null,
        statusWipLimits: dto.statusWipLimits ?? null,
      });
    }

    const saved = await this.configRepo.save(config);
    return this.deriveEffective(saved);
  }

  /**
   * Internal: resolve the effective WIP limit for a given status.
   * Used by the enforcement service.
   */
  resolveLimit(
    config: ProjectWorkflowConfig | null,
    status: string,
  ): number | null {
    if (!config) return null;
    if (config.statusWipLimits && config.statusWipLimits[status] != null) {
      return config.statusWipLimits[status];
    }
    return config.defaultWipLimit ?? null;
  }

  private deriveEffective(
    config: ProjectWorkflowConfig | null,
  ): EffectiveLimits {
    const derived: Record<string, number | null> = {};
    for (const status of WIP_ELIGIBLE_STATUSES) {
      derived[status] = this.resolveLimit(config, status);
    }
    return {
      defaultWipLimit: config?.defaultWipLimit ?? null,
      statusWipLimits: config?.statusWipLimits ?? null,
      derivedEffectiveLimit: derived,
    };
  }
}
