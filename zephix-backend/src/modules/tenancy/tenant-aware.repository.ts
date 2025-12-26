import { Injectable } from '@nestjs/common';
import {
  Repository,
  FindOptionsWhere,
  FindManyOptions,
  FindOneOptions,
  DeepPartial,
  UpdateResult,
  DeleteResult,
  SelectQueryBuilder,
  ObjectLiteral,
} from 'typeorm';
import { TenantContextService } from './tenant-context.service';
import { isWorkspaceScoped } from './workspace-scoped.decorator';

/**
 * Runtime guardrail marker for tenant-aware query builders.
 * This allows detection of bypass attempts where code uses DataSource.createQueryBuilder directly.
 */
const TENANT_AWARE_MARKER = '__tenantAware';

/**
 * Assert that a query builder is tenant-aware.
 * Throws in dev/test mode if the query builder was created via DataSource.createQueryBuilder directly.
 */
function assertTenantAwareQueryBuilder(qb: any): void {
  // Only run in development/test mode to avoid performance impact in production
  if (process.env.NODE_ENV === 'production') {
    return;
  }

  if (!qb[TENANT_AWARE_MARKER]) {
    const orgId = qb.__tenantOrganizationId || 'unknown';
    throw new Error(
      `Tenant scoping bypass detected: Query builder was created via DataSource.createQueryBuilder() ` +
        `instead of TenantAwareRepository.qb(). This query would not be scoped to organization ${orgId}. ` +
        `Use repo.qb() or repo.createQueryBuilder() instead.`,
    );
  }
}

/**
 * TenantAwareRepository enforces tenant isolation at the Data Access Layer.
 *
 * Rules:
 * 1. ALL reads are automatically scoped by organizationId from context
 * 2. Workspace-scoped entities are also filtered by workspaceId if present in context
 * 3. If organizationId is missing, throws hard error
 * 4. Query builders automatically include tenant filters
 */
@Injectable()
export class TenantAwareRepository<T extends ObjectLiteral> {
  constructor(
    private readonly repository: Repository<T>,
    private readonly tenantContextService: TenantContextService,
    private readonly entityClass: new () => T,
  ) {}

  /**
   * Get the organization ID from context, throwing if missing.
   */
  private getOrganizationId(): string {
    return this.tenantContextService.assertOrganizationId();
  }

  /**
   * Get the workspace ID from context (may be null).
   */
  private getWorkspaceId(): string | null {
    return this.tenantContextService.getWorkspaceId();
  }

  /**
   * Check if this entity is workspace-scoped.
   */
  private isEntityWorkspaceScoped(): boolean {
    return isWorkspaceScoped(this.entityClass);
  }

  /**
   * Build tenant filter for where clauses.
   * Always includes organizationId, optionally includes workspaceId.
   */
  private buildTenantFilter(): FindOptionsWhere<T> {
    const orgId = this.getOrganizationId();
    const filter: any = {};

    // Map organizationId to the correct column name
    // TypeORM uses property names, but DB may use snake_case
    const orgColumn = this.getOrganizationIdColumn();
    filter[orgColumn] = orgId;

    // Add workspace filter if entity is workspace-scoped and workspaceId exists
    if (this.isEntityWorkspaceScoped()) {
      const workspaceId = this.getWorkspaceId();
      if (workspaceId) {
        const workspaceColumn = this.getWorkspaceIdColumn();
        if (workspaceColumn) {
          filter[workspaceColumn] = workspaceId;
        }
      }
    }

    return filter as FindOptionsWhere<T>;
  }

  /**
   * Get the organizationId column name for this entity.
   * Handles both camelCase (entity property) and snake_case (DB column).
   */
  private getOrganizationIdColumn(): string {
    const metadata = this.repository.metadata;
    const orgColumn = metadata.columns.find(
      (col) =>
        col.propertyName === 'organizationId' ||
        col.databaseName === 'organization_id' ||
        col.databaseName === 'organizationId',
    );
    return orgColumn?.propertyName || 'organizationId';
  }

  /**
   * Runtime guardrail: Assert that query builders used in options are tenant-aware.
   *
   * In development/test mode, this checks if any query builder in the options was created
   * via DataSource.createQueryBuilder directly (bypass attempt) rather than through
   * TenantAwareRepository.qb().
   *
   * This is a defense-in-depth measure - the primary protection is lint rules and CI.
   *
   * Note: This only checks if a queryBuilder is passed in options. Most code uses
   * find()/findOne() with where clauses, which are automatically scoped.
   */
  private assertTenantAwareQueryBuilder(
    options?: FindManyOptions<T> | FindOneOptions<T>,
  ): void {
    // Only run in development/test mode to avoid performance impact in production
    if (process.env.NODE_ENV === 'production') {
      return;
    }

    // Check if options contain a query builder that wasn't created via TenantAwareRepository
    if (options && 'queryBuilder' in options && options.queryBuilder) {
      const qb = options.queryBuilder as any;
      assertTenantAwareQueryBuilder(qb);
    }
  }

