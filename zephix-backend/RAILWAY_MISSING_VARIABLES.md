# Missing Railway Variables - Action Required

## 🚨 CRITICAL: Add These Variables Immediately

Based on your current Railway variables, these are **missing and required**:

### 1. TOKEN_HASH_SECRET ⚠️ CRITICAL

**Status:** ❌ MISSING
**Impact:** Signup, email verification, and invite flows will **FAIL**
**Generate:**
```bash
openssl rand -hex 32
```
**Add to Railway:**
- Key: `TOKEN_HASH_SECRET`
- Value: `<64 hex characters from command above>`
- Example: `a1b2c3d4e5f6...` (64 chars total)

### 2. APP_BASE_URL

**Status:** ❌ MISSING
**Impact:** Email verification links will be broken
**Add to Railway:**
- Key: `APP_BASE_URL`
- Value: `https://getzephix.com`

### 3. API_BASE_URL

**Status:** ❌ MISSING
**Impact:** Frontend API calls may fail
**Add to Railway:**
- Key: `API_BASE_URL`
- Value: `https://zephix-backend-production.up.railway.app`

### 4. JWT_REFRESH_SECRET

**Status:** ⚠️ NOT VISIBLE (may be missing)
**Impact:** Refresh token generation will fail
**Generate:**
```bash
openssl rand -hex 32
```
**Add to Railway:**
- Key: `JWT_REFRESH_SECRET`
- Value: `<64 hex characters>`

### 5. FRONTEND_URL (Recommended)

**Status:** ❌ MISSING
**Impact:** Email service fallback URLs may be incorrect
**Add to Railway:**
- Key: `FRONTEND_URL`
- Value: `https://getzephix.com`

## Quick Add Script

Run these commands to generate secrets:

```bash
# Generate TOKEN_HASH_SECRET
echo "TOKEN_HASH_SECRET=$(openssl rand -hex 32)"

# Generate JWT_REFRESH_SECRET (if missing)
echo "JWT_REFRESH_SECRET=$(openssl rand -hex 32)"
```

Then copy the values and add them to Railway.

## Railway UI Steps

1. Go to Railway → `zephix-backend` service
2. Click **Variables** tab
3. Click **New Variable** button
4. Add each variable:
   - `TOKEN_HASH_SECRET` = `<generated 64 hex chars>`
   - `APP_BASE_URL` = `https://getzephix.com`
   - `API_BASE_URL` = `https://zephix-backend-production.up.railway.app`
   - `JWT_REFRESH_SECRET` = `<generated 64 hex chars>` (if missing)
   - `FRONTEND_URL` = `https://getzephix.com`
5. Railway will auto-redeploy
6. Check deployment logs for errors

## Verification

After adding variables, check logs for:
- ✅ No "TOKEN_HASH_SECRET is required" errors
- ✅ Application starts successfully
- ✅ Health endpoint responds: `GET /api/health`

## Current Status

✅ **Already Set:**
- INTEGRATION_ENCRYPTION_KEY
- SENDGRID_API_KEY
- SENDGRID_FROM_EMAIL
- JWT_SECRET
- DATABASE_URL
- ENABLE_TELEMETRY

❌ **Missing (Add Now):**
- TOKEN_HASH_SECRET
- APP_BASE_URL
- API_BASE_URL
- JWT_REFRESH_SECRET (verify if exists)
- FRONTEND_URL

