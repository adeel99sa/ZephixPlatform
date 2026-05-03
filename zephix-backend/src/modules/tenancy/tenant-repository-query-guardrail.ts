import {
  EntityMetadata,
  ObjectLiteral,
  Repository,
  SelectQueryBuilder,
} from 'typeorm';

/** Marker set only on QBs created via TenantAwareRepository.qb() / createQueryBuilder */
export const TENANT_AWARE_QUERY_BUILDER_MARKER = '__tenantAware';

const EXEC_GUARD_WRAPPED = '__tenantQueryExecGuardWrapped';

let getOrganizationIdFromALS: () => string | null = () => null;

/**
 * Wired from TenancyModule.onModuleInit — avoids circular DI with Repository patching.
 */
export function setTenantRepositoryQueryGuardrailContextGetter(
  getter: () => string | null,
): void {
  getOrganizationIdFromALS = getter;
}

export function entityMetadataHasOrganizationId(metadata: EntityMetadata): boolean {
  return !!metadata.columns.find(
    (col) =>
      col.propertyName === 'organizationId' ||
      col.databaseName === 'organization_id' ||
      col.databaseName === 'organizationId',
  );
}

/**
 * Dev/test guardrail: block executing unscoped Repository QBs when tenant ALS is active.
 * Production: no-op (policy deferred — see PR description / V21 tech debt).
 */
export function assertTenantScopedQueryBuilderExecution(
  qb: any,
  repository: Repository<ObjectLiteral>,
): void {
  if (process.env.NODE_ENV === 'production') {
    return;
  }
  if (qb[TENANT_AWARE_QUERY_BUILDER_MARKER]) {
    return;
  }
  const orgId = getOrganizationIdFromALS();
  if (!orgId) {
    return;
  }
  if (!entityMetadataHasOrganizationId(repository.metadata)) {
    return;
  }
  throw new Error(
    `Tenant scoping bypass detected: Query builder was created via Repository.createQueryBuilder() ` +
      `without using TenantAwareRepository.qb(). This query would not be scoped to organization ${orgId}. ` +
      `Use TenantAwareRepository.qb() for tenant-scoped entities, or run infrastructure code without tenant context in AsyncLocalStorage.`,
  );
}

function wrapSelectQueryBuilderExecutionGuardrail<T extends ObjectLiteral>(
  qb: SelectQueryBuilder<T>,
  repository: Repository<T>,
): void {
  const q = qb as any;
  if (q[EXEC_GUARD_WRAPPED]) {
    return;
  }
  q[EXEC_GUARD_WRAPPED] = true;

  const repo = repository as Repository<ObjectLiteral>;
  const wrap = (name: keyof SelectQueryBuilder<T>) => {
    const anyQb = qb as any;
    if (typeof anyQb[name] !== 'function') {
      return;
    }
    const original = anyQb[name].bind(qb);
    // TypeORM QB methods return Promises; sync throws must surface as rejections for callers/tests.
    anyQb[name] = async function (this: unknown, ...args: unknown[]) {
      assertTenantScopedQueryBuilderExecution(this, repo);
      return original(...args);
    };
  };

  wrap('execute');
  wrap('getMany');
  wrap('getOne');
  wrap('getRawMany');
  wrap('getRawOne');
  wrap('getCount');
  wrap('getManyAndCount');
}

let repositoryCreateQueryBuilderGuardrailInstalled = false;

/**
 * Patch TypeORM Repository#createQueryBuilder so execution paths enforce the guardrail.
 * Idempotent per process.
 */
export function installTenantRepositoryCreateQueryBuilderGuardrail(): void {
  if (repositoryCreateQueryBuilderGuardrailInstalled) {
    return;
  }
  repositoryCreateQueryBuilderGuardrailInstalled = true;

  const original = Repository.prototype.createQueryBuilder;
  Repository.prototype.createQueryBuilder = function (
    this: Repository<ObjectLiteral>,
    alias?: string,
    queryRunner?: any,
  ): SelectQueryBuilder<any> {
    const qb = original.call(this, alias, queryRunner);
    wrapSelectQueryBuilderExecutionGuardrail(qb, this);
    return qb;
  };
}
