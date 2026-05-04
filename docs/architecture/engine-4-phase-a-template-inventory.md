# Engine 4 Phase A: Template System Inventory

**Status:** Phase A reconnaissance complete. Awaiting architect review before Phase B.
**Author:** Implementation Executor (Claude)
**Dispatch:** `docs/dispatches/ENGINE-4-TEMPLATE-DISPATCH.md` Phase A
**Date:** 2026-05-04
**Method:** Direct code reads of entity files, seed scripts, service files, migration files. No summaries — every claim cites a file path and line number.

---

## Section 1: Legacy `templates` System Inventory

### Entity: Template

**File:** `zephix-backend/src/modules/templates/entities/template.entity.ts` (208 lines)
**Table:** `templates`
**Module:** `TemplateModule` (`zephix-backend/src/modules/templates/template.module.ts`)

#### Column Inventory (48 columns)

| Column | Type | Nullable | Default | Category |
|---|---|---|---|---|
| `id` | uuid (PK) | NO | gen | Core |
| `name` | varchar(100) | NO | — | Core |
| `template_code` | varchar(100) | YES | — | Core |
| `description` | text | YES | — | Core |
| `category` | varchar(50) | YES | — | Core |
| `kind` | enum(project,board,mixed) | NO | 'project' | Core |
| `icon` | varchar(50) | YES | — | Core |
| `is_active` | boolean | NO | true | Status |
| `is_system` | boolean | NO | false | Status |
| `organization_id` | uuid | YES | — | Scope |
| `template_scope` | enum(SYSTEM,ORG,WORKSPACE) | NO | 'ORG' | Scope |
| `workspace_id` | uuid | YES | — | Scope |
| `is_default` | boolean | NO | false | TC v1 |
| `lock_state` | varchar(20) | NO | 'UNLOCKED' | TC v1 |
| `created_by_id` | uuid | YES | — | TC v1 |
| `updated_by_id` | uuid | YES | — | TC v1 |
| `published_at` | timestamp | YES | — | TC v1 |
| `archived_at` | timestamp | YES | — | TC v1 |
| `metadata` | jsonb | YES | — | Extended |
| `methodology` | varchar(50) | YES | — | Legacy |
| `structure` | jsonb | YES | — | Legacy |
| `metrics` | jsonb | NO | [] | Legacy |
| `version` | integer | NO | 1 | Legacy |
| `default_enabled_kpis` | text[] | NO | {} | KPI |
| `work_type_tags` | text[] | NO | {} | Recommendation |
| `scope_tags` | text[] | NO | {} | Recommendation |
| `complexity_bucket` | varchar(20) | YES | — | Recommendation |
| `duration_min_days` | integer | YES | — | Recommendation |
| `duration_max_days` | integer | YES | — | Recommendation |
| `setup_time_bucket` | varchar(20) | NO | 'SHORT' | Recommendation |
| `structure_summary` | jsonb | YES | — | Recommendation |
| `lock_policy` | jsonb | YES | — | Governance |
| `delivery_method` | text | YES | — | Wave 6 |
| `default_tabs` | jsonb | YES | — | Wave 6 |
| `default_governance_flags` | jsonb | YES | — | Wave 6 |
| `column_config` | jsonb | YES | — | Wave 6 |
| `phases` | jsonb | YES | — | Wave 6 |
| `task_templates` | jsonb | YES | — | Wave 6 |
| `risk_presets` | jsonb | NO | [] | Wave 6 |
| `is_published` | boolean | NO | true | Wave 6 |
| `created_at` | timestamp | NO | NOW() | Audit |
| `updated_at` | timestamp | NO | NOW() | Audit |

**Indexes:**
- `idx_templates_org` on `organization_id`
- `idx_templates_org_default` unique on `organization_id` WHERE `is_default = true`
- `idx_templates_org_name` unique on `(organization_id, name)` WHERE `archived_at IS NULL`

#### Supporting Entities

| Entity | Table | Purpose | Status |
|---|---|---|---|
| `ProjectTemplate` | `project_templates` | Legacy template-to-project binding | FROZEN/DEPRECATED (Wave 6 unified onto templates) |
| `TemplateBlock` | `template_blocks` | Block-level template components | Active |
| `LegoBlock` | `lego_blocks` | Reusable block library | Active |
| `TemplateKpi` | `template_kpis` | KPI pack bindings per template | Active |

### 14 SYSTEM_TEMPLATE_DEFS

**File:** `zephix-backend/src/modules/templates/data/system-template-definitions.ts` (1224 lines)

#### Template Inventory Table

