# Zephix Platform Mental Model (code + schema ground truth)

**Produced:** 2026-05-23  
**Branch audited:** `staging` @ `ZephixApp-main-sync` (post-pull)  
**Method:** Read-only — TypeORM entities, migrations references, Nest services, React routes/components, and one PostgreSQL snapshot. No application code changed.

**Row counts caveat:** Railway **staging** credentials are **not** in this working tree. Counts below come from `zephix-backend/.env.backup` (`DB_HOST` / `DB_NAME` local or dev). That database has **11 organizations** but **0 workspaces** and **0 projects** — it is **not** representative of production/staging traffic. Re-run the query block in §1 when staging `DATABASE_URL` is available.

```sql
-- Paste into staging psql when credentials exist
SELECT 'organizations' AS t, COUNT(*) FROM organizations
UNION ALL SELECT 'workspaces', COUNT(*) FROM workspaces WHERE deleted_at IS NULL
UNION ALL SELECT 'programs', COUNT(*) FROM programs
UNION ALL SELECT 'portfolios', COUNT(*) FROM portfolios
UNION ALL SELECT 'projects', COUNT(*) FROM projects WHERE deleted_at IS NULL
UNION ALL SELECT 'work_phases', COUNT(*) FROM work_phases WHERE deleted_at IS NULL
UNION ALL SELECT 'work_tasks', COUNT(*) FROM work_tasks WHERE deleted_at IS NULL
UNION ALL SELECT 'work_risks', COUNT(*) FROM work_risks
UNION ALL SELECT 'templates', COUNT(*) FROM templates
UNION ALL SELECT 'intake_forms', COUNT(*) FROM intake_forms
UNION ALL SELECT 'project_kpis', COUNT(*) FROM project_kpis
UNION ALL SELECT 'document_instances', COUNT(*) FROM document_instances
UNION ALL SELECT 'portfolio_projects', COUNT(*) FROM portfolio_projects
UNION ALL SELECT 'workspace_members', COUNT(*) FROM workspace_members;
```

**Local/dev snapshot (2026-05-23):** organizations=11, workspaces=0, programs=0, portfolios=0, projects=0, work_phases=0, work_tasks=0, work_risks=0, templates=3, intake_forms=0, project_kpis=0, document_instances=0, portfolio_projects=0, workspace_members=0.

---

## SECTION 1 — THE ENTITY HIERARCHY

### 1.1 Organization

| Field | Value |
|-------|--------|
| Entity file | `zephix-backend/src/organizations/entities/organization.entity.ts` |
| Table | `organizations` |
| PK | `id` (uuid) |
| Parent FK | — (root tenant) |
| Child FKs (direct) | `users.organization_id` (legacy column on users), `user_organizations.organization_id`, `projects.organization_id`, `workspaces.organization_id`, most domain tables |
| Row count (local DB) | **11** |

Key columns: `name`, `slug`, `status`, `plan_code`, `settings` (jsonb), `created_at` / `updated_at` — see ```13:77:zephix-backend/src/organizations/entities/organization.entity.ts```.

Membership is **`user_organizations`**, not embedded on Organization: ```20:40:zephix-backend/src/organizations/entities/user-organization.entity.ts``` (`role`: `owner` \| `admin` \| `member` \| `viewer`).

---

### 1.2 Workspace

| Field | Value |
|-------|--------|
| Entity file | `zephix-backend/src/modules/workspaces/entities/workspace.entity.ts` |
| Table | `workspaces` |
| Parent FK | `organization_id` → `organizations.id` |
| Child FKs | `workspace_members.workspace_id`, `projects.workspace_id`, `portfolios.workspace_id`, `programs.workspace_id`, all `work_*` rows with `workspace_id` |
| Row count (local DB) | **0** (non-deleted) |

`complexity_mode` enum: `lean`, `standard`, `governed`, plus deprecated `simple` / `advanced` — ```47:58:zephix-backend/src/modules/workspaces/entities/workspace.entity.ts```.

---

### 1.3 Program

| Field | Value |
|-------|--------|
| Entity file | `zephix-backend/src/modules/programs/entities/program.entity.ts` |
| Table | `programs` |
| Parent FKs | `organization_id`, `workspace_id`, **`portfolio_id` (required)** |
| Child FKs | `projects.program_id` (optional on project) |
| Row count (local DB) | **0** |

Program **must** belong to a portfolio in the same workspace — ```60:65:zephix-backend/src/modules/programs/entities/program.entity.ts```.

---

### 1.4 Portfolio

| Field | Value |
|-------|--------|
| Entity file | `zephix-backend/src/modules/portfolios/entities/portfolio.entity.ts` |
| Table | `portfolios` |
| Parent FKs | `organization_id`, `workspace_id` |
| Child FKs | `programs.portfolio_id`, `portfolio_projects.portfolio_id`, `projects.portfolio_id` (optional direct link) |
| Row count (local DB) | **0** |

Join table **`portfolio_projects`** links portfolios ↔ projects (many-to-many style) — ```23:39:zephix-backend/src/modules/portfolios/entities/portfolio-project.entity.ts```.

---

### 1.5 Project

| Field | Value |
|-------|--------|
| Entity file | `zephix-backend/src/modules/projects/entities/project.entity.ts` |
| Table | `projects` |
| Parent FKs | `organization_id`, `workspace_id` (nullable in column but required in practice for workspace work), optional `portfolio_id`, optional `program_id` |
| Child FKs | `work_phases.project_id`, `work_tasks.project_id`, `work_risks.project_id`, `document_instances.project_id`, `project_kpis.project_id`, legacy `tasks.project_id` |
| Row count (local DB) | **0** (non-deleted) |

