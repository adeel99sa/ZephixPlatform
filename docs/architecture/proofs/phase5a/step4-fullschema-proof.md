# Phase 5A Step 4 — Full Schema Parity on Railway

## Step 4A: Migrations Applied

13 unapplied migrations applied to Railway in order:

| # | Timestamp | Name | Key Changes |
|---|-----------|------|-------------|
| 1 | 17990000000000 | AddProjectCloneLineageColumns | `source_project_id`, `clone_depth`, `cloned_at`, `cloned_by` on projects |
| 2 | 17990000000001 | CreateProjectCloneRequestsTable | New table `project_clone_requests` |
| 3 | 17990000000002 | SeedProjectClonePolicy | Policy seed: `project_clone_enabled` |
| 4 | 18000000000000 | AddEstimationAndIterations | `iterations` table, `estimate_points/hours` on work_tasks |
| 5 | 18000000000001 | BudgetCostRiskGovernance | Cost columns on projects, risk exposure on work_risks |
| 6 | 18000000000002 | WaterfallCoreScheduleBaselinesEV | **schedule_baselines**, **schedule_baseline_items**, **earned_value_snapshots** |
| 7 | 18000000000003 | ResourceCapacityEngine | **workspace_member_capacity**, capacity columns on projects |
| 8 | 18000000000004 | WhatIfScenarios | `scenario_plans`, `scenario_actions`, `scenario_results` |
| 9 | 18000000000005 | AttachmentsMvp | **attachments** table |
| 10 | 18000000000006 | WorkTaskBoardRank | Board composite index on work_tasks |
| 11 | 18000000000007 | PlanAndEntitlements | Plan columns on orgs, **workspace_storage_usage** |
| 12 | 18000000000008 | AuditEvents | SKIPPED (table already exists from earlier migration) |
| 13 | 18000000000009 | AttachmentRetentionAndMetering | Retention columns on attachments, reserved_bytes on storage |

### 6 Missing Tables — All Present After Migration

| Table | Status |
|-------|--------|
| schedule_baselines | EXISTS |
| schedule_baseline_items | EXISTS |
| earned_value_snapshots | EXISTS |
| workspace_member_capacity | EXISTS |
| attachments | EXISTS |
| workspace_storage_usage | EXISTS |

### Capability Snapshot (Post-Migration)

```
missingTables: []
requiredIndexesPresent: [
  "audit_events(organization_id,created_at)",
  "work_tasks(project_id,status,rank)",
  "work_task_dependencies(organization_id,project_id)",
  "projects(organization_id,created_at)"
]
missingIndexes: []
detectedSchemaHash: b9bd6c471dd6e627
```

## Step 4B: Full Strict Ladder Results

Command: `npm run db:seed:scale:ladder -- --seed=300 --repeat=1`

- strictSchema: **true** (enforced)
- All 5 scales completed successfully
- Zero failures, zero skipped

| Scale | Runtime | Insert Rate | RSS Memory | Heap |
|-------|---------|------------|------------|------|
| 0.05 | 14,214ms | 8,332 rows/sec | 594MB | - |
| 0.10 | 27,339ms | 8,668 rows/sec | 657MB | - |
| 0.25 | 75,936ms | 7,802 rows/sec | 738MB | - |
| 0.50 | 146,879ms | 8,067 rows/sec | 922MB | - |
| 1.00 | 322,517ms | 7,348 rows/sec | 867MB | 206MB |

### EXPLAIN Plans at Scale 1.0 (2M audit events, 100K tasks)

| Query | Exec (ms) | Index Used | Plan Type |
|-------|-----------|------------|-----------|
| audit_events_by_org_created_desc | 0.077 | idx_audit_events_org_created_desc | Index Scan |
| work_tasks_by_project_status_rank | 0.186 | idx_work_tasks_board_column | Bitmap Index Scan |
| work_task_dependencies_by_project | 0.110 | idx_work_task_deps_org_project | Index Scan |
| work_tasks_by_project_list_default | - | See explain file | - |
| projects_by_workspace_created_desc | - | See explain file | - |

### Zero-Residue Proof (Scale 1.0 Cleanup)

