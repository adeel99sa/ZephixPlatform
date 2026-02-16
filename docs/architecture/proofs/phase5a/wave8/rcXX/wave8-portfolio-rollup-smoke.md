# Wave 8: Portfolio & Program KPI Rollup — Smoke Proof

**RC Tag**: v0.6.0-rc.XX
**Date**: YYYY-MM-DD
**Tester**: [name]
**Environment**: staging

---

## Pre-conditions

- [ ] Migration `17980253000000-AddPortfolioGovernanceFlags` applied
- [ ] Migration `17980254000000-AddProjectGovernanceSource` applied
- [ ] `PORTFOLIO_KPI_ROLLUP_ENABLED=true` set on staging
- [ ] `PROGRAM_KPI_ROLLUP_ENABLED=true` set on staging
- [ ] At least 1 portfolio with 2+ projects exists
- [ ] At least 1 project has KPI values computed
- [ ] At least 1 project has a budget in project_budgets

---

## Step 1: Health & Identity

```
GET /api/health/ready → 200
GET /api/system/identity → 200 with version
```

**Result**: [ PASS / FAIL ]

## Step 2: List Portfolios

```
GET /api/workspaces/:wsId/portfolios → 200
```

**Portfolio count**: ___
**Result**: [ PASS / FAIL ]

## Step 3: Portfolio KPI Rollup

```
GET /api/workspaces/:wsId/portfolios/:pfId/kpis/rollup?asOf=YYYY-MM-DD
```

**Response JSON** (paste below):
```json
{
  "portfolioId": "...",
  "asOfDate": "...",
  "engineVersion": "...",
  "inputHash": "...",
  "computed": [...],
  "skipped": [...],
  "sources": {...}
}
```

## Step 4: Deterministic Ordering

- [ ] `computed` array sorted by `kpiCode`
- [ ] `skipped` array sorted by `kpiCode`

## Step 5: Governance Gating

With portfolio governance flags:
- costTrackingEnabled: ___
- baselinesEnabled: ___
- changeManagementEnabled: ___

Skipped KPIs with reasons:
| kpiCode | reason | governanceFlag |
|---------|--------|----------------|
|         |        |                |

**Result**: [ PASS / FAIL ]

## Step 6: Metadata

- [ ] engineVersion present in all computed KPIs
- [ ] scope = 'PORTFOLIO' in all computed valueJson
- [ ] inputHash length = 16 characters

## Step 7: Budget Source of Truth

- [ ] budget_burn uses project_budgets.baseline_budget (not project.budget)
- [ ] forecast_at_completion sums from project_budgets.forecast_at_completion

## Step 8: Program KPI Rollup

```
GET /api/workspaces/:wsId/programs/:progId/kpis/rollup?asOf=YYYY-MM-DD
```

- [ ] Returns 200 with computed/skipped
- [ ] Governance inherited from portfolio
- [ ] scope = 'PROGRAM' in valueJson

## Step 9: Governance Inheritance

- [ ] Create project under portfolio without explicit governance flags
- [ ] Verify project inherits portfolio governance flags
- [ ] Verify project.governanceSource = 'PORTFOLIO'

## Step 10: Run Smoke Script

```bash
STAGING_URL=... AUTH_TOKEN=... WORKSPACE_ID=... PORTFOLIO_ID=... \
  bash scripts/smoke/wave8-portfolio-rollup-smoke.sh
```

**Result**: [ PASS / FAIL ]

---

## Summary

| Check | Status |
|-------|--------|
| Migrations applied | |
| Portfolio governance flags stored | |
| KPI rollup computes on demand | |
| Governance gating works | |
| Deterministic ordering | |
| inputHash deterministic | |
| Budget source of truth aligned | |
| Program rollup inherits from portfolio | |
| Governance inheritance on project create | |
| Feature flags gate endpoints | |
