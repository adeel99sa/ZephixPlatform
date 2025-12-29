# Production Validation Checklist

Run these checks in order after deploying with all variables set.

## ✅ Pre-Check: Railway Variables

Verify these are set in `zephix-backend` service:

- [x] `TOKEN_HASH_SECRET` - ✅ SET (visible in your list)
- [x] `INTEGRATION_ENCRYPTION_KEY` - ✅ SET
- [x] `APP_BASE_URL` - ✅ SET
- [x] `API_BASE_URL` - ✅ SET
- [x] `FRONTEND_URL` - ✅ SET
- [x] `SENDGRID_API_KEY` - ✅ SET
- [x] `SENDGRID_FROM_EMAIL` - ✅ SET
- [x] `JWT_SECRET` - ✅ SET
- [ ] `JWT_REFRESH_SECRET` - ⚠️ **NOT VISIBLE** (check if exists, add if missing)

## 1. Backend Health Check

### Health Endpoint
```bash
curl https://zephix-backend-production.up.railway.app/api/health
```

**Expected:**
- Status: `200 OK`
- Response: `{"status": "healthy"}` or similar

### Swagger Docs
Open in browser:
```
https://zephix-backend-production.up.railway.app/api/docs
```

**Expected:**
- Swagger UI loads
- All endpoints visible
- `/api/auth/register`, `/api/auth/verify-email`, `/api/orgs/:orgId/invites` visible

## 2. Frontend Validation

### Homepage Load
1. Open: `https://getzephix.com`
2. Hard refresh twice (Cmd+Shift+R / Ctrl+Shift+R)
3. Check browser console for errors

**Expected:**
- ✅ Page loads (no blank page)
- ✅ No redirect loops
- ✅ No console errors
- ✅ API calls visible in Network tab

## 3. CORS and API Connectivity

### Browser DevTools Check
1. Open `https://getzephix.com`
2. Open DevTools → Network tab
3. Reload page
4. Filter by "Fetch/XHR"

**Expected:**
- ✅ API calls go to `zephix-backend-production.up.railway.app`
- ✅ No CORS errors in console
- ✅ Requests return `200` or `401` (not `403 CORS`)

### Test CORS Directly
```bash
curl -X OPTIONS https://zephix-backend-production.up.railway.app/api/auth/register \
  -H "Origin: https://getzephix.com" \
  -H "Access-Control-Request-Method: POST" \
  -v
```

**Expected:**
- Status: `200` or `204`
- Headers include: `Access-Control-Allow-Origin: https://getzephix.com`

## 4. Railway Guardrails

### Frontend Settings
**Service:** `zephix-frontend`
**Settings → Deploy**

- [ ] **Custom Start Command:** Should be **EMPTY** (use Nixpacks auto-detect)
- [ ] **Root Directory:** `zephix-frontend`
- [ ] **Build Command:** (auto-detected)
- [ ] **Start Command:** (auto-detected, should be `npm run preview`)

### Backend Variables
**Service:** `zephix-backend`
**Variables tab**

Verify all required variables are set (see Pre-Check above).

## 5. Post-Deploy Smoke Tests

### Test 1: Unauthenticated /auth/me
```bash
curl https://zephix-backend-production.up.railway.app/api/auth/me
```

**Expected:**
- Status: `401 Unauthorized`
- Response: `{"statusCode": 401, "message": "Unauthorized"}`

### Test 2: Sign In Flow
```bash
# Register (if needed)
curl -X POST https://zephix-backend-production.up.railway.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test-'$(date +%s)'@example.com",
    "password": "SecurePass123!@#",
    "fullName": "Test User",
    "orgName": "Test Org"
  }'

# Login
curl -X POST https://zephix-backend-production.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "YOUR_EMAIL",
    "password": "YOUR_PASSWORD"
  }'
```

**Expected:**
- Status: `200 OK`
- Response includes: `accessToken`, `refreshToken`, `user` object
- `user.emailVerified` field present

