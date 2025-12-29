# Production Verification Checklist

After deploying to Railway with all variables set, run these checks in order.

## 1. Backend Startup Log

Check Railway deployment logs for:
- ✅ No "TOKEN_HASH_SECRET is required" errors
- ✅ No "INTEGRATION_ENCRYPTION_KEY is required" errors
- ✅ Application starts successfully
- ✅ Database connection established

## 2. Health Check

```bash
curl https://zephix-backend-production.up.railway.app/api/health
```

Expected: `200 OK` with health status

## 3. Register Flow

```bash
curl -X POST https://zephix-backend-production.up.railway.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test-'$(date +%s)'@example.com",
    "password": "SecurePass123!@#",
    "fullName": "Test User",
    "orgName": "Test Organization"
  }'
```

**Expected:**
- Status: `200 OK`
- Response: `{"message": "If an account with this email exists, you will receive a verification email."}`
- Check email inbox for verification link

## 4. Resend Flow

```bash
# Use the same email from step 3
curl -X POST https://zephix-backend-production.up.railway.app/api/auth/resend-verification \
  -H "Content-Type: application/json" \
  -d '{"email": "test-EMAIL@example.com"}'
```

**Expected:**
- Status: `200 OK`
- Response: Same neutral message (no account enumeration)

## 5. Verify Flow

1. Click verification link from email
2. Token should validate and mark email as verified
3. Try clicking the same link again

**Expected:**
- First click: Success, email verified
- Second click: `400 Bad Request` - "Invalid or expired verification token"

## 6. Invite Create Flow

### 6a. Unverified User (Should be Blocked)

```bash
# Login as unverified user
curl -X POST https://zephix-backend-production.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "unverified@example.com", "password": "SecurePass123!@#"}'

# Try to create invite
curl -X POST https://zephix-backend-production.up.railway.app/api/orgs/ORG_ID/invites \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email": "invitee@example.com", "role": "pm"}'
```

**Expected:** `403 Forbidden` - "Please verify your email address"

### 6b. Verified User (Should Succeed)

1. Verify email from step 5
2. Retry invite create

**Expected:** `200 OK` - "Invitation sent successfully"

## 7. Invite Accept Flow

### 7a. First Accept

1. Click invite link from email
2. Login if not already logged in
3. Accept invite

**Expected:**
- Status: `200 OK`
- Membership created in `user_organizations` table
- Invite marked as accepted

### 7b. Second Accept (Idempotent)

1. Click the same invite link again

**Expected:**
- Status: `200 OK`
- No duplicate membership created
- Same response as first accept

## Database Verification

Run these SQL queries on Railway database:

### Token Hash Verification

```sql
-- Verify token_hash columns are 64 chars
SELECT
  table_name,
  column_name,
  character_maximum_length
FROM information_schema.columns
WHERE table_name IN ('email_verification_tokens', 'org_invites')
  AND column_name = 'token_hash';

-- Expected: character_maximum_length = 64 for both tables
```

### Unique Indexes

```sql
-- Verify unique indexes exist on token_hash
SELECT
  indexname,
  tablename,
  indexdef
FROM pg_indexes
WHERE tablename IN ('email_verification_tokens', 'org_invites')
  AND indexname LIKE '%token_hash%';

-- Expected: Unique indexes on both tables
```

### Outbox Columns

```sql
-- Verify outbox has required columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'auth_outbox'
  AND column_name IN ('claimed_at', 'processing_started_at', 'sent_at', 'last_error');

-- Expected: All 4 columns exist
```

### Token Hash Format

```sql
-- Verify token hashes are 64 hex chars
SELECT
  id,
  LENGTH(token_hash) as hash_length,
  token_hash ~ '^[0-9a-f]{64}$' as is_valid_hex
FROM email_verification_tokens
LIMIT 5;

-- Expected: hash_length = 64, is_valid_hex = true
```

## E2E Test Verification

Run the test suite:

```bash
cd zephix-backend
npm run test:e2e:auth
```

**Expected:** All tests pass

## Success Criteria

- ✅ All API endpoints return expected status codes
- ✅ Neutral responses prevent account enumeration
- ✅ Token hashes are 64 hex chars and indexed
- ✅ Outbox processor uses SKIP LOCKED
- ✅ Verification gating blocks unverified users
- ✅ Invite acceptance is idempotent
- ✅ E2E tests pass

