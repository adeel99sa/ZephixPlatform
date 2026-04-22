# Trash Dependency Matrix

> Source of truth for entity graph relationships that affect soft-delete, restore, and purge behavior.
> Last updated: 2026-04-05

## How to read this matrix

- **Delete strategy**: `soft` = has `deletedAt` column; `cascade` = DB CASCADE handles it; `restrict` = FK blocks parent delete; `orphan` = no FK, becomes stale reference; `none` = no delete support
- **Purge order**: Lower number = delete first during parent purge. Entities at the same level can be deleted in any order.
- **Active query filter**: Whether active-view queries MUST filter `deletedAt IS NULL` for this entity

---

## Project Dependency Graph

| # | Entity | Table | Owning Module | FK to Project | onDelete | Has deletedAt | Delete Strategy | Restore Strategy | Purge Order | Active Query Filter | Known Orphan Risk | Notes |
|---|--------|-------|---------------|---------------|----------|---------------|-----------------|------------------|-------------|--------------------|--------------------|-------|
| 1 | **Project** | `projects` | projects | (self) | - | YES | soft | explicit | 9 (last) | YES | Parent workspace may be trashed | Root entity |
| 2 | WorkTask | `work_tasks` | work-management | `project_id` | RESTRICT | YES | soft (independent) | same-batch or explicit | 8 | YES | - | Must delete before project; has own trash lifecycle |
| 3 | TaskDependency | `work_task_dependencies` | work-management | via WorkTask | CASCADE (from task) | No | cascade (via task) | none | 1 | No | - | Auto-deleted when predecessor/successor task deleted |
| 4 | TaskComment | `task_comments` | work-management | via WorkTask | CASCADE (from task) | No | cascade (via task) | none | 1 | No | - | Auto-deleted when parent task deleted |
| 5 | TaskActivity | `task_activities` | work-management | via WorkTask | SET NULL (from task) | No | orphan (nulled) | none | - | No | `work_task_id` set to NULL on task delete | Audit trail preserved |
| 6 | WorkPhase | `work_phases` | work-management | `project_id` | CASCADE | YES | cascade (via project) | same-batch | - | YES | - | DB CASCADE handles purge; has own soft-delete too |
| 7 | Iteration | `iterations` | work-management | `project_id` | CASCADE | No | cascade (via project) | none | - | No | - | DB CASCADE handles purge |
| 8 | WorkRisk | `work_risks` | work-management | `project_id` | **RESTRICT** | YES | soft (independent) | same-batch or explicit | 7 | YES | **Blocks project hard-delete if not cleaned first** | Must explicitly delete before project purge |
| 9 | PhaseGateDefinition | `phase_gate_definitions` | work-management | `project_id` | **RESTRICT** | YES | soft (independent) | none | 5 | YES | **Blocks project hard-delete if not cleaned first** | Must explicitly delete before project purge |
| 10 | GateApprovalChain | `gate_approval_chains` | work-management | via PhaseGateDefinition | CASCADE (from gate def) | YES | cascade (via gate def) | none | - | No | - | Auto-deleted when gate definition deleted |
| 11 | WorkResourceAllocation | `work_resource_allocations` | work-management | `project_id` | **RESTRICT** | No | restrict | none | 6 | No | **Blocks project hard-delete if not cleaned first** | Must explicitly delete before project purge |
| 12 | ScheduleBaseline | `schedule_baselines` | work-management | `project_id` (column) | **none** (verified) | No | orphan | none | - | No | Orphan rows on project purge | No DB FK, no entity FK |
| 13 | EarnedValueSnapshot | `earned_value_snapshots` | work-management | `project_id` (column) | **none** (verified) | No | orphan | none | - | No | Orphan rows on project purge | No DB FK, no entity FK |
| 14 | ProjectView | `project_views` | projects | `project_id` | CASCADE | No | cascade (via project) | none | - | No | - | DB CASCADE handles purge |
| 15 | ProjectBudget | `project_budgets` | budgets | `project_id` (column) | **none** (verified) | No | orphan | none | - | No | Orphan rows on project purge | No DB FK, no entity FK |
| 16 | ChangeRequest | `change_requests` | change-requests | `project_id` (column) | **none** (verified) | No | orphan | none | - | No | Orphan rows on project purge | No DB FK, no entity FK |
| 17 | ProjectKpiConfig | `project_kpi_configs` | kpis | `project_id` (column) | CASCADE (via kpi_definition) | No | cascade (via kpi_definition) | none | - | No | - | FK is to kpi_definitions, not projects |
| 18 | ProjectKpiValue | `project_kpi_values` | kpis | `project_id` (column) | CASCADE (via kpi_definition) | No | cascade (via kpi_definition) | none | - | No | - | FK is to kpi_definitions, not projects |
| 19 | StatusReport | `status_reports` | pm/status-reporting | `project_id` (column) | **none** (verified) | No | orphan | none | - | No | Orphan rows on project purge | FK intentionally removed (circular dep) |
| 20 | PortfolioProject | `portfolio_projects` | portfolios | `project_id` | **CASCADE** (verified) | No | cascade (via DB) | none | - | No | - | DB CASCADE handles purge |
| 21 | RagIndex | `rag_index` | knowledge-index | `project_id` | CASCADE | No | cascade (via project) | none | - | No | - | DB CASCADE handles purge |
| 22 | MaterializedProjectMetrics | `materialized_project_metrics` | analytics | `project_id` | CASCADE | No | cascade (via project) | none | - | No | - | DB CASCADE handles purge |
| 23 | BRD | `brds` | brd | `project_id` (column) | **none** (verified) | No | orphan | none | - | No | Orphan rows on project purge | No DB FK, no entity FK |
| 24 | Attachment | `attachments` | attachments | `parentId` (polymorphic, no FK) | none | YES | orphan | none | - | No | Stale reference to deleted task/project | See Polymorphic Orphan Policy below |
| 25 | Favorite | `favorites` | favorites | `itemId` (polymorphic, no FK) | none | No | orphan | none | - | No | Stale favorite pointing to deleted project | See Polymorphic Orphan Policy below |
| 26 | Notification | `notifications` | notifications | none (no project FK) | - | No | - | - | - | No | - | Not project-scoped |
| 27 | Document | `documents` | documents | `project_id` (column, no FK) | none | No | orphan | none | - | No | Stale reference | No DB FK |