### Test 3: Authenticated /auth/me
```bash
curl https://zephix-backend-production.up.railway.app/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Expected:**
- Status: `200 OK`
- Response includes: `user` object with `emailVerified: boolean`
- No password field in response

### Test 4: Create Org Invite (Requires Verified Email)

**If email verification gating is enabled:**

1. First verify your email:
   ```bash
   # Get token from email, then:
   curl -X POST https://zephix-backend-production.up.railway.app/api/auth/verify-email \
     -H "Content-Type: application/json" \
     -d '{"token": "TOKEN_FROM_EMAIL"}'
   ```

2. Then create invite:
   ```bash
   curl -X POST https://zephix-backend-production.up.railway.app/api/orgs/YOUR_ORG_ID/invites \
     -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "email": "invitee@example.com",
       "role": "pm"
     }'
   ```

**Expected:**
- If unverified: `403 Forbidden` - "Please verify your email address"
- If verified: `200 OK` - "Invitation sent successfully"

## 6. Database Verification

Run these SQL queries on Railway database:

```sql
-- Verify token_hash columns are 64 chars
SELECT
  table_name,
  column_name,
  character_maximum_length
FROM information_schema.columns
WHERE table_name IN ('email_verification_tokens', 'org_invites')
  AND column_name = 'token_hash';

-- Expected: Both show character_maximum_length = 64

-- Verify unique indexes exist
SELECT
  indexname,
  tablename,
  indexdef
FROM pg_indexes
WHERE tablename IN ('email_verification_tokens', 'org_invites')
  AND indexname LIKE '%token_hash%';

-- Expected: 2 unique indexes

-- Verify outbox columns exist
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'auth_outbox'
  AND column_name IN ('claimed_at', 'processing_started_at', 'sent_at', 'last_error');

-- Expected: 4 rows returned

-- Check token hash format (should be 64 hex chars)
SELECT
  id,
  LENGTH(token_hash) as hash_length,
  token_hash ~ '^[0-9a-f]{64}$' as is_valid_hex
FROM email_verification_tokens
LIMIT 5;

-- Expected: hash_length = 64, is_valid_hex = true
```

## 7. Log Analysis

After hitting the site, check Railway logs for:

### Backend Logs (First 30 lines)
Look for:
- ✅ No "TOKEN_HASH_SECRET is required" errors
- ✅ No "JWT_REFRESH_SECRET" errors
- ✅ Application started successfully
- ✅ Database connection established
- ✅ Outbox processor started (cron job)

### Frontend Logs (First 30 lines)
Look for:
- ✅ Build completed successfully
- ✅ Server started on port $PORT
- ✅ No missing environment variable errors

## 8. Email Delivery Test

### Register New User
```bash
curl -X POST https://zephix-backend-production.up.railway.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "email-test-'$(date +%s)'@example.com",
    "password": "SecurePass123!@#",
    "fullName": "Email Test",
    "orgName": "Email Test Org"
  }'
```

**Expected:**
- Status: `200 OK`
- Check email inbox (including spam)
- Verification email received within 1-2 minutes
- Email contains verification link with token

### Check Outbox Processing
```sql
-- Check outbox events
SELECT
  type,
  status,
  attempts,
  created_at,
  processed_at,
  last_error
FROM auth_outbox
ORDER BY created_at DESC
LIMIT 10;

-- Expected: Events move from 'pending' → 'processing' → 'completed'
-- No events stuck in 'failed' status
```

## Success Criteria

- ✅ All health checks pass
- ✅ Frontend loads without errors
- ✅ CORS configured correctly
- ✅ All required variables set
- ✅ Authentication flows work
- ✅ Email verification works
- ✅ Invite creation gated by verification
- ✅ Database schema correct
- ✅ Token hashes are 64 hex chars
- ✅ Outbox processing works

## Troubleshooting

### If health check fails:
- Check Railway deployment logs
- Verify DATABASE_URL is set
- Check for missing required variables

### If CORS errors:
- Verify `CORS_ALLOWED_ORIGINS` includes `https://getzephix.com`
- Check backend CORS configuration

### If email not received:
- Check SendGrid API key is valid
- Verify `SENDGRID_FROM_EMAIL` is verified in SendGrid
- Check outbox table for processing status
- Check spam folder

### If token verification fails:
- Verify `TOKEN_HASH_SECRET` is set correctly
- Check token hash format in database (should be 64 hex chars)
- Verify token hasn't expired

