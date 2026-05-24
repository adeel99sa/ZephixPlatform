---
# Path B Beta — Platform State Recon
Date: 2026-05-23
Architect: Claude (Senior SA)
Developers: Claude Code (backend) + Cursor (frontend)
Status: READ-ONLY recon. No code changes.
Branch: docs/path-b-recon
Purpose: Authoritative state document prerequisite to Path B ADR
---

**Staging HEAD (this audit):** `b12a49e8` — `fix(nav): move workload and intake to admin console, clean main sidebar (#304)`

**Companion doc:** `docs/recon/2026-05-23-platform-mental-model.md` (PR #305) — entity hierarchy and glossary.

**Domain split:** Sections **1–7** = backend/schema/services (baseline below; Claude Code may extend column-level dumps). Sections **8–14** = frontend (Cursor). Section **15** = synthesis.

---

# SECTIONS 1–7 — BACKEND (baseline on staging HEAD)

> **Note:** Full per-column entity dumps are in `docs/recon/2026-05-23-platform-mental-model.md` §1–2. This section records Path B–critical backend facts with `file:line` anchors. Expand with Claude Code pass if column inventories are required in this file.

## SECTION 1 — RECENT BACKEND ACTIVITY

### 1.1 `git log --oneline -20` (staging)

```
b12a49e8 fix(nav): move workload and intake to admin console, clean main sidebar (#304)
f697dddb fix(navigation): wire hidden features — workload, intake, KPIs, preferences, import (#303)
c161477f feat(projects): tab visibility driven by columnConfig.visibleTabs + plus View button (#302)
5a907da4 feat(backend): phase/project completion rollup, email delivery, drop dead columns, template tab config (#301)
f1327eef feat(frontend): save as template header menu, governance roadmap badges, icon tooltip audit (#300)
994bbc14 fix(task-menu): submenu back navigation, inline rename select-all (#299)
2d22df9b Merge pull request #298 from adeel99sa/feat/sprint3-frontend
2f52a198 feat(frontend): task menu redesign, column header menus, workspace + menu cleanup
7aeea3da Merge pull request #297 from adeel99sa/feat/sprint3-backend
9023601d fix(admin): add Organization repo mock to admin.controller.spec.ts
5f68f25d feat(backend): completion rollup hook, admin plan setter, stub governance policy cleanup
34ff1ea0 Merge pull request #296 from adeel99sa/fix/project-sidebar-menu-order
3a2abe52 fix(sidebar): reorder project menu, archive confirmation, delete with undo toast
dc87c558 Merge pull request #294 from adeel99sa/fix/remove-native-browser-dialogs
df4a9336 Merge pull request #295 from adeel99sa/fix/docs-and-optimization-plan
6cf805e8 docs: add AI developer optimization plan quick reference
b8ed6c37 docs: correct stale INSTANTIATE_TEMPLATE_SEED_TASKS flag in engine-4 inventory (PR #290)
ebc1756f fix(ui): replace native browser dialogs with toast and inline confirm patterns
210fc42f docs(ai): session handoff 2026-05-20 with P9 staging-URL guardrail
fcee5ecf Merge pull request #293 from adeel99sa/feat/table-tab-menu-and-overview-this-week
```

### 1.2 PRs merged since 2026-05-13 (backend-touching subset)

| PR | Date | Title |
|----|------|-------|
| 301 | 2026-05-22 | phase/project completion rollup, email delivery, drop dead columns, template tab config |
| 297 | 2026-05-21 | completion rollup hook, admin plan setter, stub governance policy cleanup |
| 292 | 2026-05-17 | per-project status groups (`project_statuses`) |
| 287 | 2026-05-17 | notifications: wire `activity.recorded` emit |
| 280 | 2026-05-13 | cleanup(schema): drop risks + organization_phase_templates tables |

Full merged list (20): see `gh pr list --state merged --limit 25` on 2026-05-23.

### 1.3 Active backend-related branches (sample)

`git branch -a | head -30` shows many local feature branches (`backend/*`, `admin-console/*`, etc.); none are authoritative for staging state. **Staging source of truth:** `origin/staging` @ `b12a49e8`.

### 1.4 Uncommitted changes on staging checkout

Working tree had **unrelated** local modifications (proof JSON under `docs/architecture/proofs/`, `workspaces.service.spec.ts`) — **not** part of staging HEAD. Recon branch `docs/path-b-recon` created clean from pulled staging.

### 1.5 Handoff doc `docs/handoffs/2026-05-22.md`

**NOT FOUND** on staging HEAD.

Nearest: `docs/ai/SESSION_HANDOFF_2026-05-20.md` — exists (referenced in commit `210fc42f`).

---

## SECTION 2 — CORE ENTITIES SCHEMA (summary)

| § | Entity | Entity file | Table | Key FKs | Notes |
|---|--------|-------------|-------|---------|-------|
| 2.1 | Organization | `zephix-backend/src/organizations/entities/organization.entity.ts` | `organizations` | — | `plan_code`, `settings` jsonb — `:13-64` |
| 2.2 | Workspace | `zephix-backend/src/modules/workspaces/entities/workspace.entity.ts` | `workspaces` | `organization_id` | `complexity_mode` enum — `:182-189` |
| 2.3 | User | `zephix-backend/src/modules/users/entities/user.entity.ts` | `users` | `organization_id` (legacy) | Primary membership via `user_organizations` |
| 2.4 | UserOrganization | `zephix-backend/src/organizations/entities/user-organization.entity.ts` | `user_organizations` | `user_id`, `organization_id` | Role enum `owner\|admin\|member\|viewer` — `:35-40`. **No `pm` in enum**; legacy `pm` maps at login via `LEGACY_ROLE_MAPPING` in `zephix-backend/src/common/auth/platform-roles.ts:33` |
| 2.5 | Project | `zephix-backend/src/modules/projects/entities/project.entity.ts` | `projects` | `organization_id`, `workspace_id`, optional `program_id`, `portfolio_id` | `team_member_ids` jsonb — `:175-185`. **No `project_members` table** |
| 2.6 | WorkPhase | `zephix-backend/src/modules/work-management/entities/work-phase.entity.ts` | `work_phases` | XOR `project_id` OR `program_id` | CHECK — `:31-33` |
| 2.7 | WorkTask | `zephix-backend/src/modules/work-management/entities/work-task.entity.ts` | `work_tasks` | `project_id`, `phase_id`, `parent_task_id` | `type` enum `TaskType` — `:89-94`. **No `item_type` column**. **No `SPRINT` in `TaskType`** — `zephix-backend/src/modules/work-management/enums/task.enums.ts:26-42` |
| 2.8 | Subtask | same as WorkTask | `work_tasks` | `parent_task_id` | Self-FK — `work-task.entity.ts:74-75`, `:231-239` |
| 2.9 | Dependencies | `zephix-backend/src/modules/work-management/entities/task-dependency.entity.ts` | **`work_task_dependencies`** (not `work_dependencies`) | `predecessor_task_id`, `successor_task_id` | Service: `task-dependencies.service.ts`. **Backend complete**; Gantt UI partial |

**Migrations:** Use `zephix-backend/src/migrations/` — e.g. `17980209000000-CreateWorkTaskDependenciesTable.ts` for dependencies table.

---

## SECTION 3 — TEMPLATES INFRASTRUCTURE (summary)

| § | Finding | Location |
|---|---------|----------|
| 3.1 | `templates` table entity | `zephix-backend/src/modules/templates/entities/template.entity.ts` — scopes `SYSTEM\|ORG\|WORKSPACE` — `:57-68` |
| 3.2 | `template_definitions` (parallel stack) | `zephix-backend/src/modules/template-center/templates/entities/template-definition.entity.ts` — AD-029 unification in flight |
| 3.3 | System defs (15 templates) | `zephix-backend/src/modules/templates/data/system-template-definitions.ts` — see mental model §3.2 table |
| 3.4 | `ACTIVE_TEMPLATE_CODES` (11 active) | `system-template-definitions.ts:1255-1269` |
| 3.5 | Instantiate endpoint | `POST /templates/:id/instantiate-v5_1` — `templates.controller.ts` → `TemplatesInstantiateV51Service.instantiateV51` — `templates-instantiate-v51.service.ts:64-78` |
| 3.6 | v5_1 sequence | Load template → access check → create/find DRAFT project → `normalizeTemplateStructure` → insert `work_phases` → insert `work_tasks` → seed `project_statuses` → optional risks — `templates-instantiate-v51.service.ts:106-450+` |
| 3.7 | `project_statuses` | Per-project rows seeded from template `statusGroups` — `project-status.service.ts` (referenced at instantiate `:102-104`) |
| 3.8 | Custom fields | **EXISTS** — `zephix-backend/src/modules/custom-fields/entities/custom-field.entity.ts` — applicability rules in `custom-fields.service.ts` (UNCLEAR — full matrix needs follow-up) |
| 3.9 | Tags entity | **NOT FOUND** as standalone tags table for templates. Task `tags` jsonb on `work_tasks` — `work-task.entity.ts:187-188` |
| 3.10 | Ships on instantiate | Phases + tasks from template JSON; governance flags on project; `columnConfig.visibleTabs`; **not** live execution data on duplicate — see `projects.controller.ts:461-467` |

---

## SECTION 4 — ARTIFACTS / DOCUMENTS / RISKS (summary)

| § | Result |
|---|--------|
| 4.1 `project_documents` | **NOT FOUND** |
| 4.2 `project_artifacts` | **NOT FOUND** |
| 4.3 `work_risks` | **EXISTS** — `work-risk.entity.ts`, `WorkRisksController` under work-management. Frontend route **disabled** — see §10.8 |
| 4.4 Other artifact names | **NOT FOUND** as tables |
| 4.5 Closest doc model | `document_instances` + `doc_templates` — template-center module |

---

## SECTION 5 — RESOURCE MANAGEMENT (summary)

| § | Result |
|---|--------|
| 5.1 Resource entity | **EXISTS** — `zephix-backend/src/modules/resources/entities/resource.entity.ts` (separate from User) |
| 5.2 Capacity | `user_daily_capacity`, `workspace_member_capacity` entities exist under resources/work-management |
| 5.3 PTO | **NOT FOUND** dedicated PTO table in grep pass |
| 5.4 Allocations | `resource_allocations` — `resource-allocation.entity.ts`; has date range + allocation % fields (see entity for `estimated_hours` — UNCLEAR without full column dump) |
| 5.5 Project team | **`projects.team_member_ids` jsonb only** |
| 5.6 Skills | `GET /resources/skills` — `resources.controller.ts:637` |
| 5.7 Heatmap source | `ResourceHeatMapService.getHeatMapData` queries `resource_allocations` via TenantAwareRepository — `resource-heat-map.service.ts:22-80`; alternate `resource_daily_load` read model — `resource-daily-load.entity.ts:16` |
| 5.8–5.9 Capacity/heatmap routes | `resources.controller.ts` — `@Get('heat-map')` `:60-77`, `@Get('heatmap/timeline')` `:771+`, capacity routes `:289+`, `:579+`, `:602+`. **Guards:** class uses JWT + tenant context (read controller header — `@UseGuards(JwtAuthGuard)` expected at class level). **No dotted capability tokens** |
| 5.10 Heatmap calculation | Loads allocations overlapping date range; filters by accessible workspaces/projects; aggregates into heat map cells — `resource-heat-map.service.ts:52-80` → `processAllocations` |

---

## SECTION 6 — GOVERNANCE + CAPABILITY (summary)

| § | Result |
|---|--------|
| 6.1 | `governance_rules` module — policies seeded via migrations/admin (9 PMBOK policies — verify in `governance-rules` seeds; UNCLEAR exact count without seed file read) |
| 6.2 | Exception loop | `governance-exceptions` module + `governance-rule-resolver.service.ts` (UNCLEAR full BLOCK→OVERRIDE chain — needs dedicated pass) |
| 6.3 | Capability tokens | Taxonomy **38** — `docs/architecture/role-taxonomy-mvp.md:318`. Frontend **19** in `useEffectiveRole.ts:60-80`. Backend: **workspace/platform role guards**, not dotted tokens |
| 6.4 | Permission guards | `RequireWorkspaceRoleGuard` — `require-workspace-role.guard.ts`; `WorkspaceAccessService.getEffectiveWorkspaceRole` |
| 6.5 | Dotted capability on endpoints | **NOT FOUND** in backend route guards (e.g. no `resources.heatmap.view.workspace`) |

---

## SECTION 7 — AUDIT + NOTIFICATIONS (summary)

| § | Result |
|---|--------|
| 7.1 | `audit_events` — work-management + modules/audit entities |
| 7.2 | Event types | `audit.constants.ts` / `TaskActivityType` enum — separate systems |
| 7.3 | Notifications | `notification-dispatch.service.ts`; wired in PR #287 for some creation events |
| 7.4 | SENDGRID | Graceful skip — `notification-dispatch.service.ts:198-200`, `email.service.ts:25-35` |
| 7.5 | Inbox gap | **UNCLEAR — needs follow-up:** trace `notifications` table insert path vs Inbox UI `InboxPage.tsx`. PR #287 claimed wiring; empty inbox may be env/data/viewer suppression (`role-taxonomy-mvp.md:279` VIEWER hides Inbox) |

---

# SECTION 8 — RECENT FRONTEND ACTIVITY (Cursor)

## 8.1 `git log --oneline -20` (frontend-relevant)

Same as §1.1 — monorepo log. Frontend-heavy commits: `#304`, `#303`, `#302`, `#300`, `#298`, `#294`, `#293`, `#284-283` (role gates).

## 8.2 Frontend PRs merged since 2026-05-13

| PR | Focus |
|----|--------|
| 304 | Sidebar cleanup; workload + intake → Admin Console |
| 303 | Wire workload, intake, KPI tab, preferences, import |
| 302 | `columnConfig.visibleTabs` + Add View popover |
| 300 | Save as template header menu, governance badges |
| 298 | Task menu redesign, workspace cleanup |
| 294 | Remove native `confirm()` dialogs |
| 293 | Table tab row menu, Overview “This Week” |
| 284–282 | Role gates (Board, Table, Gantt, Overview, shell) |

## 8.3 Active frontend branches

Many local branches; none merged. Staging @ `b12a49e8` is authority.

## 8.4 Resource/capacity/heatmap routes — nav accessibility

| Route | In main sidebar? | How to reach (staging HEAD) | Component |
|-------|------------------|----------------------------|-----------|
| `/capacity` | **No** (removed from main sidebar per #304) | Admin Console → Resources → Capacity — `constants.ts:79` | `features/capacity/CapacityPage.tsx` |
| `/workspaces/:id/heatmap` | **No** | Admin Console → Resources → Workload Heatmap — `constants.ts:81-85`, `AdministrationLayout.tsx:101-115` | `pages/resources/ResourceHeatmapPage.tsx` |
| `/resources` | **No** | Direct URL only — `App.tsx:354` | `pages/ResourcesPage.tsx` |
| `/resources/:id/timeline` | **No** | Direct URL — `App.tsx:355` | `pages/resources/ResourceTimelinePage.tsx` |
| `/intake-forms` | **No** | Admin-adjacent; wired in #303 | `App.tsx:353` |

**Heatmap link behavior:** If `activeWorkspaceId` is null, Admin nav shows heatmap link to `/workspaces` with title “Select a workspace…” — `AdministrationLayout.tsx:101-115`.

---

# SECTION 9 — SIDEBAR + NAVIGATION

## 9.1 Main sidebar

| Item | Path | File:line |
|------|------|-----------|
| Shell sidebar | — | `zephix-frontend/src/components/shell/Sidebar.tsx` |
| Brand → Inbox | `/inbox` | `Sidebar.tsx:444-457` |
| Home | `/home` | `Sidebar.tsx:462-475` |
| Inbox | `/inbox` | `Sidebar.tsx:477-496` (`can("inbox.view")`) |
| My Work | `/my-work` | `Sidebar.tsx:498-514` (`is("paid")`) |
| Favorites | conditional | `Sidebar.tsx:518-524` → `FavoritesSidebarSection.tsx` |
| Workspaces tree | — | `Sidebar.tsx:528-578` → `SidebarWorkspaces.tsx` |
| Dashboards | `/dashboards` | `Sidebar.tsx:581-597` |

**Not in main sidebar (post #304):** Templates, Administration, Capacity, Heatmap, Intake.

## 9.2 Workspaces tree component

`zephix-frontend/src/features/workspaces/SidebarWorkspaces.tsx` — entire file; list render from `:707-1009`.

## 9.3 Expandable project nodes?

**Yes.** Workspace row has chevron (`expandedWs` state) — `:192`, `:748-766`. Expanded section renders **project leaves** (flat list, not nested subtasks) — `:878-1005`. Projects are **leaves**; no project-level expand for tasks/phases.

## 9.4 Inbox / My Work / Favorites / Dashboards

| Link | Route | File:line |
|------|-------|-----------|
| Inbox | `/inbox` | `Sidebar.tsx:477-496` |
| My Work | `/my-work` | `Sidebar.tsx:498-514` |
| Favorites | inline section | `FavoritesSidebarSection.tsx` |
| Dashboards | section + link to `/dashboards` | `Sidebar.tsx:581-597` |

## 9.5 New workspace / new project triggers

| Action | File:line |
|--------|-----------|
| New workspace (sidebar section +) | `Sidebar.tsx:527-536` → `WorkspacesSectionHeader` → `handleCreateWorkspace` `:427-430` |
| New workspace (empty state) | `Sidebar.tsx:550-559` |
| New project (workspace + menu) | `SidebarWorkspaces.tsx:836-872` (plus menu), template option `:1110+` |
| Template Center modal | `SidebarWorkspaces.tsx:1596` → `TemplateCenterModal` |

## 9.6 Expansion state storage

| State | Store | File:line |
|-------|-------|-----------|
| `expandedWs` (per-workspace project list open) | **React `useState`** in component | `SidebarWorkspaces.tsx:192` |
| `wsProjects` loaded projects | React state | `SidebarWorkspaces.tsx:185+` |
| Active workspace | Zustand | `zephix-frontend/src/state/workspace.store.ts` |
| Show archived workspaces (sidebar prefs) | Zustand persist | `zephix-frontend/src/state/sidebarWorkspacesUi.store.ts:17-26` |

---

# SECTION 10 — PROJECT PAGE + TABS

## 10.1 Project page route

| Route | Layout | File:line |
|-------|--------|-----------|
| `/projects/:projectId` | `ProjectPageLayout` | `App.tsx:301-330` |
| Layout component | `features/projects/layout/ProjectPageLayout.tsx` | exports `ProjectPageLayout` `:103+` |

## 10.2 Tab driving logic

**Driven by `project.columnConfig.visibleTabs`**, not hardcoded-only.

| Mechanism | File:line |
|-----------|-----------|
| Read tabs | `readVisibleTabIds(project.columnConfig)` | `projectVisibleTabs.ts:30-39` |
| Apply on load | `ProjectPageLayout.tsx:121-127` |
| Filter tab bar | `visibleTabs` from `PROJECT_TABS_ALL` | `ProjectPageLayout.tsx:131-135` |
| Add view (+ popover) | `handleAddViewTab` PATCH column config | `ProjectPageLayout.tsx:137-165` |
| Fallback tab order | `TAB_ORDER` in `projectVisibleTabs.ts:5-14` |

## 10.3 Tab inventory

| Tab ID | Route | Component | Data source | State |
|--------|-------|-----------|-------------|-------|
| overview | `/projects/:id` | `tabs/ProjectOverviewTab.tsx` | `GET /work/projects/:id/overview` + `listTasks` | **FUNCTIONAL** |
| tasks (Activities) | `.../tasks` | `tabs/ProjectTasksTab.tsx` | `WaterfallTable` / `TaskListSection` via work-management APIs | **FUNCTIONAL** (methodology branch) |
| board | `.../board` | `tabs/ProjectBoardTab.tsx` | Work tasks board API | **FUNCTIONAL** (role gates in tests) |
| gantt | `.../gantt` | `tabs/ProjectGanttTab.tsx` | Schedule/deps APIs | **PARTIAL** (deps backend exists) |
| table | `.../table` | `tabs/ProjectTableTab.tsx` | Work tasks | **FUNCTIONAL** |
| calendar | `.../calendar` | `tabs/ProjectCalendarTab.tsx` | Calendar data | **PARTIAL** |
| documents | `.../documents` | `tabs/ProjectDocumentsTab.tsx` | `/work/workspaces/.../projects/.../documents` | **PARTIAL** |
| risks | `.../risks` | Route: `NotEnabledInProject` — `App.tsx:324` | `ProjectRisksTab.tsx` **orphaned** | **BROKEN** (UI stub; API exists) |
| kpis | `.../kpis` | `tabs/ProjectKpisTab.tsx` | KPI APIs | **PARTIAL** |
| plan | `.../plan` | `NotEnabledInProject` — `App.tsx:322` | — | **STUB** |
| resources | `.../resources` | `NotEnabledInProject` — `App.tsx:325` | — | **STUB** |
| budget | `.../budget` | `NotEnabledInProject` — `App.tsx:328` | — | **STUB** |
| change-requests | `.../change-requests` | `NotEnabledInProject` — `App.tsx:326` | `ProjectChangeRequestsTab.tsx` exists but route stubbed | **STUB** |

## 10.4 Project Team (“Manage”)

| Item | File:line |
|------|-----------|
| Team card UI | `ProjectOverviewCards.tsx:576-596` |
| “Manage” toggles inline panel | `setTeamManageOpen` — `:586-594` |
| Data | `projectsApi.getProjectTeam` / `updateProjectTeam` — `projects.api.ts:341-364` |
| Endpoints | `GET/PATCH /projects/:id/team` |
| Capacity % in modal | **NOT FOUND** — team UI adds/removes `teamMemberIds` only — `:380-418`. No allocation % capture |

## 10.5 Project header badges

| Badge | Where | Data source |
|-------|-------|-------------|
| Project name (editable) | `EditableProjectHeader` in `ProjectPageLayout.tsx:440-577` | `project.name` |
| “Governed” pill | `ProjectPageLayout.tsx:529-536` | `projectShowsGovernanceIndicator(project)` when `governanceSource === 'TEMPLATE'` — `projects.api.ts:17-20` |
| DRAFT / state | **Overview Health Strip**, not gradient header | `ProjectOverviewTab.tsx:147-151` — `overview.projectState` |
| Waterfall / methodology | Overview Health Strip | `ProjectOverviewTab.tsx:154-158` — `project.methodology` |
| On Track | Overview Health Strip | `ProjectOverviewTab.tsx:42-44`, `:142-144` — `overview.healthCode` → `HEALTHY` label “On Track” |

**Note:** Operator screenshot showing badges in header may reflect older UI; staging HEAD places state/methodology/health on **Overview tab strip**, not `EditableProjectHeader` gradient card.

---

# SECTION 11 — TEMPLATE CENTER UI

## 11.1 Components (two surfaces)

| Surface | Route / trigger | File |
|---------|-----------------|------|
| **Customer modal (primary)** | Workspace `+` → Template Center | `features/templates/components/TemplateCenterModal.tsx` |
| Full page (legacy/admin-style) | `/templates` → `TemplateRouteSwitch` | `views/templates/TemplateCenter.tsx` OR `pages/templates/TemplateCenterPage.tsx` |
| Route switch | `/templates` | `pages/templates/TemplateRouteSwitch.tsx:16-29` |

## 11.2 Left rail categories

**Hardcoded category order** + dynamic grouping by template `category` field.

| Mechanism | File:line |
|-----------|-----------|
| Locked category list | `features/templates/categories.ts` — imported `PROJECT_TEMPLATE_CATEGORIES` — `TemplateCenterModal.tsx:26-28` |
| `groupByCategory(templates)` | `TemplateCenterModal.tsx:55-63`, `:219-227` |

## 11.3 Template card

Inline `TemplateCard` function inside `TemplateCenterModal.tsx` — grid at `:573-578` (search for `function TemplateCard` in same file).

## 11.4 Preview

`TemplatePreviewModal` + `getPreview(templateId)` — `TemplateCenterModal.tsx:148-151`, `handlePreview` ~`:124+`.

## 11.5 “Use template” flow

| Step | File:line |
|------|-----------|
| User confirms name | `ProjectNameModal` — `TemplateCenterModal.tsx:368` |
| API | `instantiateV51(id, projectName)` — `features/templates/api.ts:138-149` → `POST /templates/:id/instantiate-v5_1` |
| Navigate | `navigate(/projects/${result.projectId})` after success — UNCLEAR exact line; search `instantiateV51` in modal ~`:360-380` |
| HR1: no blank project | Comment `TemplateCenterModal.tsx:5-6` |

## 11.6 Save as template

| Step | File:line |
|------|-----------|
| Project header menu | `ProjectHeaderActionsMenu.tsx` — `data-testid="project-action-save-as-template"` |
| Modal | `SaveAsTemplateModal.tsx` |
| API | `projects.api.ts` → `POST /projects/:id/save-as-template` |
| Sidebar deep link | `SidebarWorkspaces.tsx:1257` — `?action=save-as-template` |

## 11.7 Naming: Workspace vs Zephix Official

| UI string | File:line |
|-----------|-----------|
| “Created by Zephix” | `TemplateCenterModal.tsx:45` (`by-zephix` view) |
| “Workspace templates” | `TemplateCenterModal.tsx:46` |
| Scope label `Zephix` for SYSTEM | `scopeLabel` — `TemplateCenterModal.tsx:104-108` |
| **“ClickUp”** | **NOT FOUND** in `TemplateCenterModal.tsx` (renamed per dispatch) |

## 11.8 Filter UI existence

| Filter | Exists? | File:line |
|--------|---------|-----------|
| Categories (left rail) | **Yes** | `TemplateCenterModal.tsx:219-227` |
| Source views (All / Zephix / Workspace / Mine) | **Yes** | `SOURCE_VIEWS` `:43-48`, conditional render `:229+` |
| Complexity (derived) | **Display only** on cards — `deriveComplexity` `:66-73` | Not a filter control |
| Template Types | **NOT FOUND** as separate filter chips |
| Use Cases | **NOT FOUND** |
| Tags | **NOT FOUND** |
| Created by | **Partial** — `mine` source view when data exists; HR5 hid empty “Created by me” historically — comment `:9` |

## 11.9 Search

| Item | File:line |
|------|-----------|
| Search input | `TemplateCenterModal.tsx:432-437` |
| Matches | **Name + description only** — `:294-300` |
| Tags | **Not searched** |

`TemplateCenterPage.tsx` (full page) searches **name only** — `:62-66`.

---

# SECTION 12 — RESOURCE MGMT UI

## 12.1 File listing (pattern match)

```
zephix-frontend/src/features/capacity/CapacityPage.tsx
zephix-frontend/src/features/capacity/capacity.api.ts
zephix-frontend/src/features/resources/api/useResources.ts
zephix-frontend/src/features/resources/components/ResourceHeatmap.tsx
zephix-frontend/src/features/resources/pages/ResourcesPage.tsx
zephix-frontend/src/pages/resources/ResourceHeatmapPage.tsx
zephix-frontend/src/pages/resources/ResourceTimelinePage.tsx
zephix-frontend/src/components/resources/ResourceHeatmapGrid.tsx
zephix-frontend/src/components/resources/ResourceHeatmapCell.tsx
zephix-frontend/src/services/resourceService.ts
```

(28 files total per glob — see repo.)

## 12.2 Admin Console → Resources

| Nav item | Path | Component | State |
|----------|------|-----------|-------|
| Capacity | `/capacity` | `CapacityPage.tsx` | **PARTIAL** — utilization/overallocation from `capacity.api.ts`; admin-only recommendations — `:56` |
| Workload Heatmap | `/workspaces/:activeWorkspaceId/heatmap` | `ResourceHeatmapPage.tsx` | **PARTIAL** — grid from `useResourceHeatmap` |

Defined in `features/administration/constants.ts:75-86`.

## 12.3 Workspace-level resource view

`/workspaces/:id/heatmap` — `App.tsx:338` — same `ResourceHeatmapPage`.

## 12.4 Broken / fragile heatmap link

| Issue | File:line |
|-------|-----------|
| Nav uses `path: "/workspaces"` with `usesActiveWorkspaceHeatmap: true` | `constants.ts:81-85` |
| Resolved in layout to `/workspaces/${activeWorkspaceId}/heatmap` or fallback | `AdministrationLayout.tsx:101-115` |
| **Failure mode:** no active workspace → link goes to `/workspaces` not heatmap |

## 12.5 Capability gating in resource UI

| File | Gating |
|------|--------|
| `CapacityPage.tsx:27-28, :55-56` | `isPlatformAdmin` for edit/recommendations — **not** `useEffectiveRole` capability tokens |
| `ResourceHeatmapPage.tsx` | No role hook — feature flag stub always true — `:9-12` |

## 12.6 Heatmap UI behavior (staging HEAD)

`ResourceHeatmapPage.tsx`:

- Date range pickers (default today + 28 days) — `:27-37`
- Calls `useResourceHeatmap(workspaceId, from, to)` — `:40-44`
- Renders `ResourceHeatmapGrid` with resources × dates cells — `:47-50`
- Shows workspace ID as text (minimal polish) — `:67-69`

**Backend:** `GET /resources/heat-map` (allocation-based) — separate from `GET /resources/heatmap/timeline` (daily load read model).

---

# SECTION 13 — ADMIN CONSOLE

## 13.1 Route

`/administration/*` — `App.tsx:376-419` — layout `AdministrationLayout.tsx`.

## 13.2 Nav structure

`ADMINISTRATION_NAV_GROUPS` — `features/administration/constants.ts:42-106`:

| Group | Items |
|-------|-------|
| My Settings | Profile, Preferences, Notifications |
| Administration | General, People, Teams, Security & Permissions |
| Governance | Policies, Templates, Audit Trail |
| Resources | Capacity, Workload Heatmap |
| System | Import/Export, Integrations (coming soon), Trash, Billing |

## 13.3 Section state

| Section (operator list) | Route | Main component | State |
|-------------------------|-------|----------------|-------|
| Overview | `/administration` (index) | `AdministrationOverviewPage.tsx` | **PARTIAL** |
| Governance / Policies | `/administration/governance` | `AdministrationGovernancePage.tsx` | **PARTIAL** |
| Workspaces | `?workspaces=1` modal | `adminWorkspacesModalStore` | **FUNCTIONAL** (modal) |
| Templates | `/administration/templates` | `AdministrationTemplatesPage.tsx` | **PARTIAL** |
| People | `/administration/people` | `AdministrationPeoplePage.tsx` | **PARTIAL** |
| Security | `/administration/security` | `AdministrationSecurityPage.tsx` | **PARTIAL** |
| Organization | `/administration/organization` | `AdministrationOrganizationPage.tsx` | **PARTIAL** |
| Teams | `/administration/teams` | `AdministrationTeamsPage.tsx` | **PARTIAL** |
| Notifications | `/administration/notifications` | `AdministrationNotificationsPage.tsx` | **PARTIAL** |
| Audit Trail | `/administration/audit-trail` | `AdministrationAuditTrailPage.tsx` | **PARTIAL** |
| Billing | `/administration/billing` | `AdministrationBillingPage.tsx` | **PARTIAL** |

**Not in `ADMINISTRATION_NAV_GROUPS`:** standalone “Overview” label is index route; no separate “Import” top-level (under System).

## 13.4 Workspace Snapshot

| Item | File:line |
|------|-----------|
| Table UI | `AdministrationOverviewPage.tsx:193-228` |
| Row type | `WorkspaceSnapshotRow` — `administration.api.ts:73-82` |
| Data source | `mapAdminWorkspaceListItemToSnapshotRow` — **placeholders** | `administration.api.ts:94-121` |
| `projectCount` | Hardcoded **0** — `:115` |
| `budgetStatus` / `capacityStatus` | Hardcoded **`"UNKNOWN"`** — `:116-117` |
| Comment | “Governance counts are not returned by this endpoint” — `:96-97` |

**Verdict:** CAPACITY and BUDGET columns are **not genuinely computed** in current admin overview mapping.

---

# SECTION 14 — API CLIENTS + STATE

## 14.1 API client structure

| Layer | Path |
|-------|------|
| Shared axios wrapper | `zephix-frontend/src/lib/api.ts` |
| Typed feature APIs | `features/*/api.ts`, `*.api.ts` (e.g. `projects.api.ts`, `templates.api.ts`, `capacity.api.ts`) |
| Admin API | `features/administration/api/administration.api.ts` |

Naming: `{domain}.api.ts` or `features/{domain}/api.ts`.

## 14.2 Project data hooks

| Hook / pattern | File:line |
|----------------|-----------|
| **No `useProject` hook** | Project loaded in `ProjectPageLayout.loadProject` — `ProjectPageLayout.tsx:222-260` |
| Context | `ProjectContext` — `ProjectPageLayout.tsx:86-101` |
| Permissions | `useProjectPermissions` — `features/projects/hooks/useProjectPermissions.ts:40` |

## 14.3 Template hooks

| Pattern | File:line |
|---------|-----------|
| `listTemplates()` | `features/templates/templates.api.ts` |
| `instantiateV51` | `features/templates/api.ts:138` |
| Modal fetches on open | `TemplateCenterModal.tsx:172-176` |

## 14.4 Resource hooks

| Hook | File:line |
|------|-----------|
| `useResourceHeatmap` | `features/resources/api/useResources.ts` |
| `useResourcesList` | same file `:38` |

## 14.5 Zustand stores

| Store | File |
|-------|------|
| Workspace active + role | `state/workspace.store.ts` |
| Sidebar UI prefs | `state/sidebarWorkspacesUi.store.ts` |
| Auth | `state/AuthContext.tsx` |
| View config | `state/viewConfig.store.ts` |
| Navigation recents | `state/navigationRecents.store.ts` |
| Favorites layout | `state/favoritesLayout.store.ts` |
| AI panel | `state/aiPanel.ts` |
| Admin workspaces modal | `stores/adminWorkspacesModalStore.ts` |

## 14.6 React Query

| Item | File:line |
|------|-----------|
| Provider | `lib/providers/QueryProvider.tsx` |
| Wired in app | `main.tsx:10` — `<QueryProvider>` |
| Defaults | staleTime 5m, gcTime 10m — `QueryProvider.tsx:6-14` |
| Usage | **Mixed** — sidebar favorites, heatmap, capacity; **project page uses useState + context**, not RQ |

---

# SECTION 15 — SYNTHESIS

## 15.1 Summary table (Path B Beta capabilities)

| Capability | Backend State | Frontend State | Gap |
|------------|---------------|----------------|-----|
| Waterfall Project template | FUNCTIONAL — `pm_waterfall_v2` active, instantiate v5_1 | FUNCTIONAL — `TemplateCenterModal` + Activities/Waterfall table | Tab/route mismatches on some templates |
| Kanban Project template | FUNCTIONAL — `sw_kanban_delivery_v1` in ACTIVE_TEMPLATE_CODES | FUNCTIONAL — Board tab | Risks tab stubbed in shell |
| Risk Register artifact | BACKEND ONLY — `work_risks` | ORPHANED — `ProjectRisksTab.tsx` not routed | Wire route or build artifact UX |
| RAID Log artifact | NOT BUILT | NOT BUILT | Greenfield |
| Lessons Learned artifact | NOT BUILT | NOT BUILT | Greenfield |
| Status Report artifact | PARTIAL — `status-report.entity.ts` (pm module) | NOT BUILT in project tabs | Clarify vs document_instances |
| Decision Log artifact | NOT BUILT | NOT BUILT | Greenfield |
| Stakeholder Register artifact | NOT BUILT | NOT BUILT | Greenfield |
| Backlog artifact | NOT BUILT (tasks only) | PARTIAL — Board/Table | No artifact abstraction |
| Sprint Ceremonies artifact | NOT BUILT | PARTIAL — `ProjectSprintsTab` / iterations API | No ceremony entity |
| User Story artifact | NOT BUILT | PARTIAL — task types EPIC/TASK | No story artifact table |
| BRD artifact | NOT BUILT | NOT BUILT | Greenfield |
| Project-as-container + sidebar | FUNCTIONAL | FUNCTIONAL — expandable workspace → project leaves | No task tree in sidebar |
| Three template scales | FUNCTIONAL — SYSTEM/ORG/WORKSPACE on `templates` | FUNCTIONAL — modal source filters | `template_definitions` duplicate stack |
| Custom Fields engine | PARTIAL — entity exists | UNCLEAR — UI surfacing | End-to-end verification |
| Per-template status workflows | FUNCTIONAL — `project_statuses` seed | FUNCTIONAL — per-project statuses in UI | — |
| Resource Directory | FUNCTIONAL — `/resources` API | PARTIAL — `ResourcesPage` not in nav | Wire to Path B IA |
| Capacity Calendar | PARTIAL — capacity endpoints | PARTIAL — `CapacityPage` admin-only | Not workspace-operational |
| Workspace Heatmap | FUNCTIONAL — heat-map + timeline endpoints | PARTIAL — `ResourceHeatmapPage` | Needs active workspace; admin nav |
| Org Heatmap | PARTIAL — org-scoped queries | NOT BUILT dedicated org view | Build or scope Path B |
| RBAC capability tokens | NOT BUILT (role guards only) | PARTIAL — 19/38 tokens in `useEffectiveRole` | Align taxonomy ↔ UI ↔ API |
| Governance on templates | PARTIAL — rules + template governance admin | PARTIAL — “Governed” badge | Policies not fully silent per product principles |

## 15.2 Top 10 surprises

| # | Claim | Evidence |
|---|-------|----------|
| 1 | Handoff `docs/handoffs/2026-05-22.md` exists | **NOT FOUND**; `docs/ai/SESSION_HANDOFF_2026-05-20.md` exists |
| 2 | Project Risks tab works | `App.tsx:324` → `NotEnabledInProject`; `ProjectRisksTab.tsx` orphaned |
| 3 | Header shows DRAFT/Waterfall/On Track | Badges on **Overview** strip — `ProjectOverviewTab.tsx:142-158`; gradient header only “Governed” — `ProjectPageLayout.tsx:529-536` |
| 4 | Admin Workspace Snapshot shows real capacity/budget | Mapped to **UNKNOWN** — `administration.api.ts:116-117` |
| 5 | Heatmap in main sidebar | **Removed** #304; only Admin Console — `constants.ts:79-85` |
| 6 | Table name `work_dependencies` | Actual: **`work_task_dependencies`** — `task-dependency.entity.ts:14` |
| 7 | 42 capability toggles | **38** taxonomy, **19** implemented — `role-taxonomy-mvp.md:318`, `useEffectiveRole.ts:60-80` |
| 8 | Team Manage captures capacity % | Only `teamMemberIds` — `ProjectOverviewCards.tsx:380-418` |
| 9 | `item_type` on work_tasks (AD-010) | **`type` enum** only — `work-task.entity.ts:89-94` |
| 10 | Template search includes tags | **Name + description only** — `TemplateCenterModal.tsx:294-300` |

## 15.3 Build verdict (selected)

| Capability | Verdict |
|------------|---------|
| Waterfall template | **REUSE AS-IS** (+ fix risks route if in scope) |
| Kanban template | **REUSE AS-IS** |
| Risk/RAID/Lessons/Decision/Stakeholder artifacts | **BUILD FROM SCRATCH** (no artifact entity) |
| Project sidebar tree | **REFACTOR EXISTING** (add containers/artifacts as designed) |
| work_risks UI | **WIRE UP EXISTING** backend |
| Resource directory / heatmap | **WIRE UP EXISTING** (nav + org view decisions) |
| Custom fields | **REFACTOR EXISTING** / verify E2E |
| RBAC tokens | **REFACTOR EXISTING** (implement remaining 19 tokens or shrink taxonomy) |
| Admin snapshot KPIs | **BUILD FROM SCRATCH** or **WIRE UP** analytics endpoints |

## 15.4 Blockers (Architect decisions)

1. **Artifact storage model:** Use `document_instances`, new `artifacts` table, or extend `work_tasks` types? No `project_artifacts` in code.
2. **Dual template stacks:** Freeze on `templates` + v5_1 only, or complete AD-029 `template_definitions` migration before Path B?
3. **Risks:** Enable `ProjectRisksTab` route vs build new Risk Register artifact vs both?
4. **“Governed” badge vs product principle “capabilities are quiet”** — `ProjectPageLayout.tsx:529-536` shows visible governance pill.
5. **Org-level heatmap:** Required for Path B or workspace-only?
6. **Inbox empty on staging:** Environment/data vs dispatch bug — needs trace from `notification-dispatch.service.ts` to Inbox API (§7.5).

## 15.5 Recommended Sprint 5 kickoff dispatches

### Dispatch 1 — Wire project Risks + align tab config (S)

- **Domain:** frontend (+ smoke backend)
- **Scope:** Replace `NotEnabledInProject` on `/projects/:id/risks` with `ProjectRisksTab`; ensure `visibleTabs` includes `risks` for risk templates.
- **Files:** `App.tsx:324`, `ProjectRisksTab.tsx`, `projectVisibleTabs.ts`, template `defaultTabs` in `system-template-definitions.ts`
- **Complexity:** S

### Dispatch 2 — Template Center filters + search parity (M)

- **Domain:** frontend
- **Scope:** Add filter chips (complexity, methodology, scope) already derivable from DTO; extend search to `templateCode`, tags in metadata if present.
- **Files:** `TemplateCenterModal.tsx`, `templates.api.ts`, `TemplateCenterPage.tsx`
- **Complexity:** M

### Dispatch 3 — Admin Workspace Snapshot real metrics (M)

- **Domain:** backend + frontend
- **Scope:** API returns `projectCount`, `budgetStatus`, `capacityStatus` per workspace; remove `UNKNOWN` placeholders in `mapAdminWorkspaceListItemToSnapshotRow`.
- **Files:** `administration.api.ts:98-121`, admin workspaces endpoint (backend), `AdministrationOverviewPage.tsx`
- **Complexity:** M

---

*End of Path B platform state recon (staging HEAD `b12a49e8`).*
