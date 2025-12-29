# Railway Variables Checklist - Production Environment

## ⚠️ CRITICAL: Set these variables in Railway before deploying

### Step 1: Generate Secrets

```bash
# Generate TOKEN_HASH_SECRET (64 hex chars)
openssl rand -hex 32

# Generate INTEGRATION_ENCRYPTION_KEY (32+ chars, base64)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Step 2: Set Variables in Railway

**Service:** `zephix-backend`
**Environment:** `production`

#### Required Variables

| Variable | Value | Notes |
|----------|-------|-------|
| `TOKEN_HASH_SECRET` | `<64 hex chars from openssl>` | **CRITICAL** - Must be 32+ chars |
| `INTEGRATION_ENCRYPTION_KEY` | `<base64 from node>` | **CRITICAL** - Must be 32+ chars |
| `APP_BASE_URL` | `https://getzephix.com` | Frontend URL for email links |
| `API_BASE_URL` | `https://zephix-backend-production.up.railway.app` | Backend API URL |
| `SENDGRID_API_KEY` | `<your-sendgrid-key>` | Email delivery |
| `SENDGRID_FROM_EMAIL` | `noreply@getzephix.com` | Verified SendGrid sender |

#### Recommended Variables

| Variable | Value | Notes |
|----------|-------|-------|
| `ENABLE_TELEMETRY` | `false` | Disable telemetry |
| `DEMO_BOOTSTRAP` | `false` | Disable demo data |

#### Existing Variables (Verify)

| Variable | Expected Value | Notes |
|----------|----------------|-------|
| `DATABASE_URL` | `<railway-provided>` | Auto-set by Railway |
| `JWT_SECRET` | `<existing>` | Should already exist |
| `JWT_REFRESH_SECRET` | `<existing>` | Should already exist |
| `NODE_ENV` | `production` | Should be set |

### Step 3: Verify Variables

After setting variables, check Railway logs for:
- ✅ No "TOKEN_HASH_SECRET is required" errors
- ✅ No "INTEGRATION_ENCRYPTION_KEY is required" errors
- ✅ Application starts successfully

### Step 4: Redeploy

Railway will automatically redeploy after variable changes. Monitor the deployment logs.

## Production Verification Steps

After deployment, run these checks:

1. **Health Check**
   ```bash
   curl https://zephix-backend-production.up.railway.app/api/health
   ```

2. **Register Flow**
   - Submit signup with new email
   - Response must be neutral 200 success

3. **Resend Flow**
   - Resend verification for same email
   - Response must be neutral 200 success

4. **Verify Flow**
   - Use token from email
   - Token must validate once
   - Second use must fail

5. **Invite Create Flow**
   - Try invite create while unverified → Must be 403
   - Verify email → Retry invite create → Must succeed

6. **Invite Accept Flow**
   - Accept once → Creates membership
   - Accept again → Returns 200 success, no duplicate

## Database Verification

Run these SQL queries on Railway database:

```sql
-- Verify token_hash columns are 64 chars
SELECT
  column_name,
  character_maximum_length
FROM information_schema.columns
WHERE table_name IN ('email_verification_tokens', 'org_invites')
  AND column_name = 'token_hash';

-- Verify unique indexes exist
SELECT
  indexname,
  tablename
FROM pg_indexes
WHERE tablename IN ('email_verification_tokens', 'org_invites')
  AND indexname LIKE '%token_hash%';

-- Verify outbox columns exist
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'auth_outbox'
  AND column_name IN ('claimed_at', 'processing_started_at', 'sent_at', 'last_error');
```

## Security Notes

- **Never commit secrets to git**
- **Rotate secrets periodically**
- **Use different secrets for each environment**
- **Store secrets in Railway's secure variable system only**

