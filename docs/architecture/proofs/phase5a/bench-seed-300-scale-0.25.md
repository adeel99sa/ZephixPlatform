# Benchmark — seed=300 scale=0.25

| Metric | Value |
|--------|-------|
| Iterations | 1 |
| Avg Runtime | 75936ms |
| Avg Insert Rate | 7802 rows/sec |
| Avg Memory RSS | 738.52MB |
| Avg Heap Used | 242.87MB |
| Schema Hash | `b9bd6c471dd6e627` |

## Per-Iteration Results

| # | Runtime (ms) | Rows/sec | RSS (MB) | Heap (MB) |
|---|-------------|---------|---------|----------|
| 1 | 75936 | 7802 | 738.52 | 242.87 |

## EXPLAIN Summary

| Query | Planning (ms) | Execution (ms) | Rows |
|-------|--------------|----------------|------|
| work_tasks_by_project_status_rank | 0.815 | 0.13 | 29 |
| work_tasks_by_project_list_default | 0.43 | 0.218 | 97 |
| work_task_dependencies_by_project | 0.594 | 0.119 | 158 |
| audit_events_by_org_created_desc | 0.732 | 0.07 | 50 |
| projects_by_workspace_created_desc | 0.328 | 0.099 | 50 |

