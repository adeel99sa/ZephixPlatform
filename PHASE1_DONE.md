# Phase 1: Auth and Org Boundary Hardening - Completion Checklist

## Overview

Phase 1 completes the onboarding flow by making registration deterministic, secure, and fully test-covered. All org and auth flows are now idempotent and safe.

## Acceptance Criteria

### ✅ Registration API Contract

- [x] Optional `orgSlug` input on register request
- [x] `orgName` required (2-80 characters)
- [x] If `orgSlug` provided, validated and used
- [x] If `orgSlug` missing, generated from `orgName` with deterministic rules
- [x] If `orgSlug` conflict, returns 409 with message: "Organization slug already exists. Choose a different slug."
- [x] `users.email` duplicates return 200 neutral message (never 409)

### ✅ Validation Rules

- [x] `orgSlug` allowed chars: lowercase letters, numbers, hyphen
- [x] Length 3 to 48
- [x] No leading or trailing hyphen
- [x] Multiple hyphens collapsed into one
- [x] Reserved slugs blocked: admin, api, auth, www, app, zephix, support, status
- [x] `orgName` length 2 to 80

### ✅ Slug Generation Rules

- [x] Slugify `orgName` deterministically
- [x] If slug exists, append short suffix like -2, -3, based on retry loop up to N attempts
- [x] Deterministic and testable (not random)
- [x] Final slug stored on org record

### ✅ Error Handling Hardening

- [x] `QueryFailedError` driverError extraction used everywhere in registration transaction
- [x] Unique constraint violations handled by table plus key extraction from `driverError.detail`
- [x] Structured logs for registration failures with requestId and commitSha
- [x] No DB details leaked in responses

### ✅ Outbox Correctness

- [x] Registration always writes `auth_outbox` event when user created
- [x] Outbox payload has enough fields to send email verification
- [x] Repo query helper for latest outbox rows by userId (`getLatestOutboxByUserId`)

### ✅ Auth Lifecycle Endpoints

- [x] `POST /api/auth/resend-verification`
  - [x] Input email
  - [x] Response always 200 neutral
  - [x] If user exists and not verified, create outbox event
  - [x] Rate limit per email and per IP (in-memory, Redis TODO noted)
- [x] `GET /api/auth/verify-email?token=...`
  - [x] Validate token, set `users.email_verified_at`
  - [x] Token single use
  - [x] Expiration enforced

### ✅ Tests

- [x] Unit tests for slugify and validation
- [x] Unit tests for deterministic suffix behavior
- [x] Integration tests with test DB:
  - [x] Register new org and user returns 200
  - [x] Register same email different org returns 200 neutral
  - [x] Register same orgName different email returns 409 and does not 500
  - [x] Register with explicit orgSlug works
  - [x] orgSlug invalid returns 400
  - [x] resend verification returns 200 regardless
  - [x] verify email sets email_verified_at and invalidates token
  - [x] outbox row created on successful registration and resend

### ✅ Documentation

- [x] Updated docs with final API behavior for Phase 1
- [x] Release gate checklist referencing `/api/version` commitSha and 2-step smoke test

## Verification in Production

### Step 1: Verify `/api/version` Shows commitSha

```bash
curl -s https://zephix-backend-production.up.railway.app/api/version | jq .commitSha
```

**Expected:** Non-empty commit SHA (7+ character hex string)

**If missing:** Redeploy on Railway and ensure `RAILWAY_GIT_COMMIT_SHA` or `APP_COMMIT_SHA` env var is set.

### Step 2: Two-Step Smoke Test

#### Test A: New org and new email (Expected: HTTP 200)

```bash
EMAIL="test-$(date +%s)@example.com"
ORG="Test Org $(date +%s)"
curl -i -X POST https://zephix-backend-production.up.railway.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"Test123!@#\",\"fullName\":\"Test User\",\"orgName\":\"$ORG\"}"
```

**Pass Criteria:**
- ✅ HTTP 200 status code
- ✅ Response contains: `"If an account with this email exists, you will receive a verification email."`

#### Test B: Same orgName with different email (Expected: HTTP 409)

```bash
# Reuse ORG from Test A
EMAIL2="test2-$(date +%s)@example.com"
curl -i -X POST https://zephix-backend-production.up.railway.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL2\",\"password\":\"Test123!@#\",\"fullName\":\"Test User\",\"orgName\":\"$ORG\"}"
```

