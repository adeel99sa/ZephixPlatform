# Merge Gate Checklist - Template System

## 1. Code Hygiene ✅

### Backend
- ✅ `npm run lint` - Pass
- ✅ `npm run test` - Pass
- ✅ `npm run build` - Pass
- ✅ `npm run migration:show` - Migration `AddTemplateScopeAndWorkspaceId1790000000000` recorded

### Frontend
- ✅ `npm run lint` - Pass
- ✅ `npm run build` - Pass

## 2. Proof Artifacts ✅

### Files to Commit
- ✅ `FINAL_PROOF_BUNDLE_COMPLETE.md` - Complete proof documentation
- ✅ `scripts/capture-template-proofs.sh` - Repeatable proof script
- ✅ `src/scripts/dev-seed.ts` - Repository-based seeding
- ✅ DTO changes: `src/modules/templates/dto/template.dto.ts`
- ✅ Controller changes: `src/modules/templates/controllers/templates.controller.ts`
- ✅ Service changes: `src/modules/templates/services/templates.service.ts`

### Proof Files Location
- `proofs/templates/*.response.txt` - Generated proof files (can be gitignored)
- Summary documentation committed

## 3. Backward Safety ✅

### Legacy Route
- ✅ Returns `410 Gone` (verified in proof 10)
- ✅ Error payload stable: `{"code":"LEGACY_ROUTE","message":"..."}`
- ✅ No callers found in frontend codebase
- ✅ Route order correct (before `:templateId/instantiate-v5_1`)

## 4. Tenancy and RBAC ✅

### Create ORG Template
- ✅ Requires org admin (verified in proof 01)
- ✅ Does not require x-workspace-id (proof 01 passes without header)
- ✅ Forces workspaceId null (verified in response)

### Create WORKSPACE Template
- ✅ Requires x-workspace-id (proof 02 includes header)
- ✅ Requires workspace owner or org admin (proof 02 uses owner token)
- ✅ Forces dto.workspaceId from header (controller overrides body)

### List Templates
- ✅ Without header returns SYSTEM and ORG only (proof 04)
- ✅ With header returns SYSTEM, ORG, and WORKSPACE for that workspace (proof 05)

### Instantiate v5_1
- ✅ Requires x-workspace-id (proof 09 includes header)
- ✅ Requires workspace write access (controller enforces)
- ✅ Rejects templates with no phases (expected behavior)
- ✅ Creates project with templateId and templateVersion (verified in DB)
- ✅ Copies defaultEnabledKPIs to project activeKpiIds (verified: `["schedule_variance"]`)

## 5. Data Integrity ✅

### Column Verification
- ✅ `templates.template_scope` - EXISTS, NOT NULL, default 'ORG'
- ✅ `templates.default_enabled_kpis` - EXISTS, NOT NULL, default '{}'
- ✅ `projects.active_kpi_ids` - EXISTS, nullable array

### Version Management
- ✅ Template version increments only on publish (proofs 06, 07 show 1→2→3)
- ✅ Publish uses atomic SQL update (`version = version + 1`)

## Commit Structure

### Commit 1: DTO and Entity Mapping Fixes
**Files:**
- `src/modules/templates/entities/template.entity.ts` - Fixed column mappings
- `src/modules/templates/dto/template.dto.ts` - Added structure, defaultEnabledKPIs

### Commit 2: Template Create, List, Scope Rules
**Files:**
- `src/modules/templates/services/templates.service.ts` - createV1, listV1, scope validation
- `src/modules/templates/controllers/templates.controller.ts` - Create and list endpoints
- `src/migrations/1790000000000-AddTemplateScopeAndWorkspaceId.ts` - Schema migration

### Commit 3: Publish Atomic Update and Legacy Route 410
**Files:**
- `src/modules/templates/services/templates.service.ts` - publishV1 with atomic update
- `src/modules/templates/controllers/templates.controller.ts` - Legacy route returns 410

### Commit 4: Instantiate Structured Template and KPI Propagation
**Files:**
- `src/modules/templates/services/templates-instantiate-v51.service.ts` - Structure extraction, KPI propagation
- `src/modules/templates/controllers/templates.controller.ts` - Instantiate endpoint

### Commit 5: Seed and Proof Scripts, Plus Documentation
**Files:**
- `src/scripts/dev-seed.ts` - Repository-based seeding
- `scripts/capture-template-proofs.sh` - Proof capture script
- `FINAL_PROOF_BUNDLE_COMPLETE.md` - Proof documentation
- `SCHEMA_DRIFT_ANALYSIS.md` - Schema verification

## Release Readiness Checks

### 1. Happy Path Smoke Flow ✅
- ✅ Seed creates users, org, workspace
- ✅ Create WORKSPACE template with structure (proof 02)
- ✅ Publish template (proof 07)
- ✅ Instantiate into project (proof 09)
- ✅ Project created with phaseCount: 1, taskCount: 1
- ✅ KPI propagation: activeKpiIds = ["schedule_variance"]

### 2. Negative Paths ✅
- ✅ Member tries create template → 403 (proof 03)
- ✅ List without header → WORKSPACE templates excluded (proof 04)
- ✅ Legacy route → 410 Gone (proof 10)

### 3. Regression Check ✅
- ✅ Existing project creation flows not using templates (not modified)
- ✅ Template list UI compatibility (new fields optional)
- ✅ No raw SQL in seed (uses repositories)

## Next Steps for MVP Value

### 1. Template UI Wiring
- Add structure editor (phases, tasks)
- Add defaultEnabledKPIs picker
- Add publish button
- Add version display

### 2. Project Creation Wizard
- Select template
- Select workspace
- Create project
- Land on overview with phases/tasks

### 3. Dashboard and KPI Columns Alignment
- Active KPIs become columns
- Store KPI values at project level (ProjectKpiValue table)
- UI shows active KPIs as columns/inputs
