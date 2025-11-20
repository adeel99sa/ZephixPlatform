# Route Diff Viewer - PM Deprecation Verification

## Routes That Should NOT Exist (Old PM Routes)

These routes should return **404 Not Found** after PM deprecation:

```
❌ POST   /api/pm/risk-management/analyze
❌ GET    /api/pm/risk-management/register/:projectId
❌ GET    /api/pm/risk-management/forecasting/:projectId
❌ GET    /api/pm/risk-management/:id
❌ PUT    /api/pm/risk-management/:id
❌ DELETE /api/pm/risk-management/:id
```

**Controller:** `RiskManagementController` from `src/pm/risk-management/risk-management.controller.ts`  
**Status:** Should be **DELETED** (entire `src/pm` directory removed)

---

## Routes That SHOULD Exist (New Risks Routes)

These routes should return **200 OK** (or 401/403 if auth required):

```
✅ POST   /api/risks/analyze
✅ GET    /api/risks
✅ GET    /api/risks/:id
✅ PUT    /api/risks/:id
✅ DELETE /api/risks/:id
```

**Controller:** `RiskManagementController` from `src/modules/risks/controllers/risks.controller.ts`  
**Status:** Should be **ACTIVE** (under `RisksModule`)

---

## Quick Test Commands

### Test Old Routes (Should Fail)

```bash
# Replace with your Railway backend URL
BACKEND_URL="https://your-backend-url.railway.app"

# Test old analyze endpoint
curl -X POST "$BACKEND_URL/api/pm/risk-management/analyze" \
  -H "Content-Type: application/json" \
  -d '{"projectId":"test"}'

# Expected: 404 Not Found
```

### Test New Routes (Should Work)

```bash
# Test new risks endpoint
curl -X GET "$BACKEND_URL/api/risks"

# Expected: 200 OK (or 401 Unauthorized if auth required)
```

---

## Railway Logs Verification

After redeploy, check Railway backend logs for route registration:

### ❌ BAD (Old Routes Still Present)

```
[RoutesResolver] RiskManagementController {/api/pm/risk-management}:
  POST   /api/pm/risk-management/analyze
  GET    /api/pm/risk-management/register/:projectId
```

**Meaning:** Railway deployed old commit (before PM deprecation)

### ✅ GOOD (New Routes Only)

```
[RoutesResolver] RiskManagementController {/api/risks}:
  POST   /api/risks/analyze
  GET    /api/risks
  GET    /api/risks/:id
```

**Meaning:** Railway deployed latest commit (PM deprecation complete)

---

## Module Verification

### Check Which Module is Loaded

**Railway Backend Logs → Search for:**

```
✅ GOOD:
"RisksModule dependencies initialized"
"DashboardModule loaded" (should import RisksModule)

❌ BAD:
"RiskManagementModule dependencies initialized" (from src/pm)
```

---

## Automated Verification

Run the verification script:

```bash
cd zephix-backend
./scripts/verify-deployment-routes.sh
```

Or set BACKEND_URL and run:

```bash
BACKEND_URL="https://your-backend-url.railway.app" ./scripts/verify-deployment-routes.sh
```

---

## What to Do If Old Routes Still Exist

1. **Check Railway Branch:**
   ```bash
   ./scripts/check-railway-branch.sh
   ```
   Or manually: Railway Dashboard → Backend → Settings → Source → Branch

2. **Force Redeploy:**
   - Railway Dashboard → Backend → Deployments → "Redeploy"
   - This pulls latest from GitHub

3. **Verify Commit Hash:**
   - Railway Dashboard → Backend → Deployments → Latest
   - Should show: `2fd988c` or later (after PM deprecation commits)

4. **Check Build Logs:**
   - Railway Dashboard → Backend → Deployments → Latest → Build Logs
   - Should show: `npm run build` completes successfully
   - Should NOT show: TypeScript errors about missing `src/pm` files

---

## Expected State After Successful Deployment

✅ **Routes:**
- `/api/pm/risk-management/*` → 404 (all routes)
- `/api/risks/*` → 200/401/403 (routes exist)

✅ **Logs:**
- No references to `src/pm/risk-management`
- Routes show `/api/risks` prefix
- `RisksModule` loaded successfully

✅ **Health Check:**
- `GET /api/health` → 200 OK
- Database check: healthy
- No errors in logs

✅ **Modules:**
- `DashboardModule` imports `RisksModule` (not `RiskManagementModule`)
- `RisksModule` from `src/modules/risks` (not `src/pm`)

---

## Summary

**If old routes exist:** Railway deployed wrong commit → Fix branch/redeploy  
**If new routes work:** PM deprecation is live → Success ✅

