# Phase 0A Slice 0: Repository Pattern Discovery Report

**Date:** 2026-01-03  
**Purpose:** Discover existing patterns before implementing org invites

---

## 1. Auth Login Endpoint and Response Shape

**File:** `zephix-backend/src/modules/auth/auth.controller.ts`  
**Function:** `login()` (line 144-228 in auth.service.ts)

**Endpoint:** `POST /api/auth/login`

**Response Shape:**
```typescript
{
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;  // Normalized platform role
    platformRole: string;  // Explicit enum value
    permissions: {
      isAdmin: boolean;
      canManageUsers: boolean;
      canViewProjects: boolean;
      canManageResources: boolean;
      canViewAnalytics: boolean;
    };
    organizationId: string;
  };
  accessToken: string;
  refreshToken: string;
  sessionId: string;
  organizationId: string;
  expiresIn: number;  // 900 (15 minutes in seconds)
}
```

**Helper Method:** `buildUserResponse(user, orgRole, organization)` in `auth.service.ts` (line 218)

**Notes:**
- Uses `JwtAuthGuard` for authentication
- Password validation via `bcrypt.compare()`
- Generates tokens via `generateToken()` and `generateRefreshToken()`
- Creates `AuthSession` record for session tracking

---

## 2. Password Hashing Function and Password Policy Rules

**Hashing Function:** `bcrypt.hash(password, saltRounds)`

**File:** `zephix-backend/src/modules/auth/services/auth-registration.service.ts`  
**Line:** 166  
**Usage:** `const hashedPassword = await bcrypt.hash(password, 12);`

**Alternative (older pattern):**
- File: `zephix-backend/src/modules/auth/auth.service.ts`  
- Line: 81  
- Usage: `const hashedPassword = await bcrypt.hash(password, 10);`

**Password Policy:**
- **File:** `zephix-backend/src/modules/auth/services/auth-registration.service.ts`  
- **Line:** 78-83  
- **Rule:** Minimum 8 characters
- **Validation:**
  ```typescript
  if (password.length < 8) {
    throw new BadRequestException('Password must be at least 8 characters long');
  }
  ```

**Password Comparison:**
- **File:** `zephix-backend/src/modules/auth/auth.service.ts`  
- **Line:** 161  
- **Usage:** `const isPasswordValid = await bcrypt.compare(password, user.password);`

**⚠️ CRITICAL: Password Hashing for New Users**
- **New user creation (including invite accept) MUST use `bcrypt.hash(password, 12)` to match `auth-registration.service.ts`.**
- **Do not use the older 10 salt rounds pattern from `auth.service.ts`.**
- **This ensures consistency across all new user creation paths.**

---

## 3. Platform Roles Stored on User

**Enum File:** `zephix-backend/src/shared/enums/platform-roles.enum.ts`

**Enum Definition:**
```typescript
export enum PlatformRole {
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
  VIEWER = 'VIEWER', // VIEWER represents view-only users
}
```

**User Entity:**
- **File:** `zephix-backend/src/modules/users/entities/user.entity.ts`
- **Field:** `role: string` (line 45-46)
- **Note:** User.role is a legacy string field. Platform role is determined from `UserOrganization.role` (primary) or normalized from `User.role` (fallback)

**UserOrganization Entity:**
- **File:** `zephix-backend/src/organizations/entities/user-organization.entity.ts`
- **Field:** `role: 'owner' | 'admin' | 'pm' | 'viewer'` (line 35-40)
- **Note:** This is the primary source of truth for organization-level roles

**⚠️ CRITICAL: Role Source of Truth**
- **UserOrganization.role is the source of truth for organization-level roles.**
- **User.role is legacy fallback only.**
- **Any new user creation (including invite accept) MUST create a UserOrganization row with the correct role.**
- **If invite accept only sets User.role without creating UserOrganization, permissions will break in many places.**

