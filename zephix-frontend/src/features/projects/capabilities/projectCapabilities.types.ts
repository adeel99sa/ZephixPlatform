/** Resolved methodology capability toggles (AD-016 / WAVE 1 Track C). */
export interface ProjectCapabilities {
  use_phases: boolean;
  use_iterations: boolean;
  use_gates: boolean;
  use_wip_limits: boolean;
}

/** Absent-key defaults — must match backend resolveCapabilities(). */
export const DEFAULT_PROJECT_CAPABILITIES: ProjectCapabilities = {
  use_phases: true,
  use_iterations: false,
  use_gates: true,
  use_wip_limits: false,
};
