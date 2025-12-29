# Node Version Fix Applied ✅

## Problem
Vite requires Node 20.19+ or 22.12+, but Railway was running Node 20.18.1, causing Vite to block startup.

## Solution Applied

### 1. package.json Engines
**File:** `zephix-frontend/package.json`
```json
"engines": {
  "node": ">=20.19.0"
}
```

### 2. nixpacks.toml Node Version
**File:** `zephix-frontend/nixpacks.toml`
- Changed from `nodejs_20` to `nodejs_22`
- Added comments documenting Node version requirement
- Documents Railway variable: `NIXPACKS_NODE_VERSION=22.12.0`

## Railway Configuration Required

**In Railway → zephix-frontend → Variables:**
Add: `NIXPACKS_NODE_VERSION = 22.12.0`

If that doesn't work, also add: `NODE_VERSION = 22.12.0`

Then redeploy.

## Verification

After redeploy, check logs:
- ✅ Should see Node 22.x in build logs
- ✅ No Vite Node version warnings
- ✅ `vite preview` starts successfully
- ✅ Service listens on Railway port

## Commit

**Hash:** (see git log)
**Message:** `fix(frontend): pin node version for vite runtime`

---

**Status:** ✅ Code changes pushed. Add Railway variable and redeploy.

