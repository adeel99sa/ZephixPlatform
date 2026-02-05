# Cursor Rules Validation Report

## Step 1: Rule Sources Confirmed

### Existing Rules
- `.cursorrules` (repo root) - Contains Zephix Enterprise v3 rules (533 lines)
- `.cursor/rules/zephixapp.mdc` - Existing rule file (duplicate of .cursorrules content)

### New Rules Created
- `.cursor/rules/00-zephix-core.mdc` - Core engineering rules (alwaysApply: true)
- `.cursor/rules/10-zephix-backend.mdc` - Backend rules (applies to `zephix-backend/**/*`)
- `.cursor/rules/20-zephix-frontend.mdc` - Frontend rules (applies to `zephix-frontend/**/*`)
- `.cursor/rules/30-zephix-security.mdc` - Security rules (alwaysApply: true)

### Rule Application
- **Global (alwaysApply: true):**
  - `00-zephix-core.mdc` - Core engineering rules
  - `30-zephix-security.mdc` - Security and tenancy rules
  - `.cursorrules` - Legacy comprehensive rules (still active)

- **Backend (zephix-backend/**/*):**
  - `10-zephix-backend.mdc` - NestJS and TypeORM standards

- **Frontend (zephix-frontend/**/*):**
  - `20-zephix-frontend.mdc` - React and routing standards

---

## Step 2: Platform Reality Validation

### PlatformRole Values ✅ VERIFIED
**Location:** `zephix-backend/src/shared/enums/platform-roles.enum.ts`

```typescript
export enum PlatformRole {
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
  VIEWER = 'VIEWER', // VIEWER represents Guest users (free, view only)
}
```

**Status:** ✅ VIEWER equals Guest (confirmed in enum comment and LEGACY_ROLE_MAPPING)

### normalizePlatformRole Helper ✅ VERIFIED
**Location:** `zephix-backend/src/shared/enums/platform-roles.enum.ts`

**Call Sites Found:**
- Backend: 26 files using `normalizePlatformRole`
- Frontend: 8 files using `normalizePlatformRole`

**Helper Functions Available:**
- `normalizePlatformRole(role)` - Normalizes legacy roles to PlatformRole
- `isAdminRole(role)` - Checks if role is ADMIN
- `canCreateWorkspaces(role)` - Checks if role can create workspaces

---

## Step 3: Legacy Role Usage Found

### Backend Legacy Role Usage

#### File 1: `zephix-backend/src/shared/guards/admin.guard.ts`
**Issue:** Direct string comparison with legacy values
```typescript
const isAdmin = user.role === 'admin' || user.role === 'owner';
```
**Fix Required:** Use `isAdminRole(normalizePlatformRole(user.role))`

#### File 2: `zephix-backend/src/scripts/test-admin-access.ts`
**Issue:** Direct string comparisons (lines 76, 89)
```typescript
if (userOrg.role !== 'admin' && userOrg.role !== 'owner') {
  // ...
}
const isOrgAdmin = userOrg.role === 'admin' || userOrg.role === 'owner';
```
**Fix Required:** Use `isAdminRole(normalizePlatformRole(userOrg.role))`

#### File 3: `zephix-backend/src/modules/workspaces/workspaces.service.ts`
**Issue:** Workspace role comparisons (lines 325, 488)
```typescript
if (existingMember.role !== 'workspace_owner') {
  // ...
}
```
**Status:** ✅ ACCEPTABLE - This is workspace role (`workspace_owner`), not platform role. Workspace roles are separate from platform roles and this comparison is correct.
**Action:** No fix needed - workspace roles are intentionally separate from platform roles.

### Frontend Legacy Role Usage

#### File 1: `zephix-frontend/src/utils/roles.ts`
**Issue:** Direct string comparisons (lines 119, 126)
```typescript
return role === 'ADMIN' || role === 'MEMBER';
```
**Status:** ⚠️ PLATFORM_ROLE constants already exist in same file - should use `PLATFORM_ROLE.ADMIN` and `PLATFORM_ROLE.MEMBER`
**Fix:** Replace with `role === PLATFORM_ROLE.ADMIN || role === PLATFORM_ROLE.MEMBER`

#### File 2: `zephix-frontend/src/services/adminApi.ts`
**Issue:** Legacy role mapping (line 45)
```typescript
const backendRole = role === 'pm' ? 'member' : role;
```
**Fix Required:** Use `normalizePlatformRole` helper

---

## Step 4: Refactor Checklist

### Backend Refactors

#### ✅ Priority 1: Security-Critical
1. **`zephix-backend/src/shared/guards/admin.guard.ts`**
   - **Current:** `user.role === 'admin' || user.role === 'owner'`
   - **Fix:** `isAdminRole(normalizePlatformRole(user.role))`
   - **Risk:** High - Security guard, must be correct
   - **Effort:** 1 line change

2. **`zephix-backend/src/modules/workspaces/workspaces.service.ts`**
   - **Current:** `existingMember.role !== 'workspace_owner'`
   - **Status:** ⚠️ Verify if this is workspace role (acceptable) or platform role (needs fix)
   - **Action:** Check if `workspace_owner` is a WorkspaceRole enum value or legacy string
   - **Effort:** Investigation + 2 line changes if needed

#### ⚠️ Priority 2: Scripts (Lower Priority)
3. **`zephix-backend/src/scripts/test-admin-access.ts`**
   - **Current:** Multiple `userOrg.role !== 'admin'` comparisons
   - **Fix:** Use `isAdminRole(normalizePlatformRole(userOrg.role))`
   - **Risk:** Low - Test script only
   - **Effort:** 2-3 line changes