| # | templateCode | Name | Category | Methodology | Phases | Tasks | Risk Presets | Active |
|---|---|---|---|---|---|---|---|---|
| 1 | `pm_waterfall_v1` | Waterfall Project | Project Management | waterfall | 5 | 21 | 0 | NO |
| 2 | `pm_waterfall_v2` | Waterfall Project (PMI) | Project Management | waterfall | 5 | 16 | 0 | YES |
| 3 | `pm_agile_v1` | Agile Project | Project Management | agile | 3 | 6 | 0 | YES |
| 4 | `pm_hybrid_v1` | Hybrid Project | Project Management | hybrid | 4 | 5 | 0 | YES |
| 5 | `pm_risk_register_v1` | Risk Register | Project Management | kanban | 1 | 3 | 3 | NO |
| 6 | `product_discovery_v1` | Product Discovery | Product Management | agile | 3 | 6 | 0 | YES |
| 7 | `product_launch_v1` | Product Launch | Product Management | agile | 4 | 6 | 0 | YES |
| 8 | `roadmap_execution_v1` | Roadmap Execution | Product Management | hybrid | 4 | 5 | 0 | YES |
| 9 | `sw_scrum_delivery_v1` | Scrum Delivery | Software Dev | agile | 3 | 6 | 0 | YES |
| 10 | `sw_kanban_delivery_v1` | Kanban Delivery | Software Dev | kanban | 1 | 3 | 0 | YES |
| 11 | `sw_release_planning_v1` | Release Planning | Software Dev | waterfall | 5 | 6 | 0 | YES |
| 12 | `ops_service_improvement_v1` | Service Improvement | Operations | agile | 4 | 5 | 0 | NO |
| 13 | `ops_readiness_v1` | Operational Readiness | Operations | waterfall | 5 | 6 | 0 | NO |
| 14 | `startup_mvp_build_v1` | MVP Build | Startups | agile | 4 | 5 | 0 | YES |
| 15 | `startup_gtm_v1` | Go-to-Market | Startups | agile | 4 | 6 | 0 | YES |

**Note:** 15 definitions exist, not 14. The dispatch says "14 SYSTEM_TEMPLATE_DEFS (11 active)" — actual count is **15 definitions, 11 active** via `ACTIVE_TEMPLATE_CODES`. The dispatch count of 14 was from the initial recon; the extra definition (`startup_gtm_v1`) was missed in the summary.

**ACTIVE_TEMPLATE_CODES (11):** pm_waterfall_v2, pm_agile_v1, pm_hybrid_v1, sw_scrum_delivery_v1, sw_kanban_delivery_v1, sw_release_planning_v1, roadmap_execution_v1, product_discovery_v1, product_launch_v1, startup_mvp_build_v1, startup_gtm_v1

**Coming Soon (4):** pm_waterfall_v1, pm_risk_register_v1, ops_service_improvement_v1, ops_readiness_v1

#### Governance Flag Presets (4 configs)

**File:** `system-template-definitions.ts` lines 24-88

| Preset | methodology | iterationsEnabled | costTrackingEnabled | baselinesEnabled | earnedValueEnabled | capacityEnabled | changeManagementEnabled | waterfallEnabled |
|---|---|---|---|---|---|---|---|---|
| SCRUM_GOV | agile | true | false | false | false | true | false | false |
| KANBAN_GOV | kanban | false | false | false | false | true | false | false |
| WATERFALL_GOV | waterfall | false | true | true | true | true | true | true |
| HYBRID_GOV | hybrid | true | true | false | false | true | true | false |

#### Column Config Presets (3 configs)

| Preset | Columns Enabled |
|---|---|
| WATERFALL_COLUMNS | title, assignee, status, dueDate, priority, completion |
| AGILE_COLUMNS | title, assignee, status, priority, storyPoints |
| KANBAN_COLUMNS | title, assignee, status, priority |
| HYBRID_COLUMNS | title, assignee, status, dueDate, priority, storyPoints |

#### KPI Pack Bindings (4 packs)

**File:** `zephix-backend/src/modules/kpis/engine/kpi-packs.ts`

| Pack | KPIs | Templates Using |
|---|---|---|
| scrum_core | velocity (req), throughput, wip (req), escaped_defects | pm_agile_v1, sw_scrum_delivery_v1 |
| kanban_flow | cycle_time (req), throughput (req), wip (req), open_risk_count | sw_kanban_delivery_v1 |
| waterfall_evm | schedule_variance (req), spi (req), budget_burn (req), forecast_at_completion (req) | pm_waterfall_v2, sw_release_planning_v1 |
| hybrid_core | cycle_time, budget_burn, forecast_at_completion, open_risk_count, change_request_approval_rate | pm_hybrid_v1 |

### Instantiation Flow

