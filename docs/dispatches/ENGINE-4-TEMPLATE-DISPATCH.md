# Engine 4: Template Architecture Dispatch

**Status:** Ready for operator review. Locked architecturally 2026-05-03.
**Author:** Solution Architect (Claude)
**Depends on:** AD-024 (attributes), AD-026 (complexity_mode, met), AD-029 (unification), AD-030 (module activation)
**Produced by:** 8-area code recon against actual source files, not summaries.

---

## Executive Summary

Engine 4 unifies Zephix's two template systems into one, then wires that unified system to the module registry (AD-030) and attribute library (AD-024). The result: when an admin applies a template, the workspace automatically gains the capabilities and data fields that template requires.

**Scope:** 7 phases, ~25-30 days backend work, 7-8 PRs.

**Critical path dependency:** AD-024 schema rebuild must complete before Phases D-E can execute. Phases A-C can proceed immediately.

---

## Current State (Recon Findings)

### Two template systems exist

**System 1: Legacy `templates` table**
- Entity: `Template` — 209 lines, 40+ columns
- 15 SYSTEM_TEMPLATE_DEFS (11 active via `ACTIVE_TEMPLATE_CODES`)
- Instantiation: `POST /templates/:id/instantiate-v5_1` → `TemplatesInstantiateV51Service`
- Creates: Project + WorkPhase + WorkTask rows directly
- Rich metadata: phases, taskTemplates, riskPresets, defaultTabs, defaultGovernanceFlags, columnConfig, workTypeTags, deliveryMethod, methodology
- Module: `TemplateModule` (6 services, 5 controllers)
- Seed: `seed-system-templates.ts` (Wave 7) writes to `templates` table
- **Always available** — no feature flag

**System 2: Template Center `template_definitions` table**
- Entity: `TemplateDefinition` — 56 lines, 12 columns (lean by design)
- Versioned: `TemplateVersion` with JSONB `schema` field containing kpis, documents, phases, gates, tasks, policies
- Components: `TemplateComponent` (phase | gate | task | kpi | doc)
- Policies: `TemplatePolicy` (required_kpi | required_document | gate_rule)
- Apply: `POST /template-center/projects/:projectId/apply` → `TemplateApplyService`
- Creates: ProjectKpi + DocumentInstance rows (via KPI/doc library), TemplateLineage
- **Feature-flagged:** `TEMPLATE_CENTER_V1=true` required
- Module: `TemplateCenterModule` (10 services, 9 controllers)
- Seed: `seed-prebuilt-templates.ts` writes to `template_definitions` + `template_versions`

### Zero capability/attribute integration

- Neither system references workspace modules or attributes
- No template declares `requiredModuleKeys` or `enabledAttributeKeys`
- Template application does not cascade to module enablement or attribute enablement
- `@RequireWorkspaceModule` decorator: never applied to any template endpoint

### defaultMethodology: free-text string

- Workspace entity: `defaultMethodology?: string | null` (nullable text column)
- Validation: `@IsIn(['waterfall', 'agile', 'scrum', 'kanban', 'hybrid'])`
- Frontend defaults: CreateWorkspaceModal → `'agile'`, GeneralTab → `'waterfall'`
- Controller read: defaults to `'waterfall'` when null
- **Not linked to any template entity** — purely a display hint

### Dead code: methodologyConstraints

- `projects.service.ts` line 106-107: `@Optional() private readonly methodologyConstraints?: any`
- Always undefined (no matching provider exists)
- `assertChangeRequestForScopeUpdate()` (lines 131-161): early returns on line 135, enforcement code never executes
- SCOPE_FIELDS: startDate, endDate, estimatedEndDate, budget, actualCost

### Template Center entity model (exact shapes)

**TemplateDefinition:** id, scope (system|org|workspace), orgId, workspaceId, templateKey, name, description, category, isPrebuilt, isAdminDefault, createdBy, createdAt, updatedAt

**TemplateVersion:** id, templateDefinitionId, version (int), status (draft|published|deprecated), changelog, publishedAt, publishedBy, schema (JSONB), hash, createdAt. Relations: policies[], components[]

**TemplateVersion.schema shape** (from TemplateApplyService line 151-165):
```typescript
{
  templateKey?: string;
  name?: string;
  version?: number;
  kpis?: Array<{ kpi_key: string; required?: boolean }>;
  documents?: Array<{ doc_key: string; required?: boolean; blocks_gate_key?: string }>;
  phases?: any[];
  gates?: any[];
  tasks?: any[];
  policies?: any[];
}
```

**TemplateComponent:** id, templateVersionId, componentType (phase|gate|task|kpi|doc), componentKey, name, sortOrder, data (JSONB)

**TemplatePolicy:** id, templateVersionId, policyKey, policyType (required_kpi|required_document|gate_rule), policy (JSONB)

**TemplateLineage:** projectId (unique), templateDefinitionId, templateVersionId, appliedAt, appliedBy, upgradeState (none|eligible|pending|applied|blocked), upgradeNotes

### Legacy Template entity (key fields for unification)

