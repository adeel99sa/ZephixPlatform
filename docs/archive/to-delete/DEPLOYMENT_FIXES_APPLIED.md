# Deployment Fixes Applied

## Root Causes Fixed

### 1. Frontend: Missing `server.cjs` ✅
**Problem:** Dockerfile tried to copy non-existent `server.cjs`

**Fixes Applied:**
1. ✅ Updated `Dockerfile` to use `npm run preview` instead of `server.cjs`
2. ✅ Updated `nixpacks.toml` start command to use preview script
3. ✅ Updated `package.json` start script to use vite preview

**Files Changed:**
- `zephix-frontend/Dockerfile` - Now uses `npm run preview`
- `zephix-frontend/nixpacks.toml` - Start command uses preview
- `zephix-frontend/package.json` - Start script uses vite preview

### 2. Backend: Missing `INTEGRATION_ENCRYPTION_KEY` ⚠️
**Problem:** `IntegrationEncryptionService` requires 32+ character encryption key

**Action Required:**
Add to Railway → `zephix-backend` → Variables:
```
INTEGRATION_ENCRYPTION_KEY=OwosB99OwmO5Pu93uG7C1THisp/w+kFyMHXwMlJdfA8=
```

**Generated Key:** (44 characters, base64 encoded)
- Secure random 32-byte key
- Base64 encoded for environment variable
- Never commit to git

## Next Steps

### 1. Add Backend Environment Variable
1. Open Railway → `zephix-backend` service
2. Go to Variables tab
3. Add: `INTEGRATION_ENCRYPTION_KEY` = `OwosB99OwmO5Pu93uG7C1THisp/w+kFyMHXwMlJdfA8=`
4. Save and redeploy

### 2. Commit Frontend Fixes
```bash
cd zephix-frontend
git add Dockerfile nixpacks.toml package.json
git commit -m "fix: use vite preview instead of missing server.cjs"
git push origin chore/hardening-baseline
```

### 3. Verify Deployments
- **Frontend:** Should build with Nixpacks or Docker (both fixed)
- **Backend:** Should start without encryption key error

## Verification Commands

After Railway redeploy:
```bash
# Check frontend logs
railway logs --service zephix-frontend

# Check backend logs
railway logs --service zephix-backend

# Verify backend startup
# Should NOT see: "INTEGRATION_ENCRYPTION_KEY must be at least 32 characters"
```

---

**Status:** Frontend fixes applied. Backend requires Railway variable configuration.


