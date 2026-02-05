/**
 * Work Tasks Stats API
 *
 * Unified stats endpoint for task completion metrics.
 * Replaces deprecated workItems.stats.api.ts
 *
 * ┌─────────────────────────────────────────────────────────────────┐
 * │ CONTRACT                                                        │
 * ├─────────────────────────────────────────────────────────────────┤
 * │ Endpoint: GET /work/tasks/stats/completion                      │
 * │ Header:   x-workspace-id (required, auto-injected by api client)│
 * │ Query:    projectId (optional - scopes to project)              │
 * │                                                                 │
 * │ Response: { completed, total, ratio }                           │
 * │ - completed: count of tasks with status = DONE                  │
 * │ - total: count of all non-deleted tasks                         │
 * │ - ratio: completed/total, rounded to 4 decimals (0 if total=0)  │
 * │                                                                 │
 * │ Exclusions:                                                     │
 * │ - Deleted tasks (deletedAt IS NOT NULL) are excluded            │
 * │ - CANCELED tasks are NOT counted as completed                   │
 * │                                                                 │
 * │ Errors:                                                         │
 * │ - 403 WORKSPACE_REQUIRED if x-workspace-id header missing       │
 * │                                                                 │
 * │ Cache Invalidation Rules:                                       │
 * │ - Call invalidateStatsCache(projectId) after: create, delete,   │
 * │   restore, status change on tasks in that project               │
 * │ - Call invalidateStatsCache() for workspace-wide stats          │
 * │ - Do NOT invalidate if bulk update returns VALIDATION_ERROR     │
 * │ - Ratio is server-rounded; do NOT re-round in UI                │
 * └─────────────────────────────────────────────────────────────────┘
 */

import { api, unwrapApiData } from '@/lib/api';

export interface TaskCompletionStats {
  completed: number;
  total: number;
  /** Ratio pre-rounded to 4 decimal places by server. Do not re-round in UI. */
  ratio: number;
}

// Cache to prevent refetch storms from task:changed events
const statsCache = new Map<string, { data: TaskCompletionStats; timestamp: number }>();
/** Cache TTL in milliseconds. Exported for testing. */
export const CACHE_TTL_MS = 2000;

function getCacheKey(projectId?: string): string {
  return projectId || '__workspace__';
}

/**
 * Get task completion stats.
 * - If projectId provided: scoped to that project
 * - If projectId omitted: entire workspace
 *
 * Uses 2-second cache to prevent refetch storms.
 * Requires x-workspace-id header (injected by api client).
 */
export async function getCompletionStats(
  projectId?: string,
): Promise<TaskCompletionStats> {
  const cacheKey = getCacheKey(projectId);
  const cached = statsCache.get(cacheKey);
  const now = Date.now();

  // Return cached if within TTL
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  const params = projectId ? { projectId } : undefined;
  const response = await api.get<{ data: TaskCompletionStats }>(
    '/work/tasks/stats/completion',
    { params },
  );
  const data = unwrapApiData<TaskCompletionStats>(response);

  // Update cache
  statsCache.set(cacheKey, { data, timestamp: now });

  return data;
}

/**
 * Get task completion stats for a specific project.
 * Convenience wrapper for getCompletionStats(projectId).
 */
export async function getProjectCompletionStats(
  projectId: string,
): Promise<TaskCompletionStats> {
  return getCompletionStats(projectId);
}

/**
 * Get task completion stats for entire workspace.
 * Convenience wrapper for getCompletionStats() without projectId.
 * Note: workspaceId param kept for API compatibility but ignored (uses header).
 */
export async function getWorkspaceCompletionStats(
  _workspaceId: string,
): Promise<TaskCompletionStats> {
  return getCompletionStats();
}

/**
 * Invalidate stats cache for a project or workspace.
 * Call after task mutations to allow fresh fetch.
 */
export function invalidateStatsCache(projectId?: string): void {
  if (projectId) {
    statsCache.delete(getCacheKey(projectId));
  } else {
    // Clear all cache on workspace-level invalidation
    statsCache.clear();
  }
}
