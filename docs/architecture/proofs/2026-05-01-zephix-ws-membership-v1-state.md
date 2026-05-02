# Gate Zero Proof: ZEPHIX_WS_MEMBERSHIP_V1 State

**Date captured:** 2026-05-01  
**Captured by:** Cursor (executor) under architect direction  
**Branch basis:** `chore/gate-zero-flag-state-proof` from `origin/staging` at capture time  
**Purpose:** Single dated proof of what the repository and accessible tooling say about this flag. Resolves contradictory historical docs by separating **code truth**, **documented snapshots**, and **live env truth** (live env requires operator verification).

**Related:** Production Readiness Gate 1 / AD-027 (`docs/architecture/AD-027_LOCKED.md`).

---

## Code-level evidence

### 1.1 Default when `ZEPHIX_WS_MEMBERSHIP_V1` is unset

`ConfigModule` maps env to `features.workspaceMembershipV1`:

```40:45:zephix-backend/src/config/feature-flags.config.ts
    // RBAC stabilization: Set ZEPHIX_WS_MEMBERSHIP_V1=1 in Railway staging env vars
    // to activate workspace membership guards (RequireWorkspaceRoleGuard,
    // RequireProjectWorkspaceRoleGuard). Safe to enable after guard fixes in
    // src/common/auth/ are deployed. Do NOT hard-code true here — this must
    // remain env-driven so production can be enabled separately.
    workspaceMembershipV1: process.env.ZEPHIX_WS_MEMBERSHIP_V1 === '1',
```

**Conclusion (code):** If the variable is unset or any value other than the string `'1'`, `workspaceMembershipV1` is **false**.

### 1.2 Code paths gated by the flag (behavior summary)

| Location | Flag OFF / unset | Flag `'1'` |
|----------|------------------|------------|
| `RequireWorkspaceRoleGuard` | Returns **true** (no workspace role check) — ```72:78:zephix-backend/src/modules/workspaces/guards/require-workspace-role.guard.ts``` | Performs membership / role resolution via `WorkspaceAccessService` |
| `RequireProjectWorkspaceRoleGuard` | Returns **true** (no check) — ```69:75:zephix-backend/src/modules/projects/guards/require-project-workspace-role.guard.ts``` | Performs project-scoped workspace role check |
| `WorkspaceAccessService.getAccessibleWorkspaceIds` | **`null`** = all org workspaces for non-admin path combined with admin bypass — ```50:58:zephix-backend/src/modules/workspace-access/workspace-access.service.ts``` | Non-admin users filtered to member workspaces only |
| `WorkspacesService.listByOrg` | Lists all org workspaces for non-admin when flag off (same block as admin bypass) — ```142:147:zephix-backend/src/modules/workspaces/workspaces.service.ts``` | Non-admin filtered by membership |
| `WorkspaceMembershipFeatureGuard` | If `NODE_ENV` is **production** (typical staging/prod): **`ForbiddenException`** unless `ZEPHIX_WS_MEMBERSHIP_V1 === '1'` — ```46:58:zephix-backend/src/modules/workspaces/guards/feature-flag.guard.ts``` | Allows request to proceed past this guard |
| `WorkspaceMembershipFeatureGuard` | If `NODE_ENV` is **development** or **test**: **bypass** (always allow) — ```36:44:zephix-backend/src/modules/workspaces/guards/feature-flag.guard.ts``` | Same bypass |

**Important nuance:** Routes that layer `WorkspaceMembershipFeatureGuard` can **block** membership-related endpoints when the flag is off in `NODE_ENV=production`, while guards that only use `RequireWorkspaceRoleGuard` **allow** when the flag is off. Both patterns coexist in the codebase.

### 1.3 In-repo documentation mentioning runtime flag state (contradictory snapshots)

These are **historical narrative**, not live Railway exports:

| Path | Claim (abbrev.) |
|------|------------------|
| `docs/architecture/proofs/pilot/WORK_MANAGEMENT_GAP_AUDIT.md` | Flag not enabled on staging |
| `docs/architecture/proofs/rbac-cleanup/staging-rbac-activation/RBAC_WORKSPACE_ACTIVATION_PROOF.md` | `=1` active in Railway staging |
| `docs/architecture/proofs/rbac-cleanup/staging-rbac-activation/FINAL_REPORT.md` | `=1` active; guard fixes not deployed; legacy `user.role` issues |
| `docs/architecture/proofs/rbac-parity/11-test-vs-staging-rbac-matrix.md` | NOT SET / `=1` not confirmed in staging |
| `docs/MVP_FINAL_FOUR_VERIFICATION.md` | Checkbox: set `=1` on staging |

**Conclusion:** Prior docs **conflict**. This Gate Zero file does **not** resolve staging/prod **without** fresh operator evidence (Section 2).

---

## Environment configuration evidence

### 2.1 Railway CLI

**Result:** `railway environment` failed in this execution environment with:

`Environment must be specified when not running in a terminal`

**Status:** **REQUIRES MANUAL CHECK BY OPERATOR**

**Suggested operator steps:**

1. Railway Dashboard → backend service (staging) → **Variables** → search `ZEPHIX_WS_MEMBERSHIP_V1`.
2. Repeat for production backend service (if separate).
3. Paste variable presence and exact value (redact unrelated vars) into a follow-up proof dated the day of capture, or append to this file in a new dated section.

### 2.2 GitHub Actions / workflows

`grep` under `.github/workflows/` for `ZEPHIX_WS_MEMBERSHIP_V1`: **no matches**.

### 2.3 Docker / compose / YAML repo configs

Search for `ZEPHIX_WS_MEMBERSHIP_V1` in `Dockerfile*`, `docker-compose*`, `*.yml` / `*.yaml` at repo root patterns used in reconnaissance: **no matches**.

---

## Behavioral evidence

### 3.1 Staging / 3.2 Production

**Status:** **REQUIRES MANUAL VERIFICATION**

This executor did not run authenticated HTTP requests against staging or production (no tokens, no base URLs, no approval for live probing).

**Suggested manual check:** Use a test user that is in the org but **not** a member of a target workspace; call a workspace-scoped endpoint that uses `RequireWorkspaceRoleGuard` vs one protected by `WorkspaceMembershipFeatureGuard`; compare responses with flag ON vs OFF per AD-027 test matrix.

---

## Conclusion

| Scope | State | Confidence |
|-------|--------|------------|
| **Default when env unset (Node process)** | **OFF** (`workspaceMembershipV1 === false`) | **HIGH** — see `feature-flags.config.ts:45` |
| **Local dev default** (`NODE_ENV=development`) | `WorkspaceMembershipFeatureGuard` **bypasses**; role guards still treat unset flag as OFF | **HIGH** — see `feature-flag.guard.ts:36-44` |
| **Staging (Railway)** | **UNKNOWN** | **UNVERIFIED** — Railway CLI/dashboard not captured here |
| **Production** | **UNKNOWN** | **UNVERIFIED** |

### Next steps to obtain KNOWN state

1. Operator: capture Railway variable screenshot or redacted export for staging + production **on the same calendar date** as the decision.
2. Optional: append `## Amendment YYYY-MM-DD — Railway evidence` to this file or add `docs/architecture/proofs/YYYY-MM-DD-zephix-ws-membership-v1-railway.md`.
3. Before Production Readiness Gate 1 flip: refresh this proof; companion proof file when value changes.

---

## Architect notes for follow-up

- Refresh this proof before Gate 1 flip is approved.
- Any intentional flag change in Railway should ship with a short dated addendum (who/when/old→new).
