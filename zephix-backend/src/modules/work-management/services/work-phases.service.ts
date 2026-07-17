import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, IsNull, Not } from 'typeorm';
import { WorkPhase } from '../entities/work-phase.entity';
import { Project, ProjectState } from '../../projects/entities/project.entity';
import { WorkspaceAccessService } from '../../workspace-access/workspace-access.service';
import { TenantContextService } from '../../tenancy/tenant-context.service';
import { UpdateWorkPhaseDto } from '../dto/update-work-phase.dto';
import { CreateWorkPhaseDto } from '../dto/create-work-phase.dto';
import { AckTokenService, AckRequiredResponse } from './ack-token.service';
import { AuditEvent } from '../entities/audit-event.entity';
import { AuditAction, AuditEntityType } from '../../audit/audit.constants';

interface AuthContext {
  userId: string;
  organizationId: string;
  platformRole?: string;
}

/**
 * Phase gate governance (`phase-gate-approval` policy via
 * `GovernanceRuleEngineService.evaluatePhaseGateTransition`):
 *
 * TODO — Work phases are structural rows (name, sortOrder, dates,
 * `is_locked`, etc.) without a lifecycle status enum or a dedicated
 * “advance / submit gate” mutation. Wiring `evaluatePhaseGateTransition`
 * requires a product-level phase gate action before enforcement can run.
 */

/**
 * Lightweight phase DTO for listing
 */
export interface WorkPhaseListDto {
  id: string;
  name: string;
  sortOrder: number;
  reportingKey: string;
  isMilestone: boolean;
  isLocked: boolean;
  dueDate: string | null;
  deletedAt: string | null;
  deletedByUserId: string | null;
}

@Injectable()
export class WorkPhasesService {
  constructor(
    @InjectRepository(WorkPhase)
    private readonly phaseRepo: Repository<WorkPhase>,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    @InjectRepository(AuditEvent)
    private readonly auditRepo: Repository<AuditEvent>,
    private readonly dataSource: DataSource,
    private readonly workspaceAccessService: WorkspaceAccessService,
    private readonly tenantContext: TenantContextService,
    private readonly ackTokenService: AckTokenService,
  ) {}

  /**
   * List phases for a project.
   * If deletedOnly is true, returns only soft-deleted phases.
   * Otherwise, returns only active (non-deleted) phases.
   */
  async listPhases(
    auth: AuthContext,
    workspaceId: string,
    projectId: string,
    deletedOnly: boolean,
  ): Promise<WorkPhaseListDto[]> {
    const organizationId = this.tenantContext.assertOrganizationId();

    // Validate workspace access
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

    // Build query based on deletedOnly flag
    const whereClause: any = {
      projectId,
      workspaceId,
    };

    if (deletedOnly) {
      whereClause.deletedAt = Not(IsNull());
    } else {
      whereClause.deletedAt = IsNull();
    }

    const phases = await this.phaseRepo.find({
      where: whereClause,
      order: { sortOrder: 'ASC' },
      select: [
        'id',
        'name',
        'sortOrder',
        'reportingKey',
        'isMilestone',
        'isLocked',
        'dueDate',
        'deletedAt',
        'deletedByUserId',
      ],
    });

    return phases.map((p) => ({
      id: p.id,
      name: p.name,
      sortOrder: p.sortOrder,
      reportingKey: p.reportingKey,
      isMilestone: p.isMilestone,
      isLocked: p.isLocked,
      dueDate: p.dueDate ? (p.dueDate instanceof Date ? p.dueDate.toISOString() : String(p.dueDate)) : null,
      deletedAt: p.deletedAt ? (p.deletedAt instanceof Date ? p.deletedAt.toISOString() : String(p.deletedAt)) : null,
      deletedByUserId: p.deletedByUserId || null,
    }));
  }

