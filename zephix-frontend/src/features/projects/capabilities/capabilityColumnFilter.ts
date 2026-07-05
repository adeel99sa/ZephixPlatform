import type { ProjectColumnKey } from '@/features/projects/columns';

import type { ProjectCapabilities } from './projectCapabilities.types';

/** Strip sprint column keys when iterations capability is off (absent, not disabled). */
export function filterColumnsForCapabilities(
  columns: readonly ProjectColumnKey[],
  capabilities: Pick<ProjectCapabilities, 'use_iterations'>,
): ProjectColumnKey[] {
  if (capabilities.use_iterations) {
    return [...columns];
  }
  return columns.filter((k) => k !== 'sprint');
}

export function sprintColumnAllowed(
  capabilities: Pick<ProjectCapabilities, 'use_iterations'>,
): boolean {
  return capabilities.use_iterations;
}
