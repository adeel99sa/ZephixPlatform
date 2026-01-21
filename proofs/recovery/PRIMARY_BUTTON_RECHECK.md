# Primary Button Recheck - Proof Protocol

**Date:** 2026-01-XX  
**Branch:** `recovery/workspace-mvp`  
**Goal:** Verify every primary button has real end-to-end behavior with proof artifacts

---

## Recheck Protocol

For each button, we capture:
- ✅ One HAR file (Network tab export)
- ✅ One screenshot (full page or relevant section)
- ✅ One acceptance line: expected route, expected API, expected UI result

**If any fails → button is NOT end-to-end → fix before advancing**

---

## A. Workspace Dropdown Select

**Start URL:** `http://localhost:5173/home` (or any page with sidebar)

**Click Path:**
1. Click workspace dropdown in sidebar
2. Select a workspace from the list

**Expected Route:** `/workspaces/:workspaceId/home`

**Expected API Calls:**
- `GET /api/workspaces` (200 OK) - if loading list
- `GET /api/workspaces/:workspaceId` (200 OK) - when landing on home
- `GET /api/workspaces/:workspaceId/role` (200 OK) - for role check
- ❌ NO `GET /api/workspaces/:workspaceId/members` calls

**Expected UI Result:**
- Dropdown shows compact list (names only, no full cards)
- Selecting workspace navigates to workspace home
- `activeWorkspaceId` persists in localStorage
- Workspace home loads with workspace name and sections

**Artifacts:**
- `recheck/01_workspace_dropdown_select.har`
- `recheck/01_workspace_dropdown_select.png`

**Status:** ⏳ PENDING TEST

**Failure Details (if any):**
- Failing request URL: ________________
- Status code: ________________
- Console error: ________________

---

## B. Plus Menu - Project

**Start URL:** `http://localhost:5173/workspaces/:workspaceId/home`

**Click Path:**
1. Click plus button next to workspace dropdown
2. Click "Project" from menu

**Expected Route:** `/templates`

**Expected API Calls:**
- None (pure navigation)

**Expected UI Result:**
- Plus menu opens
- Clicking "Project" navigates to Template Center
- Template Center page loads

**Artifacts:**
- `recheck/02_plus_menu_project.har`
- `recheck/02_plus_menu_project.png`

**Status:** ⏳ PENDING TEST

**Failure Details (if any):**
- Failing request URL: ________________
- Status code: ________________
- Console error: ________________

---

## C. Plus Menu - Template Center

**Start URL:** `http://localhost:5173/workspaces/:workspaceId/home`

**Click Path:**
1. Click plus button next to workspace dropdown
2. Click "Template Center" from menu

**Expected Route:** `/templates`

**Expected API Calls:**
- `GET /api/templates` (200 OK) - loading templates

**Expected UI Result:**
- Plus menu opens
- Clicking "Template Center" navigates to Template Center
- Template Center shows list of templates

**Artifacts:**
- `recheck/03_plus_menu_template_center.har`
- `recheck/03_plus_menu_template_center.png`

**Status:** ⏳ PENDING TEST

**Failure Details (if any):**
- Failing request URL: ________________
- Status code: ________________
- Console error: ________________

---

## D. Plus Menu - Doc

**Start URL:** `http://localhost:5173/workspaces/:workspaceId/home`

**Click Path:**
1. Click plus button next to workspace dropdown
2. Click "Doc" from menu

**Expected Route:** `/docs/:docId` (where docId is from create response)

**Expected API Calls:**
- `POST /api/workspaces/:workspaceId/docs` (201 Created or 200 OK)
  - Body: `{"title": "New doc"}` or `{"title": "Untitled"}`
  - Response: `{"data": {"docId": "..."}}`
- `GET /api/docs/:docId` (200 OK) - loading doc after navigation

**Expected UI Result:**
- Plus menu opens
- Clicking "Doc" creates doc via API
- Navigates to `/docs/:docId`
- Doc editor loads with title input and content textarea
- Toast shows success message

**Artifacts:**
- `recheck/04_plus_menu_doc.har`
- `recheck/04_plus_menu_doc.png`

**Status:** ⏳ PENDING TEST

**Failure Details (if any):**
- Failing request URL: ________________
- Status code: ________________
- Console error: ________________

---

## E. Plus Menu - Form

**Start URL:** `http://localhost:5173/workspaces/:workspaceId/home`

**Click Path:**
1. Click plus button next to workspace dropdown
2. Click "Form" from menu

**Expected Route:** `/forms/:formId/edit` (where formId is from create response)

**Expected API Calls:**
- `POST /api/workspaces/:workspaceId/forms` (201 Created or 200 OK)
  - Body: `{"title": "New form"}` or `{"title": "Untitled"}`
  - Response: `{"data": {"formId": "..."}}`
- `GET /api/forms/:formId` (200 OK) - loading form after navigation

**Expected UI Result:**
- Plus menu opens
- Clicking "Form" creates form via API
- Navigates to `/forms/:formId/edit`
- Form editor loads with title input and schema JSON textarea
- Toast shows success message

**Artifacts:**
- `recheck/05_plus_menu_form.har`
- `recheck/05_plus_menu_form.png`

**Status:** ⏳ PENDING TEST

