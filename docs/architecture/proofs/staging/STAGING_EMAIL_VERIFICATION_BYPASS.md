# Staging Email Verification Bypass

## Purpose

Temporary staging-only bypass to unblock fresh-account smoke and gate automation.

## Guardrails

- Enabled only when `ZEPHIX_ENV=staging`.
- Explicit flag required: `STAGING_SKIP_EMAIL_VERIFICATION=true`.
- Hard fail on boot if the flag is enabled outside staging.
- Domain allowlist enforced through `STAGING_SKIP_EMAIL_VERIFICATION_ALLOWED_DOMAINS`.
- Default allowlist: `zephix.local`, `example.com`.
- Audit events are written when bypass is used during register/login.

## Expiry

- Expiry date: **2026-03-31**

## Removal Follow-up

- Ticket: **STG-142 Remove staging email verification bypass**
- Required completion:
  - remove bypass flag logic,
  - remove allowlist guard,
  - keep strict verification flow only.
