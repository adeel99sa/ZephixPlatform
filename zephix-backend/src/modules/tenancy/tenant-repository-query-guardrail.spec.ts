import {
  _assertForTesting as assertTenantScopedQueryBuilderExecution,
  TENANT_AWARE_QUERY_BUILDER_MARKER,
  setTenantRepositoryQueryGuardrailContextGetter,
} from './tenant-repository-query-guardrail';

describe('assertTenantScopedQueryBuilderExecution', () => {
  const originalEnv = process.env.NODE_ENV;

  // Minimal QB mock
  const makeQb = (marker = false) => {
    const qb: any = {};
    if (marker) qb[TENANT_AWARE_QUERY_BUILDER_MARKER] = true;
    return qb;
  };

  // Minimal EntityMetadata mock
  const tenantEntity: any = {
    name: 'Project',
    columns: [
      { propertyName: 'id', databaseName: 'id' },
      { propertyName: 'organizationId', databaseName: 'organization_id' },
    ],
  };

  const nonTenantEntity: any = {
    name: 'Migration',
    columns: [{ propertyName: 'id', databaseName: 'id' }],
  };

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    // Reset context getter
    setTenantRepositoryQueryGuardrailContextGetter(null as any);
  });

  it('should no-op in production', () => {
    process.env.NODE_ENV = 'production';
    setTenantRepositoryQueryGuardrailContextGetter(() => ({
      organizationId: 'org-1',
      skipDepth: 0,
    }));

    expect(() =>
      assertTenantScopedQueryBuilderExecution(makeQb(), tenantEntity),
    ).not.toThrow();
  });

  it('should skip when skipDepth > 0 (inside persistence operation)', () => {
    process.env.NODE_ENV = 'test';
    setTenantRepositoryQueryGuardrailContextGetter(() => ({
      organizationId: 'org-1',
      skipDepth: 1,
    }));

    expect(() =>
      assertTenantScopedQueryBuilderExecution(makeQb(), tenantEntity),
    ).not.toThrow();
  });

  it('should skip when QB has tenant-aware marker', () => {
    process.env.NODE_ENV = 'test';
    setTenantRepositoryQueryGuardrailContextGetter(() => ({
      organizationId: 'org-1',
      skipDepth: 0,
    }));

    expect(() =>
      assertTenantScopedQueryBuilderExecution(
        makeQb(true),
        tenantEntity,
      ),
    ).not.toThrow();
  });

  it('should skip when no organization context (system/background)', () => {
    process.env.NODE_ENV = 'test';
    setTenantRepositoryQueryGuardrailContextGetter(() => ({
      organizationId: null,
      skipDepth: 0,
    }));

    expect(() =>
      assertTenantScopedQueryBuilderExecution(makeQb(), tenantEntity),
    ).not.toThrow();
  });

  it('should skip when entity has no organizationId column', () => {
    process.env.NODE_ENV = 'test';
    setTenantRepositoryQueryGuardrailContextGetter(() => ({
      organizationId: 'org-1',
      skipDepth: 0,
    }));

    expect(() =>
      assertTenantScopedQueryBuilderExecution(makeQb(), nonTenantEntity),
    ).not.toThrow();
  });

  it('should throw bypass error when all conditions fail', () => {
    process.env.NODE_ENV = 'test';
    setTenantRepositoryQueryGuardrailContextGetter(() => ({
      organizationId: 'org-1',
      skipDepth: 0,
    }));

    expect(() =>
      assertTenantScopedQueryBuilderExecution(makeQb(), tenantEntity),
    ).toThrow(/Tenant scoping bypass detected/);
  });

  it('should include entity name and org ID in error message', () => {
    process.env.NODE_ENV = 'test';
    setTenantRepositoryQueryGuardrailContextGetter(() => ({
      organizationId: 'org-abc',
      skipDepth: 0,
    }));

    expect(() =>
      assertTenantScopedQueryBuilderExecution(makeQb(), tenantEntity),
    ).toThrow(/Project.*org-abc/);
  });

  it('should skip when context getter is not wired', () => {
    process.env.NODE_ENV = 'test';
    // contextGetter is null (not wired)

    expect(() =>
      assertTenantScopedQueryBuilderExecution(makeQb(), tenantEntity),
    ).not.toThrow();
  });
});
