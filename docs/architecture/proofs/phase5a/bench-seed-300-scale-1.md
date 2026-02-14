# Benchmark — seed=300 scale=1

| Metric | Value |
|--------|-------|
| Iterations | 1 |
| Avg Runtime | 322517ms |
| Avg Insert Rate | 7348 rows/sec |
| Avg Memory RSS | 867.45MB |
| Avg Heap Used | 206.57MB |
| Schema Hash | `b9bd6c471dd6e627` |

## Per-Iteration Results

| # | Runtime (ms) | Rows/sec | RSS (MB) | Heap (MB) |
|---|-------------|---------|---------|----------|
| 1 | 322517 | 7348 | 867.45 | 206.57 |

## EXPLAIN Summary

| Query | Planning (ms) | Execution (ms) | Rows |
|-------|--------------|----------------|------|
| work_tasks_by_project_status_rank | 1.083 | 0.186 | 28 |
| work_tasks_by_project_list_default | 0.411 | 0.202 | 92 |
| work_task_dependencies_by_project | 0.478 | 0.11 | 146 |
| audit_events_by_org_created_desc | 0.584 | 0.077 | 50 |
| projects_by_workspace_created_desc | 0.249 | 0.102 | 50 |

