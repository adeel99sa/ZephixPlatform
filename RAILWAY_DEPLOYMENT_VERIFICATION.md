# Railway Deployment Verification Checklist

**Date**: 2025-11-19
**Backend Commit**: `13df628` - "fix: add WorkspacesModule forwardRef to ResourceModule for DI resolution"
**Branch**: `release/v0.5.0-alpha`

---

## ✅ Backend Verification Steps

### Step 1: Confirm Railway is using the correct commit

1. Railway Dashboard → **Backend Service** → **Deployments**
2. Check the latest deployment:
   - Does it show commit `13df628` or later?
   - If older, click **"Deploy latest"** and wait for new build

### Step 2: Check deployment logs for DI error

Open the latest deployment → **Logs** → Search for:

**❌ Error to look for:**
```
Nest can't resolve dependencies of the ResourcesService (ResourceRepository, ResourceAllocationRepository, TaskRepository, ProjectRepository, DataSource, ?). Please make sure that the argument WorkspaceAccessService at index [5] is available in the ResourceModule context.
```

**Two outcomes:**

#### Outcome A: Error is GONE ✅
- Backend should have started successfully
- Check health endpoint:
  ```
  GET https://<your-backend-url>.railway.app/api/health
  ```
  - Expected: `200 OK` with JSON response
  - If 200: **Backend is healthy, no more changes needed**

#### Outcome B: Error is STILL PRESENT ❌
- Railway may be using wrong branch or old code
- Check Railway backend service settings:
  - **Connected Git repo** → Which branch?
  - Should be: `release/v0.5.0-alpha`
  - If different (e.g., `main`), change to `release/v0.5.0-alpha` and redeploy

### Step 3: Verify health endpoint

```bash
curl https://<your-backend-url>.railway.app/api/health
```

Or open in browser. Should return:
- Status: `200 OK`
- Body: JSON with health status

---

## ✅ Frontend Verification Steps

### Step 1: Find Root Directory setting

Railway Dashboard → **Frontend Service** → **Settings**

Look for one of these fields:
- "Root Directory"
- "Service Directory"
- "Build Directory"
- "Source Directory"

### Step 2A: If Root Directory field exists

1. Set value to: `zephix-frontend`
2. Click **Save**
3. Trigger new deployment
4. Watch logs

### Step 2B: If Root Directory field does NOT exist

Use **Custom Commands** or **Override Commands**:

**Install Command:**
```
cd zephix-frontend && npm ci
```

**Build Command:**
```
cd zephix-frontend && npm run build
```

**Start Command:**
```
cd zephix-frontend && npx serve -s dist -l $PORT
```

Save and trigger new deployment.

### Step 3: Verify in deployment logs

**❌ Error to look for (should be GONE):**
```
The npm ci command can only install with an existing package-lock.json
```

**✅ Success indicators:**
- `npm ci` runs successfully
- `npm run build` completes
- `serve -s dist -l $PORT` starts
- No "package-lock.json not found" errors

---

## 📋 What to Report Back

Please provide:

### Backend Status:
1. [ ] Do you still see the WorkspaceAccessService DI error in latest deployment logs?
2. [ ] What does `GET /api/health` return? (200 OK or error?)
3. [ ] What branch is Railway backend service configured to use?

### Frontend Status:
1. [ ] Did you find "Root Directory" (or similar) in frontend service settings?
2. [ ] If yes, what was it set to before? What did you change it to?
3. [ ] If no, did you use command overrides? Which commands did you set?
4. [ ] After new deployment, does the `npm ci` error disappear from logs?

---

## 🚫 Do NOT Do Until Both Are Green

- ❌ No more git commits
- ❌ No more code changes
- ❌ No more pushes
- ✅ Only Railway configuration changes
- ✅ Only verification and testing

---

## ✅ Success Criteria

**Backend is healthy when:**
- No DI errors in logs
- `/api/health` returns 200 OK
- Railway shows service as "Healthy"

**Frontend is healthy when:**
- `npm ci` succeeds (no package-lock.json error)
- Build completes successfully
- Frontend serves on port
- Railway shows service as "Healthy"

Once both are green, we can proceed with release tagging.