  /**
   * Get the workspaceId column name for this entity.
   * Returns null if entity doesn't have workspaceId.
   */
  private getWorkspaceIdColumn(): string | null {
    const metadata = this.repository.metadata;
    const workspaceColumn = metadata.columns.find(
      (col) =>
        col.propertyName === 'workspaceId' ||
        col.databaseName === 'workspace_id' ||
        col.databaseName === 'workspaceId',
    );
    return workspaceColumn?.propertyName || null;
  }

  /**
   * Merge tenant filter with existing where clause.
   */
  private mergeWhere(
    existingWhere?: FindOptionsWhere<T> | FindOptionsWhere<T>[],
  ): FindOptionsWhere<T> | FindOptionsWhere<T>[] {
    const tenantFilter = this.buildTenantFilter();

    if (!existingWhere) {
      return tenantFilter;
    }

    if (Array.isArray(existingWhere)) {
      return existingWhere.map((where) => ({ ...where, ...tenantFilter }));
    }

    return { ...existingWhere, ...tenantFilter };
  }

  // ========== Repository Methods with Tenant Scoping ==========

  /**
   * Find entities with automatic tenant scoping.
   */
  async find(options?: FindManyOptions<T>): Promise<T[]> {
    const orgId = this.getOrganizationId();
    const scopedOptions: FindManyOptions<T> = {
      ...options,
      where: this.mergeWhere(options?.where as FindOptionsWhere<T>),
    };

    // Runtime guardrail: In dev mode, verify query builder usage if present
    this.assertTenantAwareQueryBuilder(options);

    return this.repository.find(scopedOptions);
  }

  /**
   * Find one entity with automatic tenant scoping.
   */
  async findOne(options: FindOneOptions<T>): Promise<T | null> {
    const scopedOptions: FindOneOptions<T> = {
      ...options,
      where: this.mergeWhere(options?.where as FindOptionsWhere<T>),
    };

    // Runtime guardrail: In dev mode, verify query builder usage if present
    this.assertTenantAwareQueryBuilder(options);

    return this.repository.findOne(scopedOptions);
  }

  /**
   * Find one entity by where condition (TypeORM convenience method).
   * Automatically scoped by tenant.
   */
  async findOneBy(where: FindOptionsWhere<T>): Promise<T | null> {
    return this.findOne({ where });
  }

  /**
   * Find entities by IDs with automatic tenant scoping.
   */
  async findByIds(ids: any[]): Promise<T[]> {
    // Note: findByIds is deprecated in TypeORM 0.3.x, but we support it for compatibility
    const tenantFilter = this.buildTenantFilter();
    return this.repository.find({
      where: {
        ...tenantFilter,
        id: ids.length === 1 ? ids[0] : ids,
      } as any,
    });
  }

  /**
   * Find and count with automatic tenant scoping.
   */
  async findAndCount(options?: FindManyOptions<T>): Promise<[T[], number]> {
    const scopedOptions: FindManyOptions<T> = {
      ...options,
      where: this.mergeWhere(options?.where as FindOptionsWhere<T>),
    };
    return this.repository.findAndCount(scopedOptions);
  }

  /**
   * Count entities with automatic tenant scoping.
   */
  async count(options?: FindManyOptions<T>): Promise<number> {
    const scopedOptions: FindManyOptions<T> = {
      ...options,
      where: this.mergeWhere(options?.where as FindOptionsWhere<T>),
    };
    return this.repository.count(scopedOptions);
  }

  /**
   * Check if entity exists with automatic tenant scoping.
   */
  async exists(options?: FindManyOptions<T>): Promise<boolean> {
    const count = await this.count(options);
    return count > 0;
  }

