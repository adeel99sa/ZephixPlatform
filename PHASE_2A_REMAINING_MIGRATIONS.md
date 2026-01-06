# Phase 2a Remaining Migrations Plan

## Decision: Cross-Tenant Workspace Access Behavior

**Standardized to: 403 Forbidden**

Rationale:
- Current guard (`require-workspace-access.guard.ts`) throws `ForbiddenException` when workspace doesn't belong to user's organization
- More secure than 404 (doesn't leak information about workspace existence)
- Consistent with existing guard behavior

## Migration Priority Order

1. ✅ **WorkspacesModule** - IN PROGRESS
   - WorkspacesService - Main service with reads
   - WorkspaceMembersService - Membership management
   - WorkspaceAccessService - Access control
   - Guards - RequireWorkspaceAccessGuard, etc.

2. **ResourcesModule** (beyond heat-map)
   - ResourcesService - Main resource queries
   - ResourceAllocationService - Allocation CRUD
   - ResourceCalculationService - Capacity calculations
   - ResourceRiskScoreService - Risk scoring
   - ResourceTimelineService - Timeline queries

3. **RisksModule**
   - RiskDetectionService - Risk queries

4. **PortfoliosModule & ProgramsModule**
   - Portfolio services
   - Program services

5. **BillingModule & Subscriptions**
   - Billing services
   - Subscription services

## Migration Checklist Per Module

For each module:
- [ ] Add `createTenantAwareRepositoryProvider(Entity)` in module providers
- [ ] Replace `@InjectRepository` with `TenantAwareRepository` injection
- [ ] Replace `createQueryBuilder()` with `repo.qb()` or `repo.createQueryBuilder()`
- [ ] Remove manual `organizationId` filters from where clauses
- [ ] Keep `workspaceId` scoping only for `@WorkspaceScoped` entities
- [ ] Update service methods to use `tenantContextService.assertOrganizationId()`
- [ ] Add cross-tenant test for controllers with `:workspaceId` params
- [ ] Add cross-tenant test for org-scoped read endpoints

## WorkspaceScoped Validation

Only tag entities where:
- Entity has `workspaceId` column
- Primary access pattern is workspace-bound
- Entity is typically accessed within workspace context

**Do NOT tag:**
- Organization-level entities (Organization, UserOrganization)
- System entities without workspace context
- Entities where workspace is optional/rarely used

**Already Tagged:**
- ✅ Project (has workspaceId, workspace-scoped)
- ✅ WorkItem (has workspaceId, workspace-scoped)

**To Evaluate:**
- Workspace (org-scoped, not workspace-scoped)
- WorkspaceMember (org-scoped, not workspace-scoped)
- ResourceAllocation (may be workspace-scoped if project has workspaceId)

## Test Requirements

For each migrated controller:

### Controllers with `:workspaceId` param:
```typescript
it('should return 403 when user tries to access workspace from different org', async () => {
  const response = await request(app.getHttpServer())
    .get(`/api/endpoint/${workspaceB.id}`)
    .set('Authorization', `Bearer ${tokenA}`)
    .query({ organizationId: orgB.id }) // Attempt bypass - should be ignored
    .expect(403); // Forbidden

  expect(response.body.message).toMatch(/workspace|forbidden|access|denied/i);
});
```

### Org-scoped read endpoints:
```typescript
it('should not return data from different organization', async () => {
  const response = await request(app.getHttpServer())
    .get('/api/endpoint')
    .set('Authorization', `Bearer ${tokenA}`)
    .expect(200);

  // Verify all returned items belong to orgA
  const items = response.body.data || [];
  expect(items.every(item => item.organizationId === orgA.id)).toBe(true);
  expect(items.some(item => item.organizationId === orgB.id)).toBe(false);
});
```

## Background Script Enhancement

Update `scripts/tenant-scoped-report.ts`:
- Add second tenant execution
- Assert outputs contain only that tenant's data
- Store outputs in `docs/smoke-proof-artifacts/`
- No timestamps in assertions (use deterministic IDs)

## CI Enforcement

- Add `lint:tenancy-guard` to CI workflow before tests
- Script should only scan `src/modules` and fail fast
- Create allowlist file if controlled exceptions needed



