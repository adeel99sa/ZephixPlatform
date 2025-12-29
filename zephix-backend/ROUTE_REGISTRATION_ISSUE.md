# Route Registration Issue - AuthController Missing

## Problem

**From startup logs analysis:**
- ✅ Templates routes: `Mapped {/api/templates, GET} route` - **CORRECT**
- ✅ Integrations routes: `Mapped {/api/integrations, POST} route` - **CORRECT**
- ❌ **AuthController routes: NOT FOUND in logs**

## Expected vs Actual

### Expected in logs:
```
[Nest] LOG [RoutesResolver] AuthController {/api/auth}:
[Nest] LOG [RouterExplorer] Mapped {/api/auth/register, POST} route
[Nest] LOG [RouterExplorer] Mapped {/api/auth/signup, POST} route
[Nest] LOG [RouterExplorer] Mapped {/api/auth/login, POST} route
```

### Actual in logs:
- **No `RoutesResolver] AuthController` line**
- **No auth route mappings**

## Possible Causes

1. **Dependency Injection Failure**
   - `AuthRegistrationService` or `EmailVerificationService` failing to instantiate
   - Missing entity repositories
   - Missing `TokenHashUtil` or other dependencies

2. **Module Registration Issue**
   - `AuthModule` not properly imported in `AppModule`
   - Controller not in `controllers` array (but it is - verified)

3. **Runtime Error During Initialization**
   - Error during `AuthController` constructor
   - Error during route discovery
   - Missing imports or circular dependencies

4. **Build/Deployment Issue**
   - `AuthController` not included in build
   - Old deployment still running

## Verification Steps

### 1. Check for Errors in Logs
Look for any errors before route registration:
- `ERROR` messages
- `Cannot find module` errors
- `Dependency injection` errors
- `TypeORM` entity errors

### 2. Check if Other Auth Controllers Work
```bash
# Test organization-signup controller
curl -X POST https://zephix-backend-production.up.railway.app/api/auth/organization/signup

# Test invites controller
curl -X GET https://zephix-backend-production.up.railway.app/api/orgs/:orgId/invites
```

### 3. Check Build Output
Verify `AuthController` is in compiled code:
```bash
grep -r "AuthController" dist/src/modules/auth/
```

### 4. Check for Missing Dependencies
Verify all services are available:
- `AuthRegistrationService` ✅ (in module)
- `EmailVerificationService` ✅ (in module)
- `TokenHashUtil` ❓ (check if file exists)
- Entity repositories ❓ (check if entities are registered)

## Next Steps

1. **Check Railway logs for errors** before route registration
2. **Verify commit deployed** is `b5740e8` or later
3. **Check if `TokenHashUtil` file exists** in deployment
4. **Check for TypeORM entity registration errors**

## Files to Verify

- ✅ `src/modules/auth/auth.controller.ts` - exists
- ✅ `src/modules/auth/auth.module.ts` - controller registered
- ❓ `src/common/security/token-hash.util.ts` - verify exists
- ❓ Entity files - verify all exist

---

**Status:** 🔍 **INVESTIGATING - AuthController not registering**

