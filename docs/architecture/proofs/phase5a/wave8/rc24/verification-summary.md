Verification Level: LIVE STAGING
RC Tag: v0.6.0-rc.24
Date: 2026-02-17
Staging URL: https://zephix-backend-v2-staging.up.railway.app/api

# Wave 8 — Portfolio & Program Rollups

## Status: BLOCKED

## Endpoints Tested

| Method | Path | Expected | Actual HTTP | Proof File | Verdict |
|--------|------|----------|-------------|------------|---------|
| — | Portfolio list | 200 | 403 | portfolio-guard-bug.md | FAIL |
| — | Programs list | 200 | 403 | portfolio-guard-bug.md | FAIL |

## Blocker Details

Wave 8 is **BLOCKED by RequireWorkspaceAccessGuard bug**. Portfolio list and Programs list both return 403 AUTH_FORBIDDEN. Root cause: the guard handles viewer/member/ownerOrAdmin modes but the controller uses `read` mode, which is unhandled. Proof: `portfolio-guard-bug.md`.

## What Works

- No endpoints in this wave pass until guard is fixed.

## Staging TODO

- Fix RequireWorkspaceAccessGuard to handle `read` mode (or align controller to use a supported mode such as viewer/member/ownerOrAdmin).
- Re-verify portfolio list and programs list return 200 for authorized users.
- Re-run verification and update proof file.
