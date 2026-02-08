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

interface AuthContext {
  userId: string;
  organizationId: string;
  platformRole?: string;
}

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

    // Write audit event: PHASE_CREATED
    const auditEvent = this.auditRepo.create({
      workspaceId,
      projectId: dto.projectId,
      userId: auth.userId,
      eventType: 'PHASE_CREATED',
      entityType: 'PHASE',
      entityId: savedPhase.id,
      metadata: {
        name: savedPhase.name,
        createdBy: auth.userId,
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

    // Don't allow reorder on ACTIVE or later projects
    if (
      project.state === ProjectState.ACTIVE ||
      project.state === ProjectState.COMPLETED
    ) {
      throw new ConflictException({
        code: 'REPORTING_IMPACT_NOT_ALLOWED',
        message: 'Cannot reorder phases after project is active',
      });
    }

    // Update sortOrder for each phase in order
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
          { sortOrder: i + 1 },
        );
      }
    });

    // Write audit event: PHASES_REORDERED
    const auditEvent = this.auditRepo.create({
      workspaceId,
      projectId,
      userId: auth.userId,
      eventType: 'PHASES_REORDERED',
      entityType: 'PROJECT',
      entityId: projectId,
      metadata: {
        orderedPhaseIds,
        reorderedBy: auth.userId,
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

    // After ACTIVE: Check for disallowed changes (even with ack token)
    if (
      project.state === ProjectState.ACTIVE ||
      project.state === ProjectState.COMPLETED
    ) {
      // Disallowed changes after ACTIVE (even with ack token)
      if (
        dto.sortOrder !== undefined ||
        dto.reportingKey !== undefined ||
        dto.isMilestone !== undefined
      ) {
        throw new ConflictException({
          code: 'REPORTING_IMPACT_NOT_ALLOWED',
          message: 'Change not allowed after start.',
        });
      }
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
          workspaceId,
          projectId: phase.projectId,
          userId: auth.userId,
          eventType: 'ACK_CONSUMED',
          entityType: 'PHASE',
          entityId: phaseId,
          metadata: {
            operationType,
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

        // Save phase (if this fails, transaction rolls back and PHASE_UPDATED_WITH_ACK is not written)
        const updatedPhase = await manager.save(phase);

        // Write audit event: PHASE_UPDATED_WITH_ACK (only if phase save succeeded)
        const phaseUpdatedEvent = manager.create(AuditEvent, {
          workspaceId,
          projectId: phase.projectId,
          userId: auth.userId,
          eventType: 'PHASE_UPDATED_WITH_ACK',
          entityType: 'PHASE',
          entityId: phaseId,
          metadata: {
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

    // Write audit event: PHASE_RESTORED
    const auditEvent = this.auditRepo.create({
      workspaceId,
      projectId: phase.projectId,
      userId: auth.userId,
      eventType: 'PHASE_RESTORED',
      entityType: 'PHASE',
      entityId: phaseId,
      metadata: {
        name: phase.name,
        restoredBy: auth.userId,
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

    // Write audit event: PHASE_DELETED
    const auditEvent = this.auditRepo.create({
      workspaceId,
      projectId: phase.projectId,
      userId: auth.userId,
      eventType: 'PHASE_DELETED',
      entityType: 'PHASE',
      entityId: phaseId,
      metadata: {
        name: phase.name,
        deletedBy: auth.userId,
      },
    });
    await this.auditRepo.save(auditEvent);
  }
}
