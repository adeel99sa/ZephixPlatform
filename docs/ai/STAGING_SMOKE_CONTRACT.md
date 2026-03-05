# Staging Smoke Contract

Canonical source of truth for staging endpoints:
- `docs/ai/environments/staging.env`

Required env keys:
- `STAGING_BACKEND_BASE`
- `STAGING_BACKEND_API`

Required endpoints:
- `GET $STAGING_BACKEND_API/health/ready`
- `GET $STAGING_BACKEND_API/version`
- `GET $STAGING_BACKEND_API/auth/csrf`
- `POST $STAGING_BACKEND_API/auth/register`
- `POST $STAGING_BACKEND_API/auth/login`
- `GET $STAGING_BACKEND_API/auth/me`
- `POST $STAGING_BACKEND_API/workspaces`

Allowed statuses:
- `health/ready`: `200`, `201`
- `version`: `200`, `201`
- `csrf`: token must be present (>= 10 chars)
- `register`: `200`, `201`, `409`
- `login`: `200`, `201`
- `me`: `200`, `201`
- `workspaces`: `200`, `201`

Execution entrypoint:
- Local and CI must use `scripts/smoke/run.sh`
  - `scripts/smoke/run.sh guard`
  - `scripts/smoke/run.sh staging-onboarding`

Proof requirements:
- Onboarding smoke writes to `docs/architecture/proofs/staging/onboarding-latest/`
- Version response must include `railwayDeploymentId` and it must be recorded in output.
- Strict cleanup green on staging (run_id=20260305T024935Z, deployment=21fd37cb-76fe-4e9e-bbca-d00531c912b0): task_delete=200, project_delete=200, result=PASS.

## Traceability Evidence Policy

Only retain essential deploy proof files. Intermediate polling artifacts must not be committed.

**Keep:**
- `version-predeploy.txt` — version snapshot before a deploy
- `deploy-<commit>.txt` — Railway CLI deploy output for a given commit
- `version-postdeploy-final.txt` — version snapshot after deploy stabilizes
- `version-before-hardening.txt` / `version-after-hardening.txt` — hardening lane snapshots

**Delete before commit:**
- `version-postdeploy-attempt-*.txt` — intermediate polling files; collapse to final only
