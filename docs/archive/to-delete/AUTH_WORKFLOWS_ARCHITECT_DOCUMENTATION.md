# Zephix Authentication Workflows - Architect Documentation

**Document Purpose:** Comprehensive overview of Sign Up and Sign In workflows for architectural review  
**Date:** January 27, 2026  
**Version:** 1.0

---

## Table of Contents

1. [Overview](#overview)
2. [Sign Up Workflow](#sign-up-workflow)
3. [Sign In Workflow](#sign-in-workflow)
4. [Key Components & Files](#key-components--files)
5. [Security Features](#security-features)
6. [Token & Session Management](#token--session-management)
7. [API Endpoints](#api-endpoints)
8. [Data Flow Diagrams](#data-flow-diagrams)

---

## Overview

The Zephix platform implements enterprise-grade authentication with:
- **Self-serve registration** with organization creation
- **Email verification** workflow
- **Session-based authentication** with JWT tokens
- **HttpOnly cookie-based** token storage
- **Anti-enumeration** security (neutral responses)
- **Rate limiting** on sensitive endpoints

### Architecture Pattern
- **Backend:** NestJS with TypeORM
- **Frontend:** React with Context API
- **Authentication:** JWT (access + refresh tokens)
- **Storage:** HttpOnly cookies (backend) + localStorage (frontend fallback)

---

## Sign Up Workflow

### Frontend Flow

**File:** `zephix-frontend/src/pages/auth/SignupPage.tsx`

1. **User Input Collection**
   - Full Name (2-200 characters)
   - Email address (validated format)
   - Password (min 8 chars, uppercase, lowercase, number, special char)
   - Organization Name (2-80 characters)

2. **Client-Side Validation**
   ```typescript
   // Password regex validation
   /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/
   ```

3. **API Call**
   ```typescript
   POST /api/auth/register
   Body: {
     email: string,
     password: string,
     fullName: string,
     orgName: string,
     orgSlug?: string (optional)
   }
   ```

4. **Response Handling**
   - Always shows success message (neutral response)
   - Redirects to email verification page
   - No account enumeration (same response for existing/new emails)

### Backend Flow

**Controller:** `zephix-backend/src/modules/auth/auth.controller.ts`  
**Service:** `zephix-backend/src/modules/auth/services/auth-registration.service.ts`

#### Endpoint: `POST /api/auth/register` (also `/api/auth/signup` for backward compatibility)

**Rate Limiting:** 5 requests per 15 minutes

**Process:**

1. **Input Validation**
   - Email format validation
   - Password strength (min 8 chars, OWASP guidance)
   - Organization name (2-80 characters)
   - Organization slug validation (if provided) or auto-generation

2. **Transaction-Based Creation** (Atomic)
   ```typescript
   // All operations in single transaction:
   - Check if user exists (idempotency check)
   - Create Organization (with slug generation/validation)
   - Create User (with bcrypt password hashing, 12 rounds)
   - Create UserOrganization record (role: 'owner')
   - Create default Workspace
   - Create WorkspaceMember record
   - Generate email verification token (hashed)
   - Create EmailVerificationToken entity
   - Create AuthOutbox event (for email delivery)
   ```

3. **Security Features**
   - **Password Hashing:** bcrypt with 12 rounds (OWASP minimum)
   - **Token Hashing:** Verification tokens stored as HMAC-SHA256 hash only
   - **Anti-Enumeration:** Neutral response regardless of email existence
   - **Idempotency:** Duplicate registrations return neutral response
   - **Slug Collision Handling:** Auto-generates available slug with suffix

4. **Response**
   ```typescript
   {
     message: "If an account with this email exists, you will receive a verification email."
   }
   ```

5. **Error Handling**
   - **400 Bad Request:** Invalid input (password, org name, etc.)
   - **409 Conflict:** Organization slug already exists (specific error)
   - **429 Too Many Requests:** Rate limit exceeded
   - **Unique Violations:** Handles race conditions gracefully

### Key Files - Sign Up

| File | Purpose |
|------|---------|
| `zephix-frontend/src/pages/auth/SignupPage.tsx` | Sign up UI component |
| `zephix-backend/src/modules/auth/auth.controller.ts` | Registration endpoint handler |
| `zephix-backend/src/modules/auth/services/auth-registration.service.ts` | Core registration logic |
| `zephix-backend/src/modules/auth/dto/register.dto.ts` | Registration DTO validation |
| `zephix-backend/src/modules/auth/dto/signup.dto.ts` | Legacy signup DTO (backward compatibility) |

---

## Sign In Workflow

### Frontend Flow

**File:** `zephix-frontend/src/pages/auth/LoginPage.tsx`  
**Context:** `zephix-frontend/src/state/AuthContext.tsx`

1. **User Input Collection**
   - Email address
   - Password
   - Optional: Two-factor code (future)

2. **Form Submission**
   ```typescript
   await login(email, password)
   ```

3. **AuthContext Login Method**
   ```typescript
   // File: zephix-frontend/src/state/AuthContext.tsx
   const login = async (email: string, password: string) => {
     const response = await api.post("/auth/login", { email, password });
     // Backend sets HttpOnly cookies automatically
     setUser(response.user);
   }
   ```

4. **Post-Login Routing**
   - Always redirects to `/home`
   - `/home` handles workspace selection and role-based routing
   - Clears any stored `returnUrl` from localStorage

### Backend Flow

**Controller:** `zephix-backend/src/modules/auth/auth.controller.ts`  
**Service:** `zephix-backend/src/modules/auth/auth.service.ts`

#### Endpoint: `POST /api/auth/login`

**Process:**

1. **Credential Validation**
   ```typescript
   // Find user by email (case-insensitive)
   const user = await userRepository.findOne({
     where: { email: email.toLowerCase() }
   });
   
   // Verify password with bcrypt
   const isPasswordValid = await bcrypt.compare(password, user.password);
   ```

2. **Session Creation**
   ```typescript
   // Create AuthSession entity
   const session = {
     userId: user.id,
     organizationId: user.organizationId,
     userAgent: userAgent,
     ipAddress: ip,
     refreshExpiresAt: now + 7 days
   };
   ```

3. **Token Generation**
   ```typescript
   // Access Token (15 minutes in production, 7 days in dev)
   const accessToken = jwt.sign({
     sub: user.id,
     email: user.email,
     organizationId: user.organizationId,
     role: user.role,
     platformRole: normalizedRole // 'ADMIN' | 'MEMBER' | 'VIEWER'
   });
   
   // Refresh Token (7 days, includes sessionId)
   const refreshToken = jwt.sign({
     sub: user.id,
     email: user.email,
     organizationId: user.organizationId,
     sid: sessionId // Session binding
   });
   ```

4. **Cookie Setting**
   ```typescript
   // HttpOnly cookies (secure in production)
   res.cookie('zephix_refresh', refreshToken, {
     httpOnly: true,
     secure: !isLocal && isHttps,
     sameSite: 'strict',
     maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
   });
   
   res.cookie('zephix_session', accessToken, {
     httpOnly: true,
     secure: !isLocal && isHttps,
     sameSite: 'strict',
     maxAge: 15 * 60 * 1000 // 15 minutes
   });
   ```

5. **User Response Building**
   ```typescript
   // Uses buildUserResponse() helper for consistency
   {
     user: {
       id, email, firstName, lastName,
       role: 'ADMIN' | 'MEMBER' | 'VIEWER',
       platformRole: 'ADMIN' | 'MEMBER' | 'VIEWER',
       permissions: {
         isAdmin: boolean,
         canManageUsers: boolean,
         canViewProjects: boolean,
         canManageResources: boolean,
         canViewAnalytics: boolean
       },
       organizationId,
       organization: { id, name, slug, features }
     },
     accessToken,
     refreshToken,
     sessionId,
     expiresIn: 900
   }
   ```

6. **Last Login Update**
   ```typescript
   await userRepository.update(user.id, {
     lastLoginAt: new Date()
   });
   ```

### Key Files - Sign In

| File | Purpose |
|------|---------|
| `zephix-frontend/src/pages/auth/LoginPage.tsx` | Login UI component |
| `zephix-frontend/src/state/AuthContext.tsx` | Auth state management & login method |
| `zephix-backend/src/modules/auth/auth.controller.ts` | Login endpoint handler |
| `zephix-backend/src/modules/auth/auth.service.ts` | Core login logic & token generation |
| `zephix-backend/src/modules/auth/dto/login.dto.ts` | Login DTO validation |

---

## Key Components & Files

### Backend Structure

```
zephix-backend/src/modules/auth/
├── auth.controller.ts              # Main auth endpoints (register, login, logout, me, refresh)
├── auth.service.ts                 # Login logic, token generation, user response building
├── auth.module.ts                  # NestJS module configuration
├── dto/
│   ├── register.dto.ts             # Registration DTO (email, password, fullName, orgName, orgSlug)
│   ├── login.dto.ts                 # Login DTO (email, password, twoFactorCode?)
│   └── signup.dto.ts                # Legacy signup DTO (backward compatibility)
├── services/
│   ├── auth-registration.service.ts # Self-serve registration logic
│   └── email-verification.service.ts # Email verification token management
├── entities/
│   ├── auth-session.entity.ts       # Session tracking entity
│   └── email-verification-token.entity.ts # Email verification tokens
├── guards/
│   ├── jwt-auth.guard.ts           # JWT authentication guard
│   └── csrf.guard.ts                # CSRF protection guard
└── strategies/
    └── jwt.strategy.ts              # Passport JWT strategy
```

### Frontend Structure

```
zephix-frontend/src/
├── pages/auth/
│   ├── SignupPage.tsx               # Sign up UI
│   ├── LoginPage.tsx                # Login UI
│   └── VerifyEmailPage.tsx          # Email verification UI
├── state/
│   └── AuthContext.tsx              # Auth context provider & hooks
├── services/
│   └── enterpriseAuth.service.ts    # Enterprise auth service (security monitoring)
└── lib/
    └── api.ts                        # API client with interceptors
```

---

## Security Features

### Sign Up Security

1. **Password Requirements**
   - Minimum 8 characters
   - At least one uppercase letter
   - At least one lowercase letter
   - At least one number
   - At least one special character (@$!%*?&#)
   - bcrypt hashing with 12 rounds

2. **Anti-Enumeration**
   - Neutral response regardless of email existence
   - Prevents account enumeration attacks
   - Idempotent registration (duplicate attempts return same response)

3. **Rate Limiting**
   - 5 registration attempts per 15 minutes
   - Prevents brute force registration attacks

4. **Token Security**
   - Verification tokens stored as HMAC-SHA256 hashes only
   - Raw tokens only exist in outbox events (for email delivery)
   - 24-hour token expiration

5. **Transaction Safety**
   - All database operations in single transaction
   - Atomic creation (user, org, workspace, tokens)
   - Rollback on any failure

### Sign In Security

1. **Credential Validation**
   - Case-insensitive email matching
   - bcrypt password verification
   - Generic error messages (no account enumeration)

2. **Session Management**
   - Server-side session tracking (AuthSession entity)
   - Session binding in refresh tokens
   - Session revocation on logout

3. **Token Security**
   - HttpOnly cookies (prevents XSS)
   - Secure flag in production (HTTPS only)
   - SameSite: strict (prevents CSRF)
   - Short-lived access tokens (15 minutes)
   - Long-lived refresh tokens (7 days) with rotation

4. **Security Monitoring**
   - IP address tracking
   - User agent tracking
   - Last login timestamp
   - Security event logging

---

## Token & Session Management

### Token Types

1. **Access Token (JWT)**
   - **Lifetime:** 15 minutes (production), 7 days (development)
   - **Storage:** HttpOnly cookie (`zephix_session`)
   - **Payload:**
     ```typescript
     {
       sub: string,              // User ID
       email: string,
       organizationId: string,
       role: string,             // Legacy role
       platformRole: string,    // 'ADMIN' | 'MEMBER' | 'VIEWER'
       iat: number,
       exp: number
     }
     ```

2. **Refresh Token (JWT)**
   - **Lifetime:** 7 days
   - **Storage:** HttpOnly cookie (`zephix_refresh`)
   - **Payload:**
     ```typescript
     {
       sub: string,              // User ID
       email: string,
       organizationId: string,
       sid: string,              // Session ID (binds to AuthSession)
       iat: number,
       exp: number
     }
     ```
   - **Rotation:** New refresh token issued on each refresh

3. **Email Verification Token**
   - **Lifetime:** 24 hours
   - **Storage:** Database (hashed only)
   - **Format:** HMAC-SHA256 hash
   - **Single-use:** Deleted after verification

### Session Management

**Entity:** `AuthSession`

```typescript
{
  id: string,
  userId: string,
  organizationId: string,
  userAgent: string | null,
  ipAddress: string | null,
  currentRefreshTokenHash: string | null,
  refreshExpiresAt: Date,
  lastSeenAt: Date,
  revokedAt: Date | null,
  revokeReason: string | null
}
```

**Features:**
- Server-side session tracking
- Session revocation on logout
- Last seen tracking (throttled to 5-minute intervals)
- Expiration checking
- Refresh token hash binding

### Token Refresh Flow

**Endpoint:** `POST /api/auth/refresh`

1. Extract refresh token from cookie or body
2. Verify token signature and expiration
3. Load session by `sid` from token
4. Verify session is not revoked or expired
5. Verify refresh token hash matches session
6. Generate new access token
7. Rotate refresh token (new token + hash)
8. Update session with new refresh token hash
9. Set new cookies

---

## API Endpoints

### Authentication Endpoints

| Method | Endpoint | Purpose | Auth Required | Rate Limit |
|--------|----------|---------|---------------|------------|
| POST | `/api/auth/register` | Self-serve registration | No | 5/15min |
| POST | `/api/auth/signup` | Legacy registration (alias) | No | 5/15min |
| POST | `/api/auth/login` | User login | No | - |
| POST | `/api/auth/logout` | User logout | Yes | - |
| GET | `/api/auth/me` | Get current user | Yes | - |
| POST | `/api/auth/refresh` | Refresh access token | No* | - |
| GET | `/api/auth/verify-email` | Verify email address | No | 10/hour |
| POST | `/api/auth/resend-verification` | Resend verification email | No | 3/hour |
| GET | `/api/auth/csrf` | Get CSRF token | No | - |

*Refresh endpoint validates refresh token, not access token

### Request/Response Examples

#### Register Request
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!@#",
  "fullName": "John Doe",
  "orgName": "Acme Corp",
  "orgSlug": "acme-corp" // optional
}
```

#### Register Response
```json
{
  "message": "If an account with this email exists, you will receive a verification email."
}
```

#### Login Request
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!@#"
}
```

#### Login Response
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "ADMIN",
    "platformRole": "ADMIN",
    "permissions": {
      "isAdmin": true,
      "canManageUsers": true,
      "canViewProjects": true,
      "canManageResources": true,
      "canViewAnalytics": true
    },
    "organizationId": "org-uuid",
    "organization": {
      "id": "org-uuid",
      "name": "Acme Corp",
      "slug": "acme-corp",
      "features": {}
    }
  },
  "accessToken": "jwt-token",
  "refreshToken": "jwt-refresh-token",
  "sessionId": "session-uuid",
  "expiresIn": 900
}
```

**Note:** Tokens are also set as HttpOnly cookies:
- `zephix_session` (access token)
- `zephix_refresh` (refresh token)

---

## Data Flow Diagrams

### Sign Up Flow

```
User → SignupPage
  ↓
Client Validation (email, password, name, org)
  ↓
POST /api/auth/register
  ↓
AuthController.register()
  ↓
AuthRegistrationService.registerSelfServe()
  ↓
[Transaction Start]
  ├─ Check user exists (idempotency)
  ├─ Generate/validate org slug
  ├─ Create Organization
  ├─ Hash password (bcrypt, 12 rounds)
  ├─ Create User
  ├─ Create UserOrganization (role: owner)
  ├─ Create default Workspace
  ├─ Create WorkspaceMember
  ├─ Generate verification token (hash)
  ├─ Create EmailVerificationToken
  └─ Create AuthOutbox event
[Transaction Commit]
  ↓
Return neutral response
  ↓
Frontend shows success message
  ↓
Outbox processor sends verification email
```

### Sign In Flow

```
User → LoginPage
  ↓
Enter credentials (email, password)
  ↓
POST /api/auth/login
  ↓
AuthController.login()
  ↓
AuthService.login()
  ├─ Find user by email
  ├─ Verify password (bcrypt.compare)
  ├─ Update lastLoginAt
  ├─ Generate access token (JWT)
  ├─ Create AuthSession
  ├─ Generate refresh token (JWT with sessionId)
  ├─ Hash refresh token
  ├─ Update session with token hash
  ├─ Load UserOrganization role
  ├─ Load Organization
  └─ Build user response
  ↓
Set HttpOnly cookies
  ├─ zephix_session (access token)
  └─ zephix_refresh (refresh token)
  ↓
Return user data + tokens
  ↓
AuthContext updates state
  ↓
Redirect to /home
```

### Token Refresh Flow

```
Client (token expired)
  ↓
POST /api/auth/refresh
  ├─ Cookie: zephix_refresh
  └─ Body: { refreshToken, sessionId? }
  ↓
AuthController.refreshToken()
  ↓
AuthService.refreshToken()
  ├─ Verify refresh token signature
  ├─ Extract sessionId from token
  ├─ Load AuthSession by sessionId
  ├─ Verify session not revoked/expired
  ├─ Verify token hash matches session
  ├─ Generate new access token
  ├─ Rotate refresh token (new token)
  ├─ Hash new refresh token
  └─ Update session (token hash, lastSeen)
  ↓
Set new HttpOnly cookies
  ↓
Return new tokens
```

---

## Role & Permission System

### Role Hierarchy

1. **Database Layer**
   - `UserOrganization.role`: `'owner' | 'admin' | 'pm' | 'viewer'`
   - `User.role`: Legacy string (fallback)

2. **API Layer (Normalized)**
   - `role`: `'ADMIN' | 'MEMBER' | 'VIEWER'`
   - `platformRole`: Same as `role` (explicit field)

3. **Role Mapping**
   ```typescript
   'owner' | 'admin' → 'ADMIN'
   'pm' | 'member' → 'MEMBER'
   'viewer' → 'VIEWER'
   ```

### Permission Calculation

```typescript
permissions = {
  isAdmin: (orgRole === 'admin' || orgRole === 'owner'),
  canManageUsers: isAdmin,
  canViewProjects: true, // All authenticated users
  canManageResources: (platformRole === 'ADMIN' || platformRole === 'MEMBER'),
  canViewAnalytics: true // All authenticated users
}
```

---

## Error Handling

### Sign Up Errors

| Status | Error | Cause |
|--------|-------|-------|
| 400 | Password validation failed | Password doesn't meet requirements |
| 400 | Organization name invalid | Name length < 2 or > 80 chars |
| 400 | Slug validation failed | Invalid slug format |
| 409 | Organization slug exists | Slug already taken |
| 429 | Too many requests | Rate limit exceeded |

**Note:** Email existence never revealed (neutral response always returned)

### Sign In Errors

| Status | Error | Cause |
|--------|-------|-------|
| 401 | Invalid credentials | Email/password incorrect |
| 401 | User not found | Email doesn't exist |
| 401 | Account inactive | User account disabled |

**Note:** Generic error messages prevent account enumeration

---

## Configuration & Environment Variables

### Backend Environment Variables

```bash
# JWT Configuration
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret-key
JWT_EXPIRES_IN=15m  # Production: 15m, Development: 7d

# Database
DATABASE_URL=postgresql://...

# Security
NODE_ENV=production|development
```

### Frontend Environment Variables

```bash
# API Base URL
VITE_API_URL=http://localhost:3000/api

# Strict JWT Validation (optional)
VITE_STRICT_JWT=true
```

---

## Testing Considerations

### Sign Up Testing

1. **Valid Registration**
   - All fields valid
   - Organization created
   - User created with correct role
   - Workspace created
   - Verification email sent

2. **Duplicate Email**
   - Returns neutral response
   - No account enumeration

3. **Invalid Input**
   - Password too weak
   - Email format invalid
   - Organization name too short/long

4. **Slug Collision**
   - Auto-generates available slug
   - Handles race conditions

### Sign In Testing

1. **Valid Credentials**
   - Returns user data
   - Sets cookies
   - Creates session

2. **Invalid Credentials**
   - Generic error message
   - No account enumeration

3. **Token Refresh**
   - Valid refresh token
   - Session validation
   - Token rotation

---

## Future Enhancements

1. **Two-Factor Authentication (2FA)**
   - TOTP support
   - SMS backup codes
   - Recovery codes

2. **Social Authentication**
   - OAuth providers (Google, GitHub, etc.)
   - Account linking

3. **Password Reset**
   - Forgot password flow
   - Secure token-based reset

4. **Account Lockout**
   - Brute force protection
   - Temporary lockout after failed attempts

5. **Session Management UI**
   - View active sessions
   - Revoke sessions
   - Device management

---

## Summary

The Zephix authentication system implements:

✅ **Enterprise-grade security** with OWASP ASVS Level 1 compliance  
✅ **Self-serve registration** with organization creation  
✅ **Email verification** workflow  
✅ **Session-based authentication** with JWT tokens  
✅ **HttpOnly cookie storage** for token security  
✅ **Anti-enumeration** protection  
✅ **Rate limiting** on sensitive endpoints  
✅ **Role-based access control** with normalized permissions  
✅ **Transaction safety** for atomic operations  

**Key Design Decisions:**
- Neutral responses prevent account enumeration
- HttpOnly cookies prevent XSS token theft
- Server-side sessions enable revocation
- Token rotation on refresh enhances security
- Transaction-based registration ensures data consistency

---

**Document End**