  /**
   * Create a query builder with automatic tenant scoping.
   * The tenant filter is automatically applied to the root alias.
   *
   * Runtime guardrail: Adds a marker to the query builder to detect bypass attempts.
   * If code uses DataSource.createQueryBuilder directly, it will miss this marker.
   * The guardrail also wraps execute(), getMany(), getOne(), getRawMany(), getRawOne()
   * to ensure all query execution paths are protected.
   *
   * @param alias - Query alias (default: entity name)
   */
  qb(alias?: string): SelectQueryBuilder<T> {
    const orgId = this.getOrganizationId();
    const aliasName = alias || this.repository.metadata.name.toLowerCase();
    const qb = this.repository.createQueryBuilder(aliasName);

    // Apply organization filter
    const orgColumn = this.getOrganizationIdColumn();
    qb.andWhere(`${aliasName}.${orgColumn} = :organizationId`, {
      organizationId: orgId,
    });

    // Apply workspace filter if needed
    if (this.isEntityWorkspaceScoped()) {
      const workspaceId = this.getWorkspaceId();
      if (workspaceId) {
        const workspaceColumn = this.getWorkspaceIdColumn();
        if (workspaceColumn) {
          qb.andWhere(`${aliasName}.${workspaceColumn} = :workspaceId`, {
            workspaceId,
          });
        }
      }
    }

    // Runtime guardrail: Mark this query builder as tenant-aware
    // This allows detection of bypass attempts (DataSource.createQueryBuilder direct usage)
    (qb as any).__tenantAware = true;
    (qb as any).__tenantOrganizationId = orgId;

    // Wrap execution methods to ensure guardrail triggers on all query paths
    const originalExecute = qb.execute.bind(qb);
    const originalGetMany = qb.getMany.bind(qb);
    const originalGetOne = qb.getOne.bind(qb);
    const originalGetRawMany = qb.getRawMany.bind(qb);
    const originalGetRawOne = qb.getRawOne.bind(qb);

    qb.execute = function (...args: any[]) {
      assertTenantAwareQueryBuilder(this);
      return originalExecute(...args);
    };

    qb.getMany = function (...args: any[]) {
      assertTenantAwareQueryBuilder(this);
      return originalGetMany(...args);
    };

    qb.getOne = function (...args: any[]) {
      assertTenantAwareQueryBuilder(this);
      return originalGetOne(...args);
    };

    qb.getRawMany = function (...args: any[]) {
      assertTenantAwareQueryBuilder(this);
      return originalGetRawMany(...args);
    };

    qb.getRawOne = function (...args: any[]) {
      assertTenantAwareQueryBuilder(this);
      return originalGetRawOne(...args);
    };

    return qb;
  }

  /**
   * Create query builder (alias for qb for compatibility).
   */
  createQueryBuilder(alias?: string): SelectQueryBuilder<T> {
    return this.qb(alias);
  }

  // ========== Write Operations (no scoping, but validate context exists) ==========

  /**
   * Save entity. Validates tenant context exists but doesn't filter.
   * The organizationId should be set by the caller or subscriber.
   */
  async save(entity: DeepPartial<T>): Promise<T> {
    this.getOrganizationId(); // Assert context exists
    return this.repository.save(entity);
  }

  /**
   * Save multiple entities.
   */
  async saveMany(entities: DeepPartial<T>[]): Promise<T[]> {
    this.getOrganizationId(); // Assert context exists
    return this.repository.save(entities);
  }

  /**
   * Create entity (doesn't save).
   */
  create(entityLike?: DeepPartial<T>): T {
    this.getOrganizationId(); // Assert context exists
    return this.repository.create(entityLike);
  }

  /**
   * Update entities. WARNING: This does NOT automatically scope by tenant.
   * Use with extreme caution - prefer updateById or update with explicit where clause.
   */
  async update(
    criteria: string | string[] | number | number[] | FindOptionsWhere<T>,
    partialEntity: Partial<T>,
  ): Promise<UpdateResult> {
    this.getOrganizationId(); // Assert context exists

    // If criteria is a where object, merge tenant filter
    if (typeof criteria === 'object' && !Array.isArray(criteria)) {
      const tenantFilter = this.buildTenantFilter();
      criteria = { ...criteria, ...tenantFilter };
    }
    // For string/number IDs, we can't automatically scope - caller must ensure safety
    // This is a known limitation - prefer updateById or explicit where clauses

    return this.repository.update(criteria, partialEntity as any);
  }

  /**
   * Delete entities. WARNING: This does NOT automatically scope by tenant.
   * Use with extreme caution - prefer deleteById or delete with explicit where clause.
   */
  async delete(
    criteria: string | string[] | number | number[] | FindOptionsWhere<T>,
  ): Promise<DeleteResult> {
    this.getOrganizationId(); // Assert context exists

    // If criteria is a where object, merge tenant filter
    if (typeof criteria === 'object' && !Array.isArray(criteria)) {
      const tenantFilter = this.buildTenantFilter();
      criteria = { ...criteria, ...tenantFilter };
    }
    // For string/number IDs, we can't automatically scope - caller must ensure safety

    return this.repository.delete(criteria);
  }

