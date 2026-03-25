import { TaskStatus } from '../enums/task.enums';
import { PhaseState } from '../enums/phase-state.enum';

/**
 * Resolved operational state for a work task (phase overrides + status).
 * ARCHIVED / FROZEN / LOCKED are inherited from WorkPhase.phase_state when applicable.
 */
export type WorkTaskEffectiveState =
  | 'FROZEN'
  | 'LOCKED'
  | 'ARCHIVED'
  | TaskStatus;

/**
 * Compute effective state from phase + task status.
 * When phase is not loaded, only task status is returned (caller must join phase for full accuracy).
 */
export function computeWorkTaskEffectiveState(
  phasePhaseState: PhaseState | null | undefined,
  taskStatus: TaskStatus,
): WorkTaskEffectiveState {
  if (phasePhaseState === PhaseState.FROZEN) {
    return 'FROZEN';
  }
  if (phasePhaseState === PhaseState.LOCKED) {
    return 'LOCKED';
  }
  if (phasePhaseState === PhaseState.COMPLETE) {
    return 'ARCHIVED';
  }
  return taskStatus;
}

/**
 * DTO helper when `phase` is loaded separately or not joined on the task query.
 */
export function mapWorkTaskEffectiveState(
  taskStatus: TaskStatus,
  phaseState: PhaseState | null | undefined,
): WorkTaskEffectiveState {
  return computeWorkTaskEffectiveState(phaseState ?? undefined, taskStatus);
}
