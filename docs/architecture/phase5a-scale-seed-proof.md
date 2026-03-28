# Phase 5A — Scale Seed System Proof

## Overview

The scale seed system generates deterministic, idempotent load test data for Zephix.
It uses raw SQL only (no ORM entities) and adapts to the actual database schema.

## CLI Commands

| Command | Default strictSchema | Purpose |
|---------|---------------------|---------|
| `db:seed:scale` | `false` | Generate seed data |
| `db:seed:scale:cleanup` | N/A | Remove seed data with zero-residue proof |
| `db:seed:scale:bench` | `true` | Benchmark with timing, memory, EXPLAIN |
| `db:seed:scale:ladder` | `true` (enforced) | Multi-scale benchmark progression |

## strictSchema Contract

When `--strictSchema=true`:

- **Table parity**: Checks all Phase 2E+ tables exist: `schedule_baselines`, `schedule_baseline_items`, `earned_value_snapshots`, `workspace_member_capacity`, `attachments`, `workspace_storage_usage`, `audit_events`
- **Index parity** (Step 3): Checks 4 critical composite indexes required for benchmark accuracy:
  - `audit_events(organization_id, created_at)` — Admin audit viewer
  - `work_tasks(project_id, status, rank)` — Board column query
  - `work_task_dependencies(organization_id, project_id)` — Gantt dependencies
  - `projects(organization_id, created_at)` — Project list by org
- If any table OR index is missing, throws `STRICT_SCHEMA_VIOLATION`
- Bench and ladder default to `true`; seed defaults to `false`
- Purpose: prevent false confidence from partial datasets or missing indexes

## Capability Snapshot Format

Emitted once at the start of every seed run:

```json
{
  "action": "scale_seed_capabilities",
  "presentTables": ["organizations", "users", ...],
  "missingTables": ["schedule_baselines", ...],
  "tableColumns": {
    "organizations": ["id", "name", "slug", ...],
    "work_tasks": ["id", "status", "rank", ...]
  },
  "detectedSchemaHash": "8f6cbfa8cfd93243",
  "requiredIndexesPresent": [
    "audit_events(organization_id,created_at)",
    "work_tasks(project_id,status,rank)",
    "work_task_dependencies(organization_id,project_id)",
    "projects(organization_id,created_at)"
  ],
  "missingIndexes": [],
  "indexesByTable": {
    "audit_events": [
      { "name": "idx_audit_events_org_created_desc", "columns": ["organization_id", "created_at"], "unique": false }
    ]
  }
}
```

## Schema Hash

- SHA-1 of sorted `table:col1,col2,...` lines, truncated to 16 hex chars
- Changes if any table or column is added, removed, or renamed
- Recorded in manifest and bench artifacts for drift detection

## Seed Manifest Schema

Written to `docs/architecture/proofs/phase5a/seed-manifest-seed-{N}.json`:

```json
{
  "seed": 123,
  "scale": 0.1,
  "orgSlug": "scale-seed",
  "createdAt": "2026-02-14T02:59:41.621Z",
  "version": "5a.3",
  "counts": { "organizations": 1, "users": 50, ... },
  "runtimeMs": 12654,
  "skippedTables": ["schedule_baselines", ...],
  "detectedSchemaHash": "8f6cbfa8cfd93243",
  "requiredIndexesPresent": ["audit_events(organization_id,created_at)", ...],
  "missingIndexes": []
}
```

## Cleanup Proof Schema

Written to `docs/architecture/proofs/phase5a/cleanup-proof-seed-{N}.json`:

```json
{
  "action": "cleanup_zero_residue_proof",
  "orgId": "uuid",
  "seed": 123,
  "orgSlug": "scale-seed",
  "cleanedAt": "ISO-timestamp",
  "rowsDeleted": { "users": 50, "work_tasks": 10000, ... },
  "totalDeleted": 225226,
  "residueCheck": { "users": 0, "organizations": 0, "attachments": "TABLE_NOT_FOUND" },
  "hasResidue": false
}
```

### hasResidue Rules

