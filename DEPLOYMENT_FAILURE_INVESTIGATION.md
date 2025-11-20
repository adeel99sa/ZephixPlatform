# Deployment Failure Investigation Report

**Date**: 2025-11-19
**Branch**: `release/v0.5.0-alpha`
**Commit**: `e20f906`

## Summary

Two separate deployment failures identified:
1. **Backend**: NestJS dependency injection failure - `WorkspaceAccessService` cannot be resolved
2. **Frontend**: `npm ci` fails - `package-lock.json` not found in build context

---

## Issue 1: Backend Dependency Injection Failure

### Error Message
```
Error: Nest can't resolve dependencies of the ResourcesService (ResourceRepository, ResourceAllocationRepository, TaskRepository, ProjectRepository, DataSource, ?). Please make sure that the argument WorkspaceAccessService at index [5] is available in the ResourceModule context.
```

### Root Cause

**Circular Dependency Resolution Problem**:

1. `ResourceModule` removed `WorkspacesModule` from imports (to avoid circular dependency)
2. However, three services in `ResourceModule` require `WorkspaceAccessService`:
   - `ResourcesService` (line 30-31)
   - `ResourceRiskScoreService` (line 45-46)
   - `ResourceHeatMapService` (line 16-17)
3. All three services use `@Inject(forwardRef(() => WorkspaceAccessService))` at the **service level**
4. But NestJS requires the **module** to be imported (even with `forwardRef`) for DI container resolution
5. `WorkspaceAccessService` is exported from `WorkspacesModule` (line 48 of `workspaces.module.ts`)
6. Since `ResourceModule` doesn't import `WorkspacesModule`, NestJS cannot resolve the dependency

### Current Module Structure

**ResourceModule** (`resource.module.ts`):
```typescript
@Module({
  imports: [
    TypeOrmModule.forFeature([...]),
    // WorkspacesModule removed - this is the problem
  ],
  providers: [
    ResourcesService,  // Needs WorkspaceAccessService
    ResourceRiskScoreService,  // Needs WorkspaceAccessService
    ResourceHeatMapService,  // Needs WorkspaceAccessService
    ...
  ],
})
```

**WorkspacesModule** (`workspaces.module.ts`):
```typescript
@Module({
  imports: [
    ResourceModule,  // Creates circular dependency
    ...
  ],
  exports: [
    WorkspaceAccessService,  // Exported but not accessible to ResourceModule
    ...
  ],
})
```

### Solution

Use `forwardRef` at the **module level** to break the circular dependency:

**Fix for `resource.module.ts`**:
```typescript
import { Module, forwardRef } from '@nestjs/common';
import { WorkspacesModule } from '../workspaces/workspaces.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([...]),
    forwardRef(() => WorkspacesModule),  // Add this with forwardRef
  ],
  ...
})
```

This allows:
- `ResourceModule` to access `WorkspaceAccessService` from `WorkspacesModule`
- `WorkspacesModule` to access `ResourceRiskScoreService` from `ResourceModule`
- NestJS DI container to resolve both sides of the circular dependency

### Files Requiring Changes

1. `zephix-backend/src/modules/resources/resource.module.ts`
   - Add `forwardRef` import from `@nestjs/common`
   - Add `forwardRef(() => WorkspacesModule)` to imports array

### Verification Steps

After fix:
1. `npm run build` - should compile successfully
2. `npm run start:dev` - should boot without DI errors
3. Check logs for "Nest application successfully started"

---

## Issue 2: Frontend Build Failure

### Error Message
```
npm ERR! The `npm ci` command can only install with an existing package-lock.json or
npm ERR! npm-shrinkwrap.json with lockfileVersion >= 1.
```

### Root Cause

**Build Context Mismatch**:

1. `package-lock.json` exists in repository at: `zephix-frontend/package-lock.json` ✅
2. Railway build is running from: `/app` (repo root) ❌
3. Nixpacks executes: `WORKDIR /app` then `COPY . /app/.` then `RUN npm ci`
4. `npm ci` looks for `package-lock.json` in `/app/` but it's actually in `/app/zephix-frontend/`
5. Railway service root directory is not configured to point to `zephix-frontend/`

### Current State

**Repository Structure**:
```
ZephixApp/
├── zephix-backend/
│   └── package.json
├── zephix-frontend/
│   ├── package.json ✅
│   ├── package-lock.json ✅ (18,406 lines, committed)
│   └── railway.toml
└── ...
```

**Railway Build Process** (from logs):
```
WORKDIR /app
COPY . /app/.
RUN npm ci  # ❌ Looks for /app/package-lock.json, but it's at /app/zephix-frontend/package-lock.json
```

### Solution Options

**Option A: Configure Railway Service Root Directory** (Recommended)

1. In Railway Dashboard → Frontend Service → Settings
2. Set **Root Directory** to: `zephix-frontend`
3. This makes Railway build from `zephix-frontend/` instead of repo root
4. Nixpacks will then find `package.json` and `package-lock.json` in the correct location

**Option B: Move package-lock.json to Repo Root** (Not Recommended)

This would require restructuring the monorepo and is not aligned with the current architecture.

**Option C: Override Install Command in Railway** (Temporary Workaround)

1. In Railway Dashboard → Frontend Service → Settings → Nixpacks
2. Override install command to: `cd zephix-frontend && npm ci`
3. Override build command to: `cd zephix-frontend && npm run build`
4. Override start command to: `cd zephix-frontend && npx serve -s dist -l $PORT`

**Note**: Option C is a workaround. Option A is the correct long-term solution.

### Verification Steps

After fix:
1. Railway build logs should show:
   - `npm ci` running successfully
   - `npm run build` completing
   - No "package-lock.json not found" errors

---

## Recommended Action Plan

### Immediate (Backend)
1. ✅ Fix `ResourceModule` to import `WorkspacesModule` with `forwardRef`
2. ✅ Test locally: `npm run build && npm run start:dev`
3. ✅ Commit and push fix
4. ✅ Monitor Railway backend deployment

### Immediate (Frontend)
1. ⚠️ Check Railway Dashboard → Frontend Service → Settings → Root Directory
2. ⚠️ If root is `/` or empty, change to `zephix-frontend`
3. ⚠️ Trigger new deployment
4. ⚠️ Monitor Railway frontend build logs

### Verification Checklist
- [ ] Backend boots without DI errors
- [ ] Backend `/api/health` endpoint returns 200
- [ ] Frontend build completes successfully
- [ ] Frontend serves static files correctly

---

## Additional Notes

### Why This Happened

**Backend**: The previous fix removed `WorkspacesModule` from `ResourceModule` imports to break a circular dependency, but didn't account for the fact that NestJS still needs the module imported (with `forwardRef`) for DI resolution.

**Frontend**: Railway service was likely configured to build from repo root, but the frontend code lives in a subdirectory. This is a common monorepo deployment configuration issue.

### Prevention

1. **Backend**: Always use `forwardRef` at module level for circular dependencies, not just at service level
2. **Frontend**: Document Railway service root directory configuration in deployment docs
3. **Both**: Add pre-deployment checks to verify module imports and build context

---

## Files Modified Summary

### Backend (Required Fix)
- `zephix-backend/src/modules/resources/resource.module.ts` - Add `forwardRef(() => WorkspacesModule)` to imports

### Frontend (Configuration Only)
- Railway Dashboard configuration - Set Root Directory to `zephix-frontend`

---

**Status**: Investigation Complete - Awaiting Fix Implementation