**Role Normalization:**
- **File:** `zephix-backend/src/shared/enums/platform-roles.enum.ts`
- **Function:** `normalizePlatformRole(role: string): PlatformRole`
- **Mapping:**
  - `'owner'` / `'admin'` → `PlatformRole.ADMIN`
  - `'pm'` / `'member'` → `PlatformRole.MEMBER`
  - `'viewer'` → `PlatformRole.VIEWER`

**Usage in Auth Service:**
- **File:** `zephix-backend/src/modules/auth/auth.service.ts`
- **Line:** 28 (import), 41 (normalizePlatformRole usage)

---

## 4. Response Wrapper Helper Used by Controllers

**File:** `zephix-backend/src/shared/helpers/response.helper.ts`

**Primary Function:** `formatResponse<T>(data: T): { data: T }`

**Usage Pattern:**
```typescript
import { formatResponse } from '@/shared/helpers/response.helper';

@Get(':id')
async findOne(@Param('id') id: string) {
  const item = await this.service.findById(id);
  return formatResponse(item); // Returns { data: item }
}
```

**Other Helpers:**
- `formatArrayResponse<T>(items: T[] | null | undefined): { data: T[] }`
- `formatPaginatedResponse<T>(...)`
- `formatStatsResponse<T>(...)`

**Enforcement:**
- **File:** `CODE_REVIEW_RULES.md`
- **Rule:** All new controller endpoints must use response helper functions
- **CI Guardrail:** Grep check blocks PRs with raw returns

**Example from Existing Code:**
- **File:** `zephix-backend/src/modules/workspaces/workspaces.controller.ts`
- **Line:** 322
- **Usage:** `return formatResponse({ workspaceId: workspace.id });`

**Auth Response Wrapping Decision:**
- **Login endpoint returns raw auth payload:** `{ user, accessToken, refreshToken, sessionId, organizationId, expiresIn }`
- **For invite accept endpoint, choose ONE pattern and stick to it:**
  - **Option A (Raw):** Return same shape as login (no `formatResponse` wrapper) - matches existing login behavior
  - **Option B (Wrapped):** Wrap in `formatResponse` but keep inner payload identical: `{ data: { user, accessToken, refreshToken, sessionId, organizationId, expiresIn } }`
- **Decision:** Use **Option B (Wrapped)** to comply with CI guardrail requiring `formatResponse` for all new controllers, but ensure frontend token storage logic handles the wrapped format.
- **⚠️ CRITICAL: Frontend must unwrap `response.data` before storing tokens. If frontend does not unwrap, login will work but invite accept will appear broken.**

---

## 5. Guard or Decorator Used to Enforce Org Admin Permissions

**Guard File:** `zephix-backend/src/modules/workspaces/guards/require-org-role.guard.ts`

**Decorator:** `@RequireOrgRole(PlatformRole.ADMIN)`

**Usage Pattern:**
```typescript
import { RequireOrgRoleGuard } from './guards/require-org-role.guard';
import { RequireOrgRole } from './guards/require-org-role.guard';
import { PlatformRole } from '@/shared/enums/platform-roles.enum';

@UseGuards(JwtAuthGuard, RequireOrgRoleGuard)
@RequireOrgRole(PlatformRole.ADMIN)
@Post('some-endpoint')
async someMethod() {
  // Only org admins can access
}
```

**Guard Implementation:**
- **File:** `zephix-backend/src/modules/workspaces/guards/require-org-role.guard.ts`
- **Class:** `RequireOrgRoleGuard` (implements `CanActivate`)
- **Method:** `canActivate(context: ExecutionContext): boolean`
- **Logic:** Normalizes user role and required role, checks role hierarchy (ADMIN > MEMBER > VIEWER)

**Examples in Existing Code:**
- **File:** `zephix-backend/src/billing/controllers/billing.controller.ts`
- **Lines:** 127-128, 183-184, 226-227
- **Usage:** `@UseGuards(RequireOrgRoleGuard)` + `@RequireOrgRole(PlatformRole.ADMIN)`

**Module Registration:**
- Guard must be added to module `providers` array
- **Example:** `zephix-backend/src/billing/billing.module.ts` (line 26)

