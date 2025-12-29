# Phase 2a Migration Playbook

This guide explains how to migrate modules to use TenantAwareRepository for automatic tenant scoping.

## Overview

Phase 2a implements DAL-enforced tenant scoping using AsyncLocalStorage. All tenant-scoped repository operations are automatically filtered by `organizationId` from the request context, with optional `workspaceId` filtering for workspace-scoped entities.

## Key Concepts

### Tenant Context
- `organizationId` comes **ONLY** from `req.user.organizationId` (JWT payload)
- `workspaceId` comes from route params (`:workspaceId`), validated against organization
- Context is set automatically by `TenantContextInterceptor` for all HTTP requests
- For non-request code (scripts, jobs), use `runWithTenant()` wrapper

### Cross-Tenant Workspace Access Policy
**Policy**: All cross-tenant workspace access must return **403 Forbidden** (not 404).

**Rationale**:
- Consistent "permission denied" semantics across the API
- Prevents information leakage about workspace existence in other organizations
- Matches existing guard behavior (`RequireWorkspaceAccessGuard`)

**Implementation**: Use shared test helper `assertCrossTenantWorkspace403()` from `test/tenancy/helpers/cross-tenant-workspace.test-helper.ts` for all workspace-scoped controller tests.

### TenantAwareRepository
- Wraps TypeORM Repository with automatic tenant scoping
- **ALL reads** are automatically scoped by `organizationId`
- Workspace-scoped entities are also filtered by `workspaceId` if present in context
- Throws hard error if `organizationId` missing when tenant-scoped method called

### WorkspaceScoped Entities
- Entities with `workspaceId` column should be marked with `@WorkspaceScoped()` decorator
- When `workspaceId` exists in context, TenantAwareRepository automatically filters by it
- If `workspaceId` missing in context, only `organizationId` filter is applied

## Migration Steps

### Step 1: Add TenantAwareRepository Provider

In your module file, add the provider:

```typescript
import { TenancyModule, createTenantAwareRepositoryProvider } from '../tenancy/tenancy.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([YourEntity]),
    TenancyModule, // Required for TenantAwareRepository
    // ... other imports
  ],
  providers: [
    createTenantAwareRepositoryProvider(YourEntity),
    YourService,
    // ... other providers
  ],
})
export class YourModule {}
```

### Step 2: Update Service/Controller Injection

Replace `@InjectRepository` with `TenantAwareRepository` injection:

```typescript
// Before
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class YourService {
  constructor(
    @InjectRepository(YourEntity)
    private repo: Repository<YourEntity>,
  ) {}
}

// After
import { Inject } from '@nestjs/common';
import { TenantAwareRepository } from '../tenancy/tenant-aware.repository';
import { getTenantAwareRepositoryToken } from '../tenancy/tenant-aware.repository';
import { TenantContextService } from '../tenancy/tenant-context.service';

@Injectable()
export class YourService {
  constructor(
    @Inject(getTenantAwareRepositoryToken(YourEntity))
    private repo: TenantAwareRepository<YourEntity>,
    private readonly tenantContextService: TenantContextService,
  ) {}
}
```

### Step 3: Remove Manual OrganizationId Filters

Remove explicit `organizationId` from where clauses - it's now automatic:

```typescript
// Before
const items = await this.repo.find({
  where: { organizationId, status: 'active' },
});

// After
const items = await this.repo.find({
  where: { status: 'active' }, // organizationId added automatically
});
```

### Step 4: Update Query Builders

Use `repo.qb()` instead of `createQueryBuilder()` for automatic scoping:

```typescript
// Before
const qb = this.repo.createQueryBuilder('alias')
  .where('alias.organizationId = :orgId', { orgId })
  .andWhere('alias.status = :status', { status: 'active' });

// After
const qb = this.repo.qb('alias') // organizationId filter added automatically
  .andWhere('alias.status = :status', { status: 'active' });
```

### Step 5: Get OrganizationId from Context

If you need `organizationId` in service logic, get it from context:

```typescript
// Before
async someMethod(organizationId: string) {
  // Use organizationId parameter
}

// After
async someMethod() {
  const organizationId = this.tenantContextService.assertOrganizationId();
  // Use organizationId from context
}
```

## Marking Workspace-Scoped Entities

If your entity has a `workspaceId` column and should be filtered by workspace:

```typescript
import { WorkspaceScoped } from '../tenancy/workspace-scoped.decorator';

@WorkspaceScoped()
@Entity('your_entity')
export class YourEntity {
  @Column({ name: 'organization_id' })
  organizationId: string;

  @Column({ name: 'workspace_id' })
  workspaceId: string;
  // ... other fields
}
```

When `workspaceId` exists in context (from route param), TenantAwareRepository will automatically filter by both `organizationId` and `workspaceId`.

## Using runWithTenant in Non-Request Code

For scripts, jobs, or any code that runs outside HTTP requests:

```typescript
import { TenantContextService } from '../modules/tenancy/tenant-context.service';
import { TenantAwareRepository } from '../modules/tenancy/tenant-aware.repository';

async function processOrganizationData(organizationId: string) {
  await tenantContextService.runWithTenant(
    { organizationId },
    async () => {
      // Inside this callback, tenant context is set
      const projects = await projectRepo.find({}); // Auto-scoped to organizationId
      // Process projects...
    },
  );
}
```

See `scripts/tenant-scoped-report.ts` for a complete example.

## Testing

### Unit Tests

Test that repository methods are scoped correctly:

```typescript
it('should only return projects from tenant organization', async () => {
  await tenantContextService.runWithTenant(
    { organizationId: 'org-123' },
    async () => {
      const projects = await projectRepo.find({});
      expect(projects.every(p => p.organizationId === 'org-123')).toBe(true);
    },
  );
});
```

### E2E Tests

Test cross-tenant isolation:

```typescript
it('should block cross-tenant access', async () => {
  // User from Org A tries to access Org B's data
  const response = await request(app.getHttpServer())
    .get(`/api/endpoint/${orgBResourceId}`)
    .set('Authorization', `Bearer ${orgAToken}`)
    .expect(404); // Should not find it
});
```

## CI Enforcement

The CI pipeline includes a check for bypass patterns:

```bash
npm run lint:tenancy-guard
```

This script checks for forbidden patterns:
- `@InjectRepository(`
- `getRepository(`
- `DataSource.getRepository`
- `createQueryBuilder(` (use `repo.qb()` instead)
- Direct query execution

## Common Pitfalls

1. **Don't pass organizationId from request body/query** - Always use tenant context
2. **Don't use createQueryBuilder directly** - Use `repo.qb()` for automatic scoping
3. **Don't forget to mark WorkspaceScoped entities** - Use `@WorkspaceScoped()` decorator
4. **Don't bypass in scripts** - Always use `runWithTenant()` wrapper

## Verification

After migration, verify:

1. ✅ Build passes: `npm run build`
2. ✅ Tests pass: `npm test && npm run test:e2e`
3. ✅ No bypass patterns: `npm run lint:tenancy-guard`
4. ✅ Manual test: Verify cross-tenant access is blocked

## Examples

See migrated modules for reference:
- `src/modules/integrations/integrations-webhook.controller.ts`
- `src/modules/resources/services/resource-heat-map.service.ts`
- `src/modules/work-items/work-item.service.ts`
- `src/modules/templates/services/templates.service.ts`


