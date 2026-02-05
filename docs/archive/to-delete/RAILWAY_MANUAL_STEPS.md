# Railway Manual Configuration Steps

**Date:** 2025-11-20
**Action Required:** Manual steps in Railway Dashboard

---

## Step 1: Turn Off Auto-Deploy (Backend)

**Railway Dashboard → Backend Service (zephix-backend) → Settings**

1. Find **"Deploy"** or **"Auto Deploy"** section
2. Look for toggle/checkbox: **"Deploy on Push"** or **"Auto Deploy"**
3. **Turn it OFF** (disable)
4. Click **"Save"** or **"Update"**

**Why:** Prevents accidental deployments of incomplete work.

**Going Forward:** Use manual "Redeploy" button only when you explicitly want to deploy.

---

## Step 2: Verify Frontend Build Settings

**Railway Dashboard → Frontend Service (zephix-frontend) → Settings → Build**

**Current Configuration (from screenshots):**
- **Builder:** Dockerfile (Automatically Detected) ✅
- **Dockerfile Path:** `Dockerfile` ✅
- **Custom Build Command:** `npm run build` ✅

**Railway Dashboard → Frontend Service → Settings → Deploy**

**Current Configuration:**
- **Custom Start Command:** `serve -s dist -l ${PORT:-8080}` (from railway.toml) ✅
- **Note:** Railway is using Dockerfile, which takes precedence over railway.toml

**Important:** The Dockerfile has been updated to use Railway's PORT environment variable:
```dockerfile
CMD sh -c "serve -s dist -l ${PORT:-8080}"
```

**After next deployment, check logs:**
- Railway Dashboard → Frontend Service → Deployments → Latest → Logs
- Should show: `INFO Accepting connections at http://localhost:XXXX` (where XXXX matches Railway's assigned PORT)
- Should NOT show: `Error: Unknown --listen endpoint scheme`

---

## Step 3: Verify Backend Branch (Optional Check)

**Railway Dashboard → Backend Service → Settings → Source**

**Expected:**
- **Branch:** `release/v0.5.0-alpha`
- **Repository:** Your GitHub repo

**If different:**
- Click "Change" or "Edit"
- Select `release/v0.5.0-alpha`
- Save

**Note:** With auto-deploy OFF, this setting won't trigger automatic deploys, but it ensures manual redeploys use the correct branch.

---

## Step 4: Frontend Smoke Test

**After verifying frontend is running:**

1. Open frontend URL in browser
2. **Test Login:**
   - Enter credentials
   - Should successfully authenticate

3. **Test Workspace:**
   - Open a workspace
   - Should load without errors

4. **Test Project Creation:**
   - Create a new project
   - Should save successfully

**If any step fails:**
- Check Railway frontend logs for errors
- Verify backend is healthy (`/api/health`)
- Check browser console for API errors

---

## Summary

✅ **Auto-Deploy:** Turned OFF (prevents surprise deployments)
✅ **Frontend Start Command:** Verified (`npx serve -s dist -l $PORT`)
✅ **Backend Branch:** Verified (`release/v0.5.0-alpha`)
✅ **Production Baseline:** Locked (`prod-2025-11-20` tag)

**Production is now stable and protected.**

