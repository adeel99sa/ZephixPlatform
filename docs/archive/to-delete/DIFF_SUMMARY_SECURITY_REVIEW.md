# Diff Summary - Security Review

## Scope Analysis

### Files Changed
- Template entity and DTOs (column mappings, new fields)
- Template service (createV1, listV1, updateV1, publishV1)
- Template controller (create, list, patch, publish, instantiate)
- Template instantiate service (structure extraction, KPI propagation)
- Dev seed script (repository-based, no raw SQL)
- Proof capture script (structured templates)
- Migration (template_scope, workspace_id, default_enabled_kpis)

### No Scope Creep Detected ✅
- All changes align with template scope and versioning requirements
- No unrelated features added
- No breaking changes to existing APIs (legacy route deprecated, not removed)

## Security Review

### 1. Tenancy Enforcement ✅

**Template Create:**
- ✅ `organizationId` always set from auth context (not from body)
- ✅ `workspaceId` for WORKSPACE templates taken from header (not from body)
- ✅ ORG templates force `workspaceId = null`
- ✅ WORKSPACE templates require header validation

**Template List:**
- ✅ Filters by `organizationId` from auth context
- ✅ WORKSPACE templates only included if workspace header matches
- ✅ No cross-organization template leakage

**Template Instantiate:**
- ✅ Requires `x-workspace-id` header
- ✅ Validates workspace access before template lookup
- ✅ Template lookup scoped by organizationId and workspaceId
- ✅ Project created in validated workspace

### 2. RBAC Enforcement ✅

**Create Template:**
- ✅ ORG scope: Admin only (`isAdminRole` check)
- ✅ WORKSPACE scope: Workspace Owner or Admin
- ✅ Workspace role checked via `workspaceRoleGuard.getWorkspaceRole()`
- ✅ Member cannot create templates (proof 03: 403)

**Update Template:**
- ✅ Same RBAC rules as create
- ✅ Cannot change `templateScope` or `workspaceId` after creation
- ✅ SYSTEM templates cannot be updated

**Publish Template:**
- ✅ Same RBAC rules as create
- ✅ Atomic update prevents version collisions

**Instantiate Template:**
- ✅ Requires workspace write access
- ✅ Validates workspace membership before instantiation

### 3. Input Validation ✅

**Workspace ID:**
- ✅ Validated as UUID format
- ✅ Required for WORKSPACE templates
- ✅ Not accepted from body (taken from header)

**Template Scope:**
- ✅ Enum validation (SYSTEM, ORG, WORKSPACE)
- ✅ Database check constraint
- ✅ Service-level validation

**Structure:**
- ✅ At least one phase required for instantiation
- ✅ JSON structure validated during extraction

### 4. Data Integrity ✅

**Version Management:**
- ✅ Atomic SQL update: `version = version + 1`
- ✅ No race conditions on publish
- ✅ Version increments only on explicit publish

**KPI Propagation:**
- ✅ Copied from template to project at instantiation
- ✅ Array copy (not reference)
- ✅ Defaults to empty array if template has none

**Template Snapshot:**
- ✅ Stores templateId and templateVersion
- ✅ Preserves structure at instantiation time
- ✅ Immutable after creation

### 5. No Security Regressions ✅

**Legacy Route:**
- ✅ Returns 410 Gone (not removed, clearly deprecated)
- ✅ Error message guides to replacement
- ✅ No security risk (returns error, doesn't execute)

**Existing Flows:**
- ✅ Project creation without templates unchanged
- ✅ Template list UI compatibility maintained
- ✅ No breaking changes to existing endpoints

## Code Quality

### Type Safety ✅
- ✅ DTOs use class-validator decorators
- ✅ TypeScript types for all DTOs
- ✅ No `any` types in critical paths (updateV1 uses explicit type)

### Error Handling ✅
- ✅ Explicit error codes (LEGACY_ROUTE, VALIDATION_ERROR, etc.)
- ✅ Clear error messages
- ✅ Proper HTTP status codes (201, 403, 404, 410)

### Transaction Safety ✅
- ✅ Critical operations wrapped in transactions
- ✅ Atomic version increment
- ✅ Template creation and publish in transactions

## Potential Issues (None Found)

### ✅ No Hardcoded Secrets
### ✅ No SQL Injection Risks (using TypeORM)
### ✅ No Authorization Bypass
### ✅ No Data Leakage Across Workspaces
### ✅ No Missing Input Validation

## Recommendations

1. ✅ All checks pass
2. ✅ Ready for merge
3. ✅ Proof bundle complete
4. ✅ Documentation in place

## Next Task for Cursor

**Title:** Wire Template Center UI to create, edit structure, set defaultEnabledKPIs, publish, and instantiate

**Scope:**
- Template creation form with structure editor
- Phase and task addition UI
- defaultEnabledKPIs picker
- Publish button with version display
- Project creation wizard with template selection
- No new libraries
- Small commits
- Capture proof per UI action
