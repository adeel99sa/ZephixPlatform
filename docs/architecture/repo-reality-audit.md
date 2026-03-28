# Zephix Platform — Repo Reality Audit Report

**Date:** 2026-02-12
**Method:** Code-level evidence from `zephix-backend/src` and `zephix-frontend/src`. Every status is backed by file paths and line references. Nothing is assumed.

---

## Summary Table

| # | Capability | Status | Evidence Paths |
|---|-----------|--------|----------------|
| **A. Identity & Access** | | | |
| A1 | Login / logout / session | **Built** | `auth.controller.ts`, `jwt.strategy.ts`, `AuthContext.tsx` |
| A2 | `/auth/me` on app init | **Built** | `auth.controller.ts:71-89`, `AuthContext.tsx:33-67` |
| A3 | Workspace selection | **Built** | `workspace.store.ts`, `SidebarWorkspaces.tsx`, `useWorkspaceValidation.ts` |
| A4 | RBAC roles (owner/admin/member/guest) | **Built** | `platform-roles.enum.ts`, `workspaces.service.ts:197-261` |
| A5 | Guard enforcement on API routes | **Built** | `JwtAuthGuard` on most routes; `RequireWorkspaceAccessGuard`, `RequireOrgRoleGuard`, `AdminGuard` |
| A6 | Guest scoping to shared resources | **Built** | `workspace-access.service.ts:34-72`, `guest-home.service.ts`, `useWorkspacePermissions.ts:58-69` |
| A7 | Audit log for auth/role changes | **Partial** | `audit.service.ts` logs to console only; `events.track` for member suspend; no persistent audit table for auth events |
| **B. Workspace & People** | | | |
| B1 | Create workspace | **Built** | `workspaces.controller.ts`, `WorkspaceCreateModal.tsx` |
| B2 | Invite member | **Built** | `org-invites.controller.ts`, `workspace-invite.service.ts`, `WorkspaceMemberInviteModal.tsx` |
| B3 | Invite guest | **Built** | Org invites with `VIEWER` role assignment; `org-invite-workspace-assignment.entity.ts` |
| B4 | Role assignment UI and API | **Built** | `workspaces.controller.ts` PATCH role; `MembersTab.tsx` |
| B5 | Remove / deactivate user | **Built** | Org-level: `organizations.service.ts:208-238` (soft deactivate); Workspace: `workspace-members.service.ts` suspend/reinstate |
| B6 | Teams | **Partial** | Backend: `team.entity.ts`, `teams.service.ts`; Frontend: `TeamsPage.tsx` shows "Coming Soon"; No controller exposing CRUD for workspace teams |
| **C. Work Management** | | | |
| C1 | Project CRUD | **Built** | `projects.controller.ts`, `workspace-projects.controller.ts`, `projects.service.ts`, `project.entity.ts` |
| C2 | Task CRUD | **Built** | `work-tasks.controller.ts`, `task.controller.ts`, `work-item.controller.ts`, `work-items-simple.controller.ts` |
| C3 | Status workflow | **Built** | `project-workflow-config.entity.ts`, `workflow-config.controller.ts`, WIP limits in `wip-limits.service.ts` |
| C4 | Comments | **Built** | `task-comment.entity.ts`, `work-item-comment.entity.ts`, `task_comments` table |
| C5 | Attachments | **Missing** | No attachment entity, no file upload endpoint, no storage integration |
| C6 | Views: list | **Built** | `project-view.entity.ts` with types `list`, `board`, `calendar`, `gantt`; `projects-view.controller.ts` |
| C6 | Views: board | **Partial** | Route exists (`/projects/:id?tab=board`); `ProjectShellPage.tsx:163` disables non-list views in MVP |
| C6 | Views: calendar | **Placeholder** | View type defined in entity; no calendar rendering component |
| C7 | Search | **Built** | Backend: ILIKE on projects, tasks, templates, BRD full-text; Frontend: local + API search |
| **D. Templates** | | | |
| D1 | Template entities and tables | **Built** | `template.entity.ts`, `template-definition.entity.ts`, `template-version.entity.ts`, `template-block.entity.ts`, `template-component.entity.ts` |
| D2 | Instantiate template into project | **Built** | `template-apply.service.ts`, `templates-instantiate-v51.service.ts`, `projects.service.ts:804-904` |
| D3 | Template governance settings | **Built** | `template-policy.entity.ts` (`required_kpi`, `required_document`, `gate_rule`), `template-policy-resolver.service.ts` |
| **E. Docs** | | | |
| E1 | Docs CRUD | **Built** | `doc.entity.ts`, `docs.controller.ts`, `docs.service.ts`; DTOs for create/update |
| E2 | Project linking | **Partial** | Template-center `DocumentInstance` has `projectId`; Workspace `docs` linked by `workspaceId` only, no direct project FK |
| E3 | Permissions | **Built** | `DocsService` checks workspace access; write limited to owner/member roles |
| **F. Dashboards** | | | |
| F1 | Dashboard page exists | **Built** | `views/dashboards/Index.tsx`, `Builder.tsx`, `View.tsx`; routes at `/dashboards`, `/dashboards/:id`, `/dashboards/:id/edit` |
| F2 | Widgets backed by API | **Built** | `analytics-widgets.controller.ts`: `project-health`, `resource-utilization`, `conflict-trends`, `portfolio-summary`, `program-summary` |
| F3 | Cross-project aggregation | **Built** | Portfolio/program summary, health across workspace projects, conflict trends by week |
| F4 | Sprint metrics widget | **Placeholder** | Returns 501 (`analytics-widgets.controller.ts:193`) |
| F5 | `POST /widgets/query` | **Placeholder** | Frontend calls it; no backend handler |
| **G. Integrations** | | | |
| G1 | Calendar integration flows | **Placeholder** | View type `calendar` defined; no calendar sync, no ICS/CalDAV/Google Calendar |
| G2 | OAuth handling | **Placeholder** | `integration-connection.entity.ts` has `oauth` authType; only `api_token` implemented |
| G3 | Webhooks | **Built** | `integrations-webhook.controller.ts` for Jira; intake webhooks in `intake-form.service.ts` |
| G4 | API tokens page + backend | **Partial** | Frontend: `ApiKeysPage.tsx` calls `/admin/api-keys`; Backend: no `/admin/api-keys` controller |
| G5 | Jira integration | **Built** | `jira-client.service.ts`, `integration-sync.service.ts`, `JiraImportPanel.tsx` |
| **H. Billing** | | | |
| H1 | Plans page | **Built** | `BillingPage.tsx` loads real plans from API; `plans.service.ts`, `plan.entity.ts` |
| H2 | Invoices page | **Missing** | No invoices entity, API, or page |
| H3 | Entitlements / feature gating | **Partial** | `subscriptions.service.ts:309-351` `checkUsageLimit` exists but `used` always returns 0; no runtime enforcement |
| H4 | Seat counting | **Missing** | Plan defines `maxUsers` but actual user count never queried |
| H5 | Stripe integration | **Placeholder** | Entity columns for `stripePriceId`, `stripeSubscriptionId`; no Stripe SDK; subscribe/cancel return 501 |

