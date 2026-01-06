/**
 * Helper for running background jobs with tenant context
 *
 * This provides a convenient wrapper around TenantContextService.runWithTenant
 * that enforces the TenantJobPayload contract.
 *
 * Usage in job processors:
 * ```typescript
 * constructor(
 *   private readonly tenantContextService: TenantContextService,
 * ) {}
 *
 * async process(job: Job<TenantJobPayload>) {
 *   return this.tenantContextService.runJobWithTenant(
 *     job.data,
 *     async () => {
 *       // Job logic here - automatically scoped to job.data.organizationId
 *     }
 *   );
 * }
 * ```
 */

import { TenantContextService } from '../tenant-context.service';
import { TenantJobPayload } from '../types/tenant-job.types';

/**
 * Run a job function with tenant context, enforcing TenantJobPayload contract
 *
 * @param tenantContextService - Injected TenantContextService instance
 * @param payload - Job payload with organizationId (required) and optional workspaceId
 * @param fn - Job function to execute within tenant context
 * @returns Result of the job function
 * @throws Error if organizationId is missing
 */
export async function runJobWithTenant<T>(
  tenantContextService: TenantContextService,
  payload: TenantJobPayload,
  fn: () => Promise<T>,
): Promise<T> {
  if (!payload.organizationId) {
    throw new Error(
      'TenantJobPayload must include organizationId. Jobs cannot run without tenant context.',
    );
  }

  return tenantContextService.runWithTenant(
    {
      organizationId: payload.organizationId,
      workspaceId: payload.workspaceId,
    },
    fn,
  );
}

