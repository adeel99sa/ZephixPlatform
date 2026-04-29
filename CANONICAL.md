# Zephix Canonical Architecture Reference

**Last updated:** 2026-04-29
**Status:** Living document — updated when engines change canonical/deprecated status
**Maintained by:** Architectural decisions documented in PRs that change status

---

## How To Use This Document

This is the gate for every PR and design decision in this repository.

**Before writing any new code, verify:**
1. Is the surface I'm modifying CANONICAL or DEPRECATED?
2. If DEPRECATED, does my work include migration AWAY from it (not into it)?
3. If introducing new code, does it duplicate canonical functionality?
4. Does my work fit the current engine validation focus?

**If a PR violates this document:** STOP. Either revise PR, or explicitly update this document with rationale, BEFORE merging.

---

## Glossary of Status Labels

- **✅ CANONICAL** — The authoritative implementation. New work goes here.
- **⚠️ MIGRATING** — Currently in use, but planned migration to canonical underway.
- **❌ DEPRECATED** — Do not extend. Has canonical replacement. Migration in progress or pending.
- **🗑️ DEAD** — Not registered, not used. Scheduled for deletion.
- **💤 DORMANT** — Exists but not wired to app. Defer decisions to v1.1+.

---

## Section 1: Backend Engines

### 1.1 Work Management Engine ✅ CANONICAL
- **Location:** `zephix-backend/src/modules/work-management/`
- **Files (verified 2026-04-29):** 21 entity files, 18 controllers, 29 services, 35 tests
- **Owns:** Tasks (WorkTask), Phases (WorkPhase), Risks (WorkRisk), Dependencies (WorkTaskDependency), Phase Gates (PhaseGateDefinition, PhaseGateSubmission), Approval Chains, Comments (TaskComment), Activity (TaskActivity), Capacity (WorkspaceMemberCapacity), Schedules (ScheduleBaseline), Earned Value, Iterations
- **Routes:** `/work/*`
- **Rule:** All new task/phase/risk work goes here. Do not create parallel implementations.

### 1.2 Tasks Legacy Module ❌ DEPRECATED
- **Location:** `zephix-backend/src/modules/tasks/`
- **Why deprecated:** Replaced by Work Management
- **Importers (verified 2026-04-29):** `app.module.ts` only (`TasksModule` registration); no other non-test module imports from `modules/tasks`
- **Migration target:** Use `WorkTask` from work-management instead
- **Migration plan:** Workstream T (T1: audit importers, T2: migrate consumers, T3: delete module)
- **Rule:** Do not import from `modules/tasks/`. Do not add new consumers.

### 1.3 PM Module ⚠️ MIGRATING (NOT deprecated yet)
- **Location:** `zephix-backend/src/pm/`
- **Current state in code:** `PMModule` exists and is imported into `app.module.ts` via `RiskManagementModule` only; non-risk PM controllers/routes still exist in `pm.module.ts` but `PMModule` itself is not imported in AppModule.
- **Survivor:** `pm/risk-management/` is imported directly in `app.module.ts` and functional.
- **Importers (verified 2026-04-29):**
  - `src/admin/admin.module.ts` and `src/admin/admin.service.ts` import PM workflow entities (`WorkflowTemplate`, `WorkflowInstance`)
  - `src/modules/templates/template.module.ts` and `src/modules/projects/projects.module.ts` import `ProjectMetrics`
  - `src/dashboard/dashboard.module.ts` and `src/dashboard/dashboard.service.ts` import `RiskManagementModule` / `RiskManagementService`
  - `src/app.module.ts` imports `RiskManagementModule` directly
- **Migration plan:** Workstream P (P1: migrate frontend, P2: resolve entity sharing, P3: remove non-risk PM surface)
- **Rule:** Do not add new imports from `pm/` unless migration work requires it.

### 1.4 Work Items Engine ✅ CANONICAL (agile paradigm)
- **Location:** `zephix-backend/src/modules/work-items/`
- **Owns:** WorkItem (task/bug/story/epic), WorkItemComment, WorkItemActivity
- **Routes:** `/work-items/*`, `/my-work`
- **Decision (locked):** Kept separate from Work Management. Work Items = agile, Work Management = waterfall/structured. Two paradigms is intentional architectural decision.
- **Rule:** Use Work Items for agile flows, Work Management for waterfall. Document which is being used in PR descriptions.

