# EXPLAIN BEFORE/AFTER — Index Migration BenchmarkPerformanceIndexes17980270000000

## Migration Applied

```sql
CREATE INDEX idx_audit_events_org_created_desc ON audit_events (organization_id, created_at DESC);
CREATE INDEX idx_work_tasks_board_column ON work_tasks (project_id, status, rank) WHERE deleted_at IS NULL;
CREATE INDEX idx_work_task_deps_org_project ON work_task_dependencies (organization_id, project_id);
```

## Delta Summary

| Query | Planning (ms) | Exec BEFORE (ms) | Exec AFTER (ms) | Speedup | Sort Node | Index Used AFTER |
|-------|:---:|:---:|:---:|:---:|:---:|---|
| audit_events_by_org_created_desc | 0.77 | **56.617** | **0.098** | **578x** | ELIMINATED | `idx_audit_events_org_created_desc` |
| work_tasks_by_project_status_rank | 1.43 | **0.244** | **0.169** | **1.4x** | Kept (quicksort, already <1ms) | `idx_work_tasks_board_column` |
| work_task_deps_by_project | 0.64 | **0.603** | **0.167** | **3.6x** | N/A | `idx_work_task_deps_org_project` |
| projects_by_org_created_desc | 0.46 | 0.250 | 0.278 | ~1x | Same | `idx_projects_org_created_at` (pre-existing) |

## Analysis

### Audit Query — 578x Improvement
- **BEFORE**: Parallel Seq Scan on 200K rows → Gather Merge Sort → 56.6ms, 5636 buffer hits
- **AFTER**: Index Scan on `idx_audit_events_org_created_desc` → 0.098ms, 6 buffer hits
- **Root cause**: `idx_audit_events_org_time` used `occurred_at` not `created_at`. The API sorts by `created_at`.
- **Sort node**: ELIMINATED. Index provides natural ordering.

### Board Query — 1.4x Improvement (Better Selectivity)
- **BEFORE**: Bitmap Index Scan on `IDX_work_tasks_project_id` → 100 rows fetched, 70 filtered out = 30 kept
- **AFTER**: Bitmap Index Scan on `idx_work_tasks_board_column` → 30 rows fetched, 0 filtered out = 30 kept
- **Root cause**: Old index only filtered by `project_id`. New composite `(project_id, status, rank)` with `WHERE deleted_at IS NULL` eliminates non-matching rows at index level.
- **At scale**: This matters more with 1000+ tasks per project.

### Dependencies Query — 3.6x Improvement
- **BEFORE**: Bitmap Heap Scan on `IDX_work_task_dependencies_project_id` + filter on `organization_id`
- **AFTER**: Direct Index Scan on `idx_work_task_deps_org_project` — both conditions resolved in index.
- **Root cause**: No composite index existed for the 2-column filter.

### Projects Query — Already Optimal
- `idx_projects_org_created_at` was already present and covers the query.
- At 100 rows, planner prefers seq scan (correct for small tables).

## Environment

- Database: Railway PostgreSQL
- Scale: 0.1 (200K audit, 10K tasks, 14.8K deps, 100 projects)
- Date: 2026-02-10
- Migration: `BenchmarkPerformanceIndexes17980270000000`
