# Phase 5A Step 1 — Scale Seed Generator Proof

## Commands

```bash
# Run seed at scale 0.1
npm run db:seed:scale -- --seed=123 --scale=0.1

# Idempotent rerun (should not duplicate rows)
npm run db:seed:scale -- --seed=123 --scale=0.1

# Cleanup
npm run db:seed:scale:cleanup -- --seed=123
```

## Expected Counts at scale=0.1

| Table                       | Rows    |
|-----------------------------|---------|
| organizations               | 1       |
| users                       | 50      |
| user_organizations          | 50      |
| workspaces                  | 5       |
| workspace_members           | 220     |
| projects                    | 100     |
| work_tasks                  | 10,000  |
| work_task_dependencies      | ~25,000 |
| schedule_baselines          | 20      |
| schedule_baseline_items     | ~2,000  |
| earned_value_snapshots      | 240     |
| workspace_member_capacity   | 4,500   |
| attachments                 | 5,000   |
| workspace_storage_usage     | 5       |
| audit_events                | 200,000 |

## Verification SQL Snippets

### Count by table for the seed org

```sql
-- Find org ID
SELECT id FROM organizations WHERE slug = 'scale-seed'
  AND plan_metadata->'scaleSeed'->>'seed' = '123';

-- Per-table counts (replace $ORG_ID)
SELECT 'users' AS t, COUNT(*) FROM users WHERE organization_id = '$ORG_ID'
UNION ALL SELECT 'user_organizations', COUNT(*) FROM user_organizations WHERE organization_id = '$ORG_ID'
UNION ALL SELECT 'workspaces', COUNT(*) FROM workspaces WHERE organization_id = '$ORG_ID'
UNION ALL SELECT 'workspace_members', COUNT(*) FROM workspace_members WHERE workspace_id IN (SELECT id FROM workspaces WHERE organization_id = '$ORG_ID')
UNION ALL SELECT 'projects', COUNT(*) FROM projects WHERE organization_id = '$ORG_ID'
UNION ALL SELECT 'work_tasks', COUNT(*) FROM work_tasks WHERE organization_id = '$ORG_ID'
UNION ALL SELECT 'work_task_dependencies', COUNT(*) FROM work_task_dependencies WHERE organization_id = '$ORG_ID'
UNION ALL SELECT 'schedule_baselines', COUNT(*) FROM schedule_baselines WHERE organization_id = '$ORG_ID'
UNION ALL SELECT 'schedule_baseline_items', COUNT(*) FROM schedule_baseline_items WHERE baseline_id IN (SELECT id FROM schedule_baselines WHERE organization_id = '$ORG_ID')
UNION ALL SELECT 'earned_value_snapshots', COUNT(*) FROM earned_value_snapshots WHERE organization_id = '$ORG_ID'
UNION ALL SELECT 'workspace_member_capacity', COUNT(*) FROM workspace_member_capacity WHERE organization_id = '$ORG_ID'
UNION ALL SELECT 'attachments', COUNT(*) FROM attachments WHERE organization_id = '$ORG_ID'
UNION ALL SELECT 'audit_events', COUNT(*) FROM audit_events WHERE organization_id = '$ORG_ID';
```

### Validate no dependency cycles per project sample

```sql
-- Check a sample project: all predecessors have lower rank than successors
SELECT
  d.id,
  p.rank AS pred_rank,
  s.rank AS succ_rank,
  CASE WHEN p.rank >= s.rank THEN 'POTENTIAL_CYCLE' ELSE 'OK' END AS status
FROM work_task_dependencies d
JOIN work_tasks p ON p.id = d.predecessor_task_id
JOIN work_tasks s ON s.id = d.successor_task_id
WHERE d.organization_id = '$ORG_ID'
  AND d.project_id = (SELECT id FROM projects WHERE organization_id = '$ORG_ID' LIMIT 1)
ORDER BY d.id
LIMIT 50;
```

### Validate workspace_storage_usage equals attachment totals

```sql
-- Compare computed totals vs stored usage
SELECT
  w.workspace_id,
  w.used_bytes AS stored_used,
  w.reserved_bytes AS stored_reserved,
  COALESCE(a_used.total, 0) AS computed_used,
  COALESCE(a_reserved.total, 0) AS computed_reserved
FROM workspace_storage_usage w
LEFT JOIN (
  SELECT workspace_id, SUM(size_bytes) AS total
  FROM attachments WHERE status = 'uploaded' AND organization_id = '$ORG_ID'
  GROUP BY workspace_id
) a_used ON w.workspace_id = a_used.workspace_id
LEFT JOIN (
  SELECT workspace_id, SUM(size_bytes) AS total
  FROM attachments WHERE status = 'pending' AND organization_id = '$ORG_ID'
  GROUP BY workspace_id
) a_reserved ON w.workspace_id = a_reserved.workspace_id
WHERE w.organization_id = '$ORG_ID';
```

