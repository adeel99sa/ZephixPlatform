import { ConflictException } from '@nestjs/common';
import { WorkTaskStructuralGuardService } from './work-task-structural-guard.service';
import { ProjectState } from '../../projects/entities/project.entity';
import { WorkPhase } from '../entities/work-phase.entity';
import { PhaseState } from '../enums/phase-state.enum';

describe('WorkTaskStructuralGuardService', () => {
  const guard = new WorkTaskStructuralGuardService();

  function proj(state: ProjectState) {
    return { state } as { state: ProjectState };
  }

  function phase(ps: PhaseState) {
    return { phaseState: ps } as WorkPhase;
  }

  it('assertTaskFieldMutationAllowed blocks TERMINATED and ON_HOLD', () => {
    expect(() => guard.assertTaskFieldMutationAllowed(proj(ProjectState.TERMINATED) as any, null)).toThrow(
      ConflictException,
    );
    expect(() => guard.assertTaskFieldMutationAllowed(proj(ProjectState.ON_HOLD) as any, null)).toThrow(
      ConflictException,
    );
  });

  it('assertTaskFieldMutationAllowed blocks FROZEN, LOCKED, COMPLETE phases', () => {
    expect(() =>
      guard.assertTaskFieldMutationAllowed(proj(ProjectState.ACTIVE) as any, phase(PhaseState.FROZEN)),
    ).toThrow(ConflictException);
    expect(() =>
      guard.assertTaskFieldMutationAllowed(proj(ProjectState.ACTIVE) as any, phase(PhaseState.LOCKED)),
    ).toThrow(ConflictException);
    expect(() =>
      guard.assertTaskFieldMutationAllowed(proj(ProjectState.ACTIVE) as any, phase(PhaseState.COMPLETE)),
    ).toThrow(ConflictException);
  });

  it('assertCommentAllowed blocks only TERMINATED (F-2: ON_HOLD and ACTIVE allow comments)', () => {
    expect(() => guard.assertCommentAllowed(proj(ProjectState.TERMINATED) as any)).toThrow(ConflictException);
    guard.assertCommentAllowed(proj(ProjectState.ON_HOLD) as any);
    guard.assertCommentAllowed(proj(ProjectState.ACTIVE) as any);
  });
});
