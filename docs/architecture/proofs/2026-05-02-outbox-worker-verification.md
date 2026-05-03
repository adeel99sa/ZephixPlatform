# Outbox Worker Verification — 2026-05-02

**PR:** Engine 1 PR #7  
**Status:** PARTIAL — processor functions mechanically, delivery broken (SendGrid), error now preserved  
**Executor:** Claude (Solution Architect)

---

## Code Path Inventory

### Writers (4 sites)
| Writer | File | Event Type | Trigger |
|--------|------|-----------|---------|
| Email Verification | `auth/services/email-verification.service.ts` | `auth.email_verification.requested` | User signup, email change |
| Registration | `auth/services/auth-registration.service.ts` | `auth.email_verification.requested` | Self-serve signup |
| Org Invites | `auth/services/org-invites.service.ts` | `auth.invite.created` | Admin invites user |
| Google OAuth | `auth/auth.service.ts` | `auth.email_verification.requested` | Google OAuth signup |

### Processor
- **File:** `auth/services/outbox-processor.service.ts`
- **Schedule:** `@Cron(EVERY_MINUTE)`
- **Batch size:** 25 rows per cycle
- **Retry:** 3 attempts with exponential backoff (5min, 30min, 2h)
- **Concurrency:** `FOR UPDATE SKIP LOCKED` + `isProcessing` flag
- **Gate:** `OUTBOX_PROCESSOR_ENABLED=true` (env var)

### Entity
- **Table:** `auth_outbox`
- **Statuses:** pending → processing → completed | failed
- **Indexes:** status, next_attempt_at, type + 2 composite indexes (migration 1796000000001)

---

## Staging Evidence

```
SELECT status, COUNT(*) FROM auth_outbox GROUP BY status;
  failed | 118
  (0 completed, 0 pending)

SELECT type, status, attempts, error_message, created_at::date
FROM auth_outbox ORDER BY created_at DESC LIMIT 5;
  auth.invite.created              | failed | 3 | Failed to send email | 2026-04-14
  auth.invite.created              | failed | 3 | Failed to send email | 2026-04-14
  auth.email_verification.requested | failed | 3 | Failed to send email | 2026-03-29
```

**Date range:** 2026-02-15 to 2026-04-14 (118 rows, all failed after 3 retries)

**Environment:**
- `OUTBOX_PROCESSOR_ENABLED=true` on API service (docs say should be `false`, no separate worker exists)
- `SENDGRID_API_KEY` is set (starts with `SG.OajQs...`)
- No `zephix-worker` Railway service exists (documented in WORKER_SERVICE_SETUP.md but never created)

---

## Findings

### Finding 1: All 118 outbox emails failed — CRITICAL
Every outbox row failed all 3 retry attempts. SendGrid key is present but delivery fails. Root cause unknown because error was swallowed (see Finding 2).

### Finding 2: Error message swallowed — FIXED in this PR
`email.service.ts` line 91 threw generic `'Failed to send email'` after logging the real error to `console.error`. The outbox stored only the generic string, making remote diagnosis impossible.

**Fix applied:** Error now includes status code and original message:
```
Failed to send email: 403 — Sender identity not verified
```

### Finding 3: No separate worker service
Documentation describes `zephix-worker` Railway service but it was never created. Processor runs on API service (acceptable for current volume but not per architecture docs).

### Finding 4: No cleanup/TTL
118 permanently-failed rows sit in `auth_outbox` indefinitely. No archival, no TTL, no visibility dashboard.

---

## Recommended Follow-ups

| Priority | Action | Scope |
|----------|--------|-------|
| P0 | Trigger a test email after this PR deploys; read the REAL error from outbox | Operator action |
| P1 | Fix SendGrid sender domain verification (likely cause) | Railway/SendGrid config |
| P2 | Create `zephix-worker` Railway service per WORKER_SERVICE_SETUP.md | Infrastructure |
| P3 | Add outbox row archival for permanently-failed rows | Code change |
| P3 | Add outbox status dashboard or admin endpoint | Code change |

---

## V21 Update Text

**Section: Outbox Worker**
Status: PARTIAL — processor mechanically functional (cron, retry, SKIP LOCKED concurrency all work). Delivery broken: all 118 staging outbox rows failed with SendGrid errors. Error preservation fixed in PR #7 (real error now stored in outbox). Root cause investigation pending first preserved error message after deploy.
