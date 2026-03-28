# Week 3 Controlled Pilot Runbook

> Canonical pilot execution contract for the Week 3 controlled rollout.

## 1) Scope and Baseline

- Cohort size: 3-5 organizations, controlled onboarding only.
- Baseline branch: `main`.
- Baseline readiness anchor:
  - `docs/architecture/proofs/staging/STABILIZATION_GO_NO_GO.md`
  - `docs/architecture/proofs/staging/STABILIZATION_ISSUE_CLOSURE_ADDENDUM.md`
- No RBAC redesign, schema redesign, or contract redesign during pilot.

## 2) Daily Start-of-Day Gate (Hard Stop Sequence)

Run from repo root in this exact order:

```bash
git rev-parse --abbrev-ref HEAD
git status --short
node -v
bash scripts/smoke/run.sh guard
bash scripts/smoke/run.sh contract-all
bash scripts/smoke/run.sh org-invites
bash scripts/smoke/run.sh customer-journey
bash scripts/smoke/run.sh ui-acceptance
```

Stop conditions:
- Working tree is not clean.
- Node major is not `20`.
- Any guard/contract/smoke lane fails.
- `/api/version` on staging does not report trusted commit metadata.

## 3) Mid-Day Operational Verification

Required checks:
- Confirm staging health and version:

```bash
curl -sS https://zephix-backend-staging-staging.up.railway.app/api/version
curl -i https://zephix-backend-staging-staging.up.railway.app/api/health/ready
```

- Check pilot funnel trend for active cohort:
  - Signup starts vs completions.
  - Invite creates vs accepts.
  - Role-denied errors for `MEMBER` and `VIEWER`.

Mid-day hold condition:
- Error pattern suggests tenancy drift, RBAC bypass, or sustained onboarding failure.

## 4) End-of-Day Decision Gate

Perform:
- Recheck lane status from latest successful runs.
- Review open incidents by severity.
- Confirm rollback readiness (runbook and deployment identity available).
- Record day decision in pilot log: `CONTINUE`, `HOLD`, or `ROLLBACK`.

## 5) Change Policy During Pilot

Allowed:
- Documentation updates.
- Monitoring and evidence capture improvements.
- Small, scoped bug fixes with tests and smoke evidence.

Blocked without explicit approval:
- RBAC model rewrites.
- Tenant-scoping policy changes.
- New dependencies.
- Large refactors across stable domains.

## 6) Mandatory Daily Evidence

Store references in:
- `docs/architecture/proofs/pilot/WEEK3_PILOT_EXECUTION_LOG.md`

Required minimum per pilot day:
- Date/time (UTC), operator, branch, commit SHA.
- Staging deployment id and trusted commit status.
- Results of: `guard`, `contract-all`, `org-invites`, `customer-journey`, `ui-acceptance`.
- Incident summary and day decision (`CONTINUE`/`HOLD`/`ROLLBACK`).

## 7) Escalation Trigger Summary

Escalate immediately when any of the following occurs:
- P0 tenancy, data leakage, or auth bypass signal.
- Repeated 5xx spikes in core onboarding or invite flows.
- Smoke parity regression from previously passing lanes.
- Rollup correctness break (`portfolio_rollup` not returning expected success path).
