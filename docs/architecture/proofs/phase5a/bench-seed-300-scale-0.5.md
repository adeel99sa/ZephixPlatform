# Benchmark — seed=300 scale=0.5

| Metric | Value |
|--------|-------|
| Iterations | 1 |
| Avg Runtime | 146879ms |
| Avg Insert Rate | 8067 rows/sec |
| Avg Memory RSS | 922.16MB |
| Avg Heap Used | 301.61MB |
| Schema Hash | `b9bd6c471dd6e627` |

## Per-Iteration Results

| # | Runtime (ms) | Rows/sec | RSS (MB) | Heap (MB) |
|---|-------------|---------|---------|----------|
| 1 | 146879 | 8067 | 922.16 | 301.61 |

## EXPLAIN Summary

| Query | Planning (ms) | Execution (ms) | Rows |
|-------|--------------|----------------|------|
| work_tasks_by_project_status_rank | 1.145 | 0.241 | 25 |
| work_tasks_by_project_list_default | 0.853 | 0.654 | 83 |
| work_task_dependencies_by_project | 0.524 | 0.124 | 145 |
| audit_events_by_org_created_desc | 0.609 | 0.063 | 50 |
| projects_by_workspace_created_desc | 0.291 | 0.068 | 50 |

