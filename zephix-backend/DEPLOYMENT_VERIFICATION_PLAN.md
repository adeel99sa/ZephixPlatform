# Safe Deployment Verification Plan

## Current Situation

✅ **Database**: Healthy and connected (Docker-based Postgres, 2 months old, ACTIVE)  
⚠️ **Backend**: Deployed from older commit (still has `/api/pm/risk-management` routes)  
✅ **Frontend**: Running successfully  

---

## Step 1: Verify Railway Branch Configuration

### Check Backend Service Branch

**Railway Dashboard → Backend Service → Settings → Source**

**Expected:**
```
Branch: release/v0.5.0-alpha
```

**If Different:**
1. Click "Change Branch"
2. Select `release/v0.5.0-alpha`
3. Save
4. Railway will auto-redeploy

---

## Step 2: Verify Latest Commit in Railway

### Check Deployment Commit Hash

**Railway Dashboard → Backend Service → Deployments → Latest**

**Expected Commit (after PM deprecation):**
```
2fd988c - fix: Update Dockerfile to use Railway PORT variable...
936bace - fix: Add missing risks module files...
3142754 - feat: Complete Week 5 PM deprecation...
```

**If Older Commit:**
- Railway hasn't pulled latest from GitHub
- Solution: Click "Redeploy" button (forces fresh pull)

---

## Step 3: Manual Redeploy (If Needed)

### Trigger Fresh Deployment

**Railway Dashboard → Backend Service → Deployments → "Redeploy"**

**What This Does:**
- Pulls latest code from `release/v0.5.0-alpha`
- Rebuilds with latest changes
- Deploys cleaned version (no `/api/pm/risk-management`)

**Watch For:**
- Build completes successfully
- No TypeScript errors
- Health check passes
- Routes show `/api/risks` (not `/api/pm/risk-management`)

---

## Step 4: Verify Routes After Deployment

### Test Endpoint Availability

**Old Routes (Should NOT Exist):**
```bash
GET /api/pm/risk-management/analyze
# Expected: 404 Not Found
```

**New Routes (Should Exist):**
```bash
GET /api/risks
# Expected: 200 OK or 401 Unauthorized (if auth required)
```

### Quick Verification Script

```bash
# Test old route (should fail)
curl -I https://<your-backend-url>/api/pm/risk-management/analyze
# Expected: 404

# Test new route (should work)
curl -I https://<your-backend-url>/api/risks
# Expected: 200 or 401
```

---

## Step 5: Verify Health Check

**Test:** `GET https://<your-backend-url>/api/health`

**Expected Response:**
```json
{
  "status": "healthy",
  "checks": [
    {
      "name": "Database Connection",
      "status": "healthy",
      "critical": true
    }
  ]
}
```

**If Database Check Fails:**
- This is NOT a database issue (database is healthy)
- Likely temporary connection pool issue
- Wait 30 seconds and retry
- If persists, check Railway backend logs for specific error

---

## Rollback Strategy (If New Deployment Fails)

### Option 1: Revert to Previous Deployment

**Railway Dashboard → Backend Service → Deployments**

1. Find last known-good deployment (before PM deprecation)
2. Click "Redeploy" on that specific deployment
3. This restores previous working version

### Option 2: Emergency Mode (If App Won't Start)

**Railway Dashboard → Backend Service → Variables**

Add:
```
SKIP_DATABASE=true
EMERGENCY_MODE=true
```

This allows app to start without database (health checks work, no data ops).

**Then:**
1. Fix deployment issue
2. Remove emergency variables
3. Redeploy normally

---

## Verification Checklist

After redeploy, verify:

- [ ] Railway shows latest commit hash (2fd988c or later)
- [ ] Build completes without errors
- [ ] Health check returns `200 OK`
- [ ] Database check shows `healthy`
- [ ] Old route `/api/pm/risk-management/*` returns `404`
- [ ] New route `/api/risks` exists
- [ ] Backend logs show no `/api/pm/risk-management` routes
- [ ] Frontend can connect to backend

---

## Common Issues & Fixes

### Issue: "Railway still deploying old code"

**Fix:**
1. Check branch is `release/v0.5.0-alpha`
2. Force redeploy (click "Redeploy" button)
3. Clear Railway build cache if available

### Issue: "Build succeeds but routes still old"

**Fix:**
1. Check Railway is pulling from correct branch
2. Verify commit hash in deployment matches GitHub
3. Check for build cache issues (may need to clear)

### Issue: "Health check fails after redeploy"

**Fix:**
1. Wait 60 seconds (app may still be starting)
2. Check backend logs for startup errors
3. Verify DATABASE_URL is still set (should be auto-populated)
4. Database is healthy (confirmed), so issue is likely app-level

---

## Next Steps

1. **Verify branch** in Railway dashboard
2. **Redeploy backend** manually
3. **Test routes** to confirm old PM routes are gone
4. **Monitor health** endpoint for 5 minutes
5. **Confirm frontend** can connect

**Do NOT:**
- ❌ Touch database (it's healthy)
- ❌ Rebuild database (not needed)
- ❌ Change DATABASE_URL (working correctly)
- ❌ Modify database configuration (no issues)

---

## Success Criteria

✅ Backend deployed from latest commit  
✅ No `/api/pm/risk-management` routes in logs  
✅ `/api/risks` routes available  
✅ Health check shows database healthy  
✅ Frontend connects successfully  

Once all checked, deployment is complete and PM deprecation is live.

