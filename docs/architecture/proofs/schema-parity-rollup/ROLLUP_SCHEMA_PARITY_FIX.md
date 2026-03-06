# Portfolio Rollup Schema Parity Fix — Proof

| Field | Value |
|-------|-------|
| **Date** | 2026-03-06T14:37:00Z |
| **Phase** | Portfolio Rollup Schema Parity Fix |
| **Railway Deployment ID** | `7dd7069c-1fc8-4dfd-b056-0030cbb033e2` |
| **Overall Result** | **PASS — Portfolio rollup returns 200 in staging** |

---

## 1. Original Failure

`GET /workspaces/{id}/portfolios/{id}/rollup` returned 500 with:

```json
{"code":"INTERNAL_ERROR","message":"column ResourceConflict.resolved_by_user_id does not exist"}
```

Proof: `01-rollup-failure.txt`

---

## 2. Root Cause Analysis

### Primary issue: Migration timestamp ordering

`AddConflictLifecycleFields1767376476696` (timestamp 1767...) ran **before**
`CreateResourceConflictsTable1786000000001` (timestamp 1786...) because TypeORM
applies migrations in ascending timestamp order.

When `AddConflictLifecycleFields` ran:
- `resource_conflicts` table did not yet exist
- Migration hit `if (!conflictsTable) { return; }` — returned early as a no-op
- TypeORM recorded it as applied in the `migrations` table (exit 0 = success)

`CreateResourceConflictsTable` then created the table **without** the lifecycle
columns (`resolved_by_user_id`, `resolution_note`).

### Secondary issue: `npm run migration:run` wrong glob in staging

`migration:run` uses `typeorm-ts-node-commonjs` (ts-node). With `NODE_ENV=staging`,
`getMigrationsForRuntime()` returns `[src/migrations/*.js]`. In ts-node context,
`__dirname` resolves to the source tree — but compiled `.js` files live in
`dist/src/migrations/`. Result: 0 migrations found, runner exits 0 (silent no-op).

Fix: changed nixpacks.toml start command from `npm run migration:run` to
`npm run db:migrate`, which uses `node dist/src/config/data-source-migrate.js` so
`__dirname` correctly resolves to `dist/src/database/` → glob `dist/src/migrations/*.js`.

### Tertiary issue: `risks` table missing

After resolving `resolved_by_user_id`, rollup then failed with:
```json
{"code":"INTERNAL_ERROR","message":"relation \"risks\" does not exist"}
```

The PM-module migration that creates `risks` was in `pm/database/migrations/disabled/`
and was never applied. The `Risk` entity (`@Entity('risks')`) is queried by
`portfolio-kpi-rollup.service` and `portfolios-rollup.service`.

---

## 3. Migrations Applied

| Migration | Timestamp | Purpose |
|-----------|-----------|---------|
| `1786000000002-AddConflictLifecycleFieldsPhase3` | After CreateResourceConflictsTable | Adds `resolved_by_user_id` + `resolution_note` to existing table |
| `1786000000003-CreateRisksTable` | After phase3 migration | Creates `risks` table matching Risk entity column names (snake_case) |

Both migrations are idempotent — check for column/table existence before acting.

---

## 4. nixpacks.toml Fix

```toml
[start]
# db:migrate uses node + dist/src/config/data-source-migrate.js so that
# getMigrationsForRuntime() resolves to dist/src/migrations/*.js (correct).
# migration:run uses typeorm-ts-node-commonjs which with NODE_ENV=staging
# resolves to src/migrations/*.js (empty — no compiled files there).
cmd = "npm run db:migrate && npm run start:railway"
```

---

## 5. Verification

### Health + Version (deployment 7dd7069c)

```
GET /api/health/ready → 200
{"status":"ok","checks":{"db":{"status":"ok"},"schema":{"status":"ok"}}}

GET /api/version → railwayDeploymentId: 7dd7069c-1fc8-4dfd-b056-0030cbb033e2
```

### Customer Journey: 22/22 PASS (run 20260306T143720Z)

| Step | Status |
|------|--------|
| 14 portfolio_rollup | **200** ✅ (was 500) |
| All other 21 steps | 200/201/204 ✅ |

Contract updated: `portfolio_rollup.status` tightened from `[200, 500]` to strict `[200]`.

---

## 6. Files Changed

| File | Change |
|------|--------|
| `zephix-backend/nixpacks.toml` | `migration:run` → `db:migrate` (correct glob in staging) |
| `zephix-backend/src/migrations/1786000000002-AddConflictLifecycleFieldsPhase3.ts` | NEW — adds lifecycle columns after table creation |
| `zephix-backend/src/migrations/1786000000003-CreateRisksTable.ts` | NEW — creates `risks` table for rollup KPI queries |
| `docs/api-contract/staging/customer-journey-contract.json` | `portfolio_rollup` status `[200, 500]` → `[200]`, removed `known_issue` |
| `scripts/smoke/staging-customer-journey.sh` | Org name uses full RUN_ID timestamp to avoid same-day 409 conflicts |

---

## 7. Commits

- `2f573e42` — `fix(migrations): use db:migrate in nixpacks start cmd to fix staging migration glob`
- `e9380ad4` — `fix(migrations): add phase3 migration to apply conflict lifecycle columns after table creation`
- `218f07b8` — `fix(migrations): create risks table for portfolio rollup schema parity`
