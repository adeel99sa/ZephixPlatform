# **MASTER CURSOR PROMPT — PHASE 2**

### **Admin Functional Pages**

### Strict execution rules apply

• Do not skip steps
• Do not improvise behavior
• Follow sequence exactly
• If data is missing, add TODO comments
• Respect all architecture rules from Phase 1 and the master spec

---

# **SECTION 0. PHASE CONTEXT**

You are now working on **Phase 2 of Zephix**.

Phase 1 is complete and established:

• AdminLayout
• Admin navigation
• admin routes
• dropdown entry
• admin guard
• placeholder pages
• no admin in sidebar

Phase 2 adds **full admin functionality**.

Everything must stay inside the `/admin` namespace.

---

# **SECTION 1. PHASE 2 GOAL**

Implement the full Admin control center:

### **1. Admin Overview Dashboard**

Replaces placeholder with real data:

**Metrics required:**

• Total users
• Active users
• Total workspaces
• Active projects
• Workspace health (stub)
• At-risk projects (stub)
• Resource utilization (stub)

**UI requirements:**

• 4–6 summary cards
• Basic grid layout
• API calls `/api/admin/...`
• TODO markers for future charts

### **2. User Management System**

Pages under `/admin/users`:

#### A. Users List

Sortable, searchable table with:

• Name
• Email
• Role
• Status
• Last login
• Actions (Edit, Deactivate)

#### B. Create User Modal

Fields:

• First name
• Last name
• Email
• Role (owner, admin, member, viewer)
• Status

#### C. Edit User Page

• User details
• Role update
• Status toggle
• Workspace assignments (placeholder for now)

### **3. Groups Management (Phase 2 lite)**

Path: `/admin/groups`

Only structure and placeholders.

Implementation of rules in Phase 7.

Keep simple:

• Groups list
• Create group modal
• Edit group page
• Members list
• Placeholder for permissions section

### **4. Workspace Management**

Path: `/admin/workspaces`

#### A. Workspace List

Cards or table with:

• Name
• Owner
• Member count
• Project count
• Status

#### B. Create Workspace Modal

Fields:

• Name
• Description
• Select Workspace Owner
• Default methodology
• Members multi-select

#### C. Workspace Detail Skeleton

• Overview
• Members
• Settings

All placeholder content.

---

# **SECTION 2. BACKEND REQUIREMENTS**

### **Admin API to support Phase 2**

Add or validate these endpoints:

```
GET    /api/admin/summary
GET    /api/admin/users
POST   /api/admin/users
GET    /api/admin/users/:id
PATCH  /api/admin/users/:id
DELETE /api/admin/users/:id

GET    /api/admin/groups
POST   /api/admin/groups
GET    /api/admin/groups/:id
PATCH  /api/admin/groups/:id
DELETE /api/admin/groups/:id

GET    /api/admin/workspaces
POST   /api/admin/workspaces
GET    /api/admin/workspaces/:id
PATCH  /api/admin/workspaces/:id
DELETE /api/admin/workspaces/:id
```

**All endpoints must use:**

• JwtAuthGuard
• AdminGuard
• Organization scoping by organizationId

If logic is incomplete, implement minimal viable logic and add TODO comments.

---

# **SECTION 3. FRONTEND REQUIREMENTS**

### File structure (must follow this)

```
src/features/admin/
    overview/
        AdminOverviewPage.tsx
        AdminOverview.api.ts
    users/
        UsersListPage.tsx
        UserEditPage.tsx
        CreateUserModal.tsx
        users.api.ts
    groups/
        GroupsListPage.tsx
        GroupEditPage.tsx
        CreateGroupModal.tsx
        groups.api.ts
    workspaces/
        WorkspacesListPage.tsx
        WorkspaceEditPage.tsx
        CreateWorkspaceModal.tsx
        workspaces.api.ts
```

**Do NOT place these pages in `pages/admin/`.**

Use the `features/admin` directory only.

### Required UI patterns

• Table component from your UI library
• Modal component from UI
• Reuse existing Form components
• Keep everything consistent with current design

### Required testIDs

Every list row, button, and modal must include testIDs.

Example:

`data-testid="admin-users-table"`
`data-testid="create-user-button"`
`data-testid="workspace-card"`

---

# **SECTION 4. STEP-BY-STEP EXECUTION**

Cursor must follow this sequence and not skip ahead.

## **Step 1. Replace AdminOverview placeholder**

• Add summary cards
• Call `/api/admin/summary`
• Show real metrics
• Add quick action buttons with TODO click handlers

## **Step 2. Build Users List Page**

• Table
• Sorting
• Search bar
• Edit button
• Deactivate/Activate button
• Connect API

## **Step 3. Build Create User Modal**

• Form
• Role dropdown
• Basic validation
• POST to `/api/admin/users`

## **Step 4. Build Edit User Page**

• Load by ID
• Form with user details
• Update role
• Update status
• Save button

## **Step 5. Groups List Page**

• List of groups
• Create modal
• Edit page
• Stub permission section
• Add TODO comments

## **Step 6. Workspace List Page**

• Cards or table
• Display owner, members, projects
• Create Workspace button

## **Step 7. Workspace Create/Edit Modal**

• Dropdown list of users
• Default methodology
• Multi-select of members
• POST and PATCH

## **Step 8. Verification**

Run:

```bash
npm run lint
npm run typecheck
npm run build
```

Manual checks for admin and non admin roles.

---

# **SECTION 5. STOP POINT**

At completion of Step 8, Cursor must stop.

Do not begin Template Center.
Do not begin method engine.
Do not begin workspace roles.

---

# **END OF PHASE 2 PROMPT**

---

# **PHASE TRACKER**

**Current Phase: 2**
**Current Step: Waiting for you to confirm execution**
**Next Action: Paste this prompt into Cursor to begin Phase 2**

