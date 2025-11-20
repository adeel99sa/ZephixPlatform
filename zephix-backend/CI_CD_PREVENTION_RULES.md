# CI/CD Rules to Prevent Old Commits from Deploying

## Problem

Railway can deploy old commits if:
- Branch configuration is wrong
- Auto-deploy is misconfigured
- Build cache serves stale code
- Manual redeploy selects wrong deployment

## Prevention Rules

### 1. Railway Branch Lock

**Railway Dashboard → Backend Service → Settings → Source**

**Rule:** Always lock branch to `release/v0.5.0-alpha` (or current release branch)

**How to Set:**
1. Settings → Source → Branch
2. Select `release/v0.5.0-alpha`
3. Enable "Lock Branch" (if available)
4. Save

**Verification:**
- After any code push, verify Railway shows correct branch
- Check deployment commit hash matches GitHub

---

### 2. Pre-Deploy Verification Hook

**Add to `.github/workflows/railway-deploy.yml` (if using GitHub Actions):**

```yaml
name: Railway Deploy Verification

on:
  push:
    branches:
      - release/v0.5.0-alpha

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Verify PM deprecation
        run: |
          # Check that src/pm directory doesn't exist
          if [ -d "zephix-backend/src/pm" ]; then
            echo "❌ ERROR: src/pm directory still exists"
            exit 1
          fi
          
          # Check that DashboardModule uses RisksModule
          if grep -q "from '../pm/risk-management" zephix-backend/src/dashboard/dashboard.module.ts; then
            echo "❌ ERROR: DashboardModule still imports from src/pm"
            exit 1
          fi
          
          # Check that RisksModule exists
          if [ ! -f "zephix-backend/src/modules/risks/risks.module.ts" ]; then
            echo "❌ ERROR: RisksModule not found"
            exit 1
          fi
          
          echo "✅ PM deprecation verification passed"
```

---

### 3. Railway Auto-Deploy Configuration

**Railway Dashboard → Backend Service → Settings → Deploy**

**Recommended Settings:**
- ✅ **Auto Deploy:** Enabled
- ✅ **Branch:** `release/v0.5.0-alpha`
- ✅ **Watch Paths:** `zephix-backend/**` (if monorepo)
- ✅ **Deploy on Push:** Yes

**Avoid:**
- ❌ Auto-deploy from `main` or `master`
- ❌ Manual deploy without branch check
- ❌ Deploying from feature branches

---

### 4. Deployment Verification Checklist

**Before marking deployment as "production ready":**

```bash
# Run verification script
cd zephix-backend
./scripts/verify-deployment-routes.sh

# Expected output:
# ✅ Old PM routes return 404
# ✅ New risks routes exist
# ✅ Health check passes
```

**Manual Checks:**
- [ ] Railway deployment shows latest commit hash
- [ ] Backend logs show `/api/risks` routes (not `/api/pm/risk-management`)
- [ ] Health endpoint returns 200 OK
- [ ] Database check shows healthy

---

### 5. Railway Build Cache Management

**If Railway serves stale builds:**

**Railway Dashboard → Backend Service → Settings → Build**

**Options:**
- Clear build cache before deploy
- Use "Rebuild from scratch" option
- Disable build cache for critical deployments

**CLI Command (if available):**
```bash
railway redeploy --no-cache
```

---

### 6. Commit Hash Verification

**Add to deployment process:**

```bash
# Get latest commit hash from GitHub
LATEST_COMMIT=$(git rev-parse HEAD)

# Check Railway deployment commit
RAILWAY_COMMIT=$(railway status --json | jq -r '.deployment.commit')

# Verify they match
if [ "$LATEST_COMMIT" != "$RAILWAY_COMMIT" ]; then
  echo "❌ ERROR: Railway deployed wrong commit"
  echo "  Latest: $LATEST_COMMIT"
  echo "  Railway: $RAILWAY_COMMIT"
  exit 1
fi
```

---

### 7. Route Monitoring

**Add health check that verifies routes:**

```typescript
// In health.controller.ts
@Get('routes-check')
async checkRoutes() {
  const routes = this.app.getHttpAdapter().getInstance()._router?.stack;
  
  const hasOldPmRoutes = routes?.some(route => 
    route?.route?.path?.includes('/pm/risk-management')
  );
  
  const hasNewRisksRoutes = routes?.some(route => 
    route?.route?.path?.includes('/risks') && 
    !route?.route?.path?.includes('/pm')
  );
  
  return {
    oldPmRoutesRemoved: !hasOldPmRoutes,
    newRisksRoutesPresent: hasNewRisksRoutes,
    status: !hasOldPmRoutes && hasNewRisksRoutes ? 'healthy' : 'unhealthy'
  };
}
```

---

### 8. Deployment Notification

**Set up alerts for deployments:**

**Railway Dashboard → Backend Service → Settings → Notifications**

**Configure:**
- Email on deployment success/failure
- Slack/Discord webhook for deployment events
- Include commit hash in notifications

**Verify in notification:**
- Commit hash matches GitHub
- Branch is correct
- Build succeeded

---

## Quick Reference: Deployment Safety Checklist

Before any production deployment:

- [ ] Verify branch is `release/v0.5.0-alpha`
- [ ] Check latest commit hash in GitHub
- [ ] Verify Railway shows same commit hash
- [ ] Run `./scripts/verify-deployment-routes.sh`
- [ ] Check health endpoint returns 200
- [ ] Verify old PM routes return 404
- [ ] Verify new risks routes exist
- [ ] Monitor logs for 5 minutes after deploy
- [ ] Test critical user flows

---

## Emergency Rollback

If wrong commit deployed:

1. **Railway Dashboard → Backend Service → Deployments**
2. Find last known-good deployment
3. Click "Redeploy" on that deployment
4. Verify routes restored to previous state

**Prevent Future Issues:**
- Lock branch configuration
- Add pre-deploy verification
- Monitor deployment notifications

---

## Summary

**Key Rules:**
1. ✅ Always lock Railway to correct branch
2. ✅ Verify commit hash before/after deploy
3. ✅ Run route verification script
4. ✅ Monitor deployment notifications
5. ✅ Clear build cache if stale builds occur

**Do NOT:**
- ❌ Deploy from wrong branch
- ❌ Skip verification steps
- ❌ Ignore deployment notifications
- ❌ Deploy without checking commit hash