### Project Purge Order (Explicit)

When hard-deleting a project, execute in this order within a single transaction:

```
MUST DELETE (RESTRICT FK — purge fails without these):
1. work_resource_allocations (RESTRICT FK → project)
2. phase_gate_definitions    (RESTRICT FK → project; cascades to gate_approval_chains)
3. work_risks                (RESTRICT FK → project)
4. work_tasks                (RESTRICT FK → project; cascades to task_dependencies, task_comments)

THEN DELETE PROJECT:
5. project                   (DB CASCADE handles: phases, iterations, views, rag_index,
                              materialized_project_metrics, portfolio_projects)

ORPHAN DATA (no FK — won't block purge, but accumulates):
- schedule_baselines         (no FK verified — orphan rows remain)
- earned_value_snapshots     (no FK verified — orphan rows remain)
- project_budgets            (no FK verified — orphan rows remain)
- change_requests            (no FK verified — orphan rows remain)
- status_reports             (no FK verified, intentionally removed — orphan rows remain)
- brds                       (no FK verified — orphan rows remain)
- attachments                (polymorphic parentId — orphan rows remain)
- favorites                  (polymorphic itemId — filtered at query time)
- documents                  (no FK — orphan rows remain)
```

### Project Restore Order

```
1. Restore project (clear deletedAt)
2. Restore work_tasks where deletedAt matches project's original deletedAt (same-batch)
3. Restore work_risks where deletedAt matches project's original deletedAt (same-batch)
4. Restore work_phases where deletedAt matches project's original deletedAt (same-batch)
5. Do NOT restore independently trashed children
6. Block restore if parent workspace is still trashed
```

---

## Workspace Dependency Graph

