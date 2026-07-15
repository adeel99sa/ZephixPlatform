import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from '../entities/project.entity';
import {
  ProjectCapabilities,
  resolveCapabilities,
} from './capabilities.types';
import { UpdateCapabilitiesDto } from './update-capabilities.dto';
import { AuditService } from '../../audit/services/audit.service';
import { AuditAction, AuditEntityType } from '../../audit/audit.constants';

/**
 * SKIP-1 (Type A): actor for the capability-toggle receipt. `use_gates=false`
 * silently skips ALL phase-gate governance (work-tasks.service), and that skip
 * previously left NO trace and NO actor — making "was this project governed in
 * March?" unanswerable. Recording the toggle ONCE, with the actor, is the answer
 * (not one skip row per task transition).
 */
export interface CapabilityToggleActor {
  userId: string;
  platformRole: string | null | undefined;
  workspaceRole?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

@Injectable()
export class ProjectCapabilitiesService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    @Optional() private readonly auditService?: AuditService,
  ) {}

  async get(
    projectId: string,
    workspaceId: string,
    organizationId: string,
  ): Promise<ProjectCapabilities> {
    const project = await this.projectRepo.findOne({
      where: { id: projectId, workspaceId, organizationId },
      select: ['id', 'capabilities'],
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    return resolveCapabilities(project.capabilities);
  }

  async patch(
    projectId: string,
    workspaceId: string,
    organizationId: string,
    dto: UpdateCapabilitiesDto,
    actor: CapabilityToggleActor,
  ): Promise<ProjectCapabilities> {
    // Actor identity must be present for the governance receipt. A null/empty
    // platformRole means upstream JWT/guard didn't populate it — refuse to write
    // an actor-less governance state change (SKIP-1 canon: no state change
    // without an actor). Mirrors WorkspacesService.setComplexityMode.
    if (actor.platformRole == null || actor.platformRole === '') {
      throw new InternalServerErrorException({
        code: 'CAPABILITY_TOGGLE_AUDIT_ACTOR_MISSING',
        message:
          'Authenticated actor has no resolvable platform role. ' +
          'This indicates a JWT or workspace-role guard configuration bug.',
      });
    }

    const project = await this.projectRepo.findOne({
      where: { id: projectId, workspaceId, organizationId },
      select: ['id', 'capabilities'],
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const existing = (project.capabilities ?? {}) as Record<string, unknown>;
    const updates: Record<string, boolean> = {};
    if (dto.use_phases !== undefined) updates.use_phases = dto.use_phases;
    if (dto.use_iterations !== undefined) updates.use_iterations = dto.use_iterations;
    if (dto.use_gates !== undefined) updates.use_gates = dto.use_gates;
    if (dto.use_wip_limits !== undefined) updates.use_wip_limits = dto.use_wip_limits;

    const merged = { ...existing, ...updates };

    // Resolve before/after through the same defaults the rest of the system
    // reads, so the receipt records EFFECTIVE capability state (not raw JSONB).
    const before = resolveCapabilities(project.capabilities);
    const after = resolveCapabilities(merged);

    await this.projectRepo.update(
      { id: projectId, organizationId },
      { capabilities: merged },
    );

    // Emit ONE receipt per patch that actually changes effective capabilities.
    // Idempotent no-op (nothing changed) writes nothing — so toggling use_gates
    // off then on produces exactly TWO rows, not two hundred.
    const changedKeys = (
      ['use_phases', 'use_iterations', 'use_gates', 'use_wip_limits'] as const
    ).filter((k) => before[k] !== after[k]);

    if (changedKeys.length > 0 && this.auditService) {
      await this.auditService.record({
        organizationId,
        workspaceId,
        actorUserId: actor.userId,
        actorPlatformRole: actor.platformRole,
        actorWorkspaceRole: actor.workspaceRole ?? null,
        entityType: AuditEntityType.PROJECT,
        entityId: projectId,
        // Reuse the governance action + governanceType discriminator, the same
        // pattern governance-exceptions uses (EXCEPTION_CREATED/RESOLUTION) — no
        // audit-CHECK widening needed.
        action: AuditAction.GOVERNANCE_EVALUATE,
        before: { capabilities: before },
        after: { capabilities: after },
        metadata: {
          governanceType: 'CAPABILITY_TOGGLED',
          changedCapabilities: changedKeys,
        },
        ipAddress: actor.ipAddress ?? null,
        userAgent: actor.userAgent ?? null,
      });
    }

    return after;
  }
}
