# Template Center v1 - Correctness Checks & Fixes Applied

## 1. Import Path Sanity ✅

### Verified Import Paths
- ✅ `../../tenancy/tenant-context.service` - All services use this
- ✅ `../../tenancy/tenant-aware.repository` - All services use this (getTenantAwareRepositoryToken exported from same file)
- ✅ Entity imports use module-relative paths:
  - Templates services: `../entities/template.entity`, `../entities/template-block.entity`, `../entities/lego-block.entity`
  - Projects service: `../../templates/entities/template.entity`, `../../templates/entities/template-block.entity`

## 2. Module Wiring ✅

### TemplatesModule
- ✅ `TypeOrmModule.forFeature` includes: `Template`, `TemplateBlock`, `LegoBlock`
- ✅ Providers include: `TemplatesService`, `TemplateBlocksService`, `LegoBlocksService`
- ✅ Providers include: `TemplateLockGuard`, `BlockRoleGuard`
- ✅ Exports include: `TemplatesService`, `TemplateBlocksService`, `LegoBlocksService`
- ✅ `TenantAwareRepository` providers for: `Template`, `TemplateBlock`, `LegoBlock`

### ProjectsModule
- ✅ Added `Template` and `TemplateBlock` to `TypeOrmModule.forFeature`
- ✅ Added `TenantAwareRepository` providers for `Template` and `TemplateBlock`
- ✅ `ProjectsService` can now inject `Template` repo via `getTenantAwareRepositoryToken(Template)`

## 3. Entity Field Alignment ✅

### Template Entity
**File:** `zephix-backend/src/modules/templates/entities/template.entity.ts`

**Added v1 fields:**
- ✅ `isDefault` → `is_default` (boolean, default false)
- ✅ `lockState` → `lock_state` ('UNLOCKED' | 'LOCKED', default 'UNLOCKED')
- ✅ `createdById` → `created_by_id` (UUID, nullable)
- ✅ `updatedById` → `updated_by_id` (UUID, nullable)
- ✅ `publishedAt` → `published_at` (timestamp, nullable)
- ✅ `archivedAt` → `archived_at` (timestamp, nullable)
- ✅ `organizationId` → `organization_id` (nullable - CHECK constraint enforces non-system requirement)
- ✅ Added indexes: `idx_templates_org_default`, `idx_templates_org_name`

### LegoBlock Entity
**File:** `zephix-backend/src/modules/templates/entities/lego-block.entity.ts`

**Added v1 fields:**
- ✅ `key` (string, unique, nullable)
- ✅ `surface` (JSONB, default {})
- ✅ `isActive` → `is_active` (boolean, default true)
- ✅ `minRoleToAttach` → `min_role_to_attach` (string, nullable)
- ✅ Added index: `idx_lego_blocks_key`

### TemplateBlock Entity
**File:** `zephix-backend/src/modules/templates/entities/template-block.entity.ts`

**Created new entity with all required fields:**
- ✅ `id` (UUID, PK)
- ✅ `organizationId` → `organization_id` (required)
- ✅ `templateId` → `template_id` (required)
- ✅ `blockId` → `block_id` (required)
- ✅ `enabled` (boolean, default true)
- ✅ `displayOrder` → `display_order` (integer, default 0)
- ✅ `config` (JSONB, default {})
- ✅ `locked` (boolean, default false)
- ✅ Unique constraint: `(organizationId, templateId, blockId)`
- ✅ Indexes: `idx_template_blocks_org_template`, `idx_template_blocks_org_block`

### Project Entity
**File:** `zephix-backend/src/modules/projects/entities/project.entity.ts`

**Added v1 fields:**
- ✅ `templateId` → `template_id` (UUID, nullable)
- ✅ `templateVersion` → `template_version` (integer, nullable)
- ✅ `templateLocked` → `template_locked` (boolean, default false)
- ✅ `templateSnapshot` → `template_snapshot` (JSONB, nullable)

## 4. Guard Behavior ✅

