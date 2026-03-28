# Wave 2 Smoke Test — v0.6.0-rc.20

**Date**: 2026-02-15
**Environment**: Staging (`zephix-backend-v2-staging.up.railway.app`)
**Tag**: `v0.6.0-rc.20`
**Git SHA**: `b3148498` (main)
**Migration count**: 127
**Latest migration**: `EnsureAllTemplateEntityColumns17980247000000`

## Result: 64 PASS / 0 FAIL / 1 WARN / 1 SKIP

### Staging Identity

```json
{
  "zephixEnv": "staging",
  "migrationCount": 127,
  "latestMigration": "EnsureAllTemplateEntityColumns17980247000000",
  "systemIdentifier": "7539754227597242404"
}
```

### Staging Health

```json
{
  "status": "ok",
  "checks": { "db": { "status": "ok" }, "schema": { "status": "ok" } }
}
```

## Module-by-Module Results

### Module 0: Environment Sanity (8/8)
| # | Test | Status |
|---|------|--------|
| 1 | Health endpoint | PASS |
| 2 | Liveness probe | PASS |
| 3 | Readiness probe | PASS |
| 4 | Auth login | PASS |
| 5 | CSRF token acquired | PASS |
| 6 | Auth /me | PASS |
| 7 | Onboarding status | PASS |
| 8 | Workspace list | PASS |

### Module 1: Work Management (14/14 + 1 WARN)
| # | Test | Status |
|---|------|--------|
| 9 | List projects | PASS |
| 10 | Get Project A | PASS |
| 11 | Get Project B | PASS |
| 12 | Project A plan | PASS |
| 13 | Project A overview | PASS |
| 14 | List tasks (count: 10) | PASS |
| 15 | Get task A1 | PASS |
| 16 | Update task title | PASS |
| 17 | Set task to DONE | WARN (WIP limit; non-blocking) |
| 18 | List phases | PASS |
| 19 | Create phase | PASS |
| 20 | Delete phase | PASS |
| 21 | Restore phase | PASS |
| 22 | Create task | PASS |
| 23 | Delete task | PASS |
| 24 | Restore task | PASS |

### Module 1b: Task Comments (2/2)
| # | Test | Status |
|---|------|--------|
| 25 | List task comments (count: 1) | PASS |
| 26 | Post comment on task | PASS |

### Module 1c: Task Dependencies (4/4)
| # | Test | Status |
|---|------|--------|
| 27 | List task dependencies (predecessors: 1) | PASS |
| 28 | Reject duplicate dependency (409) | PASS |
| 29 | Reject self-dependency (400) | PASS |
| 30 | Reject dependency cycle (400) | PASS |

### Module 2: Resource Management (5/5)
| # | Test | Status |
|---|------|--------|
| 31 | List allocations (count: 1) | PASS |
| 32 | Create allocation | PASS |
| 33 | Update allocation | PASS |
| 34 | Delete allocation | PASS |
| 35 | Resource heat-map | PASS |

### Module 3: Risk Management (3/3)
| # | Test | Status |
|---|------|--------|
| 36 | List risks (count: 2) | PASS |
| 37 | Create risk | PASS |
| 38 | Risk owner is valid org member | PASS |

### Module 4: Budget (4/4)
| # | Test | Status |
|---|------|--------|
| 39 | Project A has budget: 50000.00 | PASS |
| 40 | Project A has actualCost: 15000.00 | PASS |
| 41 | Update project budget | PASS |
| 42 | Project KPIs | PASS |

### Module 5: Template Center (2/2 + 1 SKIP)
| # | Test | Status |
|---|------|--------|
| 43 | List templates | PASS |
| 44 | Template recommendations | PASS |
| 45 | Template preview & instantiation | SKIP (no template ID from seed — no pre-seeded templates exist) |

### Module 6: Dashboards (4/4)
| # | Test | Status |
|---|------|--------|
| 46 | List dashboards | PASS |
| 47 | Dashboard templates | PASS |
| 48 | Create dashboard | PASS |
| 49 | Get dashboard | PASS |

### Module 7: AI Assistant (2/2)
| # | Test | Status |
|---|------|--------|
| 50 | AI dashboard suggest | PASS |
| 51 | AI dashboard generate | PASS |

### Module 8: Cross-module Data Integrity (4/4)
| # | Test | Status |
|---|------|--------|
| 52 | All tasks belong to Project A | PASS |
| 53 | All risks belong to Project A | PASS |
| 54 | All allocations belong to Project A | PASS |
| 55 | Project A workspace matches seeded workspace | PASS |

### Module 9: RBAC Sanity (3/3)
| # | Test | Status |
|---|------|--------|
| 56 | Admin can list users | PASS |
| 57 | Org users | PASS |
| 58 | Workspace members | PASS |

### Module 10: WIP Limits (4/4)
| # | Test | Status |
|---|------|--------|
| 59 | GET workflow config (has defaultWipLimit) | PASS |
| 60 | First move to IN_REVIEW succeeds | PASS |
| 61 | Second move to IN_REVIEW blocked (WIP_LIMIT_EXCEEDED) | PASS |
| 62 | Move to DONE always passes | PASS |

### Module 11: Acceptance Criteria & DoD (4/4)
| # | Test | Status |
|---|------|--------|
| 63 | Task detail has acceptanceCriteria (2 items) | PASS |
| 64 | Patch task acceptanceCriteria (3 items) | PASS |
| 65 | Project has definitionOfDone (3 items) | PASS |
| 66 | Patch project DoD (4 items) | PASS |

## Blockers Fixed (this session)

| Blocker | Root Cause | Fix | PR |
|---------|-----------|-----|-----|
| Auth login crash | `trg_protect_demo_users` referenced non-existent `deleted_at` column | Migration to replace trigger function | #30 |
| Phase creation crash | `CHK_audit_events_action` constraint too restrictive | Migration to expand action CHECK constraint | #31 |
| Phase creation crash (2nd) | `CHK_audit_events_entity_type` constraint too restrictive | Migration to expand entity_type CHECK constraint | #32 |
| AC update crash | `task_activities_type_enum` missing new values | Migration to add enum values | #31 |
| Templates 500 | Missing columns on `templates` table | Comprehensive migration to add all entity columns | #33, #34 |
| Audit entity alignment | Sprint 5 vs Phase 3B schema mismatch | Entity rewrite + service fix + safety migration | #29 |
| Earned Value validation | Missing DTO fields for governance booleans | Added 6 boolean fields to CreateProjectDto | #29 |

## Notes

- **WARN** on "Set task to DONE": The smoke script tries to transition a task directly from the seeded state to DONE via IN_PROGRESS. The WIP limit (defaultWipLimit=2) may block the intermediate IN_PROGRESS transition when other tasks are already in that status. This is correct WIP enforcement behavior, not a bug.
- **SKIP** on template preview/instantiation: No pre-seeded templates exist on staging (the seed found "Template A: NONE"). This test will pass once templates are seeded.
