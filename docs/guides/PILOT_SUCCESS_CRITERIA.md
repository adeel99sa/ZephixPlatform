# Week 3 Pilot Success Criteria

## Decision Framework

This document defines measurable pilot outcomes and explicit decision rules.

- `PASS`: metric at or better than target.
- `WARN`: within caution band; continue only with mitigation owner assigned.
- `FAIL`: below floor; hold pilot expansion until corrected.

## KPI Matrix

| KPI | Formula | Data Source | PASS | WARN | FAIL |
|-----|---------|-------------|------|------|------|
| Onboarding completion rate | Completed onboardings / Started onboardings | Pilot execution log + smoke proofs | >= 85% | 70%-84.9% | < 70% |
| Invite acceptance success | Accepted invites / Created invites | `org-invites` lane proof + product telemetry | >= 90% | 80%-89.9% | < 80% |
| Permission integrity budget | Unauthorized escalation defects (MEMBER/VIEWER) | Incident triage log + UI acceptance checks | 0 P0/P1 | 1 P2 only | Any P0/P1 |
| Critical API reliability | 1 - (5xx on critical pilot routes / total critical requests) | API logs + smoke outputs | >= 99.5% | 98.5%-99.49% | < 98.5% |
| Portfolio rollup correctness | Successful rollup checks / attempted rollup checks | `customer-journey` step outputs | 100% | 95%-99.9% | < 95% |
| Smoke lane stability | Passing lanes / required lanes (`guard`, `contract-all`, `org-invites`, `customer-journey`, `ui-acceptance`) | Daily run outputs | 5/5 | 4/5 with approved mitigation | <= 3/5 |

## Daily Go/No-Go Rule

Daily decision is determined by these rules:

1. If any KPI is in `FAIL`, set day state to `HOLD`.
2. If all KPIs are `PASS`, set day state to `CONTINUE`.
3. If any KPI is `WARN` and no KPI is `FAIL`, continue only with:
   - owner,
   - mitigation due date,
   - next-check timestamp.

## Weekly Pilot Exit Rule

Pilot week is eligible for controlled expansion only when:

- No P0/P1 tenancy/auth incidents occurred during pilot week.
- Smoke lane stability is `PASS` for all pilot days.
- Onboarding and invite KPIs are `PASS` on trailing 3-day window.
- Rollup correctness has no `FAIL` day.

## Required Evidence References

Each daily and weekly decision must link to:

- `docs/architecture/proofs/pilot/WEEK3_PILOT_EXECUTION_LOG.md`
- Latest staging smoke proof bundles:
  - `docs/architecture/proofs/staging/org-invites-latest`
  - `docs/architecture/proofs/staging/customer-journey-latest`
  - `docs/architecture/proofs/staging/ui-acceptance-latest`
