import { ConflictException, Injectable } from '@nestjs/common';
import { Project, ProjectState } from '../../projects/entities/project.entity';
import { WorkPhase } from '../entities/work-phase.entity';
import { PhaseState } from '../enums/phase-state.enum';

/**
 * Deterministic structural locks for task-scoped mutations (separate from governance rule engine).
 * F-2: project lifecycle + phase_state enforcement.
 */
@Injectable()
export class WorkTaskStructuralGuardService {
  /**
   * Task field mutations, dependencies, create/delete/restore — blocked when project or phase disallows.
   */
  assertTaskFieldMutationAllowed(
    project: Project,
    phase: WorkPhase | null,
  ): void {
    if (project.state === ProjectState.TERMINATED) {
      throw new ConflictException({
        code: 'PROJECT_TERMINATED',
        message:
          'Project is terminated. Task changes are not allowed.',
      });
    }
    if (project.state === ProjectState.ON_HOLD) {
      throw new ConflictException({
        code: 'PROJECT_ON_HOLD',
        message:
          'Project is on hold. Task changes are not allowed except comments.',
      });
    }
    if (phase) {
      if (phase.phaseState === PhaseState.FROZEN) {
        throw new ConflictException({
          code: 'PHASE_FROZEN',
          message: 'Phase is frozen. Task changes are not allowed.',
        });
      }
      if (phase.phaseState === PhaseState.LOCKED) {
        throw new ConflictException({
          code: 'PHASE_LOCKED',
          message: 'Phase is locked. Task changes are not allowed.',
        });
      }
      if (phase.phaseState === PhaseState.COMPLETE) {
        throw new ConflictException({
          code: 'PHASE_COMPLETE',
          message:
            'Phase is complete. Task field changes are not allowed; comments may be allowed.',
        });
      }
    }
  }

  /**
   * Comments: allowed on ON_HOLD and COMPLETE phase; blocked when project TERMINATED only (F-2 lock).
   */
  assertCommentAllowed(project: Project): void {
    if (project.state === ProjectState.TERMINATED) {
      throw new ConflictException({
        code: 'PROJECT_TERMINATED',
        message:
          'Project is terminated. Comments are not allowed.',
      });
    }
  }
}
