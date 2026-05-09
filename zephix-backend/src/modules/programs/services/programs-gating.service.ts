import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Workspace,
  WorkspaceComplexityMode,
} from '../../workspaces/entities/workspace.entity';

/**
 * B2 / ADR-B2-003 — Programs availability gate.
 *
 * Programs are a `governed`-tier capability. Workspaces in `lean` or
 * `standard` mode cannot create new Programs. Existing Programs in
 * non-governed workspaces remain readable for backward compatibility —
 * gating is enforced only on `create` paths.
 *
 * Wiring:
 *   PR1 (this commit): bare service + unit tests, no production caller.
 *   PR2: ProgramsService.create() invokes assertProgramsAvailable() before
 *        its existing logic; gated behind feature flag B2_TENANCY_V2_ENABLED.
 */
@Injectable()
export class ProgramsGatingService {
  private readonly logger = new Logger(ProgramsGatingService.name);

  constructor(
    @InjectRepository(Workspace)
    private readonly workspaceRepo: Repository<Workspace>,
  ) {}

  /**
   * Returns true iff the workspace is in `governed` mode. Throws
   * NotFoundException if the workspace does not exist (eagerly fails
   * rather than silently returning false; callers that need a soft-check
   * should catch and remap).
   *
   * Legacy values ('advanced') are NOT auto-promoted to 'governed' here —
   * Stage 2 backfill (PR2) is the canonical promotion. Until then, an
   * unmigrated `advanced` workspace will return false from this gate.
   * This is intentional: it surfaces unmigrated rows during the cutover
   * window so they can be identified and migrated.
   */
  async isProgramsAvailable(workspaceId: string): Promise<boolean> {
    const ws = await this.workspaceRepo.findOne({
      where: { id: workspaceId },
      select: ['id', 'complexityMode'],
    });

    if (!ws) {
      throw new NotFoundException(`Workspace ${workspaceId} not found`);
    }

    return ws.complexityMode === WorkspaceComplexityMode.GOVERNED;
  }

  /**
   * Asserts the workspace is in `governed` mode. Throws Forbidden with
   * code `PROGRAMS_NOT_AVAILABLE_FOR_TIER` otherwise.
   *
   * The error payload includes the current mode so the frontend banner
   * (Stream B) can render an appropriate "upgrade to governed" CTA.
   */
  async assertProgramsAvailable(workspaceId: string): Promise<void> {
    const ws = await this.workspaceRepo.findOne({
      where: { id: workspaceId },
      select: ['id', 'complexityMode'],
    });

    if (!ws) {
      throw new NotFoundException(`Workspace ${workspaceId} not found`);
    }

    if (ws.complexityMode !== WorkspaceComplexityMode.GOVERNED) {
      this.logger.debug(
        `Programs gating denied: workspace=${workspaceId} mode=${ws.complexityMode}`,
      );
      throw new ForbiddenException({
        code: 'PROGRAMS_NOT_AVAILABLE_FOR_TIER',
        message:
          'Programs are available only in workspaces with complexity_mode = governed. ' +
          'Existing Programs remain readable; upgrade the workspace tier to create new ones.',
        currentMode: ws.complexityMode,
        requiredMode: WorkspaceComplexityMode.GOVERNED,
      });
    }
  }
}
