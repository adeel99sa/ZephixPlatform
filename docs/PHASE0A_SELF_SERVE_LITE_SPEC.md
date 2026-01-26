# Phase 0A: Self Serve Lite Onboarding - Specification

**Work Package:** Phase 0A: Self Serve Lite Onboarding  
**Goal:** External testers feel a real signup and first login experience. No payments. Billing stays disabled or manual. Admin can invite users, create workspaces, assign workspace owners, then start work.

**Status:** Specification Complete (Slice 0)

---

## 1. Flows

### 1.1 Admin Seeded Manually (Internal Ops or API)
- Internal ops or API creates organization
- Admin user is created with `platformRole: 'admin'` but no password set
- Admin receives invite email link (or invite is created via API for manual distribution)

### 1.2 Admin Receives Invite Email Link
- Admin receives email with link: `/accept-invite?token=<RAW_TOKEN>`
- Link expires after 7 days
- Token is single-use (marked as accepted after use)

### 1.3 Admin Sets Password
- Admin clicks invite link
- Page validates token via `GET /api/org-invites/validate?token=`
- Shows: email, role (admin), org name
- Form: full name, password, confirm password
- Submit calls `POST /api/org-invites/accept`
- On success: store auth tokens, redirect based on role

### 1.4 Admin Completes Org Setup Checklist
- Admin lands on `/onboarding` (if onboarding incomplete)
- Checklist steps:
  - ✅ Set password (already done via invite accept)
  - ⬜ Invite employees
  - ⬜ Create workspace
  - ⬜ Assign workspace owner
- Each step can be marked complete via `POST /api/organizations/onboarding/complete-step`

### 1.5 Admin Invites Employees by Email, Assigns Org Role
- Admin navigates to `/org/users` (org directory)
- Clicks "Invite user" button
- Modal form: email, role (admin/member/viewer)
- Submit calls `POST /api/org-invites`
- Response includes `inviteLink` with raw token (for email distribution)
- Admin copies link or sends email manually

### 1.6 Admin Creates Workspace
- Admin uses existing `POST /api/workspaces` endpoint
- Body: `name`, `description` (optional)
- Admin automatically becomes workspace owner (existing behavior)

### 1.7 Admin Assigns Workspace Owner
- Admin navigates to workspace settings or uses new endpoint
- Endpoint: `POST /api/workspaces/:workspaceId/assign-owner`
- Body: `userId`
- Behavior: Add user as workspace member if missing, set role `workspace_owner`

### 1.8 Workspace Owner Lands on Workspace Home
- After login, workspace owner (who owns at least one workspace) lands on `/workspaces/:workspaceId/home`
- Shows: members count, projects count, link to workspace dashboards

### 1.9 Members Land on My Work
- After login, member lands on `/my-work`
- Default filters applied (no restrictions beyond existing My Work filters)

### 1.10 Viewers Land on Dashboards or Read-Only My Work
- After login, viewer lands on:
  - `/my-work` with `assignee=me` enforced (read-only banner shown)
  - OR `/org/dashboards` or `/workspaces/:id/dashboards` if they have invited dashboards
- Viewer cannot use `assignee=any` filter (enforced server-side)

---

## 2. Entities and Fields

### 2.1 OrgInvite Entity

**File:** `zephix-backend/src/modules/org-invites/entities/org-invite.entity.ts`

**Fields:**
- `id`: `uuid` (primary key)
- `organizationId`: `uuid` (indexed, foreign key to organizations)
- `email`: `varchar` (indexed, email address of invitee)
- `role`: `enum` (`admin`, `member`, `viewer`) - platform role for the user
- `tokenHash`: `varchar` (indexed, SHA256 hash of raw token)
- `invitedByUserId`: `uuid` (nullable, foreign key to users, who created the invite)
- `expiresAt`: `timestamp` (when invite expires, default: now + 7 days)
- `acceptedAt`: `timestamp` (nullable, when invite was accepted)
- `revokedAt`: `timestamp` (nullable, when invite was revoked)
- `createdAt`: `timestamp` (auto-generated)
- `updatedAt`: `timestamp` (auto-generated)

