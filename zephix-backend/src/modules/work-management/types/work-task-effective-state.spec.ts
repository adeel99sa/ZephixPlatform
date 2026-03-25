import { TaskStatus } from '../enums/task.enums';
import { PhaseState } from '../enums/phase-state.enum';
import {
  computeWorkTaskEffectiveState,
  mapWorkTaskEffectiveState,
} from './work-task-effective-state';

describe('computeWorkTaskEffectiveState', () => {
  it('returns FROZEN when phase is FROZEN', () => {
    expect(
      computeWorkTaskEffectiveState(PhaseState.FROZEN, TaskStatus.IN_PROGRESS),
    ).toBe('FROZEN');
  });

  it('returns LOCKED when phase is LOCKED', () => {
    expect(
      computeWorkTaskEffectiveState(PhaseState.LOCKED, TaskStatus.TODO),
    ).toBe('LOCKED');
  });

  it('returns ARCHIVED when phase is COMPLETE', () => {
    expect(
      computeWorkTaskEffectiveState(PhaseState.COMPLETE, TaskStatus.DONE),
    ).toBe('ARCHIVED');
  });

  it('returns task status when phase is ACTIVE', () => {
    expect(
      computeWorkTaskEffectiveState(PhaseState.ACTIVE, TaskStatus.REWORK),
    ).toBe(TaskStatus.REWORK);
  });

  it('mapWorkTaskEffectiveState matches compute when phase unknown', () => {
    expect(mapWorkTaskEffectiveState(TaskStatus.TODO, null)).toBe(
      TaskStatus.TODO,
    );
  });
});