### 1.5 Risk Management
- **CANONICAL data:** `WorkRisk` entity in Work Management
- **CANONICAL routes:** `/work/risks/*`
- **MIGRATING:** `/pm/risk-management/*` (frontend still calls these in some surfaces)
- **DEPRECATED:** Direct usage of legacy `Risk` entity from `modules/risks/` or `pm/`
- **Migration plan:** Workstream M (M1: migrate frontend to /work/risks)

### 1.6 Resource Management ✅ CANONICAL
- **Location:** `zephix-backend/src/modules/resources/`
- **Owns:** Resource, ResourceAllocation, ResourceDailyLoad, ResourceConflict, UserDailyCapacity
- **Routes:** `/resources/*`, `/resource-allocations/*`, plus `/work/resources/*` in work-management
- **Known debt:** Legacy Task usage still appears in parts of the graph; resolve via Workstream T.

### 1.7 Budget Management ✅ CANONICAL
- **Location:** `zephix-backend/src/modules/budgets/`
- **Owns:** ProjectBudget and project budget governance endpoints
- **Routes:** `/work/workspaces/:workspaceId/projects/:projectId/budget`
- **Frontend cleanup state (verified 2026-04-29):** active usage resolves to `features/budget/budget.api.ts`; no `budgets.api.ts` references found in `src/`

### 1.8 Phase Gates / Approval ✅ CANONICAL (within Work Management)
- **Location:** Embedded in `modules/work-management/`
- **Entities:** PhaseGateDefinition, PhaseGateSubmission, PhaseGateSubmissionDocument, GateApprovalChain, GateApprovalChainStep, GateApprovalDecision
- **Frontend:** `features/phase-gates/` (verification needed in dedicated pass)

### 1.9 Governance Engine ✅ CANONICAL
- **Location:** `zephix-backend/src/modules/governance-rules/` + `governance-exceptions/` + `policies/`
- **Owns:** GovernanceRule, GovernanceRuleSet, GovernanceEvaluation, GovernanceException, PolicyDefinition, PolicyOverride
- **Routes:** `/admin/governance-rules/*`, `/admin/governance/*`, policy usage embedded in guards/services

### 1.10 Template Center ✅ CANONICAL
- **Location:** `zephix-backend/src/modules/template-center/`
- **Owns:** TemplateDefinition, TemplateVersion, TemplateComponent, TemplatePolicy, TemplateLineage, KPI Library, Document Library
- **Routes:** `/template-center/*`

### 1.11 Templates Legacy Module ❌ DEPRECATED
- **Location:** `zephix-backend/src/modules/templates/`
- **Status:** Parallel legacy system to Template Center; still active routes remain.
- **Migration plan:** Resolve duplicate controllers and phase out after Template Center is complete.
- **Rule:** Do not extend `modules/templates/`. New work goes to `template-center/`.

### 1.12 Audit ✅ CANONICAL
- **Location:** `zephix-backend/src/modules/audit/`
- **Owns:** AuditEvent (canonical), AuditService
- **Note:** Work Management has an audit entity mirror by design.

### 1.13 Notifications ✅ CANONICAL
- **Location:** `zephix-backend/src/modules/notifications/`
- **Known issue:** Circular dependency TODOs exist with org-invites/dispatch (defer).

### 1.14 KPI & Analytics ⚠️ MIGRATING (namespace fragmentation)
- **CANONICAL:** `modules/kpis/` (plural)
- **DEPRECATED:** `modules/kpi/` (singular, legacy)
- **Related:** `modules/analytics/`, `modules/kpi-queue/`
- **Migration plan:** M2 (consolidate to `/kpis`, deprecate `/kpi`)

### 1.15 Dashboards ✅ CANONICAL (plural module)
- **CANONICAL:** `modules/dashboards/`
- **LEGACY status:** `modules/dashboard/` exists as legacy singular module and remains imported in AppModule; treat as deprecation target.
- **Frontend:** `features/dashboards/`

