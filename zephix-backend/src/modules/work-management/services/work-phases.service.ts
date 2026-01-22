import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { WorkPhase } from '../entities/work-phase.entity';
import { Project, ProjectState } from '../../projects/entities/project.entity';
import { WorkspaceAccessService } from '../../workspace-access/workspace-access.service';
import { TenantContextService } from '../../tenancy/tenant-context.service';
import { UpdateWorkPhaseDto } from '../dto/update-work-phase.dto';
import { AckTokenService, AckRequiredResponse } from './ack-token.service';
import { AuditEvent } from '../entities/audit-event.entity';

interface AuthContext {
  userId: string;
  organizationId: string;
  platformRole?: string;
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

    // Load phase with project
    const phase = await this.phaseRepo.findOne({
      where: { id: phaseId, workspaceId },
      relations: ['project'],
    });

    if (!phase) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
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
        code: 'NOT_FOUND',
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
}
