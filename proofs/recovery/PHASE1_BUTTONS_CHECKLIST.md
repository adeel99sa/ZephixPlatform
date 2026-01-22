# Phase 1 Button Functionality - Manual Proof Checklist

**Date:** 2026-01-XX  
**Branch:** `recovery/workspace-mvp`  
**Goal:** Verify all visible buttons have end-to-end functionality

---

## Prerequisites

1. Backend server running on `http://localhost:3000`
2. Frontend server running on `http://localhost:5173` (or configured port)
3. Browser DevTools open (Network tab)
4. User logged in with workspace access

---

## Test Steps

### 1. Login Landing and Redirect

**URL:** `http://localhost:5173/login`

**Steps:**
1. Login with valid credentials
2. Observe navigation after login
3. Check Network tab for redirects

**Expected:**
- ✅ After login, navigates to `/home`
- ✅ If `activeWorkspaceId` exists, redirects to `/workspaces/:id/home`
- ✅ If no active workspace, shows `HomeEmptyState`

**HAR Export:** `01_login_landing.har`

**Screenshot:** `01_login_landing.png`

---

### 2. Workspace Dropdown Selection

**URL:** `http://localhost:5173/home` (or workspace home)

**Steps:**
1. Click workspace dropdown in sidebar
2. Select a workspace from the list
3. Observe navigation

**Expected:**
- ✅ Dropdown shows workspace names
- ✅ Selecting workspace navigates to `/workspaces/:id/home`
- ✅ `activeWorkspaceId` is set in localStorage
- ✅ No calls to `/api/workspaces/:id/members` in Network tab

**HAR Export:** `02_workspace_selection.har`

**Screenshot:** `02_workspace_dropdown.png`

---

### 3. Plus Menu - Create Doc

**URL:** `http://localhost:5173/workspaces/:id/home` (any workspace home)

**Steps:**
1. Click plus button next to workspace dropdown
2. Click "Doc" from menu
3. Observe behavior

**Expected:**
- ✅ Plus menu opens
- ✅ "Doc" button creates a new doc via API
- ✅ Navigates to `/docs/:docId`
- ✅ Doc page loads with title and content textarea
- ✅ Network tab shows:
  - `POST /api/workspaces/:workspaceId/docs` (200 OK)
  - `GET /api/docs/:docId` (200 OK)

**HAR Export:** `03_plus_menu_create_doc.har`

**Screenshot:** `03_plus_menu_doc.png`

**API Call Verification:**
```bash
# Should see in HAR:
POST /api/workspaces/{workspaceId}/docs
Body: {"title": "New doc"}
Response: {"data": {"docId": "..."}}
```

---

### 4. Plus Menu - Create Form

**URL:** `http://localhost:5173/workspaces/:id/home` (any workspace home)

**Steps:**
1. Click plus button next to workspace dropdown
2. Click "Form" from menu
3. Observe behavior

**Expected:**
- ✅ Plus menu opens
- ✅ "Form" button creates a new form via API
- ✅ Navigates to `/forms/:formId/edit`
- ✅ Form page loads with title and schema JSON textarea
- ✅ Network tab shows:
  - `POST /api/workspaces/:workspaceId/forms` (200 OK)
  - `GET /api/forms/:formId` (200 OK)

**HAR Export:** `04_plus_menu_create_form.har`

**Screenshot:** `04_plus_menu_form.png`

**API Call Verification:**
```bash
# Should see in HAR:
POST /api/workspaces/{workspaceId}/forms
Body: {"title": "New form"}
Response: {"data": {"formId": "..."}}
```

---

### 5. Workspace Home - Open Template Center

**URL:** `http://localhost:5173/workspaces/:id/home`

**Steps:**
1. Scroll to "Projects" section
2. Click "Open Template Center" button
3. Observe navigation

**Expected:**
- ✅ Button navigates to `/templates`
- ✅ Template Center page loads
- ✅ No errors in console

**HAR Export:** `05_workspace_home_template_center.har`

**Screenshot:** `05_template_center_button.png`

---

### 6. Workspace Home - New Doc Button

**URL:** `http://localhost:5173/workspaces/:id/home`

**Steps:**
1. Scroll to "Quick Actions" section
2. Click "New doc" button
3. Observe behavior

**Expected:**
- ✅ Creates new doc via API
- ✅ Navigates to `/docs/:docId`
- ✅ Doc page loads correctly

**HAR Export:** `06_workspace_home_new_doc.har`

**Screenshot:** `06_workspace_home_new_doc.png`

---

### 7. Workspace Home - New Form Button

