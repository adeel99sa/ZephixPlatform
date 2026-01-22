# Email Verification End-to-End Workflow

## Current Status

**User:** `adeel99sa@yahoo.com`  
**Email Verified:** ✅ Yes (already verified)  
**Email Received:** ❌ No (SendGrid not configured)

## Workflow Overview

### 1. User Signup (`POST /api/auth/register`)

**File:** `zephix-backend/src/modules/auth/services/auth-registration.service.ts`

**What happens:**
1. User provides: email, password, fullName, orgName
2. System creates:
   - User record with `isEmailVerified: false`
   - Organization
   - Default workspace
   - Email verification token (hashed, stored in DB)
   - **Outbox event** (`auth.email_verification.requested`) with raw token

**Key Code:**
```typescript
// Create outbox event for email delivery
const outboxEvent = outboxRepo.create({
  type: 'auth.email_verification.requested',
  payloadJson: {
    userId: savedUser.id,
    email: normalizedEmail,
    token: rawToken, // Only in outbox, never in DB
    fullName,
    orgName,
  },
  status: 'pending',
  attempts: 0,
});
await outboxRepo.save(outboxEvent);
```

**Response:** Generic message (no account enumeration):
```json
{
  "message": "If an account with this email exists, you will receive a verification email."
}
```

### 2. Outbox Processing (Background Job)

**File:** `zephix-backend/src/modules/auth/services/outbox-processor.service.ts`

**What happens:**
1. Cron job runs every minute (`@Cron(CronExpression.EVERY_MINUTE)`)
2. Fetches pending outbox events with `SKIP LOCKED` (safe for multi-replica)
3. For `auth.email_verification.requested` events:
   - Calls `handleEmailVerificationRequested()`
   - Extracts token from `payloadJson`
   - Builds verification URL: `${FRONTEND_URL}/verify-email?token=${token}`
   - Calls `emailService.sendVerificationEmail()`

**Key Code:**
```typescript
@Cron(CronExpression.EVERY_MINUTE)
async processOutbox(): Promise<void> {
  // Fetches pending events, processes them, marks as completed/failed
}
```

### 3. Email Sending

**File:** `zephix-backend/src/shared/services/email.service.ts`

**What happens:**
1. Checks if `SENDGRID_API_KEY` is configured
2. If **NOT configured:**
   - Logs: `"Email not sent (no SendGrid key): [subject]"`
   - **Returns without sending** (silent failure)
3. If configured:
   - Sends email via SendGrid API
   - Includes verification link: `/verify-email?token=...`

**Key Code:**
```typescript
async sendEmail(options: {...}): Promise<void> {
  if (!this.isConfigured) {
    console.log('Email not sent (no SendGrid key):', options.subject);
    return; // Silent failure
  }
  // ... SendGrid API call
}
```

### 4. Email Verification (`GET /api/auth/verify-email?token=...`)

**File:** `zephix-backend/src/modules/auth/auth.controller.ts`

**What happens:**
1. User clicks link in email (or manually visits URL)
2. Backend receives token
3. Hashes token and looks up in `email_verification_tokens` table
4. If valid:
   - Marks token as used
   - Sets `isEmailVerified = true`
   - Sets `emailVerifiedAt = NOW()`
5. Returns success message

**Key Code:**
```typescript
@Get('verify-email')
async verifyEmail(@Query('token') token: string) {
  const { userId } = await this.emailVerificationService.verifyToken(token);
  return { message: 'Email verified successfully', userId };
}
```

## Why Emails Aren't Being Sent

### Root Cause

**`SENDGRID_API_KEY` environment variable is NOT configured.**

**Evidence:**
- Email service logs: `"SendGrid API key not found - emails will not be sent"`
- Outbox events are created but emails never sent
- User's email was manually verified (likely via script or direct DB update)

### Current State