**Relations:**
- `organization`: Many-to-One with `Organization`
- `invitedBy`: Many-to-One with `User` (nullable)

### 2.2 OrgInvite Enums

**File:** `zephix-backend/src/modules/org-invites/domain/org-invite.enums.ts`

```typescript
export enum OrgInviteRole {
  ADMIN = 'admin',
  MEMBER = 'member',
  VIEWER = 'viewer',
}
```

### 2.3 Token Rules

**Token Generation:**
- Raw token: UUID v4 (e.g., `550e8400-e29b-41d4-a716-446655440000`)
- Storage: Only SHA256 hash stored in `tokenHash` column
- Never store raw token in database
- Raw token only returned in `POST /api/org-invites` response as `inviteLink` field
- Raw token never logged

**Token Validation:**
- Hash incoming token with SHA256
- Query by `tokenHash`
- Check: `acceptedAt IS NULL AND revokedAt IS NULL AND expiresAt > NOW()`

### 2.4 Expiration Rules

- Default expiration: 7 days from creation
- Expired invites cannot be accepted
- Expired invites can be cleaned up by background job (future work)

### 2.5 Status Transitions

**Invite States:**
- `PENDING`: `acceptedAt IS NULL AND revokedAt IS NULL AND expiresAt > NOW()`
- `ACCEPTED`: `acceptedAt IS NOT NULL`
- `REVOKED`: `revokedAt IS NOT NULL`
- `EXPIRED`: `expiresAt <= NOW() AND acceptedAt IS NULL`

**State Machine:**
```
PENDING → ACCEPTED (via POST /api/org-invites/accept)
PENDING → REVOKED (via future revoke endpoint)
PENDING → EXPIRED (automatic, time-based)
```

**Constraints:**
- Unique constraint: Prevent duplicate active invites per `(organizationId, email)` where active = `acceptedAt IS NULL AND revokedAt IS NULL AND expiresAt > NOW()`
- If partial unique index is hard in TypeORM, enforce in service logic and add normal composite index on `(organizationId, email)`

---

## 3. API Contract

### 3.1 POST /api/org-invites

**Purpose:** Admin creates an invite for a new user

**Authentication:** Required (`JwtAuthGuard`)

**Authorization:** Org role must be `admin` (`@RequireOrgRole(PlatformRole.ADMIN)`)

**Request Body:**
```typescript
{
  email: string;  // Valid email format
  role: 'admin' | 'member' | 'viewer';
}
```

**Validations:**
- Email format validation
- Prevent inviting email that already belongs to a user in the org
- Prevent duplicate active invite for same email (same org)
- Role must be valid enum value

**Response:** `200 OK`
```typescript
{
  data: {
    id: string;
    email: string;
    role: string;
    expiresAt: string;  // ISO timestamp
    inviteLink: string;  // e.g., "/accept-invite?token=RAW_TOKEN"
    createdAt: string;
  }
}
```

**Error Codes:**
- `400 VALIDATION_ERROR`: Invalid email format or role
- `403 FORBIDDEN`: User is not org admin
- `409 CONFLICT`: Email already has active invite or user already exists in org

**Notes:**
- `inviteLink` contains raw token in URL form
- Raw token never logged
- Only returned to admin in response

---

### 3.2 GET /api/org-invites/validate

**Purpose:** Public endpoint to validate invite token and show invite details

**Authentication:** None (public endpoint)

**Query Parameters:**
- `token`: string (raw token from invite link)

**Response:** `200 OK`
```typescript
{
  data: {
    email: string;
    role: string;
    orgName: string;
    expiresAt: string;  // ISO timestamp
  }
}
```

**Error Codes:**
- `400 VALIDATION_ERROR`: Token missing or invalid format
- `404 NOT_FOUND`: Token not found or expired/revoked/accepted

**Notes:**
- No internal IDs returned (org ID, user ID, etc.)
- Only public-facing information

---

### 3.3 POST /api/org-invites/accept

**Purpose:** Public endpoint to accept invite and create user account

**Authentication:** None (public endpoint)

**Request Body:**
```typescript
{
  token: string;  // Raw token from invite link
  password: string;  // Must meet password policy (min 8 chars)
  fullName: string;  // User's full name
}
```

