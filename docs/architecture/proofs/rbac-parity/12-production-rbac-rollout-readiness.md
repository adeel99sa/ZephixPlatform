# Production RBAC Rollout Readiness

Generated: 2026-03-06
Branch: chore/mcp-and-skills
Head SHA: (see 00-preflight.txt)

---

## Section A. Current Proven State

### Staging

| Item | Status |
|------|--------|
| Backend health | PASS — HTTP 200, db+schema OK |
| ZEPHIX_ENV | staging |
| Deployment ID | `90e2e2a3-6b5b-4120-98cc-96ea634a95de` |
| Commit SHA | `afe993fdd360857c7d37a19b815fa526f4afaa8d` (pre-V2 cleanup baseline) |
| commitShaTrusted | true |
| staging-onboarding lane | PASS (7/7 contract steps) |
| org-invites lane | PASS (14/14 contract steps) |
| customer-journey lane | PASS (21/21 contract steps, 22 runner steps incl. infra) |
| ui-acceptance lane | PASS (15/15 tests) |
| guard suite | PASS (no-stale-domains, no-dead-home-files, contract-runner-parity, no-token-leak, no-import-drift, no-role-drift) |
| contract-all | PASS (6 contract guards, all exit 0) |

### Test

| Item | Status |
|------|--------|
| Backend health | PASS — HTTP 200, db+schema OK |
| ZEPHIX_ENV | test |
| Deployment ID | `4b71927a-0548-4de6-bc46-2142d5d6855f` |
| Commit SHA | unknown (build vars not injected) |
| commitShaTrusted | false |
| Smoke lanes | BLOCKED — SmokeKeyGuard restricts to staging-only by design |
| Full RBAC lane parity | CANNOT CONFIRM |

### Known Pass Lanes (staging only, as authoritative evidence)

- staging-onboarding
- org-invites
- customer-journey
- ui-acceptance

### Known Blockers

1. **RBAC V2 cleanup code not deployed to any live environment** — `chore/mcp-and-skills` is a local branch only. Staging runs pre-V2 SHA (`afe993fdd360857c7d37a19b815fa526f4afaa8d`).
2. **Test environment parity unconfirmed** — commit SHA not injected; smoke lanes blocked by design.
3. **Test is 1 migration behind staging** — non-RBAC migration, low risk, but schema parity not exact.

---

## Section B. Production Rollout Prerequisites

All must be true before production RBAC V2 rollout:

- [ ] `chore/mcp-and-skills` merged to `main`
- [ ] `main` built and deployed to staging
- [ ] Staging `/api/version` shows the new `commitSha` and `commitShaTrusted: true`
- [ ] `bash scripts/smoke/run.sh guard` exits 0 on the deployed staging
- [ ] `bash scripts/smoke/run.sh contract-all` exits 0
- [ ] `bash scripts/smoke/run.sh org-invites` exits 0 with new deployment
- [ ] `bash scripts/smoke/run.sh customer-journey` exits 0 with new deployment
- [ ] Deployment trust guard passes for both proof dirs: `bash scripts/guard/smoke-proof-deployment-trust.sh docs/architecture/proofs/staging/org-invites-latest`
- [ ] Deployment trust guard passes: `bash scripts/guard/smoke-proof-deployment-trust.sh docs/architecture/proofs/staging/customer-journey-latest`
- [ ] No token leaks: `bash scripts/guard/no-token-in-proof-artifacts.sh docs/architecture/proofs/staging`
- [ ] `bash scripts/guard/no-import-drift.sh` exits 0
- [ ] `bash scripts/guard/no-role-drift.sh` exits 0
- [ ] Production `/api/health/ready` returns 200 before any production deploy
- [ ] Production `/api/version` commit SHA and deployment ID captured as baseline
- [ ] Rollback plan confirmed (see Section D)
- [ ] ZEPHIX_WS_MEMBERSHIP_V1 policy decision documented: enable or keep disabled in production
- [ ] No smoke token artifacts in proof dirs (confirmed by no-token-in-proof-artifacts guard)
- [ ] Build-time SHA injection confirmed for staging deploy (`commitShaTrusted: true`)

---

## Section C. Production Rollout Sequence

Exact steps in order. Do not skip or reorder.

1. **Verify current production baseline**
   ```
   curl -sS https://getzephix.com/api/version
   curl -i https://getzephix.com/api/health/ready
   ```
   Save both to `docs/architecture/proofs/rbac-parity/prod-pre-deploy-version.json` and `prod-pre-deploy-health.txt`.
   Abort if health is not 200.

