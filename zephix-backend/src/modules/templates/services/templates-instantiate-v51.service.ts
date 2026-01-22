import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Template } from '../entities/template.entity';
import { Project, ProjectState } from '../../projects/entities/project.entity';
import { WorkPhase } from '../../work-management/entities/work-phase.entity';
import { WorkTask } from '../../work-management/entities/work-task.entity';
import { Workspace } from '../../workspaces/entities/workspace.entity';
import { WorkspaceAccessService } from '../../workspace-access/workspace-access.service';
import { ProjectStructureGuardService } from '../../work-management/services/project-structure-guard.service';
import {
  TaskStatus,
  TaskType,
  TaskPriority,
} from '../../work-management/enums/task.enums';
import { InstantiateV51Dto } from '../dto/instantiate-v5-1.dto';

/**
 * Sprint 2.5: Phase 5.1 compliant template instantiation
 * Creates WorkPhase and WorkTask entities instead of legacy Task entities
 */
@Injectable()
export class TemplatesInstantiateV51Service {
  private readonly logger = new Logger(TemplatesInstantiateV51Service.name);

  constructor(
    @InjectRepository(Template)
    private templateRepository: Repository<Template>,
    @InjectRepository(Workspace)
    private workspaceRepository: Repository<Workspace>,
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    @InjectRepository(WorkPhase)
    private workPhaseRepository: Repository<WorkPhase>,
    @InjectRepository(WorkTask)
    private workTaskRepository: Repository<WorkTask>,
    private readonly dataSource: DataSource,
    private readonly workspaceAccessService: WorkspaceAccessService,
    private readonly structureGuard: ProjectStructureGuardService,
  ) {}

