# Tenant Context Guidelines for Contributors

## Overview

Zephix uses **explicit tenant context** to ensure data isolation and prevent AsyncLocalStorage timing issues. This document explains the standard patterns.

## Core Principles

1. **Explicit over implicit**: Always pass `organizationId` explicitly
2. **Controllers own request parsing**: Controllers extract `orgId` from request
3. **Services stay pure**: Services accept `orgId` as first parameter
4. **ALS is fallback only**: AsyncLocalStorage is for legacy compatibility, not new code

## Standard Patterns

### Controllers: Use `getOrgIdOrThrow(req)`

```typescript
import { getOrgIdOrThrow } from '@/common/http/get-auth-context';

@Controller('my-resource')
export class MyResourceController {
  @Get()
  async list(@Req() req: AuthRequest) {
    // ✅ CORRECT: Extract orgId explicitly
    const organizationId = getOrgIdOrThrow(req);
    
    return this.service.list(organizationId);
  }
}
```

### Services: Accept `orgId` as First Parameter

```typescript
@Injectable()
export class MyResourceService {
  constructor(
    @Inject(getTenantAwareRepositoryToken(Resource))
    private repo: TenantAwareRepository<Resource>,
  ) {}

  // ✅ CORRECT: orgId is first parameter
  async list(organizationId: string, filters?: FilterOptions) {
    return this.repo.find(organizationId, {
      where: filters,
    });
  }
}
```

### Repository: Use Explicit `orgId` Parameter

```typescript
// ✅ CORRECT: Explicit orgId as first parameter
const items = await this.repo.find(organizationId, {
  where: { status: 'active' },
});

// ✅ CORRECT: Explicit orgId for save
const saved = await this.repo.save(organizationId, entity);

// ✅ CORRECT: Explicit orgId for findOne
const item = await this.repo.findOne(organizationId, {
  where: { id },
});

// ❌ WRONG: Relying on ALS context (legacy, avoid in new code)
const items = await this.repo.find({
  where: { status: 'active' },
});
```

## TenantAwareRepository API

### Read Operations

```typescript
// Find multiple entities
find(orgId: string, options?: FindManyOptions<T>): Promise<T[]>

// Find one entity
findOne(orgId: string, options?: FindOneOptions<T>): Promise<T | null>

// Find and count
findAndCount(orgId: string, options?: FindManyOptions<T>): Promise<[T[], number]>

// Count entities
count(orgId: string, options?: FindManyOptions<T>): Promise<number>

// Query builder
qb(alias?: string, orgId?: string): SelectQueryBuilder<T>
```

### Write Operations

```typescript
// Save entity
save(orgId: string, entity: DeepPartial<T>): Promise<T>

// Save multiple entities
saveMany(entities: DeepPartial<T>[]): Promise<T[]>
// Note: saveMany still uses ALS context for validation
```

## Error Handling

### Missing organizationId

If `organizationId` is missing from the JWT token or request context:

```typescript
// getOrgIdOrThrow(req) throws:
ForbiddenException('Missing organizationId in authentication context')
```

### Tenant Isolation Violations

Repository methods automatically scope queries by `organizationId`. If you see data from another org, check:

1. Are you passing `orgId` explicitly?
2. Is the entity's `organizationId` column set correctly?
3. Are you using `TenantAwareRepository` (not raw `Repository`)?

## Testing

### Unit Tests

```typescript
it('should scope queries by organizationId', async () => {
  const orgId = 'org-123';
  const items = await service.list(orgId);
  
  // Verify all items belong to orgId
  expect(items.every(item => item.organizationId === orgId)).toBe(true);
});
```

### E2E Tests

```typescript
it('should enforce tenant isolation', async () => {
  // Create data in org A
  // Call endpoint as org B
  // Expect empty results or 404
});
```

## Migration Guide

### Updating Existing Code

1. **Update controller**: Add `getOrgIdOrThrow(req)`
2. **Update service signature**: Add `organizationId: string` as first parameter
3. **Update repository calls**: Add `orgId` as first parameter
4. **Remove ALS dependencies**: Remove `runWithTenant` wrappers

### Example Migration

**Before:**
```typescript
// Controller
async list() {
  return this.service.list();
}

// Service
async list() {
  return this.repo.find({ where: { active: true } });
}
```

**After:**
```typescript
// Controller
async list(@Req() req: AuthRequest) {
  const orgId = getOrgIdOrThrow(req);
  return this.service.list(orgId);
}

// Service
async list(organizationId: string) {
  return this.repo.find(organizationId, { where: { active: true } });
}
```

## CI Enforcement

The build will fail if you use `TenantAwareRepository` methods without explicit `orgId`:

```bash
# Run check manually
./scripts/check-tenant-repo-calls.sh
```

## Legacy Support

- `req.tenant` is set by interceptor for backward compatibility only
- Do not add new dependencies on `req.tenant`
- ALS context fallback is available but discouraged for new code

## Canonical Service Imports

### WorkspaceAccessService

**CRITICAL**: `WorkspaceAccessService` must only be imported from the canonical path:

```typescript
// ✅ CORRECT: Use canonical import path
import { WorkspaceAccessService } from '../../workspace-access/workspace-access.service';

// ❌ WRONG: Do not import from duplicate files
import { WorkspaceAccessService } from './workspace-access.service';
import { WorkspaceAccessService } from '../workspaces/services/workspace-access.service';
```

**Why**: Duplicate implementations create different DI tokens in NestJS, causing boot failures with "Nest can't resolve dependencies" errors.

**Rule**: 
- Single source of truth: `src/modules/workspace-access/workspace-access.service.ts`
- No duplicate implementations in feature modules
- CI blocks non-canonical imports automatically

## Questions?

- See `src/common/http/get-auth-context.ts` for helper functions
- See `src/modules/tenancy/tenant-aware.repository.ts` for repository API
- See `test/my-work.e2e-spec.ts` for example tests
