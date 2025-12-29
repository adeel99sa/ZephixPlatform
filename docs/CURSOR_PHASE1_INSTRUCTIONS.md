# ✅ PHASE 1 — FIX ADMIN ENTRY & ROUTING

**IMPORTANT: Execute these steps in exact order. Do not skip. Stop after completion and wait for approval before proceeding.**

---

## Context

The Admin area must be accessible ONLY through the user dropdown menu (top-left), not from the Sidebar. When clicked, it should load a full-screen AdminLayout with its own left navigation panel.

---

## Step 1: Remove Admin from Sidebar

**File:** `zephix-frontend/src/components/shell/Sidebar.tsx`

**Action:**
- Remove any "Admin" link that appears under Settings
- Ensure Sidebar only shows:
  - Home
  - Workspaces (with kebab menu)
  - Template Center
  - Resources
  - Analytics
  - Settings
- Verify no Admin-related code remains in Sidebar component

**Verification:**
- Run the app and confirm Sidebar has no Admin entry
- Check that Settings section does not contain Admin link

---

## Step 2: Verify Administration in User Dropdown

**File:** `zephix-frontend/src/components/shell/UserProfileDropdown.tsx`

**Action:**
- Verify "Administration" menu item exists in the dropdown
- Verify it only shows when `isAdminRole(user.role)` returns true
- Verify dropdown shows these items in order:
  - Profile
  - Trash
  - Archive
  - Teams
  - Invite Members
  - **Administration** (only for admin/owner)
  - Log out

**Code Check:**
- Ensure `isAdminRole` is imported from `@/types/roles`
- Ensure conditional rendering: `{(user?.role && isAdminRole(user.role)) && (...)}`

**Verification:**
- Login as admin → Administration should appear
- Login as member → Administration should NOT appear

---

## Step 3: Fix Administration Click Handler

**File:** `zephix-frontend/src/components/shell/UserProfileDropdown.tsx`

**Action:**
- Verify `handleMenuClick("administration")` navigates to `/admin/overview`
- Ensure it uses `navigate("/admin/overview")` from `react-router-dom`

**Current Code Should Be:**
```typescript
case "administration":
  navigate("/admin/overview");
  break;
```

**Verification:**
- Click Administration in dropdown → URL should change to `/admin/overview`
- AdminLayout should load (full screen, not nested in DashboardLayout)

---

## Step 4: Verify AdminLayout Routes

**File:** `zephix-frontend/src/App.tsx`

**Action:**
- Verify `/admin/*` routes are in a SEPARATE Route tree (NOT nested under DashboardLayout)
- Verify AdminLayout wraps all admin routes
- Verify routes exist:
  - `/admin` → redirects to `/admin/overview`
  - `/admin/overview` → AdminOverviewPage
  - `/admin/users` → AdminUsersPage
  - `/admin/workspaces` → AdminWorkspacesPage
  - `/admin/audit` → AdminAuditPage

**Route Structure Should Be:**
```tsx
<Route element={<ProtectedRoute />}>
  {/* Main app routes with DashboardLayout */}
  <Route element={<DashboardLayout />}>
    <Route path="/home" ... />
    <Route path="/workspaces" ... />
    ...
  </Route>

  {/* Admin routes - SEPARATE, NOT nested */}
  <Route element={<AdminRoute />}>
    <Route element={<AdminLayout />}>
      <Route path="/admin" element={<Navigate to="/admin/overview" replace />} />
      <Route path="/admin/overview" element={<AdminOverviewPage />} />
      <Route path="/admin/users" element={<AdminUsersPage />} />
      <Route path="/admin/workspaces" element={<AdminWorkspacesPage />} />
      <Route path="/admin/audit" element={<AdminAuditPage />} />
    </Route>
  </Route>
</Route>
```

**Verification:**
- Navigate to `/admin/overview` → Should see AdminLayout (not DashboardLayout)
- AdminLayout should show left navigation panel with: Overview, Users, Workspaces, Audit log
- Main Sidebar should NOT appear when in admin routes

---

## Step 5: Verify AdminLayout Component

**File:** `zephix-frontend/src/components/layouts/AdminLayout.tsx`

**Action:**
- Verify AdminLayout includes:
  - Left navigation panel with: Overview, Users, Workspaces, Audit log
  - Header component (top bar with cmd+K, AI toggle, org menu)
  - Main content area with `<Outlet />`
  - AI Assistant Panel (if applicable)
