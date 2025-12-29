# Phase 2a: Runtime Guardrail Hardening & TeamsModule Migration

## ✅ Runtime Guardrail Hardening

### Changes Made

1. **Wrapped all query execution methods** in `TenantAwareRepository.qb()`:
   - `execute()`
   - `getMany()`
   - `getOne()`
   - `getRawMany()`
   - `getRawOne()`

2. **Created shared assertion function** `assertTenantAwareQueryBuilder()`:
   - Checks for `__tenantAware` marker
   - Throws in dev/test mode if marker missing
   - Provides clear error message with organizationId

3. **Added negative test** `runtime-guardrail-bypass.spec.ts`:
   - Tests that direct `DataSource.createQueryBuilder()` usage throws
   - Covers all execution methods (getMany, getOne, execute, getRawMany, getRawOne)
   - Proves guardrail works on all common query paths

### Protection Coverage

**Before**: Only checked if queryBuilder was passed in `find()`/`findOne()` options
**After**: All query execution paths are protected:
- ✅ Query builders created via `repo.qb()` are marked
- ✅ All execution methods check the marker before running
- ✅ Direct `DataSource.createQueryBuilder()` usage throws in dev/test

## ✅ TeamsModule Migration

### Module Updates
- **File**: `zephix-backend/src/modules/teams/teams.module.ts`
  - Added `TenancyModule` import
  - Added `createTenantAwareRepositoryProvider` for Team, TeamMember, Project

### Entity Updates
- **File**: `zephix-backend/src/modules/teams/entities/team.entity.ts`
  - Added `@WorkspaceScoped()` decorator (Team has optional workspaceId)

### Service Updates
- **File**: `zephix-backend/src/modules/teams/teams.service.ts`
  - Replaced `@InjectRepository` with `TenantAwareRepository` for:
    - Team (workspace-scoped)
    - TeamMember (tenant-scoped via Team relationship)
    - Project (already workspace-scoped)
  - Added `TenantContextService` injection
  - Removed manual `organizationId` filters from:
    - `listTeams()` - uses `repo.qb()` instead of `createQueryBuilder()`
    - `getTeamById()` - removed `organizationId` from where clause
    - `createTeam()` - gets `organizationId` from context
    - `updateTeam()` - removed `organizationId` from where clauses
    - `deleteTeam()` - removed `organizationId` from where clause
  - Updated query builder usage to `repo.qb()`

### Entity Scoping
- **Team**: Workspace-scoped (has `organizationId` and optional `workspaceId`)
- **TeamMember**: Tenant-scoped via Team relationship (no direct `organizationId` column)
- **Project**: Already workspace-scoped (from ProjectsModule)

### Tests Added
- **File**: `zephix-backend/test/tenancy/teams-tenant-isolation.e2e-spec.ts`
  - Org-scoped read isolation test
  - Cross-tenant team access test (404 for org-scoped entities)

### Verification
- ✅ All `@InjectRepository` replaced with `TenantAwareRepository`
- ✅ All manual `organizationId` filters removed
- ✅ All query builders use `repo.qb()`
- ✅ Tests added for tenant isolation
- ✅ `@WorkspaceScoped` decorator added to Team entity

## 📋 Acceptable @InjectRepository Exceptions

**Documented in**: `docs/ACCEPTABLE_INJECT_REPOSITORY_EXCEPTIONS.md`

**Allowed**:
- ✅ Organization (global entity)
- ✅ User (global entity)
- ✅ UserOrganization (global entity)
- ✅ Infrastructure modules (tenancy, database)

**Forbidden**:
- ❌ Team (has organizationId) - **MIGRATED**
- ❌ TeamMember (tenant-scoped via Team) - **MIGRATED**
- ❌ Any entity with `organizationId` column

## ✅ Verification Commands

```bash
cd zephix-backend

# 1. Build
npm run build

# 2. Guardrails (both must pass)
npm run lint:tenancy-guard
npm run lint:tenancy-guard-full

# 3. Tests
npm test
npm run test:e2e

# 4. Runtime guardrail test
npm test -- runtime-guardrail-bypass.spec.ts
```

## 📊 Migration Status

### High-Risk Modules ✅ (9/9)
1. ✅ WorkspacesModule
2. ✅ ResourcesModule
3. ✅ ResourceAllocationService
4. ✅ RisksModule
5. ✅ IntegrationsModule
6. ✅ ProjectsModule
7. ✅ WorkItemsModule
8. ✅ TemplatesModule
9. ✅ TasksModule

### Medium-Priority Modules ✅ (1/4)
- ✅ **TeamsModule** (just completed)
- ⚠️ BillingModule
- ⚠️ Subscriptions
- ⚠️ CustomFieldsModule

## 🎯 Next Steps

1. **CustomFieldsModule** migration
2. **BillingModule** migration
3. **Subscriptions** migration (if separate)
4. Re-run `lint:tenancy-guard-full` after each
5. Add E2E proof per module