**Controller:** `POST /templates/:id/instantiate-v5_1` → `TemplatesController.instantiateV51()`
**File:** `zephix-backend/src/modules/templates/controllers/templates.controller.ts:614-704`

**Service:** `TemplatesInstantiateV51Service.instantiateV51()`
**File:** `zephix-backend/src/modules/templates/services/templates-instantiate-v51.service.ts` (577 lines)

**Flow:**
1. Validate workspace access + template scope (SYSTEM/ORG/WORKSPACE)
2. Create or reuse DRAFT project
3. `normalizeTemplateStructure(template)` → extract phases + tasks
4. Create WorkPhase rows (with reportingKey, isMilestone, dueDate)
5. Create WorkTask rows (linked to phases via phaseId)
6. Set project metadata: templateId, templateVersion, activeKpiIds, columnConfig
7. Snapshot governance flags from template → project
8. Create risk presets from `template.riskPresets`
9. Return: { projectId, projectName, state, structureLocked, phaseCount, taskCount }

**Important:** `INSTANTIATE_TEMPLATE_SEED_TASKS = false` (line 111 of normalizer). Templates ship phase shells only — tasks are stripped. PMs add tasks post-instantiation.

**Normalizer:** `template-structure-normalizer.ts` (302 lines)
- Path 1: `structure.phases` (legacy nested format)
- Path 2: `phases` + `taskTemplates` flat columns (current canonical format)
- Both paths produce `NormalizedTemplateStructure` with phases[].tasks[]

### Seed Scripts

| Script | Target Table | Content |
|---|---|---|
| `seed-system-templates.ts` (267 lines) | `templates` + `template_kpis` | Wave 7: all 15 SYSTEM_TEMPLATE_DEFS with KPI pack bindings |
| `templates.seed.ts` (566 lines) | `templates` | Week 1: 3 templates (Agile Sprint, Waterfall, Kanban) with KPIs |
| `templates-phase2.seed.ts` (157 lines) | `templates` | Phase 2.3: 5 templates from JSON (software, marketing, construction, consulting, general) |

---

## Section 2: Template Center `template_definitions` System Inventory

### Entity: TemplateDefinition

**File:** `zephix-backend/src/modules/template-center/templates/entities/template-definition.entity.ts` (56 lines)
**Table:** `template_definitions`
**Module:** `TemplateCenterModule` (`zephix-backend/src/modules/template-center/template-center.module.ts`)

#### Column Inventory (12 columns)

| Column | Type | Nullable | Default | Purpose |
|---|---|---|---|---|
| `id` | uuid (PK) | NO | gen | Core |
| `scope` | text | NO | — | system, org, workspace |
| `org_id` | uuid | YES | — | Org scoping |
| `workspace_id` | uuid | YES | — | Workspace scoping |
| `template_key` | text | NO | — | Stable identifier |
| `name` | text | NO | — | Display name |
| `description` | text | YES | — | Description |
| `category` | text | YES | — | Grouping |
| `is_prebuilt` | boolean | NO | false | Platform-provided |
| `is_admin_default` | boolean | NO | false | Admin default |
| `created_by` | uuid | YES | — | Creator |
| `created_at` | timestamptz | NO | NOW() | Audit |
| `updated_at` | timestamptz | NO | NOW() | Audit |

**Index:** Composite on `(scope, org_id, workspace_id)`

### Entity: TemplateVersion

**File:** `template-version.entity.ts` (60 lines)
**Table:** `template_versions`

| Column | Type | Nullable | Default | Purpose |
|---|---|---|---|---|
| `id` | uuid (PK) | NO | gen | Core |
| `template_definition_id` | uuid (FK) | NO | — | Parent definition |
| `version` | int | NO | — | Version number |
| `status` | text | NO | — | draft, published, deprecated |
| `changelog` | text | YES | — | Version notes |
| `published_at` | timestamptz | YES | — | When published |
| `published_by` | uuid | YES | — | Who published |
| `schema` | jsonb | NO | — | Full template schema |
| `hash` | text | NO | — | Content hash |
| `created_at` | timestamptz | NO | NOW() | Audit |

**Indexes:**
- Unique on `(template_definition_id, version)`
- Composite on `(template_definition_id, status)`

#### TemplateVersion.schema JSONB Shape

From `TemplateApplyService` line 151-165:

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

### Supporting Entities