  /**
   * Create a new phase for a project.
   * Automatically assigns the next sortOrder.
   */
  async createPhase(
    auth: AuthContext,
    workspaceId: string,
    dto: CreateWorkPhaseDto,
  ): Promise<WorkPhase> {
    const organizationId = this.tenantContext.assertOrganizationId();

    // Validate workspace access
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

    // Validate project exists and belongs to workspace
    const project = await this.projectRepo.findOne({
      where: { id: dto.projectId, organizationId, workspaceId },
      select: ['id', 'state', 'structureLocked'],
    });

    if (!project) {
      throw new NotFoundException({
        code: 'PROJECT_NOT_FOUND',
        message: 'Project not found',
      });
    }

    // Don't allow phase creation on locked projects
    if (project.structureLocked) {
      throw new ConflictException({
        code: 'STRUCTURE_LOCKED',
        message: 'Cannot add phases to a locked project',
      });
    }

    // Get the next sortOrder
    const maxSortResult = await this.phaseRepo
      .createQueryBuilder('phase')
      .select('MAX(phase.sortOrder)', 'maxSort')
      .where('phase.projectId = :projectId', { projectId: dto.projectId })
      .andWhere('phase.workspaceId = :workspaceId', { workspaceId })
      .andWhere('phase.deletedAt IS NULL')
      .getRawOne();

    const nextSortOrder = (maxSortResult?.maxSort ?? 0) + 1;

    // Generate reporting key
    const reportingKey = `PHASE-${nextSortOrder}`;

    // Create the phase
    const phase = this.phaseRepo.create({
      organizationId,
      workspaceId,
      projectId: dto.projectId,
      name: dto.name,
      sortOrder: nextSortOrder,
      reportingKey,
      isMilestone: dto.isMilestone ?? false,
      isLocked: false,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
      createdByUserId: auth.userId,
    });

    const savedPhase = await this.phaseRepo.save(phase);

    // Write audit event: PHASE_CREATED (Phase 3B schema)
    const auditEvent = this.auditRepo.create({
      organizationId: auth.organizationId,
      workspaceId,
      actorUserId: auth.userId,
      actorPlatformRole: auth.platformRole || 'MEMBER',
      action: AuditAction.PHASE_CREATED,
      entityType: AuditEntityType.PHASE,
      entityId: savedPhase.id,
      metadataJson: {
        name: savedPhase.name,
        projectId: dto.projectId,
      },
    });
    await this.auditRepo.save(auditEvent);

    return savedPhase;
  }

