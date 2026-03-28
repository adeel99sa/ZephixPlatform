# Benchmark — seed=300 scale=0.1

| Metric | Value |
|--------|-------|
| Iterations | 1 |
| Avg Runtime | 27339ms |
| Avg Insert Rate | 8668 rows/sec |
| Avg Memory RSS | 657.63MB |
| Avg Heap Used | 285.38MB |
| Schema Hash | `b9bd6c471dd6e627` |

## Per-Iteration Results

| # | Runtime (ms) | Rows/sec | RSS (MB) | Heap (MB) |
|---|-------------|---------|---------|----------|
| 1 | 27339 | 8668 | 657.63 | 285.38 |

## EXPLAIN Summary

| Query | Planning (ms) | Execution (ms) | Rows |
|-------|--------------|----------------|------|
| work_tasks_by_project_status_rank | 0.556 | 0.153 | 27 |
| work_tasks_by_project_list_default | 0.48 | 0.297 | 93 |
| work_task_dependencies_by_project | 0.316 | 0.101 | 148 |
| audit_events_by_org_created_desc | 0.446 | 0.058 | 50 |
| projects_by_workspace_created_desc | 0.256 | 0.29 | 50 |