| Entity | Table | Columns | Purpose |
|---|---|---|---|
| `TemplateComponent` | `template_components` | id, templateVersionId, componentType (phase\|gate\|task\|kpi\|doc), componentKey, name, sortOrder, data (JSONB) | Typed components within a version |
| `TemplatePolicy` | `template_policies` | id, templateVersionId, policyKey, policyType (required_kpi\|required_document\|gate_rule), policy (JSONB) | Policy enforcement rules |
| `TemplateLineage` | `template_lineage` | projectId (unique), templateDefinitionId, templateVersionId, appliedAt, appliedBy, upgradeState, upgradeNotes | Tracks which template version a project was created from |
| `DocTemplate` | `doc_templates` | id, docKey, name, category, contentType, schema (JSONB) | Document template library |
| `DocumentInstance` | `document_instances` | id, projectId, docTemplateId, docKey, name, status, ownerId, isRequired, blocksGateKey | Document instances created per project |
| `GateApproval` | `gate_approvals` | id, projectId, gateKey, decision, decidedBy, decidedAt, notes, evidence (JSONB) | Gate approval records |
| `ProjectKpi` | `project_kpis` | id, projectId, kpiDefinitionId, isRequired, source | KPI instances bound to projects |
| `KpiValue` | `kpi_values` | id, projectKpiId, value, recordedAt, recordedBy | KPI measurement values |

### Template Center Seed Data

**2 Prebuilt Template Definitions:**

| templateKey | Name | KPIs | Documents | Gates |
|---|---|---|---|---|
| `waterfall_standard` | Waterfall Standard | SPI (req), CPI (req) | project_charter (req), project_plan (req, blocks planning gate), project_schedule (req) | gate_planning_approval |
| `agile_standard` | Agile Standard | Velocity (req) | project_charter (req), status_report (optional) | — |

**12 Document Templates:**

| docKey | Name | Category | Content Type |
|---|---|---|---|
| `project_charter` | Project Charter | Initiation | rich_text |
| `stakeholder_register` | Stakeholder Register | Initiation | rich_text |
| `business_case` | Business Case | Initiation | rich_text |
| `project_plan` | Project Plan | Planning | rich_text |
| `project_schedule` | Project Schedule | Planning | rich_text |
| `risk_register` | Risk Register | Planning | rich_text |
| `raid_log` | RAID Log | Planning | rich_text |
| `status_report` | Status Report | Monitoring | rich_text |
| `change_request` | Change Request | Change | form |
| `lessons_learned` | Lessons Learned | Closure | rich_text |
| `closure_report` | Closure Report | Closure | rich_text |
| `handover_checklist` | Handover Checklist | Closure | form |

**12 KPI Definitions:**

| kpiKey | Category | Unit | Direction | Default Enabled |
|---|---|---|---|---|
| `spi` | Schedule | ratio | higher_better | NO |
| `planned_value` | Schedule | currency | — | NO |
| `cpi` | Cost | ratio | higher_better | NO |
| `earned_value` | Cost | currency | — | NO |
| `actual_cost` | Cost | currency | lower_better | NO |
| `eac` | Cost | currency | lower_better | NO |
| `variance_at_completion` | Cost | currency | higher_better | NO |
| `risk_count_high` | Risk | count | lower_better | NO |
| `utilization` | Resource | percentage | target_best | NO |
| `velocity` | Agile | points | higher_better | NO |
| `burndown_remaining` | Agile | points | lower_better | NO |
| `cycle_time_days` | Agile | days | lower_better | NO |

### Apply Flow

**Controller:** `POST /template-center/projects/:projectId/apply` → `TemplateApplyController.apply()`
**File:** `zephix-backend/src/modules/template-center/apply/template-apply.controller.ts`
**Feature flag:** `TEMPLATE_CENTER_V1=true` required (`template-center.flags.ts`)

**Service:** `TemplateApplyService.apply()`
**File:** `zephix-backend/src/modules/template-center/apply/template-apply.service.ts` (326 lines)

**Flow:**
1. Validate project exists + workspace match
2. Resolve template definition by key (scope hierarchy: system → org → workspace)
3. Find published version (latest or specific)
4. Transaction: lock existing lineage (prevent concurrent double-create)
5. Create or update TemplateLineage record
6. For each `schema.kpis[]`: create ProjectKpi (idempotent — skips existing)
7. For each `schema.documents[]`: create DocumentInstance (idempotent — updates existing)
8. Emit TEMPLATE_APPLIED audit event
9. Return: { applied, templateKey, version, lineageId, createdKpis, createdDocs, existingKpis, existingDocs }

**Key difference from legacy:** Template Center apply creates KPIs + Documents ONLY. It does NOT create WorkPhase or WorkTask rows. Phase/task creation is the legacy system's responsibility.

---

## Section 3: Side-by-Side Feature Comparison