### TemplateLockGuard
**Blocks these operations when `lockState = 'LOCKED'`:**
- ✅ `clone` - Has `@UseGuards(TemplateLockGuard)`
- ✅ `setDefault` - Has `@UseGuards(TemplateLockGuard, RequireOrgRoleGuard)`
- ✅ `archive` - Has `@UseGuards(TemplateLockGuard)`
- ✅ `update` (PUT) - Has `@UseGuards(TemplateLockGuard)`
- ✅ `patch` (PATCH) - Has `@UseGuards(TemplateLockGuard)`
- ✅ `attach` - Has `@UseGuards(TemplateLockGuard, BlockRoleGuard)`
- ✅ `reorder` - Has `@UseGuards(TemplateLockGuard)`
- ✅ `patchConfig` - Has `@UseGuards(TemplateLockGuard)`
- ✅ `detach` - Has `@UseGuards(TemplateLockGuard)`

**Does NOT block (admin operations that SET lock state):**
- ✅ `lock` - Admin only, no TemplateLockGuard (correct)
- ✅ `unlock` - Admin only, no TemplateLockGuard (correct)

### BlockRoleGuard
- ✅ Evaluates `minRoleToAttach` before `attach` operation
- ✅ Uses `userMeetsMinRole(req, block)` with role hierarchy
- ✅ Applied to `POST /api/templates/:id/blocks`

### Defense-in-Depth
- ✅ Services also check template `archivedAt` before mutations
- ✅ Services check block-level `locked` flag for `patchConfig` and `detach`
- ✅ Guard checks template-level `lockState` (primary enforcement)

## 5. API Contract Consistency ✅

### Response Format
- ✅ All endpoints return `{ data: ... }` wrapper
- ✅ Success responses: `{ data: { ok: true } }` or `{ data: <entity> }`
- ✅ List responses: `{ data: <array> }`
- ✅ Single entity responses: `{ data: <entity> }`

### DTO Mapping
- ✅ `ReorderBlocksDto.items` → Service expects `{ order: [...] }` - Controller maps correctly
- ✅ Query params converted to proper types (boolean, etc.)
- ✅ All service methods receive `req` as first parameter

## 6. Fast Verification Sequence

### Commands to Run
```bash
# 1. Lint check
cd zephix-backend && npm run lint

# 2. Type check
npm run build

# 3. Unit tests
npm run test

# 4. Run migrations (when ready)
npm run migration:run

# 5. E2E tests
npm run test:e2e
```

### Potential Issues to Watch For

1. **ProjectsModule Template Repo**
   - ✅ Fixed: Added `Template` and `TemplateBlock` to `TypeOrmModule.forFeature`
   - ✅ Fixed: Added `TenantAwareRepository` providers for both

2. **Entity Property Names**
   - ✅ All entities use snake_case for column names (`@Column({ name: 'snake_case' })`)
   - ✅ All entities use camelCase for property names
   - ✅ Services use camelCase property names (TypeORM handles mapping)

3. **Missing Exports**
   - ✅ `TemplateBlocksService` exported from `TemplateModule`
   - ✅ `LegoBlocksService` exported from `TemplateModule`
   - ✅ Guards are providers (not exported, used internally)

## Summary of Fixes Applied

1. ✅ Created `TemplateBlock` entity with all required fields
2. ✅ Added v1 fields to `Template` entity (isDefault, lockState, archivedAt, etc.)
3. ✅ Added v1 fields to `LegoBlock` entity (key, surface, isActive, minRoleToAttach)
4. ✅ Added template snapshot fields to `Project` entity
5. ✅ Updated `ProjectsModule` to register `Template` and `TemplateBlock` entities
6. ✅ Added `TemplateLockGuard` to PUT/PATCH endpoints in `TemplatesController`
7. ✅ Added `TemplateLockGuard` to `setDefault` and `archive` endpoints
8. ✅ Added defense-in-depth template checks in `TemplateBlocksService` methods
9. ✅ Verified all controllers return `{ data: ... }` format
10. ✅ Verified all import paths are correct

## Next Steps

1. Run migrations A-F to add database columns
2. Run lint and type checks
3. Run unit tests
4. Run E2E tests
5. Verify guard behavior with locked templates



