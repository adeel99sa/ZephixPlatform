# Wave 8: Portfolio & Program Integration — Implementation Report

## Overview

Wave 8 unifies existing portfolio and program infrastructure with the Wave 3–7 foundations (budgets, KPI engine, governance, templates). No new entities were created from scratch — all work extends existing modules.

---

## Endpoint Paths (Final)

The platform has two route conventions established by prior phases:

| Convention | Prefix | Used by |
|-----------|--------|---------|
| Phase 6 entity-level | `/api/workspaces/:wsId/...` | Portfolios, Programs, Projects, Workspaces |
| Phase 3+ work-management | `/api/work/workspaces/:wsId/...` | KPIs, Budgets, Documents, CRs, Capacity |

Portfolio and Program KPI rollup endpoints follow the Phase 6 convention because they are aggregate portfolio/program-level endpoints, not project-level work endpoints.

| Endpoint | Controller | Method |
|----------|-----------|--------|
| `GET /api/workspaces/:wsId/portfolios/:pfId/kpis/rollup?asOf=YYYY-MM-DD` | PortfoliosController | getKpiRollup |
| `GET /api/workspaces/:wsId/programs/:progId/kpis/rollup?asOf=YYYY-MM-DD` | ProgramsController | getKpiRollup |

Both endpoints are gated by feature flags. When flag is disabled, endpoint returns **404** (reduces surface area).

---

## Feature Flags

| Flag | Default | When Enabled |
|------|---------|--------------|
| `PORTFOLIO_KPI_ROLLUP_ENABLED` | `false` (disabled) | Returns rollup response |
| `PROGRAM_KPI_ROLLUP_ENABLED` | `false` (disabled) | Returns rollup response |

Only `=== 'true'` enables the flag. Any other value or absence = disabled.

---

## Governance Default Policy

### Portfolios
Portfolio governance flags default to `false` when created. Admin explicitly enables them.

### Programs
Programs **inherit governance from parent portfolio**. If program has no portfolio, all governance flags default to **`false`** (conservative policy — prevents exposing KPIs that depend on data the program does not have).

### Projects — Governance Source Precedence

| Priority | Source | When Applied |
|----------|--------|-------------|
| 1 (highest) | `USER` | User provides explicit governance flags in create/update payload |
| 2 | `TEMPLATE` | `applyTemplateUnified` sets flags from template defaults |
| 3 | `PORTFOLIO` | Portfolio inheritance on create (when no explicit flags and no template source) |
| 4 (lowest) | `null` (LEGACY) | Existing projects before Wave 8 |

Rules enforced:
- `TEMPLATE` source blocks portfolio inheritance
- `USER` source blocks portfolio inheritance
- `PORTFOLIO` applies only when `governanceSource` is `null` or `LEGACY`
- `force=true` (admin sync) overrides any source

---

## Deliverables Detail

### A. Portfolio Governance Flags

**Migration**: `17980253000000-AddPortfolioGovernanceFlags.ts`

| Column | Type | Default |
|--------|------|---------|
| `cost_tracking_enabled` | boolean | false |
| `baselines_enabled` | boolean | false |
| `iterations_enabled` | boolean | false |
| `change_management_enabled` | boolean | false |
| `inherited_governance_mode` | text | 'PORTFOLIO_DEFAULTS' |

**Enum**: `PortfolioGovernanceMode` — `PORTFOLIO_DEFAULTS` | `PROJECT_OVERRIDES_ALLOWED`

### B. Governance Inheritance

**Migration**: `17980254000000-AddProjectGovernanceSource.ts`

| Column | Type |
|--------|------|
| `governance_source` | text nullable |

**Helper**: `projects/helpers/governance-inheritance.ts`
- `applyPortfolioGovernanceDefaults(project, portfolio, options)` — force/onlyIfUnset control
- `hasExplicitGovernanceFlags(payload)` — detects if DTO has governance flags

### C & D. Portfolio and Program KPI Rollups

**8 KPIs computed** (same set for both):

