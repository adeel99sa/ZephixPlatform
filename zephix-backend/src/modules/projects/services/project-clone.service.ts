import {
  Injectable,
  Logger,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { DomainEventsPublisher } from '../../domain-events/domain-events.publisher';
import { PoliciesService } from '../../policies/services/policies.service';
import { WorkspaceAccessService } from '../../workspace-access/workspace-access.service';
import { Project, ProjectStatus, ProjectState, ProjectHealth, ProjectRiskLevel } from '../entities/project.entity';
import { ProjectCloneRequest } from '../entities/project-clone-request.entity';
import {
  ProjectCloneMode,
  ProjectCloneRequestStatus,
} from '../enums/project-clone.enums';
import { CloneProjectDto } from '../dto/clone-project.dto';
import { CloneProjectResponseDto } from '../dto/clone-project-response.dto';
import { Workspace } from '../../workspaces/entities/workspace.entity';

// Entity types used via QueryRunner — no module import needed
import { WorkPhase } from '../../work-management/entities/work-phase.entity';
import { PhaseGateDefinition } from '../../work-management/entities/phase-gate-definition.entity';
import { ProjectWorkflowConfig } from '../../work-management/entities/project-workflow-config.entity';
import { ProjectKpi } from '../../template-center/kpis/entities/project-kpi.entity';
import { ProjectView } from '../entities/project-view.entity';

@Injectable()
export class ProjectCloneService {
  private readonly logger = new Logger(ProjectCloneService.name);

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(ProjectCloneRequest)
    private readonly cloneRequestRepo: Repository<ProjectCloneRequest>,
    private readonly domainEventsPublisher: DomainEventsPublisher,
    private readonly policiesService: PoliciesService,
    private readonly workspaceAccessService: WorkspaceAccessService,
  ) {}

  /**
   * Clone a project using the specified mode.
   *
   * Phase 1: Only structure_only mode is supported.
   */
  async clone(
    projectId: string,
    sourceWorkspaceId: string,
    dto: CloneProjectDto,
    userId: string,
    organizationId: string,
    platformRole: string,
  ): Promise<CloneProjectResponseDto> {
    const startTime = Date.now();

    // ── 1. Hard block full_clone in Phase 1 ──
    if (dto.mode === ProjectCloneMode.FULL_CLONE) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Full clone mode is not yet available',
        code: 'MODE_NOT_AVAILABLE',
      });
    }

    const targetWorkspaceId = dto.targetWorkspaceId || sourceWorkspaceId;

    // ── 2. Resolve policy gate ──
    const cloneEnabled = await this.policiesService.resolvePolicy<boolean>(
      organizationId,
      sourceWorkspaceId,
      'project_clone_enabled',
    );
    if (cloneEnabled !== true) {
      throw new ForbiddenException({
        statusCode: 403,
        message: 'Project cloning is disabled by policy',
        code: 'POLICY_DISABLED',
      });
    }

    // ── 3. Validate source project ──
    const sourceProject = await this.dataSource.manager.findOne(Project, {
      where: { id: projectId, organizationId },
    });
    if (!sourceProject) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Source project not found',
        code: 'PROJECT_NOT_FOUND',
      });
    }
    if (sourceProject.workspaceId !== sourceWorkspaceId) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Source project not found in this workspace',
        code: 'PROJECT_NOT_FOUND',
      });
    }

    // ── 4. Validate target workspace access ──
    if (targetWorkspaceId !== sourceWorkspaceId) {
      // Source workspace is already validated by the guard.
      // Defense in depth: verify target workspace belongs to same org before role check.
      const targetWorkspace = await this.dataSource.manager.findOne(Workspace, {
        where: { id: targetWorkspaceId },
        select: ['id', 'organizationId'],
      });
      if (!targetWorkspace || targetWorkspace.organizationId !== organizationId) {
        throw new ForbiddenException({
          statusCode: 403,
          message: 'Target workspace does not belong to your organization',
          code: 'TARGET_ORG_MISMATCH',
        });
      }

      // Validate user has member access on the target workspace.
      const targetRole =
        await this.workspaceAccessService.getUserWorkspaceRole(
          organizationId,
          targetWorkspaceId,
          userId,
          platformRole,
        );
      if (!targetRole) {
        throw new ForbiddenException({
          statusCode: 403,
          message: 'You do not have access to the target workspace',
          code: 'TARGET_ACCESS_DENIED',
        });
      }
      const hasMemberAccess =
        this.workspaceAccessService.hasWorkspaceRoleAtLeast(
          'workspace_member',
          targetRole,
        );
      if (!hasMemberAccess) {
        throw new ForbiddenException({
          statusCode: 403,
          message: 'You need member or higher access on the target workspace',
          code: 'TARGET_ACCESS_DENIED',
        });
      }
    }

    // ── 5. Idempotency gate ──
    const existingRequest = await this.findExistingCloneRequest(
      projectId,
      targetWorkspaceId,
      dto.mode,
      userId,
    );
    if (existingRequest) {
      if (existingRequest.status === ProjectCloneRequestStatus.IN_PROGRESS) {
        this.logger.warn({
          msg: 'clone_conflict',
          cloneRequestId: existingRequest.id,
          sourceProjectId: projectId,
          targetWorkspaceId,
          mode: dto.mode,
        });
        throw new ConflictException({
          statusCode: 409,
          message: 'A clone operation is already in progress',
          code: 'CLONE_IN_PROGRESS',
          cloneRequestId: existingRequest.id,
        });
      }
      if (
        existingRequest.status === ProjectCloneRequestStatus.COMPLETED &&
        existingRequest.newProjectId
      ) {
        // Return the completed result for retry/double-click
        this.logger.log({
          msg: 'clone_idempotent_hit',
          cloneRequestId: existingRequest.id,
          sourceProjectId: projectId,
          newProjectId: existingRequest.newProjectId,
        });
        return {
          newProjectId: existingRequest.newProjectId,
          sourceProjectId: projectId,
          mode: dto.mode,
          cloneRequestId: existingRequest.id,
          name: '', // Caller can look up the project
          workspaceId: targetWorkspaceId,
        };
      }
    }

    // Insert new clone request
    const cloneRequest = this.cloneRequestRepo.create({
      sourceProjectId: projectId,
      targetWorkspaceId,
      mode: dto.mode,
      requestedBy: userId,
      status: ProjectCloneRequestStatus.IN_PROGRESS,
    });

    try {
      await this.cloneRequestRepo.save(cloneRequest);
    } catch (err: any) {
      // Unique constraint violation — race condition on the idempotency index
      if (err.code === '23505') {
        throw new ConflictException({
          statusCode: 409,
          message: 'A clone operation is already in progress',
          code: 'CLONE_IN_PROGRESS',
        });
      }
      throw err;
    }

    // ── 6-7. Execute clone inside transaction ──
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let newProject: Project;
    let entityCounts = {
      phases: 0,
      gateDefinitions: 0,
      kpiAssignments: 0,
      views: 0,
      workflowConfig: false,
    };

    try {
      const manager = queryRunner.manager;

      // Lock source project to prevent concurrent modifications
      await manager.query(
        `SELECT id FROM projects WHERE id = $1 FOR UPDATE`,
        [projectId],
      );

      // Re-read source under lock
      const source = await manager.findOneOrFail(Project, {
        where: { id: projectId },
      });

      // Generate unique name
      const cloneName = await this.generateCloneName(
        source.name,
        targetWorkspaceId,
        organizationId,
        manager,
        dto.newName,
      );

      // ── Create new project ──
      newProject = manager.create(Project, {
        // Copy from source
        name: cloneName,
        description: source.description,
        priority: source.priority,
        startDate: source.startDate,
        endDate: source.endDate,
        estimatedEndDate: source.estimatedEndDate,
        budget: source.budget,
        size: source.size,
        methodology: source.methodology,
        templateId: source.templateId,
        templateVersion: source.templateVersion,
        templateSnapshot: source.templateSnapshot,
        activeKpiIds: source.activeKpiIds ? [...source.activeKpiIds] : [],
        definitionOfDone: source.definitionOfDone
          ? [...source.definitionOfDone]
          : null,

        // Set target scope
        workspaceId: targetWorkspaceId,
        organizationId,
        createdById: userId,

        // Reset operational fields
        status: ProjectStatus.PLANNING,
        state: ProjectState.DRAFT,
        health: ProjectHealth.HEALTHY,
        riskLevel: ProjectRiskLevel.MEDIUM,
        actualCost: null,
        projectManagerId: null,
        portfolioId: null,
        programId: null,
        templateLocked: false,
        structureLocked: false,
        structureSnapshot: null,
        startedAt: null,
        behindTargetDays: null,
        healthUpdatedAt: null,
        deliveryOwnerUserId: null,

        // Lineage
        sourceProjectId: source.id,
        cloneDepth: (source.cloneDepth || 0) + 1,
        clonedAt: new Date(),
        clonedBy: userId,
      });

      newProject = await manager.save(Project, newProject);

      // ── Copy WorkPhases ──
      const phaseIdMap = await this.copyPhases(
        manager,
        source.id,
        newProject.id,
        targetWorkspaceId,
        organizationId,
        userId,
      );
      entityCounts.phases = phaseIdMap.size;

      // ── Copy PhaseGateDefinitions ──
      entityCounts.gateDefinitions = await this.copyGateDefinitions(
        manager,
        source.id,
        newProject.id,
        targetWorkspaceId,
        organizationId,
        userId,
        phaseIdMap,
      );

      // ── Copy ProjectWorkflowConfig ──
      entityCounts.workflowConfig = await this.copyWorkflowConfig(
        manager,
        source.id,
        newProject.id,
        targetWorkspaceId,
        organizationId,
      );

      // ── Copy ProjectKpis ──
      entityCounts.kpiAssignments = await this.copyKpiAssignments(
        manager,
        source.id,
        newProject.id,
      );

      // ── Copy ProjectViews ──
      entityCounts.views = await this.copyProjectViews(
        manager,
        source.id,
        newProject.id,
      );

      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();

      // Mark clone request as failed
      await this.cloneRequestRepo.update(cloneRequest.id, {
        status: ProjectCloneRequestStatus.FAILED,
        failureReason:
          err instanceof Error ? err.message : 'Unknown clone error',
        completedAt: new Date(),
      });

      const durationMs = Date.now() - startTime;
      this.logger.error({
        msg: 'clone_failed',
        cloneRequestId: cloneRequest.id,
        sourceProjectId: projectId,
        targetWorkspaceId,
        mode: dto.mode,
        durationMs,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    } finally {
      await queryRunner.release();
    }

    // ── 8. Update clone request → completed ──
    await this.cloneRequestRepo.update(cloneRequest.id, {
      status: ProjectCloneRequestStatus.COMPLETED,
      newProjectId: newProject.id,
      completedAt: new Date(),
    });

    // ── 9. Emit domain event (after commit) ──
    try {
      await this.domainEventsPublisher.publish({
        name: 'project.cloned',
        orgId: organizationId,
        workspaceId: targetWorkspaceId,
        projectId: newProject.id,
        actorId: userId,
        occurredAt: new Date(),
        data: {
          newProjectId: newProject.id,
          sourceProjectId: projectId,
          cloneMode: dto.mode,
          targetWorkspaceId,
          sourceWorkspaceId,
          cloneDepth: newProject.cloneDepth,
          entityCounts,
        },
      });
    } catch (eventErr) {
      // Event emission failure must not break the clone response
      this.logger.warn(`Failed to emit project.cloned event: ${eventErr}`);
    }

    // ── 10. Structured observability ──
    const durationMs = Date.now() - startTime;
    this.logger.log({
      msg: 'clone_success',
      cloneRequestId: cloneRequest.id,
      sourceProjectId: projectId,
      newProjectId: newProject.id,
      mode: dto.mode,
      targetWorkspaceId,
      durationMs,
      entityCounts,
    });

    return {
      newProjectId: newProject.id,
      sourceProjectId: projectId,
      mode: dto.mode,
      cloneRequestId: cloneRequest.id,
      name: newProject.name,
      workspaceId: targetWorkspaceId,
    };
  }

  // ─────────────────────────────────────────────────────────
  // Private helpers
  // ─────────────────────────────────────────────────────────

  /**
   * Check for an existing clone request (in_progress or last completed).
   *
   * Lookup order:
   *  1. in_progress → caller returns 409
   *  2. last completed for this key → caller returns 200 with existing result
   *
   * No time coupling — the last completed request for the same
   * (source, target, mode, user) key is always returned so retries
   * after slow refreshes still get the original result.
   */
  private async findExistingCloneRequest(
    sourceProjectId: string,
    targetWorkspaceId: string,
    mode: ProjectCloneMode,
    requestedBy: string,
  ): Promise<ProjectCloneRequest | null> {
    // First check for in_progress
    const inProgress = await this.cloneRequestRepo.findOne({
      where: {
        sourceProjectId,
        targetWorkspaceId,
        mode,
        requestedBy,
        status: ProjectCloneRequestStatus.IN_PROGRESS,
      },
    });
    if (inProgress) return inProgress;

    // Return the most recent completed request for this key (no time limit).
    // Uses IDX_clone_requests_lookup composite index.
    const lastCompleted = await this.cloneRequestRepo
      .createQueryBuilder('r')
      .where('r.source_project_id = :sourceProjectId', { sourceProjectId })
      .andWhere('r.target_workspace_id = :targetWorkspaceId', {
        targetWorkspaceId,
      })
      .andWhere('r.mode = :mode', { mode })
      .andWhere('r.requested_by = :requestedBy', { requestedBy })
      .andWhere('r.status = :status', {
        status: ProjectCloneRequestStatus.COMPLETED,
      })
      .orderBy('r.created_at', 'DESC')
      .getOne();

    return lastCompleted || null;
  }

  /**
   * Generate a unique project name in the target workspace.
   * No slug logic — projects do not have slugs.
   */
  private async generateCloneName(
    sourceName: string,
    targetWorkspaceId: string,
    organizationId: string,
    manager: EntityManager,
    requestedName?: string,
  ): Promise<string> {
    const baseName = requestedName || `${sourceName} (Copy)`;

    // Fetch existing project names in the target workspace
    const existing = await manager.find(Project, {
      where: { workspaceId: targetWorkspaceId, organizationId },
      select: ['name'],
    });
    const existingNames = new Set(existing.map((p) => p.name));

    if (!existingNames.has(baseName)) return baseName;

    // Append counter to avoid collision
    for (let i = 2; i <= 100; i++) {
      const candidate = requestedName
        ? `${requestedName} (${i})`
        : `${sourceName} (Copy ${i})`;
      if (!existingNames.has(candidate)) return candidate;
    }

    // Fallback: append timestamp
    return `${baseName} ${Date.now()}`;
  }

  /**
   * Copy WorkPhases from source project to new project.
   * Returns old→new phase ID map.
   */
  private async copyPhases(
    manager: EntityManager,
    sourceProjectId: string,
    newProjectId: string,
    targetWorkspaceId: string,
    organizationId: string,
    userId: string,
  ): Promise<Map<string, string>> {
    const phases = await manager.find(WorkPhase, {
      where: { projectId: sourceProjectId, deletedAt: null as any },
      order: { sortOrder: 'ASC' },
    });

    const idMap = new Map<string, string>();

    for (const phase of phases) {
      const newPhase = manager.create(WorkPhase, {
        organizationId,
        workspaceId: targetWorkspaceId,
        projectId: newProjectId,
        programId: null,
        name: phase.name,
        sortOrder: phase.sortOrder,
        reportingKey: phase.reportingKey,
        isMilestone: phase.isMilestone,
        startDate: phase.startDate,
        dueDate: phase.dueDate,
        sourceTemplatePhaseId: phase.sourceTemplatePhaseId,
        isLocked: false,
        createdByUserId: userId,
        deletedAt: null,
        deletedByUserId: null,
      });

      const saved = await manager.save(WorkPhase, newPhase);
      idMap.set(phase.id, saved.id);
    }

    return idMap;
  }

  /**
   * Copy PhaseGateDefinitions, remapping phaseId via the ID map.
   */
  private async copyGateDefinitions(
    manager: EntityManager,
    sourceProjectId: string,
    newProjectId: string,
    targetWorkspaceId: string,
    organizationId: string,
    userId: string,
    phaseIdMap: Map<string, string>,
  ): Promise<number> {
    const gates = await manager.find(PhaseGateDefinition, {
      where: { projectId: sourceProjectId, deletedAt: null as any },
    });

    let count = 0;
    for (const gate of gates) {
      const newPhaseId = phaseIdMap.get(gate.phaseId);
      if (!newPhaseId) continue; // Skip if the phase was not copied (deleted)

      const newGate = manager.create(PhaseGateDefinition, {
        organizationId,
        workspaceId: targetWorkspaceId,
        projectId: newProjectId,
        phaseId: newPhaseId,
        name: gate.name,
        gateKey: gate.gateKey,
        status: gate.status,
        reviewersRolePolicy: gate.reviewersRolePolicy,
        requiredDocuments: gate.requiredDocuments,
        requiredChecklist: gate.requiredChecklist,
        thresholds: gate.thresholds,
        createdByUserId: userId,
        deletedAt: null,
      });

      await manager.save(PhaseGateDefinition, newGate);
      count++;
    }

    return count;
  }

  /**
   * Copy ProjectWorkflowConfig for the new project.
   */
  private async copyWorkflowConfig(
    manager: EntityManager,
    sourceProjectId: string,
    newProjectId: string,
    targetWorkspaceId: string,
    organizationId: string,
  ): Promise<boolean> {
    const config = await manager.findOne(ProjectWorkflowConfig, {
      where: { projectId: sourceProjectId },
    });

    if (!config) return false;

    const newConfig = manager.create(ProjectWorkflowConfig, {
      organizationId,
      workspaceId: targetWorkspaceId,
      projectId: newProjectId,
      defaultWipLimit: config.defaultWipLimit,
      statusWipLimits: config.statusWipLimits
        ? { ...config.statusWipLimits }
        : null,
    });

    await manager.save(ProjectWorkflowConfig, newConfig);
    return true;
  }

  /**
   * Copy ProjectKpi assignments (not values) for the new project.
   */
  private async copyKpiAssignments(
    manager: EntityManager,
    sourceProjectId: string,
    newProjectId: string,
  ): Promise<number> {
    const kpis = await manager.find(ProjectKpi, {
      where: { projectId: sourceProjectId },
    });

    let count = 0;
    for (const kpi of kpis) {
      const newKpi = manager.create(ProjectKpi, {
        projectId: newProjectId,
        kpiDefinitionId: kpi.kpiDefinitionId,
        isRequired: kpi.isRequired,
        source: kpi.source,
      });

      await manager.save(ProjectKpi, newKpi);
      count++;
    }

    return count;
  }

  /**
   * Copy ProjectViews for the new project.
   */
  private async copyProjectViews(
    manager: EntityManager,
    sourceProjectId: string,
    newProjectId: string,
  ): Promise<number> {
    const views = await manager.find(ProjectView, {
      where: { projectId: sourceProjectId },
      order: { sortOrder: 'ASC' },
    });

    let count = 0;
    for (const view of views) {
      const newView = manager.create(ProjectView, {
        projectId: newProjectId,
        type: view.type,
        label: view.label,
        sortOrder: view.sortOrder,
        isEnabled: view.isEnabled,
        config: view.config ? { ...view.config } : {},
      });

      await manager.save(ProjectView, newView);
      count++;
    }

    return count;
  }
}
