# Railway Deployment Fixes

## Root Causes Identified

### 1. Frontend Failure: Missing `server.cjs`
**Error:** `"/app/server.cjs": not found`

**Root Cause:**
- Dockerfile tries to copy `server.cjs` which doesn't exist
- Frontend should use Nixpacks auto-detect, not Dockerfile
- According to rules: "Never introduce Dockerfile for frontend unless explicitly requested"

**Fix Applied:**
- Updated Dockerfile to use `npm run preview` instead of `server.cjs`
- Added comment that Dockerfile is deprecated in favor of Nixpacks
- Frontend should use Nixpacks auto-detect with preview script: `vite preview --host 0.0.0.0 --port $PORT`

**Recommended Action:**
- Remove Dockerfile or ensure `.railwayignore` excludes it
- Railway should auto-detect and use Nixpacks
- Preview script is already correct: `"preview": "vite preview --host 0.0.0.0 --port $PORT"`

### 2. Backend Failure: Missing `INTEGRATION_ENCRYPTION_KEY`
**Error:** `INTEGRATION_ENCRYPTION_KEY must be at least 32 characters`

**Root Cause:**
- `IntegrationEncryptionService` requires `INTEGRATION_ENCRYPTION_KEY` environment variable
- Must be at least 32 characters (for AES-256 encryption)
- Variable is missing in Railway environment

**Fix Required:**
1. Open Railway → `zephix-backend` service → Variables
2. Add new variable:
   - **Name:** `INTEGRATION_ENCRYPTION_KEY`
   - **Value:** Generate a secure 32+ character string
3. Generate secure key:
   ```bash
   # Option 1: Using openssl
   openssl rand -base64 32

   # Option 2: Using node
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```
4. Save and redeploy

**Note:** This key is critical for encrypting integration secrets. Store it securely and never commit to git.

## Immediate Actions

### For Frontend:
1. **Option A (Recommended):** Remove Dockerfile to force Nixpacks
   ```bash
   cd zephix-frontend
   git rm Dockerfile
   git commit -m "fix: remove Dockerfile to force Nixpacks auto-detect"
   ```

2. **Option B:** Keep Dockerfile but ensure it uses preview script (already fixed)

### For Backend:
1. Add `INTEGRATION_ENCRYPTION_KEY` to Railway variables
2. Generate secure 32+ character key
3. Save and trigger redeploy

## Verification

After fixes:
1. **Frontend:** Check Railway logs show Nixpacks build (not Docker)
2. **Backend:** Check logs show successful startup without encryption key error
3. **Both:** Verify services are online and responding

---

**Status:** Fixes identified and documented. Ready for Railway configuration.

