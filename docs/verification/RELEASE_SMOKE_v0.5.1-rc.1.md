# Release Smoke Test: v0.5.1-rc.1

## Environment
- **Date**: 2026-02-05T23:18:58Z
- **Commit SHA**: `130bc38e`
- **Branch**: `main`
- **Machine**: macOS darwin 24.6.0

## Result: ✅ PASS

## Checks Executed

| Check | Result |
|-------|--------|
| Frontend typecheck | ✅ PASS |
| Frontend build | ✅ PASS |
| Frontend lint:new | ✅ PASS (0 errors) |
| Backend build | ✅ PASS |
| Backend dist/main.js exists | ✅ PASS |
| Backend dist/migrations exists | ✅ PASS |

## Exact Steps

```bash
git checkout main
git pull --rebase
bash scripts/release-smoke.sh
```

## Raw Output

```
=== Release Smoke Test ===
Date: 2026-02-05T23:18:58Z

--- Frontend Checks ---
1. Frontend typecheck ... ✅ PASS
2. Frontend build ... ✅ PASS
3. Frontend lint:new ... ✅ PASS (0 errors)

--- Backend Checks ---
4. Backend build ... ✅ PASS
5. Backend dist/main.js exists ... ✅ PASS
6. Backend dist/migrations exists ... ✅ PASS

=== Summary ===
✅ Release smoke PASSED
```

## Tag Command

```bash
git tag -a v0.5.1-rc.1 -m "RC1: baseline green CI, zero TS errors, guardrails, docs structure"
git push origin v0.5.1-rc.1
```