**URL:** `http://localhost:5173/workspaces/:id/home`

**Steps:**
1. Scroll to "Quick Actions" section
2. Click "New form" button
3. Observe behavior

**Expected:**
- ✅ Creates new form via API
- ✅ Navigates to `/forms/:formId/edit`
- ✅ Form page loads correctly

**HAR Export:** `07_workspace_home_new_form.har`

**Screenshot:** `07_workspace_home_new_form.png`

---

### 8. Doc Page - Save Functionality

**URL:** `http://localhost:5173/docs/:docId` (from previous test)

**Steps:**
1. Edit title in input field
2. Edit content in textarea
3. Click "Save" button OR blur textarea
4. Observe behavior

**Expected:**
- ✅ Title updates on blur or Save click
- ✅ Content updates on blur or Save click
- ✅ Network tab shows `PATCH /api/docs/:docId` (200 OK)
- ✅ Toast shows "Doc saved"
- ✅ No errors in console

**HAR Export:** `08_doc_save.har`

**Screenshot:** `08_doc_edit_save.png`

---

### 9. Form Page - Save Functionality

**URL:** `http://localhost:5173/forms/:formId/edit` (from previous test)

**Steps:**
1. Edit title in input field
2. Edit schema JSON in textarea
3. Click "Save" button
4. Observe behavior

**Expected:**
- ✅ Title updates on Save
- ✅ Schema JSON validates (shows error if invalid JSON)
- ✅ Network tab shows `PATCH /api/forms/:formId` (200 OK)
- ✅ Toast shows "Form saved"
- ✅ No errors in console

**HAR Export:** `09_form_save.har`

**Screenshot:** `09_form_edit_save.png`

---

### 10. Network Verification - No /members Calls

**URL:** Any workspace page

**Steps:**
1. Open Network tab
2. Navigate through workspace pages
3. Check for `/api/workspaces/:id/members` calls

**Expected:**
- ✅ NO calls to `/api/workspaces/:id/members` during:
  - Workspace home load
  - Workspace selection
  - Route guards
  - Plus menu operations
- ✅ Only `/api/workspaces/:id/role` calls (if any)

**HAR Export:** `10_no_members_calls.har`

**Screenshot:** `10_network_tab.png`

---

## CURL Commands for Manual API Testing

### Create Doc

```bash
# Replace {workspaceId} and {token} with actual values
curl -X POST http://localhost:3000/api/workspaces/{workspaceId}/docs \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"title": "Test Doc"}'

# Expected response:
# {"data": {"docId": "..."}}
```

### Create Form

```bash
# Replace {workspaceId} and {token} with actual values
curl -X POST http://localhost:3000/api/workspaces/{workspaceId}/forms \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"title": "Test Form"}'

# Expected response:
# {"data": {"formId": "..."}}
```

### Get Doc

```bash
# Replace {docId} and {token} with actual values
curl -X GET http://localhost:3000/api/docs/{docId} \
  -H "Authorization: Bearer {token}"

# Expected response:
# {"data": {"id": "...", "workspaceId": "...", "title": "...", "content": "...", "createdAt": "..."}}
```

### Get Form

```bash
# Replace {formId} and {token} with actual values
curl -X GET http://localhost:3000/api/forms/{formId} \
  -H "Authorization: Bearer {token}"

# Expected response:
# {"data": {"id": "...", "workspaceId": "...", "title": "...", "schema": null, "createdAt": "..."}}
```

---

## Acceptance Criteria

All tests must pass:

- [ ] Login lands on `/home` correctly
- [ ] Workspace dropdown selection routes correctly
- [ ] Plus menu creates doc and opens `/docs/:id`
- [ ] Plus menu creates form and opens `/forms/:id/edit`
- [ ] Workspace home "Open Template Center" works
- [ ] Workspace home "New doc" button works
- [ ] Workspace home "New form" button works
- [ ] Doc page save works (title and content)
- [ ] Form page save works (title and schema)
- [ ] No `/members` calls in network during normal navigation
- [ ] All HAR files exported
- [ ] All screenshots captured

---

## Files to Export

1. `01_login_landing.har`
2. `02_workspace_selection.har`
3. `03_plus_menu_create_doc.har`
4. `04_plus_menu_create_form.har`
5. `05_workspace_home_template_center.har`
6. `06_workspace_home_new_doc.har`
7. `07_workspace_home_new_form.har`
8. `08_doc_save.har`
9. `09_form_save.har`
10. `10_no_members_calls.har`

**Screenshots:** Same numbering (`.png` extension)

---

*Complete this checklist after implementing all sections and commit proof artifacts.*
