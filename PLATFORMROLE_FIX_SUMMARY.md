# PlatformRole Import Error - Root Cause & Fix

## Root Cause
`PlatformRole` was exported as a **type alias** (`export type PlatformRole = 'ADMIN' | 'MEMBER' | 'VIEWER'`), not a runtime value. Type-only exports are stripped at runtime by TypeScript/Vite, so they cannot be imported as values in ESM modules.

## The Problem
Multiple files were trying to import `PlatformRole` as a value and use it like an enum:
- `PlatformRole.ADMIN`
- `PlatformRole.MEMBER`  
- `PlatformRole.VIEWER`

This fails at runtime because `PlatformRole` doesn't exist as a runtime value.

## Files Fixed

### 1. `src/views/workspaces/WorkspacesIndexPage.tsx`
- Changed: `import { isAdminRole, normalizePlatformRole, PlatformRole }` 
- To: `import { isAdminRole, normalizePlatformRole }` + `import type { PlatformRole }`
- Changed: `PlatformRole.MEMBER` → `'MEMBER'`
- Changed: `PlatformRole.VIEWER` → `'VIEWER'`

### 2. `src/features/admin/utils/getOrgUsers.ts`
- Changed: `import { normalizePlatformRole, PlatformRole }`
- To: `import { normalizePlatformRole }` + `import type { PlatformRole }`
- Changed: `PlatformRole.ADMIN` → `'ADMIN'`
- Changed: `PlatformRole.MEMBER` → `'MEMBER'`

### 3. `src/utils/accessMapping.ts`
- Changed: `import { PlatformRole, normalizePlatformRole }`
- To: `import { normalizePlatformRole }` + `import type { PlatformRole }`
- Changed: `case PlatformRole.VIEWER:` → `case 'VIEWER':`
- Changed: `case PlatformRole.ADMIN:` → `case 'ADMIN':`
- Changed: `case PlatformRole.MEMBER:` → `case 'MEMBER':`

### 4. `src/hooks/useWorkspacePermissions.ts`
- Changed: `import { normalizePlatformRole, PlatformRole }`
- To: `import { normalizePlatformRole }` + `import type { PlatformRole }`
- Changed: `platformRole === PlatformRole.VIEWER` → `platformRole === 'VIEWER'`
- Changed: `platformRole: PlatformRole.VIEWER` → `platformRole: 'VIEWER'`

## Solution Pattern
1. Import functions/values in regular import: `import { normalizePlatformRole } from '@/types/roles'`
2. Import types separately: `import type { PlatformRole } from '@/types/roles'`
3. Use string literals instead of enum-style access: `'ADMIN'` instead of `PlatformRole.ADMIN`

## Verification
- ✅ No linter errors
- ✅ All runtime imports fixed
- ✅ Type imports separated correctly
- ✅ String literals used for comparisons

## Note
Test files still use `PlatformRole.ADMIN` etc. in mock data, but that's fine since they're TypeScript-only and not executed at runtime.
