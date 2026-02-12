# Platform E2E Verification Report — v0.5.1-rc.1

**Date**: 2026-02-07  
**Status**: Ready for execution  
**Author**: Automated verification suite

---

## 1. What Was Tested

### Scope

Full end-to-end platform verification across all core Zephix modules:

| # | Module | API Tests | UI Tests | Seed Data |
|---|--------|-----------|----------|-----------|
| 0 | Environment Sanity | Health, Auth, CSRF, Onboarding, Workspace list | Login flow | Registration/Login |
| 1 | Work Management | Project CRUD, Plan, Phases, Tasks (CRUD + status transitions + soft-delete/restore) | Project shell, Plan tab, Tasks tab, no 403 spam | 2 projects, 3 phases each, 10 tasks each |
| 2 | Resource Management | Allocation CRUD, heat-map, capacity | Resources tab, allocation integrity | 6 allocations across projects |
| 3 | Risk Management | Risk CRUD, owner validation, project scoping | Risks tab, severity/status display | 2 risks per project |
| 4 | Budget | Project budget/actualCost fields, KPIs | Project overview budget display | Budget fields on both projects |
| 5 | Template Center | Recommendations, preview, instantiation | Template Center page, template list | Templates for project creation |
| 6 | Dashboards | List, create, templates, workspace scoping | Dashboard index, API integrity | Dashboard creation |
| 7 | AI Assistant | Dashboard suggest, dashboard generate | — | AI endpoints (requires config) |
| 8 | Cross-module Integrity | Task/risk/allocation project isolation, workspace scoping | Org scoping, workspace headers | All seeded data |
| 9 | RBAC | Admin endpoints, org users, workspace members | Admin panel access, route guards, paid route guards | Admin user |

### Baseline Dataset (per run)

- 1 organization + 1 workspace
- 2 projects (Alpha=small, Beta=medium), created from templates when available
- 3 phases per project (6 total)
- 10 tasks per project (20 total), with varied statuses (TODO, IN_PROGRESS, DONE, BACKLOG, BLOCKED)
- 3 task assignments to admin user
- 2 risks per project (4 total) with severity HIGH and MEDIUM
- 3 allocations per project (6 total) at 30%, 20%, 10%
- Budget fields set on both projects ($50K/$120K)
- Onboarding completed

---

## 2. Test Infrastructure

### Scripts Created

| Script | Purpose | Location |
|--------|---------|----------|
| `e2e-seed.sh` | Creates deterministic baseline dataset via API calls | `scripts/smoke/e2e-seed.sh` |
| `e2e-api.sh` | Hits all critical endpoints with seeded IDs, records pass/fail | `scripts/smoke/e2e-api.sh` |
| `release-smoke-full.sh` | Orchestrates: seed → API smoke → Playwright smoke | `scripts/release-smoke-full.sh` |

### Playwright Smoke Tests

| Test File | Module | Tests |
|-----------|--------|-------|
| `work-management.spec.ts` | Work Management | Project list, shell, plan, tasks, CRUD, no 403 |
| `resources.spec.ts` | Resources | Resources tab, allocation API, data integrity |
| `risks.spec.ts` | Risks | Risks tab, seeded risks, owner validation |
| `budget.spec.ts` | Budget | Project budget fields, KPIs endpoint |
| `templates.spec.ts` | Templates | Template Center, recommendations, list |
| `dashboards.spec.ts` | Dashboards | Dashboard index, API, templates, workspace scope |
| `rbac.spec.ts` | RBAC | Admin access, route protection, data isolation |
| `helpers.ts` | Shared | Login, workspace selection, navigation, assertions |

All tests in `zephix-frontend/tests/smoke/`.

---

## 3. Pass/Fail per Module (Pre-Execution)

> **Status**: Tests are authored and ready. Run the suite to populate actual results.

### API Smoke Tests (`e2e-api.sh`)