| # | Entity | Table | Owning Module | FK to Workspace | onDelete | Has deletedAt | Delete Strategy | Purge Order | Active Query Filter | Known Orphan Risk | Notes |
|---|--------|-------|---------------|-----------------|----------|---------------|-----------------|-------------|--------------------|--------------------|-------|
| 1 | **Workspace** | `workspaces` | workspaces | (self) | - | YES | soft | last | YES | - | Root entity |
| 2 | Project | `projects` | projects | `workspace_id` | **NO CASCADE** | YES | soft (independent) | 2 (via project purge) | YES | **Blocks workspace hard-delete** | Must purge all projects first |
| 3 | WorkspaceMember | `workspace_members` | workspaces | `workspace_id` | CASCADE | No | cascade | - | No | - | DB CASCADE handles |
| 4 | WorkspaceModuleConfig | `workspace_module_configs` | workspaces | `workspace_id` | CASCADE | No | cascade | - | No | - | DB CASCADE handles |
| 5 | WorkspaceInviteLink | `workspace_invite_links` | workspaces | `workspace_id` | CASCADE | No | cascade | - | No | - | DB CASCADE handles |
| 6 | Notification | `notifications` | notifications | `workspace_id` | CASCADE | No | cascade | - | No | - | DB CASCADE handles |
| 7 | Dashboard | `dashboards` | dashboards | `workspace_id` (column, no FK) | none | YES | orphan | 1 | YES | Stale reference | Should clean up explicitly |
| 8 | Doc | `docs` | docs | `workspace_id` | CASCADE | No | cascade | - | No | - | DB CASCADE handles |
| 9 | Form | `forms` | forms | `workspace_id` | CASCADE | No | cascade | - | No | - | DB CASCADE handles |
| 10 | Team | `teams` | teams | `workspace_id` (nullable) | **SET NULL** (verified) | No | nulled on delete | - | No | - | DB SET NULL — safe, team keeps null workspace_id |
| 11 | Resource | `resources` | resources | `workspace_id` (nullable) | **SET NULL** (verified) | No | nulled on delete | - | No | - | DB SET NULL — safe, resource keeps null workspace_id |
| 12 | Portfolio | `portfolios` | portfolios | `workspace_id` | **none** (verified) | No | orphan | 1 | No | Orphan rows on workspace purge | No DB FK — needs explicit cleanup |
| 13 | Program | `programs` | programs | `workspace_id` | **none** (verified) | No | orphan | 1 | No | Orphan rows on workspace purge | No DB FK — needs explicit cleanup |
| 14 | OrgInviteWorkspaceAssignment | `org_invite_workspace_assignments` | auth | `workspace_id` | CASCADE | No | cascade | - | No | - | DB CASCADE handles |
| 15 | RagIndex | `rag_index` | knowledge-index | `workspace_id` | CASCADE | No | cascade | - | No | - | DB CASCADE handles |
| 16 | CustomFieldDefinition | `custom_field_definitions` | custom-fields | `workspace_id` | **none** (verified) | No | orphan | 1 | No | Orphan rows on workspace purge | No DB FK — needs explicit cleanup |
| 17 | PolicyOverride | `policy_overrides` | policies | `workspace_id` | **none** (verified) | No | orphan | 1 | No | Orphan rows on workspace purge | No DB FK |
| 18 | GovernanceException | `governance_exceptions` | governance-exceptions | `workspace_id` | **none** (verified) | No | orphan | 1 | No | Orphan rows on workspace purge | No DB FK |
| 19 | WorkspaceStorageUsage | `workspace_storage_usage` | billing | `workspace_id` | **none** (verified) | No | orphan | 1 | No | Orphan rows on workspace purge | No DB FK |
| 20 | Favorite | `favorites` | favorites | `itemId` (polymorphic, no FK) | none | No | orphan | - | No | Stale favorite | See Polymorphic Orphan Policy below |

### Workspace Purge Order (Explicit)

When hard-deleting a workspace, execute in this order within a single transaction:

```
MUST DELETE (no CASCADE — purge fails or orphans without these):
1. All projects in workspace (full project purge path per project — includes soft-deleted)
2. Dashboards where workspaceId matches (no FK — explicit cleanup)

THEN DELETE WORKSPACE:
3. Workspace (DB CASCADE handles: members, module_configs, invite_links, notifications,
              docs, forms, rag_index, org_invite_workspace_assignments)

SAFE BY DB (SET NULL — won't block, column nulled automatically):
- teams.workspace_id         (SET NULL verified)
- resources.workspace_id     (SET NULL verified)

ORPHAN DATA (no FK — won't block purge, but accumulates):
- portfolios                 (no FK verified — orphan rows remain)
- programs                   (no FK verified — orphan rows remain)
- custom_field_definitions   (no FK verified — orphan rows remain)
- policy_overrides           (no FK verified — orphan rows remain)
- governance_exceptions      (no FK verified — orphan rows remain)
- workspace_storage_usage    (no FK verified — orphan rows remain)
- favorites                  (polymorphic itemId — filtered at query time)
```

### Workspace Restore Semantics

```
1. Restore workspace (clear deletedAt, deletedBy)
2. Do NOT auto-restore projects (they have independent trash lifecycle)
3. Projects trashed in same batch MAY be restored separately by admin
```

---

## Entities with Independent Trash Lifecycle

These entities have their own `deletedAt` column and can be trashed/restored independently:

| Entity | Table | Has deletedAt | Has deletedByUserId | Restore Endpoint | Purge Endpoint |
|--------|-------|---------------|---------------------|------------------|----------------|
| Workspace | `workspaces` | YES | YES (`deleted_by`) | `POST /admin/workspaces/:id/restore` | Admin Trash purge |
| Project | `projects` | YES | No (implicit via audit) | `POST /projects/:id/restore` | Admin Trash purge |
| WorkTask | `work_tasks` | YES | YES | `POST /work/tasks/:id/restore` | Via project purge |
| WorkPhase | `work_phases` | YES | YES | `POST /work/phases/:id/restore` | CASCADE from project |
| WorkRisk | `work_risks` | YES | No | None | Via project purge |
| Dashboard | `dashboards` | YES | No | None | None (gap) |
| Attachment | `attachments` | YES | No | None | None (gap) |
| WorkItem | `work_items` | YES | No | None | None (gap) |