  /**
   * Instantiate template v5.1 - creates WorkPhase and WorkTask entities
   */
  async instantiateV51(
    templateId: string,
    dto: InstantiateV51Dto,
    workspaceId: string,
    organizationId: string,
    userId: string,
    platformRole?: string,
  ): Promise<{
    projectId: string;
    projectName: string;
    state: string;
    structureLocked: boolean;
    phaseCount: number;
    taskCount: number;
  }> {
    // workspaceId is required and validated at controller level
    // This ensures we fail fast before any template lookup
    if (!workspaceId) {
      throw new ForbiddenException({
        code: 'WORKSPACE_REQUIRED',
        message: 'x-workspace-id header is required for template instantiation',
      });
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
        code: 'WORKSPACE_REQUIRED',
        message: 'Workspace access denied',
      });
    }

    // Wrap entire flow in transaction
    return await this.dataSource.transaction(async (manager) => {
      const templateRepo = manager.getRepository(Template);
      const projectRepo = manager.getRepository(Project);
      const workspaceRepo = manager.getRepository(Workspace);
      const phaseRepo = manager.getRepository(WorkPhase);
      const taskRepo = manager.getRepository(WorkTask);

      // 1. Load template - enforce scope rules
      // For SYSTEM templates: organizationId is null
      // For ORG templates: organizationId must match
      // For WORKSPACE templates: organizationId must match and workspaceId must match
      const template = await templateRepo.findOne({
        where: [
          { id: templateId, templateScope: 'SYSTEM', organizationId: null },
          { id: templateId, templateScope: 'ORG', organizationId },
          {
            id: templateId,
            templateScope: 'WORKSPACE',
            organizationId,
            workspaceId,
          },
        ],
      });

      if (!template) {
        throw new NotFoundException({
          code: 'NOT_FOUND',
          message: 'Template not found or not accessible',
        });
      }

      // Enforce scope-specific rules
      if (template.templateScope === 'WORKSPACE') {
        // WORKSPACE templates must match the workspace from header
        if (template.workspaceId !== workspaceId) {
          throw new ForbiddenException({
            code: 'WORKSPACE_MISMATCH',
            message: 'Template belongs to a different workspace',
          });
        }
      } else if (template.templateScope === 'ORG') {
        // ORG templates can be instantiated in any workspace within the org
        // No additional check needed - organizationId already validated
      } else if (template.templateScope === 'SYSTEM') {
        // SYSTEM templates can be instantiated in any workspace
        // No additional check needed
      }

      // 2. Verify workspace belongs to organization (double-check org alignment)
      const workspace = await workspaceRepo.findOne({
        where: {
          id: workspaceId,
          organizationId,
        },
      });

      if (!workspace) {
        throw new ForbiddenException({
          code: 'WORKSPACE_REQUIRED',
          message: 'Workspace does not belong to your organization',
        });
      }

      // 3. Handle project creation or existing project
      let project: Project;
      if (dto.projectId) {
        // Use existing project - must be DRAFT and in same workspace
        project = await projectRepo.findOne({
          where: {
            id: dto.projectId,
            organizationId,
            workspaceId, // Enforce workspace match
          },
        });

        if (!project) {
          // Could be not found or workspace mismatch - return 403 for workspace mismatch
          const projectExists = await projectRepo.findOne({
            where: {
              id: dto.projectId,
              organizationId,
            },
            select: ['id', 'workspaceId'],
          });

          if (projectExists && projectExists.workspaceId !== workspaceId) {
            throw new ForbiddenException({
              code: 'FORBIDDEN',
              message: 'Project does not belong to the specified workspace',
            });
          }

          throw new NotFoundException({
            code: 'NOT_FOUND',
            message: 'Project not found',
          });
        }

        // Validate project is DRAFT and not locked
        if (project.state !== ProjectState.DRAFT) {
          throw new ConflictException({
            code: 'LOCKED_PHASE_STRUCTURE',
            message: 'Project must be in DRAFT state to instantiate template',
          });
        }

        if (project.structureLocked) {
          throw new ConflictException({
            code: 'LOCKED_PHASE_STRUCTURE',
            message: 'Project structure is locked',
          });
        }
      } else {
        // Create new project
        if (!dto.projectName) {
          throw new BadRequestException({
            code: 'VALIDATION_ERROR',
            message: 'projectName is required when projectId is not provided',
          });
        }

        project = projectRepo.create({
          name: dto.projectName,
          workspaceId,
          organizationId,
          status: 'planning' as any,
          state: ProjectState.DRAFT,
          structureLocked: false,
          startedAt: null,
          structureSnapshot: null,
          createdById: userId,
          // Phase 7.5: Set activeKpiIds from template defaultEnabledKPIs
          activeKpiIds:
            template.defaultEnabledKPIs &&
            template.defaultEnabledKPIs.length > 0
              ? [...template.defaultEnabledKPIs]
              : [],
        });

        project = await projectRepo.save(project);
      }

      // 4. Verify template workspace access (templates are org-scoped, but verify access)
      // Templates don't have workspaceId, they're organization-scoped
      // For now, we allow any template in the organization to be instantiated
      // Future: Add template.workspaceId or template.isGlobal flag check here

      // 5. Extract template structure (support both normalized and JSON paths)
      const templateStructure = await this.extractTemplateStructure(template);

      // Structure validation: phases required at least 1, tasks allowed 0
      if (!templateStructure || templateStructure.phases.length === 0) {
        throw new BadRequestException({
          code: 'VALIDATION_ERROR',
          message: 'Template must have at least one phase',
        });
      }

      // 5a. Work plan already initialized guard
      // Before instantiation into an existing projectId:
      // - Require project.state is DRAFT (already checked above)
      // - Fetch counts: number of work_phases and work_tasks for project
      // - Allow only if:
      //   - work_tasks count is 0 AND
      //   - either work_phases count is 0 OR work_phases count is 1 and that phase is the default "Work" and it has 0 tasks
      if (dto.projectId) {
        const existingTaskCount = await taskRepo.count({
          where: {
            projectId: project.id,
            organizationId,
            workspaceId,
          },
        });

        const existingPhaseCount = await phaseRepo.count({
          where: {
            projectId: project.id,
            organizationId,
            workspaceId,
          },
        });

        // If project has tasks, it's already initialized
        if (existingTaskCount > 0) {
          throw new ConflictException({
            code: 'WORK_PLAN_ALREADY_INITIALIZED',
            message:
              'Project work plan is already initialized. Cannot instantiate template into a project with existing tasks.',
          });
        }

        // If project has phases but not the default "Work" phase with 0 tasks, it's initialized
        if (existingPhaseCount > 0) {
          const existingPhases = await phaseRepo.find({
            where: {
              projectId: project.id,
              organizationId,
              workspaceId,
            },
            relations: ['tasks'],
          });

          // Allow only if exactly one phase named "Work" with zero tasks (default backfill)
          const isDefaultBackfillOnly =
            existingPhases.length === 1 &&
            existingPhases[0].name === 'Work' &&
            existingPhases[0].tasks.length === 0;

          if (!isDefaultBackfillOnly) {
            throw new ConflictException({
              code: 'WORK_PLAN_ALREADY_INITIALIZED',
              message:
                'Project work plan is already initialized. Cannot instantiate template into a project with existing phases.',
            });
          }
        }
      }

      // 5. Create WorkPhase rows
      const createdPhases: WorkPhase[] = [];
      const phaseIdMap = new Map<number, string>(); // Map original sortOrder to phase ID

      for (const phaseDef of templateStructure.phases) {
        // Generate reportingKey
        const reportingKey = this.generateReportingKey(
          phaseDef.reportingKey || phaseDef.name,
          phaseDef.sortOrder,
          createdPhases,
        );

        // Parse dueDate from template if provided (format: YYYY-MM-DD)
        let dueDate: Date | null = null;
        if (phaseDef.dueDate) {
          const parsedDate = new Date(phaseDef.dueDate);
          if (!isNaN(parsedDate.getTime())) {
            dueDate = parsedDate;
          }
        }

        const phase = phaseRepo.create({
          organizationId,
          workspaceId,
          projectId: project.id,
          name: phaseDef.name,
          sortOrder: phaseDef.sortOrder,
          reportingKey,
          isMilestone: phaseDef.isMilestone === true, // Respect milestone flag from template
          dueDate, // Set dueDate from template if provided
          isLocked: false,
          sourceTemplatePhaseId: null, // TODO: Add if template has phase IDs
          createdByUserId: userId,
        });

        const savedPhase = await phaseRepo.save(phase);
        createdPhases.push(savedPhase);
        phaseIdMap.set(phaseDef.sortOrder, savedPhase.id);
      }

      // 6. Create WorkTask rows linked to phases
      // Lock rule: Task order uses rank only within a phase
      let taskCount = 0;
      for (const phaseDef of templateStructure.phases) {
        const phaseId = phaseIdMap.get(phaseDef.sortOrder);
        if (!phaseId) continue;

        // Allow zero tasks - phase-only structure is valid
        let taskRank = 0;
        for (const taskDef of phaseDef.tasks) {
          const task = taskRepo.create({
            organizationId,
            workspaceId,
            projectId: project.id,
            phaseId,
            title: taskDef.title,
            description: taskDef.description || null,
            status: (taskDef.status as TaskStatus) || TaskStatus.TODO,
            type: TaskType.TASK,
            priority: (taskDef.priority as TaskPriority) || TaskPriority.MEDIUM,
            // Lock rule: rank is used for ordering within phase
            rank:
              taskDef.sortOrder !== undefined ? taskDef.sortOrder : taskRank++,
            reporterUserId: userId,
          });

          await taskRepo.save(task);
          taskCount++;
        }
      }

      // PART 2 Step 6: Store templateId, templateVersion, and structureSnapshot
      // Use Template.version as the deterministic version
      const templateVersion = template.version || 1;

      project.templateId = template.id;
      project.templateVersion = templateVersion;

      // Set activeKpiIds from template defaults
      project.activeKpiIds =
        template.defaultEnabledKPIs && template.defaultEnabledKPIs.length > 0
          ? [...template.defaultEnabledKPIs]
          : [];
      // Extract structure from template for snapshot (reuse already extracted structure)
      const templateStructureForSnapshot = templateStructure;

      // Set templateSnapshot with template blocks and defaults
      // Note: Project.templateSnapshot has a specific structure, but we'll store the essential data
      project.templateSnapshot = {
        templateId: template.id,
        templateVersion: templateVersion,
        locked: false,
        blocks: (templateStructureForSnapshot
          ? templateStructureForSnapshot.phases
          : []
        ).map((phase, idx) => ({
          blockId: `phase-${idx}`,
          enabled: true,
          displayOrder: phase.sortOrder,
          config: { name: phase.name, reportingKey: phase.reportingKey },
          locked: false,
        })),
      };

      // Also set structureSnapshot for backward compatibility
      project.structureSnapshot = {
        containerType: 'PROJECT',
        containerId: project.id,
        templateId: template.id,
        templateVersion: templateVersion,
        phases: createdPhases.map((p) => ({
          phaseId: p.id,
          reportingKey: p.reportingKey || p.name,
          name: p.name,
          sortOrder: p.sortOrder,
        })),
        lockedAt: new Date().toISOString(),
        lockedByUserId: userId,
      };
      await projectRepo.save(project);

      return {
        projectId: project.id,
        projectName: project.name,
        state: project.state,
        structureLocked: project.structureLocked,
        phaseCount: createdPhases.length,
        taskCount,
      };
    });
  }

  /**
   * Extract template structure - supports both normalized and JSON paths
   * Now works with Template entity instead of ProjectTemplate
   */
  private async extractTemplateStructure(template: Template): Promise<{
    phases: Array<{
      name: string;
      sortOrder: number;
      reportingKey?: string;
      isMilestone?: boolean;
      dueDate?: string;
      tasks: Array<{
        title: string;
        sortOrder?: number;
        description?: string;
        status?: string;
        priority?: string;
      }>;
    }>;
  } | null> {
    // Path A: Check for normalized TemplatePhase/TemplateTask tables
    // Feature detection: Check if template has related phase entities
    // For now, we'll check template.structure JSON first, then fall back to normalized if needed

    // Path B: JSON structure (primary path for Template entity)
    if (template.structure && typeof template.structure === 'object') {
      const structure = template.structure as any;
      if (structure.phases && Array.isArray(structure.phases)) {
        // Validate and transform structure
        const phases = structure.phases.map((phase: any) => ({
          name: phase.name || `Phase ${phase.order || 0}`,
          sortOrder:
            phase.order !== undefined ? phase.order : phase.sortOrder || 0,
          reportingKey: phase.reportingKey,
          isMilestone: phase.isMilestone === true, // Preserve milestone flag from template
          dueDate: phase.dueDate || undefined, // Preserve dueDate from template if provided
          tasks: (phase.tasks || []).map((task: any, taskIndex: number) => ({
            title: task.name || task.title || `Task ${taskIndex + 1}`,
            sortOrder:
              task.sortOrder !== undefined ? task.sortOrder : taskIndex,
            description: task.description,
            status: task.status,
            priority: task.priority,
          })),
        }));
        return { phases };
      }
    }

    // Template entity doesn't have phases/taskTemplates fields like ProjectTemplate
    // If structure is not in expected format, return null
    return null;
  }

  /**
   * Generate unique and deterministic reportingKey for a phase
   *
   * Rules:
   * - Must be unique per project
   * - Must be deterministic (same template -> same reportingKey)
   * - If collision, append stable suffix based on sortOrder with zero-padding (e.g., "base-02")
   * - Never use random values
   */
  private generateReportingKey(
    baseKey: string,
    sortOrder: number,
    existingPhases: WorkPhase[],
  ): string {
    // Slugify base key deterministically
    const slug = baseKey
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    // Check for conflicts with existing phases
    const existingKeys = new Set(existingPhases.map((p) => p.reportingKey));

    // Try base slug first
    let reportingKey = slug;

    // If collision, append stable suffix based on sortOrder with zero-padding (e.g., "base-02")
    if (existingKeys.has(reportingKey)) {
      // Format sortOrder as zero-padded 2-digit number (e.g., 0 -> "00", 1 -> "01", 10 -> "10")
      const paddedSortOrder = String(sortOrder).padStart(2, '0');
      reportingKey = `${slug}-${paddedSortOrder}`;
    }

    // If still collision (unlikely but handle it), append attempt counter
    let attempt = 0;
    while (existingKeys.has(reportingKey) && attempt < 100) {
      attempt++;
      const paddedSortOrder = String(sortOrder).padStart(2, '0');
      reportingKey = `${slug}-${paddedSortOrder}-${attempt}`;
    }

    return reportingKey;
  }
}