All 15 tables verified clean after scale 1.0 cleanup:
```
audit_events: 0 rows (clean)
workspace_storage_usage: 0 rows (clean)
attachments: 0 rows (clean)
workspace_member_capacity: 0 rows (clean)
earned_value_snapshots: 0 rows (clean)
schedule_baseline_items: 0 rows (clean)
schedule_baselines: 0 rows (clean)
work_task_dependencies: 0 rows (clean)
work_tasks: 0 rows (clean)
projects: 0 rows (clean)
workspace_members: 0 rows (clean)
workspaces: 0 rows (clean)
user_organizations: 0 rows (clean)
users: 0 rows (clean)
organizations: 0 rows (clean)
```

## Step 4C: Enterprise Guardrails

### 1. "No Adaptive Bench" Lock

- `parseBenchConfig()` now throws `BENCH_GUARDRAIL` error if `--strictSchema=false`
- `benchCfg.strictSchema` hardcoded to `true` — not configurable
- Ladder runner throws `LADDER_GUARDRAIL` if `--strictSchema=false`
- Only `db:seed:scale` (seed command) allows `strictSchema=false`

### 2. Schema Drift Alarm

- `detectSchemaDrift()` runs at the start of every bench run
- Computes current schema hash from live DB tables
- Compares against `seed-manifest-seed-{N}.json` from previous run
- If hashes differ: throws `SCHEMA_DRIFT` with both hashes
- Ladder catches `SCHEMA_DRIFT` and stops immediately

**Proof**: First ladder attempt after migration correctly triggered `SCHEMA_DRIFT` because previous manifest had hash `8f6cbfa8cfd93243` vs current `b9bd6c471dd6e627`. Fresh seed established new baseline, ladder completed.

## Step 4D: Crash Safety

### Per-Generator Progress

- `GeneratorProgress` interface: `{ name, rowCount, completedAt }`
- `trackGenerator()` called after each of 12 generators
- Progress written to `.tmp/scale-seed-progress.json` after each generator
- Includes `completedGenerators[]` array with timestamps

### Resume Proof

- Ladder writes `ladder-resume-proof-seed-{N}.json` after completion
- Contents: `completedScales`, `failedScales`, `skippedScales`, `completedAt`
- Progress file cleared after successful completion

## Bug Fix: estimate_hours CHECK Constraint

Migration `18000000000000-AddEstimationAndIterations` added:
```sql
CHECK (estimate_hours IS NULL OR estimate_hours > 0)
CHECK (estimate_points IS NULL OR estimate_points > 0)
```

Task generator was setting milestones to `estimate_hours = 0`, violating the constraint.

**Fix**: Milestones now use `NULL` instead of `0` for `estimate_hours`, `remaining_hours`, `estimate_points`, and `story_points`.

## Bug Fix: schedule_baseline_items Residue Check

`schedule_baseline_items` has no `organization_id` column (uses `baseline_id` FK).

**Fix**: Residue check now uses `WHERE baseline_id IN (SELECT id FROM schedule_baselines WHERE organization_id = $1)` for this table.

## Test Coverage

75 unit tests passing:
- stableId: 7
- seededRng: 3
- scaleCount: 5
- distribute: 5
- pickFromDistribution: 2
- DAG safety: 2
- addBusinessDays: 3
- isWeekday: 2
- bulkInsertSql: 3
- parseConfig: 7
- buildManifest: 4
- computeHasResidue: 6
- computeSchemaHash: 3
- attachment size: 1
- indexCoversColumns: 7
- REQUIRED_BENCH_INDEXES: 4
- buildManifest index data: 2
- **bench guardrails: 4** (NEW)
- **schema drift detection: 3** (NEW)
- **progress tracking: 1** (NEW)

## Artifacts

| File | Description |
|------|-------------|
| `ladder-seed-300.json` | Full ladder results (all 5 scales) |
| `ladder-resume-proof-seed-300.json` | Resume proof showing 5/5 complete |
| `bench-seed-300-scale-{0.05..1}.json` | Per-scale bench results |
| `bench-seed-300-scale-{0.05..1}.md` | Per-scale bench markdown |
| `explain/*.txt` | 5 EXPLAIN plan files at scale 1.0 |
| `cleanup-proof-seed-300.json` | Zero-residue proof |
| `seed-manifest-seed-300.json` | Schema baseline manifest |