---

## RESTRICT FK Summary (Purge Blockers)

These FKs will cause `DELETE FROM projects` to fail if children exist:

| Child Entity | Child Table | FK Column | onDelete | Handled in Current Purge |
|--------------|-------------|-----------|----------|--------------------------|
| WorkTask | `work_tasks` | `project_id` | RESTRICT | YES (explicit delete in `purgeProjectGraph`) |
| WorkRisk | `work_risks` | `project_id` | RESTRICT | YES (explicit delete in `purgeProjectGraph`) |
| PhaseGateDefinition | `phase_gate_definitions` | `project_id` | RESTRICT | YES (explicit delete in `purgeProjectGraph`) |
| WorkResourceAllocation | `work_resource_allocations` | `project_id` | RESTRICT | YES (explicit delete in `purgeProjectGraph`) |

All RESTRICT FK children are now handled. See `projects.service.ts:purgeProjectGraph()`.

---

## Polymorphic Orphan Policy

These entities use polymorphic references (`parentId`/`itemId` + `type` column) instead of FK constraints.
They cannot block purge, but orphan data accumulates.

### Decision Framework

| Entity | Pattern | Recommended Policy | Rationale |
|--------|---------|-------------------|-----------|
| **Attachment** | `parentId` + `parentType` | **Intentional retention** — filter at query time | Attachments may have regulatory or audit value. Storage reclamation is a separate concern (retention TTL on the attachment entity itself). |
| **Favorite** | `itemId` + `itemType` | **Filtered invisibility** — hide in active views, lazy cleanup | Favorites are lightweight. Already filtered via `deletedAt: IsNull()` on target resolution. Stale rows are harmless. Optional: batch cleanup job removes favorites pointing to nonexistent targets. |
| **Document** | `projectId` column (no FK) | **Intentional retention** — documents may be referenced by other systems | Documents may have value independent of the project. Leave orphaned; consider re-parenting or archive flag. |

### Implementation Status

| Entity | Active Query Filtered | Purge Cleanup | Status |
|--------|----------------------|---------------|--------|
| Attachment | N/A (polymorphic, queried by parentId) | Not cleaned on project purge | Orphan data accumulates — acceptable for now |
| Favorite | YES — `deletedAt: IsNull()` on workspace/project/dashboard resolution | Not cleaned on target purge | Hidden from UI — acceptable for now |
| Document | N/A (no active surfaces yet) | Not cleaned on project purge | Orphan data accumulates — acceptable for now |

### Future: Batch Orphan Cleanup Job

When orphan volume becomes a concern, add a scheduled job:
```
For each favorite where itemType in ('workspace', 'project', 'dashboard'):
  Check if target exists and is not deleted
  If target missing or deleted: delete the favorite row
```

This is low priority. Current filtered-invisibility approach is sufficient.

---

## DB-Level FK Verification Summary (Completed 2026-04-05)

All "unknown" entries in the original matrix have been verified via migration and entity inspection.

### Confirmed CASCADE (DB handles automatically)
- `portfolio_projects.project_id` → projects (CASCADE)
- `rag_index.project_id` → projects (CASCADE)
- `rag_index.workspace_id` → workspaces (CASCADE)
- `materialized_project_metrics.project_id` → projects (CASCADE)

### Confirmed SET NULL (safe — column nulled on parent delete)
- `teams.workspace_id` → workspaces (SET NULL)
- `resources.workspace_id` → workspaces (SET NULL)

### Confirmed NO FK (orphan data — won't block, accumulates)
- `schedule_baselines.project_id` — no DB FK
- `earned_value_snapshots.project_id` — no DB FK
- `project_budgets.project_id` — no DB FK
- `change_requests.project_id` — no DB FK
- `status_reports.project_id` — no DB FK (intentionally removed)
- `brds.project_id` — no DB FK
- `portfolios.workspace_id` — no DB FK
- `programs.workspace_id` — no DB FK
- `custom_field_definitions.workspace_id` — no DB FK
- `policy_overrides.workspace_id` — no DB FK
- `governance_exceptions.workspace_id` — no DB FK
- `workspace_storage_usage.workspace_id` — no DB FK

---

## Known Gaps and Follow-on Work

1. **Orphan data accumulation**: Tables with no FK will accumulate orphan rows as projects/workspaces are purged. Consider periodic cleanup jobs if data volume becomes a concern.
2. **WorkItem module**: Appears to be legacy/parallel to WorkTask — needs lifecycle decision
3. **Portfolio/Program**: Use `status` and `isArchived` instead of `deletedAt` — different lifecycle model, but workspace purge leaves orphan rows
4. **Template lineage**: `template_lineage` references projects — may need cleanup on project purge
5. **Shared SoftRemovalService**: Extract once a third entity joins the trash model
