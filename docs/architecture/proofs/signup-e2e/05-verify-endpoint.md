# 05 — Verification Endpoint

**Verdict: EXISTS — endpoint, token format, expiry, and verification logic are all implemented**

## Endpoint

| Method | Route | Guards | Service |
|--------|-------|--------|---------|
| GET | `/api/auth/verify-email?token=...` | `RateLimiterGuard` | `EmailVerificationService.verifyToken()` |

**File**: `zephix-backend/src/modules/auth/auth.controller.ts` (line 188)

```typescript
@Get('verify-email')
@HttpCode(HttpStatus.OK)
@UseGuards(RateLimiterGuard)
async verifyEmail(@Query('token') token: string): Promise<VerifyEmailResponseDto> {
  if (!token || typeof token !== 'string') {
    throw new BadRequestException('Token query parameter is required');
  }
  const { userId } = await this.emailVerificationService.verifyToken(token);
  return { message: 'Email verified successfully', userId };
}
```

## Token Format

**File**: `zephix-backend/src/modules/auth/services/email-verification.service.ts`

| Property | Value |
|----------|-------|
| Raw token | `TokenHashUtil.generateRawToken()` — cryptographically random |
| Storage | HMAC-SHA256 hash stored in `email_verification_tokens.token_hash` |
| Expiry | 24 hours from creation |
| Single-use | `used_at` column; only tokens with `used_at IS NULL` are valid |
| Lookup | Indexed by `token_hash` (unique index) |

## Verification Flow

```
1. Client sends GET /api/auth/verify-email?token=RAW_TOKEN
2. Service computes HMAC-SHA256 hash of RAW_TOKEN
3. Looks up hash in email_verification_tokens (indexed)
4. Checks: token exists, used_at IS NULL, not expired
5. In a transaction:
   a. Sets token.used_at = now()
   b. Sets user.isEmailVerified = true
   c. Sets user.emailVerifiedAt = now()
6. Returns { message, userId }
```

## Invalidation

When a new token is created (signup or resend), all existing unused tokens for that user are invalidated:

```typescript
await this.tokenRepository.update(
  { userId, usedAt: null },
  { usedAt: new Date() },
);
```

## Resend Verification

| Method | Route | DTO |
|--------|-------|-----|
| POST | `/api/auth/resend-verification` | `ResendVerificationDto` (`email`) |

- Rate-limited
- Neutral response (no account enumeration)
- Creates new token, invalidates old ones, creates new outbox event

## Redirect After Verification

The backend returns JSON `{ message, userId }`. It does **not** redirect. The frontend is expected to handle the redirect.

Frontend has a `VerifyEmailPage.tsx` at `/auth/verify-email` that:
1. Reads `token` from query params
2. Calls `GET /api/auth/verify-email?token=...`
3. On success: shows "Email verified" message with link to login
4. On error: shows error message with "Resend verification" option

## Conclusion

Verification endpoint is fully implemented with proper token security (HMAC-SHA256 hashing, indexed lookup, single-use, 24hr expiry). The chain breaks at the email delivery step — the token is generated and stored, but the email containing the verification link is never sent because the outbox processor is disabled.
