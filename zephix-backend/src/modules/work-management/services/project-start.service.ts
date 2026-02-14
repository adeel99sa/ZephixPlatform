import {
  Injectable,
  Logger,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Repository } from 'typeorm';
import { Project, ProjectState } from '../../projects/entities/project.entity';
import { WorkPhase } from '../entities/work-phase.entity';
import { ProjectStructureGuardService } from './project-structure-guard.service';
import { ProjectHealthService } from './project-health.service';
import { WorkspaceRoleGuardService } from '../../workspace-access/workspace-role-guard.service';

export interface StartWorkResponseDto {
  projectId: string;
  state: string;
  structureLocked: boolean;
  startedAt: string;
}

@Injectable()
export class ProjectStartService {
  private readonly logger = new Logger(ProjectStartService.name);

  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(WorkPhase)
    private readonly workPhaseRepository: Repository<WorkPhase>,
    private readonly structureGuard: ProjectStructureGuardService,
    private readonly dataSource: DataSource,
    private readonly projectHealthService: ProjectHealthService,
    private readonly workspaceRoleGuard: WorkspaceRoleGuardService,
  ) {}

  /**
   * Start work on a project
   *
   * Transitions project from DRAFT to ACTIVE and locks structure
   * Atomic and irreversible - all operations in a single transaction
   */
  async startWork(
    projectId: string,
    workspaceId: string,
    organizationId: string,
    userId: string,
    platformRole?: string,
  ): Promise<StartWorkResponseDto> {
    // Use transaction to ensure atomicity - entire flow must succeed or fail together
    return await this.dataSource.transaction(async (manager) => {
      const projectRepo = manager.getRepository(Project);
      const phaseRepo = manager.getRepository(WorkPhase);

      // 1. Validate project exists and belongs to org and workspace
      const project = await projectRepo.findOne({
        where: {
          id: projectId,
          organizationId,
          workspaceId,
        },
        select: [
          'id',
          'state',
          'startedAt',
          'structureLocked',
          'templateId',
          'templateVersion',
          'deliveryOwnerUserId',
        ],
      });

      if (!project) {
        throw new ConflictException({
          code: 'NOT_FOUND',
          message: 'Project not found',
        });
      }

      // 2. Validate project.state is DRAFT, else throw 409 INVALID_STATE_TRANSITION
      if (project.state !== ProjectState.DRAFT) {
        throw new ConflictException({
          code: 'INVALID_STATE_TRANSITION',
          message: `Project is in ${project.state} state. Can only start work from DRAFT state.`,
        });
      }

      // Sprint 6: Validate delivery owner is set
      const projectWithOwner = await projectRepo.findOne({
        where: {
          id: projectId,
          organizationId,
          workspaceId,
        },
        select: [
          'id',
          'state',
          'startedAt',
          'structureLocked',
          'deliveryOwnerUserId',
        ],
      });

      if (!projectWithOwner?.deliveryOwnerUserId) {
        throw new ConflictException({
          code: 'DELIVERY_OWNER_REQUIRED',
          message: 'Delivery owner required',
        });
      }

      // 3. Ensure startedAt never changes - if already set, treat as INVALID_STATE_TRANSITION
      if (project.startedAt) {
        throw new ConflictException({
          code: 'INVALID_STATE_TRANSITION',
          message:
            'Project has already been started. startedAt is already set.',
        });
      }

      // 4. Load all phases for the project
      const phases = await phaseRepo.find({
        where: {
          organizationId,
          workspaceId,
          projectId,
        },
        order: {
          sortOrder: 'ASC',
        },
        select: ['id', 'reportingKey', 'name', 'sortOrder'],
      });

      // 5. Build structure snapshot
      const startedAt = new Date();
      const structureSnapshot = {
        containerType: 'PROJECT' as const,
        containerId: projectId,
        templateId: project.templateId || null,
        templateVersion: project.templateVersion || null,
        phases: phases.map((phase) => ({
          phaseId: phase.id,
          reportingKey: phase.reportingKey,
          name: phase.name,
          sortOrder: phase.sortOrder,
        })),
        lockedAt: startedAt.toISOString(),
        lockedByUserId: userId,
      };

      // 6. Update project state (all in transaction)
      await projectRepo.update(
        { id: projectId },
        {
          state: ProjectState.ACTIVE,
          startedAt,
          structureLocked: true,
          structureSnapshot,
        },
      );

      // 7. Lock all phases (must succeed or transaction rolls back)
      if (phases.length > 0) {
        const updateResult = await phaseRepo.update(
          { projectId },
          { isLocked: true },
        );
        // If phase lock update fails, transaction will roll back and project won't become ACTIVE
        if (updateResult.affected === 0 && phases.length > 0) {
          throw new Error('Failed to lock phases - transaction will roll back');
        }
      }

      // 8. Trigger health recalculation (outside transaction to avoid blocking)
      // Health is computed and persisted after project start
      setImmediate(async () => {
        try {
          await this.projectHealthService.recalculateProjectHealth(
            projectId,
            organizationId,
            workspaceId,
          );
        } catch (error) {
          this.logger.warn(
            'Failed to recalculate project health after start:',
            error,
          );
        }
      });

      return {
        projectId,
        state: ProjectState.ACTIVE,
        structureLocked: true,
        startedAt: startedAt.toISOString(),
      };
    });
  }

  /**
   * Set delivery owner for a project
   * Only workspace_owner can set delivery owner
   * Target user must be delivery_owner or workspace_owner in the workspace
   */
  async setDeliveryOwner(
    projectId: string,
    workspaceId: string,
    organizationId: string,
    userId: string,
    targetUserId: string,
  ): Promise<{ projectId: string; deliveryOwnerUserId: string }> {
    // Only workspace_owner can set delivery owner
    const role = await this.workspaceRoleGuard.getWorkspaceRole(
      workspaceId,
      userId,
    );
    if (role !== 'workspace_owner') {
      throw new ConflictException({
        code: 'FORBIDDEN_ROLE',
        message: 'Only workspace owner can set delivery owner',
      });
    }

    // Validate target user is in workspace and has delivery_owner or workspace_owner role
    const targetRole = await this.workspaceRoleGuard.getWorkspaceRole(
      workspaceId,
      targetUserId,
    );
    if (
      !targetRole ||
      (targetRole !== 'delivery_owner' && targetRole !== 'workspace_owner')
    ) {
      throw new ConflictException({
        code: 'FORBIDDEN_ROLE',
        message:
          'Target user must be delivery_owner or workspace_owner in this workspace',
      });
    }

    // Update project
    const project = await this.projectRepository.findOne({
      where: {
        id: projectId,
        organizationId,
        workspaceId,
      },
    });

    if (!project) {
      throw new ConflictException({
        code: 'NOT_FOUND',
        message: 'Project not found',
      });
    }

    project.deliveryOwnerUserId = targetUserId;
    await this.projectRepository.save(project);

    return { projectId, deliveryOwnerUserId: targetUserId };
  }
}