- `false` only when ALL checks return `0` or `TABLE_NOT_FOUND`
- `QUERY_FAILED` always sets `hasResidue: true` (cannot prove zero residue)
- `TABLE_NOT_FOUND` is acceptable (table doesn't exist, nothing to leak)

## Bench Artifact Schema

Written to `docs/architecture/proofs/phase5a/bench-seed-{N}-scale-{S}.json`:

```json
{
  "seed": 123,
  "scale": 0.1,
  "repeat": 3,
  "runs": [
    {
      "iteration": 1,
      "runtimeMs": 22300,
      "nodeMemoryRssMb": 150.5,
      "nodeHeapUsedMb": 85.2,
      "insertRateRowsPerSec": 10100,
      "counts": { ... },
      "detectedSchemaHash": "...",
      "skippedTables": [...]
    }
  ],
  "explainPlans": [
    {
      "name": "work_tasks_by_project_status_rank",
      "description": "Board column query",
      "expectedIndex": "index on (project_id, status, rank)",
      "planningTimeMs": 0.15,
      "executionTimeMs": 1.2,
      "rows": 30,
      "planText": "..."
    }
  ],
  "summary": {
    "avgRuntimeMs": 20000,
    "avgInsertRate": 11000,
    "avgMemoryRssMb": 145.0,
    "avgMemoryHeapMb": 82.0
  },
  "createdAt": "ISO-timestamp"
}
```

## EXPLAIN Artifact List

Written to `docs/architecture/proofs/phase5a/explain/`:

| File | Query | Expected Index | Post-Index Exec (ms) |
|------|-------|----------------|:---:|
| `work_tasks_by_project_status_rank.txt` | Board column query | `idx_work_tasks_board_column` | 0.148 |
| `work_tasks_by_project_list_default.txt` | Task list default | `idx_work_tasks_board_column` | 0.144 |
| `work_task_dependencies_by_project.txt` | Gantt dependencies | `idx_work_task_deps_org_project` | 0.070 |
| `audit_events_by_org_created_desc.txt` | Admin audit viewer | `idx_audit_events_org_created_desc` | 0.044 |
| `projects_by_workspace_created_desc.txt` | Workspace home | `idx_projects_org_created_at` | 0.060 |

### EXPLAIN BEFORE/AFTER Summary (Migration BenchmarkPerformanceIndexes17980270000000)

| Query | Exec BEFORE (ms) | Exec AFTER (ms) | Speedup | Sort Eliminated? |
|-------|:---:|:---:|:---:|:---:|
| audit_events_by_org_created_desc | 56.617 | 0.044 | **578x** | Yes |
| work_tasks_by_project_status_rank | 0.244 | 0.148 | **1.6x** | No (already fast) |
| work_task_deps_by_project | 0.603 | 0.070 | **8.6x** | N/A |
| projects_by_org_created_desc | 0.250 | 0.060 | **4.2x** | Already optimal |

Detailed BEFORE/AFTER plans: `docs/architecture/proofs/phase5a/explain-before-after-delta.md`

## Ladder Summary Schema

Written to `docs/architecture/proofs/phase5a/ladder-seed-{N}.json`:

```json
{
  "seed": 123,
  "orgSlug": "scale-seed",
  "scales": [0.05, 0.1, 0.25, 0.5, 1.0],
  "entries": [
    {
      "scale": 0.05,
      "status": "success",
      "result": { ... bench result ... }
    },
    {
      "scale": 0.1,
      "status": "strict_schema_fail",
      "error": "STRICT_SCHEMA_VIOLATION: Missing ..."
    }
  ],
  "createdAt": "ISO-timestamp"
}
```

### Ladder Entry Status

- `success`: bench completed at this scale
- `strict_schema_fail`: DB missing required tables, ladder stops
- `error`: unexpected failure, ladder continues to next scale

## Progress Tracking

Written to `.tmp/scale-seed-progress.json` at each major stage:

```json
{
  "command": "bench",
  "seed": 123,
  "scale": 0.1,
  "stage": "iteration_2_explain",
  "completedStages": ["iteration_1"],
  "lastUpdatedAt": "ISO-timestamp"
}
```

- Not auto-resumed by default
- Use `--resume=true` to resume from last completed stage

## Dependencies

Scale seed adds **zero new runtime dependencies**. It uses only:

- `typeorm` (DataSource for raw SQL — pre-existing)
- `dotenv` (env loading — pre-existing)
- `crypto` (Node.js built-in)
- `fs`, `path` (Node.js built-in)

The `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner` deps visible in the branch diff are from Phase 2G (Attachments MVP), not from scale seed. Scale seed does not import them.

## Index Migration

Migration `BenchmarkPerformanceIndexes17980270000000` adds 3 composite indexes:

```sql
CREATE INDEX idx_audit_events_org_created_desc ON audit_events (organization_id, created_at DESC);
CREATE INDEX idx_work_tasks_board_column ON work_tasks (project_id, status, rank) WHERE deleted_at IS NULL;
CREATE INDEX idx_work_task_deps_org_project ON work_task_dependencies (organization_id, project_id);
```

File: `zephix-backend/src/migrations/17980270000000-BenchmarkPerformanceIndexes.ts`

All DDL uses `CREATE INDEX IF NOT EXISTS` for idempotency. The 4th required index (`projects(organization_id, created_at)`) was already present as `idx_projects_org_created_at`.

## ANALYZE Before EXPLAIN

The bench runner automatically runs `ANALYZE` on relevant tables before EXPLAIN queries to ensure the planner has fresh statistics. Without this, stale statistics from the seed/cleanup cycle can cause the planner to pick suboptimal plans.

## Test Coverage

67 unit tests covering:

- `stableId`: determinism, format, version/variant nibbles (7 tests)
- `seededRng`: determinism, divergence, range (3 tests)
- `scaleCount`: scaling, floor, minimum, identity (5 tests)
- `distribute`: sum, odd numbers, order, error, enum (5 tests)
- `pickFromDistribution`: determinism, valid values (2 tests)
- `dependency DAG safety`: forward-only, cycle detection (2 tests)
- `addBusinessDays`: weekends, Fri→Mon, zero (3 tests)
- `isWeekday`: weekdays, weekends (2 tests)
- `bulkInsertSql`: conflict target, composite, empty (3 tests)
- `parseConfig`: seed, missing, defaults, scaling, overrides, strictSchema (7 tests)
- `buildManifest`: counts, timestamp, skippedTables, defaults (4 tests)
- `computeHasResidue`: zero, TABLE_NOT_FOUND, nonzero, QUERY_FAILED (6 tests)
- `computeSchemaHash`: determinism, change detection, order-independence (3 tests)
- `attachment size distribution`: 50KB-50MB range (1 test)
- `indexCoversColumns`: exact match, prefix, wrong order, short, empty, multi-index (7 tests)
- `REQUIRED_BENCH_INDEXES`: stability, audit, board, deps, projects (5 tests)
- `buildManifest index data`: present/missing arrays, defaults (2 tests)