Team is **`team_member_ids` jsonb** on the project row, not a `project_members` table — ```175:185:zephix-backend/src/modules/projects/entities/project.entity.ts```.

Lifecycle fields: `status` (planning/active/…), `state` (DRAFT/ACTIVE/COMPLETED), `structure_locked`, `health` — ```22:40:zephix-backend/src/modules/projects/entities/project.entity.ts```, ```276:314:zephix-backend/src/modules/projects/entities/project.entity.ts```.

---

### 1.6 Phase (`work_phases`)

| Field | Value |
|-------|--------|
| Entity file | `zephix-backend/src/modules/work-management/entities/work-phase.entity.ts` |
| Table | `work_phases` |
| Parent FK | **Exactly one of** `project_id` **or** `program_id` (CHECK constraint) |
| Child FKs | `work_tasks.phase_id` |
| Row count (local DB) | **0** |

```31:33:zephix-backend/src/modules/work-management/entities/work-phase.entity.ts``` — XOR constraint on project vs program.

---

### 1.7 Task (`work_tasks`)

| Field | Value |
|-------|--------|
| Entity file | `zephix-backend/src/modules/work-management/entities/work-task.entity.ts` |
| Table | `work_tasks` |
| Parent FKs | `organization_id`, `workspace_id`, `project_id`, optional `phase_id`, optional `parent_task_id` |
| Child FKs | `work_tasks.parent_task_id` (subtasks), `task_activities.task_id`, `task_comments`, `task_dependencies` |
| Row count (local DB) | **0** |

Discriminator is **`type`** enum (`TaskType`), not AD-010 `item_type` column — ```89:94:zephix-backend/src/modules/work-management/entities/work-task.entity.ts```. Values: `TASK`, `EPIC`, `MILESTONE`, `BUG`, `PHASE` — ```26:42:zephix-backend/src/modules/work-management/enums/task.enums.ts```.

**Note:** AD-010 `item_type` on `work_tasks` is **not in code** — only in documentation.

---

### 1.8 Subtask

| Field | Value |
|-------|--------|
| Implementation | Same entity/table: `work_tasks` with `parent_task_id` set |
| Separate table? | **No** |
| Row count | Subset of `work_tasks` where `parent_task_id IS NOT NULL` — **0** locally |

```74:75:zephix-backend/src/modules/work-management/entities/work-task.entity.ts```, self-relation ```231:239:zephix-backend/src/modules/work-management/entities/work-task.entity.ts```.

---

### 1.9 Activity

| Concept | Table / entity | Notes |
|---------|----------------|-------|
| **Audit trail for a task** | `task_activities` / `TaskActivity` | Event log (`TASK_CREATED`, `TASK_STATUS_CHANGED`, …) — ```13:39:zephix-backend/src/modules/work-management/entities/task-activity.entity.ts``` |
| **UI label "Activities"** | Route `/projects/:id/tasks`, tab label in `ProjectPageLayout` | Same data as tasks/phases work surface — ```52:52:zephix-frontend/src/features/projects/layout/ProjectPageLayout.tsx``` |
| **Legacy `tasks` table** | `tasks` / deprecated `Task` entity | ```1:6:zephix-backend/src/modules/projects/entities/task.entity.ts``` — do not use for new work |

**Activity is not a work row type** — it is either changelog (`task_activities`) or marketing rename of the Tasks tab.

---

### 1.10 Milestone

| Mechanism | Location |
|-----------|----------|
| Task-shaped milestone | `work_tasks.type = MILESTONE` or `work_tasks.is_milestone = true` — ```134:135:zephix-backend/src/modules/work-management/entities/work-task.entity.ts``` |
| Phase-shaped milestone | `work_phases.is_milestone = true` — ```66:67:zephix-backend/src/modules/work-management/entities/work-phase.entity.ts``` |

No `milestones` table.

---

### 1.11 Document / Artifact (`project_documents`)

| Question | Answer |
|----------|--------|
| `project_documents` table? | **not in code** — grep finds no backend entity/migration |
| Template Center docs | `document_instances`, `doc_templates`, `document_versions` — ```15:18:zephix-backend/src/modules/template-center/documents/entities/document-instance.entity.ts``` |
| Project Documents tab | Uses document workflow API / `ProjectDocumentsTab.tsx` — scoped by `project_id` on instances |

Row count `document_instances` (local): **0**.

---

### 1.12 Risk (`work_risks`)

| Field | Value |
|-------|--------|
| Entity file | `zephix-backend/src/modules/work-management/entities/work-risk.entity.ts` |
| Table | `work_risks` |
| Parent FKs | `organization_id`, `workspace_id`, `project_id` |
| Row count (local DB) | **0** |

API: `WorkRisksController` — workspace-scoped work-management module.

**UI:** App route `/projects/:id/risks` renders **`NotEnabledInProject`** stub — ```324:324:zephix-frontend/src/App.tsx``` — while backend CRUD exists (discrepancy §8).

---

### 1.13 KPI / Goal / OKR

