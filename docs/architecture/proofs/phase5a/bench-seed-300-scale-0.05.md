# Benchmark — seed=300 scale=0.05

| Metric | Value |
|--------|-------|
| Iterations | 1 |
| Avg Runtime | 14214ms |
| Avg Insert Rate | 8332 rows/sec |
| Avg Memory RSS | 594.63MB |
| Avg Heap Used | 257.75MB |
| Schema Hash | `b9bd6c471dd6e627` |

## Per-Iteration Results

| # | Runtime (ms) | Rows/sec | RSS (MB) | Heap (MB) |
|---|-------------|---------|---------|----------|
| 1 | 14214 | 8332 | 594.63 | 257.75 |

## EXPLAIN Summary

| Query | Planning (ms) | Execution (ms) | Rows |
|-------|--------------|----------------|------|
| work_tasks_by_project_status_rank | 0.544 | 0.07 | 25 |
| work_tasks_by_project_list_default | 0.361 | 0.209 | 88 |
| work_task_dependencies_by_project | 0.442 | 0.126 | 148 |
| audit_events_by_org_created_desc | 0.402 | 0.127 | 50 |
| projects_by_workspace_created_desc | 0.703 | 0.176 | 50 |