| Feature | Legacy (`templates`) | Template Center (`template_definitions`) | Gap |
|---|---|---|---|
| **Scope model** | SYSTEM / ORG / WORKSPACE | system / org / workspace | Equivalent (different casing) |
| **Version control** | `version` integer field (single version) | `TemplateVersion` entity with full versioning (draft/published/deprecated) | TC has proper versioning; legacy does not |
| **Content storage** | 48 typed columns | JSONB `schema` field on TemplateVersion | TC is schema-flexible; legacy is column-rigid |
| **Phases** | `phases` JSONB column | `schema.phases[]` or `TemplateComponent` rows | Both support phases |
| **Tasks** | `taskTemplates` JSONB column | `schema.tasks[]` or `TemplateComponent` rows | Both support tasks |
| **KPI bindings** | `template_kpis` join table + `defaultEnabledKPIs` array | `schema.kpis[]` + `ProjectKpi` entity | Both, but different mechanisms |
| **Documents** | Not supported | `schema.documents[]` + `DocTemplate` + `DocumentInstance` | Legacy has NO document support |
| **Gates** | Not supported | `schema.gates[]` + `GateApproval` entity | Legacy has NO gate support |
| **Policies** | Not supported | `TemplatePolicy` entity (required_kpi, required_document, gate_rule) | Legacy has NO policy enforcement |
| **Governance flags** | `defaultGovernanceFlags` JSONB | Not present | TC has NO governance flag support |
| **Column config** | `columnConfig` JSONB | Not present | TC has NO column config |
| **Methodology** | `methodology` enum field | Not present | TC has NO methodology concept |
| **Delivery method** | `deliveryMethod` text | Not present | TC has NO delivery method |
| **Default tabs** | `defaultTabs` JSONB | Not present | TC has NO tab config |
| **Risk presets** | `riskPresets` JSONB array | Not present | TC has NO risk preset support |
| **Recommendation** | workTypeTags, scopeTags, complexityBucket, durationMinDays, durationMaxDays, setupTimeBucket | Not present | TC has NO recommendation metadata |
| **Template lineage** | Not present | `TemplateLineage` entity with upgradeState tracking | Legacy has NO lineage tracking |
| **Apply: creates phases** | YES (WorkPhase rows) | NO | TC does NOT create project structure |
| **Apply: creates tasks** | YES (WorkTask rows) | NO | TC does NOT create project structure |
| **Apply: creates risks** | YES (from riskPresets) | NO | TC does NOT create risks |
| **Apply: creates KPIs** | YES (via `activeKpiIds`) | YES (from `schema.kpis[]`) | Both — different mechanisms |
| **Apply: creates docs** | NO | YES (from `schema.documents[]`) | Legacy does NOT create documents |
| **Feature flag** | None (always available) | `TEMPLATE_CENTER_V1=true` required | TC is gated |
| **Structure normalizer** | `template-structure-normalizer.ts` (302 lines) | Not needed (JSONB schema is already normalized) | — |
| **Audit events** | None (relies on caller audit) | `TemplateCenterAuditService.emit()` (BROKEN — entity field drift, deferred fix) | TC has dedicated audit but currently broken |
| **Content hash** | None | `hash` field on TemplateVersion | TC has integrity checking |
| **Upgrade tracking** | None | `upgradeState` on TemplateLineage (none/eligible/pending/applied/blocked) | TC supports upgrade lifecycle |

---

## Section 4: Migration Recommendation per Legacy Template

### Strategy Summary

All 15 SYSTEM_TEMPLATE_DEFS should migrate into Template Center as `template_definitions` + `template_versions` rows. The TC schema JSONB is flexible enough to carry all legacy metadata.

| templateCode | Migration Strategy | Rationale |
|---|---|---|
| `pm_waterfall_v2` | **CONSOLIDATE** — migrate as TC definition with full schema | Reference template. Most complete metadata. Active. |
| `pm_agile_v1` | **CONSOLIDATE** | Active. Standard agile template. |
| `pm_hybrid_v1` | **CONSOLIDATE** | Active. Hybrid methodology. |
| `sw_scrum_delivery_v1` | **CONSOLIDATE** | Active. Software dev scrum. |
| `sw_kanban_delivery_v1` | **CONSOLIDATE** | Active. Software dev kanban. |
| `sw_release_planning_v1` | **CONSOLIDATE** | Active. Release planning waterfall. |
| `roadmap_execution_v1` | **CONSOLIDATE** | Active. Product management hybrid. |
| `product_discovery_v1` | **CONSOLIDATE** | Active. Product discovery agile. |
| `product_launch_v1` | **CONSOLIDATE** | Active. Product launch agile. |
| `startup_mvp_build_v1` | **CONSOLIDATE** | Active. Startup MVP. |
| `startup_gtm_v1` | **CONSOLIDATE** | Active. Startup go-to-market. |
| `pm_waterfall_v1` | **PRESERVE as inactive** — migrate but mark deprecated | Superseded by v2. Keep for existing project lineage reference. |
| `pm_risk_register_v1` | **CONSOLIDATE** — migrate as TC definition | Coming soon. Has risk presets (unique). |
| `ops_service_improvement_v1` | **CONSOLIDATE** | Coming soon. Operations. |
| `ops_readiness_v1` | **CONSOLIDATE** | Coming soon. Operations waterfall. |