---

## 6. Workspace Membership Tables and Role Assignment Logic

**Workspace Member Entity:**
- **File:** `zephix-backend/src/modules/workspaces/entities/workspace-member.entity.ts`
- **Table:** `workspace_members`
- **Fields:**
  - `id: uuid` (primary key)
  - `workspaceId: uuid` (indexed)
  - `userId: uuid` (indexed)
  - `role: WorkspaceRole` (indexed)
  - `status: 'active' | 'suspended'`
  - `createdAt`, `updatedAt`, `createdBy`, `updatedBy`
- **Unique Constraint:** `UX_wm_ws_user` on `(workspaceId, userId)`

**Workspace Role Type:**
- **File:** `zephix-backend/src/modules/workspaces/entities/workspace.entity.ts`
- **Lines:** 39-44
- **Type:** `WorkspaceRole = 'workspace_owner' | 'workspace_member' | 'workspace_viewer' | 'delivery_owner' | 'stakeholder'`

**Workspace Members Service:**
- **File:** `zephix-backend/src/modules/workspaces/services/workspace-members.service.ts`
- **Method:** `addExisting(workspaceId, userId, role, actor)` (line 83)
- **Logic:**
  1. Validates user belongs to organization
  2. Enforces VIEWER → workspace_viewer mapping (line 135-138)
  3. Checks if member already exists (idempotent)
  4. Updates role if different, or creates new member record
  5. Logs event: `workspace.member.added`

**⚠️ CRITICAL: Workspace Owner Assignment**
- **Onboarding "assign owner" MUST use `WorkspaceMembersService.addExisting()` with role `'workspace_owner'`.**
- **Do NOT write directly to `workspace_members` table.**
- **The service handles validation, idempotency, and event logging.**

**Role Assignment Rules:**
- **File:** `zephix-backend/src/modules/workspaces/services/workspace-members.service.ts`
- **Lines:** 132-146
- **Rules:**
  - Viewer users (PlatformRole.VIEWER) ALWAYS map to `workspace_viewer`
  - Project-scoped roles (`delivery_owner`, `stakeholder`) cannot be assigned at workspace level
  - At least one `workspace_owner` must exist (enforced elsewhere)

**Workspace Creation with Owners:**
- **File:** `zephix-backend/src/modules/workspaces/workspaces.service.ts`
- **Method:** `createWithOwners(payload)` (line 262+)
- **Logic:** Creates workspace, then adds owners via `workspaceMembersService.addExisting()`

**Example Usage:**
```typescript
// Add user as workspace owner
await workspaceMembersService.addExisting(
  workspaceId,
  userId,
  'workspace_owner',
  actor
);
```

---

## Summary: Key Patterns to Follow

1. **Login Response:** Use `buildUserResponse()` helper, return `{ user, accessToken, refreshToken, sessionId, organizationId, expiresIn }`

2. **Password Hashing:** Use `bcrypt.hash(password, 12)` for new users (matches `auth-registration.service.ts`), validate minimum 8 characters

3. **Platform Roles:** Use `PlatformRole` enum from `@/shared/enums/platform-roles.enum.ts`, normalize via `normalizePlatformRole()`. **UserOrganization.role is source of truth - must create UserOrganization row for new users.**

4. **Response Format:** Always use `formatResponse()` from `@/shared/helpers/response.helper.ts`. For invite accept, wrap auth payload: `{ data: { user, accessToken, refreshToken, sessionId, organizationId, expiresIn } }`

5. **Admin Guard:** Use `@UseGuards(JwtAuthGuard, RequireOrgRoleGuard)` + `@RequireOrgRole(PlatformRole.ADMIN)`. Import existing guard from `workspaces/guards`, do not duplicate.

6. **Workspace Membership:** Use `WorkspaceMember` entity and `WorkspaceMembersService.addExisting()` for role assignment. Use role `'workspace_owner'` for owner assignment.

---

**Next Step:** Proceed to Slice 1 with these patterns locked in.
