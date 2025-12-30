# Production Verification Checklist - Commit ccaecb4

**Date:** 2025-12-29  
**Commit:** `ccaecb4` - fix(auth): resolve build + DI and add deploy gates

## Pre-Deployment Verification

- [x] Local build passes: `npm run build`
- [x] Smoke test passes: `npm run test:smoke`
- [x] Guard script passes: `npm run guard:deploy`
- [x] AuthRegistrationService in AuthModule.providers
- [x] No `getUserByEmail` calls in AuthController

## Railway Deployment Verification

### 1. Confirm Railway Deployed Commit ccaecb4

**Steps:**
1. Open Railway Dashboard → `zephix-backend` service
2. Go to **Deployments** tab
3. Open latest deployment
4. Check **Commit Hash** field

**Expected:** `ccaecb4` or later

**If different:**
- Trigger manual redeploy
- Verify branch is `chore/hardening-baseline` or `main`
- Check Railway service settings → Source → Branch

---

### 2. Confirm AuthController is Registering

**Steps:**
1. Railway Dashboard → `zephix-backend` → Latest Deployment → **Logs**
2. Search for: `RoutesResolver] AuthController`
3. Search for: `Mapped {/api/auth`

**Expected Log Lines:**
```
[Nest] LOG [RoutesResolver] AuthController {/api/auth}:
[Nest] LOG [RouterExplorer] Mapped {/api/auth/register, POST} route
[Nest] LOG [RouterExplorer] Mapped {/api/auth/signup, POST} route
[Nest] LOG [RouterExplorer] Mapped {/api/auth/login, POST} route
[Nest] LOG [RouterExplorer] Mapped {/api/auth/resend-verification, POST} route
[Nest] LOG [RouterExplorer] Mapped {/api/auth/verify-email, POST} route
```

**If missing:**
- AuthController failed to instantiate (DI error)
- Check logs for: `Nest can't resolve dependencies of the AuthController`
- Verify `AuthRegistrationService` is in `AuthModule.providers`

---

### 3. Hit the Endpoint Directly

**Test Command:**
```bash
curl -X POST https://zephix-backend-production.up.railway.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!@#",
    "fullName": "Test User",
    "orgName": "Test Org"
  }'
```

**Expected Responses:**
- ✅ `200 OK` with `{"message": "..."}` (neutral response)
- ✅ `400 Bad Request` with validation errors
- ❌ `404 Not Found` → Routes not registered (check step 2)

**Alternative Test (Swagger):**
1. Open: `https://zephix-backend-production.up.railway.app/api/docs`
2. Find: `POST /api/auth/register`
3. Click "Try it out"
4. Fill in test data
5. Click "Execute"

**Expected:** 200 or 400, NOT 404

---

### 4. Verify DI Stability Under Cold Start

**Steps:**
1. Railway Dashboard → `zephix-backend` → **Deployments**
2. Click **"Redeploy"** button
3. Watch deployment logs
4. Search for: `Nest can't resolve dependencies`

**Expected:**
- ✅ No DI errors
- ✅ `RoutesResolver] AuthController` appears
- ✅ All auth routes mapped

**If DI error appears:**
- Check `AuthModule.providers` includes all controller dependencies
- Verify all service dependencies are available
- Check Railway logs for full error message

---

## Hardening Verification

### CI Gate
- [ ] Verify `.github/workflows/ci.yml` has `guard:deploy` step
- [ ] Verify `.github/workflows/enterprise-ci.yml` has `guard:deploy` step
- [ ] Test: Create PR, verify CI runs `guard:deploy` and blocks if it fails

### Railway Build Step
- [ ] Verify `railway.toml` has `buildCommand = "npm ci && npm run build"`
- [ ] Verify Railway deployment fails if build fails (check failed deployment logs)

### Auth Module Ownership Rule
- [ ] Verify `docs/AUTH_MODULE_OWNERSHIP_RULE.md` exists
- [ ] Review rule with team
- [ ] Add to code review checklist

---

## Success Criteria

✅ **All checks pass:**
1. Railway deployed commit `ccaecb4`
2. Logs show `RoutesResolver] AuthController`
3. `POST /api/auth/register` returns 200 or 400 (not 404)
4. No DI errors on redeploy
5. CI gates block merges if `guard:deploy` fails
6. Railway build fails fast on build errors

---

## Failure Recovery

**If AuthController not registering:**
1. Check Railway logs for DI error
2. Verify `AuthRegistrationService` in `AuthModule.providers`
3. Check all service dependencies are available
4. Run `npm run guard:deploy` locally to reproduce

**If build fails in Railway:**
1. Check Railway logs for TypeScript errors
2. Verify `railway.toml` `buildCommand` is correct
3. Test build locally: `npm ci && npm run build`
4. Fix errors and redeploy

**If CI gate not blocking:**
1. Verify workflow file has `guard:deploy` step
2. Test by creating PR with intentional build error
3. Verify CI fails and blocks merge

---

**Last Updated:** 2025-12-29  
**Next Review:** After Railway deployment of ccaecb4
