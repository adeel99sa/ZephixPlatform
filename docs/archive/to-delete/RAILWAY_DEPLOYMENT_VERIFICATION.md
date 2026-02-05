# Railway Deployment Verification Checklist

## Step 1: Confirm Railway is Building the Right Repo and Branch

**Railway Dashboard → zephix-backend → Settings**

Verify:
- [ ] **Source Repo** points to the correct GitHub repo (should be your ZephixApp repo)
- [ ] **Branch** is set to `main`
- [ ] **Auto Deploy** is ON (or you trigger deploys manually from main)

**If any of these are wrong:**
- Update Source Repo to point to correct repo
- Set Branch to `main`
- Enable Auto Deploy or manually trigger from main

---

## Step 2: Confirm Railway is Building the Backend Service

**Railway Dashboard → zephix-backend → Settings**

**Choose ONE approach. Do NOT mix:**

### Option A: Root Directory (Recommended)

**Settings → Root Directory:**
- [ ] Set to: `zephix-backend`

**Settings → Build Command:**
- [ ] Should be: `npm ci && npm run build` (or leave empty if using nixpacks.toml)

**Settings → Start Command:**
- [ ] Should be: `npm run start:railway` (or leave empty if using railway.toml)

### Option B: Commands Include `cd`

**Settings → Root Directory:**
- [ ] Leave empty or set to repo root

**Settings → Build Command:**
- [ ] Set to: `cd zephix-backend && npm ci && npm run build`

**Settings → Start Command:**
- [ ] Set to: `cd zephix-backend && npm run start:railway`

**Current Configuration Files:**
- `zephix-backend/railway.toml` exists and specifies:
  - `buildCommand = "npm run build"`
  - `startCommand = "npm run start:railway"`
- `zephix-backend/nixpacks.toml` exists and specifies:
  - `[phases.install] cmds = ["npm ci --legacy-peer-deps"]`
  - `[phases.build] cmds = ["npm run build"]`
  - `[start] cmd = "npm run start:railway"`

**If using railway.toml/nixpacks.toml:**
- Root Directory MUST be set to `zephix-backend` for these configs to work
- Build/Start commands in Railway UI can be left empty (config files take precedence)

---

## Step 3: Redeploy from Latest Main Commit

**Railway Dashboard → zephix-backend → Deployments**

1. [ ] Click **"Redeploy"** or **"New Deployment"**
2. [ ] Select **"Deploy latest main"** or **"Deploy from main branch"**
3. [ ] Wait for deployment to complete (2-5 minutes)
4. [ ] After deploy completes, click **"Restart"** on the service

**Verify Deployment:**
- Check deployment logs for:
  - `npm ci` running successfully
  - `npm run build` completing
  - `npm run start:railway` starting
  - No errors in build or start phases

---

## Step 4: Hard Proof - Verify commitSha in /api/version

After redeploy and restart, run:

```bash
curl -s https://zephix-backend-production.up.railway.app/api/version | jq .
```

**Expected Response:**
```json
{
  "version": "1.0.0",
  "name": "Zephix Backend",
  "environment": "production",
  "nodeVersion": "v20.x.x",
  "commitSha": "3469a56",
  "timestamp": "...",
  "uptime": ...,
  "memory": {...}
}
```

**PASS Criteria:**
- [ ] Response includes `commitSha` field
- [ ] `commitSha` equals `3469a56` or newer (7+ character hex string)

**FAIL Criteria:**
- [ ] No `commitSha` field in response
- [ ] `commitSha` is `"unknown"` or empty
- [ ] `commitSha` is older than `3469a56`

---

## If commitSha is Still Missing After Redeploy

This means one of these is true:

1. **Wrong Service:** You deployed a different service than the one behind `zephix-backend-production.up.railway.app`
2. **Wrong Branch/Repo:** Service is deploying from a different branch or repo
3. **Wrong Root Directory:** Root Directory or commands still point at wrong path
4. **Dockerfile Override:** Railway is using a Dockerfile or nixpacks config that ignores your intended commands

**To Pinpoint Fast:**

Grab these three pieces of information from Railway Dashboard:

1. **zephix-backend service Settings page:**
   - Source Repo URL
   - Branch name
   - Root Directory value
   - Build Command (if set)
   - Start Command (if set)

2. **Latest Deployment log header:**
   - Commit SHA it built (first few lines of deployment log)
   - Build command that ran
   - Start command that ran

3. **Service URL mapping:**
   - Which Railway service is behind `zephix-backend-production.up.railway.app`
   - Is it the same service you just redeployed?

**Paste this information here for diagnosis.**

---

## Step 5: Re-run 2-Step Smoke Test

After `commitSha` appears in `/api/version`:

```bash
ORG="Smoke Org $(date +%s)"
EMAIL1="smoke-a-$(date +%s)@example.com"
EMAIL2="smoke-b-$(date +%s)@example.com"

# Test 1: New org, new email
curl -i -s -X POST https://zephix-backend-production.up.railway.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL1\",\"password\":\"Test123!@#\",\"fullName\":\"Test User\",\"orgName\":\"$ORG\"}" | head -n 1

# Test 2: Same orgName, different email
sleep 2
curl -i -s -X POST https://zephix-backend-production.up.railway.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL2\",\"password\":\"Test123!@#\",\"fullName\":\"Test User\",\"orgName\":\"$ORG\"}" | head -n 60
```

**Expected Results:**
- **Test 1:** HTTP 200 ✅
- **Test 2:** HTTP 409 ✅ (NOT 500)

**If Test 2 still returns 500:**
- Check Railway logs for `[ORG_SLUG_HANDLER]` entries
- Verify the requestId from Test 2 response
- Search logs for that requestId to see error handling

---

## Summary Checklist

- [ ] Step 1: Repo and branch verified
- [ ] Step 2: Root Directory and commands configured correctly
- [ ] Step 3: Redeployed from latest main
- [ ] Step 4: `/api/version` shows `commitSha` = `3469a56` or newer
- [ ] Step 5: Smoke test passes (200, then 409)

**Once all steps pass, return to development.**


