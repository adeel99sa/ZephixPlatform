import { ProjectState, ProjectStatus } from '../entities/project.entity';

/**
 * When setting ProjectState to governance terminal/pause values, keep legacy ProjectStatus aligned.
 * Call from services whenever `project.state` is mutated.
 */
export function legacyProjectStatusForState(state: ProjectState): ProjectStatus | null {
  if (state === ProjectState.ON_HOLD) {
    return ProjectStatus.ON_HOLD;
  }
  if (state === ProjectState.TERMINATED) {
    return ProjectStatus.CANCELLED;
  }
  if (state === ProjectState.COMPLETED) {
    return ProjectStatus.COMPLETED;
  }
  return null;
}