---

## Detailed Evidence by Category

### A. Identity & Access

**A1-A2: Login, session, /auth/me** — **Built**

- Backend login: `auth.controller.ts` sets `zephix_session` and `zephix_refresh` cookies. JWT extracted from cookie first, then Authorization header fallback (`jwt.strategy.ts:18-32`).
- `/auth/me` at `auth.controller.ts:71-89` returns `{ user }` with id, email, role, organizationId.
- Frontend calls `/auth/me` on init via `AuthContext.tsx:33-67` with single-flight deduplication.
- Auth sessions persisted in `auth_sessions` table; sessions controller at `/auth/sessions` supports list/revoke.
- E2E test in `test/smoke/auth.e2e-spec.ts:44-59` validates the flow.

**A3: Workspace selection** — **Built**

- Zustand store `workspace.store.ts` persists `activeWorkspaceId`.
- `SidebarWorkspaces.tsx:71-77` handles switching with navigation.
- Auto-select first workspace on login (`SidebarWorkspaces.tsx:84-107`).
- `x-workspace-id` header injected by `lib/api/client.ts`.
- `useWorkspaceValidation.ts` validates persisted workspace is still accessible.

**A4: RBAC roles** — **Built**

- Platform roles: `ADMIN`, `MEMBER`, `VIEWER` in `platform-roles.enum.ts`.
- Legacy mapping normalizes `owner` -> `ADMIN`, `guest` -> `VIEWER`.
- Workspace roles: `workspace_owner`, `workspace_member`, `workspace_viewer`, `delivery_owner`, `stakeholder`.
- Role determination in `workspaces.service.ts:197-261` checks ownerId then WorkspaceMember status.
- Frontend: `useWorkspaceRole.ts` calls `GET /workspaces/:id/role`.

