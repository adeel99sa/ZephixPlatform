import type { WorkspaceRollupResponse } from './types';

import { apiClient } from '@/lib/api/client';

/**
 * Fetch workspace-level rollup of all project metrics.
 * Read-only. No mutations.
 */
export async function getWorkspaceRollup(
  workspaceId: string,
): Promise<WorkspaceRollupResponse> {
  const resp = await apiClient.get<WorkspaceRollupResponse>(
    `/work/workspaces/${workspaceId}/rollups`,
  );
  // Normalize envelope: resp may be { data: { data: ... } } or { data: ... }
  const raw = (resp as any)?.data ?? resp;
  return raw as WorkspaceRollupResponse;
}
