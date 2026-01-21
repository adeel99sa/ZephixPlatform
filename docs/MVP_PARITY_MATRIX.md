# MVP Parity Matrix: Zephix vs Linear vs ClickUp

**Date:** 2025-01-27
**Purpose:** Evidence-based comparison of Zephix capabilities against Linear and ClickUp for MVP readiness
**Scope:** Core project management workflow only (workspace → project → task → status → dashboard)

---

## MVP Scope Definition

**One-sentence MVP:** Admin creates a workspace, creates a project from a template, assigns tasks to members, members update status and comment, admin sees rollups and one basic reporting surface, with role-gated access.

**MVP Flow Steps:**
1. Login
2. Land on role home
3. Enter workspace by slug
4. Create project from template
5. Assign work and update status
6. Verify rollups and basic reporting

---

## Outcome Matrix

**Legend:**
- ✅ **Ready** - Complete and working
- ⚠️ **Partial** - Exists but incomplete or needs verification
- ❌ **Missing** - Not built

**Evidence Types:** Doc only, based on the excerpts shared in this session.

| # | Outcome/Capability | Status | Evidence | MVP Work | Dependency | Owner |
|---|-------------------|--------|----------|----------|------------|-------|
| 1 | Orientation on login, role-specific landing | ❌ **Missing** | `PLATFORM_REVIEW_AND_NEXT_STEPS.md`, Role Home and Workspace Home Status, Not Built section | Build `/home` role router and 3 views: AdminHome, MemberHome, GuestHome. Add backend aggregations for each. | Auth role normalization already exists | Frontend plus Backend |
| 2 | Workspace entry by slug to workspace home | ❌ **Missing** | `PLATFORM_REVIEW_AND_NEXT_STEPS.md`, Workspace Governance and Role Home sections, `/w/:slug/home` not built | Add route `/w/:slug/home`, wire to WorkspaceHome, ensure slug redirect supports it. | Workspace slug resolution endpoint | Frontend |
| 3 | Workspace home health snapshot | ⚠️ **Partial** | `PLATFORM_REVIEW_AND_NEXT_STEPS.md`, WorkspaceHome exists but missing health snapshot | Add workspace health endpoint and UI widget block for health snapshot. | Rollup services and work item status data quality | Backend plus Frontend |
| 4 | Admin workspace creation flow | ⚠️ **Partial** | `docs/PHASE_6_TESTER_SCRIPT.md`, One Workspace Setup flow exists as expectation, `PLATFORM_REVIEW_AND_NEXT_STEPS.md` says workspace creation built | Polish UX, validation, and role gating for creation and member invites. Add success confirmations and empty states. | RBAC consistency | Frontend plus Backend |
| 5 | Template to project flow | ⚠️ **Partial** | `docs/PHASE_6_TESTER_SCRIPT.md`, Template to Project Flow required. `PLATFORM_REVIEW_AND_NEXT_STEPS.md` says template apply exists, builder limitations noted elsewhere | Ensure template apply creates project, phases, tasks reliably. Add preview and validation for template JSON. | Template schema validation | Backend plus Frontend |
| 6 | Work execution proof, assign work | ⚠️ **Partial** | `PLATFORM_REVIEW_AND_NEXT_STEPS.md`, Work Management, multiple task entities and flow incomplete. `docs/PHASE_6_TESTER_SCRIPT.md` expects assign and update. | Pick one execution entity for MVP UI path, enforce assignment and update flows in UI and API, remove dead paths. | Entity consolidation decision | Backend plus Frontend |
| 7 | Task status progression enforcement | ⚠️ **Partial** | `PLATFORM_REVIEW_AND_NEXT_STEPS.md`, status flow enforcement not fully implemented | Define allowed transitions, enforce in service layer, block invalid transitions in UI. | Canonical status enum and policy | Backend plus Frontend |
| 8 | Comments on work items | ⚠️ **Partial** | `PLATFORM_REVIEW_AND_NEXT_STEPS.md`, comments and activity exist but end-to-end aggregation incomplete | Ensure comment create, list, notification wiring for comments, and basic activity timeline. | Notifications | Backend plus Frontend |
| 9 | Member sees assigned work in one place | ⚠️ **Partial** | `PLATFORM_REVIEW_AND_NEXT_STEPS.md`, Member Home not built. My Work exists as concept, docs mention My work controller in other streams but ignore that here. | Build member home section that lists assigned items with filters, due soon, overdue. | Reliable assignment and status data | Frontend plus Backend |
| 10 | Rollup proof, program and portfolio rollups | ⚠️ **Partial** | `docs/PHASE_6_TESTER_SCRIPT.md` rollup proof required. `PLATFORM_REVIEW_AND_NEXT_STEPS.md` says rollups pending and permission inheritance not fully tested | Ensure portfolio and program pages show totals and health, refresh on link and unlink. | Rollup services and recalculation triggers | Backend plus Frontend |
| 11 | Link and unlink project to program and portfolio | ⚠️ **Partial** | `docs/PHASE_6_TESTER_SCRIPT.md` includes link and unlink proof. `PLATFORM_REVIEW_AND_NEXT_STEPS.md` indicates hierarchy exists but end-to-end incomplete | Build link and unlink UI and endpoints, ensure instant tag update and rollup recalculation. | Program and portfolio relations and permissions | Backend plus Frontend |
| 12 | Basic reporting surface | ⚠️ **Partial** | `PLATFORM_REVIEW_REPORT.md`, dashboard builder in progress and remaining list. `PLATFORM_REVIEW_AND_NEXT_STEPS.md` says dashboards partially built | Pick one reporting surface for MVP, either a simple dashboard view with fixed widgets or rollup health panel. Ship with sharing off by default. | Data availability and widget data endpoints | Frontend plus Backend |
| 13 | Dashboard builder | ⏸️ **Post-MVP** | `PLATFORM_REVIEW_REPORT.md`, Dashboard Builder remaining items list is large | Defer. Ship view-only dashboards if needed. | None for MVP if deferred | Frontend |
| 14 | Notifications for core actions | ⚠️ **Partial** | `PLATFORM_REVIEW_AND_NEXT_STEPS.md`, notifications exist but wiring incomplete | Wire task assigned, status changed, comment added. Deliver in-app inbox plus email for those events only. | Event emission consistency | Backend plus Frontend |
| 15 | Permissions never leak data across workspaces | ⚠️ **Partial** | `PLATFORM_REVIEW_AND_NEXT_STEPS.md`, role enforcement inconsistent and workspace scoping gaps noted broadly | Full sweep of workspace-scoped endpoints used in MVP flow, plus tests proving 404 or 403 behavior for cross-workspace attempts. | RBAC and workspace access guards consistency | Backend plus QA |
| 16 | External integration, at least one real end-to-end | ⏸️ **Post-MVP** | `PLATFORM_REVIEW_REPORT.md`, sync engine is mock or partial and no Linear adapter | Defer. If required for early adopters, pick one small integration and ship read-only import first. | Integration architecture and polling or webhooks | Backend |
| 17 | Admin console completeness | ⏸️ **Post-MVP** | `PLATFORM_REVIEW_AND_NEXT_STEPS.md`, several admin pages stubs | Defer. Keep only what supports workspace creation and basic management. | None for MVP | Frontend plus Backend |

---

## MVP Readiness Verdict

Based on the documents shared, **Zephix is near-MVP but blocked by orientation and workspace entry.**

### MVP Blockers to Clear Before External Users

1. **Role-specific `/home`** - Missing role router and 3 home views
2. **`/w/:slug/home` route** - Missing workspace home route
3. **Workspace health snapshot block on workspace home** - Partial, needs endpoint and UI
4. **Status progression enforcement for the execution entity you choose** - Partial, needs transition rules
5. **Rollup proof for program and portfolio, including link and unlink refresh** - Partial, needs verification and refresh triggers
6. **Core notifications wiring for assignment, status change, comment** - Partial, needs event wiring

---

## Clean Separation from Security and Test Stream

This matrix does not claim any backend hardening, guard fixes, dashboards authorization work, or e2e stabilization. Track those in a separate "Security and Test Stabilization" doc with commits and proofs.

---

**Last Updated:** 2025-01-27
**Evidence Sources:** `PLATFORM_REVIEW_REPORT.md`, `PLATFORM_REVIEW_AND_NEXT_STEPS.md`, `docs/PHASE_6_TESTER_SCRIPT.md`, `docs/PHASE_7_4_TEST_STATUS.md`