### 1.16 Custom Fields ⚠️ ORPHANED
- **Location:** `zephix-backend/src/modules/custom-fields/`
- **Status:** Registered but integration with work entities is limited/orphaned.
- **Decision (locked):** Defer full feature to v1.1. Remove orphan entities in cleanup pass while preserving org-level shape.
- **Rule:** Do not expand scope until v1.1 design is approved.

### 1.17 Auth & Identity ✅ CANONICAL
- **Location:** `zephix-backend/src/modules/auth/`
- **Owns:** User auth/session flow (`/auth/*`), profile/password endpoints, sessions, email verification, org invite auth links.
- **Critical infrastructure** — extensive testing required before any changes.

### 1.18 Workspaces / Organization / Member ✅ CANONICAL
- **Location:** `modules/workspaces/`, `organizations/`, `modules/workspace-access/`
- **Foundation:** Multi-tenancy layer used by every other engine
- **Pending:** O1 — enable `ZEPHIX_WS_MEMBERSHIP_V1` on staging (operational/config track)

### 1.19 AI Engine ⚠️ SPLIT STATE
- **`src/ai/`** currently imported by PMModule (`AIModule`) and contains controllers/services; not deleted yet.
- **`modules/ai/`** scaffold also exists and is currently not imported into AppModule directly.
- **Working AI survivor:** PM risk-management and PM assistant routes are active.
- **Decision target:** Cleanup D1 must verify active vs dead AI surfaces before deletion.
- **Rule:** Do not add new AI surfaces until D1 cleanup and canonical AI ownership are finalized.

### 1.20 Knowledge Index ⚠️ NOT APP-REGISTERED but transitively imported
- **Location:** `zephix-backend/src/modules/knowledge-index/`
- **Status:** Not in AppModule directly, but imported by `DomainEventsModule` (which is imported by Projects/Integrations).
- **Risk:** Deletion requires removing `KnowledgeIndexModule` + `KnowledgeIndexEventSubscriber` references in domain-events first.
- **Cleanup plan:** D2 (safe removal with dependency cleanup in same PR)

### 1.21 Workflow Engine 💤 DORMANT
- **Location:** `zephix-backend/src/workflows/` (module not imported by AppModule)
- **Status:** Logic and tests exist; not wired to app bootstrap.
- **Dependency note:** Admin currently imports PM workflow entities (`pm/entities/workflow-template`, `workflow-instance`) not `src/workflows` entities.
- **Decision:** Keep dormant until v1.1 integration plan.
- **Rule:** Do not register or extend without explicit approval.

### 1.22 Integrations ✅ CANONICAL
- **Location:** `zephix-backend/src/modules/integrations/`
- **Owns:** ExternalTask, ExternalTaskEvent, external user mappings, Jira webhook
- **Routes:** `/integrations/*`

### 1.23 BRD Module 🗑️ DEAD (not app-registered)
- **Location:** `zephix-backend/src/brd/`
- **Status:** Module and controllers exist but are not imported in AppModule.
- **Cleanup plan:** Delete in cleanup workstream after dependency verification.

---

## Section 2: Frontend Surfaces

### 2.1 Admin Console ✅ CANONICAL
- **Location:** `zephix-frontend/src/features/administration/`
- **Routes:** `/administration/*`
- **Owns:** Profile, General, People, Teams, Security, Billing, Trash, Audit, Governance, Templates, etc.
- **Rule:** All admin and org-level configuration UI lives here. Do not create parallel surfaces.

### 2.2 `/pages/admin/` 🗑️ DELETED
- **Status:** Deleted in PR #211
- **Replaced by:** `features/administration/`

### 2.3 `/settings` page ⚠️ LIMITED
- **Location:** `zephix-frontend/src/pages/settings/`
- **Active routes:**
  - `/settings` → local account/workspace/org shell (limited)
  - `/settings/notifications` → `NotificationsSettingsPage`
  - `/settings/security` → `SecuritySettingsPage`
