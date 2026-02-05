# Template Center v1 - Services Implementation Complete

## Services Created/Updated

### 1. TemplatesService ✅
**File:** `zephix-backend/src/modules/templates/services/templates.service.ts`

**New v1 Methods Added:**
- `listV1(req, params)` - List templates with filters and optional blocks
- `getV1(req, id)` - Get template with blocks array
- `createV1(req, dto)` - Create template with defaults
- `cloneV1(req, templateId)` - Clone template and blocks
- `setDefaultV1(req, templateId)` - Set org default (transaction)
- `lockV1(req, templateId)` - Lock template
- `unlockV1(req, templateId)` - Unlock template
- `archiveV1(req, templateId)` - Archive template (transaction)
- `getByIdForGuard(req, templateId)` - Minimal select for guards

**Key Features:**
- Tenant scoped by organizationId from request
- Supports system templates (organizationId = null)
- Includes blocks with lego block details when requested
- Transaction boundaries for setDefault and archive
- Filters: isDefault, isSystem, lockState, includeArchived

### 2. TemplateBlocksService ✅ (NEW)
**File:** `zephix-backend/src/modules/templates/services/template-blocks.service.ts`

**Methods:**
- `attachV1(req, templateId, dto)` - Attach block to template
- `reorderV1(req, templateId, dto)` - Reorder blocks (transaction)
- `patchConfigV1(req, templateId, blockId, dto)` - Update block config
- `detachV1(req, templateId, blockId)` - Detach block

**Key Features:**
- Validates template exists and belongs to org
- Validates block exists and isActive
- Enforces unique (orgId, templateId, blockId)
- Auto-calculates displayOrder (max + 1)
- Checks template lockState before mutations
- Checks block locked flag before config/detach

### 3. LegoBlocksService ✅ (NEW)
**File:** `zephix-backend/src/modules/templates/services/lego-blocks.service.ts`

**Methods:**
- `listV1(req, params)` - List lego blocks catalog
- `getByIdForGuard(req, blockId)` - Minimal select for guards
- `userMeetsMinRole(req, block)` - Role comparison
- `assertUserMeetsMinRole(req, block)` - Throws if insufficient role

**Key Features:**
- Filters by type, category, isActive
- Supports system blocks (organizationId = null)
- Role hierarchy: OWNER (4) > ADMIN (3) > PM (2) > USER (1)
- Returns catalog fields for Cmd+K UI

### 4. ProjectsService ✅
**File:** `zephix-backend/src/modules/projects/services/projects.service.ts`

**New Method:**
- `createWithTemplateSnapshotV1(req, input)` - Create project with template snapshot

**Key Features:**
- If templateId provided:
  - Loads template and template_blocks
  - Builds snapshot JSONB with templateId, version, locked, blocks array
  - Sets project.templateId, templateVersion, templateLocked, templateSnapshot
- If templateId missing, creates project normally
- Transaction boundary for atomic creation
- Validates template not archived

## Guards Updated

### TemplateLockGuard ✅
- Fixed to call `getByIdForGuard(req, templateId)` with correct parameter order

### BlockRoleGuard ✅
- Fixed to call `getByIdForGuard(req, blockId)` and `userMeetsMinRole(req, block)` with correct parameters

## Controllers Updated

All controllers now:
- Call services with `req` as first parameter
- Wrap responses in `{ data: ... }` format
- Convert query string params to proper types (boolean, etc.)

**Fixed Controllers:**
- `TemplatesController` - listV1, getV1, createV1
- `TemplateActionsController` - cloneV1, setDefaultV1, lockV1, unlockV1, archiveV1
- `TemplateBlocksController` - attachV1, reorderV1, patchConfigV1, detachV1
- `LegoBlocksController` - listV1
- `ProjectsController` - createWithTemplateSnapshotV1

## Module Wiring

**TemplateModule** already updated to include:
- TemplateBlocksService provider
- LegoBlocksService provider
- TemplateLockGuard provider
- BlockRoleGuard provider
- All new controllers registered

## Next Steps

1. ✅ Services implemented
2. ⏭️ **Entity Files** - Ensure Template, TemplateBlock, LegoBlock, Project entities have all v1 fields
3. ⏭️ **Migrations** - Run migrations A-F to add v1 columns
4. ⏭️ **Tests** - Add unit and E2E tests for all v1 methods
5. ⏭️ **UI Integration** - Cmd+K registry and template selection UI

## Notes

- All services use `TenantAwareRepository` for automatic org scoping
- All services extract orgId from `req.user.organizationId` or `tenantContext.assertOrganizationId()`
- Transaction boundaries are used for setDefault, archive, reorder, and project creation
- System templates/blocks are accessible to all orgs (organizationId = null)
- Lock enforcement is server-side only (guards + service validation)




