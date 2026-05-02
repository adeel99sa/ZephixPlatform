# Gate Zero Proof: ZEPHIX_WS_MEMBERSHIP_V1 State

**Date captured:** 2026-05-01  
**Captured by:** Cursor (executor) under architect direction; **operator-confirmed** Railway state amended same date.  
**Branch basis:** `chore/gate-zero-flag-state-proof` from `origin/staging` at capture time  
**Purpose:** Single dated proof of flag behavior in code and **actual** configuration in deployed Railway services. Supersedes contradictory historical docs.

**Related:** Production Readiness Gate 1 / AD-027 (`docs/architecture/AD-027_LOCKED.md`) — reframed per **Architectural finding** below.

---

## Operator-confirmed environment state (2026-05-01)

| Environment | Service (Railway) | `ZEPHIX_WS_MEMBERSHIP_V1` | Effective enforcement |
|---------------|-------------------|---------------------------|------------------------|
| **Staging** | `zephix-backend-staging` | **ON** (value `1`) | **HIGH confidence** — Railway Variables dashboard, 2026-05-01 (operator) |
| **Production** | zephix-backend production service | **OFF** (variable **not set** → code default false) | **HIGH confidence** — Railway Variables dashboard, 2026-05-01 (operator) |

**Operational context (operator):** Production is **provisioned infrastructure only** — no customers, no live traffic, no production data plane in use as of 2026-05-01. **Staging** is the de-facto integration and test environment where built work is exercised; staging has been configured with `ZEPHIX_WS_MEMBERSHIP_V1=1`.

---

## Architectural finding

Production is provisioned at Railway level but **not serving customers** as of 2026-05-01. Engineering validation runs against **staging**, where `ZEPHIX_WS_MEMBERSHIP_V1=1` applies strict workspace-membership paths (alongside guard behavior documented in code). Production currently inherits **flag-OFF** semantics where the variable is unset; that mismatch is **academic** until the first user hits production.

**Production Readiness Gate 1 (reframed):** Not a dramatic “production cutover.” Treat as **configuration alignment before first customer**: when onboarding the first paying or pilot customer, set `ZEPHIX_WS_MEMBERSHIP_V1=1` in production to match staging-tested behavior (order of minutes in Railway, plus deploy/smoke). Real readiness work is **making production customer-capable**: Stripe live path, email delivery verified, secrets/monitoring, tenancy assurance (e.g. pen test), legal, end-to-end onboarding — not the flag toggle in isolation.

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

**Conclusion (code):** If the variable is unset or any value other than the string `'1'`, `workspaceMembershipV1` is **false**. Production’s unset variable therefore evaluates to **OFF** per application code.

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

### 1.3 Historical in-repo docs (superseded for env state)

Older markdown under `docs/architecture/proofs/` and similar paths contained conflicting claims about staging. **This file’s operator table** is the authoritative record for **2026-05-01** Railway configuration.

---

## Supplementary repository evidence (no live secrets)

### GitHub Actions / workflows

`grep` under `.github/workflows/` for `ZEPHIX_WS_MEMBERSHIP_V1`: **no matches**.

### Docker / compose / YAML

Search for `ZEPHIX_WS_MEMBERSHIP_V1` in common infra filenames in-repo: **no matches**.

---

## Conclusion

| Scope | State | Confidence |
|-------|--------|------------|
| **Default when env unset** | **OFF** | **HIGH** — `feature-flags.config.ts:45` |
| **Staging (`zephix-backend-staging`)** | **ON** (`1`) | **HIGH** — Railway dashboard, operator 2026-05-01 |
| **Production (backend service)** | **OFF** (unset → false) | **HIGH** — Railway dashboard, operator 2026-05-01 |
| **Local dev** (`NODE_ENV=development` / `test`) | Feature guard bypass + unset flag semantics per guards | **HIGH** — `feature-flag.guard.ts:36-44` |

**Before first customer on production:** Set `ZEPHIX_WS_MEMBERSHIP_V1=1` to align with staging-tested behavior; redeploy; smoke; refresh this proof or add a dated addendum documenting the change.

---

## Architect notes for follow-up

- Refresh or append when production flag changes or when production begins serving users.
- Companion dated note recommended when variable changes (who / when / old → new).