| Artifact | Table | Entity |
|----------|-------|--------|
| KPI catalog | `kpi_definitions` | `KpiDefinitionEntity` — ```16:18:zephix-backend/src/modules/kpis/entities/kpi-definition.entity.ts``` |
| KPI on project | `project_kpis` | `ProjectKpi` — ```14:16:zephix-backend/src/modules/template-center/kpis/entities/project-kpi.entity.ts``` |
| KPI measurements | `kpi_values` | `KpiValue` |
| Project activation list | `projects.active_kpi_ids` (text[]) | ```330:332:zephix-backend/src/modules/projects/entities/project.entity.ts``` |
| **Goal** | — | Sprint **`iterations.goal`** text only — ```42:42:zephix-backend/src/modules/work-management/entities/iteration.entity.ts``` |
| **OKR** | — | **not in code** — only in docs/marketing strings |

Row counts (local): `project_kpis` **0**; `kpi_definitions` not queried (seeded at bootstrap).

---

### 1.14 Template

| Kind | Table | Entity / definition source |
|------|-------|---------------------------|
| **Project templates (canonical)** | `templates` | `Template` — scopes `SYSTEM` \| `ORG` \| `WORKSPACE` — ```11:68:zephix-backend/src/modules/templates/entities/template.entity.ts``` |
| System content defs | (in-memory + copied to `templates` rows) | `SYSTEM_TEMPLATE_DEFS` — ```303:303:zephix-backend/src/modules/templates/data/system-template-definitions.ts``` |
| Template Center (parallel module) | `template_definitions`, `template_versions`, `template_components`, `template_policies` | Under `modules/template-center/templates/entities/` |
| Doc templates | `doc_templates` | `DocTemplate` |
| Legacy project template | `project_templates` | `ProjectTemplate` entity (legacy path) |
| Dashboard templates | `dashboard_templates` | separate from project instantiation |

**There is no `system_templates` or `workspace_templates` table** — workspace templates are `templates` rows with `template_scope = 'WORKSPACE'`.

Row count `templates` (local): **3** (likely partial system seed).

---

### 1.15 Intake Form

| Field | Value |
|-------|--------|
| Entity file | `zephix-backend/src/pm/entities/intake-form.entity.ts` |
| Table | `intake_forms` |
| Parent FK | `organizationId` (camelCase column mapping — ```108:109:zephix-backend/src/pm/entities/intake-form.entity.ts```) |
| Submissions | `intake_submissions` — `IntakeSubmission` entity |
| Row count (local DB) | **0** |

Public UI: `/intake/:slug` — ```250:250:zephix-frontend/src/App.tsx```.

---

### 1.1–1.15 ASCII hierarchy (FK truth)

```
Organization
├── user_organizations (user_id, organization_id, role)
├── workspaces (organization_id) [soft-delete: deleted_at]
│   ├── workspace_members (workspace_id, user_id, organization_id, role)
│   ├── workspace_module_configs (workspace_id, module_key)
│   ├── portfolios (organization_id, workspace_id)
│   │   ├── portfolio_projects (portfolio_id, project_id)  ← many-to-many link
│   │   └── programs (organization_id, workspace_id, portfolio_id)  ← portfolio required
│   │       └── work_phases (program_id)  ← program-level phases (project_id NULL)
│   └── projects (organization_id, workspace_id, optional portfolio_id, optional program_id)
│       ├── work_phases (project_id)  ← XOR: project_id OR program_id, not both
│       ├── work_tasks (project_id, optional phase_id, optional parent_task_id)
│       │   └── work_tasks (parent_task_id)  ← subtasks, same table
│       ├── work_risks (project_id)
│       ├── project_statuses (per-project status definitions)
│       ├── document_instances (project_id)  ← Template Center documents
│       ├── project_kpis → kpi_definitions
│       └── team_member_ids (jsonb on projects row — not a child table)
├── templates (organization_id nullable for SYSTEM; workspace_id for WORKSPACE scope)
├── intake_forms (organizationId)
└── dashboards, notifications, favorites, … (org and/or workspace scoped)
```

**Project can link to portfolio/program without going through `portfolio_projects` join** — `projects.portfolio_id` and `projects.program_id` are direct optional FKs — ```213:217:zephix-backend/src/modules/projects/entities/project.entity.ts```. Join table is an **additional** association path.

---

## SECTION 2 — WHAT EACH CONCEPT ACTUALLY DOES

### 2.1 Organization

An organization is the **billing and RBAC root**: it owns workspaces, stores plan metadata (`plan_code`, `plan_status`), and links users through `user_organizations`. Platform role for JWT is derived from `user_organizations.role` (normalized to ADMIN/MEMBER/VIEWER) — ```19:23:zephix-backend/src/common/auth/platform-roles.ts```. Users do not “belong” to workspaces without both org membership and `workspace_members` rows (except ADMIN bypass — §4).

### 2.2 Workspace

A workspace is the **container for delivery work** inside one org: projects, portfolios, programs, phases, tasks, risks, and workspace-scoped templates. Access is via `workspace_members.role` (`workspace_owner`, `workspace_member`, `workspace_viewer`, plus project-scoped labels `delivery_owner` / `stakeholder` stored on the same table — ```94:99:zephix-backend/src/modules/workspaces/entities/workspace.entity.ts```). `complexity_mode` gates product behavior (LEAN/STANDARD/GOVERNED) — ```176:189:zephix-backend/src/modules/workspaces/entities/workspace.entity.ts```. Organization is the tenant boundary; workspace is the operational boundary for project data.

### 2.3 Program

A program groups **projects under a portfolio** within one workspace. It is not cross-workspace. Every program row requires `portfolio_id` — ```60:65:zephix-backend/src/modules/programs/entities/program.entity.ts```. Projects may reference `program_id` for rollup/analytics. Programs can own **`work_phases`** when `project_id` is null — phase CHECK constraint.

