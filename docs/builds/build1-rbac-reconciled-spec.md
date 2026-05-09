# Build 1 — RBAC Reconciled Spec

**Status:** Reconciliation draft — supersedes the original Stream A "build1-rbac-spec.md" framing
**Author (Stream A):** Claude (Opus 4.7)
**Date:** 2026-05-08
**Read-only cycle output. No commits, no worktree, no migrations.**

---

## Section 0 — Recon summary

The original Stream A dispatch was written from a clean-slate mental model. Reality: the codebase has shipped **two prior RBAC cycles** (V1 stabilization + V2 cleanup, both COMPLETE per [RBAC_ROLE_SYSTEM_V1.md](../architecture/RBAC_ROLE_SYSTEM_V1.md) / [RBAC_ROLE_SYSTEM_V2_CLEANUP.md](../architecture/RBAC_ROLE_SYSTEM_V2_CLEANUP.md)) and has substantial pre-existing identity plumbing. B1 is best framed as **the next evolution beyond V2**, not as a fresh build.

**Headline findings:**

1. **`PlatformRole`** (`ADMIN | MEMBER | VIEWER`) is already the canonical org-level role enum — exactly the dispatch's `org_role`. Used in 45+ modules. Source of truth: [common/auth/platform-roles.ts](../../zephix-backend/src/common/auth/platform-roles.ts).
2. **`UserOrganization`** (`organizations/entities/user-organization.entity.ts`) is the org-membership junction table — DB enum has 4 values (`owner|admin|member|viewer`), normalized to PlatformRole at app layer (`owner` and `admin` both → `ADMIN`).
3. **`WorkspaceMember`** (`modules/workspaces/entities/workspace-member.entity.ts`) is the workspace-membership table — `workspace_owner | workspace_admin | workspace_member | workspace_viewer | delivery_owner | stakeholder` with normalization. Feature-flagged by `ZEPHIX_WS_MEMBERSHIP_V1` (already enabled on staging).
4. **AD-011 already migrated `pm` → `member`** (migration `18000000000076`) — dispatch's "ADMIN/PM legacy" framing is stale.
5. **Refresh-token rotation is already partially shipped** via `auth_sessions` table with `currentRefreshTokenHash` + `refreshExpiresAt` + `revokedAt`. Rotation works; **family detection on reuse is missing**.
6. **Password reset is mature** — hashed tokens, 1h expiry, rate-limited (3/15min), audit, post-completion session revocation. Dispatch's "new in this build" was wrong.
7. **Invitation flow already exists in two places** — duplicate surface debt: `OrgInvite` (modules/auth, hashed tokens, outbox-driven, workspace assignments) vs. `Invitation` (organizations, raw token, simpler). `OrgInvite` is more mature.
8. **MFA is the actual greenfield work.** Plaintext columns `users.two_factor_enabled` + `users.two_factor_secret` exist as dead fields — login does not enforce MFA today. **Staging shows 0 of 241 users with 2FA enabled** — clean drop-and-replace path is viable.
9. **Event bus already exists** (`auth_outbox` table + `OutboxProcessorService`, gated to a worker service). Dispatch's "stub bus" should leverage this, not introduce a new mechanism.
10. **Four admin guards exist.** Per V2, all four are semantically equivalent (`normalizePlatformRole(platformRole ?? role) === ADMIN`). [PlatformAdminGuard](../../zephix-backend/src/common/auth/platform-admin.guard.ts) is the canonical guard for new code.
11. **`/api/v1/*` rewrite middleware is shipped** ([main.ts:79-86](../../zephix-backend/src/main.ts#L79-L86)). Locked: all new B1 endpoints use `/api/v1/*`. Existing `/api/auth/*` routes continue via the rewrite.
12. **Error envelope is already standardized** — `{ code, message, ...rest }` via `ApiErrorFilter`. New code uses existing pattern, no parallel filter.

**Net:** B1 ≈ 35% greenfield (MFA wiring + last-admin guards + family rotation + grace-period state machine + AuthorizationService facade), 65% consolidation/extension (invitations, decorators, identity events into `auth_outbox`).

---

## Section 1 — Role model (definitive, post-V2)

### 1.1 Platform role (org-level)

Canonical: **`PlatformRole = ADMIN | MEMBER | VIEWER`** (3 values).

**Storage:**
- Logical source of truth: `user_organizations.role` (4 DB values: `owner|admin|member|viewer`)
- Application normalization via `normalizePlatformRole(platformRole ?? role)` collapses `owner` → `ADMIN`, `pm` → `MEMBER`, etc.
- JWT payload carries `platformRole` (canonical) + `role` (legacy fallback)

**Build 1 stance:** **Do NOT migrate the DB enum.** Keep `user_organizations.role` at 4 values. App-layer normalization is correct. Renaming `owner` → `admin` in the DB is invasive (Google OAuth path on [auth.service.ts:424](../../zephix-backend/src/modules/auth/auth.service.ts#L424) actively writes `'owner'` for solo founders, and `UserOrganization.isOwner()` is consumed by callers). Defer DB cleanup to a future "RBAC v3.5" pass.

**B1 changes:** Add **multi-admin support** explicitly to documentation and to [last-admin guards](#27-last-admin-guard) — the system already supports multiple `'admin'` rows; we now formally enforce protection of "last admin" (the only `ADMIN`-resolved row).

### 1.2 Workspace role (workspace-level)

Canonical at app layer: **`WorkspaceRole`** with normalization.

**Storage values** (DB constraint includes all):
- `workspace_owner` (legacy DB value; alias `workspace_admin` in V2)
- `workspace_admin`
- `workspace_member`
- `workspace_viewer`
- `delivery_owner` (project-scoped — NOT a workspace role substitute)
- `stakeholder` (project-scoped — same caution)

**Hierarchy:** `workspace_owner / workspace_admin (4) ≥ delivery_owner (3) ≥ workspace_member (2) ≥ workspace_viewer / stakeholder (1)`.

**Build 1 stance:** Treat `workspace_owner`/`workspace_admin` as the single high-privilege tier per V1 + V2. Do not introduce a separate "owner ≠ admin" semantic at the workspace level. Stream A's dispatch §4 enum (`'owner', 'member', 'viewer'`) was incorrect — the codebase already uses 6 storage values + normalization.

### 1.3 Project-scoped concepts (unchanged in B1)

- `Project.projectManagerId` is accountability, not RBAC. Already documented.
- `delivery_owner` / `stakeholder` are project-level membership labels. Keep on `workspace_members` rows for now. Do not promote to a separate project_members table in B1.

### 1.4 Resolution — answer to dispatch concern 3.B

**Decision: hybrid of B1 + B3.**
- **At app layer:** PlatformRole = 3 values (B1-style) — already shipped
- **At DB layer:** `user_organizations.role` keeps 4 values; future cleanup converts to 3
- **At workspace level:** `owner` is workspace-scope only (B3-style) — already shipped via `workspace_owner` / `workspace_admin` aliases
- **B1 does not migrate DB rows.** Reasoning: invasive, downstream callers depend on `'owner'` write paths, and AD-011 just finished a similar rename — chaining another would add risk without B1 value.

---

## Section 2 — Data model (entity-by-entity)

Format: **Exists today as X / Target state Y / Migration plan Z.**

### 2.1 `users` table

**Today:** [user.entity.ts](../../zephix-backend/src/modules/users/entities/user.entity.ts) has `role` (varchar, default `'user'`), `organizationId` (single-org pointer), `is_active`, `is_email_verified`, `failed_login_attempts`, `locked_until`, `two_factor_enabled` (BOOL), `two_factor_secret` (VARCHAR, **plaintext**), `password_reset_token` (inline column, alongside the separate `password_reset_tokens` table — duplicate surface).

**Target:**
- **Drop** `two_factor_secret` (plaintext) — staging has 0 enabled users (verified)
- **Drop** `two_factor_enabled` (replaced by new `mfa_enabled`)
- **Drop** inline `password_reset_token` and `password_reset_token_expires` columns (the `password_reset_tokens` table is authoritative; inline columns are dead)
- **Drop** inline `email_verification_token` and `email_verification_expires` (the `email_verification_tokens` table — implied by entity at `auth/entities/email-verification-token.entity.ts` — is authoritative)
- **Add** `mfa_enabled` (BOOL, default false)
- **Add** `mfa_secret_ciphertext` (BYTEA), `mfa_secret_iv` (BYTEA), `mfa_secret_auth_tag` (BYTEA) — encrypted via AES-256-GCM
- **Add** `mfa_grace_until` (TIMESTAMPTZ, nullable) — for the admin grace-period state machine
- Keep `failed_login_attempts` + `locked_until` (already used)

**Migration plan:** Single additive migration adds new columns. A second migration in PR2 drops the dead columns after the cutover lands. Skip a "backfill" step — no data to migrate (0 enabled, no plaintext to translate).

### 2.2 `user_organizations` table

**Today:** Junction `user_id` × `organization_id` × `role` (`owner|admin|member|viewer`) + `isActive`, `permissions` (jsonb, mostly unused), `joinedAt`, `lastAccessAt`.

**Target:** **Unchanged in B1.** This table is the source of truth for org membership.

**Migration plan:** None. Multi-admin is already supported (multiple rows with role `admin` per organization).

### 2.3 `auth_sessions` table

**Today:** Modern session/refresh-token mechanism. `userId`, `organizationId`, `currentRefreshTokenHash`, `refreshExpiresAt`, `revokedAt`, `revokeReason`, `lastSeenAt`, `userAgent`, `ipAddress`. Rotation works (`refreshToken()` swaps `currentRefreshTokenHash`).

**Target:**
- **Add** `family_id` (UUID NOT NULL DEFAULT gen_random_uuid()) — initial login generates new family
- **Add** `parent_session_id` (UUID, nullable, FK to `auth_sessions.id` ON DELETE SET NULL)
- **Add** `replaced_at` (TIMESTAMPTZ, nullable) — set when this session's refresh token is rotated
- **Add** `replaced_by_session_id` (UUID, nullable, FK to `auth_sessions.id` ON DELETE SET NULL)
- **Add** index `IDX_auth_sessions_family_id` on `family_id`

**Migration plan:** Additive only. Existing rows get `family_id = id` (each treated as its own family). `parent_session_id` and `replaced_at` are NULL for legacy rows. Reuse-detection logic in `AuthService.refreshToken()` is updated to:
1. If presented refresh token's hash matches `currentRefreshTokenHash` → rotate (current behavior)
2. If session has `replaced_at IS NOT NULL` and presented token's hash matches a **prior** session in the same family → **reuse detected**: invalidate every row where `family_id = X AND revoked_at IS NULL`, publish `auth.token_refresh_reuse_detected` event

### 2.4 `refresh_tokens` table (legacy)

**Today:** Naive schema (`token` plaintext unique, `revoked` boolean). Used as a fallback by `revokeLegacyRefreshTokensForUser` in password change/reset paths.

**Target:** **Unchanged in B1.** This table is dormant; the `auth_sessions` table is the authoritative path. Do not rename, do not drop, do not refactor — that work is "RBAC v3.5" or beyond, since it's all dead-write code (zero new tokens written here per `auth.service.ts` review).

**Migration plan:** None.

### 2.5 `org_invites` table

**Today:** [OrgInvite entity](../../zephix-backend/src/modules/auth/entities/org-invite.entity.ts) — hashed token, 7-day expiry, `role` enum, `OrgInviteWorkspaceAssignment` for workspace-scoped pre-acceptance assignments, outbox-driven email.

**Target:** **Add** `invited_workspace_id` (UUID, nullable, FK) and `invited_workspace_role` (varchar, nullable) — for workspace-scoped invitations that don't go through the org-level path. **Add** `invitation_kind` enum column (`org_member | workspace_member`) to disambiguate.

Alternatively (cleaner): keep `org_invites` for org-scoped only, **add a new `workspace_invitations` table** for workspace-scoped invites. **Recommendation: separate table** to avoid a polymorphic schema. The existing `OrgInviteWorkspaceAssignment` covers the "invite to org + assign to workspace at acceptance" case; the new table covers "invite directly to a workspace by an existing org member."

**Migration plan:** Additive — new `workspace_invitations` table with hashed token, 7-day expiry, `workspace_id`, `invited_role` (workspace_role). Keep `org_invites` untouched.

### 2.6 `invitations` table (organizations module)

**Today:** [Invitation entity](../../zephix-backend/src/organizations/entities/invitation.entity.ts) — older flow. Raw token, 72-hour expiry, status enum, no workspace assignments, no outbox.

**Target:** **Deprecate.** Leave the table in place for now (callers exist in `InvitationService`). Mark the entity with a deprecation comment. Route new code to `OrgInvitesService`. Migration to remove this table is "RBAC v3.5" cleanup (no schema migration in B1).

**Migration plan:** None in B1.

### 2.7 `password_reset_tokens` table

**Today:** Already exists (migration 75). Schema: `token_hash`, `expires_at`, `consumed`, `consumed_at`, `created_at`. AuthService uses 1-hour expiry, single-use, hashed. **Already meets dispatch goals.**

**Target:** Unchanged.

**Migration plan:** None.

### 2.8 `email_verification_tokens` table

**Today:** Already exists. Hashed token, 24-hour expiry. Used by signup + Google OAuth flow.

**Target:** Unchanged.

**Migration plan:** None.

### 2.9 `auth_outbox` table

**Today:** Outbox/event-bus mechanism. `type`, `payload_json`, `status`, retry/delay logic. Worker `OutboxProcessorService` consumes via `SKIP LOCKED`.

**Target:** **Extended event vocabulary.** Identity events from B1 publish into the same table:
- `user.created` (already implicit in signup; formalize)
- `user.role_changed` (NEW)
- `user.deactivated` (NEW)
- `user.password_changed` (NEW — wraps existing `PASSWORD_RESET_COMPLETED` audit)
- `workspace.member_added` (NEW)
- `workspace.member_removed` (NEW)
- `auth.login_success` (NEW — emit, don't replace audit)
- `auth.login_failure` (NEW)
- `auth.token_refresh_reuse_detected` (NEW — high-severity)

**Migration plan:** None for the table. The `OutboxProcessorService` is updated in PR2 (cutover) to handle new event types or to no-op-then-route if a separate `IdentityEventBus` is registered.

---

## Section 3 — API contract

### 3.1 Route prefix

**Locked:** All new B1 endpoints use `/api/v1/*`. Existing `/api/auth/*` routes continue working via the rewrite middleware ([main.ts:79-86](../../zephix-backend/src/main.ts#L79-L86)). **Do not remove or modify existing `/api/auth/*` paths in B1** — that's a separate deprecation cycle.

### 3.2 Error envelope

**Locked:** Use the existing `ApiErrorFilter` shape: `{ code, message, ...rest }` (flat, with optional extras). All new error codes registered in `shared/errors/error-codes.ts`. New B1 codes:
- `LAST_ADMIN_DEMOTE_BLOCKED` (422)
- `LAST_ADMIN_DEACTIVATE_BLOCKED` (422)
- `MFA_REQUIRED` — login response body field (not an error code; HTTP 200)
- `MFA_NOT_ENROLLED` (403) — admin attempting sensitive endpoint after grace expiry
- `LOGIN_LOCKED_OUT` (429 with `Retry-After` header) — extend existing rate-limit response
- `REFRESH_TOKEN_REUSE_DETECTED` (401)
- `INVITATION_EXPIRED` (410)

**Note:** Existing login already returns `Invalid credentials` for both unknown email and wrong password. Stream A B1 adds **dummy bcrypt verify on user-not-found** for timing parity (deferred sub-50ms timing test per `pre-paying-customers.md`).

### 3.3 Endpoint inventory

#### 3.3.1 Existing endpoints — keep as-is, also exposed at `/api/v1/*`

All endpoints from Cursor's Part A inventory (`/api/auth/*`) are preserved. The rewrite middleware exposes each at `/api/v1/auth/*` automatically.

#### 3.3.2 New endpoints (greenfield in B1)

Each shown with full request/response schemas.

**MFA enrollment (admin grace-period gating + member opt-in):**

```
POST   /api/v1/auth/mfa/enroll
Auth:  required (JWT)
Body:  {} (empty — server generates secret)
200:   {
         secret: string,         // base32-encoded TOTP secret (also encoded in QR)
         qrCodeDataUrl: string,  // data: URL with provisioning QR
         manualEntryKey: string  // human-readable secret for manual entry
       }
       // Server stores ciphertext+iv+authTag immediately; mfa_enabled stays false until verify
422:   { code: 'MFA_ALREADY_ENROLLED', message: '...' }

POST   /api/v1/auth/mfa/verify
Auth:  required
Body:  { code: string }    // 6-digit TOTP from authenticator
200:   { mfa_enabled: true }
422:   { code: 'MFA_INVALID_CODE', message: 'Invalid TOTP code' }

DELETE /api/v1/auth/mfa
Auth:  required
Body:  { currentPassword: string }   // password re-confirm
200:   { mfa_enabled: false }
401:   { code: 'INVALID_PASSWORD', message: '...' }
422:   { code: 'MFA_NOT_ENROLLED', message: '...' }
```

**MFA login challenge:**

The existing `/api/v1/auth/login` endpoint is **extended** (not replaced) to return MFA challenge when applicable:

```
POST   /api/v1/auth/login   (existing endpoint, EXTENDED)
Body:  { email: string, password: string, twoFactorCode?: string }   // existing shape

200 (no MFA, normal login):
       { accessToken, refreshToken, user, sessionId, organizationId, defaultWorkspaceSlug, expiresIn }
       (existing shape — unchanged)

200 (MFA required, twoFactorCode missing):
       { mfaChallenge: { challengeToken: string, expiresAt: string } }
       // challengeToken is a short-lived JWT (5 min) carrying user.id; client retries with it

200 (MFA required, twoFactorCode supplied + valid):
       (same as no-MFA login response)

401 (MFA required, twoFactorCode supplied + invalid):
       { code: 'MFA_INVALID_CODE', message: '...' }
```

Alternative endpoint path (cleaner): `POST /api/v1/auth/mfa/challenge` accepts `{ challengeToken, code }` and completes the login. **Recommendation: use both** — existing inline path stays for backward compat (Cursor's Part A confirmed `LoginDto.twoFactorCode` exists); add `/auth/mfa/challenge` as the explicit two-step path for new clients.

**Org members management (`org_role = admin` only):**

```
GET    /api/v1/org/users
Auth:  required + RequireOrgRole(ADMIN)
200:   {
         users: [{
           id: string,
           email: string,
           fullName: string,
           orgRole: 'ADMIN' | 'MEMBER' | 'VIEWER',
           status: 'active' | 'invited' | 'deactivated',
           mfaEnabled: boolean,
           lastLoginAt: string | null,
           createdAt: string
         }]
       }

POST   /api/v1/org/users/invite
Auth:  required + RequireOrgRole(ADMIN)
Body:  {
         email: string,
         orgRole: 'MEMBER' | 'VIEWER',         // can't invite as ADMIN through this path; use /promote
         workspaceAssignments?: [{ workspaceId: string, role: 'workspace_owner'|'workspace_member'|'workspace_viewer' }]
       }
201:   { invitationId: string, email: string, expiresAt: string }
409:   { code: 'USER_ALREADY_IN_ORG', message: '...' }
422:   { code: 'INVALID_INVITATION', message: '...' }

PATCH  /api/v1/org/users/:userId
Auth:  required + RequireOrgRole(ADMIN)
Body:  { orgRole: 'ADMIN' | 'MEMBER' | 'VIEWER' }
200:   { id, email, orgRole, ...rest }
422:   { code: 'LAST_ADMIN_DEMOTE_BLOCKED', message: '...' }

PATCH  /api/v1/org/users/:userId/deactivate
Auth:  required + RequireOrgRole(ADMIN)
Body:  {}
200:   { id, email, status: 'deactivated' }
422:   { code: 'LAST_ADMIN_DEACTIVATE_BLOCKED', message: '...' }
```

**Workspace members management (`workspace_owner` OR `org_role = ADMIN`):**

```
GET    /api/v1/workspaces/:wsId/members
Auth:  required + RequireWorkspaceRole(workspace_owner) [allowAdminOverride=true]
200:   { members: [{ userId, email, fullName, workspaceRole, joinedAt }] }

POST   /api/v1/workspaces/:wsId/members/invite
Auth:  required + RequireWorkspaceRole(workspace_owner) [allowAdminOverride=true]
Body:  { email: string, workspaceRole: 'workspace_owner'|'workspace_member'|'workspace_viewer' }
201:   { invitationId, email, expiresAt }
409:   { code: 'USER_ALREADY_IN_WORKSPACE', message: '...' }

PATCH  /api/v1/workspaces/:wsId/members/:userId
Auth:  required + RequireWorkspaceRole(workspace_owner) [allowAdminOverride=true]
Body:  { workspaceRole: 'workspace_owner'|'workspace_member'|'workspace_viewer' }
200:   { userId, workspaceRole }

DELETE /api/v1/workspaces/:wsId/members/:userId
Auth:  required + RequireWorkspaceRole(workspace_owner) [allowAdminOverride=true]
204:   no body
```

**Public invitation acceptance (no auth):**

```
GET    /api/v1/invitations/:token
Auth:  none
200:   {
         email: string,
         orgName: string,
         workspaceName?: string,
         invitedRole: string,
         expiresAt: string
       }
410:   { code: 'INVITATION_EXPIRED', message: '...' }

POST   /api/v1/invitations/:token/accept
Auth:  optional (if not provided, response prompts signup)
Body:  { fullName?: string, password?: string }   // required if no auth; ignored if auth
200 (existing user):  { orgId: string, workspaceId?: string }
201 (new user):       { user, accessToken, refreshToken, sessionId }
410:   { code: 'INVITATION_EXPIRED', message: '...' }
```

**RBAC migration summary tile (Cursor Part A contract — preserved):**

```
GET    /api/v1/admin/rbac/migration-summary
Auth:  required + RequireOrgRole(ADMIN)
200:   {
         migratedUserCount: number,
         pmMappingExceptions: [{ email: string, resolution: string, notes: string }],
         generatedAt?: string
       }
```

**Note for Section 8:** AD-011 + migration 76 already migrated `pm` → `member` four weeks ago, so `pmMappingExceptions` should be near-empty (or report zero historical exceptions). The endpoint contract is preserved for Cursor's tile; the data is mostly historical at this point.

#### 3.3.3 Endpoints to retain unchanged

Every endpoint in Cursor's Part A inventory (signup, register, resend-verification, forgot-password, reset-password, verify-email, google-oauth, smoke-login, /me, /profile, change-password, logout, csrf, refresh) is **kept exactly as today**. The rewrite middleware exposes each at `/api/v1/*` automatically. Stream B's frontend can call either path.

---

## Section 4 — Module structure (A1: refactor in place)

**Recommendation: A1 — refactor in place, no new `modules/identity/`.**

Rationale:
- Codebase already has `modules/auth`, `modules/users`, `organizations`, `admin` — all in production
- `modules/identity` would create exactly the duplicate-surface debt CLAUDE.md prohibits
- V1 + V2 already established the canonical guard (`PlatformAdminGuard`) and decorator (`RequireOrgRole`) — additional structural churn produces no behavior win
- 45+ modules import from `common/auth/platform-roles.ts` — a parallel module would multiply that surface

### 4.1 New code location plan

| Concern | Lives in | Notes |
|---|---|---|
| `MfaSecretCipherService` (AES-256-GCM crypto) | `zephix-backend/src/common/security/mfa-secret-cipher.service.ts` | Sits next to existing `token-hash.util.ts` |
| `MfaService` (TOTP enrollment, verify, mandatory check) | `zephix-backend/src/modules/auth/services/mfa.service.ts` | Co-located with other auth services |
| MFA controller endpoints | `zephix-backend/src/modules/auth/controllers/mfa.controller.ts` | NEW file |
| Org-members controller (org users CRUD) | `zephix-backend/src/admin/modules/organization/org-members.controller.ts` | EXTEND existing admin module — keeps admin under `admin/` |
| Workspace-members controller | `zephix-backend/src/modules/workspaces/controllers/workspace-members.controller.ts` | NEW under existing module |
| `AuthorizationService` facade (canAccessOrg / canAccessWorkspace / resolveScopes) | `zephix-backend/src/common/auth/authorization.service.ts` | NEW — facade over existing `WorkspaceAccessService` + `WorkspacePermissionService` |
| `LastAdminGuard` (service-layer enforcement) | `zephix-backend/src/common/auth/last-admin.guard.ts` | NEW — invoked from `IdentityService.changeRole()` and `IdentityService.deactivate()` |
| Identity events typed payloads | `zephix-backend/src/common/events/identity-events.ts` | NEW — typed event interfaces; published into existing `auth_outbox` |
| `IdentityService` (user mutations: changeRole, deactivate, reactivate) | `zephix-backend/src/modules/users/services/identity.service.ts` | NEW — co-located with existing `users.service.ts`; `users.service` stays thin (CRUD + preferences) |
| Invitation controller (public + workspace-scoped) | `zephix-backend/src/modules/auth/controllers/invitations.controller.ts` | NEW — wraps existing `OrgInvitesService` + new `WorkspaceInvitationsService` |
| `WorkspaceInvitationsService` (workspace-scoped invites by org members) | `zephix-backend/src/modules/auth/services/workspace-invitations.service.ts` | NEW — uses new `workspace_invitations` table |
| MFA grace-period state machine | Inline in `AuthService.createLoginResult()` + `JwtAuthGuard` extension | Field on user (`mfa_grace_until`) checked at sensitive endpoint guard |

### 4.2 Decorator strategy

Existing decorators (V1 + V2 shipped):
- `@RequireOrgRole(role)` at [workspaces/guards/require-org-role.guard.ts:16](../../zephix-backend/src/modules/workspaces/guards/require-org-role.guard.ts#L16) — REUSE
- `@RequireWorkspaceRole(role, opts)` at `modules/workspaces/decorators/require-workspace-role.decorator.ts` — REUSE
- `@RequireProjectWorkspaceRole(role, opts)` — REUSE for project-scoped routes
- `EntitlementGuard` — REUSE for plan-tier gating

**No new decorators needed.** Stream A's dispatch §3 specified `@RequireOrgRole`, `@RequireWorkspaceRole`, `@RequireWorkspaceMember` — the first two exist; the third is the same as `RequireWorkspaceRole(workspace_viewer)` (lowest tier). No need for a separate decorator.

### 4.3 Admin guard consolidation (the "four-guard problem")

Per V2: all four guards are semantically equivalent (`normalizePlatformRole(platformRole ?? role) === ADMIN`). Structural duplication remains.

**B1 stance:**
- All NEW B1 routes use `PlatformAdminGuard` (canonical).
- Do NOT physically remove the other three in B1 — that's structural cleanup that risks audit-logging drops (see V1 §7).
- Open follow-up cleanup ticket "RBAC v3.5: physically retire AdminGuard variants" with proof gate (every removal must preserve or fold-in `AuditService.logAction('admin.unauthorized')` from `shared/guards/admin.guard.ts`).

### 4.4 What is NOT changed in B1 module structure

- No new `modules/identity/` module
- `modules/auth/auth.service.ts` extended (signup, login, refresh, password) — not replaced
- `modules/users/users.service.ts` stays thin (CRUD + preferences) — `IdentityService` adds new capabilities (role change, deactivate)
- `modules/workspaces/*` extended (workspace-members controller) — not restructured
- `organizations/services/invitation.service.ts` deprecated but not removed
- 4 admin guards retained (1 canonical for new code, 3 legacy retained for back-compat)

---

## Section 5 — Migration plan (PR1 + PR2)

### 5.1 PR1 — Foundations (additive only, behind feature flag)

**Branch:** `build1/rbac-foundations` from `staging`. Mergeable to staging without functional impact.

**Migration 1 — Additive schema (single migration):**

```typescript
// 18000000000150-RbacFoundationsAdditive.ts
public async up(queryRunner: QueryRunner): Promise<void> {
  // 1. Add MFA encrypted columns to users
  await queryRunner.query(`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS mfa_secret_ciphertext BYTEA,
      ADD COLUMN IF NOT EXISTS mfa_secret_iv BYTEA,
      ADD COLUMN IF NOT EXISTS mfa_secret_auth_tag BYTEA,
      ADD COLUMN IF NOT EXISTS mfa_grace_until TIMESTAMPTZ
  `);

  // 2. Add family rotation columns to auth_sessions
  await queryRunner.query(`
    ALTER TABLE auth_sessions
      ADD COLUMN IF NOT EXISTS family_id UUID NOT NULL DEFAULT gen_random_uuid(),
      ADD COLUMN IF NOT EXISTS parent_session_id UUID,
      ADD COLUMN IF NOT EXISTS replaced_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS replaced_by_session_id UUID,
      ADD CONSTRAINT FK_auth_sessions_parent
        FOREIGN KEY (parent_session_id) REFERENCES auth_sessions(id) ON DELETE SET NULL,
      ADD CONSTRAINT FK_auth_sessions_replaced_by
        FOREIGN KEY (replaced_by_session_id) REFERENCES auth_sessions(id) ON DELETE SET NULL
  `);
  await queryRunner.query(`
    CREATE INDEX IF NOT EXISTS IDX_auth_sessions_family_id ON auth_sessions(family_id)
  `);
  // Backfill: existing rows get family_id = id (each is its own family)
  await queryRunner.query(`
    UPDATE auth_sessions SET family_id = id WHERE family_id IS NOT NULL AND parent_session_id IS NULL
  `);

  // 3. Create workspace_invitations table
  await queryRunner.query(`
    CREATE TABLE IF NOT EXISTS workspace_invitations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      email VARCHAR(255) NOT NULL,
      invited_workspace_role VARCHAR(64) NOT NULL,
      invited_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      token_hash CHAR(64) NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      accepted_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT UQ_workspace_invitations_token_hash UNIQUE (token_hash)
    )
  `);
  await queryRunner.query(`
    CREATE INDEX IF NOT EXISTS IDX_workspace_invitations_email ON workspace_invitations(email);
    CREATE INDEX IF NOT EXISTS IDX_workspace_invitations_workspace ON workspace_invitations(workspace_id);
    CREATE INDEX IF NOT EXISTS IDX_workspace_invitations_token_hash ON workspace_invitations(token_hash);
  `);
}

public async down(queryRunner: QueryRunner): Promise<void> {
  await queryRunner.query(`DROP TABLE IF EXISTS workspace_invitations`);
  await queryRunner.query(`
    ALTER TABLE auth_sessions
      DROP CONSTRAINT IF EXISTS FK_auth_sessions_parent,
      DROP CONSTRAINT IF EXISTS FK_auth_sessions_replaced_by,
      DROP COLUMN IF EXISTS replaced_by_session_id,
      DROP COLUMN IF EXISTS replaced_at,
      DROP COLUMN IF EXISTS parent_session_id,
      DROP COLUMN IF EXISTS family_id
  `);
  await queryRunner.query(`DROP INDEX IF EXISTS IDX_auth_sessions_family_id`);
  await queryRunner.query(`
    ALTER TABLE users
      DROP COLUMN IF EXISTS mfa_grace_until,
      DROP COLUMN IF EXISTS mfa_secret_auth_tag,
      DROP COLUMN IF EXISTS mfa_secret_iv,
      DROP COLUMN IF EXISTS mfa_secret_ciphertext,
      DROP COLUMN IF EXISTS mfa_enabled
  `);
}
```

**Migration acceptance:**
- Runs forward + back on staging copy in <60s (small alters, one new table)
- New columns NULLable / DEFAULT-able so existing rows are valid
- Feature flag `RBAC_V2_ENABLED=false` — new endpoints return 503 until flipped
- Wave9 governance smoke (10/10) baseline preserved

**Other PR1 contents:**
- `MfaSecretCipherService` + unit tests (round-trip + tampering rejection)
- `MfaService` (enrollment + verify) + unit tests
- `IdentityService` (changeRole, deactivate, reactivate) + last-admin guard logic + unit tests
- `AuthorizationService` facade (canAccessOrg, canAccessWorkspace, resolveScopes) + unit tests
- New entity classes for `workspace_invitations` + new columns on `users` + `auth_sessions` (TypeORM entities reflect added columns)
- Identity-events typed payload definitions
- Feature flag wiring (`RBAC_V2_ENABLED`)
- Build spec + debt log committed

### 5.2 PR2 — Cutover (controllers + flag flip)

**Branch:** `build1/rbac-cutover` from PR1 (or rebased on staging after PR1 merges).

- New controllers: MFA, org-members, workspace-members, invitations (public)
- AuthService.login() extended to enforce MFA challenge + dummy bcrypt verify on user-not-found
- AuthService.refreshToken() extended with family reuse-detection logic
- JwtAuthGuard or new MfaRequiredGuard enforces `MFA_NOT_ENROLLED` on sensitive endpoints after grace expiry
- Drop dead columns on users (after cutover stabilizes — can be a third migration in PR2 or deferred to a follow-up): `two_factor_enabled`, `two_factor_secret`, `password_reset_token`, `password_reset_token_expires`, `email_verification_token`, `email_verification_expires`
- All `@Roles` / legacy admin guard usages reviewed and either retained (back-compat, audit logging) or migrated to `PlatformAdminGuard` (new code only)
- Frontend (Stream B PR) coordinated for cutover
- Feature flag flip documented in deployment runbook

### 5.3 No backfill of org/workspace role rows

AD-011 already moved `pm` → `member`. No further role data migration in B1. The `RbacMigrationSummaryTile` endpoint reports against the historical AD-011 migration.

---

## Section 6 — ADRs

### ADR-001 (KEEP) — Hybrid runtime/cache authorization with TTL backstop

In-memory `UserScopes` cache populated on first auth check. Bus invalidation via `auth_outbox`-routed events: `user.role_changed`, `workspace.member_added`, `workspace.member_removed`, `user.deactivated`, `user.password_changed`. **60-second hard TTL backstop** regardless of bus events. Worst-case unrevoked-access window: 60 seconds.

### ADR-002 (AMENDED) — Refresh token rotation with family detection on `auth_sessions`

Change from original: family rotation is **added to existing `auth_sessions` table**, not a new `refresh_tokens` schema. Each initial login creates a new `family_id = gen_random_uuid()`. Each refresh creates a new session row with same `family_id` and `parent_session_id` pointing at the prior row; the prior row's `replaced_at` + `replaced_by_session_id` are populated. Reuse of a token whose session has `replaced_at IS NOT NULL` triggers family invalidation: `UPDATE auth_sessions SET revoked_at = now(), revoke_reason = 'token_reuse_detected' WHERE family_id = $1 AND revoked_at IS NULL`. Then publish `auth.token_refresh_reuse_detected`. Sibling families on other devices unaffected. 1-second idempotency window for legitimate race conditions.

### ADR-003 (KEEP) — Email + password only for Phase 1A; SSO/SAML/OIDC/SCIM deferred to 1B

### ADR-004 (AMENDED → SUPERSEDED BY HISTORY) — PM as assignment, not RBAC role

Already executed via AD-011 + migration 76. B1 does no further role-data migration. Project edit rights derive from `projects.project_manager_user_id` (B7) + workspace role + assignment.

### ADR-005 (AMENDED) — Last-admin protection at service layer

Demotion blocked: `LAST_ADMIN_DEMOTE_BLOCKED` (422). Deactivation blocked: `LAST_ADMIN_DEACTIVATE_BLOCKED` (422) — separate code, distinct from demotion. Implementation: `IdentityService.changeRole()` and `IdentityService.deactivate()` count `user_organizations` rows where `role IN ('owner', 'admin') AND isActive = true` for the target's org; refuse the mutation if the count would drop below 1. Atomic transfer (promote new → demote self) works because each mutation runs the check after writing. Out-of-band escalation runbook documented for orgs that lose all admin contact.

### ADR-007 (NEW) — Token transport stays as-is (cookie + body)

Existing transport: `zephix_session` + `zephix_refresh` cookies (httpOnly, set by login response) PLUS access/refresh tokens in response body. Stream A's dispatch suggested changing this — **rejected.** Cookie+body is the shipped pattern; switching is a frontend-coordinated change that's out of B1 scope. The "httpOnly cookie only for refresh" item is on `pre-paying-customers.md` debt log.

### ADR-008 (NEW) — Account enumeration prevention

Login: identical response code, body shape, and HTTP status for unknown email vs. wrong password vs. deactivated account → all return 401 + body `{ code: 'INVALID_CREDENTIALS', message: 'Invalid credentials' }`. Existing code already does this for body+status. **B1 adds dummy bcrypt verify on user-not-found** to equalize timing within reason. Sub-50ms timing parity test in CI is **deferred** (debt log).

Password reset request: always returns 200 (existing behavior at [auth.service.ts:1184](../../zephix-backend/src/modules/auth/auth.service.ts#L1184)). Email sent only if user exists. ✓

### ADR-009 (NEW) — MFA grace period for org admins

7-day grace period from B1 cutover deploy (PR2 merge to staging). Implementation:
- On admin login without MFA enrolled: `mfa_grace_until = COALESCE(mfa_grace_until, now() + INTERVAL '7 days')` (set once, sticky)
- During grace: persistent banner on every page (Stream B), `auth.mfa_grace_active` event published once on login
- After grace: `MFA_NOT_ENROLLED` (403) on sensitive endpoints (`/api/v1/org/*` + role/membership changes); login still works; only `/auth/mfa/enroll`, `/auth/mfa/verify`, `/users/me`, `/auth/logout` accessible
- For staging Founding Members: 7 days. For Q2 beta cohort: re-evaluate.

### ADR-010 (NEW) — Multi-admin first-class support

The system already supports multiple admin rows in `user_organizations` (no UNIQUE constraint on role). B1 makes this **explicit and tested**: invite as admin, promote to admin, demote-self-if-not-last all work. The PO's "Free tier: 1 Org Admin + up to 2 other users" rule is a quota concern — **enforced in B2 (Tenancy)**, not B1. B1 supports unlimited admins from a schema standpoint.

### ADR-011 (NEW) — Identity events through existing `auth_outbox`

New event types added to `auth_outbox`: `user.created`, `user.role_changed`, `workspace.member_added`, `workspace.member_removed`, `auth.login_success`, `auth.login_failure`, `auth.token_refresh_reuse_detected`, `user.deactivated`, `user.password_changed`. `OutboxProcessorService` extends its switch to handle each (B5 will replace email-side dispatch with notification routing). **No new event-bus mechanism introduced.**

---

## Section 7 — Open questions for PO

These are product-level decisions Stream A cannot resolve from code alone:

**Q1 — `user_organizations.role = 'owner'` semantics today.** The Google OAuth signup path explicitly writes `'owner'` for solo founders ([auth.service.ts:424](../../zephix-backend/src/modules/auth/auth.service.ts#L424)). Two interpretations possible:
- (a) `'owner'` means "founder/billing-admin" — distinct from regular admin
- (b) `'owner'` is just a legacy synonym for `'admin'` (per V2 LEGACY_ROLE_MAPPING)

If (a), B1 needs to preserve owner-only operations (e.g., delete-org, transfer-billing). If (b), the field is purely cosmetic and B1 can leave it alone (current proposal). **Default assumption: (b). Confirm or override.**

**Q2 — MFA grace period scope after Q2 beta.** ADR-009 sets 7 days for staging. Founding Members may push back. Need a default for Q2 beta cohort: 7 days, 30 days, or "soft-block until enrolled but don't lock out"?

**Q3 — Workspace-scoped invitations from non-admin org members.** Spec allows workspace owners to invite to their workspace. Should workspace **members** also be able to invite to their workspace (like Notion / Linear), or is this strictly owner-only? **Default proposed: owner-only.**

**Q4 — `organizations/entities/invitation.entity.ts` (legacy) deprecation.** Two invitation flows live in parallel. The org-side `InvitationService` (older, raw token, 72h expiry) is consumed by `organizations.module`. Removing it is a follow-up; in B1 we leave it but mark deprecated. Confirm OK to defer cleanup, or want it killed in B1?

**Q5 — `users.role` field cleanup.** It still exists on the User entity as a legacy fallback. V2 confirmed all guards normalize via `platformRole ?? role`, so the field is functionally vestigial. **Default proposed: leave it in B1, kill in v3.5 cleanup.** Confirm.

**Q6 — Who is the "first admin" when an invited user joins as `'admin'`?** When two admins exist in an org and one gets removed, the system should not require operator intervention. The last-admin guard handles "last admin" correctly. But there's no "primary admin" / "billing owner" concept — confirm none is needed for B1.

**Q7 — Audit retention for `auth.token_refresh_reuse_detected` events.** This is a high-severity signal. Should it route to a separate alerting channel in addition to audit log? Default: audit log only for B1, alerting deferred to operations.

---

## Section 8 — Diff against original Stream A dispatch

For your review — explicit list of what changed and why.

| Original dispatch said | Reconciled spec says | Reason |
|---|---|---|
| Build new `modules/identity/` | A1: extend existing `modules/auth/`, `modules/users/`, `modules/workspaces/`, `admin/` | Avoid duplicate-surface debt; 45+ existing imports of `common/auth/platform-roles` |
| `org_role` enum: `(admin, member, viewer)` — 3 values | PlatformRole enum already exists with same 3 values; DB `user_organizations.role` keeps 4 values + app normalization (no DB migration in B1) | AD-011 + V2 already set this; further DB rename is invasive |
| `workspace_role` enum: `(owner, member, viewer)` — 3 values | WorkspaceRole has 6 storage values + normalization aliases (workspace_owner ≡ workspace_admin) | V1+V2 shipped; introducing a 3-value enum would break 6 production tables |
| Build new `MfaSecretCipherService` | Same — actual greenfield work | ✓ |
| Migration 1 additive: create new tables `users` (refactored), `workspace_memberships`, `refresh_tokens` (new shape), `invitations` | Single additive migration: ALTER `users` (add MFA cols), ALTER `auth_sessions` (add family cols), CREATE `workspace_invitations` | Existing tables already do most of this work; rename-and-recreate would lose data and break in-flight sessions |
| Migration 2 backfill: `users.role` → `org_role` + `workspace_memberships` | None — AD-011 + migration 76 already executed this 4 weeks ago | Stale assumption |
| Migration 3 drop: `users.role` column | Defer to v3.5 cleanup (not B1) | `users.role` is normalized harmlessly; removal is structural not security |
| New `refresh_tokens` table with family/parent/used_at | Add `family_id` + `parent_session_id` + `replaced_at` + `replaced_by_session_id` columns to existing `auth_sessions` | `auth_sessions` is the shipped path; legacy `refresh_tokens` is dormant |
| Bearer access + refresh token in response body (frontend stores access in memory, refresh in localStorage) | Existing `zephix_session`/`zephix_refresh` cookies + body — keep | ADR-007 NEW: don't churn frontend transport in B1 |
| `password_reset_tokens` is "new in this build" | Already exists (migration 75); password reset is mature; B1 doesn't touch it | ✓ |
| `LAST_ADMIN_DEMOTE_BLOCKED` for both demote and deactivate | Distinct codes: `LAST_ADMIN_DEMOTE_BLOCKED` (demote) + `LAST_ADMIN_DEACTIVATE_BLOCKED` (deactivate) | Operator concern #2 — confirmed |
| MFA mandatory for org admins, 7-day grace | Same — `mfa_grace_until` field on user, `MFA_NOT_ENROLLED` on sensitive endpoints | ✓ |
| Account enumeration: identical body+status for unknown email vs wrong password | Same — existing code does this for body+status; B1 adds dummy bcrypt verify | ✓ |
| Refresh token reuse detection invalidates entire family on first reuse | Same — semantics unchanged | ✓ |
| Org admin implicit access globally | Already shipped via `WorkspaceAccessService` + `RequireWorkspaceRoleGuard` `allowAdminOverride=true` | ✓ |
| All endpoints under `/api/v1/*` | Same — locked by operator | ✓ |
| Error envelope `{ error: { code, message, ... } }` | Existing `ApiErrorFilter` shape: `{ code, message, ...rest }` (flat) | Match shipped pattern |
| 4 admin guards consolidated to 1 `RoleGuard` | Defer physical consolidation (audit-logging risk per V1 §7); use `PlatformAdminGuard` for new code only | ✓ |
| Build new event bus with stub interface | Use existing `auth_outbox` table + `OutboxProcessorService` with extended event vocabulary | ADR-011 NEW |
| Pre-existing `users.role` field grep + refactor | V2 already did this (per `RBAC_ROLE_SYSTEM_V2_CLEANUP.md` §"Drift Fixed") — no further grep in B1 | ✓ |
| `RbacMigrationSummaryTile` contract `{ migratedUserCount, pmMappingExceptions, generatedAt }` | Preserved — endpoint exists at `GET /api/v1/admin/rbac/migration-summary`; data is mostly historical (AD-011 already executed) | ✓ |

---

## Section 9 — Cross-stream consistency check (Cursor Part A)

Per operator's task 5, validating the reconciled spec against Cursor's findings:

| Cursor finding | Reconciled spec | Match? |
|---|---|---|
| Existing `/api/auth/*` routes preserved | All preserved; rewrite middleware exposes at `/api/v1/*` automatically | ✓ |
| Error envelope `{ code, message, ...rest }` flat shape | Same pattern used; no new filter introduced | ✓ |
| `RbacMigrationSummaryTile` endpoint contract | `GET /api/v1/admin/rbac/migration-summary` matches Cursor's expected shape | ✓ |
| Frontend has incomplete legacy `pm` cleanup (organizationStore, adminApi, types/organization, Header.tsx, etc.) | **Out of scope for Stream A.** Backend is correct (`pm` → `member` migrated). Frontend cleanup is a Cursor task. | ✓ |
| `LoginDto.twoFactorCode` exists but enforcement missing | Confirmed; B1 PR2 wires enforcement | ✓ |

**No contradictions surfaced.** One coordination note for Cursor: when MFA enrollment endpoints land, frontend will need to consume the QR data URL response shape from `/api/v1/auth/mfa/enroll` — that's part of Stream B Part B.

---

## Appendix A — Verification methodology (preserved from original dispatch + adjusted)

**Positive cases (all must pass at PR2 merge):**
- Login with valid credentials returns access + refresh tokens (existing) ✓
- Refresh with valid token returns new pair, old marked replaced (extended)
- MFA enrollment generates TOTP, verification succeeds with correct code
- Org admin can access any workspace endpoint without explicit membership (existing) ✓
- Workspace owner can access their workspace, cannot access others (existing) ✓
- Workspace member can read their workspace (existing, flag-gated)
- Invitation accept creates user with correct role
- Last-admin atomic transfer (promote new admin → demote self) succeeds
- Migration runs forward+back on staging copy in <60s

**Negative cases (all must pass):**
- Login with wrong password returns 401 with `INVALID_CREDENTIALS` (existing) ✓
- Login with unknown email returns 401 with same body shape + dummy bcrypt timing (extended)
- 5 failed logins → 6th attempt blocked with `LOGIN_LOCKED_OUT` + `Retry-After` (existing rate limiter — verify the threshold enforcement in B1)
- Reuse of consumed refresh token invalidates entire family + emits `auth.token_refresh_reuse_detected`; sibling family unaffected
- Workspace member cannot access another workspace (403, existing)
- Last admin self-demote → 422 `LAST_ADMIN_DEMOTE_BLOCKED`
- Last admin deactivate → 422 `LAST_ADMIN_DEACTIVATE_BLOCKED`
- Invitation expired → 410 `INVITATION_EXPIRED`
- Org admin without MFA, after grace → 403 `MFA_NOT_ENROLLED` on sensitive endpoints
- Migration rollback restores original state on staging copy
- Password reset request with unknown email returns 200 with same body as known email (existing) ✓
- Password change invalidates all prior refresh tokens (existing) ✓

**Integration test:**
- Full flow: invite → accept → login → MFA enroll → token refresh → role change → cache invalidates → password change → all sessions die → logout

**Performance test (lightweight):**
- 1000 sequential `canAccessWorkspace` calls — p99 < 5ms cached, < 50ms cold
- 100 concurrent logins complete in <10 seconds (existing rate limiter must permit this for distinct emails)

---

## Appendix B — Pre-existing-debt items confirmed

The following are tracked but not addressed in B1:

- **Three legacy admin guard variants retained** (`shared/guards/admin.guard.ts`, `shared/guards/admin-only.guard.ts`, `modules/auth/guards/admin.guard.ts`). All semantically equivalent post-V2; structural cleanup deferred.
- **`users.role` field retained** as fallback for guards. Field is normalized to PlatformRole at every read; no security risk.
- **`user_organizations.role` DB enum has 4 values** (`owner|admin|member|viewer`); app collapses to 3.
- **`refresh_tokens` (legacy) table retained** as dormant; revoke-on-password-change uses it for back-compat.
- **`organizations/entities/invitation.entity.ts` retained** as deprecated; new code uses `OrgInvite`.
- **Inline `password_reset_token` / `email_verification_token` columns on User** are dead alongside the dedicated tables; drop deferred to PR2 or follow-up cleanup.

All entries route to `docs/known-debt/pre-paying-customers.md` for tracking.

---

## Appendix C — Files I read during this cycle

For audit purposes:
- `docs/architecture/RBAC_AND_ACCESS_CONTROL_ARCHITECTURE.md`
- `docs/architecture/RBAC_ROLE_SYSTEM_V1.md`
- `docs/architecture/RBAC_ROLE_SYSTEM_V2_CLEANUP.md`
- `zephix-backend/src/modules/auth/auth.service.ts`
- `zephix-backend/src/modules/auth/services/org-invites.service.ts`
- `zephix-backend/src/modules/auth/services/outbox-processor.service.ts`
- `zephix-backend/src/modules/auth/entities/auth-outbox.entity.ts`
- `zephix-backend/src/modules/auth/entities/refresh-token.entity.ts` (legacy)
- `zephix-backend/src/modules/users/entities/user.entity.ts`
- `zephix-backend/src/modules/users/users.service.ts`
- `zephix-backend/src/modules/workspaces/entities/workspace-member.entity.ts`
- `zephix-backend/src/modules/workspaces/guards/require-org-role.guard.ts`
- `zephix-backend/src/modules/workspaces/guards/require-workspace-role.guard.ts`
- `zephix-backend/src/organizations/entities/user-organization.entity.ts`
- `zephix-backend/src/organizations/entities/invitation.entity.ts`
- `zephix-backend/src/organizations/services/invitation.service.ts`
- `zephix-backend/src/common/auth/platform-roles.ts`
- `zephix-backend/src/common/auth/platform-admin.guard.ts`
- `zephix-backend/src/main.ts`
- `zephix-backend/src/migrations/18000000000075-CreatePasswordResetTokensTable.ts`
- `zephix-backend/src/migrations/18000000000076-ReplaceLegacyOrgRolePmWithMember.ts`
- `zephix-backend/src/migrations/create-refresh-tokens-table.sql`

Plus directory listings of `modules/`, `auth/`, `users/`, `workspaces/`, `organizations/`, `admin/`, `migrations/`, `architecture/`.

Plus one read-only staging query: `SELECT COUNT(*) FILTER (WHERE two_factor_enabled = true), COUNT(*) FROM users` → result: **0 of 241 users have 2FA enabled.**

---

**End of reconciled spec. Awaiting operator review.**