Fields that exist in legacy `Template` but NOT in Template Center `TemplateDefinition`:
- `templateCode` (stable identifier — maps to `templateKey`)
- `methodology` (agile|waterfall|kanban|hybrid|scrum)
- `deliveryMethod`
- `phases` (JSONB array with descriptions, durations)
- `taskTemplates` (JSONB array with estimates, statuses)
- `riskPresets` (JSONB array)
- `defaultTabs` (string array)
- `defaultGovernanceFlags` (JSONB)
- `columnConfig` (JSONB)
- `workTypeTags` (string array)
- `metadata` (JSONB: purpose, bestFor, defaultColumns, requiredArtifacts, governanceOptions, includedViews)
- `defaultEnabledKPIs` (string array)
- `complexityBucket`, `durationMinDays`, `durationMaxDays`, `setupTimeBucket`
- `kind` (project|board|mixed)
- `isActive`, `isPublished`, `isSystem`, `isDefault`, `lockState`

These fields must be preserved in unification — they carry operational data that drives the instantiation flow.

---

## Target State

### One canonical template system

Template Center (`template_definitions` + `template_versions` + components + policies) becomes the single source of truth. Legacy `templates` table data migrates into Template Center schema. Legacy instantiation path (`instantiate-v5_1`) delegates to unified apply service.

### Templates declare capabilities

Each template version's schema gains module and attribute declarations:

```typescript
// Extended TemplateVersion.schema
{
  // Existing fields preserved
  kpis: [...],
  documents: [...],
  phases: [...],
  gates: [...],
  tasks: [...],
  policies: [...],

  // New: Module declarations (AD-030 integration)
  requiredModuleKeys: ['risk_sentinel', 'document_processing'],
  recommendedModuleKeys: ['resource_intelligence'],

  // New: Attribute declarations (AD-024 integration)
  enabledAttributeKeys: [
    'platform.risk.probability',
    'platform.risk.impact',
    'platform.risk.score',
    'platform.risk.level',
    'platform.risk.response_strategy',
    'platform.risk.owner',
    'platform.risk.status'
  ],

  // New: Methodology metadata (from legacy)
  methodology: 'waterfall',
  complexityBucket: 'standard',
  columnConfig: {...},
  defaultTabs: ['table', 'board', 'timeline'],
  defaultGovernanceFlags: {...}
}
```

### Apply cascades to module + attribute enablement

When `TemplateApplyService.apply()` runs:

1. Validate required modules available in workspace's complexity_mode
2. Auto-enable required modules via `WorkspaceModuleService.enableModuleWithCascade(source='template_application')`
3. Module cascade auto-enables exposed attributes (AD-030 → AD-024 cascade)
4. Any additional `enabledAttributeKeys` not covered by modules are directly enabled
5. Create KPIs, documents, phases, tasks as before
6. Record lineage with module/attribute enablement metadata

### Template Center always-on

