# Benchmark — seed=123 scale=0.05

| Metric | Value |
|--------|-------|
| Iterations | 2 |
| Avg Runtime | 11675ms |
| Avg Insert Rate | 9642 rows/sec |
| Avg Memory RSS | 609.5MB |
| Avg Heap Used | 246.58MB |
| Schema Hash | `8f6cbfa8cfd93243` |

## Per-Iteration Results

| # | Runtime (ms) | Rows/sec | RSS (MB) | Heap (MB) |
|---|-------------|---------|---------|----------|
| 1 | 11515 | 9774 | 569.41 | 205.45 |
| 2 | 11835 | 9510 | 649.59 | 287.7 |

## Skipped Tables

- schedule_baselines
- schedule_baseline_items
- earned_value_snapshots
- workspace_member_capacity
- attachments
- workspace_storage_usage

## EXPLAIN Summary

| Query | Planning (ms) | Execution (ms) | Rows |
|-------|--------------|----------------|------|
| work_tasks_by_project_status_rank | 0.296 | 1.248 | 1 |
| work_tasks_by_project_list_default | 0.27 | 0.809 | 1 |
| work_task_dependencies_by_project | 0.224 | 2.04 | 1 |
| audit_events_by_org_created_desc | 0.269 | 87.014 | 1 |
| projects_by_workspace_created_desc | 0.269 | 0.06 | 1 |