**Pass Criteria:**
- ✅ HTTP 409 Conflict status code
- ✅ Response message: `"Organization slug already exists. Choose a different slug."`
- ❌ NOT HTTP 500

### Step 3: Verify Email Verification Endpoint (GET)

```bash
# First, register and get token from outbox (requires DB access)
# Then test GET endpoint:
TOKEN="your-verification-token-here"
curl -i "https://zephix-backend-production.up.railway.app/api/auth/verify-email?token=$TOKEN"
```

**Pass Criteria:**
- ✅ HTTP 200 status code
- ✅ Response contains: `"Email verified successfully"`
- ✅ User's `email_verified_at` is set in database

### Step 4: Verify Resend Verification Endpoint

```bash
EMAIL="test-$(date +%s)@example.com"
curl -i -X POST https://zephix-backend-production.up.railway.app/api/auth/resend-verification \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\"}"
```

**Pass Criteria:**
- ✅ HTTP 200 status code (even for non-existent email)
- ✅ Response contains: `"If an account with this email exists, you will receive a verification email."`
- ✅ If user exists and not verified, new outbox event created

### Step 5: Verify Outbox Events Created

```bash
# Requires DB access via Railway CLI
railway run --service zephix-backend -- sh -lc 'psql "$DATABASE_URL" -c "SELECT id, type, status, created_at FROM auth_outbox WHERE type = '\''auth.email_verification.requested'\'' ORDER BY created_at DESC LIMIT 5;"'
```

**Pass Criteria:**
- ✅ Query succeeds
- ✅ Recent rows appear with `type = 'auth.email_verification.requested'`
- ✅ `status = 'pending'` for new events

## Code Changes Summary

### New Files
- `zephix-backend/src/common/utils/slug.util.ts` - Slug validation and generation utilities
- `zephix-backend/src/common/utils/slug.util.spec.ts` - Unit tests for slug utilities
- `zephix-backend/test/auth-phase1.e2e-spec.ts` - Phase 1 integration tests
- `PHASE1_DONE.md` - This checklist

### Modified Files
- `zephix-backend/src/modules/auth/dto/register.dto.ts` - Added optional `orgSlug` field
- `zephix-backend/src/modules/auth/services/auth-registration.service.ts` - Implemented slug validation, generation, and collision handling
- `zephix-backend/src/modules/auth/auth.controller.ts` - Updated to handle `orgSlug`, changed verify-email to GET
- `zephix-backend/src/modules/auth/services/email-verification.service.ts` - Added `getLatestOutboxByUserId` helper
- `zephix-backend/test/helpers/auth-test-helpers.ts` - Updated `verifyEmailWithToken` to use GET

## Test Execution

### Run Unit Tests

```bash
cd zephix-backend
npm test -- slug.util.spec.ts
```

### Run Integration Tests

```bash
cd zephix-backend
npm test -- auth-phase1.e2e-spec.ts
```

### Run All Phase 1 Tests

```bash
cd zephix-backend
npm test -- --testPathPattern="(slug.util.spec|auth-phase1.e2e-spec)"
```

## Constraints Met

- ✅ No changes to public response shape except adding required fields
- ✅ Anti-enumeration behavior maintained for email flows
- ✅ Transaction boundaries correct (no partial user creation)
- ✅ No new external services in Phase 1 (Redis TODO noted, in-memory rate limiting used)

## Known Limitations

1. **Rate Limiting**: Currently uses in-memory rate limiting. Redis-based rate limiting is planned for future phases (TODO noted in code).

2. **Slug Collision Retry**: Maximum 10 attempts for slug generation. If all attempts fail, registration will fail with error. This is acceptable for Phase 1.

3. **Outbox Processing**: Outbox events are processed asynchronously. Email delivery is not guaranteed immediately after registration (expected behavior).

## Next Steps

After Phase 1 completion:

1. Deploy to production and verify using the checklist above
2. Monitor error logs for any 500 errors related to org slug conflicts
3. Monitor outbox processing to ensure email verification emails are being sent
4. Consider Phase 2 enhancements (Redis rate limiting, enhanced monitoring, etc.)

## Sign-off

- [ ] All acceptance criteria met
- [ ] All tests passing
- [ ] Production verification completed
- [ ] Documentation updated
- [ ] Code reviewed and approved

**Phase 1 Status:** ✅ COMPLETE