  /**
   * Reorder phases by providing an ordered array of phase IDs.
   */
  async reorderPhases(
    auth: AuthContext,
    workspaceId: string,
    projectId: string,
    orderedPhaseIds: string[],
  ): Promise<void> {
    const organizationId = this.tenantContext.assertOrganizationId();

    // Validate workspace access
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

    // Validate project exists and is not locked
    const project = await this.projectRepo.findOne({
      where: { id: projectId, organizationId, workspaceId },
      select: ['id', 'state', 'structureLocked'],
    });

    if (!project) {
      throw new NotFoundException({
        code: 'PROJECT_NOT_FOUND',
        message: 'Project not found',
      });
    }

    // Validate that orderedPhaseIds is a COMPLETE PERMUTATION of the
    // project's live (non-deleted) phase set. A partial or polluted list
    // would, under the two-pass write below, settle the named phases to
    // 1..k and abandon the rest at stale positions — a silently corrupted
    // ordering returned as 200. The contract is all-or-nothing: same set,
    // no duplicates, no foreign/unknown ids, none missing. Fail loud and
    // name the offenders rather than no-op silently on unmatched rows.
    const livePhases = await this.phaseRepo.find({
      where: { projectId, workspaceId, deletedAt: IsNull() },
      select: ['id'],
    });
    const liveIds = new Set(livePhases.map((p) => p.id));

    const seen = new Set<string>();
    const duplicateIds: string[] = [];
    const foreignIds: string[] = [];
    for (const id of orderedPhaseIds) {
      if (seen.has(id)) {
        duplicateIds.push(id);
      } else {
        seen.add(id);
        if (!liveIds.has(id)) {
          foreignIds.push(id);
        }
      }
    }
    const missingIds = livePhases
      .map((p) => p.id)
      .filter((id) => !seen.has(id));

    if (duplicateIds.length || foreignIds.length || missingIds.length) {
      throw new BadRequestException({
        code: 'PHASE_REORDER_INVALID_SET',
        message:
          'orderedPhaseIds must be a complete permutation of the project\'s live phases',
        duplicateIds,
        foreignIds,
        missingIds,
      });
    }

    // Two-pass update within a single transaction. A sequential one-pass
    // write (set phase A to position 2 while phase B still holds 2) trips
    // the partial unique index IDX_work_phases_project_sort mid-flight —
    // the reorder has 500'd since that index shipped (2026-01-21). Pass 1
    // parks every target in negative sort_order space (no valid sortOrder
    // is ever negative, so it cannot collide with any positive row); pass 2
    // settles to final positions, now all clear.
    await this.dataSource.transaction(async (manager) => {
      for (let i = 0; i < orderedPhaseIds.length; i++) {
        await manager.update(
          WorkPhase,
          {
            id: orderedPhaseIds[i],
            workspaceId,
            projectId,
            deletedAt: IsNull(),
          },
          { sortOrder: -(i + 1) },
        );
      }
      for (let i = 0; i < orderedPhaseIds.length; i++) {
        await manager.update(
          WorkPhase,
          {
            id: orderedPhaseIds[i],
            workspaceId,
            projectId,
            deletedAt: IsNull(),
          },
          { sortOrder: i + 1 },
        );
      }
    });

    // Write audit event: PHASES_REORDERED (Phase 3B schema)
    const auditEvent = this.auditRepo.create({
      organizationId: auth.organizationId,
      workspaceId,
      actorUserId: auth.userId,
      actorPlatformRole: auth.platformRole || 'MEMBER',
      action: AuditAction.PHASE_REORDERED,
      entityType: AuditEntityType.PROJECT,
      entityId: projectId,
      metadataJson: {
        orderedPhaseIds,
      },
    });
    await this.auditRepo.save(auditEvent);
  }

