# Governance Evaluations — Data Retention Policy

## MVP Policy (Active Now)

| Age | BLOCK & OVERRIDE | WARN & ALLOW |
|-----|-----------------|--------------|
| 0–90 days | Keep full fidelity | Keep full fidelity |
| 90 days – 12 months | Keep full fidelity | **Purge** |
| > 12 months | Purge | Purge |

## Rationale

- **BLOCK and OVERRIDE** records are audit-critical. They prove enforcement decisions and admin escapes. Regulators and compliance teams expect 12-month retention minimum.
- **WARN and ALLOW** are informational. They are useful for dashboards and trend analysis but have no compliance requirement beyond 90 days.
- Purging old ALLOW/WARN records keeps the table size bounded without losing enforcement evidence.

## Cleanup Script

A placeholder script exists at:

```
zephix-backend/src/scripts/governance-evaluations-cleanup.ts
```

It is **not scheduled** in MVP. It must be run manually or via a cron job.

### Usage

```bash
# Dry run — show what would be purged
GOVERNANCE_CLEANUP_DRY_RUN=true npx ts-node src/scripts/governance-evaluations-cleanup.ts

# Live run
npx ts-node src/scripts/governance-evaluations-cleanup.ts
```

## Scale Policy (Future)

When `governance_evaluations` exceeds ~10M rows:

1. **Partition by month** on `created_at` using PostgreSQL declarative partitioning.
2. **Drop partitions** to purge instead of row-level DELETEs.
3. Add a rollup table (`governance_evaluation_daily_rollups`) with:
   - `workspace_id`, `date`, `entity_type`, `decision`, `count`
   - Keep rollups forever for trend reporting.

## Indexes Serving Retention Queries

The following indexes support the cleanup script efficiently:

- `idx_gov_evals_ws_decision_created` — filters by decision + created_at for selective purge
- `idx_gov_evals_ws_created` — workspace-scoped timeline for admin dashboards

## Stress Test Baselines

| Scenario | Target |
|----------|--------|
| Peak transitions (500 rps, 1 workspace, 50 rules) | p95 < 250ms, error < 0.5% |
| Multi-tenant (2000 rps, 200 workspaces) | No cross-talk, DB CPU stable |
| Audit listing under write load (20 rps reads + 500 rps writes) | List p95 < 200ms |
