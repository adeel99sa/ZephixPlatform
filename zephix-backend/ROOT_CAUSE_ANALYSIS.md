# Root Cause Analysis - Three Back-to-Back Failures

## Issue Summary

**Three consecutive deployment failures:**

1. **Build Error #1**: `getUserByEmail` doesn't exist (TypeScript compilation)
2. **Runtime Error #1**: `AuthRegistrationService` can't be resolved (dependency injection)
3. **Runtime Error #2**: Same `AuthRegistrationService` error (repeated)

## Root Cause #1: Build Error

**Error:**
```
src/modules/auth/auth.controller.ts:132:41 - error TS2551: Property 'getUserByEmail' does not exist on type 'AuthService'.
```

**Root Cause:**
- Railway is deploying an **OLD commit** that still has `getUserByEmail` call
- Fix commit `0c3b172` exists but Railway hasn't deployed it
- Local code is correct (uses `userRepository.findOne`)

**Evidence:**
- Local file shows: `this.userRepository.findOne({ where: { email: dto.email.toLowerCase() } })`
- Railway build shows: `this.authService.getUserByEmail(dto.email)`
- This means Railway is building from commit BEFORE `0c3b172`

**Fix:**
- Verify Railway is deploying latest commit
- Force redeploy if needed
- Check Railway deployment commit hash matches `0c3b172` or later

## Root Cause #2: Runtime Dependency Injection Error

**Error:**
```
Nest can't resolve dependencies of the AuthController (AuthService, ?, EmailVerificationService, UserOrganizationRepository, UserRepository).
Please make sure that the argument AuthRegistrationService at index [1] is available in the AuthModule context.
```

**Root Cause:**
- `AuthRegistrationService` is in providers array ✅
- All entities are in `TypeOrmModule.forFeature` ✅
- But NestJS can't resolve `AuthRegistrationService` dependencies

**Possible Causes:**
1. **Missing DataSource injection** - `AuthRegistrationService` needs `DataSource` but it might not be available
2. **Circular dependency** - `AuthRegistrationService` might depend on something that depends on `AuthController`
3. **Entity not properly registered** - One of the entities in `AuthRegistrationService` constructor isn't in `forFeature`
4. **TokenHashUtil issue** - Static class might be causing issues (unlikely but possible)

**Dependencies of AuthRegistrationService:**
- `@InjectRepository(User)` ✅
- `@InjectRepository(Organization)` ✅
- `@InjectRepository(UserOrganization)` ✅
- `@InjectRepository(Workspace)` ✅
- `@InjectRepository(WorkspaceMember)` ✅
- `@InjectRepository(EmailVerificationToken)` ✅
- `@InjectRepository(AuthOutbox)` ✅
- `DataSource` ✅ (provided by TypeORM)

**All entities are in forFeature array, so the issue must be:**
- Railway is deploying old code where entities aren't registered
- OR there's a circular dependency
- OR DataSource isn't available in the module context

## Verification Steps

### 1. Check Railway Deployment Commit
```bash
# In Railway dashboard, check:
# - Latest deployment commit hash
# - Should be 0c3b172 or later
```

### 2. Verify Local Build
```bash
cd zephix-backend
npm run build
# Should succeed with no errors
```

### 3. Check Module Registration
```bash
# Verify AuthRegistrationService is in providers
grep -A 10 "providers:" zephix-backend/src/modules/auth/auth.module.ts
```

### 4. Check for Circular Dependencies
```bash
# Look for imports that might create cycles
grep -r "AuthRegistrationService" zephix-backend/src/modules/auth/
```

## Immediate Fix

1. **Force Railway to deploy latest commit:**
   - Check Railway dashboard for commit hash
   - If not latest, trigger manual redeploy
   - Clear build cache if needed

2. **Verify all dependencies are available:**
   - Ensure `DataSource` is available (TypeORM provides it)
   - Check for circular dependencies
   - Verify all entities are in `TypeOrmModule.forFeature`

3. **Add explicit DataSource import if needed:**
   - TypeORM should provide DataSource automatically
   - But we can explicitly import it if needed

---

**Status:** 🔍 **INVESTIGATING - Need to verify Railway deployment commit and module dependencies**

