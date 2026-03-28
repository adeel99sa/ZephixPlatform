# Week 3 Pilot Daily Monitoring Checklist

Use this checklist for every pilot day. All timestamps must be UTC.

## Morning Checks (Start-of-Day Gate)

- [ ] Confirm branch is `main`.
- [ ] Confirm clean tree: `git status --short` returns empty.
- [ ] Confirm Node v20: `node -v`.
- [ ] Run `bash scripts/smoke/run.sh guard` and record result.
- [ ] Run `bash scripts/smoke/run.sh contract-all` and record result.
- [ ] Run `bash scripts/smoke/run.sh org-invites` and record result.
- [ ] Run `bash scripts/smoke/run.sh customer-journey` and record result.
- [ ] Run `bash scripts/smoke/run.sh ui-acceptance` and record result.
- [ ] Verify staging identity:
  - `curl -sS https://zephix-backend-staging-staging.up.railway.app/api/version`
  - `curl -i https://zephix-backend-staging-staging.up.railway.app/api/health/ready`
- [ ] Record deployment id and trusted commit status in pilot log.

Hard stop:
- Any failed guard, contract, or smoke lane.
- Untrusted staging commit metadata.

## Live Checks (In-Day Monitoring)

- [ ] Track onboarding funnel (starts, completions, drop-offs).
- [ ] Track invite funnel (creates, accepts, failures).
- [ ] Track permission-denied patterns by role (`ADMIN`, `MEMBER`, `VIEWER`).
- [ ] Check for 5xx spikes on core routes.
- [ ] Check rollup correctness signals (`portfolio_rollup` behavior).
- [ ] Confirm no token/secrets in any captured artifacts.

Trigger immediate escalation if:
- P0/P1 auth or tenancy issue appears.
- Sustained onboarding or invite failures exceed success criteria warn band.
- Rollup path regresses from known passing state.

## Evening Checks (End-of-Day Gate)

- [ ] Reconcile all incidents opened/closed during the day.
- [ ] Confirm each incident has severity, owner, ETA, and evidence.
- [ ] Confirm rollback readiness (runbook path + known good deploy identity).
- [ ] Publish daily decision: `CONTINUE`, `HOLD`, or `ROLLBACK`.
- [ ] Append full day summary to pilot execution log.

## Required Daily Log Fields

For every day entry in the pilot execution log:

- Date/time UTC
- Operator
- Branch and commit SHA
- Staging deployment id
- `commitShaTrusted` status
- Lane results (`guard`, `contract-all`, `org-invites`, `customer-journey`, `ui-acceptance`)
- KPI status (`PASS`/`WARN`/`FAIL`)
- Incident count by severity
- Final day decision
