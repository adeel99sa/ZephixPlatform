import { useProjectContext } from '@/features/projects/layout/ProjectPageLayout';

import { DEFAULT_PROJECT_CAPABILITIES, type ProjectCapabilities } from './projectCapabilities.types';

/**
 * Resolved project capabilities from ProjectPageLayout (single fetch per project load).
 * Outside project shell, returns conservative defaults (iterations off).
 */
export function useProjectCapabilities(): ProjectCapabilities {
  const { capabilities } = useProjectContext();
  return capabilities ?? DEFAULT_PROJECT_CAPABILITIES;
}
