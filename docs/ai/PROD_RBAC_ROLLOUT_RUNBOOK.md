# RBAC V2 Production Rollout Runbook

Status: READY TO EXECUTE (pending staging deploy of chore/mcp-and-skills)
Branch: chore/mcp-and-skills
Readiness proof: docs/architecture/proofs/rbac-parity/12-production-rbac-rollout-readiness.md

---

## Prerequisites Checklist

Before starting this runbook, confirm:

- [ ] `chore/mcp-and-skills` merged to `main`
- [ ] Offline readiness guard passes: `bash scripts/guard/prod-rbac-rollout-readiness.sh`

---

## Phase 1 — Staging Re-Verification

Run these in order. Stop on first failure.

### 1.1 Deploy to staging

```bash
cd zephix-backend
railway up --service zephix-backend-v2 --environment staging --detach
```

Wait for health to return 200:

```bash
watch -n 5 'curl -si https://zephix-backend-staging-staging.up.railway.app/api/health/ready | head -5'
```

### 1.2 Verify commit SHA trust

```bash
curl -sS https://zephix-backend-staging-staging.up.railway.app/api/version | python3 -m json.tool
```

Required:
- `commitShaTrusted: true`
- `commitSha` matches the merge commit SHA
- `railwayDeploymentId` is a new UUID (differs from `90e2e2a3-...`)

### 1.3 Run offline guards

```bash
bash scripts/smoke/run.sh guard
bash scripts/smoke/run.sh contract-all
```

Both must exit 0.

### 1.4 Run RBAC-critical smoke lanes

```bash
# Export STAGING_SMOKE_KEY from your secret store or GitHub Actions — never from a committed file.
export STAGING_SMOKE_KEY='…'
bash scripts/smoke/run.sh org-invites

export STAGING_SMOKE_KEY='…'
bash scripts/smoke/run.sh customer-journey
```

Both must exit 0. Verify proof artifacts:

```bash
bash scripts/guard/smoke-proof-deployment-trust.sh docs/architecture/proofs/staging/org-invites-latest
bash scripts/guard/smoke-proof-deployment-trust.sh docs/architecture/proofs/staging/customer-journey-latest
```

### 1.5 Staging re-verification complete

If all above pass, staging is re-verified with RBAC V2 code. Update:
- `docs/architecture/proofs/rbac-v2/RBAC_V2_CLEANUP_PROOF.md` — update staging deployment ID and commit SHA
- Create `docs/architecture/proofs/rbac-v2/staging-post-v2-deploy.txt` with output

---

## Phase 2 — Production Baseline Capture

Run BEFORE any production deploy.

```bash
curl -sS https://getzephix.com/api/version > docs/architecture/proofs/production/pre-deploy-version.json
curl -si https://getzephix.com/api/health/ready > docs/architecture/proofs/production/pre-deploy-health.txt
```

Record the `railwayDeploymentId` value. This is your rollback target.

---

## Phase 3 — Production Deploy

```bash
cd zephix-backend
railway up --service zephix-backend --environment production --detach
```

Wait for health (same watch command as 1.1, using production URL).

---

## Phase 4 — Production Post-Deploy Verification

### 4.1 Verify deployment ID changed

```bash
curl -sS https://getzephix.com/api/version
```

Confirm:
- `railwayDeploymentId` differs from pre-deploy baseline
- `commitShaTrusted: true`
- `zephixEnv: production`

### 4.2 Health check

```bash
curl -i https://getzephix.com/api/health/ready
```

Must return `200 OK` and `X-Zephix-Env: production`.

### 4.3 RBAC spot check

Using a pre-existing ADMIN user:
```bash
# Login and get token (use standard login, not smoke-login)
# Then:
curl -sS https://getzephix.com/api/auth/me -H "Authorization: Bearer <token>"
# Verify response contains platformRole: "ADMIN"
```

Using a pre-existing VIEWER user (if available):
```bash
# Attempt invite creation — must return 403
curl -s -o /dev/null -w "%{http_code}" -X POST \
  https://getzephix.com/api/orgs/<orgId>/invites \
  -H "Authorization: Bearer <viewer-token>" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","role":"member"}'
# Expected: 403
```

### 4.4 Record proof

```bash
mkdir -p docs/architecture/proofs/production/rbac-v2-deploy-$(date +%Y%m%d)
curl -sS https://getzephix.com/api/version > docs/architecture/proofs/production/rbac-v2-deploy-$(date +%Y%m%d)/version.json
curl -si https://getzephix.com/api/health/ready > docs/architecture/proofs/production/rbac-v2-deploy-$(date +%Y%m%d)/health.txt
```

---

## Rollback Procedure

Trigger if: health non-200, auth regression, RBAC spot check fails.

1. Note the pre-deploy `railwayDeploymentId` from Phase 2
2. In Railway dashboard or CLI: redeploy the previous deployment
3. Verify health returns 200 and `railwayDeploymentId` matches pre-deploy baseline
4. File an incident document in `docs/architecture/proofs/production/incidents/`

---

## Go / No-Go Decision Point

After Phase 1 (staging re-verification), assess:

| All staging lanes pass with V2 commit | PROCEED to Phase 2-4 |
| Any staging lane fails | STOP — investigate and fix before production |
| commitShaTrusted is false in staging | STOP — fix build-time SHA injection first |
