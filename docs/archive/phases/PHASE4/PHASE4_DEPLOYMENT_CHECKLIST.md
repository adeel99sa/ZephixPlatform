# Phase 4.1 Deployment Checklist

## Pre-Deployment

- [x] Circular dependency fixed
- [x] Test database setup fixed
- [x] Build errors resolved
- [x] Module graph verified (no cycles)
- [x] Verification script ready

## Deployment Steps

1. **Authenticate**:
   ```bash
   export BASE="https://zephix-backend-production.up.railway.app"
   source scripts/auth-login.sh
   ```

2. **Run Verification**:
   ```bash
   bash scripts/phase4-portfolio-program-verify.sh
   ```

## Verification Script Requirements

- **BASE**: Backend base URL (required)
- **TOKEN**: Authentication token (required, obtained via auth-login.sh)
- **WORKSPACE_ID**: Fetched automatically if not provided (required for summary endpoints)
- **x-workspace-id header**: Automatically included for both summary endpoints

## Expected Results

- ✅ Routing guard check passes
- ✅ Preflight check passes (commitShaTrusted = true)
- ✅ Portfolio creation succeeds
- ✅ Program creation succeeds
- ✅ Add project to portfolio succeeds
- ✅ Assign program to project succeeds
- ✅ Portfolio summary returns expected structure
- ✅ Program summary returns expected structure

