# Final Code Review - Ready for Merge Gate

## ✅ Build Status: CLEAN

All TypeScript compilation errors fixed. Build passes.

## All Phases Complete

### Phase A: Create Endpoint ✅
- WorkspaceId validation only for WORKSPACE scope
- Canonical org role using `normalizePlatformRole` and `isAdminRole`
- DTO fields forced explicitly
- ResponseService used

### Phase B: Migration ✅
- `default_enabled_kpis` column added with existence check
- Check constraint for `template_scope` values
- Safe backfill logic

### Phase C: List Endpoint ✅
- WorkspaceId validated only if present
- Passed to service explicitly
- ResponseService used

### Phase D: Instantiate V5_1 ✅
- WorkspaceId required and validated at controller
- Service validates at start (fail fast)
- ResponseService used

### Phase E: Atomic Publish & Legacy Route ✅
- Atomic SQL update for version increment
- Legacy route returns 410 Gone

## Code Blocks for Review

### 1. Migration File
**File:** `zephix-backend/src/migrations/1790000000000-AddTemplateScopeAndWorkspaceId.ts`

```typescript
// Adds template_scope, workspace_id, default_enabled_kpis
// Backfills existing templates
// Adds check constraint for template_scope
// Creates indexes
```

### 2. Create Endpoint (Fixed)
**File:** `zephix-backend/src/modules/templates/controllers/templates.controller.ts:105-195`

Key fixes:
- `validateWorkspaceId()` only called for WORKSPACE scope
- Uses `getAuthContext()` and `normalizePlatformRole()`
- Forces `dto.templateScope` and `dto.workspaceId`
- ORG scope: `dto.workspaceId = null`
- WORKSPACE scope: `dto.workspaceId = workspaceId` (from header)

### 3. List Endpoint (Fixed)
**File:** `zephix-backend/src/modules/templates/controllers/templates.controller.ts:203-232`

Key fixes:
- Validates workspaceId only if header present
- Passes validated workspaceId to service
- Service accepts as parameter (not from headers)

### 4. Instantiate V5_1 (Fixed)
**File:** `zephix-backend/src/modules/templates/services/templates-instantiate-v51.service.ts:52-138`

Key fixes:
- Validates workspaceId at start (fail fast)
- Scope-based template lookup
- All project fields set in transaction

### 5. Publish Endpoint (Fixed)
**File:** `zephix-backend/src/modules/templates/services/templates.service.ts:796-850`

Key fixes:
- Atomic SQL update: `version = version + 1`
- Uses `CURRENT_TIMESTAMP` for publishedAt
- Re-reads template after update

### 6. Legacy Route (Gated)
**File:** `zephix-backend/src/modules/templates/controllers/templates.controller.ts:575-587`

Returns 410 Gone with clear message.

## Ready for Proofs

All code fixes complete. Ready to:
1. Run migration
2. Verify DB state
3. Capture API proofs (9 scenarios)

## Verification Checklist

- [x] Build is clean
- [x] Create endpoint fixes applied
- [x] Migration includes default_enabled_kpis
- [x] List endpoint validates workspaceId
- [x] Instantiate requires workspaceId
- [x] Publish is atomic
- [x] Legacy route gated
- [x] ResponseService used consistently
- [ ] Migration run on dev DB
- [ ] DB columns verified
- [ ] API proofs captured
