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
import { normalizeTemplateStructure } from './template-structure-normalizer';

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

        // Phase 5A.3: query the current `templates` table and select BOTH
        // the legacy nested `structure` column AND the flat `phases` +
        // `task_templates` columns. The shared normalizer (below) decides
        // which storage path to use. Without selecting the flat columns,
        // SYSTEM templates seeded by Phase 5A would not have any usable
        // phase data here.
        //
        // Handle all three scopes: SYSTEM (org_id is null), ORG, WORKSPACE.
        // This aligns with the instantiate-v5_1 service's scope logic.
        let templateRaw: any[];
        try {
          templateRaw = await this.dataSource.query(
            `
            SELECT
              t.id,
              t.name,
              t.organization_id,
              t.is_active,
              t.structure,
              t.phases,
              t.task_templates,
              t.lock_policy
            FROM templates t
            WHERE t.id = $1
              AND t.is_active = true
              AND (
                (t.template_scope = 'SYSTEM' AND t.organization_id IS NULL)
                OR (t.template_scope = 'ORG' AND t.organization_id = $2)
                OR (t.template_scope = 'WORKSPACE' AND t.organization_id = $2 AND t.workspace_id = $3)
              )
            `,
            [templateId, organizationId, workspaceId],
          );
        } catch (error: any) {
          // Fallback: try legacy project_templates table if templates query fails
          if (
            error.message &&
            (error.message.includes('relation "templates" does not exist') ||
             error.message.includes('column'))
          ) {
            templateRaw = await this.dataSource.query(
              `
              SELECT
                pt.id,
                pt.name,
                pt.organization_id,
                pt.is_active,
                pt.structure,
                pt.phases,
                pt.task_templates,
                pt.lock_policy
              FROM project_templates pt
              WHERE pt.id = $1
                AND (pt.organization_id = $2 OR pt.organization_id IS NULL)
                AND pt.is_active = true
              `,
              [templateId, organizationId],
            );
          } else {
            throw error;
          }
        }

        if (!templateRaw || templateRaw.length === 0) {
          throw new NotFoundException({
            code: 'NOT_FOUND',
            message: 'Template not found',
          });
        }

        const row = templateRaw[0];

        // Phase 5A.3: build a normalizable input from the raw SQL row.
        // The shared `normalizeTemplateStructure` helper accepts both
        // the legacy nested `structure` shape and the current flat
        // `phases` + `task_templates` shape, decides which path to use,
        // and returns the canonical action structure (or null).
        const normalizableInput = {
          structure:
            typeof row.structure === 'string'
              ? safeJsonParse(row.structure)
              : (row.structure as Record<string, any> | null),
          phases: row.phases as unknown,
          task_templates: row.task_templates as unknown,
        };

        const template: any = {
          id: row.id,
          name: row.name,
          organizationId: row.organization_id,
          isActive: row.is_active,
          // Keep `structure` on the template object so any downstream
          // helper that still references it (e.g. getLockPolicy) sees a
          // sane value rather than undefined.
          structure: normalizableInput.structure ?? null,
          lockPolicy:
            typeof row.lock_policy === 'string'
              ? JSON.parse(row.lock_policy)
              : row.lock_policy,
        };

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

        // Phase 5A.3: extract structure via the canonical normalizer.
        // No private duplicate, no manual JSONB array shape gymnastics —
        // the normalizer handles both structure-path templates and the
        // flat-column path that the seeder + saveProjectAsTemplate write.
        const structure = normalizeTemplateStructure(normalizableInput);

        if (!structure || structure.phases.length === 0) {
          throw new BadRequestException({
            code: 'VALIDATION_ERROR',
            message: 'Template has no valid structure.',
          });
        }

        // Build phases with task counts
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
   * Phase 5A.3: the private extractTemplateStructure helper that used to
   * live here has been removed. Both this service and the instantiate
   * service now use the canonical `normalizeTemplateStructure` helper
   * from `template-structure-normalizer.ts`. Do not reintroduce a
   * private copy.
   */

  private getLockPolicy(_template: { lockPolicy?: unknown }): {
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

/**
 * Phase 5A.3: small JSON safety helper. The raw SQL row's `structure`
 * column may come back as a string in some edge cases (e.g. legacy
 * driver settings); fall through gracefully without throwing.
 */
function safeJsonParse(input: string): Record<string, any> | null {
  try {
    const parsed = JSON.parse(input);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}