### 2.4 Portfolio

**In code.** A portfolio is a workspace-scoped collection with governance defaults (`cost_tracking_enabled`, `baselines_enabled`, etc.) — ```79:98:zephix-backend/src/modules/portfolios/entities/portfolio.entity.ts```. It contains programs and links to projects via `portfolio_projects` and/or `projects.portfolio_id`. It does not span workspaces.

### 2.5 Project

A project is the **primary unit of execution**: phases, tasks, documents, KPIs, risks (backend), and tab configuration (`column_config.visibleTabs`). Created manually, via template instantiation (`instantiate-v5_1`), or duplicate-via-template flow. Lifecycle: default `state = DRAFT`, `status = planning` — ```276:283:zephix-backend/src/modules/projects/entities/project.entity.ts```. Template instantiation sets methodology, governance flags, `team_member_ids = [creator]`, and seeds phases/tasks — ```248:311:zephix-backend/src/modules/templates/services/templates-instantiate-v51.service.ts```.

### 2.6 Phase vs Activity vs Task vs Subtask vs Milestone

| Term | Code truth |
|------|------------|
| **Phase** | Row in `work_phases`; ordered by `sort_order`; optional `is_milestone` |
| **Task** | Row in `work_tasks`; `type` enum; optional `phase_id`, `parent_task_id` |
| **Subtask** | `work_tasks` with `parent_task_id` |
| **Activity (UI)** | Tab label for `/tasks`; renders `WaterfallTable` or `TaskListSection` — ```16:16:zephix-frontend/src/features/projects/tabs/ProjectTasksTab.tsx``` |
| **Activity (data)** | `task_activities` audit rows, not work items |
| **Milestone** | Flag/type on phase or task, not separate entity |

Reserved `TaskType.PHASE` exists for future unified hierarchy but **`work_phases` remains source of truth** — ```31:38:zephix-backend/src/modules/work-management/enums/task.enums.ts```.

### 2.7 Template — instantiation path

| Step | What happens |
|------|----------------|
| **Entry** | `POST /templates/:id/instantiate-v5_1` → `TemplatesController.instantiateV51` → `TemplatesInstantiateV51Service.instantiateV51` — ```64:78:zephix-backend/src/modules/templates/services/templates-instantiate-v51.service.ts``` |
| **Auth** | Requires `x-workspace-id`; `workspaceAccessService.canAccessWorkspace` — ```88:100``` |
| **Load template** | From `templates` where scope SYSTEM (org null), ORG (org match), or WORKSPACE (org + workspace match) — ```118:128``` |
| **Create project** | Unless `dto.projectId` (DRAFT only): insert `projects` with governance flags, `columnConfig.visibleTabs` from `SYSTEM_TEMPLATE_DEFS` match on `templateCode`, `activeKpiIds`, `team_member_ids` — ```248:311``` |
| **Normalize structure** | `normalizeTemplateStructure(template)` — phases + `taskTemplates` from JSON on template row — ```354:359``` |
| **Insert phases** | `work_phases` rows with `source_template_phase_id`, reporting keys — §5 in same file (~429+) |
| **Insert tasks** | `work_tasks` per template task definitions — same service |
| **Statuses** | Post-tx `projectStatusService.seedFromTemplate` using `statusGroups` from system def — ```102:104``` (comment at top of service) |
| **Risks** | Optional `riskPresets` via `workRisksService` when defined |
| **User sees** | New project in workspace with tab set from `defaultTabs`; Activities/Board/Gantt depending on `visibleTabs`; DRAFT state until started |

**Copied vs referenced:** Template row is **referenced** by `projects.template_id` / snapshot fields; phase/task **content is copied** into `work_phases` / `work_tasks`. System definitions in TS are **seeded** into `templates` at boot — `SystemBootstrapService` — ```46:70:zephix-backend/src/bootstrap/system-bootstrap.service.ts```.

**Customer UI:** `TemplateCenter` at `/templates`, or `TemplateCenterModal` from workspace sidebar — ```12:14:zephix-frontend/src/pages/templates/TemplateRouteSwitch.tsx```.

### 2.8 Artifact

**Marketing / template preview only** in `SystemTemplateDef.requiredArtifacts` — display strings, **no artifact engine** — ```117:121:zephix-backend/src/modules/templates/data/system-template-definitions.ts```.

Runtime document model = **`document_instances`** (+ `doc_templates`), project-scoped — ```22:23:zephix-backend/src/modules/template-center/documents/entities/document-instance.entity.ts```. No entity named `Artifact`.

### 2.9 Intake Form

Org-scoped form definition (`formSchema` jsonb) with public slug. Submit creates **`intake_submissions`** (see `intake-submission.entity.ts`). May reference `targetWorkflowId` → `workflow_templates` — ```131:136:zephix-backend/src/pm/entities/intake-form.entity.ts```. **unclear — see intake submission handler** for whether a project is auto-created on submit without reading `pm` intake controller in this pass.

### 2.10 KPI / Goal / OKR

- **KPI:** `kpi_definitions` + per-project `project_kpis` + `kpi_values`; UI tab `ProjectKpisTab` at `/projects/:id/kpis`.
- **Goal:** sprint iteration field only, not strategic goals entity.
- **OKR:** **not in code** — only in documentation.

---

## SECTION 3 — TEMPLATES — THE FULL TRUTH

### 3.1 Template kinds

