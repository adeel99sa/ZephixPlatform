# 01 — Backend Signup Endpoints

**Verdict: EXIST — 3 signup routes, 1 verify route, 1 resend route**

## Routes

| # | Method | Route | DTO | Service | File |
|---|--------|-------|-----|---------|------|
| 1 | POST | `/api/auth/register` | `RegisterDto` | `AuthRegistrationService.registerSelfServe()` | `zephix-backend/src/modules/auth/auth.controller.ts` (line 84) |
| 2 | POST | `/api/auth/signup` | `SignupDto` (alias) | Same as above | Same file |
| 3 | POST | `/api/auth/organization/signup` | `OrganizationSignupDto` | `OrganizationSignupService.signupWithOrganization()` | `zephix-backend/src/modules/auth/controllers/organization-signup.controller.ts` |
| 4 | GET | `/api/auth/verify-email?token=...` | Query `token` | `EmailVerificationService.verifyToken()` | `auth.controller.ts` (line 188) |
| 5 | POST | `/api/auth/resend-verification` | `ResendVerificationDto` | `EmailVerificationService.createToken()` | `auth.controller.ts` (line 144) |

## DTOs

| File | DTO | Fields |
|------|-----|--------|
| `dto/register.dto.ts` | `RegisterDto` | `email`, `password`, `fullName`, `orgName`, optional `orgSlug` |
| `dto/signup.dto.ts` | `SignupDto` | `email`, `password`, `firstName`, `lastName`, `organizationName` |
| `dto/organization-signup.dto.ts` | `OrganizationSignupDto` | `firstName`, `lastName`, `email`, `password`, `organizationName`, `organizationSlug`, `website`, `industry`, `organizationSize` |
| `dto/verify-email.dto.ts` | `VerifyEmailDto` | `token` |
| `dto/resend-verification.dto.ts` | `ResendVerificationDto` | `email` |

## Frontend Uses

- `SignupPage.tsx` calls `POST /api/auth/register` (route #1)
- `authStore.ts` calls `POST /api/auth/signup` (route #2)
- `OrganizationSignupPage.tsx` calls `POST /api/auth/organization/signup` (route #3)

## Conclusion

Backend signup endpoints are real and functional. Not cosmetic.