- Verify AdminLayout does NOT include main Sidebar component

**Navigation Items Should Have:**
- Test IDs: `admin-nav-overview`, `admin-nav-users`, `admin-nav-workspaces`, `admin-nav-audit`
- Active state styling (blue background when active)
- Icons for each item

**Verification:**
- When on `/admin/overview`, "Overview" should be highlighted
- Clicking navigation items should change routes
- Header should be visible at top

---

## Step 6: Fix Command Palette for Admin

**File:** `zephix-frontend/src/components/command/CommandPalette.tsx`

**Action:**
- Verify admin commands only appear for admin/owner users
- Verify these commands exist:
  - "Go to Admin overview" → navigates to `/admin/overview`
  - "Manage users" → navigates to `/admin/users`
  - "Manage workspaces" → navigates to `/admin/workspaces`
- Verify test IDs: `action-admin-overview`, `action-admin-users`, `action-admin-workspaces`
- Remove any unrelated commands (dashboards, create-dashboard, invite, etc.)

**Code Should:**
- Import `useAuth` and `isAdminRole` from `@/types/roles`
- Check `isAdminRole(user?.role)` before adding admin commands
- Use `useEffect` to add/remove admin commands based on role

**Verification:**
- Login as admin → Open Cmd+K → Should see admin commands
- Login as member → Open Cmd+K → Should NOT see admin commands
- Clicking admin commands should navigate to correct routes

---

## Step 7: Verify Backend AdminGuard

**File:** `zephix-backend/src/admin/guards/admin.guard.ts`

**Action:**
- Verify AdminGuard allows both `admin` and `owner` roles
- Verify it denies `member` and `viewer` roles

**Code Should Be:**
```typescript
const isAdmin = user.role === 'admin' || user.role === 'owner';
return isAdmin;
```

**Verification:**
- Test endpoint `/api/admin/users` as admin → Should return 200
- Test endpoint `/api/admin/users` as member → Should return 403
- Test endpoint `/api/admin/users` as owner → Should return 200

---

## Step 8: Run Verification Checks

**Execute these commands:**

```bash
# Type checking
cd zephix-frontend && npm run typecheck

# Linting
cd zephix-frontend && npm run lint

# Backend type checking (if available)
cd zephix-backend && npm run build
```

**Manual Verification Checklist:**

- [ ] Sidebar has NO Admin entry
- [ ] User dropdown shows "Administration" only for admin/owner
- [ ] Clicking Administration navigates to `/admin/overview`
- [ ] AdminLayout loads (full screen, own left nav)
- [ ] AdminLayout left nav shows: Overview, Users, Workspaces, Audit log
- [ ] Main Sidebar does NOT appear when in `/admin/*` routes
- [ ] Cmd+K shows admin commands only for admin users
- [ ] All admin routes (`/admin/overview`, `/admin/users`, etc.) work
- [ ] Backend AdminGuard allows admin/owner, denies member/viewer
- [ ] No TypeScript errors
- [ ] No linting errors

---

## ✅ PHASE 1 COMPLETE

**Stop here. Do not proceed to Phase 2 until explicitly instructed.**

**Report:**
- List all files modified
- List all files created
- List any issues encountered
- Confirm all verification checks pass

---

## Files Expected to Be Modified

1. `zephix-frontend/src/components/shell/Sidebar.tsx` - Remove Admin link
2. `zephix-frontend/src/components/shell/UserProfileDropdown.tsx` - Verify Administration item
3. `zephix-frontend/src/App.tsx` - Verify route structure
4. `zephix-frontend/src/components/layouts/AdminLayout.tsx` - Verify layout
5. `zephix-frontend/src/components/command/CommandPalette.tsx` - Add admin commands
6. `zephix-backend/src/admin/guards/admin.guard.ts` - Verify role check

## Files Expected to Exist (Verify)

1. `zephix-frontend/src/components/layouts/AdminLayout.tsx`
2. `zephix-frontend/src/pages/admin/AdminOverviewPage.tsx`
3. `zephix-frontend/src/pages/admin/AdminUsersPage.tsx`
4. `zephix-frontend/src/pages/admin/AdminWorkspacesPage.tsx`
5. `zephix-frontend/src/pages/admin/AdminAuditPage.tsx`
6. `zephix-frontend/src/types/roles.ts`

---

**END OF PHASE 1 INSTRUCTIONS**


