**Validations:**
- Token valid and active (not expired, not accepted, not revoked)
- Password meets existing password policy (minimum 8 characters, per `auth-registration.service.ts`)
- Full name not empty

**Behavior:**
1. Hash token, find active invite by `tokenHash`
2. Create user in that organization with:
   - `email`: from invite
   - `password`: hashed with bcrypt
   - `firstName` and `lastName`: parsed from `fullName`
   - `platformRole`: from invite `role`
   - `organizationId`: from invite
3. Mark invite `acceptedAt = NOW()`
4. Issue auth token using existing auth service (same format as login)
5. Return auth response consistent with existing login responses

**Response:** `200 OK`
```typescript
{
  data: {
    accessToken: string;
    refreshToken: string;
    user: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      platformRole: string;
      organizationId: string;
    }
  }
}
```

**Error Codes:**
- `400 VALIDATION_ERROR`: Invalid token, weak password, or missing fields
- `404 NOT_FOUND`: Token not found or expired/revoked/accepted
- `409 CONFLICT`: User already exists with this email

---

### 3.4 GET /api/onboarding/me

**Purpose:** Get current user's onboarding status and next route

**Authentication:** Required (`JwtAuthGuard`)

**Response:** `200 OK`
```typescript
{
  data: {
    role: 'admin' | 'member' | 'viewer';
    onboardingStatus: {
      completed: boolean;
      currentStep: string;
      completedSteps: string[];
    };
    nextRoute: string;  // Route to redirect after login
  }
}
```

**nextRoute Rules:**
- Admin with incomplete onboarding: `/onboarding`
- Admin complete: `/org/home`
- Workspace owner (owns at least one workspace): `/workspaces/:workspaceId/home` (use first owned workspace)
- Workspace owner (no workspaces): `/org/home` (with prompt to create workspace)
- Member: `/my-work`
- Viewer: `/my-work` (with `assignee=me` enforced) OR `/org/dashboards` if they have invited dashboards

**Notes:**
- This endpoint extends existing `/api/organizations/onboarding/status` or can be a new endpoint
- If new, place in appropriate controller (e.g., `onboarding.controller.ts` or `auth.controller.ts`)

---

### 3.5 POST /api/organizations/onboarding/complete-step

**Purpose:** Mark an onboarding step as complete (existing endpoint)

**Authentication:** Required (`JwtAuthGuard`)

**Request Body:**
```typescript
{
  step: string;  // e.g., 'invite-employees', 'create-workspace', 'assign-owner'
}
```

**Response:** `200 OK`
```typescript
{
  data: {
    completed: boolean;
    currentStep: string;
    completedSteps: string[];
  }
}
```

---

### 3.6 POST /api/orgs/manual-create (Internal Use)

**Purpose:** Internal endpoint for ops to create org and admin user manually

**Authentication:** Required (admin-only, behind env flag `ENABLE_MANUAL_ORG_CREATE=true`)

**Authorization:** Platform admin only (or internal service token)

**Request Body:**
```typescript
{
  orgName: string;
  orgSlug?: string;
  adminEmail: string;
  adminFullName: string;
}
```

**Behavior:**
1. Create organization
2. Create admin user (no password set)
3. Create org invite for admin
4. Return org ID and invite link

**Response:** `201 Created`
```typescript
{
  data: {
    organizationId: string;
    inviteLink: string;  // Raw token in URL form
  }
}
```

**Notes:**
- This endpoint is for internal ops use only
- Protected by env flag and admin guard
- Not exposed to external users

---

### 3.7 GET /api/org/users

**Purpose:** List all users in the organization (org directory)

**Authentication:** Required (`JwtAuthGuard`)

**Authorization:** Org role must be `admin` (`@RequireOrgRole(PlatformRole.ADMIN)`)

**Response:** `200 OK`
```typescript
{
  data: {
    users: [
      {
        id: string;
        name: string;  // firstName + lastName
        email: string;
        role: 'admin' | 'member' | 'viewer';
        createdAt: string;
        lastLoginAt: string | null;
      }
    ]
  }
}
```

**Notes:**
- Only org admins can view org directory
- Members and viewers cannot access this endpoint

