# Week 3 Pilot Issue Triage Model

## 1) Severity Model

### P0 (Critical, Pilot Stop)

Definition:
- Tenancy leak, auth bypass, or data exposure risk.
- Major outage on core pilot path (onboarding/invites/workspace/project creation).

SLA:
- Acknowledge: 15 minutes.
- Mitigation owner assigned: 30 minutes.
- Pilot state: `HOLD` immediately.

### P1 (High, Pilot At Risk)

Definition:
- Security-control regression without confirmed exploit.
- Core flow failure with workarounds, or repeated 5xx bursts.

SLA:
- Acknowledge: 30 minutes.
- Mitigation owner assigned: 60 minutes.
- Pilot state: `HOLD` if unresolved within same business day.

### P2 (Medium, Degraded Experience)

Definition:
- Non-critical behavior defects impacting pilot users.
- Role UX inconsistencies without policy bypass.

SLA:
- Acknowledge: 4 hours.
- Planned fix: 1-2 business days.

### P3 (Low, Cosmetic/Minor)

Definition:
- Cosmetic issues, copy defects, low-risk quality improvements.

SLA:
- Acknowledge: 1 business day.
- Planned fix: Backlog and prioritize in next cycle.

## 2) Escalation Chain

1. Incident owner (first responder) classifies severity and opens record.
2. Engineering lead confirms severity and action path.
3. Product/operations lead receives status within SLA window.
4. For P0/P1, decision authority confirms pilot `CONTINUE`/`HOLD`/`ROLLBACK`.

## 3) Incident Lifecycle

- `NEW`: reported, not yet triaged.
- `TRIAGED`: severity/owner/impact assigned.
- `IN_PROGRESS`: mitigation underway.
- `VERIFYING`: fix merged/deployed, validation running.
- `RESOLVED`: validation complete with evidence links.
- `CLOSED`: post-incident notes recorded.

Exit criteria for `RESOLVED`:
- Repro no longer fails.
- Relevant smoke and/or guard checks pass.
- Evidence linked in pilot execution log.

## 4) Required Incident Record Template

Use this structure for every pilot incident:

```markdown
### Incident <ID>
- Date UTC:
- Reporter:
- Severity: P0|P1|P2|P3
- Affected area:
- User impact:
- Reproduction steps:
- Evidence links:
- Owner:
- Mitigation plan:
- Validation commands/results:
- Decision impact: CONTINUE|HOLD|ROLLBACK
- Status:
```

## 5) Decision Rules by Severity

- Any open `P0`: pilot remains `HOLD`.
- Open `P1` beyond SLA: pilot remains `HOLD`.
- `P2`/`P3` can continue only with owner + ETA + mitigation note.

## 6) Evidence Discipline

All incidents must link to reproducible artifacts:
- Smoke lane outputs or proof bundle entries.
- Relevant version/health evidence for staging identity.
- Commit and deployment references where applicable.

Never include:
- Secrets, tokens, or private credential values in incident docs.
