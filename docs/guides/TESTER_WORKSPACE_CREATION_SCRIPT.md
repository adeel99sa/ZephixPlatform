# Workspace Creation & Core Flow - Test Script

**Purpose**: Verify workspace creation, slug normalization, project creation, and methodology templates work end-to-end.

**Estimated Time**: 10-15 minutes

---

## Prerequisites

- Backend running on `http://localhost:3000`
- Frontend running on `http://localhost:5173`
- Test account: `admin@zephix.ai` (or your assigned test account)

---

## Test 1: Login and Org Switch ✅

### Steps:
1. Navigate to **http://localhost:5173**
2. Log in with:
   - **Email**: `admin@zephix.ai`
   - **Password**: (use your assigned password)
3. After login, confirm you see **"Acme Corporation"** in the organization switcher (top navigation)
4. If a second organization exists, switch to it and confirm the header changes

### Expected Result:
- ✅ Login successful
- ✅ Organization "Acme Corporation" visible in switcher
- ✅ Header updates when switching organizations

---

## Test 2: Workspace Creation

### Test 2A: Simple Workspace (Auto-Generated Slug)

**Steps:**
1. Click **"Create workspace"** button (usually in sidebar or home page)
2. Fill in:
   - **Name**: `Core PMO`
   - **Slug**: Leave blank (do not enter anything)
3. Click **"Create"**

**Expected Results:**
- ✅ Workspace appears in sidebar as **"Core PMO"**
- ✅ No error popup
- ✅ In DevTools Network tab:
  - `POST /api/workspaces` returns **Status 201**
  - Response JSON includes:
    ```json
    {
      "id": "<uuid>",
      "name": "Core PMO",
      "slug": "core-pmo",
      "organizationId": "<uuid>"
    }
    ```
- ✅ Slug is auto-generated from name: `core-pmo`

---

### Test 2B: Slug Normalization (Messy Input)

**Steps:**
1. Click **"Create workspace"** button
2. Fill in:
   - **Name**: `Cloud Engineering 101`
   - **Slug**: `Cloud Engineering 101` (intentionally messy - spaces and caps)
3. Click **"Create"**

**Expected Results:**
- ✅ No error popup
- ✅ Workspace appears in sidebar as **"Cloud Engineering 101"**
- ✅ In DevTools Network tab:
  - `POST /api/workspaces` returns **Status 201**
  - Response JSON shows normalized slug:
    ```json
    {
      "name": "Cloud Engineering 101",
      "slug": "cloud-engineering-101"
    }
    ```
- ✅ Slug is normalized: `cloud-engineering-101` (lowercase, hyphens, no spaces)

---

### Test 2C: Invalid Data Guardrail (Validation)

**Steps:**
1. Click **"Create workspace"** button
2. Try to create with:
   - **Name**: Only spaces `   ` or leave empty
   - **Slug**: Spaces or empty
3. Click **"Create"**

**Expected Results:**
- ✅ **Option A**: Frontend shows validation error and does NOT call the API
  - Error message: "Name is required" or similar
- ✅ **Option B**: If API is called, backend returns **Status 400** with clear message:
  ```json
  {
    "error": {
      "message": "name should not be empty",
      "code": "VALIDATION_ERROR"
    }
  }
  ```
- ✅ Workspace is NOT created
- ✅ This confirms basic validation still exists

---

## Test 3: Workspace List and Persistence ✅

**Steps:**
1. Reload the browser (Cmd+R or F5)
2. Confirm both workspaces still appear in sidebar:
   - **Core PMO**
   - **Cloud Engineering 101**
3. Click each workspace link and check the URL pattern

**Expected Results:**
- ✅ Both workspaces persist after reload
- ✅ URLs follow pattern:
  - `/workspaces/core-pmo`
  - `/workspaces/cloud-engineering-101`
- ✅ Workspace pages load without errors

---

## Test 4: Project Creation Inside Workspace ✅

**Steps:**
1. Navigate to the **"Cloud Engineering 101"** workspace
2. Click **"Create project"** button
3. Fill in:
   - **Name**: `Cloud Migration Pilot`
4. Confirm **Methodology dropdown** is present and usable
5. Select **Scrum** from the methodology dropdown
6. Click **"Create"** (or equivalent submit button)

**Expected Results:**
- ✅ Project is created successfully
- ✅ Project view opens automatically
- ✅ URL contains the project ID (e.g., `/projects/<project-id>`)
- ✅ Project appears under **"Cloud Engineering 101"** workspace only
- ✅ Project does NOT appear in other workspaces

---

## Test 5: Methodology Templates Sanity ✅

**Steps:**
1. Inside the newly created **"Cloud Migration Pilot"** project
2. Open the **Work** tab
3. In the post-creation prompt, select **Scrum** methodology template
4. Confirm columns and rows appear

**Expected Results:**
- ✅ Columns and rows appear matching the Scrum system template
- ✅ No errors in browser console (DevTools → Console tab)
- ✅ Work table is functional (can see columns like Status, Assignee, etc.)

---

## Test 6: AI Assistant Quick Smoke ✅

**Steps:**
1. In the project **Work** view
2. Open **AI assistant** (usually a button or icon in the UI)
3. Confirm the AI interface appears

**Expected Results:**
- ✅ Sidebar or modal appears with AI interface
- ✅ In DevTools Network tab:
  - No **4xx** or **5xx** errors on AI endpoints
  - If Anthropic keys are missing:
    - ✅ Clear message: **"AI unavailable in this environment"**
    - ✅ No crash or blank screen
- ✅ AI assistant UI is functional (even if AI is unavailable)

---

## Test 7: What to Capture If Anything Fails ⚠️

**If any test fails, capture these THREE things:**

### 1. Screenshot
- Take a screenshot of the UI showing the error popup or broken state
- Include the browser URL in the screenshot

### 2. Network Request Details (DevTools)
- Open DevTools → **Network** tab
- Find the failing request (usually highlighted in red)
- Copy these details:
  - **Request URL**: Full endpoint path
  - **Status Code**: (e.g., 400, 403, 500)
  - **Request Payload**: Click request → Payload tab → Copy JSON
  - **Response JSON**: Click request → Response tab → Copy JSON

### 3. Backend Logs
- Note the timestamp from the Network tab request
- In terminal, run:
  ```bash
  tail -n 100 /tmp/backend.log | grep -A 10 "POST.*workspaces\|GET.*workspaces\|400\|403\|500"
  ```
- Copy the full error block around that timestamp

**Paste all three items (screenshot, network details, backend logs) for fast debugging.**

---

## Success Criteria

✅ **All tests pass:**
- Login and org switch work
- Workspace creation works (simple, normalization, validation)
- Workspaces persist after reload
- Projects can be created inside workspaces
- Methodology templates load correctly
- AI assistant opens without crashes

**If all tests pass, workspace creation and core Phase 11-13 flows are safe for broader testing.**

---

## Notes for Testers

- **Hard refresh** if you see stale data: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows/Linux)
- **Clear browser cache** if login issues persist
- **Check backend is running**: `curl http://localhost:3000/api/health` should return `{"status":"healthy"}`
- **Report any unexpected behavior**, even if it doesn't cause a crash

---

## Quick Reference: Expected Status Codes

- `200` - Success (GET requests)
- `201` - Created (POST requests)
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (auth issues)
- `403` - Forbidden (permission issues)
- `500` - Server Error (backend crash)

**Any 4xx or 5xx should be reported with the three items from Test 7.**










