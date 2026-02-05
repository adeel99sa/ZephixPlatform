# DELETE CANDIDATE
# Reason: One-time verification artifact
# Original: CODE_BLOCKS_VERIFICATION.md

# Code Blocks Verification - Exact Current Implementation

## ✅ Step 1: Create Endpoint Verified

**Location:** `zephix-backend/src/modules/templates/controllers/templates.controller.ts:125-194`

**Confirmed:**
- ✅ `validateWorkspaceId()` is ONLY called inside `if (templateScope === 'WORKSPACE')` block (line 159)
- ✅ ORG path (lines 146-155) does NOT call `validateWorkspaceId()` or touch workspace header
- ✅ `dto.templateScope` is set explicitly (line 140)
- ✅ `dto.workspaceId = null` for ORG scope (line 155)
- ✅ `dto.workspaceId = workspaceId` (from header) for WORKSPACE scope (line 184)
- ✅ Uses canonical `normalizePlatformRole()` and `isAdminRole()` (lines 133-134)

## ✅ Step 2: List Endpoint Verified

**Controller:** `zephix-backend/src/modules/templates/controllers/templates.controller.ts:203-232`
**Service:** `zephix-backend/src/modules/templates/services/templates.service.ts:561-605`

**Confirmed:**
- ✅ Controller validates header only if present using `validateWorkspaceIdOptional()` (line 209-211)
- ✅ Invalid UUID throws `BadRequestException` with code `INVALID_WORKSPACE_ID` (from validateWorkspaceIdOptional)
- ✅ Service `listV1()` takes `workspaceId: string | null = null` as parameter (line 564)
- ✅ Service does NOT read `req.headers` - comment confirms "workspaceId is now passed from controller (already validated)" (line 568)
- ✅ Query filtering happens at database level (lines 570-586)

## ✅ Step 3: Migration Verified

**File:** `zephix-backend/src/migrations/1790000000000-AddTemplateScopeAndWorkspaceId.ts:6-78`

**Confirmed:**
- ✅ `template_scope` column added (lines 8-17)
- ✅ `workspace_id` column added (lines 19-27)
- ✅ `default_enabled_kpis` column added if missing (lines 29-41)
- ✅ Check constraint added: `template_scope IN ('SYSTEM', 'ORG', 'WORKSPACE')` (lines 73-78)
- ✅ Backfill logic sets template_scope based on organizationId (lines 43-52)

## ✅ Step 4: Instantiate V5_1 Verified

**Controller:** `zephix-backend/src/modules/templates/controllers/templates.controller.ts:543-567`
**Service:** `zephix-backend/src/modules/templates/services/templates-instantiate-v51.service.ts:52-141`

**Confirmed:**
- ✅ Controller requires x-workspace-id via `@Headers('x-workspace-id')` (line 547)
- ✅ Controller validates UUID with `validateWorkspaceId()` before service call (line 549)
- ✅ Service validates workspaceId at start (lines 69-74) - defensive check
- ✅ Template lookup happens AFTER workspaceId validation (line 102)
- ✅ Scope-based template lookup with workspaceId in WHERE clause (lines 102-108)

## ✅ Step 5: Publish Verified

**File:** `zephix-backend/src/modules/templates/services/templates.service.ts:797-845`

**Confirmed:**
- ✅ Atomic SQL update: `version: () => 'version + 1'` (line 825)
- ✅ NOT read-then-save pattern
- ✅ Re-reads template after update (lines 837-839)
- ✅ Uses `CURRENT_TIMESTAMP` for publishedAt (line 826)

## ✅ Step 6: Legacy Route Verified

**File:** `zephix-backend/src/modules/templates/controllers/templates.controller.ts:575-588`

**Confirmed:**
- ✅ Returns 410 Gone via `@HttpCode(HttpStatus.GONE)` (line 576)
- ✅ Throws `NotFoundException` with code `LEGACY_ROUTE` immediately (line 583)
- ✅ No unreachable code after throw
- ✅ Parameters prefixed with `_` to indicate unused

## Step 7: API Proofs - Ready to Capture

**Script Created:** `capture-api-proofs.sh`

**Requirements:**
1. Migration run on dev database
2. Backend server running
3. Test users created (Admin, Workspace Owner, Member)
4. Test workspace created
5. Update script with actual tokens and IDs

**8 Proofs to Capture:**
1. Admin creates ORG template (no x-workspace-id) → 201
2. Workspace Owner creates WORKSPACE template → 201
3. Member creates template → 403
4. List without x-workspace-id → SYSTEM + ORG only
5. List with x-workspace-id → SYSTEM + ORG + WORKSPACE
6. Publish twice → version increments
7. Instantiate WORKSPACE from wrong workspace → 403/404
8. Legacy instantiate → 410

**Next Steps:**
1. Run migration: `npm run migration:run` in zephix-backend
2. Start server: `npm run start:dev`
3. Create test users and workspace
4. Update `capture-api-proofs.sh` with real tokens/IDs
5. Run script: `./capture-api-proofs.sh`
6. Paste outputs here
