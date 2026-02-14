# Scale Seed Manifest — seed=300

| Field | Value |
|-------|-------|
| Seed | 300 |
| Scale | 1 |
| Org Slug | scale-seed |
| Created | 2026-02-14T06:52:38.832Z |
| Version | 5a.3 |
| Runtime | 322357ms |

## Counts

| Table | Rows |
|-------|------|
| organizations | 1 |
| users | 500 |
| user_organizations | 500 |
| workspaces | 50 |
| workspace_members | 2,200 |
| projects | 1,000 |
| work_tasks | 100,000 |
| work_task_dependencies | 148,000 |
| schedule_baselines | 200 |
| schedule_baseline_items | 20,000 |
| earned_value_snapshots | 2,400 |
| workspace_member_capacity | 45,000 |
| attachments | 50,000 |
| audit_events | 2,000,000 |

## Schema Hash

`b9bd6c471dd6e627`

## Index Parity

### Present
- `audit_events(organization_id,created_at)`
- `work_tasks(project_id,status,rank)`
- `work_task_dependencies(organization_id,project_id)`
- `projects(organization_id,created_at)`