| Module | Endpoint | Expected | Status |
|--------|----------|----------|--------|
| Health | `GET /health` | 200 | PENDING |
| Health | `GET /health/live` | 200 | PENDING |
| Health | `GET /health/ready` | 200 | PENDING |
| Auth | `POST /auth/login` | 200 + cookies | PENDING |
| Auth | `GET /auth/csrf` | CSRF token | PENDING |
| Auth | `GET /auth/me` | 200 + user data | PENDING |
| Onboarding | `GET /organizations/onboarding/status` | 200 | PENDING |
| Workspaces | `GET /workspaces` | 200 | PENDING |
| Projects | `GET /projects?workspaceId=...` | 200 | PENDING |
| Projects | `GET /projects/:id` | 200 | PENDING |
| Plan | `GET /work/projects/:id/plan` | 200 | PENDING |
| Overview | `GET /work/projects/:id/overview` | 200 | PENDING |
| Tasks | `GET /work/tasks?projectId=...` | 200 + items | PENDING |
| Tasks | `GET /work/tasks/:id` | 200 | PENDING |
| Tasks | `PATCH /work/tasks/:id` | 200 (update title) | PENDING |
| Tasks | `PATCH /work/tasks/:id` | 200 (set DONE) | PENDING |
| Tasks | `POST /work/tasks` | 201/200 (create) | PENDING |
| Tasks | `DELETE /work/tasks/:id` | 200/204 (delete) | PENDING |
| Tasks | `POST /work/tasks/:id/restore` | 200 (restore) | PENDING |
| Phases | `GET /work/phases?projectId=...` | 200 | PENDING |
| Phases | `POST /work/phases` | 200 (create) | PENDING |
| Phases | `DELETE /work/phases/:id` | 200 (delete) | PENDING |
| Phases | `POST /work/phases/:id/restore` | 200 (restore) | PENDING |
| Allocations | `GET /work/resources/allocations?projectId=...` | 200 | PENDING |
| Allocations | `POST /work/resources/allocations` | 200 (create) | PENDING |
| Allocations | `PATCH /work/resources/allocations/:id` | 200 (update) | PENDING |
| Allocations | `DELETE /work/resources/allocations/:id` | 200/204 (delete) | PENDING |
| Risks | `GET /work/risks?projectId=...` | 200 | PENDING |
| Risks | `POST /work/risks` | 200 (create) | PENDING |
| Budget | `GET /projects/:id` (budget fields) | budget != null | PENDING |
| Budget | `PATCH /projects/:id` (update budget) | 200 | PENDING |
| KPIs | `GET /projects/:id/kpis` | 200 or 404 | PENDING |
| Templates | `GET /templates` | 200 | PENDING |
| Templates | `GET /templates/recommendations` | 200 | PENDING |
| Templates | `GET /templates/:id/preview-v5_1` | 200 | PENDING |
| Templates | `POST /templates/:id/instantiate-v5_1` | 200 | PENDING |
| Dashboards | `GET /dashboards` | 200 | PENDING |
| Dashboards | `POST /dashboards` | 200 (create) | PENDING |
| Dashboards | `GET /dashboards/:id` | 200 | PENDING |
| AI | `POST /ai/dashboards/suggest` | 200 | PENDING |
| AI | `POST /ai/dashboards/generate` | 200 | PENDING |
| Integrity | Tasks belong to correct project | All match | PENDING |
| Integrity | Risks belong to correct project | All match | PENDING |
| Integrity | Allocations belong to correct project | All match | PENDING |
| Integrity | Project workspace matches seeded | Match | PENDING |
| RBAC | `GET /organizations/admin/users` | 200 (admin) | PENDING |
| RBAC | `GET /organizations/users` | 200 | PENDING |
| RBAC | `GET /workspaces/:id/members` | 200 | PENDING |

### Playwright Smoke Tests

| Test File | Test Name | Status |
|-----------|-----------|--------|
| work-management | project list loads without errors | PENDING |
| work-management | project shell loads for seeded project | PENDING |
| work-management | plan tab shows phases and tasks | PENDING |
| work-management | tasks tab lists seeded tasks | PENDING |
| work-management | task CRUD operations work via API | PENDING |
| work-management | no 403 spam across navigation | PENDING |
| resources | resources tab loads for seeded project | PENDING |
| resources | allocations API returns data for seeded project | PENDING |
| resources | no 403 errors on resource pages | PENDING |
| resources | resources page loads for standalone route | PENDING |
| risks | risks tab loads for seeded project | PENDING |
| risks | risks API returns seeded risks with correct project | PENDING |
| risks | risk owner is a valid user | PENDING |
| risks | no 403 errors on risk pages | PENDING |
| budget | project overview shows budget data | PENDING |
| budget | project KPIs endpoint works | PENDING |
| budget | budget uses same project id and org id | PENDING |
| templates | template center page loads | PENDING |
| templates | template recommendations API works | PENDING |
| templates | template list API returns templates | PENDING |
| templates | no 403 errors on template pages | PENDING |
| dashboards | dashboards index page loads | PENDING |
| dashboards | dashboards API returns data | PENDING |
| dashboards | dashboard templates endpoint works | PENDING |
| dashboards | dashboards respect workspace scope | PENDING |
| dashboards | no 403 errors on dashboard pages | PENDING |
| rbac | admin can access projects page | PENDING |
| rbac | admin can access workspaces page | PENDING |
| rbac | admin can access settings page | PENDING |
| rbac | admin can access admin panel | PENDING |
| rbac | admin can access template center | PENDING |
| rbac | admin can access dashboards | PENDING |
| rbac | admin can access my-work (paid route) | PENDING |
| rbac | unauthenticated user cannot access protected routes | PENDING |
| rbac | unauthenticated user cannot access admin routes | PENDING |
| rbac | API responses scope data to current org | PENDING |
| rbac | workspace requests include workspace header | PENDING |

---

## 4. Known Limitations and Risks

### Architecture Notes

| Area | Note | Impact |
|------|------|--------|
| Budget | No separate Budget entity; stored as `budget` and `actualCost` fields on Project | Budget CRUD is project-level PATCH only |
| AI | AI endpoints require LLM configuration | Tests will WARN (not FAIL) if AI not configured |
| Member/Viewer RBAC | Seed creates only admin user | Full role-based testing requires additional user creation |
| CSRF | Backend requires CSRF for mutations | Seed script auto-acquires token; may fail if CSRF flow changes |
| Response envelope | Backend wraps some responses in `{ data: T }` | Scripts handle both wrapped and unwrapped |

