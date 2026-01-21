# Acceptable @InjectRepository Exceptions

## Policy

**Rule**: Feature modules under `src/modules` must NOT use `@InjectRepository` for tenant-scoped entities.

**Exception**: Only allowed for:
1. **True global entities** (not tenant-scoped)
2. **Infrastructure modules** (tenancy, database)

## Allowed Exceptions

### 1. Global Entities (Not Tenant-Scoped)

These entities are not scoped by `organizationId` and are safe to inject directly:

- ✅ **Organization** - Defines the tenant boundary itself
  - **Access Rule**: Allowed only via infrastructure wrapper (`src/database/organization.repo.ts`)
  - **Rationale**: Organization is the tenant boundary; direct access must be infrastructure-level
- ✅ **Plan** - Global billing catalog entity (shared across all organizations)
  - **Access Rule**: Allowed via `@InjectRepository(Plan)` in feature modules
  - **Rationale**: Plans are product catalog items, not tenant-scoped
- ✅ **User** - Global user entity (tenant relationship via UserOrganization)
- ✅ **UserOrganization** - Junction table linking users to organizations

**Example**:
```typescript
// ✅ Allowed - Plan is global catalog entity
@InjectRepository(Plan)
private planRepo: Repository<Plan>

// ✅ Allowed - Organization via infrastructure wrapper
import { getOrganizationRepository } from '../database/organization.repo';
const orgRepo = getOrganizationRepository(dataSource);

// ❌ FORBIDDEN - Direct DataSource.getRepository(Organization) in feature modules
const orgRepo = this.dataSource.getRepository(Organization);
```

### 2. Infrastructure Modules

These modules are allowed to use `@InjectRepository` because they provide the tenant scoping infrastructure:

- ✅ `src/modules/tenancy/**` - Provides TenantAwareRepository
- ✅ `src/database/**` - Database infrastructure
- ✅ `migrations/**` - Migration scripts (when wrapped in runWithTenant)

**Example**:
```typescript
// In tenant-aware-repository.provider.ts
const repo = dataSource.getRepository(Entity);  // ✅ Allowed - infrastructure
```

## Forbidden Usage

### Tenant-Scoped Entities

These entities MUST use `TenantAwareRepository`:

- ❌ **Workspace** - Has `organizationId`
- ❌ **Project** - Has `organizationId` and `workspaceId` (workspace-scoped)
- ❌ **Task** - Has `organizationId`
- ❌ **Resource** - Has `organizationId`
- ❌ **ResourceAllocation** - Has `organizationId`
- ❌ **Risk** - Has `organizationId`
- ❌ **WorkItem** - Has `organizationId` and `workspaceId`
- ❌ **Template** - Has `organizationId`
- ❌ **TaskDependency** - Tenant-scoped via Task relationship
- ❌ **Subscription** - Has `organizationId` - **MIGRATED**
- ❌ **Team** - Has `organizationId` - **MIGRATED**
- ❌ **CustomField** - Has `organizationId` - **MIGRATED**
- ❌ Any entity with `organizationId` column

**Example**:
```typescript
// ❌ FORBIDDEN
@InjectRepository(Task)
private taskRepo: Repository<Task>

// ✅ CORRECT
@Inject(getTenantAwareRepositoryToken(Task))
private taskRepo: TenantAwareRepository<Task>
```

## Verification

### Lint Check
```bash
npm run lint:tenancy-guard
npm run lint:tenancy-guard-full
```

### Manual Check
```bash
# Find all @InjectRepository in feature modules
grep -r "@InjectRepository" zephix-backend/src/modules --exclude-dir=tenancy --exclude-dir=node_modules

# Verify each usage is for Organization, User, or UserOrganization only
```

## Adding New Exceptions

If you need to add an exception:

1. **Document the reason** in this file
2. **Add a test** proving the entity is truly global (not tenant-scoped)
3. **Get approval** from the team lead
4. **Update this document** with the exception

## Current Status

**Last Updated**: Phase 2a completion

**Verified Exceptions**:
- ✅ Organization (global) - via infrastructure wrapper only
- ✅ Plan (global catalog entity)
- ✅ User (global)
- ✅ UserOrganization (global)
- ✅ Infrastructure modules (tenancy, database)

**All tenant-scoped entities migrated to TenantAwareRepository**:
- ✅ Workspace
- ✅ Project
- ✅ Task
- ✅ Resource
- ✅ ResourceAllocation
- ✅ Risk
- ✅ WorkItem
- ✅ Template
- ✅ TaskDependency