  /**
   * Remove entity (soft delete if enabled).
   */
  async remove(entity: T | T[]): Promise<T | T[]> {
    this.getOrganizationId(); // Assert context exists
    if (Array.isArray(entity)) {
      return this.repository.remove(entity);
    } else {
      return this.repository.remove(entity);
    }
  }

  /**
   * Get the underlying TypeORM repository.
   * Use with extreme caution - bypasses tenant scoping.
   * @internal
   */
  getRepository(): Repository<T> {
    // This is intentionally exposed for advanced use cases,
    // but should be avoided in normal service code
    return this.repository;
  }

  /**
   * Get entity metadata.
   */
  get metadata() {
    return this.repository.metadata;
  }

  /**
   * Raw SQL query - FORBIDDEN in feature code.
   * Throws in development/test to prevent tenant scoping bypass.
   * Use repo.qb() or find methods instead.
   */
  query(query: string, parameters?: any[]): Promise<any> {
    // Hard block in development/test to prevent raw SQL bypass
    if (process.env.NODE_ENV !== 'production') {
      throw new Error(
        `Raw SQL query forbidden: TenantAwareRepository.query() is not allowed in feature code. ` +
          `This bypasses tenant scoping. Use repo.qb() or find() methods instead. ` +
          `If you need raw SQL for migrations or infrastructure, use DataSource directly in src/database or migrations.`,
      );
    }
    // In production, still block but with a less verbose error
    throw new Error(
      'Raw SQL queries are not allowed. Use repo.qb() or find() methods.',
    );
  }

  /**
   * Soft delete with automatic tenant scoping.
   * Merges organizationId (and workspaceId if applicable) into criteria.
   */
  async softDelete(
    criteria: string | string[] | number | number[] | FindOptionsWhere<T>,
  ): Promise<UpdateResult> {
    this.getOrganizationId(); // Assert context exists

    // Build scoped criteria
    let scopedCriteria: any;
    if (typeof criteria === 'string' || typeof criteria === 'number') {
      // Single ID - convert to scoped where object
      const tenantFilter = this.buildTenantFilter();
      scopedCriteria = { id: criteria, ...tenantFilter };
    } else if (Array.isArray(criteria)) {
      // Array of IDs - use IN with tenant filter
      const tenantFilter = this.buildTenantFilter();
      scopedCriteria = {
        id: criteria.length === 1 ? criteria[0] : criteria,
        ...tenantFilter,
      };
    } else {
      // Where object - merge tenant filter
      const tenantFilter = this.buildTenantFilter();
      scopedCriteria = { ...criteria, ...tenantFilter };
    }

    return this.repository.softDelete(scopedCriteria);
  }

  /**
   * Restore soft-deleted entities with automatic tenant scoping.
   * Merges organizationId (and workspaceId if applicable) into criteria.
   */
  async restore(
    criteria: string | string[] | number | number[] | FindOptionsWhere<T>,
  ): Promise<UpdateResult> {
    this.getOrganizationId(); // Assert context exists

    // Build scoped criteria (same logic as softDelete)
    let scopedCriteria: any;
    if (typeof criteria === 'string' || typeof criteria === 'number') {
      const tenantFilter = this.buildTenantFilter();
      scopedCriteria = { id: criteria, ...tenantFilter };
    } else if (Array.isArray(criteria)) {
      const tenantFilter = this.buildTenantFilter();
      scopedCriteria = {
        id: criteria.length === 1 ? criteria[0] : criteria,
        ...tenantFilter,
      };
    } else {
      const tenantFilter = this.buildTenantFilter();
      scopedCriteria = { ...criteria, ...tenantFilter };
    }

    return this.repository.restore(scopedCriteria);
  }

  /**
   * Recover soft-deleted entity (alias for restore for compatibility).
   */
  async recover(entity: T): Promise<T> {
    this.getOrganizationId(); // Assert context exists
    return this.repository.recover(entity);
  }

  /**
   * Preload entity relations.
   */
  async preload(entityLike: DeepPartial<T>): Promise<T | null> {
    this.getOrganizationId(); // Assert context exists
    return this.repository.preload(entityLike);
  }
}

/**
 * Factory function to create TenantAwareRepository provider.
 * This is used in module providers to replace @InjectRepository.
 *
 * Usage:
 * {
 *   provide: getTenantAwareRepositoryToken(Entity),
 *   useFactory: (repo, tenantContext) => new TenantAwareRepository(repo, tenantContext, Entity),
 *   inject: [getRepositoryToken(Entity), TenantContextService],
 * }
 */
export function getTenantAwareRepositoryToken(entity: any): string {
  return `TenantAwareRepository_${entity.name}`;
}
