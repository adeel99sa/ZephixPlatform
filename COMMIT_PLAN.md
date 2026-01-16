# Commit Plan - Template System Implementation

## Commit 1: DTO and Entity Mapping Fixes

**Files:**
- `zephix-backend/src/modules/templates/entities/template.entity.ts`
  - Fixed column mappings: `created_at`, `updated_at`, `is_active`, `is_system`
- `zephix-backend/src/modules/templates/dto/template.dto.ts`
  - Added `structure` to `CreateTemplateDto`
  - Added `structure`, `methodology`, `defaultEnabledKPIs` to `UpdateTemplateDto`

**Message:**
```
fix(templates): align entity column mappings and extend DTOs

- Fix Template entity column name mappings (created_at, updated_at, is_active, is_system)
- Add structure field to CreateTemplateDto and UpdateTemplateDto
- Add defaultEnabledKPIs to UpdateTemplateDto
- Add methodology to UpdateTemplateDto
```

## Commit 2: Template Create, List, Scope Rules

**Files:**
- `zephix-backend/src/modules/templates/services/templates.service.ts`
  - Added `createV1` with scope validation
  - Added `listV1` with workspace filtering
  - Added `validateTemplateScope` helper
- `zephix-backend/src/modules/templates/controllers/templates.controller.ts`
  - Updated create endpoint with RBAC and scope enforcement
  - Updated list endpoint with workspace header validation
- `zephix-backend/src/migrations/1790000000000-AddTemplateScopeAndWorkspaceId.ts`
  - Added template_scope, workspace_id, default_enabled_kpis columns

**Message:**
```
feat(templates): add scope-based template management

- Add templateScope (SYSTEM, ORG, WORKSPACE) to Template entity
- Add workspaceId for WORKSPACE-scoped templates
- Add defaultEnabledKPIs array to templates
- Enforce RBAC: Admin for ORG, Workspace Owner for WORKSPACE
- Filter list by workspace header presence
- Migration: Add template_scope, workspace_id, default_enabled_kpis columns
```

## Commit 3: Publish Atomic Update and Legacy Route 410

**Files:**
- `zephix-backend/src/modules/templates/services/templates.service.ts`
  - Added `publishV1` with atomic version increment
- `zephix-backend/src/modules/templates/controllers/templates.controller.ts`
  - Updated publish endpoint with RBAC
  - Legacy instantiate route returns 410 Gone

**Message:**
```
feat(templates): atomic publish and deprecate legacy route

- Add publishV1 with atomic SQL version increment
- Legacy /instantiate route returns 410 Gone
- Enforce RBAC for publish (Admin for ORG, Workspace Owner for WORKSPACE)
```

## Commit 4: Instantiate Structured Template and KPI Propagation

**Files:**
- `zephix-backend/src/modules/templates/services/templates-instantiate-v51.service.ts`
  - Updated to use Template entity (not ProjectTemplate)
  - Extract structure from template.structure JSON
  - Propagate defaultEnabledKPIs to project.activeKpiIds
  - Set templateId, templateVersion, templateSnapshot
- `zephix-backend/src/modules/templates/controllers/templates.controller.ts`
  - Updated instantiate-v5_1 endpoint with workspace validation

**Message:**
```
feat(templates): structured instantiation with KPI propagation

- Use Template entity for instantiation (replaces ProjectTemplate)
- Extract structure from template.structure JSON (phases and tasks)
- Propagate template.defaultEnabledKPIs to project.activeKpiIds
- Set project.templateId, templateVersion, templateSnapshot
- Require x-workspace-id header for instantiation
- Validate template has at least one phase
```

## Commit 5: Seed and Proof Scripts, Plus Documentation

**Files:**
- `zephix-backend/src/scripts/dev-seed.ts`
  - Replace raw SQL with repository methods
  - Use workspaceRepository.save() and workspaceMemberRepository.save()
- `zephix-backend/scripts/capture-template-proofs.sh`
  - Add structured template creation
  - Add defaultEnabledKPIs to template
  - Add structure patching step
- `FINAL_PROOF_BUNDLE_COMPLETE.md`
  - Complete proof documentation
- `SCHEMA_DRIFT_ANALYSIS.md`
  - Schema verification results
- `MERGE_GATE_CHECKLIST.md`
  - Merge gate verification

**Message:**
```
chore(templates): add proof scripts and documentation

- Update dev-seed to use repositories (remove raw SQL)
- Add structured template creation to proof script
- Add KPI propagation verification
- Document complete proof bundle
- Verify schema alignment (Workspace, WorkspaceMember)
```

## Security Review Points

### Tenancy Enforcement ✅
- All template operations scoped by organizationId
- WORKSPACE templates additionally scoped by workspaceId
- List endpoint filters by workspace header presence

### RBAC Enforcement ✅
- ORG template creation: Admin only
- WORKSPACE template creation: Workspace Owner or Admin
- Template publish: Same rules as create
- Template update: Same rules as create

### Input Validation ✅
- Workspace ID validated as UUID
- Template scope validated (SYSTEM, ORG, WORKSPACE)
- Structure validation (at least one phase required for instantiation)
- DTO validation decorators on all fields

### Data Integrity ✅
- Atomic version increment on publish
- Template scope constraints enforced
- Workspace ID null for ORG templates
- Workspace ID required for WORKSPACE templates
