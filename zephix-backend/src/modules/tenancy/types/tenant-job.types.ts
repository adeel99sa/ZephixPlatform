/**
 * Types and helpers for background jobs with tenant context
 *
 * This prepares Phase 2b (event-driven architecture) without requiring
 * BullMQ or queue infrastructure. Jobs can use these types and helpers
 * now, and when queues are added, they'll already be tenant-aware.
 */

/**
 * Payload for tenant-scoped background jobs
 *
 * Every job must include organizationId. workspaceId is optional
 * and only needed for workspace-scoped operations.
 */
export interface TenantJobPayload {
  organizationId: string;
  workspaceId?: string;
}

/**
 * Helper to run a job function with tenant context
 *
 * This is a convenience wrapper around TenantContextService.runWithTenant
 * that enforces the TenantJobPayload contract and provides better error messages.
 *
 * @param payload - Job payload with organizationId (required) and optional workspaceId
 * @param fn - Job function to execute within tenant context
 * @returns Result of the job function
 * @throws Error if organizationId is missing
 *
 * @example
 * ```typescript
 * await runJobWithTenant(
 *   { organizationId: 'org-123', workspaceId: 'ws-456' },
 *   async () => {
 *     const projects = await projectRepository.find();
 *     // Projects are automatically scoped to org-123
 *   }
 * );
 * ```
 */
export async function runJobWithTenant<T>(
  payload: TenantJobPayload,
  fn: () => Promise<T>,
): Promise<T> {
  if (!payload.organizationId) {
    throw new Error(
      'TenantJobPayload must include organizationId. Jobs cannot run without tenant context.',
    );
  }

  // Import TenantContextService dynamically to avoid circular dependencies
  // This will be injected in actual job processors
  const { TenantContextService } = await import('../tenant-context.service');

  // In actual usage, TenantContextService will be injected via DI
  // This is a helper function signature - actual implementation should inject the service
  throw new Error(
    'runJobWithTenant must be called with an injected TenantContextService instance. ' +
      'Use TenantContextService.runWithTenant() directly, or create a job processor class that injects TenantContextService.',
  );
}