`isTemplateCenterEnabled()` feature flag removed. Template Center endpoints always available. Legacy feature flag `TEMPLATE_CENTER_V1` env var becomes no-op (backward compatible — existing deploys don't break).

### defaultMethodology evolves to defaultTemplateKey

Workspace `defaultMethodology` (free-text string) evolves to `defaultTemplateKey` (FK reference to `template_definitions.template_key`). Existing methodology values map:

| Current defaultMethodology | Maps to templateKey |
|---|---|
| `'waterfall'` | `'pm_waterfall_v2'` |
| `'agile'` | `'pm_agile_v1'` |
| `'scrum'` | `'sw_scrum_delivery_v1'` |
| `'kanban'` | `'sw_kanban_delivery_v1'` |
| `'hybrid'` | `'pm_hybrid_v1'` |

Migration: ADD `default_template_key` column, backfill from mapping, deprecate `default_methodology` (keep column, stop writing). Frontend updated to use template picker instead of methodology dropdown.

---

## Phase Breakdown

### Phase A: Legacy → Template Center Data Migration (~5 days)

**Goal:** All 15 SYSTEM_TEMPLATE_DEFS exist as `template_definitions` + `template_versions` rows with full schema content. Dual-write period begins.

**Schema changes:** None to existing tables. New seed migration only.

**Work items:**

1. **Migration script: `templates` → `template_definitions` + `template_versions`**
   - For each of the 15 SYSTEM_TEMPLATE_DEFS:
     - Create `template_definitions` row: scope='system', templateKey=templateCode, name, description, category, isPrebuilt=true
     - Create `template_versions` row: version=1, status='published', schema=full content migrated from legacy fields
   - Schema JSONB carries: kpis, documents, phases, gates, tasks, policies + methodology metadata (phases, taskTemplates, riskPresets, defaultTabs, defaultGovernanceFlags, columnConfig, workTypeTags, metadata)
   - Idempotent: skip if templateKey already exists in template_definitions

2. **Template-to-template key mapping table** (in-memory const, not DB table)
   - Maps legacy `template.id` → Template Center `templateDefinition.id` + `templateVersion.id`
   - Used by dual-write layer during transition

3. **Extend `seed-system-templates.ts` to dual-write**
   - Existing: writes to `templates` table
   - New: also writes to `template_definitions` + `template_versions`
   - Both paths produce identical content; Template Center schema is superset
   - Flag: `TEMPLATE_CENTER_DUAL_WRITE=true` (off by default initially)

4. **KPI pack migration**
   - Existing KPI packs in `template_kpis` table → `template_versions.schema.kpis[]` entries
   - Map: `kpiDefinition.kpiKey` → `{ kpi_key, required }` in schema

5. **Verification**
   - Query: `SELECT COUNT(*) FROM template_definitions WHERE scope = 'system'` = 15
   - Query: all 14 have published version with non-empty schema
   - Spot-check: pm_waterfall_v2 schema contains phases, tasks, kpis, governance flags

**PR A deliverable:** All system templates exist in both tables. Template Center has full operational data.

---

### Phase B: Unified Apply Service (~5-6 days)

**Goal:** `TemplateApplyService` becomes the single entry point for template application. Legacy `instantiate-v5_1` delegates to it.

**Schema changes:**

```sql
-- Extend template_lineage with methodology metadata
ALTER TABLE template_lineage
  ADD COLUMN methodology VARCHAR(50),
  ADD COLUMN governance_snapshot JSONB;
```

**Work items:**

1. **Extend TemplateApplyService.doApply() to handle full instantiation**
   - Current: creates ProjectKpi + DocumentInstance only
   - Extended: also creates WorkPhase + WorkTask rows (from schema.phases + schema.tasks)
   - Also: sets project metadata (templateId, templateVersion, activeKpiIds, governanceFlags)
   - Also: creates risk presets from schema
   - Mode selection: `options.mode = 'full'` triggers full instantiation; `'create_missing_only'` preserves existing KPI/doc-only behavior

2. **Legacy instantiation delegation**
   - `TemplatesInstantiateV51Service.instantiateV51()` refactored to:
     a. Resolve legacy template ID → Template Center templateKey
     b. Call `TemplateApplyService.apply()` with `mode: 'full'`
     c. Return same response shape (backward compatible)
   - `POST /templates/:id/instantiate-v5_1` route preserved (backward compatible)
   - New canonical route: `POST /template-center/projects/:projectId/apply` with `mode: 'full'`

3. **Remove feature flag**
   - `isTemplateCenterEnabled()` → always returns true
   - `TEMPLATE_CENTER_V1` env var becomes no-op
   - All Template Center endpoints always available
   - Guard checks in controller methods removed

4. **Lineage enrichment**
   - `TemplateLineage` gains methodology + governance_snapshot
   - Applied on every template application
   - Enables future: "what methodology was this project born from?"

5. **Verification**
   - Legacy endpoint `POST /templates/:id/instantiate-v5_1` produces identical project structure as before
   - Template Center endpoint `POST /template-center/projects/:projectId/apply` with `mode: 'full'` produces same structure
   - Lineage record created with full metadata
   - Existing Template Center consumers (KPI/doc-only mode) still work

**PR B deliverable:** One apply path, backward compatible, feature flag removed.

---

### Phase C: defaultMethodology → defaultTemplateKey (~3 days)

**Goal:** Workspace default methodology becomes a typed reference to a template.

**Schema changes:**

```sql
ALTER TABLE workspaces
  ADD COLUMN default_template_key VARCHAR(200);

-- Backfill from existing defaultMethodology
UPDATE workspaces SET default_template_key = CASE
  WHEN default_methodology = 'waterfall' THEN 'pm_waterfall_v2'
  WHEN default_methodology = 'agile' THEN 'pm_agile_v1'
  WHEN default_methodology = 'scrum' THEN 'sw_scrum_delivery_v1'
  WHEN default_methodology = 'kanban' THEN 'sw_kanban_delivery_v1'
  WHEN default_methodology = 'hybrid' THEN 'pm_hybrid_v1'
  ELSE 'pm_waterfall_v2'
END
WHERE default_template_key IS NULL;
```

**Work items:**

1. **Migration: add `default_template_key` column**
   - Nullable initially, backfill from mapping
   - `default_methodology` column preserved (no deletion) — read from `default_template_key`, write to both during transition

2. **Workspace entity update**
   - Add `defaultTemplateKey: string | null` field
   - Deprecate `defaultMethodology` (mark with `@deprecated` JSDoc, keep functional)

3. **DTO updates**
   - `CreateWorkspaceDto`: add `defaultTemplateKey?: string`, validate against known template keys
   - `UpdateWorkspaceDto`: same
   - `UpdateWorkspaceDto.defaultMethodology`: preserved for backward compatibility, maps to templateKey on write

4. **Controller response**
   - `GET /workspaces/:id` response: add `defaultTemplateKey` field
   - Keep `defaultMethodology` in response (derived from templateKey → methodology mapping)

5. **Frontend updates**
   - `CreateWorkspaceModal`: methodology dropdown → template picker (shows template names grouped by category)
   - `GeneralTab`: methodology dropdown → template picker
   - Both components: write `defaultTemplateKey`, display template name

6. **Verification**
   - Existing workspaces: `default_template_key` backfilled correctly
   - New workspace creation with template picker works
   - Old API consumers sending `defaultMethodology` still work (maps to templateKey)

**PR C deliverable:** Workspace default methodology is template-backed. Backward compatible.

---

### Phase D: Module Integration (~4-5 days)

**Requires:** AD-030 implementation complete (module_definitions table, enableModuleWithCascade service method).

**Goal:** Templates declare required/recommended modules. Apply cascades to module enablement.

**Schema changes:** None — module declarations live in `template_versions.schema` JSONB (already extensible).

**Work items:**

1. **Seed: add module declarations to all 15 system template schemas**

   Per AD-024 Tier 2 inventory enablement matrix:

   | Template | requiredModuleKeys | recommendedModuleKeys |
   |---|---|---|
   | pm_waterfall_v2 | risk_sentinel, document_processing | resource_intelligence |
   | pm_agile_v1 | risk_sentinel | resource_intelligence |
   | pm_hybrid_v1 | risk_sentinel, document_processing | resource_intelligence |
   | sw_scrum_delivery_v1 | risk_sentinel | — |
   | sw_kanban_delivery_v1 | — | risk_sentinel |
   | sw_release_planning_v1 | risk_sentinel | document_processing |
   | roadmap_execution_v1 | — | risk_sentinel |
   | product_discovery_v1 | — | — |
   | product_launch_v1 | — | risk_sentinel |
   | startup_mvp_build_v1 | — | — |
   | startup_gtm_v1 | — | — |
   | pm_risk_register_v1 | risk_sentinel | — |
   | ops_service_improvement_v1 | — | resource_intelligence |
   | ops_readiness_v1 | risk_sentinel, document_processing | resource_intelligence |

2. **TemplateApplyService: module validation + cascade**
   - Before creating project structure:
     a. Read `schema.requiredModuleKeys`
     b. For each required module: check `WorkspaceModuleService.isModuleEnabled()`
     c. If not enabled but available in workspace's complexity_mode: call `enableModuleWithCascade(source='template_application')`
     d. If not enabled and NOT available: throw `ForbiddenException('Template requires {module} capability, not available in this workspace tier')`
   - Recommended modules: return in ApplyResult as `recommendedModules: string[]` for UI prompt — do NOT auto-enable

3. **TemplateApplyService injection update**
   - Add `@Optional() WorkspaceModuleService` injection
   - `@Optional()` because AD-030 implementation may not be deployed yet when Phase D PR merges — graceful degradation: skip module validation if service unavailable

4. **ApplyResult extension**
   ```typescript
   export interface ApplyResult {
     // ... existing fields
     enabledModules: string[];           // modules auto-enabled by this apply
     recommendedModules: string[];       // modules recommended but not auto-enabled
     moduleValidationSkipped: boolean;   // true if WorkspaceModuleService unavailable
   }
   ```

5. **Verification**
   - Apply pm_waterfall_v2 to workspace with risk_sentinel disabled → risk_sentinel auto-enabled
   - Apply pm_waterfall_v2 to simple workspace (risk_sentinel not available) → ForbiddenException
   - Apply product_discovery_v1 (no required modules) → succeeds regardless of workspace tier
   - WorkspaceModuleService unavailable → apply succeeds with moduleValidationSkipped=true

**PR D deliverable:** Templates cascade to module enablement on apply.

---

### Phase E: Attribute Integration (~4-5 days)

**Requires:** AD-024 schema rebuild complete (attribute_definitions table, workspace_attribute_enablement table).

**Goal:** Templates declare Tier 2 attributes to enable. Apply cascades to attribute enablement.

**Work items:**

1. **Seed: add attribute declarations to all 15 system template schemas**

   Per AD-024 Tier 2 inventory enablement matrix:

   | Template | enabledAttributeKeys (categories) |
   |---|---|
   | pm_waterfall_v2 | Schedule (all 8), Estimation (PERT 4 + confidence), Cost & EVM (all 15), Quality (all 5), Risk (all 17), Stakeholder (all 9), Governance (all 8) |
   | pm_agile_v1 | Estimation (story_size_tshirt, ideal_days), Quality (acceptance_criteria_status, definition_of_done_compliance), Agile (all 8), Risk (basic 4) |
   | pm_hybrid_v1 | Schedule (subset 5), Estimation (both PERT + story), Cost (basic 5), Quality (all 5), Agile (subset 4), Risk (all 17), Stakeholder (all 9), Governance (basic 3) |
   | sw_scrum_delivery_v1 | Estimation (story_size_tshirt, ideal_days), Quality (acceptance_criteria_status, definition_of_done_compliance), Agile (all 8), Risk (basic 4) |
   | sw_kanban_delivery_v1 | Estimation (story_size_tshirt), Quality (basic 2), Agile (subset 4), Risk (basic 4) |

   Full mapping: encode the complete enablement matrix from AD-024 Tier 2 inventory §"Default template enablement matrix" as `enabledAttributeKeys: string[]` arrays in each template version schema. Use exact `platform.{category}.{name}` keys.

2. **TemplateApplyService: attribute enablement cascade**
   - After module enablement cascade (Phase D):
     a. Read `schema.enabledAttributeKeys`
     b. Filter: remove any already enabled via module cascade (AD-030 `exposed_attribute_keys`)
     c. Remaining: directly enable in `workspace_attribute_enablement` table
     d. Source attribution: `template_application`
   - No attribute data created — only visibility enablement. Attribute values are user-entered later.

3. **ApplyResult extension**
   ```typescript
   export interface ApplyResult {
     // ... existing fields from Phase D
     enabledAttributes: number;           // count of attributes enabled by this apply
     attributeEnablementSkipped: boolean; // true if AD-024 schema not live
   }
   ```

4. **Verification**
   - Apply pm_waterfall_v2 → workspace gains all 67 waterfall-appropriate attributes visible
   - Apply sw_scrum_delivery_v1 → workspace gains ~22 agile-appropriate attributes visible
   - Re-apply same template → idempotent, no duplicate enablement rows
   - Attribute data from previous template preserved (no deletion on re-apply)

**PR E deliverable:** Templates cascade to attribute enablement on apply.

---

### Phase F: Dead Code Removal (~2 days)

**Goal:** Remove methodologyConstraints dead code, wire to live module check.

**Work items:**

1. **Remove `methodologyConstraints` from projects.service.ts**
   - Line 106-107: remove `@Optional() private readonly methodologyConstraints?: any`
   - Lines 131-161: rewrite `assertChangeRequestForScopeUpdate()`:

   ```typescript
   private async assertChangeRequestForScopeUpdate(
     dto: UpdateProjectDto,
     project: Project,
   ): Promise<void> {
     const touchesScope = Object.keys(dto).some((k) =>
       ProjectsService.SCOPE_FIELDS.has(k),
     );
     if (!touchesScope) return;

     // Live check via module registry (AD-030)
     const cmEnabled = await this.workspaceModuleService.isModuleEnabled(
       project.workspaceId,
       'change_management',
     );
     if (!cmEnabled) return;

     const crId = (dto as any).changeRequestId as string | undefined;
     let crStatus: string | undefined;

     if (crId && this.changeRequestRepo) {
       const cr = await this.changeRequestRepo.findOne({
         where: { id: crId },
         select: ['id', 'status'],
       });
       crStatus = cr?.status;
     }

     if (!crId) {
       throw new ForbiddenException(
         'Change request required for scope field updates when change management is enabled',
       );
     }
     if (crStatus && crStatus !== 'approved') {
       throw new ForbiddenException(
         `Change request must be approved (current status: ${crStatus})`,
       );
     }
   }
   ```

2. **Add `change_management` module to seed**
   - 6th module in `module_definitions` table
   - Tier: tier_2_standard
   - Category: governance
   - Available in: standard, advanced
   - Default enabled in: none (explicit enablement via template)

3. **Inject WorkspaceModuleService into ProjectsService**
   - `@Optional()` injection (graceful degradation if module service unavailable)
   - If unavailable: early return (same behavior as current dead code, but documented)

4. **Verification**
   - Workspace with change_management module enabled: scope field update without CR → ForbiddenException
   - Workspace with change_management module enabled: scope field update with approved CR → succeeds
   - Workspace with change_management module disabled: scope field update without CR → succeeds
   - WorkspaceModuleService unavailable: scope field update → succeeds (graceful degradation)

**PR F deliverable:** Dead code gone, live enforcement in place.

---

### Phase G: Legacy Deprecation + Cleanup (~3-4 days)

**Goal:** Legacy template path marked deprecated. Dual-write removed. Documentation updated.

**Work items:**

1. **Deprecate legacy instantiation**
   - `POST /templates/:id/instantiate-v5_1` response: add `X-Deprecated: Use POST /template-center/projects/:projectId/apply` header
   - Endpoint continues working (delegates to unified apply)
   - JSDoc `@deprecated` on `TemplatesInstantiateV51Service`

2. **Remove dual-write from seed script**
   - `seed-system-templates.ts`: write to Template Center tables only
   - Legacy `templates` table rows preserved (read-only archive) but no longer written
   - `TEMPLATE_CENTER_DUAL_WRITE` flag removed

3. **Frontend: migrate all template references to Template Center API**
   - Template picker: reads from `GET /template-center/templates` (already exists)
   - Template instantiation: calls `POST /template-center/projects/:projectId/apply`
   - Legacy API calls removed from frontend

4. **Documentation**
   - CLAUDE.md: update canonical template instantiation path
   - AD_INDEX: add Engine 4 dispatch reference
   - Memory: update template-related entries

5. **Verification**
   - Full regression: all 11 active templates instantiate correctly via new path
   - Legacy endpoint still works (backward compat)
   - Frontend uses new API exclusively
   - No writes to legacy `templates` table after this phase

**PR G deliverable:** Legacy path deprecated, Template Center is sole active path.

---

## Integration Contract Summary

### With AD-024 (Attributes)

| Integration Point | Direction | Mechanism |
|---|---|---|
| Template declares attributes | Template → AD-024 | `schema.enabledAttributeKeys: string[]` referencing `platform.{category}.{name}` keys |
| Apply enables attributes | Apply → AD-024 | Direct INSERT into `workspace_attribute_enablement` with source='template_application' |
| Module cascade covers some | AD-030 → AD-024 | Module's `exposed_attribute_keys` auto-enable on module enable; template adds extras |

### With AD-029 (Unification)

| Integration Point | Direction | Mechanism |
|---|---|---|
| Legacy → Template Center migration | Phase A | Seed migration script writes SYSTEM_TEMPLATE_DEFS into template_definitions + template_versions |
| Unified apply | Phase B | TemplateApplyService handles full instantiation; legacy delegates |
| Single seed path | Phase G | seed-system-templates.ts writes Template Center only |

### With AD-030 (Module Activation)

| Integration Point | Direction | Mechanism |
|---|---|---|
| Template declares modules | Template → AD-030 | `schema.requiredModuleKeys: string[]` + `schema.recommendedModuleKeys: string[]` |
| Apply enables modules | Apply → AD-030 | `WorkspaceModuleService.enableModuleWithCascade(source='template_application')` |
| Module availability check | AD-030 → Apply | Validates required modules available in workspace's complexity_mode before proceeding |
| Change management activation | Phase F | `change_management` module added to seed; dead code becomes live enforcement |

### With AD-026 (Complexity Mode)

| Integration Point | Direction | Mechanism |
|---|---|---|
| Template complexity_bucket | Template → Workspace | Template schema carries `complexityBucket` hint; used by recommendation engine |
| Module availability gating | Workspace → Apply | `complexity_mode` determines which modules are available; required modules must be available |

---

## Seed Data: Module + Attribute Declarations

### Example: pm_waterfall_v2 complete schema

```json
{
  "templateKey": "pm_waterfall_v2",
  "name": "Waterfall Project (PMI-aligned)",
  "version": 1,
  "methodology": "waterfall",
  "complexityBucket": "standard",

  "requiredModuleKeys": ["risk_sentinel", "document_processing"],
  "recommendedModuleKeys": ["resource_intelligence"],

  "enabledAttributeKeys": [
    "platform.schedule.predecessors",
    "platform.schedule.successors",
    "platform.schedule.relationship_type",
    "platform.schedule.lead_lag",
    "platform.schedule.constraint_type",
    "platform.schedule.float_slack",
    "platform.schedule.is_critical_path",
    "platform.schedule.assumption",
    "platform.estimation.optimistic",
    "platform.estimation.most_likely",
    "platform.estimation.pessimistic",
    "platform.estimation.pert_estimate",
    "platform.estimation.confidence_level",
    "platform.risk.category",
    "platform.risk.root_cause",
    "platform.risk.trigger",
    "platform.risk.probability",
    "platform.risk.impact",
    "platform.risk.score",
    "platform.risk.level",
    "platform.risk.response_strategy",
    "platform.risk.mitigation_plan",
    "platform.risk.contingency_plan",
    "platform.risk.fallback_plan",
    "platform.risk.owner",
    "platform.risk.status",
    "platform.risk.proximity",
    "platform.risk.residual_risk",
    "platform.risk.secondary_risk",
    "platform.risk.expected_monetary_value",
    "platform.cost.budget_at_completion",
    "platform.cost.planned_value",
    "platform.cost.earned_value",
    "platform.cost.actual_cost",
    "platform.cost.cost_variance",
    "platform.cost.schedule_variance",
    "platform.cost.cost_performance_index",
    "platform.cost.schedule_performance_index",
    "platform.cost.estimate_at_completion",
    "platform.cost.estimate_to_complete",
    "platform.cost.variance_at_completion",
    "platform.cost.cost_rate",
    "platform.cost.is_billable",
    "platform.cost.cost_center",
    "platform.cost.currency",
    "platform.quality.acceptance_criteria_status",
    "platform.quality.definition_of_done_compliance",
    "platform.quality.test_results_reference",
    "platform.quality.quality_metric",
    "platform.quality.defect_count",
    "platform.stakeholder.influence",
    "platform.stakeholder.interest",
    "platform.stakeholder.power",
    "platform.stakeholder.matrix_quadrant",
    "platform.stakeholder.attitude",
    "platform.stakeholder.engagement_level",
    "platform.stakeholder.engagement_target",
    "platform.stakeholder.communication_frequency",
    "platform.stakeholder.raci_role",
    "platform.governance.phase_gate_approver_chain",
    "platform.governance.required_documents",
    "platform.governance.approval_status",
    "platform.governance.compliance_tags",
    "platform.governance.data_classification",
    "platform.governance.audit_trail_reference",
    "platform.governance.change_management_ticket",
    "platform.governance.retention_period"
  ],

  "kpis": [
    { "kpi_key": "earned_value", "required": true },
    { "kpi_key": "schedule_variance", "required": true },
    { "kpi_key": "cost_variance", "required": true },
    { "kpi_key": "cpi", "required": true },
    { "kpi_key": "spi", "required": true }
  ],

  "documents": [
    { "doc_key": "project_charter", "required": true },
    { "doc_key": "project_plan", "required": true, "blocks_gate_key": "planning_gate" },
    { "doc_key": "project_schedule", "required": true },
    { "doc_key": "risk_register", "required": true },
    { "doc_key": "status_report", "required": false },
    { "doc_key": "change_request", "required": false },
    { "doc_key": "lessons_learned", "required": false },
    { "doc_key": "closure_report", "required": true, "blocks_gate_key": "closure_gate" }
  ],

  "phases": ["...existing phase data from SYSTEM_TEMPLATE_DEFS..."],
  "tasks": ["...existing task data from SYSTEM_TEMPLATE_DEFS..."],
  "gates": [],
  "policies": [],

  "defaultTabs": ["table", "board", "timeline", "risks", "documents"],
  "defaultGovernanceFlags": {
    "requireChangeRequest": true,
    "requirePhaseGateApproval": true,
    "autoCreateRiskRegister": true
  },
  "columnConfig": { "...existing column config..." }
}
```

### Example: sw_scrum_delivery_v1 complete schema

```json
{
  "templateKey": "sw_scrum_delivery_v1",
  "name": "Scrum Delivery",
  "version": 1,
  "methodology": "agile",
  "complexityBucket": "simple",

  "requiredModuleKeys": ["risk_sentinel"],
  "recommendedModuleKeys": [],

  "enabledAttributeKeys": [
    "platform.estimation.story_size_tshirt",
    "platform.estimation.ideal_days",
    "platform.quality.acceptance_criteria_status",
    "platform.quality.definition_of_done_compliance",
    "platform.agile.story_type",
    "platform.agile.epic_reference",
    "platform.agile.backlog_rank",
    "platform.agile.sprint_goal_contribution",
    "platform.agile.is_knowledge_acquisition",
    "platform.agile.invest_score",
    "platform.agile.business_value",
    "platform.agile.theme_reference",
    "platform.risk.category",
    "platform.risk.probability",
    "platform.risk.impact",
    "platform.risk.score"
  ],

  "kpis": [
    { "kpi_key": "velocity", "required": true },
    { "kpi_key": "burndown", "required": true },
    { "kpi_key": "cycle_time", "required": false },
    { "kpi_key": "defect_rate", "required": false }
  ],

  "documents": [],
  "phases": ["..."],
  "tasks": ["..."],
  "gates": [],
  "policies": [],

  "defaultTabs": ["board", "backlog", "sprints"],
  "defaultGovernanceFlags": {
    "requireChangeRequest": false,
    "requirePhaseGateApproval": false
  }
}
```

---

## Hard Constraints

### CONSTRAINT 1: AD-024 schema must be live before Phases D-E

Module cascade to attributes requires `workspace_attribute_enablement` table. Attribute enablement requires `attribute_definitions` table. HALT Phases D-E if AD-024 not deployed.

### CONSTRAINT 2: Legacy endpoint backward compatibility

`POST /templates/:id/instantiate-v5_1` must continue working with identical response shape throughout all phases. No breaking change to existing consumers.

### CONSTRAINT 3: Existing project data preservation

Template unification must NOT touch existing projects, work phases, work tasks, or project KPIs. Migration is template metadata only. Projects keep their existing lineage.

### CONSTRAINT 4: One phase per PR

Each phase (A through G) is a separate PR. No cross-phase bundling. Exception: Phases D+E may be combined if AD-024 and AD-030 implementations land simultaneously.

### CONSTRAINT 5: Seed idempotency

All seed operations must be idempotent. Running `seed-system-templates.ts` twice produces identical results. No duplicate template_definitions, template_versions, or module_definitions rows.

### CONSTRAINT 6: Feature flag removal is atomic

Phase B removes `isTemplateCenterEnabled()`. This must be a single commit that removes all guards in one pass. No partial removal (some endpoints flagged, others not).

### CONSTRAINT 7: defaultMethodology column preserved

`default_methodology` column stays in workspace entity. Not deleted. Reads shift to `default_template_key`; writes dual-write to both during transition. Column deletion is V2 cleanup.

### CONSTRAINT 8: Template version schema backward compatibility

Existing `template_versions.schema` JSONB content must continue parsing correctly. New fields (requiredModuleKeys, enabledAttributeKeys) are additive. TemplateApplyService must handle schemas without new fields (pre-Engine-4 versions) gracefully.

### CONSTRAINT 9: No module auto-enable for recommended modules

`recommendedModuleKeys` are returned in ApplyResult for UI prompt only. Never auto-enabled. This prevents silent capability expansion that admins didn't approve.

### CONSTRAINT 10: Attribute enablement is additive only

Template apply ADDS attribute visibility. Never removes. Re-applying a different template to same workspace does not disable attributes from previous template. Admin manually disables if needed.

---

## Testing Requirements

### Phase A tests
- Migration: 15 template_definitions created with correct templateKey
- Migration: 15 template_versions created with status='published'
- Migration: schema JSONB contains phases, tasks, kpis arrays
- Idempotency: running migration twice produces same row count
- Spot-check: pm_waterfall_v2 schema matches legacy SYSTEM_TEMPLATE_DEFS content

### Phase B tests
- `POST /template-center/projects/:projectId/apply` with mode='full': creates WorkPhase + WorkTask rows
- `POST /templates/:id/instantiate-v5_1`: produces identical result via delegation
- Idempotent apply: same template + same project → reuses lineage, no duplicate rows
- Template Center always-on: endpoints respond without TEMPLATE_CENTER_V1 env var
- Lineage: methodology + governance_snapshot populated

### Phase C tests
- Migration: all workspaces have default_template_key backfilled
- Create workspace with defaultTemplateKey → correct template referenced
- Create workspace with defaultMethodology (legacy) → maps to correct templateKey
- Update workspace defaultTemplateKey → reflected in read
- Frontend: template picker renders, selection persists

### Phase D tests
- Apply template with required modules, all available → modules auto-enabled
- Apply template with required module unavailable in tier → ForbiddenException
- Apply template with no required modules → succeeds regardless
- WorkspaceModuleService unavailable → apply succeeds, moduleValidationSkipped=true
- Recommended modules returned in result but not auto-enabled

### Phase E tests
- Apply waterfall template → 67 attributes enabled in workspace
- Apply scrum template → 16 attributes enabled in workspace
- Re-apply same template → idempotent, no duplicate enablement rows
- Apply different template → additional attributes enabled, previous preserved
- AD-024 schema not live → apply succeeds, attributeEnablementSkipped=true

### Phase F tests
- change_management module enabled + scope field update without CR → ForbiddenException
- change_management module enabled + scope field update with approved CR → succeeds
- change_management module disabled → scope update succeeds without CR
- Non-scope field update → no CR check regardless of module state

### Phase G tests
- Full regression: all 11 active templates instantiate via new path
- Legacy endpoint backward compatible
- No writes to legacy templates table
- Frontend uses Template Center API exclusively

---

## Effort Summary

| Phase | Description | Effort | Dependencies | PR |
|-------|-------------|--------|-------------|-----|
| A | Legacy → Template Center data migration | ~5 days | None | PR-A |
| B | Unified apply service | ~5-6 days | Phase A | PR-B |
| C | defaultMethodology → defaultTemplateKey | ~3 days | Phase A | PR-C |
| D | Module integration | ~4-5 days | Phase B + AD-030 impl | PR-D |
| E | Attribute integration | ~4-5 days | Phase D + AD-024 impl | PR-E |
| F | Dead code removal + live enforcement | ~2 days | AD-030 impl | PR-F |
| G | Legacy deprecation + cleanup | ~3-4 days | Phases B-E | PR-G |
| **Total** | | **~26-30 days** | | **7 PRs** |

### Parallelism opportunities

- Phase C can run parallel to Phase B (both depend on A, not each other)
- Phase F can run parallel to Phases D-E (depends on AD-030 impl, not Engine 4 phases)
- Phases A-C can proceed immediately (no AD-024/AD-030 implementation dependency)

### Critical path

```
Phase A (5d) → Phase B (6d) → Phase D (5d) → Phase E (5d) → Phase G (4d)
                                    ↑               ↑
                              AD-030 impl      AD-024 impl
```

**Total critical path: ~25 days** if AD-024 and AD-030 implementations are ready when Phase B completes.

---

## Anti-patterns explicitly excluded

**No new template table.** Template Center tables are the target. Legacy `templates` table becomes read-only archive, not a new parallel system.

**No template "migration" entity.** Migration is a one-time seed script operation, not a runtime concern. No MigrationState entity or migration tracking table.

**No template "compatibility" layer.** Legacy instantiation delegates directly to Template Center apply. No adapter pattern, no shim layer, no compatibility matrix.

**No attribute value seeding.** Templates enable attribute visibility only. Attribute values are user-entered. No "default risk probability = Medium" in template schema.

**No module auto-creation.** Templates reference existing modules by key. If a template references a module that doesn't exist in module_definitions, that's a seed data bug, not a runtime creation event.

**No cross-workspace template inheritance.** Templates are scoped (system → org → workspace). Applying a template to workspace A does not affect workspace B. Per existing scope model.

---

## Approval and lock

**Locked architecturally as of 2026-05-03 by Solution Architect.**

This dispatch is binding for Engine 4 implementation. Phase execution order and constraint adherence are non-negotiable. Effort estimates are guidance, not commitments.

**Effect on AD-024:** Implementation sequencing confirmed. AD-024 schema rebuild is critical path for Phases D-E.

**Effect on AD-029:** Unification architecture executed through Phases A-B-G. AD-029's committed decision realized.

**Effect on AD-030:** Module integration executed through Phase D. AD-030's committed contract consumed.

**Effect on Engine 5 (Governance):** Engine 5 dispatches can reference module declarations from Engine 4 templates. Phase gates, compliance tags, and change management modules are Engine 5 scope — Engine 4 provides the template-to-module wiring they depend on.

**Effect on Engine 9 (AI):** AI composes from Template Center API. Engine 4 ensures template vocabulary (module keys, attribute keys) is committed and queryable.

---

## Document end

This dispatch is binding until explicitly superseded by future dispatch that addresses the same engine scope.