  /**
   * Update phase name or due date
   * For ACTIVE projects, milestone phase edits require acknowledgement
   */
  async updatePhase(
    auth: AuthContext,
    workspaceId: string,
    phaseId: string,
    dto: UpdateWorkPhaseDto,
    ackToken?: string,
  ): Promise<WorkPhase | AckRequiredResponse> {
    const organizationId = this.tenantContext.assertOrganizationId();

    // Validate workspace access
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

    // Load phase with project (exclude deleted phases)
    const phase = await this.phaseRepo.findOne({
      where: { id: phaseId, workspaceId, deletedAt: IsNull() },
      relations: ['project'],
    });

    if (!phase) {
      throw new NotFoundException({
        code: 'PHASE_NOT_FOUND',
        message: 'Phase not found',
      });
    }

    if (!phase.projectId) {
      throw new ConflictException({
        code: 'INVALID_OPERATION',
        message: 'Phase must belong to a project',
      });
    }

    // Load project state
    const project = await this.projectRepo.findOne({
      where: { id: phase.projectId, organizationId, workspaceId },
      select: ['id', 'state', 'structureLocked'],
    });

    if (!project) {
      throw new NotFoundException({
        code: 'PROJECT_NOT_FOUND',
        message: 'Project not found',
      });
    }

    // Check if this is a reporting-impact edit (milestone phase edit after start)
    const isNameChange = dto.name !== undefined && dto.name !== phase.name;
    const isDueDateChange =
      dto.dueDate !== undefined &&
      dto.dueDate !== (phase.dueDate?.toISOString().split('T')[0] || null);

    const isReportingImpactEdit =
      project.state === ProjectState.ACTIVE &&
      phase.isMilestone &&
      (isNameChange || isDueDateChange);

    if (isReportingImpactEdit) {
      // Check if ack token provided
      if (!ackToken) {
        // Determine operation type
        const operationType = isNameChange
          ? 'RENAME_PHASE'
          : 'UPDATE_MILESTONE_DATE';

        // Generate ack required response
        const payloadHash = this.ackTokenService.buildPayloadHash(
          operationType,
          {
            phaseId,
            name: dto.name,
            dueDate: dto.dueDate,
          },
        );

        const token = await this.ackTokenService.generateToken({
          organizationId,
          workspaceId,
          projectId: phase.projectId,
          userId: auth.userId,
          operationCode: operationType,
          targetEntityId: phaseId,
          payloadHash,
        });

        const expiresAt = new Date(Date.now() + 300 * 1000); // 5 minutes

        return {
          code: 'ACK_REQUIRED',
          message: 'Confirmation required',
          ack: {
            token,
            expiresAt: expiresAt.toISOString(),
            impactSummary: this.buildImpactSummary(phase, dto),
            impactedEntities: [
              {
                type: 'PHASE',
                id: phaseId,
                name: phase.name,
              },
            ],
          },
        };
      }

      // Validate ack token and perform update in transaction
      const operationType = isNameChange
        ? 'RENAME_PHASE'
        : 'UPDATE_MILESTONE_DATE';
      const payloadHash = this.ackTokenService.buildPayloadHash(operationType, {
        phaseId,
        name: dto.name,
        dueDate: dto.dueDate,
      });

      // Wrap token consume, phase update, and audit writes in transaction
      return await this.dataSource.transaction(async (manager) => {
        // Validate and consume token (uses transaction manager)
        await this.ackTokenService.validateAndConsume(
          ackToken,
          organizationId,
          workspaceId,
          phase.projectId,
          auth.userId,
          operationType,
          phaseId,
          payloadHash,
          manager,
        );

        // Write audit event: ACK_CONSUMED
        const ackConsumedEvent = manager.create(AuditEvent, {
          organizationId,
          workspaceId,
          actorUserId: auth.userId,
          actorPlatformRole: auth.platformRole ?? 'MEMBER',
          action: AuditAction.ACK_CONSUMED,
          entityType: AuditEntityType.PHASE,
          entityId: phaseId,
          metadataJson: {
            operationType,
            projectId: phase.projectId,
            impactSummary: this.buildImpactSummary(phase, dto),
          },
        });
        await manager.save(ackConsumedEvent);

        // Apply updates
        const oldName = phase.name;
        const oldDueDate = phase.dueDate;

        if (dto.name !== undefined) {
          phase.name = dto.name;
        }
        if (dto.dueDate !== undefined) {
          phase.dueDate = dto.dueDate ? new Date(dto.dueDate) : null;
        }
        if (dto.sortOrder !== undefined) {
          phase.sortOrder = dto.sortOrder;
        }
        if (dto.reportingKey !== undefined) {
          phase.reportingKey = dto.reportingKey;
        }
        if (dto.isMilestone !== undefined) {
          phase.isMilestone = dto.isMilestone;
        }

        // Save phase (if this fails, transaction rolls back and PHASE_UPDATED_WITH_ACK is not written)
        const updatedPhase = await manager.save(phase);

        // Write audit event: PHASE_UPDATED_WITH_ACK (only if phase save succeeded)
        const phaseUpdatedEvent = manager.create(AuditEvent, {
          organizationId,
          workspaceId,
          actorUserId: auth.userId,
          actorPlatformRole: auth.platformRole ?? 'MEMBER',
          action: AuditAction.PHASE_UPDATED_WITH_ACK,
          entityType: AuditEntityType.PHASE,
          entityId: phaseId,
          metadataJson: {
            projectId: phase.projectId,
            oldName,
            newName: updatedPhase.name,
            oldDueDate: oldDueDate?.toISOString() || null,
            newDueDate: updatedPhase.dueDate?.toISOString() || null,
          },
        });
        await manager.save(phaseUpdatedEvent);

        return updatedPhase;
      });
    }

    // Non-ack updates (no transaction needed, no audit)
    if (dto.name !== undefined) {
      phase.name = dto.name;
    }
    if (dto.dueDate !== undefined) {
      phase.dueDate = dto.dueDate ? new Date(dto.dueDate) : null;
    }
    if (dto.sortOrder !== undefined) {
      phase.sortOrder = dto.sortOrder;
    }
    if (dto.reportingKey !== undefined) {
      phase.reportingKey = dto.reportingKey;
    }
    if (dto.isMilestone !== undefined) {
      phase.isMilestone = dto.isMilestone;
    }

    await this.phaseRepo.save(phase);

    return phase;
  }