## Compilation Proof

```
Backend: npx tsc --noEmit → exit 0
Tests: 40 passed, 0 failed
```

## Files Created

| File | Purpose |
|------|---------|
| `src/scripts/scale-seed/index.ts` | CLI entry point |
| `src/scripts/scale-seed/scale-seed.runner.ts` | Orchestrator (FK-ordered execution) |
| `src/scripts/scale-seed/scale-seed.config.ts` | CLI arg parsing + defaults |
| `src/scripts/scale-seed/scale-seed.manifest.ts` | Manifest writer (disk + DB) |
| `src/scripts/scale-seed/scale-seed.utils.ts` | stableId, seededRng, batchInsert, date math |
| `src/scripts/scale-seed/generators/org.generator.ts` | 1 organization |
| `src/scripts/scale-seed/generators/users.generator.ts` | Users + user_organizations |
| `src/scripts/scale-seed/generators/workspaces.generator.ts` | Workspaces |
| `src/scripts/scale-seed/generators/workspace-members.generator.ts` | Workspace memberships |
| `src/scripts/scale-seed/generators/projects.generator.ts` | Projects with governance flags |
| `src/scripts/scale-seed/generators/tasks.generator.ts` | Work tasks with status/date distributions |
| `src/scripts/scale-seed/generators/dependencies.generator.ts` | Task dependencies (DAG, no cycles) |
| `src/scripts/scale-seed/generators/baselines.generator.ts` | Schedule baselines + items |
| `src/scripts/scale-seed/generators/ev-snapshots.generator.ts` | Earned value snapshots |
| `src/scripts/scale-seed/generators/capacity.generator.ts` | Capacity calendar |
| `src/scripts/scale-seed/generators/attachments.generator.ts` | Attachments + storage usage |
| `src/scripts/scale-seed/generators/audit.generator.ts` | Audit events |
| `src/scripts/scale-seed/cleanup/cleanup.runner.ts` | Cleanup (reverse FK order) |
| `src/scripts/scale-seed/__tests__/scale-seed.spec.ts` | 40 unit tests |

## Files Modified

| File | Change |
|------|--------|
| `package.json` | Added `db:seed:scale` and `db:seed:scale:cleanup` scripts |

## Bugs Fixed from Crash

1. `dependencies.generator.ts` line 121: Missing `conflictTarget` parameter in `batchInsert` — added `'id'`
2. `attachments.generator.ts` line 69: `Math.pow(1000, rng())` produced up to 50B bytes — replaced with log-uniform distribution `Math.exp(minLog + rng() * (maxLog - minLog))` capped to 50KB–50MB

## Design Decisions

### Deterministic IDs
- SHA-1 hash formatted as UUID v5 (version nibble = 5, variant = 8-b)
- Namespace + key ensures collision-free IDs across entity types
- Same seed + same scale = identical data on every run

### Idempotency
- All inserts use `ON CONFLICT DO NOTHING`
- Conflict targets match table unique constraints
- Re-running the same seed is safe

### Generation Order (FK-safe)
1. Organization → 2. Users → 3. Workspaces → 4. Workspace Members →
5. Projects → 6. Tasks → 7. Dependencies → 8. Baselines →
9. EV Snapshots → 10. Capacity → 11. Attachments → 12. Audit

### Cleanup Order (reverse FK)
audit_events → workspace_storage_usage → attachments → workspace_member_capacity →
earned_value_snapshots → schedule_baseline_items → schedule_baselines →
work_task_dependencies → work_tasks → projects → workspace_members →
workspaces → user_organizations → users → organizations

## Test Matrix (40 tests)

| Suite | Count | Covers |
|-------|-------|--------|
| stableId | 7 | Determinism, uniqueness, UUID format |
| seededRng | 3 | Determinism, range |
| scaleCount | 5 | Scaling, floor, minimum |
| distribute | 5 | Sum correctness, enum mapping |
| pickFromDistribution | 2 | Determinism |
| dependency DAG safety | 2 | Cycle prevention, detection |
| addBusinessDays | 3 | Weekend skip, edge cases |
| isWeekday | 2 | Weekday/weekend |
| bulkInsertSql | 3 | SQL generation, conflict targets |
| parseConfig | 5 | CLI parsing, defaults, validation |
| buildManifest | 2 | Shape, timestamp |
| attachment size | 1 | 50KB–50MB range |

## Acceptance Checklist

- [x] Seed package skeleton complete (19 files)
- [x] npm scripts added matching existing patterns
- [x] CLI contract implemented with all parameters
- [x] Deterministic UUID v5-style IDs
- [x] 12 generators in FK order
- [x] Cleanup runner in reverse FK order
- [x] Manifest persisted to disk and DB
- [x] tsc --noEmit clean (exit 0)
- [x] 40 unit tests passing
- [x] No new dependencies added
- [x] No production tables modified
