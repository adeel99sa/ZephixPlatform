import { Repository, SelectQueryBuilder, EntityMetadata } from 'typeorm';

/**
 * Marker property set on query builders created via TenantAwareRepository.qb().
 * Must match the value used in tenant-aware.repository.ts.
 */
export const TENANT_AWARE_QUERY_BUILDER_MARKER = '__tenantAware';

/**
 * Context getter signature — returns ALS state needed by the guardrail.
 * Single getter to avoid multiple ALS lookups per assertion.
 */
interface GuardrailContext {
  organizationId: string | null;
  skipDepth: number;
}

type GuardrailContextGetter = () => GuardrailContext;

let contextGetter: GuardrailContextGetter | null = null;
let depthIncrement: (() => void) | null = null;
let depthDecrement: (() => void) | null = null;
let guardrailInstalled = false;

/**
 * Wire the context getter. Called once from TenancyModule.onModuleInit.
 */
export function setTenantRepositoryQueryGuardrailContextGetter(
  getter: GuardrailContextGetter,
): void {
  contextGetter = getter;
}

/**
 * Wire the depth manager. Called once from TenancyModule.onModuleInit.
 * Allows the guardrail to increment/decrement the ALS skip depth counter
 * for Repository prototype method wrappers (find, findOne, save, etc.).
 */
export function setTenantRepositoryQueryGuardrailDepthManager(
  increment: () => void,
  decrement: () => void,
): void {
  depthIncrement = increment;
  depthDecrement = decrement;
}

/**
 * Core assertion: detects tenant scoping bypass on query builder execution.
 *
 * Check order (short-circuit on first match):
 * 1. Production → no-op (guardrail is dev/test only)
 * 2. Skip depth > 0 → inside TypeORM internal operation (depth managed)
 * 3. QB has tenant-aware marker → created via TenantAwareRepository.qb()
 * 4. No organization in ALS → system/background context, not tenant-scoped
 * 5. Entity has no organizationId column → not a tenant-scoped entity
 * 6. Throw: bypass detected
 */
function assertTenantScopedQueryBuilderExecution(
  qb: SelectQueryBuilder<any>,
  entityMetadata: EntityMetadata | null,
): void {
  // 1. Production no-op
  if (process.env.NODE_ENV === 'production') {
    return;
  }

  // 2. Context getter not wired (module not initialized yet, e.g., during migrations)
  if (!contextGetter) {
    return;
  }

  const ctx = contextGetter();

  // 3. Inside TypeORM internal operation (depth incremented by subscriber or method wrapper)
  if (ctx.skipDepth > 0) {
    return;
  }

  // 4. QB marked as tenant-aware (created via TenantAwareRepository.qb())
  if ((qb as any)[TENANT_AWARE_QUERY_BUILDER_MARKER]) {
    return;
  }

  // 5. No organization context (system operation, background worker, unauthenticated)
  if (!ctx.organizationId) {
    return;
  }

  // 6. Entity has no organizationId column (not tenant-scoped)
  if (entityMetadata) {
    const hasTenantColumn = entityMetadata.columns.some(
      (col) =>
        col.propertyName === 'organizationId' ||
        col.databaseName === 'organization_id',
    );
    if (!hasTenantColumn) {
      return;
    }
  }

  // All checks failed → this is a bypass
  const entityName = entityMetadata?.name || 'unknown';
  throw new Error(
    `Tenant scoping bypass detected: Query builder for entity "${entityName}" was created via ` +
      `DataSource.createQueryBuilder() instead of TenantAwareRepository.qb(). ` +
      `This query would not be scoped to organization "${ctx.organizationId}". ` +
      `Use repo.qb() or repo.createQueryBuilder() instead.`,
  );
}

