import { Injectable, Logger } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

export interface TenantContext {
  organizationId: string;
  workspaceId?: string;
  requestId?: string;
}

/**
 * TenantContextService manages tenant isolation using AsyncLocalStorage.
 * This ensures that tenant context is automatically available throughout
 * the async request lifecycle without passing it explicitly.
 */
@Injectable()
export class TenantContextService {
  private readonly asyncLocalStorage = new AsyncLocalStorage<
    Map<string, any>
  >();

  /**
   * Get the current organization ID from context.
   * Returns null if not set (e.g., in system execution without tenant).
   */
  getOrganizationId(): string | null {
    const store = this.asyncLocalStorage.getStore();
    return store?.get('organizationId') || null;
  }

  /**
   * Get the current workspace ID from context.
   * Returns null if not set.
   */
  getWorkspaceId(): string | null {
    const store = this.asyncLocalStorage.getStore();
    return store?.get('workspaceId') || null;
  }

  /**
   * Get the current request ID from context.
   * Returns null if not set.
   */
  getRequestId(): string | null {
    const store = this.asyncLocalStorage.getStore();
    return store?.get('requestId') || null;
  }

  /**
   * Assert that organizationId is present in context.
   * Throws an error if missing.
   */
  assertOrganizationId(): string {
    const orgId = this.getOrganizationId();
    if (!orgId) {
      throw new Error(
        'Tenant context missing: organizationId is required. Ensure request is authenticated and TenantContextInterceptor is registered.',
      );
    }
    return orgId;
  }

  /**
   * Run a function with tenant context set.
   * This is used for system execution (jobs, scripts, seeds) that need tenant scoping.
   *
   * @param tenant - Tenant context with organizationId and optional workspaceId
   * @param fn - Function to execute within tenant context
   */
  async runWithTenant<T>(
    tenant: { organizationId: string; workspaceId?: string },
    fn: () => Promise<T>,
  ): Promise<T> {
    if (!tenant.organizationId) {
      throw new Error(
        'Tenant context requires organizationId. Jobs and scripts cannot run without tenant context.',
      );
    }

    const store = new Map<string, any>();
    store.set('organizationId', tenant.organizationId);
    if (tenant.workspaceId) {
      store.set('workspaceId', tenant.workspaceId);
    }

    return this.asyncLocalStorage.run(store, fn);
  }

  /**
   * Run a job with tenant context from TenantJobPayload
   *
   * This is a convenience method for background jobs that use the TenantJobPayload contract.
   * It enforces that organizationId is present and provides better error messages.
   *
   * @param payload - Job payload with organizationId (required) and optional workspaceId
   * @param fn - Job function to execute within tenant context
   * @returns Result of the job function
   */
  async runJobWithTenant<T>(
    payload: { organizationId: string; workspaceId?: string },
    fn: () => Promise<T>,
  ): Promise<T> {
    return this.runWithTenant(payload, fn);
  }

  /**
   * Set tenant context in the current async context.
   * This is called by the interceptor and should not be called manually.
   * @internal
   */
  setContext(context: TenantContext): void {
    const store = this.asyncLocalStorage.getStore();
    if (store) {
      store.set('organizationId', context.organizationId);
      if (context.workspaceId) {
        store.set('workspaceId', context.workspaceId);
      }
      if (context.requestId) {
        store.set('requestId', context.requestId);
      }
    }
  }

  /**
   * Initialize a new context store for the current async context.
   * This is called by the interceptor and should not be called manually.
   * @internal
   */
  initContext(context: TenantContext): void {
    const store = new Map<string, any>();
    store.set('organizationId', context.organizationId);
    if (context.workspaceId) {
      store.set('workspaceId', context.workspaceId);
    }
    if (context.requestId) {
      store.set('requestId', context.requestId);
    }
    // Note: We don't call asyncLocalStorage.run here because the interceptor
    // handles the async boundary. This method is for setting up the initial store.
  }

  /**
   * Clear the tenant context.
   * This is called by the interceptor on response finish and should not be called manually.
   * @internal
   */
  clear(): void {
    // AsyncLocalStorage automatically clears when the async context ends,
    // but we can explicitly clear the store if needed
    const store = this.asyncLocalStorage.getStore();
    if (store) {
      store.clear();
    }
  }

  /**
   * Get the raw store for advanced use cases.
   * Use with caution - prefer the typed getters above.
   */
  getStore(): Map<string, any> | undefined {
    return this.asyncLocalStorage.getStore();
  }

  // ========== Runtime Guardrail Depth Counter ==========

  private static readonly SKIP_DEPTH_KEY = 'SKIP_TENANT_GUARDRAIL_DEPTH';
  private readonly logger = new Logger(TenantContextService.name);

  /**
   * Increment the skip-guardrail depth counter.
   * Called by TypeORM subscriber before persistence operations to exempt
   * TypeORM-internal query builder calls from the tenant guardrail.
   */
  incrementSkipTenantGuardrailDepth(): void {
    const store = this.asyncLocalStorage.getStore();
    if (!store) return; // No ALS context (e.g., background worker without tenant context)
    const current = store.get(TenantContextService.SKIP_DEPTH_KEY) || 0;
    store.set(TenantContextService.SKIP_DEPTH_KEY, current + 1);
  }

  /**
   * Decrement the skip-guardrail depth counter.
   * Called by TypeORM subscriber after persistence operations complete.
   * Includes defense against going negative (indicates lifecycle bug).
   */
  decrementSkipTenantGuardrailDepth(): void {
    const store = this.asyncLocalStorage.getStore();
    if (!store) return;
    const current = store.get(TenantContextService.SKIP_DEPTH_KEY) || 0;
    if (current <= 0) {
      this.logger.warn(
        'Attempted to decrement SKIP_TENANT_GUARDRAIL_DEPTH below zero. ' +
          'This indicates a subscriber lifecycle mismatch.',
      );
      return;
    }
    store.set(TenantContextService.SKIP_DEPTH_KEY, current - 1);
  }

  /**
   * Get the current skip-guardrail depth.
   * Returns 0 when no ALS context or key is absent.
   */
  getSkipTenantGuardrailDepth(): number {
    const store = this.asyncLocalStorage.getStore();
    return store?.get(TenantContextService.SKIP_DEPTH_KEY) || 0;
  }
}