---

### 3.8 POST /api/workspaces/:workspaceId/assign-owner

**Purpose:** Assign a workspace owner (org admin only for Phase 0A)

**Authentication:** Required (`JwtAuthGuard`)

**Authorization:** Org role must be `admin` (`@RequireOrgRole(PlatformRole.ADMIN)`)

**Request Body:**
```typescript
{
  userId: string;  // UUID of user to assign as owner
}
```

**Validations:**
- User must belong to the same organization
- Workspace must exist and belong to the same organization

**Behavior:**
1. Verify user belongs to org
2. Add workspace membership if missing
3. Set role `workspace_owner` for that user in that workspace

**Response:** `200 OK`
```typescript
{
  data: {
    workspaceId: string;
    userId: string;
    role: 'workspace_owner';
  }
}
```

**Error Codes:**
- `400 VALIDATION_ERROR`: Invalid userId
- `403 FORBIDDEN`: User is not org admin
- `404 NOT_FOUND`: Workspace or user not found
- `409 CONFLICT`: User does not belong to organization

**Notes:**
- For Phase 0A, only org admin can assign workspace owners
- Future: Could allow workspace_owner to delegate (not in Phase 0A scope)

---

## 4. Permissions

### 4.1 Org Admin Permissions
- ✅ Manage org users (view directory, invite, revoke)
- ✅ Manage workspaces (create, assign owners)
- ✅ Complete org onboarding checklist
- ✅ Access org home page with setup checklist

### 4.2 Org Member Permissions
- ❌ No org governance (cannot invite users, cannot view org directory)
- ✅ Can be assigned as workspace owner
- ✅ Can access workspaces they are members of
- ✅ Lands on `/my-work` after login

### 4.3 Org Viewer Permissions
- ❌ No org governance
- ❌ Cannot be workspace owner (enforced: viewers cannot be assigned as workspace_owner)
- ✅ Read-only access to My Work with `assignee=me` enforced
- ✅ Can view dashboards they were invited to
- ❌ Cannot use `assignee=any` filter (server-side enforcement)

**Enforcement Points:**
- Server-side: All endpoints check `@RequireOrgRole` guard
- Server-side: My Work service enforces `assignee=any` restriction for viewers
- Frontend: UI hides actions based on role, but server is source of truth

---

## 5. Exit Criteria

### 5.1 End-to-End Manual Test Steps

**Test 1: Admin Invite and Password Set**
1. Internal ops creates org and admin invite via `POST /api/orgs/manual-create` (or API)
2. Admin receives invite link: `/accept-invite?token=XXX`
3. Admin opens link, sees email, role (admin), org name
4. Admin enters full name, password, confirm password
5. Submit succeeds, admin is logged in
6. Admin lands on `/onboarding` (onboarding incomplete)

**Test 2: Admin Onboarding Checklist**
1. Admin views onboarding checklist
2. Steps shown: Set password (✅), Invite employees (⬜), Create workspace (⬜), Assign owner (⬜)
3. Admin clicks "Invite employee"
4. Modal opens, admin enters email and role (member)
5. Submit succeeds, invite link returned
6. Admin copies link or sends email

**Test 3: Employee Accepts Invite**
1. Employee opens invite link: `/accept-invite?token=YYY`
2. Employee sees email, role (member), org name
3. Employee enters full name, password, confirm password
4. Submit succeeds, employee is logged in
5. Employee lands on `/my-work` (member role)

**Test 4: Admin Creates Workspace**
1. Admin navigates to workspace creation (from onboarding or org home)
2. Admin enters workspace name and description
3. Submit calls `POST /api/workspaces`
4. Workspace created, admin is workspace owner
5. Admin marks "Create workspace" step complete

**Test 5: Admin Assigns Workspace Owner**
1. Admin navigates to workspace settings or uses assign-owner endpoint
2. Admin selects user from org users list
3. Submit calls `POST /api/workspaces/:workspaceId/assign-owner`
4. User becomes workspace owner
5. Admin marks "Assign workspace owner" step complete