| Kind | Table(s) | Definition location | Seeding | User instantiation |
|------|----------|---------------------|---------|-------------------|
| **System project template** | `templates` (`is_system`, `template_scope=SYSTEM`, `organization_id` null) | `system-template-definitions.ts` | `SystemBootstrapService` on boot; `scripts/seed-system-templates.ts` | Template Center → `POST .../instantiate-v5_1` |
| **Org project template** | `templates` (`template_scope=ORG`) | Admin / save-as-template / clone | Runtime CRUD | Same instantiate endpoint |
| **Workspace project template** | `templates` (`template_scope=WORKSPACE`, `workspace_id` set) | Save-as-template from project | `projectsService.saveProjectAsTemplate` | Same |
| **Template Center definitions** | `template_definitions`, versions, components | `modules/template-center/` | Migrations + admin apply | `POST /admin/templates/:id/apply` (frontend `ProjectCreateModal` legacy path) |
| **Document templates** | `doc_templates` | template-center module | Seed / admin | Document lifecycle services |
| **Dashboard templates** | `dashboard_templates` | dashboards module | Separate | Dashboard builder |
| **Intake / workflow templates** | `workflow_templates` | `pm/entities/workflow-template.entity.ts` | PM module | Intake linkage |
| **Methodology templates** | — | **unclear** — `workflow_templates` vs `templates.methodology` field | — | — |

**Customer Template Center UI:** `/templates` → `views/templates/TemplateCenter.tsx` via `TemplateRouteSwitch.tsx`.

**Admin Governance Templates:** `/administration/templates` → `AdministrationTemplatesPage.tsx` — ```71:71:zephix-frontend/src/features/administration/constants.ts```.

### 3.2 PROJECT templates — `SYSTEM_TEMPLATE_DEFS` table

Source file: `zephix-backend/src/modules/templates/data/system-template-definitions.ts` (15 definitions; comment says 12 — **stale comment**).

**Active instantiable codes** (`ACTIVE_TEMPLATE_CODES`): `pm_waterfall_v2`, `pm_agile_v1`, `pm_hybrid_v1`, `sw_scrum_delivery_v1`, `sw_kanban_delivery_v1`, `sw_release_planning_v1`, `roadmap_execution_v1`, `product_discovery_v1`, `product_launch_v1`, `startup_mvp_build_v1`, `startup_gtm_v1` — ```1255:1269:zephix-backend/src/modules/templates/data/system-template-definitions.ts```.

| template_id | methodology | default_tabs | seed_phases | seed_tasks | default custom fields (columnConfig keys) | default statuses | status |
|-------------|-------------|--------------|-------------|------------|-------------------------------------------|------------------|--------|
| pm_waterfall_v1 | waterfall | overview, plan, gantt, tasks, budget, change-requests, documents, kpis, risks, resources | 5 | 20 | 0 | 7 | populated / **coming-soon** |
| pm_waterfall_v2 | waterfall | overview, tasks, gantt, board, documents, risks | 22 | 16 | 0 | 7 | populated / **ACTIVE** |
| pm_agile_v1 | agile | overview, tasks, board, documents | 3 | 6 | 0 | 6 | populated / **ACTIVE** |
| pm_hybrid_v1 | hybrid | overview, plan, tasks, board, budget, change-requests, kpis, risks | 4 | 5 | 0 | 6 | populated / **ACTIVE** |
| pm_risk_register_v1 | kanban | overview, board, tasks, kpis, risks, documents | 1 | 3 | 0 | 6 | populated / coming-soon |
| product_discovery_v1 | agile | overview, tasks, board, documents, kpis | 3 | 6 | 0 | 6 | populated / **ACTIVE** |
| product_launch_v1 | agile | overview, tasks, board, kpis, risks, documents | 4 | 6 | 0 | 6 | populated / **ACTIVE** |
| roadmap_execution_v1 | hybrid | overview, plan, tasks, board, kpis, risks | 4 | 5 | 0 | 6 | populated / **ACTIVE** |
| sw_scrum_delivery_v1 | agile | overview, tasks, board, documents | 3 | 6 | 0 | 6 | populated / **ACTIVE** |
| sw_kanban_delivery_v1 | kanban | overview, board, documents | 1 | 3 | 0 | 0 (falls back to 7 defaults at seed) | partially defined / **ACTIVE** |
| sw_release_planning_v1 | waterfall | overview, plan, gantt, tasks, change-requests, documents, kpis, risks | 5 | 6 | 0 | 0 | populated / **ACTIVE** |
| ops_service_improvement_v1 | agile | overview, tasks, board, kpis, risks | 4 | 5 | 0 | 0 | populated / coming-soon |
| ops_readiness_v1 | waterfall | overview, plan, gantt, tasks, budget, change-requests, documents, kpis, risks, resources | 5 | 6 | 0 | 0 | populated / coming-soon |
| startup_mvp_build_v1 | agile | overview, tasks, board, kpis | 4 | 5 | 0 | 0 | populated / **ACTIVE** |
| startup_gtm_v1 | agile | overview, tasks, board, kpis, risks, documents | 4 | 6 | 0 | 0 | populated / **ACTIVE** |

### 3.3 ARTIFACT templates

**Not implemented** as a template kind or table. Preview-only `requiredArtifacts[]` on system defs. Document templates (`doc_templates`) are separate and not labeled “artifact templates” in code.

### 3.4 “Save as Template”

