# Project Artifacts Smoke — F7 Envelope Baseline

Established via PR #309 (Sprint 5.2a Phase 0 CI workflow).

## Verified contract (run `26377922901`, commit `a80875b7`)

- Response envelope: `{ success: true, data: <payload> }` (frontend axios unwraps `.data`)
- Create artifact: `customFieldDefinitions` camelCase; `risk_register` seeds 5 default fields
- Error codes: `WORKSPACE_HEADER_MISMATCH`, `WORKSPACE_REQUIRED`, validation 400 with field hints
- Deprecation: `GET /api/work/risks` emits `X-Deprecated` + `X-Deprecation-Notice`
- Delete: HTTP 204; soft-deleted artifacts excluded from list

## CI job

`staging-project-artifacts-smoke` in `.github/workflows/staging-smoke-lane.yml`

Proof logs written here on each run: `smoke.log` (gitignored at runtime; uploaded as Actions artifact).

## Audit note

Step 12 (audit event verification) skips in CI when `REQUIRE_AUDIT_VERIFY=0` (no Railway CLI on runners). Same deferral as Sprint 5.1 post-merge gate.