**A5: Guard enforcement** — **Built**

- `JwtAuthGuard` on nearly all controllers.
- `RequireWorkspaceAccessGuard` on workspace-scoped routes (projects, portfolios, programs, work-items).
- `RequireOrgRoleGuard` on admin operations (templates, workspace maintenance, custom-fields).
- `AdminGuard` on admin-only routes (resource-seed, trash, waitlist).
- `RequireWorkspacePermissionGuard` on granular workspace actions.

**Security gap:** `status-reporting.controller.ts` has ~11 commented-out `@UseGuards(ProjectPermissionGuard)` decorators. `ai-pm-assistant.controller.ts:214` has empty `@UseGuards()` "for testing".

**A6: Guest scoping** — **Built**

- `WorkspaceAccessService.getAccessibleWorkspaceIds` returns only member workspaces for non-ADMINs.
- `guest-home.service.ts` passes `PlatformRole.VIEWER`.
- Frontend `useWorkspacePermissions.ts:58-69` forces `isReadOnly: true` for `VIEWER`.

**A7: Audit log** — **Partial**

- `shared/services/audit.service.ts` — logs to console only (no database persistence for auth events).
- `audit_events` table exists for work-management phase-gate events.
- `events.track('workspace.member.suspended', ...)` fires on member suspend.
- `AdminAuditPage.tsx` renders "Audit log functionality coming soon".

---

### B. Workspace & People

**B1-B4: Workspace CRUD, invites, roles** — **Built**

- Full workspace CRUD in `workspaces.controller.ts` with `JwtAuthGuard` + `RequireWorkspaceAccessGuard`.
- Member invites: `workspace-invite.service.ts`, `org-invites.controller.ts`, `WorkspaceMemberInviteModal.tsx`, `InviteLinkModal.tsx`.
- Guest invites via org invites with workspace assignment (`org-invite-workspace-assignment.entity.ts`).
- Role assignment: PATCH endpoint and `MembersTab.tsx` UI.
- Tests: `WorkspaceMembersPage.test.tsx`, `WorkspaceMembersPageInviteLink.test.tsx`, `WorkspaceMembersPageSuspend.test.tsx`.

**B5: Remove/deactivate** — **Built**

- Org-level: `organizations.service.ts:208-238` sets `isActive = false` (preserves audit trail).
- Workspace-level: `workspace-members.service.ts` `suspend()` sets status `suspended` with timestamp/actor; `reinstate()` restores.
- Frontend: `AdminUsersPage.tsx` remove/bulk-remove; `MembersTab.tsx` remove member.

**B6: Teams** — **Partial**

- Backend entities: `team.entity.ts`, `team-member.entity.ts`, migration `1767000000001-CreateTeamsTables.ts`.
- Backend service: `teams.service.ts` with create, findAll, update, addMember, removeMember.
- **Gap:** No REST controller in `modules/teams/` exposing team CRUD (only `organizations/controllers/team-management.controller.ts` for org-level).
- Frontend: `TeamsPage.tsx` renders **"Teams Management Coming Soon"**.
- `teams.service.ts:110`: `// TODO: Add teamId to Project entity when team assignment is implemented`.

---

### C. Work Management