/**
 * Install the runtime guardrail by patching Repository.prototype.
 *
 * Two patches:
 * 1. createQueryBuilder: wraps execution methods with tenant assertion
 * 2. Read/write methods (find, findOne, save, etc.): increment/decrement
 *    skip depth so TypeORM-internal createQueryBuilder calls are exempt
 *
 * WHY BOTH:
 * TypeORM internally calls Repository.createQueryBuilder inside find(),
 * findOne(), save(), update(), delete(), etc. The subscriber pattern only
 * covers persistence events (INSERT/UPDATE/REMOVE). TypeORM's read methods
 * (find/findOne) also call createQueryBuilder internally and need the same
 * depth protection. Wrapping Repository methods directly covers ALL internal
 * TypeORM operations.
 *
 * Called once from TenancyModule.onModuleInit.
 */
export function installTenantRepositoryCreateQueryBuilderGuardrail(): void {
  // Only install in dev/test
  if (process.env.NODE_ENV === 'production') {
    return;
  }

  // Idempotency guard: prototype patches are global and persist across
  // NestJS app lifecycles in the same process (e.g., test suites that
  // create multiple apps). Installing more than once would stack wrappers,
  // causing redundant assertion calls per execution. The contextGetter and
  // depthIncrement/depthDecrement are re-wired each time onModuleInit runs
  // (pointing to the current TenantContextService instance), which is fine —
  // only the prototype patches must be applied exactly once.
  if (guardrailInstalled) {
    return;
  }
  guardrailInstalled = true;

  // --- Patch 1: Wrap createQueryBuilder execution methods ---
  const originalCreateQueryBuilder =
    Repository.prototype.createQueryBuilder;

  Repository.prototype.createQueryBuilder = function (
    this: Repository<any>,
    ...args: any[]
  ): SelectQueryBuilder<any> {
    const qb: SelectQueryBuilder<any> = originalCreateQueryBuilder.apply(
      this,
      args,
    );

    // Capture entity metadata at QB creation time for the assertion
    const entityMetadata: EntityMetadata | null = this.metadata || null;

    // Wrap execution methods
    const methodsToWrap = [
      'execute',
      'getMany',
      'getOne',
      'getRawMany',
      'getRawOne',
      'getCount',
      'getManyAndCount',
    ] as const;

    for (const method of methodsToWrap) {
      const original = (qb as any)[method];
      if (typeof original !== 'function') continue;

      const bound = original.bind(qb);
      (qb as any)[method] = function (...execArgs: any[]) {
        assertTenantScopedQueryBuilderExecution(qb, entityMetadata);
        return bound(...execArgs);
      };
    }

    return qb;
  } as any;

  // --- Patch 2: Wrap Repository read/write methods with depth management ---
  // TypeORM internally calls createQueryBuilder inside these methods.
  // Incrementing depth before the call ensures the guardrail skips for
  // TypeORM-internal QB usage. Application code that explicitly calls
  // createQueryBuilder() (the actual bypass) is NOT wrapped by this —
  // only TypeORM's own internal method calls are.
  const repoMethodsToWrap = [
    'find',
    'findOne',
    'findBy',
    'findOneBy',
    'findAndCount',
    'findAndCountBy',
    'findOneOrFail',
    'findOneByOrFail',
    'count',
    'countBy',
    'sum',
    'average',
    'minimum',
    'maximum',
    'exist',
    'exists',
    'save',
    'remove',
    'softRemove',
    'recover',
    'insert',
    'update',
    'upsert',
    'delete',
    'softDelete',
    'restore',
    'increment',
    'decrement',
  ];

  for (const method of repoMethodsToWrap) {
    const original = (Repository.prototype as any)[method];
    if (typeof original !== 'function') continue;

    (Repository.prototype as any)[method] = async function (
      this: Repository<any>,
      ...args: any[]
    ) {
      depthIncrement?.();
      try {
        return await original.apply(this, args);
      } finally {
        depthDecrement?.();
      }
    };
  }
}

// Export for testing
export { assertTenantScopedQueryBuilderExecution as _assertForTesting };
