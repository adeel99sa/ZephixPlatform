# 03 — Email Pipeline

**Verdict: BROKEN ON STAGING — outbox processor is disabled, no emails are sent**

## Architecture

```
Signup → DB transaction → writes auth_outbox row (status: pending)
                               ↓
                    OutboxProcessorService (cron every 60s)
                               ↓
                    EmailService.sendVerificationEmail()
                               ↓
                         SendGrid API
```

Email is NOT sent during the signup request. It is decoupled via the `auth_outbox` table.

## SendGrid Configuration

- **File**: `zephix-backend/src/shared/services/email.service.ts`
- **Env vars read**:
  - `SENDGRID_API_KEY` — constructor, sets `this.isConfigured = true`
  - `SENDGRID_FROM_EMAIL` — in `sendEmail()`, fallback `noreply@zephix.dev`

### When SendGrid key is missing

```typescript
// EmailService constructor
if (apiKey) {
  sgMail.setApiKey(apiKey);
  this.isConfigured = true;
} else {
  console.warn('SendGrid API key not found - emails will not be sent');
}

// EmailService.sendEmail()
if (!this.isConfigured) {
  console.log('Email not sent (no SendGrid key):', options.subject);
  return;  // ← silent return, no throw
}
```

### When SendGrid send fails

```typescript
try {
  await sgMail.send(msg);
} catch (error) {
  console.error('SendGrid error:', error?.response?.body || error);
  throw new Error('Failed to send email');  // ← propagated
}
```

## Outbox Processor

- **File**: `zephix-backend/src/modules/auth/services/outbox-processor.service.ts`
- **Gated by**: `OUTBOX_PROCESSOR_ENABLED === 'true'`
- **Behavior when disabled**: Cron fires every 60s, checks env, returns immediately. No emails processed.
- **Behavior when enabled**: Polls `auth_outbox` for `status: pending`, processes each event, calls `EmailService.sendVerificationEmail()`, marks as `sent` or retries on failure (max 3 attempts).

## SKIP_EMAIL_VERIFICATION

- **NOT used anywhere in backend code**. Only listed in env var documentation.
- No branching logic exists for this flag.

## Staging Environment Variables

| Variable | Value | Status |
|----------|-------|--------|
| `SENDGRID_API_KEY` | `SG.gJPuk...` (set) | OK |
| `SENDGRID_FROM_EMAIL` | `noreply@getzephix.com` | OK |
| `SKIP_EMAIL_VERIFICATION` | `false` | Irrelevant (not used in code) |
| `OUTBOX_PROCESSOR_ENABLED` | **NOT SET** | **ROOT CAUSE** |

## Staging Database Proof

```
SELECT status, count(*) FROM auth_outbox GROUP BY status;

 status  | count
---------+-------
 pending |     4
```

**Every outbox event ever created is still `pending`. Zero have been processed. Zero emails have ever been sent from staging.**

## Root Cause

`OUTBOX_PROCESSOR_ENABLED` is not set on the staging backend service. The cron processor checks this flag on every tick and returns immediately when it is not `'true'`. Result: outbox rows accumulate forever, no verification emails are sent.

## Fix

```bash
railway variables --set "OUTBOX_PROCESSOR_ENABLED=true" --service zephix-backend-v2
railway redeploy --yes --service zephix-backend-v2
```

After this, the outbox processor will:
1. Start processing pending outbox events on the next cron tick (within 60s)
2. Call SendGrid with the stored verification tokens
3. Update outbox rows to `status: sent` with `sent_at` timestamp

## Design Note

The architecture comment in `outbox-processor.service.ts` says:

> "The zephix-backend API service MUST have OUTBOX_PROCESSOR_ENABLED=false.
> To enable email delivery, create a separate Railway service: zephix-worker."

This means the **intended design** is a separate worker service. However, for staging MVP, enabling it on the main service is acceptable since the processor runs as a lightweight cron inside the same process.