**C1: Project CRUD** — **Built**

- `projects.controller.ts`, `workspace-projects.controller.ts` with full CRUD.
- `project.entity.ts` with 56+ columns, workspace/org scoping.
- Project clone: `project-clone.controller.ts`, `project-clone.service.ts`, `project-clone-request.entity.ts` (new, untracked).
- Frontend: `ProjectCreateModal.tsx`, `DuplicateProjectModal.tsx`, `ProjectShellPage.tsx`.
- Tests: `projects.service.spec.ts`, `project-clone.controller.spec.ts`, `project-clone.service.spec.ts`.

**C2: Task CRUD** — **Built**

- Three task systems coexist:
  1. Legacy `tasks` module (`tasks.controller.ts`, `task.entity.ts`)
  2. `work-items` module (`work-item.controller.ts`, `work-items-simple.controller.ts`)
  3. `work-management` module (`work-tasks.controller.ts`, `work-task.entity.ts`)
- Frontend: `TaskListSection.tsx`, `ProjectTasksList.tsx`, `WorkItemDetailPanel.tsx`.

**C3: Status workflow** — **Built**

- `project-workflow-config.entity.ts` stores per-project workflow config.
- `workflow-config.controller.ts` + `workflow-config.service.ts` for CRUD.
- WIP limits enforced in `wip-limits.service.ts` (tested in spec).

**C4: Comments** — **Built**

- `task-comment.entity.ts` (work-management), `work-item-comment.entity.ts` (work-items).
- `work-item-comment.service.ts` for CRUD.
- `task_comments` migration in `17980208000000-CreateTaskCommentsTable.ts`.

**C5: Attachments** — **Missing**

- No attachment entity, no file upload controller, no S3/storage integration anywhere in the codebase.

**C6: Views** — **Partial**

- `project-view.entity.ts` defines types: `list`, `board`, `calendar`, `gantt`.
- `projects-view.controller.ts` manages view CRUD.
- Frontend routes exist for Overview, Plan, Tasks, Board, Gantt, Risks, Resources tabs.
- **But** `ProjectShellPage.tsx:163`: non-list views disabled in MVP ("View disabled in MVP. Enable later.").
- Calendar view: type defined, no rendering component.

**C7: Search** — **Built**

- Backend ILIKE search on projects, work-tasks, templates, organizations, workspace members, teams, template-center.
- BRD full-text search via `search_vector` column.
- Template-center cross-entity search (`template-center-search.service.ts`).
- Frontend: local filtering + API `search` param on task lists.

---

### D. Templates — **Built**

- Rich entity model: `TemplateDefinition`, `TemplateVersion`, `TemplatePolicy`, `TemplateComponent`, `Template`, `TemplateBlock`, `LegoBlock`.
- Template instantiation: `template-apply.service.ts` creates KPIs, document instances, lineage; `templates-instantiate-v51.service.ts` for v5.1 flow.
- Governance: `template-policy.entity.ts` types `required_kpi`, `required_document`, `gate_rule`; resolved by `template-policy-resolver.service.ts`.
- Frontend: `TemplateDetailPage.tsx`, `UseTemplateModal.tsx`, `TemplatePreviewModal.tsx`, `TemplatesActivationPanel.tsx`.
- Tests: `template-center.apply.integration.spec.ts`, `template-policy-resolver.service.spec.ts`.

---

### E. Docs — **Built** (with gaps)

- Entity: `doc.entity.ts` (`docs` table) with `workspaceId`, `title`, `content`, `createdByUserId`.
- Controller: `docs.controller.ts` — `POST workspaces/:workspaceId/docs`, `GET docs/:docId`, `PATCH docs/:docId`.
- Service: workspace access checks, role-based write.
- Template-center docs: `DocumentInstance`, `DocumentVersion` with `projectId` — project-linked.
- **Gap:** Workspace `docs` entity has no `projectId` FK — only workspace-scoped, not project-linked.
- Frontend: `DocsPage.tsx` renders doc viewer but "AI-powered features (coming soon)", "API documentation coming soon".

---