**Test 6: Role-Based Landing Pages**
1. Admin (onboarding complete) logs in → lands on `/org/home`
2. Workspace owner logs in → lands on `/workspaces/:workspaceId/home`
3. Member logs in → lands on `/my-work`
4. Viewer logs in → lands on `/my-work` with read-only banner and `assignee=me` enforced

**Test 7: Viewer Restrictions**
1. Viewer tries to use `assignee=any` filter in My Work
2. Server returns `403 FORBIDDEN` with error code
3. Frontend shows error message
4. Viewer can only see work items assigned to them

**Test 8: Org Directory**
1. Admin navigates to `/org/users`
2. Sees list of all org users with name, email, role, created date, last login
3. Can search by name or email
4. Can click "Invite user" to open invite modal
5. Member or viewer cannot access `/org/users` (403)

---

### 5.2 Minimal E2E Coverage

**Integration Tests Required:**
1. `org-invites.integration.spec.ts`:
   - Admin creates invite
   - Validate invite token (public)
   - Accept invite and create user (public)
   - Prevent duplicate active invites
   - Prevent inviting existing user

2. `onboarding.integration.spec.ts`:
   - `GET /api/onboarding/me` returns correct `nextRoute` for each role
   - Admin onboarding checklist completion

3. `workspace-assign-owner.integration.spec.ts`:
   - Admin assigns workspace owner
   - Non-admin cannot assign owner (403)
   - User must belong to org (409)

**Unit Tests Required:**
1. `org-invites.service.spec.ts`:
   - Token hashing (SHA256)
   - Expiration logic
   - Duplicate invite prevention
   - Status transitions

2. `onboarding.service.spec.ts`:
   - `nextRoute` resolution logic for each role

---

## 6. Implementation Notes

### 6.1 Response Format
- All endpoints must use `formatResponse()` helper from `@/shared/helpers/response.helper.ts`
- Returns `{ data: T }` format
- No raw array/object returns

### 6.2 Password Policy
- Minimum 8 characters (per existing `auth-registration.service.ts`)
- Use existing password validation logic

### 6.3 Token Security
- Never store raw token in database
- Never log raw token
- Only return raw token in `POST /api/org-invites` response to admin
- Hash with SHA256 before storage

### 6.4 Existing Endpoints to Reuse
- `POST /api/workspaces` (already exists, no changes needed)
- `GET /api/organizations/onboarding/status` (exists, may extend)
- `POST /api/organizations/onboarding/complete-step` (exists, no changes needed)

### 6.5 Migration Strategy
- Create migration for `org_invites` table
- Add indexes: `organizationId`, `email`, `tokenHash`
- Add unique constraint or enforce in service logic

### 6.6 Module Structure
- New module: `zephix-backend/src/modules/org-invites/`
- Structure:
  - `entities/org-invite.entity.ts`
  - `domain/org-invite.enums.ts`
  - `dto/create-org-invite.dto.ts`
  - `dto/accept-org-invite.dto.ts`
  - `services/org-invites.service.ts`
  - `controllers/org-invites.controller.ts`
  - `org-invites.module.ts`

---

## 7. Dependencies

### 7.1 Existing Services to Use
- `AuthService` (for issuing tokens after invite accept)
- `OrganizationsService` (for org lookup)
- `UsersService` (for user creation)
- `WorkspacesService` (for workspace creation and owner assignment)

### 7.2 Existing Guards to Use
- `JwtAuthGuard` (for authenticated endpoints)
- `RequireOrgRoleGuard` with `@RequireOrgRole(PlatformRole.ADMIN)` (for admin-only endpoints)

### 7.3 Existing Helpers to Use
- `formatResponse()` from `@/shared/helpers/response.helper.ts`
- `TokenHashUtil` (if exists) or implement SHA256 hashing

---

## 8. Out of Scope for Phase 0A

- Email sending (invite links returned in API response, manual distribution)
- Invite revocation UI (backend endpoint can be added later)
- Bulk invite
- Invite resend
- Self-serve signup form (landing page signup)
- Payment integration (billing stays disabled/manual)

---

**Next Steps:**
1. Review and approve this specification
2. Proceed to Slice 1: Backend entity and migration
3. Follow runbook sequence: Slice 1 → Slice 2 → ... → Slice 7
