# Signup Email Verification Fix

## 🔍 Problem Identified

**Issue:** Users are not receiving verification emails after signup.

**Root Cause:** `SENDGRID_API_KEY` environment variable is not configured. The `EmailService` requires this key to send emails. Without it, emails are logged but never actually sent.

## ✅ Immediate Fix (Choose One Option)

### Option 1: SendGrid (Recommended for Production)

**Time:** 10 minutes

1. **Sign up for SendGrid** (Free tier: 100 emails/day)
   - Go to: https://sendgrid.com
   - Sign up with your email
   - Verify your email address

2. **Create API Key**
   - Go to Settings → API Keys
   - Click "Create API Key"
   - Name it: "Zephix Production"
   - Select "Full Access" or "Mail Send" permissions
   - Click "Create & View"
   - **Copy the API key immediately** (you won't see it again)

3. **Configure Environment Variable**

   **For Local Development:**
   ```bash
   cd zephix-backend
   echo "SENDGRID_API_KEY=your-api-key-here" >> .env
   echo "SENDGRID_FROM_EMAIL=noreply@zephix.dev" >> .env
   ```

   **For Railway (Production):**
   - Go to Railway dashboard → Your project → Variables
   - Add: `SENDGRID_API_KEY` = `your-api-key-here`
   - Add: `SENDGRID_FROM_EMAIL` = `noreply@zephix.dev`
   - Add: `FRONTEND_URL` = `https://your-frontend-domain.com`

4. **Restart Backend Service**
   ```bash
   # Local
   npm run start:dev

   # Railway - redeploy or restart service
   ```

5. **Verify Configuration**
   ```bash
   cd zephix-backend
   bash scripts/check-email-config.sh
   ```

### Option 2: Gmail SMTP (Quick Test - Not Recommended for Production)

**Time:** 15 minutes

**Note:** The current `EmailService` only supports SendGrid. To use Gmail SMTP, you would need to modify the service or use a different approach. However, for immediate testing, use SendGrid's free tier.

## 🔧 Verify the Fix

### 1. Check Environment Variables
```bash
cd zephix-backend
bash scripts/check-email-config.sh
```

Expected output:
```
✅ SENDGRID_API_KEY is set
✅ SENDGRID_FROM_EMAIL is set
```

### 2. Test Registration Flow

1. **Register a new user** via the frontend or API
2. **Check backend logs** for:
   ```
   SendGrid configured successfully
   Email sent successfully to: user@example.com
   ```

3. **Check your email inbox** (including spam folder)

### 3. Check Outbox Events (Database)

If you have database access, check for pending events:

```sql
SELECT
  id,
  type,
  status,
  attempts,
  created_at,
  payload_json->>'email' as email
FROM auth_outbox
WHERE type = 'auth.email_verification.requested'
ORDER BY created_at DESC
LIMIT 10;
```

Expected statuses:
- `pending` → Will be processed by OutboxProcessorService (runs every minute)
- `processing` → Currently being sent
- `completed` → Email sent successfully
- `failed` → Check `last_error` column for details

## 🚨 For Users Who Already Registered

If users registered before the fix, they won't have received verification emails. You have two options:

### Option A: Manual Verification (Quick Fix)

**For a specific user:**
```sql
-- Find user by email
SELECT id, email, "isEmailVerified" FROM users WHERE email = 'user@example.com';

-- Manually verify their email
UPDATE users
SET "isEmailVerified" = true,
    "emailVerifiedAt" = NOW(),
    "updatedAt" = NOW()
WHERE email = 'user@example.com';
```

### Option B: Resend Verification Email

Once SendGrid is configured, users can:
1. Go to the login page
2. Use "Resend Verification Email" feature (if available)
3. Or call the API endpoint:
   ```bash
   curl -X POST http://localhost:3000/api/auth/resend-verification \
     -H "Content-Type: application/json" \
     -d '{"email": "user@example.com"}'
   ```

## 📊 Monitoring

After fixing, monitor:

1. **Backend Logs:**
   - Look for "Email sent successfully" messages
   - Watch for SendGrid errors

2. **Outbox Events:**
   - Check that events move from `pending` → `processing` → `completed`
   - Investigate any `failed` events

3. **SendGrid Dashboard:**
   - Monitor email activity
   - Check bounce/spam reports
   - Verify sender reputation

## 🔒 Security Notes

1. **Never commit API keys** to git
2. **Use environment variables** in production
3. **Rotate API keys** periodically
4. **Monitor SendGrid usage** to avoid rate limits

## 📝 Next Steps

1. ✅ Configure SendGrid API key
2. ✅ Test registration flow
3. ✅ Verify emails are received
4. 📅 Set up proper domain email (noreply@yourdomain.com) for better deliverability
5. 📅 Configure SPF/DKIM records for your domain
6. 📅 Monitor email delivery rates

## 🆘 Troubleshooting

### Emails Still Not Sending

1. **Check SendGrid API Key:**
   ```bash
   echo $SENDGRID_API_KEY  # Should show the key
   ```

2. **Check Backend Logs:**
   - Look for "SendGrid configured successfully" on startup
   - Check for SendGrid error messages

3. **Verify Outbox Processor:**
   - Check logs for "OutboxProcessorService" messages
   - Ensure cron job is running (runs every minute)

4. **Check SendGrid Dashboard:**
   - Verify API key is active
   - Check for account issues or rate limits

### Emails Going to Spam

- This is normal with `noreply@zephix.dev` from address
- Will improve with proper domain setup and SPF/DKIM records
- For now, ask users to check spam folder

---

**Status:** ⚠️ **ACTION REQUIRED** - Configure SendGrid API key to enable email verification