### TC Schema Extension Required

Legacy metadata that must be carried in `TemplateVersion.schema`:

```json
{
  "methodology": "waterfall",
  "deliveryMethod": "WATERFALL",
  "defaultTabs": ["table", "board", "timeline"],
  "defaultGovernanceFlags": {
    "iterationsEnabled": false,
    "costTrackingEnabled": true,
    "baselinesEnabled": true,
    "earnedValueEnabled": true,
    "capacityEnabled": true,
    "changeManagementEnabled": true,
    "waterfallEnabled": true
  },
  "columnConfig": {
    "title": true,
    "assignee": true,
    "status": true,
    "dueDate": true,
    "priority": true,
    "completion": true
  },
  "workTypeTags": ["waterfall", "governance"],
  "complexityBucket": "standard",
  "riskPresets": [...],
  "kpiPackCode": "waterfall_evm"
}
```

These fields are additive to the existing TC schema shape. No existing TC schema fields are removed.

---

## Section 5: Behavior Gap Closure Plan

### Gaps Where Legacy Has Capability and TC Lacks It

| Gap | Legacy Has | TC Lacks | Resolution |
|---|---|---|---|
| **Phase/Task creation** | `instantiate-v5_1` creates WorkPhase + WorkTask | `apply()` only creates KPIs + docs | Extend `TemplateApplyService.doApply()` with `mode: 'full'` to create phases/tasks from schema |
| **Governance flags** | `defaultGovernanceFlags` → project governance snapshot | No governance concept | Carry in `schema.defaultGovernanceFlags`; apply sets on project |
| **Column config** | `columnConfig` → project column config | No column config concept | Carry in `schema.columnConfig`; apply sets on project |
| **Methodology** | `methodology` enum → project methodology | No methodology concept | Carry in `schema.methodology`; apply sets on project |
| **Default tabs** | `defaultTabs` → project UI tabs | No tab concept | Carry in `schema.defaultTabs`; apply sets on project |
| **Risk presets** | `riskPresets` → work_risks rows | No risk concept | Carry in `schema.riskPresets`; apply creates risk rows |
| **Recommendation metadata** | workTypeTags, scopeTags, complexityBucket, etc. | No recommendation fields | Carry in `schema.recommendation` object or on definition-level columns |
| **Feature flag removal** | Always available | `TEMPLATE_CENTER_V1` gates all endpoints | Remove feature flag; TC always available |

### Gaps Where TC Has Capability and Legacy Lacks It

| Gap | TC Has | Legacy Lacks | Resolution |
|---|---|---|---|
| **Version control** | Full draft/published/deprecated lifecycle | Single version integer | No action needed — TC versioning is the target |
| **Document management** | DocTemplate + DocumentInstance + lifecycle transitions | None | No action needed — TC capability preserved |
| **Gate system** | GateApproval with evidence packs | None | No action needed — TC capability preserved |
| **Policy enforcement** | TemplatePolicy (required_kpi, required_document, gate_rule) | None | No action needed — TC capability preserved |
| **Lineage tracking** | TemplateLineage with upgrade state | None | No action needed — TC capability preserved |
| **Content hashing** | Hash field on TemplateVersion | None | No action needed — TC capability preserved |

### What Gets Built vs Dropped

**Built (Phase B of dispatch):**
- Extend `TemplateApplyService` with full instantiation mode (phases, tasks, governance, risks, column config)
- Migrate legacy seed to write TC tables
- Legacy `instantiate-v5_1` delegates to TC apply service

**Dropped (no longer needed after unification):**
- Legacy `normalizeTemplateStructure()` (TC schema is already normalized)
- Legacy `TemplatesInstantiateV51Service` as primary path (becomes thin delegation wrapper)
- Legacy seed writing directly to `templates` table (migrates to TC tables)
- `TEMPLATE_CENTER_V1` feature flag
- Dual-write period (Phase G removes)

**Preserved (backward compatible):**
- `POST /templates/:id/instantiate-v5_1` endpoint (delegates to TC apply)
- Legacy `templates` table rows (read-only archive)
- `ProjectTemplate` table (already FROZEN)

---

## Section 6: Risks and Unknowns

