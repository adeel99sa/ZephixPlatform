import {
  assertTenantScopedQueryBuilderExecution,
  entityMetadataHasOrganizationId,
  setTenantRepositoryQueryGuardrailContextGetter,
  TENANT_AWARE_QUERY_BUILDER_MARKER,
} from './tenant-repository-query-guardrail';

describe('tenant-repository-query-guardrail', () => {
  const repoWithOrg = {
    metadata: {
      columns: [{ propertyName: 'organizationId' }],
    },
  } as any;

  afterEach(() => {
    setTenantRepositoryQueryGuardrailContextGetter(() => null);
  });

  it('entityMetadataHasOrganizationId is true when column present', () => {
    expect(entityMetadataHasOrganizationId(repoWithOrg.metadata)).toBe(true);
  });

  it('entityMetadataHasOrganizationId is false when column absent', () => {
    expect(
      entityMetadataHasOrganizationId({ columns: [{ propertyName: 'id' }] } as any),
    ).toBe(false);
  });

  it('allows unmarked qb when ALS has no organizationId', () => {
    setTenantRepositoryQueryGuardrailContextGetter(() => null);
    expect(() =>
      assertTenantScopedQueryBuilderExecution({}, repoWithOrg),
    ).not.toThrow();
  });

  it('allows unmarked qb when entity has no organizationId column', () => {
    setTenantRepositoryQueryGuardrailContextGetter(() => 'org-1');
    const repoGlobal = { metadata: { columns: [{ propertyName: 'code' }] } } as any;
    expect(() =>
      assertTenantScopedQueryBuilderExecution({}, repoGlobal),
    ).not.toThrow();
  });

  it('throws when ALS has org, entity is tenant-scoped, qb unmarked', () => {
    setTenantRepositoryQueryGuardrailContextGetter(() => 'org-1');
    expect(() =>
      assertTenantScopedQueryBuilderExecution({}, repoWithOrg),
    ).toThrow(/Tenant scoping bypass detected/);
  });

  it('allows marked qb when ALS has org', () => {
    setTenantRepositoryQueryGuardrailContextGetter(() => 'org-1');
    const qb = { [TENANT_AWARE_QUERY_BUILDER_MARKER]: true };
    expect(() =>
      assertTenantScopedQueryBuilderExecution(qb, repoWithOrg),
    ).not.toThrow();
  });

  it('production NODE_ENV skips assert', () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    setTenantRepositoryQueryGuardrailContextGetter(() => 'org-1');
    expect(() =>
      assertTenantScopedQueryBuilderExecution({}, repoWithOrg),
    ).not.toThrow();
    process.env.NODE_ENV = prev;
  });
});