| Action | Storage |
|--------|---------|
| Project → Save as Template | `POST /projects/:id/save-as-template` → `projectsService.saveProjectAsTemplate` → new row in **`templates`** with **`template_scope: WORKSPACE`** — ```437:458:zephix-backend/src/modules/projects/projects.controller.ts``` |
| Same table as system? | **Yes** — single `templates` table, distinguished by `template_scope`, `is_system`, `organization_id`, `workspace_id` |
| Transient duplicate | Same, then archived after instantiate — ```504:527:zephix-backend/src/modules/projects/projects.controller.ts``` |

---

## SECTION 4 — TENANCY AND SCOPING

### 4.1 Entities with `organization_id`

All major domain entities in `zephix-backend/src/modules/**` and `organizations/**` — including: `workspaces`, `projects`, `work_phases`, `work_tasks`, `work_risks`, `programs`, `portfolios`, `portfolio_projects`, `workspace_members`, `templates` (nullable for SYSTEM), `dashboards`, `notifications`, `custom_fields`, `governance_*`, `resources/*`, etc. (see grep inventory — 80+ entity files).

**Exception pattern:** `templates` SYSTEM rows have `organization_id = null` — ```115:121:zephix-backend/src/modules/templates/services/templates-instantiate-v51.service.ts```.

### 4.2 Entities with `workspace_id`

Workspace-scoped delivery data: `projects`, `work_phases`, `work_tasks`, `work_risks`, `programs`, `portfolios`, `workspace_members`, `workspace_module_configs`, `iterations`, most work-management tables, `templates` (WORKSPACE scope only), etc.

**Not workspace-scoped:** `organizations`, `user_organizations`, `intake_forms` (org only), SYSTEM `templates`.

### 4.3 Entities with `project_id`

`work_tasks`, `work_phases` (when not program-level), `work_risks`, `project_statuses`, `document_instances`, `project_kpis`, `task_*` children, legacy `tasks`, `schedule_baselines`, etc.

### 4.4 TenantAwareRepository coverage

**No — not every table uses `TenantAwareRepository`.** Many hot-path services inject standard `@InjectRepository` / `manager.getRepository`, e.g. `TemplatesInstantiateV51Service` — ```42:51:zephix-backend/src/modules/templates/services/templates-instantiate-v51.service.ts```.

Repo policy: `scripts/check-tenancy-bypass.sh` flags `@InjectRepository`, `getRepository`, `createQueryBuilder` under `src/modules/**` (exceptions: `tenancy/`, `database/`, migrations).

Tenancy enforcement is **mixed**: `TenantAwareRepository` + guards (`RequireWorkspaceRole`, `GetTenant`) + manual `organizationId`/`workspaceId` WHERE clauses in services.

### 4.5 Cross-workspace concepts

| Concept | Spans workspaces? |
|---------|-------------------|
| Organization | Yes (by design) |
| Program | **No** — `workspace_id` required |
| Portfolio | **No** |
| Project | **No** |
| Risk | **No** — scoped to project/workspace/org |
| Template WORKSPACE scope | **No** — tied to one `workspace_id` |
| Template ORG scope | Usable in any workspace in org |
| ADMIN platform role | Implicit `workspace_owner` in **all** workspaces in org — ```61:64:docs/architecture/role-taxonomy-mvp.md``` |

---

## SECTION 5 — ROLES AND PERMISSIONS

### 5.1 Platform-level roles (code)

```19:23:zephix-backend/src/common/auth/platform-roles.ts```

| Enum | Meaning |
|------|---------|
| `ADMIN` | Org admin; workspace create; treated as workspace_owner everywhere |
| `MEMBER` | Paid participant |
| `VIEWER` | Guest / read-heavy |

Stored in `user_organizations.role` as legacy strings `owner|admin|member|viewer` — ```35:40:zephix-backend/src/organizations/entities/user-organization.entity.ts```.

### 5.2 Workspace-level roles (code)

```94:99:zephix-backend/src/modules/workspaces/entities/workspace.entity.ts```

`workspace_owner`, `workspace_member`, `workspace_viewer`, `delivery_owner`, `stakeholder` on `workspace_members.role`.

### 5.3 `project_members` table?

**No.** Confirmed: no migration/entity; team is `projects.team_member_ids` jsonb + `project_manager_id` + `delivery_owner_user_id`.

### 5.4 Frontend “capability map”

| Artifact | Path |
|----------|------|
| **Implemented tokens** | `zephix-frontend/src/utils/access/useEffectiveRole.ts` — type `EffectiveAction` |
| **Taxonomy (38 tokens)** | `docs/architecture/role-taxonomy-mvp.md` §4 — ```318:359:docs/architecture/role-taxonomy-mvp.md``` |
| **RoleGate consumer** | `zephix-frontend/src/components/access/RoleGate.tsx` |

`useEffectiveRole` implements **19** tokens; taxonomy documents **38**. Not 42.

### 5.5 Backend capability guards

**Pattern-based**, not dotted capability tokens:

- `RequireWorkspaceRole` / `RequireWorkspaceRoleGuard` — ```zephix-backend/src/modules/workspaces/guards/require-workspace-role.guard.ts```
- `RequireProjectWorkspaceRoleGuard` — project routes
- `WorkspaceAccessService.getEffectiveWorkspaceRole` — ```docs/architecture/role-taxonomy-mvp.md``` §2.3
- `RequireOrgRole(PlatformRole.ADMIN)` on select admin endpoints

No `CapabilityGuard` enum matching frontend `task.edit` strings.

### 5.6 Counts