  private buildImpactSummary(
    phase: WorkPhase,
    dto: UpdateWorkPhaseDto,
  ): string {
    const changes: string[] = [];
    if (dto.name !== undefined && dto.name !== phase.name) {
      changes.push(`Renaming milestone phase. ${phase.name}`);
    }
    if (dto.dueDate !== undefined) {
      changes.push('Changing milestone due date');
    }
    return changes.join('. ') + '. This affects tracking and reporting.';
  }

  /**
   * Restore a soft-deleted phase.
   * Returns 404 PHASE_NOT_FOUND if phase doesn't exist.
   * Returns 400 PHASE_NOT_DELETED if phase is not deleted.
   */
  async restorePhase(
    auth: AuthContext,
    workspaceId: string,
    phaseId: string,
  ): Promise<WorkPhase> {
    const organizationId = this.tenantContext.assertOrganizationId();

    // Validate workspace access
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

    // Load phase including deleted ones (verify workspace scope)
    const phase = await this.phaseRepo.findOne({
      where: { id: phaseId, workspaceId },
    });

    if (!phase) {
      throw new NotFoundException({
        code: 'PHASE_NOT_FOUND',
        message: 'Phase not found',
      });
    }

    if (!phase.deletedAt) {
      throw new BadRequestException({
        code: 'PHASE_NOT_DELETED',
        message: 'Phase is not deleted',
      });
    }

    // Restore: clear deletedAt and deletedByUserId
    phase.deletedAt = null;
    phase.deletedByUserId = null;
    const restored = await this.phaseRepo.save(phase);

    // Write audit event: PHASE_RESTORED (Phase 3B schema)
    const auditEvent = this.auditRepo.create({
      organizationId: auth.organizationId,
      workspaceId,
      actorUserId: auth.userId,
      actorPlatformRole: auth.platformRole || 'MEMBER',
      action: AuditAction.PHASE_RESTORED,
      entityType: AuditEntityType.PHASE,
      entityId: phaseId,
      metadataJson: {
        name: phase.name,
        projectId: phase.projectId,
      },
    });
    await this.auditRepo.save(auditEvent);

    return restored;
  }

  /**
   * Soft-delete a phase.
   * Sets deletedAt and deletedByUserId instead of hard delete.
   */
  async deletePhase(
    auth: AuthContext,
    workspaceId: string,
    phaseId: string,
  ): Promise<void> {
    const organizationId = this.tenantContext.assertOrganizationId();

    // Validate workspace access
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

    // Load active phase (non-deleted, verify workspace scope)
    const phase = await this.phaseRepo.findOne({
      where: { id: phaseId, workspaceId, deletedAt: IsNull() },
    });

    if (!phase) {
      throw new NotFoundException({
        code: 'PHASE_NOT_FOUND',
        message: 'Phase not found',
      });
    }

    // Soft delete: set deletedAt and deletedByUserId
    phase.deletedAt = new Date();
    phase.deletedByUserId = auth.userId;
    await this.phaseRepo.save(phase);

    // Write audit event: PHASE_DELETED (Phase 3B schema)
    const auditEvent = this.auditRepo.create({
      organizationId: auth.organizationId,
      workspaceId,
      actorUserId: auth.userId,
      actorPlatformRole: auth.platformRole || 'MEMBER',
      action: AuditAction.PHASE_DELETED,
      entityType: AuditEntityType.PHASE,
      entityId: phaseId,
      metadataJson: {
        name: phase.name,
        projectId: phase.projectId,
      },
    });
    await this.auditRepo.save(auditEvent);
  }
}