| Code | Name | Unit | Governance Gate | Method |
|------|------|------|-----------------|--------|
| `spi` | Schedule Performance Index | ratio | `baselinesEnabled` | Weighted avg from project KPI values |
| `schedule_variance` | Schedule Variance | number | `baselinesEnabled` | Sum from project KPI values |
| `budget_burn` | Budget Burn Rate | ratio | `costTrackingEnabled` | Revised/Baseline from project_budgets |
| `forecast_at_completion` | Forecast at Completion | currency | `costTrackingEnabled` | Sum from project_budgets |
| `open_risk_count` | Open Risk Count | count | none | Sum from risks table |
| `change_request_approval_rate` | CR Approval Rate | ratio | `changeManagementEnabled` | Approved/Decided from change_requests |
| `throughput` | Throughput | count | none | Sum from project KPI values |
| `wip` | Work In Progress | count | none | Sum from project KPI values |

**Division by zero**: returns `null` with status `NO_DATA`.

**Skipped behavior**: governance-gated KPIs appear in `skipped[]` with `reason: 'GOVERNANCE_FLAG_DISABLED'` and `governanceFlag` name.

**Metadata**: Every computed KPI includes `engineVersion`, `scope` (`PORTFOLIO` or `PROGRAM`), and `inputHash` (16-char SHA256 prefix).

### E. Budget Source of Truth

`PortfolioAnalyticsService.getPortfolioHealth()` reads:
1. `project_budgets.baseline_budget` (preferred)
2. `project.budget` (legacy fallback when no entry in project_budgets)

### F. Query Strategy (No N+1)

All rollup services use **batched queries** with `In(projectIds)`:

| Query | Count | Pattern |
|-------|-------|---------|
| Load portfolio | 1 | `findOne` |
| Load project IDs | 1-2 | `find` (direct + join table) |
| Load KPI values | 1 | `find` with `In(projectIds)` |
| Load budgets | 1 | `find` with `In(projectIds)` |
| Load change requests | 1 | `find` with `In(projectIds)` |
| Load risks | 1 | `find` with `In(projectIds)` |

Total DB calls: **6-7 per rollup** (bounded, regardless of project count). Verified by spy test.

---

## Tests

| Test File | Tests | Coverage |
|-----------|-------|----------|
| `governance-inheritance.spec.ts` | 14 | Precedence, force, onlyIfUnset, flags detection |
| `portfolio-kpi-rollup.service.spec.ts` | 24 | Gov gating, budget math, div/zero, determinism, N+1 bounds, scoping, feature flags |
| `program-kpi-rollup.service.spec.ts` | 10 | Gov inheritance, default false, sorting, scope, hash |
| `portfolio-analytics.service.spec.ts` | 20 | Budget source of truth, legacy fallback |
| `app.module.compile.spec.ts` | 4 | No circular deps |
| `projects.service.spec.ts` | 1 | Still passes |

**Total tests**: 73 passing across 6 suites.

---

## Security

- Workspace access verified via `RequireWorkspaceAccessGuard` + `WorkspaceAccessService.canAccessWorkspace()`
- Portfolio/Program scoped by `workspaceId` AND `organizationId`
- Mismatched workspace returns 404 (not 403, to avoid information leak)
- Feature flags return 404 when disabled (reduces attack surface)

---

## Smoke Instructions

```bash
export STAGING_URL=https://zephix-backend-v2-staging.up.railway.app
export AUTH_TOKEN=<jwt>
export WORKSPACE_ID=<wsId>
export PORTFOLIO_ID=<pfId>

# Enable feature flags on staging
PORTFOLIO_KPI_ROLLUP_ENABLED=true
PROGRAM_KPI_ROLLUP_ENABLED=true

bash scripts/smoke/wave8-portfolio-rollup-smoke.sh
```

**Proof folder**: `docs/architecture/proofs/phase5a/wave8/rcXX/`

---

## Stop Conditions Met

- [x] No circular module dependencies (app.module.compile passes)
- [x] No changes to production deploy contract or identity endpoint
- [x] No reduction in gating suite count (+73 tests)
- [x] No new runtime dependencies
- [x] Feature flags gate new endpoints (safe for production)
- [x] Legacy rollup paths untouched as fallback
- [x] Deterministic ordering enforced (sorted by kpiCode)
- [x] Division by zero returns null (not Infinity)
- [x] N+1 queries eliminated (bounded call count)
- [x] Workspace scoping enforced (404 on mismatch)
- [x] Program defaults conservative (flags false when no portfolio)
- [x] Governance precedence tested (TEMPLATE > PORTFOLIO > LEGACY)