### F. Dashboards — **Built**

- Full dashboard lifecycle: create, edit, view, share, templates.
- Entity model: `Dashboard`, `DashboardWidget`, `DashboardTemplate`, `MetricDefinition`.
- Analytics widgets API: `project-health`, `resource-utilization`, `conflict-trends`, `portfolio-summary`, `program-summary`.
- Cross-project aggregation: portfolio/program summaries, workspace health rollups.
- Builder: `react-grid-layout` based widget positioning.
- Sharing: `dashboard-sharing` migration, `OptionalJwtAuthGuard` for public view.
- **Gaps:** Sprint metrics returns 501; `POST /widgets/query` has no backend handler.

---

### G. Integrations — **Partial**

- **Jira** — **Built**: `jira-client.service.ts` (basic auth), `integration-sync.service.ts`, webhook endpoint, frontend import panel.
- **Webhooks** — **Built**: Jira webhook processing, intake webhooks.
- **OAuth** — **Placeholder**: `authType: 'oauth'` defined in entity but never implemented.
- **Calendar sync** — **Placeholder**: View type only, no sync.
- **API tokens** — **Partial**: Frontend `ApiKeysPage.tsx` exists; no backend controller.
- **Slack/Teams** — **Placeholder**: `notification-dispatch.service.ts:114` "TODO: Slack and Teams notifications when integrations are configured".

---

### H. Billing — **Partial**

- **Plans page** — **Built**: `BillingPage.tsx` loads from API; `plans.service.ts` reads from DB.
- **Subscribe/cancel** — **Placeholder**: Returns 501 Not Implemented.
- **Invoices** — **Missing**: No entity, no API, no page.
- **Entitlements** — **Partial**: `checkUsageLimit` has limit definitions but `used` is hardcoded to 0.
- **Seat counting** — **Missing**: Plan defines `maxUsers` but no query counts actual seats.
- **Stripe** — **Placeholder**: Schema columns exist (`stripePriceId`, `stripeSubscriptionId`); no Stripe SDK installed; no payment processing.

---

## Gaps List — Smallest Next Steps

| # | Missing Item | Smallest Next Step |
|---|-------------|-------------------|
| 1 | **Attachments (C5)** | Create `attachment.entity.ts` with `workItemId`, `fileName`, `storageKey`, `mimeType`; add S3 presigned URL upload endpoint |
| 2 | **Board/Gantt views (C6)** | Remove MVP disable flag in `ProjectShellPage.tsx:163`; implement `BoardView.tsx` using existing `work-task` status groups |
| 3 | **Audit log persistence (A7)** | Replace console-only `audit.service.ts` with writes to `audit_events` table; add auth event types |
| 4 | **Invoices (H2)** | Create `invoice.entity.ts` with subscription FK; add `GET /billing/invoices` endpoint |
| 5 | **Stripe integration (H5)** | Install `stripe` package; implement `subscribe()` and `cancel()` in `subscriptions.service.ts` using Stripe Checkout |
| 6 | **Seat counting (H4)** | Query `COUNT(*)` from `user_organizations` where `isActive = true` in `checkUsageLimit` |
| 7 | **API tokens backend (G4)** | Create `api-key.entity.ts` and `admin/api-keys.controller.ts` with hash-based key storage |
| 8 | **OAuth for integrations (G2)** | Implement OAuth2 PKCE flow in `integration-connection.service.ts`; add token refresh |
| 9 | **Calendar sync (G1)** | Integrate Google Calendar API with OAuth; sync project milestones as calendar events |
| 10 | **Teams UI (B6)** | Wire `TeamsPage.tsx` to existing `teams.service.ts`; create `teams.controller.ts` in modules/teams |
| 11 | **Doc project linking (E2)** | Add `projectId` FK to `doc.entity.ts`; update `docs.controller.ts` to support project-scoped docs |
| 12 | **Sprint metrics (F4)** | Implement sprint entity and `sprint_metrics` widget query in `analytics-widgets.controller.ts` |
| 13 | **Commented-out guards** | Re-enable `@UseGuards(ProjectPermissionGuard)` on 11 endpoints in `status-reporting.controller.ts` |

