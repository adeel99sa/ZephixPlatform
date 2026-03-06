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

## Smoke Overrides

Some contract steps declare a canonical product path that differs from what the smoke runner actually calls.
This is intentional and documented via the `override` annotation schema in the contract JSON.

### Override Annotation Schema

```json
{
  "step": "org_signup",
  "method": "POST",
  "path": "/auth/register",
  "status": [200, 201],
  "override": true,
  "overrideReason": "Why the runner uses a different path",
  "overridePath": "/smoke/users/create",
  "overrideMethod": "POST"
}
```

| Field | Required | Purpose |
|-------|----------|---------|
| `override` | yes | Marks this step as having a runtime override |
| `overrideReason` | yes | Human-readable explanation of why |
| `overridePath` | no | Actual path called by runner (omit if step is skipped entirely) |
| `overrideMethod` | no | Actual method used (omit if step is skipped entirely) |

### Current Overrides

| Contract | Step | Canonical Path | Runner Path | Reason |
|----------|------|----------------|-------------|--------|
| customer-journey | `org_signup` | `POST /auth/register` | `POST /smoke/users/create` | `/auth/register` is rate-limited (5 req/15 min per IP) on staging |
| customer-journey | `invitee_register` | `POST /auth/register` | `POST /smoke/users/create` | Same rate-limit bypass for second user |
| org-invites | `org_signup` | `POST /auth/organization/signup` | _(skipped)_ | Runner uses pre-existing admin account via smoke-login |

### Guards

- `scripts/guard/contract-runner-parity.sh` — verifies all non-override steps have matching runner paths; verifies override steps call `overridePath`
- `scripts/guard/no-token-in-proof-artifacts.sh` — verifies no `*.raw.json` or unredacted invite tokens in proof dirs

Run both guards locally:
```
bash scripts/guard/contract-runner-parity.sh
bash scripts/guard/no-token-in-proof-artifacts.sh
```

Both guards run in CI (`staging-smoke-lane.yml`) before artifact uploads.

## Token Safety Policy

Invite tokens are one-time secrets. They must **never** be written to disk.

**Enforced by runners:**
- Token is extracted into a shell variable only
- Redacted proof file (`*invite-token-read.json`) uses `"token": "[REDACTED]"`
- Raw HTTP response file (`*-full.txt`) is deleted immediately after token extraction
- No `*.raw.json` files are ever written

**Enforced by guard:**
- `no-token-in-proof-artifacts.sh` fails if any `*.raw.json` file exists or any `*invite-token*` file contains an unredacted token value