| Set | Count |
|-----|-------|
| Taxonomy §4 capability tokens | **38** |
| `useEffectiveRole` `EffectiveAction` implemented | **19** |
| Backend dotted-token enforcement | **0** (role/workspace guards instead) |

---

## SECTION 6 — KEY UI SURFACES

### 6.1 Sidebar (left rail) — post PR #304 / current `Sidebar.tsx`

**Order (top → bottom):**

1. Brand → `/inbox`
2. **Home** → `/home` — ```462:475:zephix-frontend/src/components/shell/Sidebar.tsx```
3. **Inbox** (if `can("inbox.view")`) → `/inbox`
4. **My Work** (if paid) → `/my-work`
5. Divider
6. **Favorites** (if count > 0)
7. **Workspaces** section → `SidebarWorkspaces` tree (projects nested under workspace; no top-level Projects link — ```567:575```)
8. **Dashboards** section (if `can("dashboard.view.published")`)

**Removed / not in sidebar:** top-level Templates link, Administration tree (Administration is profile menu per ADR-003).

### 6.2 Workspace home / dashboard

| Route | Component |
|-------|-----------|
| `/workspaces/:workspaceId/home` | `pages/workspaces/WorkspaceHomePage.tsx` |
| `/w/:slug/home` | `views/workspaces/WorkspaceHomeBySlug.tsx` |

Workspace summary, notes (`home_notes`), dashboard widgets from `dashboard_config` — workspace entity ```191:209:zephix-backend/src/modules/workspaces/entities/workspace.entity.ts```.

### 6.3 Project Overview tab

Route: `/projects/:projectId` (index). Component: `ProjectOverviewTab.tsx`. Summary cards, KPI snapshot, health — uses `ProjectContext` overview payload.

### 6.4 Project Tasks / Activities tab

Route: `/projects/:projectId/tasks`. Component: `ProjectTasksTab.tsx` (label **Activities** in tab bar). Waterfall table vs task list by `project.methodology`.

### 6.5 Project Board tab

Route: `/projects/:projectId/board`. Component: `ProjectBoardTab.tsx`. Kanban by status columns.

### 6.6 Project Gantt tab

Route: `/projects/:projectId/gantt`. Component: `ProjectGanttTab.tsx`.

### 6.7 Project Documents tab

Route: `/projects/:projectId/documents`. Component: `ProjectDocumentsTab.tsx`. Document instances / workflow.

### 6.8 Project Risks tab

Tab may appear in `visibleTabs` from template — **route stub**: `NotEnabledInProject` — ```324:324:zephix-frontend/src/App.tsx```. `ProjectRisksTab.tsx` exists but is **not wired** to this route.

### 6.9 Template Center (customer)

Route: `/templates` → `TemplateRouteSwitch` → `views/templates/TemplateCenter.tsx`. Also modal from workspace sidebar. Instantiate via templates API / `instantiate-v5_1`.

### 6.10 Admin Console → Governance → Templates

Route: `/administration/templates`. Component: `AdministrationTemplatesPage.tsx`. API: `/admin/templates` — org-admin template governance, not the same UX as customer Template Center.

### 6.11 Admin Console → Resources → Capacity

Nav: `ADMINISTRATION_NAV_GROUPS` → Capacity → `/capacity` — ```79:79:zephix-frontend/src/features/administration/constants.ts```. Page: `features/capacity/CapacityPage.tsx`.

### 6.12 Admin Console → Resources → Workload Heatmap

Nav item uses `usesActiveWorkspaceHeatmap` → `/workspaces/{activeWorkspaceId}/heatmap`. Page: `ResourceHeatmapPage.tsx` — ```338:338:zephix-frontend/src/App.tsx```.

### 6.13 Inbox

Route: `/inbox`. Component: `pages/InboxPage.tsx`. Default post-login for authenticated users — ```266:267:zephix-frontend/src/App.tsx```.

### 6.14 My Work

Route: `/my-work` (paid). Component: `pages/my-work/MyWorkPage.tsx`. Org-scoped work queue.

### 6.15 OrgDashboard

Route: `/org-dashboard` (admin inline guard). Component: `features/org-dashboard/OrgDashboardPage.tsx`. Read-only org analytics — ```1:6:zephix-frontend/src/features/org-dashboard/OrgDashboardPage.tsx```.

---

## SECTION 7 — KEY GLOSSARY

