# 04 — Database Effects on Signup

**Verdict: WRITES HAPPEN — all 7 tables written in a single transaction**

## Service Method

`AuthRegistrationService.registerSelfServe()`
- **File**: `zephix-backend/src/modules/auth/services/auth-registration.service.ts`
- **Lines**: 69–257

## Tables Written (in order, single transaction)

| Order | Table | What is Written |
|-------|-------|----------------|
| 1 | `organizations` | New org with `name`, auto-generated `slug`, `status: 'trial'`, default `settings` |
| 2 | `users` | New user with `email`, bcrypt-hashed `password`, `firstName`, `lastName`, `organizationId`, `isEmailVerified: false`, `role: 'admin'`, `isActive: true` |
| 3 | `user_organizations` | Join row linking user to organization |
| 4 | `workspaces` | Default workspace for the new org |
| 5 | `workspace_members` | User added as workspace member |
| 6 | `email_verification_tokens` | Hashed token (HMAC-SHA256), 24hr expiry, IP, user-agent |
| 7 | `auth_outbox` | Event `auth.email_verification.requested` with `status: pending`, payload containing raw token and user email |

## Transaction Boundaries

- **All 7 writes** inside a single `this.dataSource.transaction(async (manager) => { ... })`
- If **any** write fails, the entire transaction rolls back — no partial state
- Email is NOT sent inside the transaction (decoupled via outbox)

## Rollback Conditions

| Condition | Behavior |
|-----------|----------|
| Duplicate email (unique violation 23505 on users) | Rollback, return neutral "If an account exists..." message (no enumeration) |
| Duplicate org slug/name | Rollback, throw `ConflictException` (409) |
| Any other error | Rollback, re-throw |
| Email send failure | **Does not affect signup** — email is processed asynchronously via outbox |

## User Entity Fields Set at Creation

```typescript
userRepo.create({
  email: normalizedEmail,
  password: bcryptHash,      // 12 rounds
  firstName,
  lastName,
  organizationId: savedOrg.id,
  isEmailVerified: false,
  emailVerifiedAt: null,
  role: 'admin',
  isActive: true,
})
```

## Staging Proof (curl test)

```
POST /api/auth/register → HTTP 200

users:                    1 row  (is_email_verified: false)
organizations:            1 row  (slug auto-generated)
email_verification_tokens: 1 row (expires_at: +24h)
auth_outbox:              1 row  (status: pending, attempts: 0, sent_at: null)
```

All 4 queries returned correct data. Transaction committed successfully. Data was subsequently cleaned up.

## Conclusion

Database writes are real and transactional. Signup creates all required rows. The issue is downstream — the outbox processor never picks up the pending events to send emails.
