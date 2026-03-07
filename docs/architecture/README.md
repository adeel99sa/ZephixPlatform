# Architecture Documentation

This folder contains canonical architecture documentation for the Zephix platform.

## Contents

- **PLATFORM_ARCHITECTURE.md** - Overall system architecture, module structure, data flow
- **PLATFORM_SCOPE.md** - Feature boundaries, MVP scope matrix, what ships vs deferred
- **WORKSPACE_MODEL.md** - Multi-tenant workspace model, ownership, membership

## Pilot Operations Package (Week 3)

- **../guides/PILOT_WEEK3_RUNBOOK.md** - Daily controlled-pilot execution contract and stop conditions
- **../guides/PILOT_SUCCESS_CRITERIA.md** - KPI thresholds and PASS/WARN/FAIL decision rules
- **../guides/PILOT_DAILY_MONITORING_CHECKLIST.md** - Morning/live/evening pilot checks
- **../guides/PILOT_ISSUE_TRIAGE_MODEL.md** - Severity, SLA, and escalation model for pilot incidents
- **proofs/pilot/WEEK3_PILOT_EXECUTION_LOG.md** - Append-only pilot evidence ledger

## Guidelines

- Keep architecture docs high-level and stable
- Update when making structural changes to the platform
- Reference specific implementation details in backend/frontend docs
- Keep pilot execution evidence in `docs/architecture/proofs/pilot/` and reference it from guides.
