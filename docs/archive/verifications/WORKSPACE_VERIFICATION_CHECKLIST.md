# Workspace Creation Verification Checklist

## Step 1: Hard Refresh and Login ✅

**Actions:**
1. Stop all tabs using old tokens
2. In browser on http://localhost:5173 press **Cmd+Shift+R** (Mac) or **Ctrl+Shift+R** (Windows/Linux)
3. Log out if needed
4. Log in again as `admin@zephix.ai`

**Expected:**
- Page loads without errors
- You see the home page or dashboard

---

## Step 2: Confirm Auth and Org Look Healthy ✅

**Actions:**
1. Open DevTools → **Network** tab
2. Filter by `me`
3. Reload the page (Cmd+R or F5)

**Expected Results:**
- ✅ `GET /api/auth/me` → **Status 200**
  - Response should include:
    ```json
    {
      "id": "<uuid>",
      "email": "admin@zephix.ai",
      "role": "admin",
      "organizationId": "<uuid>"
    }
    ```
- ✅ `GET /api/workspaces` → **Status 200** (or 204 if empty)
  - Should NOT be 500 or 403
  - Response should be JSON array (even if empty `[]`)

**If you see 403 or 500:**
- Check backend logs: `tail -n 50 /tmp/backend.log`
- Verify `NODE_ENV=development` in backend process

---

## Step 3: Create Workspace with "Messy" Slug ✅

**Actions:**
1. Click **"Create workspace"** button
2. Fill in:
   - **Name**: `Test Workspace 1`
   - **Slug**: `Cloud Engineering 101` (intentionally messy - spaces and caps)
3. Click **"Create"**

**Expected Results:**
- ✅ `POST /api/workspaces` → **Status 201 Created**
- ✅ Response JSON includes:
  ```json
  {
    "id": "<uuid>",
    "name": "Test Workspace 1",
    "slug": "cloud-engineering-101",
    "organizationId": "<uuid>",
    "createdAt": "...",
    "updatedAt": "..."
  }
  ```
- ✅ Sidebar shows the new workspace "Test Workspace 1"
- ✅ Slug is normalized: `cloud-engineering-101` (not "Cloud Engineering 101")

**If you see 400 or 403:**
- See Step 4 below for debugging

---

## Step 4: If You Still Get 400 on POST /api/workspaces

**Collect These Three Things:**

### A. Response JSON (from Network tab)
1. In DevTools Network tab, click the failing `POST /api/workspaces` request
2. Click **Response** tab
3. Copy the entire JSON response

### B. Payload JSON (from Network tab)
1. Still on the same request
2. Click **Payload** tab (or **Request** tab → **Payload**)
3. Copy the entire JSON payload that was sent

### C. Backend Logs (from terminal)
1. Note the timestamp from the Network tab request
2. In terminal, run:
   ```bash
   tail -n 100 /tmp/backend.log | grep -A 10 "POST.*workspaces\|400\|BadRequest"
   ```
3. Look for the request with matching `requestId` from the Network tab
4. Copy the full error block

**Paste all three here for targeted debugging.**

---

## Step 5: Quick Sanity Checks

### A. Run Workspace Tests (if available)
```bash
cd zephix-backend
npm run test -- workspaces
```

**Expected:**
- Tests pass (or skip if no workspace tests exist)

### B. Check Migrations
```bash
cd zephix-backend
npm run migration:show
```

**Expected:**
- All workspace migrations show `[X]` (applied)
- No new unapplied workspace migrations

**Current Applied Migrations:**
- ✅ CreateWorkspacesTable
- ✅ AddWorkspaceIdToProjects
- ✅ AddOwnerIdToWorkspaces
- ✅ CreateWorkspaceMembers
- ✅ MakeProjectWorkspaceIdRequired
- ✅ AddAdminRoleToWorkspaceMembers
- ✅ AddPermissionsConfigToWorkspaces

---

## Success Criteria

✅ All steps pass:
- Auth works (200 on `/api/auth/me`)
- Workspace listing works (200 on `/api/workspaces`)
- Workspace creation works (201 on `POST /api/workspaces`)
- Slug normalization works (`Cloud Engineering 101` → `cloud-engineering-101`)
- Workspace appears in sidebar

**You're ready for testers!**

---

## Next Steps (After Verification)

Run a small smoke script:
1. Create workspace ✅
2. Create project in that workspace
3. Open Work tab
4. Apply a methodology template
5. Confirm no errors