### Potential Failure Points

1. **API response envelope mismatch** — Some endpoints return `{ data: T }`, others return `T` directly. All scripts normalize this.
2. **Workspace header missing** — `x-workspace-id` required for `/work/*`, `/projects/*`. Seed ensures header is set on all calls.
3. **RBAC guard mismatch** — Backend may enforce different role checks than frontend assumes. API tests verify actual behavior.
4. **Feature flags** — Some modules (Programs, Portfolios) are behind feature flags. These are excluded from current suite.
5. **Task status transitions** — Backend enforces status transition rules. Seed follows valid transition paths.

### Skipped Tests (with Reasons)

| Test | Reason |
|------|--------|
| Member role CRUD verification | Requires invite flow + separate user login |
| Viewer (Guest) read-only verification | Requires invite flow + separate user login |
| Cross-org data leakage (negative test) | Requires second org setup |
| AI action creates real entity | Requires AI config + entity verification |
| Dashboard widget data accuracy | Requires widget rendering engine |
| Programs / Portfolios | Feature flagged, not in core scope |

---

## 5. Exact Rerun Commands

```bash
# Full suite (seed + API + Playwright)
./scripts/release-smoke-full.sh http://localhost:3000/api

# Seed only (creates baseline data, writes e2e-ids.json)
./scripts/smoke/e2e-seed.sh http://localhost:3000/api

# API smoke only (requires e2e-ids.json from prior seed)
./scripts/smoke/e2e-api.sh scripts/smoke/e2e-ids.json http://localhost:3000/api

# Playwright smoke only (requires e2e-ids.json + frontend running)
cd zephix-frontend && npx playwright test tests/smoke/ --reporter=list

# Individual Playwright modules
cd zephix-frontend && npx playwright test tests/smoke/work-management.spec.ts
cd zephix-frontend && npx playwright test tests/smoke/resources.spec.ts
cd zephix-frontend && npx playwright test tests/smoke/risks.spec.ts
cd zephix-frontend && npx playwright test tests/smoke/budget.spec.ts
cd zephix-frontend && npx playwright test tests/smoke/templates.spec.ts
cd zephix-frontend && npx playwright test tests/smoke/dashboards.spec.ts
cd zephix-frontend && npx playwright test tests/smoke/rbac.spec.ts

# Skip phases (reuse existing seed data)
SKIP_SEED=1 ./scripts/release-smoke-full.sh
SKIP_SEED=1 SKIP_API=1 ./scripts/release-smoke-full.sh  # Playwright only

# CI mode
CI=1 ./scripts/release-smoke-full.sh http://localhost:3000/api

# Custom backend URL
BASE_URL=https://staging.zephix.app/api ./scripts/release-smoke-full.sh
```

---

## 6. Connected Data Flow Verification

The suite verifies this chain of connected data:

```
Template Center → creates Project in Workspace
         ↓
    Project owns Plan (phases) and Tasks
         ↓
    Tasks drive completion stats (status tracking)
         ↓
    Resources/Allocations reference same Project
         ↓
    Risks attach to same Project
         ↓
    Budget fields on same Project
         ↓
    Dashboards read from Projects, Tasks, Resources, Risks
         ↓
    AI assistant references real objects (when configured)
```

**Cross-module data integrity checks:**
- All tasks returned by project filter have matching `projectId`
- All risks returned by project filter have matching `projectId`
- All allocations returned by project filter have matching `projectId`
- Project `workspaceId` matches seeded workspace
- Risk `ownerUserId` is a valid org member
- Workspace header (`x-workspace-id`) present on all scoped requests

---

## 7. File Manifest

```
scripts/
├── smoke/
│   ├── e2e-seed.sh          # Seed script (bash)
│   ├── e2e-api.sh           # API smoke tests (bash)
│   └── e2e-ids.json         # Generated seed data IDs (gitignored)
└── release-smoke-full.sh    # Full suite orchestrator

zephix-frontend/tests/smoke/
├── helpers.ts               # Shared login, workspace, navigation helpers
├── work-management.spec.ts  # Work Management module tests
├── resources.spec.ts        # Resource Management module tests
├── risks.spec.ts            # Risk Management module tests
├── budget.spec.ts           # Budget module tests
├── templates.spec.ts        # Template Center module tests
├── dashboards.spec.ts       # Dashboards module tests
└── rbac.spec.ts             # RBAC role-based tests

docs/verification/
└── PLATFORM_E2E_VERIFICATION_v0.5.1-rc.1.md  # This report
```

---

## 8. Next Steps

1. **Run the full suite** against local or staging environment
2. **Add Member/Viewer user seeding** to `e2e-seed.sh` for full RBAC coverage
3. **Add CI integration** — add `release-smoke-full.sh` to GitHub Actions workflow
4. **Add cross-org negative tests** — create second org to verify data isolation
5. **Configure AI** and add AI action verification tests
6. **Add dashboard widget content assertions** once widget rendering is stable