- **Redirected route:** `/settings/profile` → `/administration/profile`
- **Rule:** Do not create new duplicate admin surfaces under `/settings`; prefer `/administration/*`.

### 2.4 `archived-admin-components/` 🗑️ DELETED
- **Status:** Deleted in PR #210

### 2.5 `backup/` 🗑️ DELETED
- **Status:** Deleted in PR #210

### 2.6 Marketing Site ✅ CANONICAL (staging marketing surface)
- **Location:** `zephix-frontend/src/components/staging-marketing/` and supporting routes/pages
- **Status:** Live on staging environment
- **Rule:** Keep launch claims aligned with implemented scope.

### 2.7 Core Product Surfaces ✅ CANONICAL
- **Projects:** `features/projects/`
- **Workspaces:** `features/workspaces/`
- **Work management:** `features/work-management/`
- **Risks tab in projects:** present in routing (`/projects/:projectId/risks`) but currently renders `NotEnabledInProject` placeholder (not active risk management UI)

---

## Section 3: API Path Patterns

### Risks
- ✅ CANONICAL: `/work/risks/*`
- ⚠️ MIGRATING: `/pm/risk-management/*` (still used in some frontend PM components)

### Tasks
- ✅ CANONICAL: `/work/tasks/*`, `/my-work`
- ❌ DEPRECATED: `/tasks/*`

### Work Items (agile)
- ✅ CANONICAL: `/work-items/*` and workspace-scoped `/workspaces/:workspaceId/projects/:projectId/work-items`

### Templates
- ✅ CANONICAL: `/template-center/templates/*`
- ❌ DEPRECATED: `/templates/*` (legacy module)

### Auth
- ✅ CANONICAL: `/auth/*`
- Subset: `/auth/profile`, `/auth/change-password`, `/auth/sessions/*`

### Organizations
- ✅ CANONICAL (admin): `/admin/organization/*`
- ✅ CANONICAL (user-level): `/organizations/*`
- Two paths intentional — different access levels

### Dashboards
- ✅ CANONICAL: `/dashboards/*` (plural)
- ⚠️ LEGACY: singular `/dashboard` controller/module still present in backend graph

### KPIs
- ✅ CANONICAL: `/kpis/*`
- ❌ DEPRECATED: `/kpi/*`

### Governance
- ✅ CANONICAL: `/admin/governance-rules/*`, `/admin/governance/*`

### Integrations
- ✅ CANONICAL: `/integrations/*`

---

## Section 4: Architectural Decisions Log (locked)

### AD-001: Work Items vs Work Management Separation
- **Status:** LOCKED
- **Decision:** Two parallel work paradigms are intentional. Work Items = agile (story/epic/bug/task). Work Management = waterfall/structured (phases, gates, dependencies, capacity).
- **Rationale:** Different methodologies, data shapes, and UX contracts.
- **Rule:** Do not propose merging. Document paradigm choice in PR descriptions.

### AD-002: PM Surface Migration
- **Status:** LOCKED
- **Decision:** Keep `pm/risk-management` working; migrate/deprecate the rest of PM over time.
- **Rationale:** Mixed live + dormant PM surface currently exists; migration must be deliberate and non-breaking.

### AD-003: Custom Fields Defer
- **Status:** LOCKED
- **Decision:** Custom field deep integration is deferred to v1.1; clean orphaned fragments first.
- **Rationale:** Scope containment and reduced architectural confusion.

### AD-004: Workflow Engine Dormancy
- **Status:** LOCKED
- **Decision:** Keep `src/workflows/` dormant; do not register or extend yet.
- **Rationale:** Not wired to app bootstrap; requires full integration design.

### AD-005: Sequential Engine Validation
- **Status:** LOCKED
- **Decision:** No deadline-driven parallel validation; engines validated sequentially with founder sign-off.
- **Rationale:** Prevents debt re-accumulation and drift.

### AD-006: No Parallel Feature Work During Validation
- **Status:** LOCKED
- **Decision:** While validating Engine A, no new feature work on Engine B.
- **Rationale:** Prevents “fix scatter” and hidden regressions.

---

## Section 5: Current Validation Focus

