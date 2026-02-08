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

        // Query the current `templates` table (not legacy `project_templates`).
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
              COALESCE(t.structure, jsonb_build_object('phases', '[]'::jsonb)) as structure,
              t.structure as phases_raw,
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
                COALESCE(pt.structure, jsonb_build_object('phases', COALESCE(pt.phases, '[]'::jsonb))) as structure,
                pt.phases as phases_raw,
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
        if (process.env.E2E_DEBUG) {
          console.log(
            `[TemplatesPreviewV51Service] Raw row keys: ${Object.keys(row).join(', ')}`,
          );
          console.log(
            `[TemplatesPreviewV51Service] Raw row.structure type: ${typeof row.structure}, is null: ${row.structure === null}, is undefined: ${row.structure === undefined}`,
          );
          // Try to stringify the structure to see what's actually stored
          try {
            const structureStr = JSON.stringify(row.structure, null, 2);
            console.log(
              `[TemplatesPreviewV51Service] Raw row.structure JSON: ${structureStr.substring(0, 500)}`,
            );
          } catch (e) {
            console.log(
              `[TemplatesPreviewV51Service] Could not stringify structure: ${e}`,
            );
          }
          if (row.structure && typeof row.structure === 'object') {
            console.log(
              `[TemplatesPreviewV51Service] Raw row.structure keys: ${Object.keys(row.structure).join(', ')}`,
            );
            if (row.structure.phases) {
              console.log(
                `[TemplatesPreviewV51Service] Raw row.structure.phases type: ${typeof row.structure.phases}, is array: ${Array.isArray(row.structure.phases)}, length: ${row.structure.phases?.length || 0}`,
              );
              // If it's an object with numeric keys (PostgreSQL JSONB array), show the keys
              if (
                typeof row.structure.phases === 'object' &&
                !Array.isArray(row.structure.phases)
              ) {
                const keys = Object.keys(row.structure.phases);
                console.log(
                  `[TemplatesPreviewV51Service] Raw row.structure.phases object keys: ${keys.join(', ')}`,
                );
                if (keys.length > 0) {
                  console.log(
                    `[TemplatesPreviewV51Service] Raw row.structure.phases[0]: ${JSON.stringify(row.structure.phases[keys[0]])}`,
                  );
                }
              }
            }
          }
          if (row.phases_raw) {
            console.log(
              `[TemplatesPreviewV51Service] Raw row.phases_raw type: ${typeof row.phases_raw}, is array: ${Array.isArray(row.phases_raw)}, is null: ${row.phases_raw === null}`,
            );
            try {
              const phasesStr = JSON.stringify(row.phases_raw, null, 2);
              console.log(
                `[TemplatesPreviewV51Service] Raw row.phases_raw JSON: ${phasesStr.substring(0, 500)}`,
              );
            } catch (e) {
              console.log(
                `[TemplatesPreviewV51Service] Could not stringify phases_raw: ${e}`,
              );
            }
            if (
              typeof row.phases_raw === 'object' &&
              !Array.isArray(row.phases_raw) &&
              row.phases_raw !== null
            ) {
              const keys = Object.keys(row.phases_raw);
              console.log(
                `[TemplatesPreviewV51Service] Raw row.phases_raw object keys: ${keys.join(', ')}`,
              );
            }
          }
        }
        // PostgreSQL returns JSONB as objects, not strings, so we don't need to parse
        // But be safe and handle both cases
        let structureParsed = row.structure;
        if (typeof structureParsed === 'string') {
          try {
            structureParsed = JSON.parse(structureParsed);
          } catch (e) {
            // If parsing fails, structureParsed remains as string
          }
        }

        // Ensure structure has phases array - if structure.phases is empty but we have phases_raw, use it
        // This handles the case where jsonb_build_object might return an empty array
        // Note: PostgreSQL JSONB arrays are returned as objects with numeric keys, not true JavaScript arrays
        if (structureParsed && typeof structureParsed === 'object') {
          // Check if structure.phases is empty or missing
          const hasEmptyPhases =
            !structureParsed.phases ||
            (Array.isArray(structureParsed.phases) &&
              structureParsed.phases.length === 0) ||
            (typeof structureParsed.phases === 'object' &&
              Object.keys(structureParsed.phases).length === 0);

          if (hasEmptyPhases && row.phases_raw) {
            // If structure doesn't have phases or phases is empty, try to get it from the raw row
            // Check if phases_raw is a valid array-like object
            let phasesArray: any[] = [];
            if (Array.isArray(row.phases_raw)) {
              phasesArray = row.phases_raw;
            } else if (
              typeof row.phases_raw === 'object' &&
              row.phases_raw !== null
            ) {
              // PostgreSQL JSONB arrays are returned as objects with numeric keys
              // Convert to array
              const numericKeys = Object.keys(row.phases_raw)
                .filter((key) => /^\d+$/.test(key))
                .sort((a, b) => parseInt(a) - parseInt(b));

              if (numericKeys.length > 0) {
                phasesArray = numericKeys.map((key) => row.phases_raw[key]);
                if (process.env.E2E_DEBUG) {
                  console.log(
                    `[TemplatesPreviewV51Service] Converted phases_raw from object to array, length: ${phasesArray.length}`,
                  );
                }
              }
            }

            if (phasesArray.length > 0) {
              structureParsed = { ...structureParsed, phases: phasesArray };
              if (process.env.E2E_DEBUG) {
                console.log(
                  `[TemplatesPreviewV51Service] Using phases_raw, converted to array length: ${phasesArray.length}`,
                );
              }
            } else if (process.env.E2E_DEBUG) {
              console.log(
                `[TemplatesPreviewV51Service] phases_raw is also empty or invalid`,
              );
            }
          }
        }

        const template: any = {
          id: row.id,
          name: row.name,
          organizationId: row.organization_id,
          isActive: row.is_active,
          structure: structureParsed,
          lockPolicy:
            typeof row.lock_policy === 'string'
              ? JSON.parse(row.lock_policy)
              : row.lock_policy,
        };

        if (process.env.E2E_DEBUG) {
          console.log(
            `[TemplatesPreviewV51Service] Template found: ${!!template}, has structure: ${!!template?.structure}`,
          );
          console.log(
            `[TemplatesPreviewV51Service] Structure type: ${typeof template.structure}, is object: ${typeof template.structure === 'object' && template.structure !== null}`,
          );
          console.log(
            `[TemplatesPreviewV51Service] Raw row.structure type: ${typeof row.structure}, is object: ${typeof row.structure === 'object' && row.structure !== null}`,
          );
          console.log(
            `[TemplatesPreviewV51Service] Raw row.phases_raw type: ${typeof row.phases_raw}, is array: ${Array.isArray(row.phases_raw)}, length: ${row.phases_raw?.length || 0}`,
          );
          if (row.structure && typeof row.structure === 'object') {
            console.log(
              `[TemplatesPreviewV51Service] Raw row.structure keys: ${Object.keys(row.structure).join(', ')}`,
            );
            console.log(
              `[TemplatesPreviewV51Service] Raw row.structure.phases exists: ${!!row.structure.phases}, is array: ${Array.isArray(row.structure.phases)}, length: ${row.structure.phases?.length || 0}`,
            );
            if (row.structure.phases && Array.isArray(row.structure.phases)) {
              console.log(
                `[TemplatesPreviewV51Service] Raw row.structure.phases first item: ${JSON.stringify(row.structure.phases[0])}`,
              );
            }
          }
          if (template.structure && typeof template.structure === 'object') {
            console.log(
              `[TemplatesPreviewV51Service] Structure keys: ${Object.keys(template.structure).join(', ')}`,
            );
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
