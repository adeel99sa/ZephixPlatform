import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project, ProjectState } from '../../projects/entities/project.entity';
import { WorkspaceAccessService } from '../../workspace-access/workspace-access.service';

/**
 * Service to guard against structure changes when project is locked
 *
 * Used by:
 * - Start work endpoint (validates state before transition)
 * - Future phase edit endpoints (validates structure is not locked)
 */
@Injectable()
export class ProjectStructureGuardService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    private readonly workspaceAccessService: WorkspaceAccessService,
  ) {}

  /**
   * Assert that project allows structure changes
   *
   * Throws 409 CONFLICT with code LOCKED_PHASE_STRUCTURE if:
   * - project.state is ACTIVE or COMPLETED
   * - project.structureLocked is true
   *
   * @param projectId - Project ID
   * @param workspaceId - Workspace ID
   * @param organizationId - Organization ID
   * @param userId - User ID (for workspace access check)
   * @param platformRole - Platform role (optional)
   */
  async assertProjectAllowsStructureChange(
    projectId: string,
    workspaceId: string,
    organizationId: string,
    userId: string,
    platformRole?: string,
  ): Promise<void> {
    // Verify workspace access
    const canAccess = await this.workspaceAccessService.canAccessWorkspace(
      workspaceId,
      organizationId,
      userId,
      platformRole,
    );
    if (!canAccess) {
      throw new ConflictException({
        code: 'WORKSPACE_REQUIRED',
        message: 'Workspace access denied',
      });
    }

    // Load project
    const project = await this.projectRepository.findOne({
      where: {
        id: projectId,
        organizationId,
        workspaceId,
      },
      select: ['id', 'state', 'structureLocked'],
    });

    if (!project) {
      throw new ConflictException({
        code: 'NOT_FOUND',
        message: 'Project not found',
      });
    }

    // Check if structure is locked
    if (
      project.state === ProjectState.ACTIVE ||
      project.state === ProjectState.COMPLETED
    ) {
      throw new ConflictException({
        code: 'LOCKED_PHASE_STRUCTURE',
        message:
          'Project structure is locked. Cannot modify phases after work has started.',
      });
    }

    if (project.structureLocked) {
      throw new ConflictException({
        code: 'LOCKED_PHASE_STRUCTURE',
        message: 'Project structure is locked. Cannot modify phases.',
      });
    }
  }

  /**
   * Assert that project is in DRAFT state for state transitions
   *
   * Throws 409 CONFLICT with code INVALID_STATE_TRANSITION if not DRAFT
   */
  async assertProjectIsDraft(
    projectId: string,
    workspaceId: string,
    organizationId: string,
    userId: string,
    platformRole?: string,
  ): Promise<Project> {
    // Verify workspace access
    const canAccess = await this.workspaceAccessService.canAccessWorkspace(
      workspaceId,
      organizationId,
      userId,
      platformRole,
    );
    if (!canAccess) {
      throw new ConflictException({
        code: 'WORKSPACE_REQUIRED',
        message: 'Workspace access denied',
      });
    }

    // Load project
    const project = await this.projectRepository.findOne({
      where: {
        id: projectId,
        organizationId,
        workspaceId,
      },
      select: [
        'id',
        'state',
        'structureLocked',
        'templateId',
        'templateVersion',
      ],
    });

    if (!project) {
      throw new ConflictException({
        code: 'NOT_FOUND',
        message: 'Project not found',
      });
    }

    // Check if project is in DRAFT state
    if (project.state !== ProjectState.DRAFT) {
      throw new ConflictException({
        code: 'INVALID_STATE_TRANSITION',
        message: `Project is in ${project.state} state. Can only start work from DRAFT state.`,
      });
    }

    return project;
  }

  /**
   * Assert that project allows WorkPhase writes
   *
   * Used by all code paths that create or modify WorkPhase entities
   * Throws 409 CONFLICT with code LOCKED_PHASE_STRUCTURE if project is ACTIVE or COMPLETED
   */
  async assertProjectAllowsPhaseWrites(
    projectId: string,
    workspaceId: string,
    organizationId: string,
    userId: string,
    platformRole?: string,
  ): Promise<void> {
    // Verify workspace access
    const canAccess = await this.workspaceAccessService.canAccessWorkspace(
      workspaceId,
      organizationId,
      userId,
      platformRole,
    );
    if (!canAccess) {
      throw new ConflictException({
        code: 'WORKSPACE_REQUIRED',
        message: 'Workspace access denied',
      });
    }

    // Load project state
    const project = await this.projectRepository.findOne({
      where: {
        id: projectId,
        organizationId,
        workspaceId,
      },
      select: ['id', 'state', 'structureLocked'],
    });

    if (!project) {
      throw new ConflictException({
        code: 'NOT_FOUND',
        message: 'Project not found',
      });
    }

    // Check if structure is locked
    if (
      project.state === ProjectState.ACTIVE ||
      project.state === ProjectState.COMPLETED
    ) {
      throw new ConflictException({
        code: 'LOCKED_PHASE_STRUCTURE',
        message:
          'Project structure is locked. Cannot modify phases after work has started.',
      });
    }

    if (project.structureLocked) {
      throw new ConflictException({
        code: 'LOCKED_PHASE_STRUCTURE',
        message: 'Project structure is locked. Cannot modify phases.',
      });
    }
  }
}
