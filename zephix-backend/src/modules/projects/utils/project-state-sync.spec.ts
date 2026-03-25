import { ProjectState, ProjectStatus } from '../entities/project.entity';
import { legacyProjectStatusForState } from './project-state-sync';

describe('legacyProjectStatusForState', () => {
  it('maps ON_HOLD to on-hold', () => {
    expect(legacyProjectStatusForState(ProjectState.ON_HOLD)).toBe(
      ProjectStatus.ON_HOLD,
    );
  });

  it('maps TERMINATED to cancelled', () => {
    expect(legacyProjectStatusForState(ProjectState.TERMINATED)).toBe(
      ProjectStatus.CANCELLED,
    );
  });

  it('maps COMPLETED to completed', () => {
    expect(legacyProjectStatusForState(ProjectState.COMPLETED)).toBe(
      ProjectStatus.COMPLETED,
    );
  });

  it('returns null for unrelated states', () => {
    expect(legacyProjectStatusForState(ProjectState.ACTIVE)).toBeNull();
  });
});