### Frontend Refactors

#### ✅ Priority 1: Consistency
4. **`zephix-frontend/src/utils/roles.ts`**
   - **Current:** `role === 'ADMIN' || role === 'MEMBER'`
   - **Fix:** Use `PLATFORM_ROLE.ADMIN` and `PLATFORM_ROLE.MEMBER` constants
   - **Risk:** Medium - Role gating logic
   - **Effort:** 2 line changes

5. **`zephix-frontend/src/services/adminApi.ts`**
   - **Current:** `role === 'pm' ? 'member' : role`
   - **Fix:** Use `normalizePlatformRole(role)` helper
   - **Risk:** Medium - API contract
   - **Effort:** 1 line change

---

## Step 5: File-by-File Refactor Checklist

### Backend Files

- [ ] **`zephix-backend/src/shared/guards/admin.guard.ts`**
  - [ ] Import `normalizePlatformRole` and `isAdminRole` from `platform-roles.enum`
  - [ ] Replace `user.role === 'admin' || user.role === 'owner'` with `isAdminRole(normalizePlatformRole(user.role))`
  - [ ] Run tests: `npm run test -- admin.guard.spec.ts`
  - [ ] Verify build: `npm run build`

- [x] **`zephix-backend/src/modules/workspaces/workspaces.service.ts`**
  - [x] Verified: `workspace_owner` is a workspace role (not platform role)
  - [x] Status: No fix needed - workspace roles are separate domain
  - [ ] (Optional) Consider creating WorkspaceRole enum for type safety

- [ ] **`zephix-backend/src/scripts/test-admin-access.ts`**
  - [ ] Import `normalizePlatformRole` and `isAdminRole`
  - [ ] Replace all `userOrg.role !== 'admin'` comparisons
  - [ ] Replace all `userOrg.role === 'admin' || userOrg.role === 'owner'` comparisons
  - [ ] Verify script still works: `npm run test-admin-access` (if script exists)

### Frontend Files

- [ ] **`zephix-frontend/src/utils/roles.ts`**
  - [x] Verified: `PLATFORM_ROLE` constants already exist in same file (lines 18-22)
  - [ ] Replace `role === 'ADMIN'` (line 119) with `role === PLATFORM_ROLE.ADMIN`
  - [ ] Replace `role === 'MEMBER'` (line 119) with `role === PLATFORM_ROLE.MEMBER`
  - [ ] Replace `role === 'ADMIN'` (line 126) with `role === PLATFORM_ROLE.ADMIN`
  - [ ] Replace `role === 'MEMBER'` (line 126) with `role === PLATFORM_ROLE.MEMBER`
  - [ ] Run typecheck: `npm run typecheck`
  - [ ] Run lint: `npm run lint:new`

- [ ] **`zephix-frontend/src/services/adminApi.ts`**
  - [ ] Import `normalizePlatformRole` from `@/utils/roles`
  - [ ] Replace `role === 'pm' ? 'member' : role` with `normalizePlatformRole(role)`
  - [ ] Verify API contract still works
  - [ ] Run typecheck: `npm run typecheck`

---

## Summary

### Rules Status
✅ **4 new rule files created** in `.cursor/rules/`
✅ **PlatformRole enum verified** - VIEWER = Guest confirmed
✅ **normalizePlatformRole helper verified** - 34 call sites found (26 backend, 8 frontend)

### Gaps Found
⚠️ **4 files with legacy role usage requiring fixes:**
- 2 backend files (1 security-critical guard, 1 test script)
- 2 frontend files (1 utility, 1 API service)

✅ **1 file verified as acceptable:**
- `workspaces.service.ts` - Uses workspace roles (separate domain), no fix needed

### Fixes Required
**High Priority (Security):**
1. ✅ `admin.guard.ts` - Security guard using legacy role strings
   - **Impact:** Security-critical authentication guard
   - **Fix:** Use `isAdminRole(normalizePlatformRole(user.role))`

**Medium Priority (Consistency):**
2. ✅ `roles.ts` (frontend) - Use constants instead of string literals
   - **Impact:** Role gating logic consistency
   - **Fix:** Replace `'ADMIN'`/`'MEMBER'` with `PLATFORM_ROLE.ADMIN`/`PLATFORM_ROLE.MEMBER`

3. ✅ `adminApi.ts` (frontend) - Use normalizePlatformRole helper
   - **Impact:** API contract consistency
   - **Fix:** Replace manual mapping with `normalizePlatformRole(role)`

**Low Priority (Scripts):**
4. ✅ `test-admin-access.ts` - Test script, lower risk
   - **Impact:** Test script only
   - **Fix:** Use `isAdminRole(normalizePlatformRole(userOrg.role))`

### Next Steps
1. **IMMEDIATE:** Fix `admin.guard.ts` (security-critical)
2. Update `roles.ts` to use PLATFORM_ROLE constants
3. Update `adminApi.ts` to use normalizePlatformRole
4. Update `test-admin-access.ts` script (low priority)

---

**Report Generated:** 2025-01-XX
**Rule Files:** 4 new + 1 existing = 5 total
**Legacy Usage Found:** 4 files requiring fixes (1 verified acceptable)
**Security Risks:** 1 high-priority fix required (`admin.guard.ts`)