### Risk 1: Phase 2.3 JSON Templates (MEDIUM)

**Finding:** `templates-phase2.seed.ts` loads 5 templates from JSON files in `seed-data/templates/` (software.json, marketing.json, construction.json, consulting.json, general.json). These are org-scoped, not system-scoped.

**Risk:** These templates may have different column shapes than SYSTEM_TEMPLATE_DEFS. Migration script needs to handle both shapes.

**Mitigation:** Read the JSON files before Phase B implementation to verify shape compatibility.

### Risk 2: Template Seed Task Suppression (LOW)

**Finding:** `INSTANTIATE_TEMPLATE_SEED_TASKS = false` in normalizer. Templates ship phase shells only — tasks are stripped before instantiation.

**Risk:** TC schema will carry tasks in `schema.tasks[]` but they won't be created on apply. This is intentional product policy, not a bug. But if policy changes, the task data is already in schema.

**Mitigation:** None needed — this is a product decision, not a migration issue.

### Risk 3: TemplateCenterAuditService Broken (HIGH — already tracked)

**Finding:** `TemplateCenterAuditService.emit()` uses wrong entity field names (`eventType`, `userId`, `metadata`, `projectId`). All writes silently fail at CHECK constraint level.

**Risk:** After TC becomes the canonical path, audit events for template operations will still be broken until this service is fixed.

