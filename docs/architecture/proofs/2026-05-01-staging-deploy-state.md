# Staging Deploy State Proof — 2026-05-01

**Date captured:** 2026-05-01  
**Captured by:** Architect (Claude) via operator screenshots from Railway dashboard  
**Purpose:** Single dated artifact recording deployed state of staging environment after Sprint 1 merges. Companion to Gate Zero flag state proof. Establishes baseline for V21 current state audit.

---

## Backend service: zephix-backend-staging

| Field | Value |
|---|---|
| URL | https://zephix-backend-staging-staging.up.railway.app |
| Region | us-east4-eqdc4a |
| Replicas | 1 |
| Active deployment | Merge PR #231 (chore/gate-zero-flag-state-proof) |
| Deploy time | 2026-05-01 (~24 minutes before capture) |
| Deploy status | Deployment successful (per Railway dashboard) |

## Frontend service: zephix-frontend

| Field | Value |
|---|---|
| URL | https://zephix-frontend-staging.up.railway.app |
| Region | us-east4-eqdc4a |
| Replicas | 1 |
| Active deployment | Merge PR #231 |
| Deploy time | 2026-05-01 (~26 minutes before capture) |
| Deploy status | Deployment successful (per Railway dashboard) |

---

## Recent deployment sequence (last 24 hours, oldest to newest)

Source: Railway dashboard "History" panel for both services.

| PR | Description | Approximate time |
|---|---|---|
| #225 | AD-027 permission matrix harness | yesterday |
| #226 | AD-027 guard-audit infrastructure | yesterday |
| #227 | AD-027 architecture docs (commit AD-027 to docs/architecture/) | yesterday |
| #228 | AD-027 workspace-access-guard slug extension | 23 hours ago |
| #229 | AD-027 batch 1a-i workspace reads | 1 hour ago |
| #230 | AD_INDEX + V21 template + rules alignment | 30 minutes ago |
| #231 | Gate Zero flag state proof | 24-26 minutes ago (currently ACTIVE) |

All listed deployments show HISTORY status REMOVED (rolled forward to next deploy). Active deployment is PR #231.

---

## Architectural significance

This proof establishes baseline for V21 audit:

1. **Staging is on PR #231 (Gate Zero proof merge).** All architectural artifacts produced in Sprint 1 are deployed.
2. **Both backend and frontend deployed to same Railway region** (us-east4-eqdc4a).
3. **Single replica per service.** No horizontal scaling configured. Acceptable for staging; not production-grade.
4. **Deployment cadence is healthy:** 7 PRs deployed within ~24 hour window, all successful, no failures visible in dashboard history.
5. **Production environment status (separate from this proof):** No customers, variable `ZEPHIX_WS_MEMBERSHIP_V1` unset (per Gate Zero proof at `docs/architecture/proofs/2026-05-01-zephix-ws-membership-v1-state.md`).

---

## Limitations of this proof

- **Commit SHAs not captured.** Railway dashboard shows PR numbers and merge messages but exact deployed commit SHAs were not extracted from the screenshots. SHAs can be derived from PR #231 merge event in GitHub if needed for forensic purposes.
- **Service health beyond "deployment successful" not captured.** No memory/CPU/uptime metrics in this proof. Railway Metrics tab would provide these but was not captured.
- **Database state not captured.** Migration application status, table presence, row counts — none verified for this proof.
- **Application-level health checks not captured.** Endpoint smoke testing not performed for this proof.

These are acceptable limitations because:

- Proof scope is "what is deployed" not "is deployment behaving correctly"
- V21 audit Section 5 (operational + commercial) is the appropriate place for deeper service health work
- This proof gives V21 audit a solid baseline reference

---

## Architect notes for follow-up

- This proof must be refreshed if staging deploys diverge significantly from this baseline
- Next refresh trigger: when Sprint 2 work begins deploying (Stripe integration, AD-027 batch 1a-ii, etc.)
- Convention established: dated proof files in `docs/architecture/proofs/` for operational state evidence

## Document end
