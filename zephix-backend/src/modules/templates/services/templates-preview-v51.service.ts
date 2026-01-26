import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  TenantAwareRepository,
  getTenantAwareRepositoryToken,
} from '../../tenancy/tenancy.module';
import { ProjectTemplate } from '../entities/project-template.entity';
import { WorkspaceAccessService } from '../../workspace-access/workspace-access.service';
import { TenantContextService } from '../../tenancy/tenant-context.service';
import { TaskStatus } from '../../work-management/enums/task.enums';

export interface PreviewPhase {
  name: string;
  sortOrder: number;
  isMilestone: boolean;
  taskCount: number;
}

export interface PreviewResponse {
  templateId: string;
  templateName: string;
  phaseCount: number;
  taskCount: number;
  phases: PreviewPhase[];
  defaultTaskStatuses: string[];
  lockPolicy: {
    structureLocksOnStart: boolean;
    lockedItems: string[];
  };
  allowedBeforeStart: string[];
  allowedAfterStart: string[];
}

@Injectable()
export class TemplatesPreviewV51Service {
  constructor(
    @Inject(getTenantAwareRepositoryToken(ProjectTemplate))
    private readonly templateRepo: TenantAwareRepository<ProjectTemplate>,
    private readonly workspaceAccessService: WorkspaceAccessService,
    private readonly tenantContext: TenantContextService,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Get template preview for v5_1
   * Enforces workspace scoping: template must belong to same workspace or be global
   */
  async getPreview(
    templateId: string,
    workspaceId: string,
    organizationId: string,
    userId: string,
    platformRole?: string,
  ): Promise<PreviewResponse> {
    // Debug logging
    if (process.env.E2E_DEBUG) {
      console.log(
        `[TemplatesPreviewV51Service] getPreview called with templateId: ${templateId}, orgId: ${organizationId}, workspaceId: ${workspaceId}`,
      );
      console.log(
        `[TemplatesPreviewV51Service] Tenant context orgId: ${this.tenantContext.getOrganizationId()}`,
      );
    }

    // Set tenant context for TenantAwareRepository
    return await this.tenantContext.runWithTenant(
      { organizationId, workspaceId },
      async () => {
        if (process.env.E2E_DEBUG) {
          console.log(
            `[TemplatesPreviewV51Service] Inside tenant context - orgId: ${this.tenantContext.getOrganizationId()}`,
          );
        }

        // Validate workspace access
        const canAccess = await this.workspaceAccessService.canAccessWorkspace(
          workspaceId,
          organizationId,
          userId,
          platformRole,
        );
        if (!canAccess) {
          throw new ForbiddenException({
            code: 'FORBIDDEN',
            message: 'Workspace access denied',
          });
        }

        // Load template using TenantAwareRepository - automatically scoped by organizationId
        // TenantAwareRepository automatically adds organizationId filter
        let template: ProjectTemplate | null;
        try {
          template = await this.templateRepo
            .qb('pt')
            .where('pt.id = :templateId', { templateId })
            .andWhere('pt.isActive = :isActive', { isActive: true })
            .getOne();
        } catch (error: any) {
          // If query fails (e.g., structure column doesn't exist), fall back to simpler query
          if (
            error.message &&
            error.message.includes('column') &&
            error.message.includes('structure')
          ) {
            template = await this.templateRepo
              .qb('pt')
              .where('pt.id = :templateId', { templateId })
              .andWhere('pt.isActive = :isActive', { isActive: true })
              .getOne();
          } else {
            throw error;
          }
        }

        if (!template) {
          throw new NotFoundException({
            code: 'NOT_FOUND',
            message: 'Template not found',
          });
        }

        // Ensure structure exists - prefer structure, fall back to phases
        if (!template.structure && template.phases) {
          template.structure = { phases: template.phases };
        } else if (!template.structure) {
          template.structure = { phases: [] };
        }

        // Template entity is already loaded - structure is ensured above
        if (process.env.E2E_DEBUG) {
          console.log(
            `[TemplatesPreviewV51Service] Template loaded: ${template.id}, has structure: ${!!template.structure}`,
          );
          if (template.structure && typeof template.structure === 'object') {
            console.log(
              `[TemplatesPreviewV51Service] Structure.phases exists: ${!!template.structure.phases}, is array: ${Array.isArray(template.structure.phases)}, length: ${template.structure.phases?.length || 0}`,
            );
          }
        }

        // Check workspace alignment: template must belong to same workspace or be global
        // For now, templates are org-scoped, so we allow if org matches
        // Future: Add workspaceId to templates for stricter scoping
        if (
          template.organizationId &&
          template.organizationId !== organizationId
        ) {
          throw new ForbiddenException({
            code: 'FORBIDDEN',
            message: 'Template not accessible in this workspace',
          });
        }

        // Extract structure using same logic as instantiate-v5_1
        let structure;
        try {
          structure = await this.extractTemplateStructure(template);

          if (process.env.E2E_DEBUG) {
            console.log(
              `[TemplatesPreviewV51Service] Structure extracted: ${!!structure}, phases count: ${structure?.phases?.length || 0}`,
            );
          }
        } catch (error: any) {
          if (process.env.E2E_DEBUG) {
            console.log(
              `[TemplatesPreviewV51Service] Error extracting structure: ${error.message}`,
            );
          }
          throw new BadRequestException({
            code: 'VALIDATION_ERROR',
            message: 'Template has no valid structure.',
          });
        }

        if (!structure || !structure.phases) {
          throw new BadRequestException({
            code: 'VALIDATION_ERROR',
            message: 'Template has no valid structure.',
          });
        }

        // Build phases with task counts
        if (process.env.E2E_DEBUG) {
          console.log(
            `[TemplatesPreviewV51Service] About to build phases. structure.phases type: ${typeof structure.phases}, is array: ${Array.isArray(structure.phases)}, length: ${structure.phases?.length || 0}`,
          );
          if (
            structure.phases &&
            Array.isArray(structure.phases) &&
            structure.phases.length > 0
          ) {
            console.log(
              `[TemplatesPreviewV51Service] First phase: ${JSON.stringify(structure.phases[0])}`,
            );
          }
        }
        const phases: PreviewPhase[] = structure.phases
          .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
          .map((phase: any) => ({
            name: phase.name,
            sortOrder: phase.sortOrder || 0,
            isMilestone: phase.isMilestone === true || phase.milestone === true,
            taskCount: Array.isArray(phase.tasks) ? phase.tasks.length : 0,
          }));

        // Compute counts
        const phaseCount = phases.length;
        const taskCount = phases.reduce(
          (sum, phase) => sum + phase.taskCount,
          0,
        );

        // Get default task statuses from WorkTask enum
        const defaultTaskStatuses = Object.values(TaskStatus) as string[];

        // Get lock policy (default Phase 5.1 policy)
        const lockPolicy = this.getLockPolicy(template);

        // Allowed operations (locked contract)
        const allowedBeforeStart = [
          'renamePhases',
          'adjustMilestones',
          'addTasks',
          'removeOptionalTasks',
          'assignOwners',
        ];

        const allowedAfterStart = [
          'addTasks',
          'renameTasks',
          'updateOwners',
          'updateDates',
          'updateStatus',
        ];

        return {
          templateId: template.id,
          templateName: template.name,
          phaseCount,
          taskCount,
          phases,
          defaultTaskStatuses,
          lockPolicy,
          allowedBeforeStart,
          allowedAfterStart,
        };
      },
    );
  }

  /**
   * Extract template structure - same logic as instantiate-v5_1
   */
  private async extractTemplateStructure(template: ProjectTemplate): Promise<{
    phases: Array<{
      name: string;
      sortOrder: number;
      isMilestone?: boolean;
      tasks: Array<any>;
    }>;
  } | null> {
    // Check for JSON structure
    if (template.structure && typeof template.structure === 'object') {
      const structure = template.structure as any;
      if (structure.phases && Array.isArray(structure.phases)) {
        return {
          phases: structure.phases.map((phase: any) => ({
            name: phase.name || `Phase ${phase.order || 0}`,
            sortOrder:
              phase.order !== undefined ? phase.order : phase.sortOrder || 0,
            isMilestone: phase.isMilestone === true,
            tasks: phase.tasks || [],
          })),
        };
      }
    }

    // Fallback: legacy format (not used in v5_1, but handle gracefully)
    return null;
  }

  private getLockPolicy(template: ProjectTemplate): {
    structureLocksOnStart: boolean;
    lockedItems: string[];
  } {
    // For now, use default Phase 5.1 policy
    // Future: Read from template.lockPolicy if stored
    return {
      structureLocksOnStart: true,
      lockedItems: ['phaseOrder', 'phaseCount', 'reportingKeys'],
    };
  }
}