1. ✅ User account created
2. ✅ Outbox event created (`auth.email_verification.requested`)
3. ✅ Email verification token generated
4. ❌ **Email NOT sent** (SendGrid not configured)
5. ✅ Email manually verified (user can log in)

## Solutions

### Option 1: Configure SendGrid (For Production)

**Steps:**
1. Sign up at https://sendgrid.com (Free: 100 emails/day)
2. Create API Key: Settings → API Keys → Create API Key
3. Add to `.env`:
   ```bash
   SENDGRID_API_KEY=your-api-key-here
   SENDGRID_FROM_EMAIL=noreply@zephix.dev
   FRONTEND_URL=http://localhost:5173
   ```
4. Restart backend
5. Outbox processor will send pending emails on next cron run

### Option 2: Skip Email Verification in Development

**Modify:** `zephix-backend/src/modules/auth/services/auth-registration.service.ts`

**Change:**
```typescript
// Create user (email not verified yet)
const user = userRepo.create({
  // ...
  isEmailVerified: process.env.NODE_ENV === 'development' ? true : false,
  emailVerifiedAt: process.env.NODE_ENV === 'development' ? new Date() : null,
  // ...
});
```

**Pros:** Users can log in immediately in dev  
**Cons:** Bypasses security check, only for local dev

### Option 3: Manual Verification Script (Current Solution)

**Script:** `zephix-backend/scripts/verify-user-email.js`

**Usage:**
```bash
cd zephix-backend
node scripts/verify-user-email.js user@example.com
```

**What it does:**
- Sets `is_email_verified = true`
- Sets `email_verified_at = NOW()`
- Allows immediate login

## Verification Endpoints

### 1. Verify Email (GET)
```
GET /api/auth/verify-email?token={verification_token}
```

**Response:**
```json
{
  "message": "Email verified successfully",
  "userId": "uuid"
}
```

### 2. Resend Verification (POST)
```
POST /api/auth/resend-verification
Authorization: Bearer {token}
```

**Response:**
```json
{
  "message": "Verification email sent"
}
```

## Database Tables

### `auth_outbox`
- Stores email delivery events
- Status: `pending` → `processing` → `completed` / `failed`
- Retries up to 3 times with exponential backoff

### `email_verification_tokens`
- Stores **hashed** tokens only (never plain text)
- Links to `users.id`
- Expires after 24 hours
- Marked as `usedAt` after verification

### `users`
- `is_email_verified`: boolean (default: false)
- `email_verified_at`: timestamp (nullable)

## Testing the Workflow

### 1. Check Outbox Events
```sql
SELECT id, type, status, attempts, error_message, created_at
FROM auth_outbox
WHERE type = 'auth.email_verification.requested'
ORDER BY created_at DESC
LIMIT 10;
```

### 2. Check Verification Tokens
```sql
SELECT id, user_id, expires_at, used_at, created_at
FROM email_verification_tokens
WHERE user_id = (SELECT id FROM users WHERE email = 'user@example.com')
ORDER BY created_at DESC;
```

### 3. Check User Status
```sql
SELECT email, is_email_verified, email_verified_at, created_at
FROM users
WHERE email = 'user@example.com';
```

## Recommendations

1. **For Local Development:**
   - Use Option 2 (skip verification) OR
   - Use Option 3 (manual verification script)

2. **For Production:**
   - **Must** configure SendGrid (Option 1)
   - Monitor outbox events for failures
   - Set up alerts for failed email deliveries

3. **For Testing:**
   - Mock email service in tests
   - Verify outbox events are created
   - Test verification endpoint with valid/invalid tokens

## Related Files

- `zephix-backend/src/modules/auth/services/auth-registration.service.ts` - Signup logic
- `zephix-backend/src/modules/auth/services/outbox-processor.service.ts` - Email processing
- `zephix-backend/src/shared/services/email.service.ts` - SendGrid integration
- `zephix-backend/src/modules/auth/auth.controller.ts` - Verification endpoint
- `zephix-backend/scripts/verify-user-email.js` - Manual verification script