2. **Verify production env variables safely**
   - Confirm `ZEPHIX_ENV=production` in Railway production environment
   - Confirm `NODE_ENV=production`
   - Confirm `ZEPHIX_WS_MEMBERSHIP_V1` setting matches intent (enable or keep disabled)
   - Do NOT print `DATABASE_URL`, `JWT_SECRET`, or other credentials
   - Confirm `COMMIT_SHA` / `GIT_SHA` build vars are configured for commit trust

3. **Merge and deploy**
   ```
   git checkout main && git merge chore/mcp-and-skills
   cd zephix-backend && railway up --service zephix-backend --environment production --detach
   ```

4. **Verify deployment ID changed**
   ```
   curl -sS https://getzephix.com/api/version
   ```
   Confirm `railwayDeploymentId` differs from baseline captured in step 1.
   Confirm `commitSha` matches the merge commit SHA.
   Confirm `commitShaTrusted: true`.

5. **Health check post-deploy**
   ```
   curl -i https://getzephix.com/api/health/ready
   ```
   Must return 200 with `X-Zephix-Env: production` header.

6. **Run RBAC-critical endpoint verification**
   - Authenticate as a known ADMIN user
   - Verify `GET /api/auth/me` returns `platformRole: ADMIN`
   - Authenticate as a known MEMBER user
   - Verify `GET /api/auth/me` returns `platformRole: MEMBER`
   - Verify VIEWER cannot call `POST /api/orgs/:orgId/invites` (expect 403)

7. **Verify no auth regressions**
   - Standard login flow works
   - JWT contains `platformRole` field
   - No 401/403 on previously working ADMIN paths

8. **Record proof**
   Save post-deploy version, health, and RBAC spot-check results to:
   `docs/architecture/proofs/production/rbac-v2-deploy-YYYYMMDD/`

---

## Section D. Rollback Plan

### When to trigger rollback
- `/api/health/ready` returns non-200 after deploy
- Any previously working endpoint returns unexpected 401 or 403
- Auth regression detected in RBAC spot checks
- ADMIN users cannot login or access admin paths

### How to revert

1. **Identify the pre-deploy deployment ID** (captured in step 1 of rollout sequence)
2. **Redeploy previous version via Railway UI or CLI**
   ```
   # Railway CLI: re-deploy the previous deployment
   railway redeploy --deployment <previous-deploy-id> --service zephix-backend --environment production
   ```
3. **Verify rollback health**
   ```
   curl -i https://getzephix.com/api/health/ready
   curl -sS https://getzephix.com/api/version
   ```
   Confirm `railwayDeploymentId` matches the pre-deploy baseline.

4. **If ZEPHIX_WS_MEMBERSHIP_V1 was enabled during deploy**: set it back to original value before rollback.

5. **Proofs to capture before rollback**
   - Full `/api/version` output
   - Any failing request/response (curl -v)
   - `GET /api/health/ready` full response headers

6. **Minimum smoke to run after rollback**
   ```
   curl -i https://getzephix.com/api/health/ready     # must be 200
   curl -sS https://getzephix.com/api/auth/me          # (with valid token) must return user object
   ```

---

## Section E. Final Verdict

**NO-GO**

Rationale:

| Condition | Status |
|-----------|--------|
| RBAC V2 cleanup deployed to staging | NO — code is on local branch only |
| Staging smoke re-verified with V2 code | NO — staging runs pre-V2 SHA |
| Test parity confirmed | PARTIAL ONLY — SHA unconfirmed, smoke lanes blocked |
| All production prerequisites checked | NO — merge and deploy not yet performed |

**Next recommended action:**

1. Get `chore/mcp-and-skills` reviewed and merged to `main`
2. Deploy `main` to staging
3. Re-run: `bash scripts/smoke/run.sh guard && bash scripts/smoke/run.sh contract-all && bash scripts/smoke/run.sh org-invites && bash scripts/smoke/run.sh customer-journey`
4. Verify all proof artifacts have `commitShaTrusted: true` and match the new deployment ID
5. Re-assess readiness — at that point verdict may become **GO**

**Blocking issue for GO**: RBAC V2 code has not been deployed to any live environment. Production readiness assessment requires at minimum staging verification with the actual V2 commit.