**Failure Details (if any):**
- Failing request URL: ________________
- Status code: ________________
- Console error: ________________

---

## F. Workspace Home - Open Template Center

**Start URL:** `http://localhost:5173/workspaces/:workspaceId/home`

**Click Path:**
1. Scroll to "Projects" section
2. Click "Open Template Center" button

**Expected Route:** `/templates`

**Expected API Calls:**
- `GET /api/templates` (200 OK) - loading templates

**Expected UI Result:**
- Button navigates to Template Center
- Template Center page loads
- Templates are visible

**Artifacts:**
- `recheck/06_workspace_home_template_center.har`
- `recheck/06_workspace_home_template_center.png`

**Status:** ⏳ PENDING TEST

**Failure Details (if any):**
- Failing request URL: ________________
- Status code: ________________
- Console error: ________________

---

## G. Template Center - Create Project

**Start URL:** `http://localhost:5173/templates`

**Click Path:**
1. Click "Create Project" button on a template card
2. Fill in project name (if modal appears)
3. Submit

**Expected Route:** `/projects/:projectId` (where projectId is from instantiate response)

**Expected API Calls:**
- `POST /api/templates/:templateId/instantiate` (201 Created or 200 OK)
  - Body: `{"workspaceId": "...", "projectName": "..."}`
  - Response: `{"data": {"projectId": "...", ...}}`
- `GET /api/projects/:projectId` (200 OK) - loading project overview
- `GET /api/work/projects/:projectId/overview` (200 OK) - loading overview data

**Expected UI Result:**
- Clicking "Create Project" opens modal or directly instantiates
- Project is created via API
- Navigates to `/projects/:projectId`
- Project overview page loads with project name and sections
- Toast shows success message

**Artifacts:**
- `recheck/07_template_create_project.har`
- `recheck/07_template_create_project.png`

**Status:** ⏳ PENDING TEST

**Failure Details (if any):**
- Failing request URL: ________________
- Status code: ________________
- Console error: ________________

---

## H. Project Overview - Open Plan

**Start URL:** `http://localhost:5173/projects/:projectId`

**Click Path:**
1. Click "Open Plan" button in header

**Expected Route:** `/work/projects/:projectId/plan`

**Expected API Calls:**
- `GET /api/work/projects/:projectId/plan` (200 OK)
  - Response: `{"data": {"projectId": "...", "phases": [...], "tasks": [...]}}`

**Expected UI Result:**
- Button navigates to plan view
- Plan view loads phases and tasks
- Phases are visible with tasks nested
- No console errors

**Artifacts:**
- `recheck/08_project_open_plan.har`
- `recheck/08_project_open_plan.png`

**Status:** ⏳ PENDING TEST

**Failure Details (if any):**
- Failing request URL: ________________
- Status code: ________________
- Console error: ________________

---

## I. Doc Editor - Save

**Start URL:** `http://localhost:5173/docs/:docId` (from previous test)

**Click Path:**
1. Edit title in input field
2. Edit content in textarea
3. Click "Save" button OR blur textarea (autosave)

**Expected Route:** Same page (`/docs/:docId`)

**Expected API Calls:**
- `PATCH /api/docs/:docId` (200 OK)
  - Body: `{"title": "...", "content": "..."}`
  - Response: `{"data": {...updated doc}}`

**Expected UI Result:**
- Changes are saved via API
- Toast shows "Doc saved" or similar
- No console errors
- Changes persist on refresh

**Artifacts:**
- `recheck/09_doc_save.har`
- `recheck/09_doc_save.png`

**Status:** ⏳ PENDING TEST

**Failure Details (if any):**
- Failing request URL: ________________
- Status code: ________________
- Console error: ________________

---

## J. Form Editor - Save

**Start URL:** `http://localhost:5173/forms/:formId/edit` (from previous test)

**Click Path:**
1. Edit title in input field
2. Edit schema JSON in textarea
3. Click "Save" button

**Expected Route:** Same page (`/forms/:formId/edit`)

**Expected API Calls:**
- `PATCH /api/forms/:formId` (200 OK)
  - Body: `{"title": "...", "schema": {...}}`
  - Response: `{"data": {...updated form}}`

**Expected UI Result:**
- JSON validates (shows error if invalid)
- Changes are saved via API
- Toast shows "Form saved" or similar
- No console errors
- Changes persist on refresh

**Artifacts:**
- `recheck/10_form_save.har`
- `recheck/10_form_save.png`

**Status:** ⏳ PENDING TEST

**Failure Details (if any):**
- Failing request URL: ________________
- Status code: ________________
- Console error: ________________

---

## Summary

**Total Buttons Tested:** 10

**Passing:** ___ / 10  
**Failing:** ___ / 10

**Failing Buttons:**
1. ________________ (Request: ________, Status: ________)
2. ________________ (Request: ________, Status: ________)
3. ________________ (Request: ________, Status: ________)

---

## Next Steps

After completing tests:
1. Fill in failure details for any failing buttons
2. Export all HAR files to `proofs/recovery/recheck/`
3. Export all screenshots to `proofs/recovery/recheck/`
4. Proceed to Part 2 fixes for failing buttons only

---

*Complete this document after running all tests in browser.*
