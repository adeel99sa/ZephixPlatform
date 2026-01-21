# Validation Checklist - Admin Hardening

## ✅ Auth Stability

### Hard Refresh on /admin
1. Navigate to `/admin` while logged in as admin
2. Hard refresh (Cmd+Shift+R / Ctrl+Shift+R)
3. **Verify:**
   - ✅ Only **one** call to `/api/auth/me` (check Network tab)
   - ✅ No 401 loop (no repeated `/api/auth/me` calls)
   - ✅ No duplicate hydration logs in console
   - ✅ Page loads successfully

### Expected Console Logs
```
[AuthContext] Loading user...
[AuthContext] User loaded: { email, role, platformRole, permissions }
[AdminRoute] Component render: { loading: false, hasUser: true, ... }
[AdminRoute] ✅ ACCESS GRANTED - Rendering admin routes
```

### Expected Network Calls
- `GET /api/auth/me` → **200** (exactly once)
- No repeated 401 errors
- No redirect loops

---

## ✅ Admin Dashboard Contract

### Hit All 6 Endpoints
Open DevTools Network tab and verify:

1. **GET /api/admin/stats**
   - Status: **200**
   - Response: `{ data: { userCount, activeUsers, templateCount, projectCount, totalItems } }`
   - ✅ Even if all values are 0, response is valid

2. **GET /api/admin/health**
   - Status: **200**
   - Response: `{ data: { status, timestamp, database, services? } }`
   - ✅ Status can be 'ok' or 'error', but always returns 200

3. **GET /api/admin/org/summary**
   - Status: **200**
   - Response: `{ data: { name, id, slug, totalUsers, totalWorkspaces } }`
   - ✅ Safe defaults if org not found

4. **GET /api/admin/users/summary**
   - Status: **200**
   - Response: `{ data: { total, byRole: { owners, admins, members, viewers } } }`
   - ✅ All role counts can be 0

5. **GET /api/admin/workspaces/summary**
   - Status: **200**
   - Response: `{ data: { total, byType: { public, private }, byStatus: { active, archived } } }`
   - ✅ All counts can be 0

6. **GET /api/admin/risk/summary**
   - Status: **200**
   - Response: `{ data: { projectsAtRisk, overallocatedResources } }`
   - ✅ Both values can be 0

### UI Rendering
- ✅ Page renders even when all values are 0 or empty
- ✅ No red error banners
- ✅ Stats tiles show "0" values
- ✅ No loading spinners stuck
- ✅ No console errors

---

## ✅ Templates to Project Creation Journey

### 1. Confirm Templates Exist
```bash
# In backend directory
TEMPLATE_SEED=true npm run seed:starter-template
```

**Verify:**
- `GET /api/templates` returns **200** with `{ data: [...] }`
- At least 1 template in the array
- Template has required fields: `id`, `name`, `description`

### 2. Instantiate Template
**Steps:**
1. Click a template in Template Center
2. Click "Create project"
3. Fill in:
   - Workspace: Select a workspace
   - Project Name: Enter a name
4. Click "Create"

**Network Verification:**
- `POST /api/templates/:id/instantiate`
  - Status: **200** (success) or **400** (validation error)
  - Request body: `{ workspaceId: "...", projectName: "..." }`
  - Response: `{ data: { projectId: "...", name: "...", workspaceId: "..." } }`

### 3. Verify Project Created
```bash
# Get projectId from instantiate response
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/projects/{projectId}
```

**Verify:**
- `GET /api/projects/:id` returns **200**
- Project exists with correct `name` and `workspaceId`

---

## ✅ Billing Journey

### 1. Current Plan Endpoint
**Verify:**
- `GET /api/billing/current-plan` returns **200**
- Response: `{ data: { plan, subscription, usage? } }`
- ✅ Even if no subscription exists, returns safe defaults

### 2. Enterprise vs Non-Enterprise
**Enterprise Account (`internalManaged: true`):**
- ✅ Shows "Managed by Zephix team" message
- ✅ Plan selector is **disabled**
- ✅ Plan change endpoints return **403** (not 500)

**Non-Enterprise Account:**
- ✅ Shows plan selector
- ✅ Can view available plans
- ✅ Can attempt to subscribe (may return 501 if not implemented)

---

## 🔍 High-Risk Areas to Harden Next

### 1. Workspaces List and Switch
**Endpoints:**
- `GET /api/workspaces` - Can 500 if empty
- `GET /api/admin/workspaces` - Can 500 if empty
- `GET /api/workspaces/:id` - Can 500 if not found

**Hardening Needed:**
- Return `{ data: [] }` for empty lists
- Return `{ data: null }` for not found (200 status)
- Add structured logging

### 2. Projects List and Settings
**Endpoints:**
- `GET /api/projects` - Can 500 if empty
- `GET /api/projects/:id` - Can 500 if not found
- `GET /api/projects/:id/settings` - Can 500 if not found

**Hardening Needed:**
- Return `{ data: [] }` for empty lists
- Return `{ data: null }` for not found (200 status)
- Add structured logging

### 3. Organizations Switch
**Endpoints:**
- `GET /api/organizations` - Can 500 if empty
- `GET /api/organizations/:id` - Can 500 if not found

**Hardening Needed:**
- Return `{ data: [] }` for empty lists
- Return `{ data: null }` for not found (200 status)
- Add structured logging

### 4. Resource Endpoints (Stats from Empty Tables)
**Endpoints:**
- `GET /api/resources/allocations` - Can 500 if no allocations
- `GET /api/resources/risk` - Can 500 if no resources
- `GET /api/resources/stats` - Can 500 if empty tables

**Hardening Needed:**
- Return `{ data: { ... } }` with zeroed values
- Never throw on empty tables
- Add structured logging

---

## 🚨 If Admin "Does Nothing" on Click

### Check 1: Route Change
**Verify:**
- URL changes to `/admin` or `/admin/overview`
- Check browser address bar
- Check DevTools Network tab for route change

### Check 2: Router Mismatch
**If URL changes but page stays same:**
- Check `App.tsx` route configuration
- Verify `AdminRoute` is not blocking
- Check console for `[AdminRoute]` logs

### Check 3: Menu Item onClick
**If URL does NOT change:**
- Check `UserProfileDropdown.tsx` `handleMenuClick("administration")`
- Verify `navigate("/admin")` is called
- Check for `preventDefault()` blocking navigation

### Diagnostic Info Needed
If issues persist, provide:
1. **DevTools Console logs** from click through page load
2. **Network entries** for `/api/auth/me` and 6 admin endpoints with status codes
3. **Admin menu component code** where "Administration" is rendered and clicked

---

## 📋 Fast Commands

### Backend Tests
```bash
cd zephix-backend

# Contract tests
npm test -- admin.controller.spec.ts

# Smoke test (requires running server + token)
ACCESS_TOKEN=<token> npm run smoke:admin-endpoints
```

### Frontend Manual Test
1. Open DevTools Network tab
2. Hard refresh `/admin` (Cmd+Shift+R / Ctrl+Shift+R)
3. Verify:
   - 6 admin calls finish with **200**
   - Page renders tiles with 0 values
   - No red banners
   - No console errors

---

## ✅ Regression Prevention Rules

1. **No frontend page fires API calls until `authLoading` is false**
2. **No backend read endpoint returns non-200 due to empty tables**
3. **Every read response uses `{ data }` format**
4. **Every validation failure uses 400 with error code**