---

## Risk List

### Security Risks

| Risk | Severity | Evidence | Mitigation |
|------|----------|----------|------------|
| **11 unguarded status-reporting endpoints** | **High** | `status-reporting.controller.ts` — 11 `@UseGuards(ProjectPermissionGuard)` lines commented out | Re-enable guards immediately |
| **AI assistant endpoint unguarded** | **High** | `ai-pm-assistant.controller.ts:214` — `@UseGuards()` empty for testing | Add `JwtAuthGuard` |
| **Rate limiter disabled on demo-requests** | Medium | `demo-request.controller.ts:25` — `// @UseGuards(RateLimiterGuard)` | Re-enable |
| **Webhook signature verification missing** | Medium | `integrations-webhook.controller.ts:67` — "TODO: Implement webhook signature verification in Phase 3" | Implement HMAC verification |
| **Placeholder org-id for system templates** | Low | `templates.service.ts:830` — placeholder organizationId for SYSTEM templates | Use dedicated system org constant |

### Data Integrity Risks

| Risk | Severity | Evidence | Mitigation |
|------|----------|----------|------------|
| **Three overlapping task systems** | **High** | `tasks`, `work-items`, `work-management` modules with separate entities/tables | Consolidate to single task model; deprecate legacy |
| **Billing `used` always 0** | Medium | `subscriptions.service.ts:339` — no actual usage calculation | Implement real counting queries |
| **Demo-request has no persistence** | Low | `demo-request.service.ts:19` — "TODO: Implement actual database storage" | Create entity and repository |

### Migration Readiness

| Risk | Severity | Evidence | Mitigation |
|------|----------|----------|------------|
| **109 TypeScript + 8 SQL migrations** | Medium | Mixed migration formats; some manual SQL alongside TypeORM | Standardize on TypeORM migrations only |
| **Untracked clone migrations** | Low | 3 new migration files in git untracked state | Commit and test in staging |

### Authorization Holes

| Risk | Severity | Evidence | Mitigation |
|------|----------|----------|------------|
| **Workspace settings page is a stub** | Low | `/workspaces/:id/settings` -> `<div>Workspace Settings</div>` | Implement or remove route |
| **`POST /widgets/query` unhandled** | Low | Frontend calls it; no backend handler — returns 404 | Add controller endpoint or remove frontend call |
| **Workspace archive not implemented** | Low | `workspaces.controller.ts:580` — "TODO: Implement archive logic" | Implement soft-archive or remove endpoint |
| **Email invite not implemented** | Low | `workspaces.controller.ts:1082` — "TODO: Implement email invite if email service exists" | Wire to email service |

---

## Scorecard

| Category | Built | Partial | Placeholder | Missing | Total |
|----------|-------|---------|-------------|---------|-------|
| A. Identity & Access | 6 | 1 | 0 | 0 | 7 |
| B. Workspace & People | 5 | 1 | 0 | 0 | 6 |
| C. Work Management | 5 | 1 | 1 | 1 | 8 |
| D. Templates | 3 | 0 | 0 | 0 | 3 |
| E. Docs | 2 | 1 | 0 | 0 | 3 |
| F. Dashboards | 3 | 0 | 2 | 0 | 5 |
| G. Integrations | 2 | 1 | 2 | 0 | 5 |
| H. Billing | 1 | 1 | 1 | 2 | 5 |
| **Totals** | **27** | **6** | **6** | **3** | **42** |

**Overall: 64% Built, 14% Partial, 14% Placeholder, 7% Missing**

---

## Verdict

The core platform (auth, workspaces, projects, tasks, templates, dashboards, RBAC) is **substantively built** with real entities, migrations, services, controllers, and frontend wiring. The highest-priority gaps are **attachments** (completely missing), **billing payment processing** (schema only, no Stripe), and **security holes** from commented-out guards on ~12 endpoints. The three coexisting task systems represent significant technical debt. Teams, calendar sync, and API tokens are the most visible "almost there" features that need controller/UI completion.