**Foundation phase:** COMPLETE (when this PR + #214 merge)

**Currently validating:** Engine 1 — Auth & Identity (preparing for validation)

**Sign-off criteria:** All features manually tested by founder, integration with adjacent engines verified, no known bugs, founder explicit sign-off.

### Locked Engine Validation Sequence

The order below is locked. Engine N+1 begins only after Engine N is signed off. No parallel engine work.

1. **Auth & Identity** — Foundation; everything depends on this
2. **Workspaces / Org / Member** — Multi-tenancy foundation
3. **Work Management** — Integration hub for the platform
4. **Resources** — Connects to Work Management for capacity
5. **Risk Management** — Requires frontend migration to /work/risks first
6. **Phase Gates** — Critical for governance demo
7. **Governance**
8. **Template Center**
9. **Budgets**
10. **Dashboards**
11. **KPI & Analytics** — Requires namespace consolidation first
12. **Audit**
13. **Notifications**
14. **Admin Console** — Page-by-page wiring verification
15. **Work Items** — Separate paradigm per AD-001
16. **Integrations**

### Sequence Modification Rule

The sequence above can only change if:
1. An engine fails sign-off and dependency analysis reveals reordering needed
2. Architectural decision changes the integration model
3. Founder explicitly re-sequences with documented rationale (new AD entry)

Otherwise, the sequence is followed as listed.

### Validation History

(Updated as engines sign off)

| Engine | Sign-off Date | Notes |
|--------|---------------|-------|
| (none yet) | | |

---

## Section 6: Out-of-Scope Items (post-MVP)

The following are explicitly NOT in current scope. Do not propose, build, or extend until founder explicitly opens scope:

- Custom Fields → Task integration completion
- AI Engine full rebuild / consolidation (beyond current PM AI survivors)
- Knowledge Index redesign/rebuild after cleanup
- Workflow Engine wiring (`src/workflows`)
- Mobile app
- Desktop app
- External SDK/platform API expansion beyond current integrations
- New engine creation without architectural approval

**Rule:** If founder requests work in this list, this document is the gate. Either update Section 6 (with rationale) before proceeding, or defer.

---

## Section 7: How To Update This Document

1. When an engine status changes (e.g., DEPRECATED → DELETED), update Section 1 in the same PR that changes code.
2. When an architectural decision is made, add/update an AD entry in Section 4.
3. When validation focus shifts, update Section 5.
4. When scope opens, update Section 6 with rationale.
5. PR descriptions that alter architecture should state which CANONICAL.md sections were updated.

---

## Section 8: Security Log

This section records security-relevant events and architectural decisions
made in response. Updated whenever a security incident is identified or
mitigation is applied.

| Date | Event | Action | Rationale |
|------|-------|--------|-----------|
| 2026-04-29 | `zephix-backend/.env.test` discovered in tracked repo with live test DB credential. Investigation triggered while verifying refresh_tokens schema for PR #218. | PR #219: Removed `.env.test` from git tracking. Added `.env.test.example` template. Tightened `.gitignore`. Updated `SIGNUP_IMPLEMENTATION_COMPLETE.md` to remove stale reference. Test DB credential rotated in Railway (manual, by founder). No git history rewrite. | History is assumed compromised once a secret is committed; rotation is the actual mitigation. Template file preserves the developer onboarding pattern (copy → paste own values) without leaking secrets. History rewrite was rejected: messy on shared repos, breaks open PRs, and the credential should be assumed leaked the moment it touched git. |

### Security Log Maintenance Rules

1. Every credential leak, security review finding, or architectural decision
   with security implications gets an entry.
2. Format: Date | Event | Action | Rationale.
3. Entries are append-only — historical accuracy matters.
4. Linked PRs documented when applicable.
5. Reviewed during quarterly security audits (or whenever significant
   security work occurs).

### Onboarding Note for `.env.test`

```bash
cp zephix-backend/.env.test.example zephix-backend/.env.test
# Edit .env.test with your own DATABASE_URL value
# (Pull from team secrets manager or Railway dashboard)
# .env.test is in .gitignore — never commit it
```