**Mitigation:** Separate PR to fix TemplateCenterAuditService field mapping (already tracked in PR #244 deferred work).

### Risk 4: Two Duplicate TC Definitions for Waterfall/Agile (MEDIUM)

**Finding:** Template Center already has `waterfall_standard` and `agile_standard` prebuilt definitions. Legacy has `pm_waterfall_v2` and `pm_agile_v1`. These are DIFFERENT content (TC versions have KPI/doc/gate specs; legacy versions have phases/tasks/governance).

**Risk:** Migration could create duplicate definitions if not handled. Need merge strategy: either merge content into existing TC definitions or create new definitions with different keys.

**Mitigation:** Phase B migration script should check for existing TC definitions by templateKey before inserting. If collision, update existing definition's published version with merged content.

### Risk 5: KPI System Split (MEDIUM)

**Finding:** Two KPI systems exist:
- Legacy: `template_kpis` table + `kpi-packs.ts` + `kpi-registry-defaults.ts` (12 KPIs)
- TC: `kpi_definitions` table + `seed-kpis.ts` (12 KPIs, partially overlapping)

**Risk:** KPI keys may not match between systems. Migration must map legacy KPI identifiers to TC KPI definition IDs.

**Mitigation:** Create mapping table of legacy KPI codes → TC kpi_definition IDs during Phase B.

### Risk 6: Existing Project Lineage (LOW)

**Finding:** Projects created via legacy `instantiate-v5_1` have `templateId` pointing to `templates.id`. Projects created via TC apply have `TemplateLineage` pointing to `template_definitions.id`.

**Risk:** After migration, old projects won't have TC lineage records. This affects "what template was this project created from?" queries.

**Mitigation:** Phase B can optionally backfill TemplateLineage for existing projects, but this is not required for forward-only unification.

---

## Section 7: Open Questions for Architect Review

### Q1: Template Count Discrepancy

The dispatch says "14 SYSTEM_TEMPLATE_DEFS" but actual count is **15** (startup_gtm_v1 was not counted in initial recon). This doesn't affect the migration strategy — all 15 should migrate. But dispatch references to "14" should be updated for accuracy.

### Q2: Phase 2.3 JSON Templates — In Scope?

5 org-scoped templates from JSON files exist. Are these in scope for Phase A migration, or do they remain as org-level templates in the legacy table? They were seeded per-organization, not as SYSTEM templates.

**Recommendation:** Defer org-scoped templates. Phase A migrates SYSTEM templates only. Org-scoped templates can be addressed in a separate dispatch if needed.

### Q3: Existing TC waterfall_standard / agile_standard — Merge or Replace?

Template Center already has 2 prebuilt definitions with KPI/document/gate content. Legacy has matching-but-different definitions. Options:
- **Merge:** Combine TC's KPI/doc/gate content with legacy's phases/governance/column content into a single unified definition
- **Replace:** Supersede TC prebuilts with new definitions migrated from legacy (richer content)
- **Keep both:** Legacy migrates as separate definitions, TC prebuilts remain

**Recommendation:** Merge. The unified definition should have phases + governance + column config (from legacy) AND KPIs + documents + gates (from TC). This is the whole point of Engine 4 unification.

### Q4: defaultMethodology → defaultTemplateKey Mapping Completeness

The dispatch maps 5 methodology values to templateKeys. But `pm_waterfall_v1` (coming soon) shares methodology='waterfall' with `pm_waterfall_v2`. The mapping is unambiguous for active templates, but if coming-soon templates activate, there may be methodology → templateKey ambiguity.

**Recommendation:** Map to the active template. Coming-soon templates use different templateCodes anyway.

### Q5: Module/Attribute Declarations — Phase D/E Dependency

The dispatch describes `requiredModuleKeys` and `enabledAttributeKeys` as part of Phase D/E. These depend on AD-024 and AD-030 implementations. Should the Phase A migration schema include placeholder fields for these, or add them in Phase D/E?

**Recommendation:** Don't include placeholders in Phase A. Phase D/E adds them when AD-024/AD-030 implementations are ready. Adding placeholder fields creates schema that has no functional backing.

### Q6: TemplateCenterAuditService Fix Timing

The audit service fix is deferred to a separate PR. But TC becomes the canonical apply path in Phase B. If Phase B merges before the audit fix, all template apply audit events will silently fail.

**Recommendation:** Fix TemplateCenterAuditService BEFORE Phase B merges. Otherwise Phase B introduces a regression in audit trail coverage (legacy path has no audit, but at least it doesn't pretend to have one).

---

## Section 8: Architect Decisions on Open Questions

Resolved by Solution Architect on 2026-05-04, following Gate 2 review of this inventory.

### A1: Template Count — 15 confirmed

Minor correction: dispatch said 14, actual is 15. All 15 migrate. Dispatch references updated for accuracy. No strategy impact.

### A2: Phase 2.3 JSON Templates — DEFERRED

Out of Engine 4 Phase A scope. Phase A migrates SYSTEM templates only (the 15 SYSTEM_TEMPLATE_DEFS). The 5 org-scoped JSON templates (software, marketing, construction, consulting, general) are tracked as separate dispatch ("Engine 4 Phase A.1: Org-scoped template migration"), deferred to post-Engine-4 completion. Lower priority — per-org content, not platform identity.

### A3: TC waterfall_standard / agile_standard Collision — MERGE

Phase B merges TC's existing prebuilt definitions into the migrated legacy definitions. Result: single unified definition per methodology with full content surface (phases + governance + column config from legacy AND KPIs + documents + gates from TC).

**Naming:** TC naming wins. Canonical templateKeys become `waterfall_standard` and `agile_standard`. Legacy `pm_waterfall_v2` and `pm_agile_v1` become aliases for backward compatibility (templateCode resolver maps legacy codes to canonical TC keys).

**Hard constraint for Phase B:** Any code referencing `pm_waterfall_v2` or `pm_agile_v1` via templateCode must continue resolving via alias mapping.

### A4: defaultMethodology Mapping — Active Templates Win

- `methodology='waterfall'` → `waterfall_standard`
- `methodology='agile'` → `agile_standard`
- `methodology='hybrid'` → `pm_hybrid_v1` (migrate as `hybrid_standard`)
- `methodology='kanban'` → `sw_kanban_delivery_v1` (migrate as `kanban_standard`)
- `methodology='scrum'` → `sw_scrum_delivery_v1` (scrum-specific, distinct from generic agile)

Coming-soon templates use different templateCodes and don't create mapping ambiguity.

### A5: Module/Attribute Placeholders — NO

Phase A schema is final-shape clean. No placeholder fields for `requiredModuleKeys` or `enabledAttributeKeys`. Phase D/E adds these when AD-024 and AD-030 implementations are live. Adding fields without functional backing creates dead schema (same anti-pattern as dormant `workspace_module_configs` that almost caused AD-030 v1 disaster).

### A6: TemplateCenterAuditService Fix Timing — CRITICAL, Phase B BLOCKER

**Promoted from "deferred" to "Phase B blocker."** Revised sequencing:

```
Original:  PR #244 → Phase A → Phase B → ... → TC Audit fix (deferred)
Revised:   PR #244 ✓ → Phase A → TC Audit fix → Phase B → Phase C → ...
```

Rationale: Phase B makes TC the canonical apply path. If TemplateCenterAuditService is still broken when Phase B merges, every template application silently fails to write audit events. This is the exact bug class PR #244 just fixed for ack flow — introducing it in a different path at the moment TC becomes canonical is unacceptable.

Estimated delay to Phase B: ~3-5 days (architect dispatch + executor work + verification). Trade-off accepted: audit data integrity > Engine 4 velocity.

---

## Document End

This inventory is a point-in-time snapshot based on code reads at commit `a8badf23` (staging, post-PR-244 merge). Any code changes after this commit may invalidate specific findings. Architect decisions in Section 8 are binding.

Reviewed and accepted by Solution Architect on 2026-05-04.