| Term | Definition (code-grounded) | Entity / table | Confusion notes |
|------|---------------------------|----------------|-----------------|
| Organization | Top-level tenant; plan + settings; users via `user_organizations` | `organizations` | Not the same as “org admin user” |
| Workspace | Container for projects/portfolios/programs inside one org | `workspaces` | ADR: workspace is the container |
| Program | Named grouping under a **portfolio** in one workspace | `programs` | Requires portfolio_id |
| Portfolio | Workspace collection with governance defaults | `portfolios` | + `portfolio_projects` join |
| Project | Delivery container: phases, tasks, docs, KPIs | `projects` | `team_member_ids` ≠ project_members table |
| Phase | Ordered stage; project **or** program parent | `work_phases` | XOR FK constraint |
| Task | Work row in a project | `work_tasks` | `type` enum, not `item_type` |
| Subtask | Task with `parent_task_id` | `work_tasks` | Same table |
| Activity | UI label for tasks tab OR audit log | `task_activities` / route `tasks` | Not a work entity |
| Milestone | `is_milestone` or `type=MILESTONE` | `work_phases` / `work_tasks` | Two mechanisms |
| Template | Reusable project structure row | `templates` | scopes SYSTEM/ORG/WORKSPACE |
| Project Template | Template used to create projects | `templates` (`kind` project) | Same table |
| Artifact Template | **not implemented** | — | Preview strings only |
| Artifact | **not implemented** as entity | — | Use Document |
| Document | Template Center doc instance | `document_instances` | Not `project_documents` |
| Risk | Project risk register row | `work_risks` | UI route disabled |
| KPI | Measurable metric definition + project link | `kpi_definitions`, `project_kpis` | |
| Goal | Sprint goal text | `iterations.goal` | Not strategic goals |
| OKR | **not in code** | — | Docs only |
| Capability | Dotted permission token for UI | taxonomy.md §4 | 38 defined, 19 in `useEffectiveRole` |
| Permission | Legacy json on `user_organizations` | `user_organizations.permissions` | Not primary RBAC |
| Role (platform) | ADMIN / MEMBER / VIEWER | JWT + `user_organizations.role` | VIEWER = Guest |
| Role (workspace) | workspace_owner / member / viewer / delivery_owner / stakeholder | `workspace_members.role` | DO/stakeholder on wrong table per audits |
| Status Group | Template `statusGroups` → `project_statuses` | `project_statuses` | Not org-wide |
| Custom Field | EAV-style field defs | `custom_fields` | Values on tasks — **unclear** JSON column name in this pass |
| View | Project tab or board/table/gantt surface | `column_config.visibleTabs` | ADDABLE_VIEW_TAB_OPTIONS |
| Tab | Project shell route segment | `ProjectPageLayout` + App routes | Hidden tabs → NotEnabledInProject |
| Complexity Mode | Workspace tier LEAN/STANDARD/GOVERNED | `workspaces.complexity_mode` | Legacy simple/advanced |
| LEAN | Enum value `lean` | workspace column | Was `simple` |
| STANDARD | Enum value `standard` | workspace column | |
| GOVERNED | Enum value `governed` | workspace column | Was `advanced`; gates Programs per comments |
| Policy | Governance rule configuration | `governance_rules` module | Admin Policies page |
| Governance Rule | Evaluated rule set | `governance_rule_sets`, evaluations | |
| Intake Form | Public org form | `intake_forms` | `/intake/:slug` |
| Workspace Template | Template with WORKSPACE scope | `templates` | No separate table |

---

## SECTION 8 — WHAT'S COMMON BUT WRONG

| Where it's said | What it claims | What code actually shows |
|-----------------|----------------|---------------------------|
| AD-010 / CANONICAL (external) | `work_tasks.item_type` discriminator (task/story/bug/…) | **No `item_type` column** — uses `type` enum `TaskType` — ```89:94:zephix-backend/src/modules/work-management/entities/work-task.entity.ts``` |
| Handoff / MVP shell copy | Project Risks tab is a live surface | Route renders **`NotEnabledInProject`** — ```324:324:zephix-frontend/src/App.tsx``` while `WorkRisksController` + `work_risks` table exist |
| Docs / memory “42 capability toggles” | 42 capabilities | Taxonomy §4 lists **38**; frontend implements **19** in `useEffectiveRole.ts` |
| `project_members` table | Per-project membership | **No table** — `team_member_ids` jsonb on `projects` — ```175:185:zephix-backend/src/modules/projects/entities/project.entity.ts``` |
| `system_templates` / `workspace_templates` tables | Separate template stores | **Single `templates` table** with `template_scope` — ```57:68:zephix-backend/src/modules/templates/entities/template.entity.ts``` |
| `project_documents` table | Project file storage | **not in code** — use `document_instances` |
| “Activity” = work item type | Activities are tasks | **Activities tab** = tasks UI; **Activity** entity = audit log |
| Sidebar Templates link (older UX) | Templates in left rail | **Not in current Sidebar** — Template Center via workspace modal or `/templates` |
| `pm_waterfall_v1` is primary Waterfall | Default waterfall template | **`pm_waterfall_v2` is active**; v1 is coming-soon — ```1255:1269:zephix-backend/src/modules/templates/data/system-template-definitions.ts``` |
| Row counts in staging | Populated multi-tenant data | Local `.env.backup` DB: **0 workspaces** — not verified against Railway staging |

---

## Appendix A — Legacy / parallel stacks

| Stack | Status |
|-------|--------|
| `tasks` table + `Task` entity | **deprecated** — ```1:6:zephix-backend/src/modules/projects/entities/task.entity.ts``` |
| `modules/work-items/` | Separate `work_items` entities — parallel to `work_tasks`; **not referenced from work-management module** in grep |
| `modules/tasks/` | Legacy task module |
| Template Center `template_definitions` vs `templates` | **Dual model** — AD-029 unification in progress |

---

## Appendix B — Files referenced most

- Entities: `organization.entity.ts`, `workspace.entity.ts`, `project.entity.ts`, `work-phase.entity.ts`, `work-task.entity.ts`, `work-risk.entity.ts`, `program.entity.ts`, `portfolio.entity.ts`, `template.entity.ts`
- Instantiation: `templates-instantiate-v51.service.ts`, `system-template-definitions.ts`
- RBAC: `platform-roles.ts`, `role-taxonomy-mvp.md`, `useEffectiveRole.ts`
- Shell: `Sidebar.tsx`, `App.tsx`, `ProjectPageLayout.tsx`

---

*End of mental model. Re-verify row counts and intake submission behavior against Railway staging when credentials are available.*
