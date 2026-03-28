# Test Environment RBAC Prerequisites

Generated: 2026-03-06
Branch: chore/mcp-and-skills

---

## ZEPHIX_WS_MEMBERSHIP_V1 (workspace role enforcement)

**Status: not directly visible, inferred by behavior**

The feature flag `ZEPHIX_WS_MEMBERSHIP_V1` is read from `process.env.ZEPHIX_WS_MEMBERSHIP_V1 === '1'`
(source: `zephix-backend/src/config/feature-flags.config.ts`).

The `/api/version` and `/api/system/identity` endpoints do not expose feature flag state.
No safe CLI inspection of test Railway variables was performed (would require printing all 45 vars).

**Inference from architecture:**
The test-vars-after-20260214.json records 45 total env vars but only 8 wiring vars in its subset.
The feature flag was explicitly commented in source as:

> "Set ZEPHIX_WS_MEMBERSHIP_V1=1 in Railway staging env vars to activate workspace membership guards.
>  Do NOT hard-code true here — this must remain env-driven so production can be enabled separately."

Given:
- Staging does NOT have `ZEPHIX_WS_MEMBERSHIP_V1=1` (confirmed by smoke NOTES in MEMORY.md: "Not set to '1' on staging")
- No evidence this flag was set in test
- Flag state: **not directly visible, inferred DISABLED** in test (same as staging)

Impact: `RequireProjectWorkspaceRoleGuard` bypasses all workspace role checks when flag is off.
This means workspace-level RBAC assertions cannot differentiate role levels in this environment.

---

## Smoke Endpoints

**Status: CONFIRMED DISABLED (by design)**

Evidence:
- `POST /smoke/users/create` → HTTP 404
- `POST /smoke/users/set-primary-org` → HTTP 404
- `GET /smoke/invites/latest-token` → HTTP 404
- `POST /auth/smoke-login` → HTTP 403 (CSRF guard blocks before SmokeKeyGuard; route exists in binary)

Root cause: `SmokeKeyGuard` (`smoke-key.guard.ts` line 18):
```
if (nodeEnv !== 'staging' || zephixEnv !== 'staging') {
  // 404 — do not disclose route existence outside staging.
}
```

This is intentional security design. Smoke infrastructure is staging-only.

---

## Required Migrations

**Status: PARTIAL — test is 1 migration behind staging**

| Environment | Migration count | Latest migration |
|-------------|----------------|-----------------|
| Staging | 148 | `CreateRisksTable1786000000003` |
| Test | 147 | `ExpandAuditCheckConstraintsForAuth18000000000013` |

The missing migration creates a Risks table — unrelated to RBAC logic.
All RBAC-relevant tables (`users`, `user_organizations`, `workspace_members`, `organizations`) exist in both environments.
Schema parity for RBAC operations: **effectively complete**.

---

## Commit SHA / Code Version

**Status: UNKNOWN**

Test reports `commitSha: unknown`, `commitShaTrusted: false`.
Cannot confirm test is running RBAC V2 cleanup code or pre-V2 code.

Note: As of this task's execution, RBAC V2 cleanup code is on `chore/mcp-and-skills` branch
and has NOT been deployed to any live environment (staging or test). Staging runs `afe993fdd360857c7d37a19b815fa526f4afaa8d` (pre-V2 cleanup baseline).

---

## Summary

| Prerequisite | Status | Notes |
|-------------|--------|-------|
| Backend health | CONFIRMED ENABLED | HTTP 200, db+schema OK |
| ZEPHIX_ENV = test | CONFIRMED | Live probe |
| Separate DB cluster | CONFIRMED | systemIdentifier differs from staging |
| ZEPHIX_WS_MEMBERSHIP_V1 | NOT DIRECTLY VISIBLE, INFERRED DISABLED | Same as staging |
| Smoke endpoints present | CONFIRMED DISABLED | Intentional — staging-only by design |
| RBAC migrations | EFFECTIVELY COMPLETE | 1 non-RBAC migration behind |
| Commit SHA | UNKNOWN | Build vars not injected in test |
