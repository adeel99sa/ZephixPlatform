# Template Center UI Test Proof

## Test Execution: 2026-01-16

### Setup ✅
- Backend: Running on http://localhost:3000
- Frontend: Running on http://localhost:5173
- Dev Seed: Completed
- Tokens: Generated for Admin, Owner, Member

---

## Step 2A: Admin List Templates (No Workspace)

**Request:**
```bash
GET /api/templates
Headers:
  Authorization: Bearer $ADMIN_TOKEN
  (NO x-workspace-id header)
```

**Response:** `200 OK`
- ✅ Returns ORG templates only
- ✅ No WORKSPACE templates in response
- ✅ No x-workspace-id header sent (correct)

**Templates Found:**
- Multiple ORG templates (templateScope: "ORG", workspaceId: null)
- No WORKSPACE templates

**Proof:** See `/tmp/step-2a-response.txt`

---

## Step 2B: Owner List Templates (With Workspace)

**Request:**
```bash
GET /api/templates
Headers:
  Authorization: Bearer $OWNER_TOKEN
  x-workspace-id: ad81dadf-af55-42ed-9b00-903aab7ce0ec
```

**Response:** `200 OK`
- ✅ Returns ORG + WORKSPACE templates
- ✅ x-workspace-id header present in request
- ✅ WORKSPACE templates have matching workspaceId

**Templates Found:**
- ORG templates (templateScope: "ORG", workspaceId: null)
- WORKSPACE templates (templateScope: "WORKSPACE", workspaceId: "ad81dadf-af55-42ed-9b00-903aab7ce0ec")

**Proof:** See `/tmp/step-2b-response.txt`

---

## Step 3: Create ORG Template (Admin, No Workspace Header)

**Request:**
```bash
POST /api/templates
Headers:
  Authorization: Bearer $ADMIN_TOKEN
  (NO x-workspace-id header)
Body:
  {
    "name": "Test ORG Template",
    "templateScope": "ORG",
    ...
  }
```

**Response:** `201 Created`
- ✅ templateScope: "ORG"
- ✅ workspaceId: null
- ✅ No x-workspace-id header sent (correct)

**Created Template:**
```json
{
  "id": "29ef43f5-4143-44db-af35-bc691df15e17",
  "name": "Test ORG Template 1768548914",
  "templateScope": "ORG",
  "workspaceId": null,
  "version": 1,
  "defaultEnabledKPIs": ["schedule_variance"]
}
```

**Proof:** See `/tmp/step-3-response.txt`

---

## Step 4: Create WORKSPACE Template (Owner, With Workspace Header)

**Request:**
```bash
POST /api/templates
Headers:
  Authorization: Bearer $OWNER_TOKEN
  x-workspace-id: ad81dadf-af55-42ed-9b00-903aab7ce0ec
Body:
  {
    "name": "Test WORKSPACE Template",
    "templateScope": "WORKSPACE",
    ...
  }
```

**Response:** `201 Created`
- ✅ templateScope: "WORKSPACE"
- ✅ workspaceId: "ad81dadf-af55-42ed-9b00-903aab7ce0ec" (matches header)
- ✅ x-workspace-id header present (correct)

**Created Template:**
```json
{
  "id": "7cacfd64-8e8d-4d73-ad5c-175722dea602",
  "name": "Test WORKSPACE Template 1768548914",
  "templateScope": "WORKSPACE",
  "workspaceId": "ad81dadf-af55-42ed-9b00-903aab7ce0ec",
  "version": 1,
  "defaultEnabledKPIs": ["schedule_variance"]
}
```

**Proof:** See `/tmp/step-4-response.txt`

---

## Step 5: Member Restrictions

### 5A: Member Try Create ORG Template

**Request:**
```bash
POST /api/templates
Headers:
  Authorization: Bearer $MEMBER_TOKEN
Body:
  {
    "name": "Member ORG Template",
    "templateScope": "ORG"
  }
```

**Response:** `403 Forbidden`
- ✅ Correctly blocked

**Proof:** See `/tmp/step-5a-response.txt`

### 5B: Member Try Create WORKSPACE Template

**Request:**
```bash
POST /api/templates
Headers:
  Authorization: Bearer $MEMBER_TOKEN
  x-workspace-id: ad81dadf-af55-42ed-9b00-903aab7ce0ec
Body:
  {
    "name": "Member WORKSPACE Template",
    "templateScope": "WORKSPACE"
  }
```

**Response:** `403 Forbidden`
- ✅ Correctly blocked

**Proof:** See `/tmp/step-5b-response.txt`

---

## Step 6-7: Structure Editor Validation & Persistence

**Status:** ⏳ Requires UI testing - structure validation happens client-side

**Expected Behavior:**
- Remove all phases → Save blocked with inline error
- Add phase with zero tasks → Save blocked
- Add task with empty title → Save blocked
- Fix all issues → Save succeeds
- Refresh page → Structure persists

**Note:** API accepts valid structure. UI validation must be tested manually.

---

## Step 8: DefaultEnabledKPIs Persistence

**Request:**
```bash
PATCH /api/templates/{id}
Body:
  {
    "defaultEnabledKPIs": ["schedule_variance", "budget_variance", "resource_utilization"]
  }
```

**Response:** `200 OK`
- ✅ defaultEnabledKPIs updated

**Proof:** See `/tmp/step-8-response.txt`

---

## Step 9: Publish Behavior

### 9A: Publish ORG Template (Admin)

**Request:**
```bash
POST /api/templates/{id}/publish
Headers:
  Authorization: Bearer $ADMIN_TOKEN
```

**Response:** `200 OK`
- ✅ Version increments
- ✅ publishedAt set

**Proof:** See `/tmp/step-9a-response.txt`

### 9B: Publish Again (Version Increment)

**Request:**
```bash
POST /api/templates/{id}/publish
Headers:
  Authorization: Bearer $ADMIN_TOKEN
```

**Response:** `200 OK`
- ✅ Version increments again
- ✅ publishedAt updated

**Proof:** See `/tmp/step-9b-response.txt`

### 9C: Member Try Publish (Should 403)

**Request:**
```bash
POST /api/templates/{id}/publish
Headers:
  Authorization: Bearer $MEMBER_TOKEN
```

**Response:** `403 Forbidden`
- ✅ Correctly blocked

**Proof:** See `/tmp/step-9c-response.txt`

---

## Step 10: Instantiate Template

**Request:**
```bash
POST /api/templates/{id}/instantiate-v5_1
Headers:
  Authorization: Bearer $OWNER_TOKEN
  x-workspace-id: ad81dadf-af55-42ed-9b00-903aab7ce0ec
Body:
  {
    "projectName": "UI Test Project From Template"
  }
```

**Response:** `201 Created`
- ✅ projectId returned
- ✅ phaseCount and taskCount returned
- ✅ Navigation to /projects/:id should occur (UI test required)

**Proof:** See `/tmp/step-10-response.txt`

---

## Summary

### ✅ API Tests Passed
- Step 2A: Admin list (no workspace) - ORG only ✅
- Step 2B: Owner list (with workspace) - ORG + WORKSPACE ✅
- Step 3: Create ORG template - 201, correct scope ✅
- Step 4: Create WORKSPACE template - 201, correct scope ✅
- Step 5: Member restrictions - 403 for both ✅
- Step 8: KPI persistence - Updates work ✅
- Step 9: Publish behavior - Version increments, RBAC enforced ✅
- Step 10: Instantiate - Project created ✅

### ⏳ UI Tests Required (Manual)
- Step 6-7: Structure editor validation and persistence
- Step 8: KPI selector UI behavior
- Step 9: Publish button enablement in UI
- Step 10: Navigation after instantiate

### 🔍 High Risk Spots Verified
- ✅ Header rules: No x-workspace-id for ORG create/list when no workspace
- ✅ RBAC: Backend correctly enforces 403 for Member
- ✅ Structure shape: API accepts phases[].tasks[] format
- ⏳ Template selection refresh: Requires UI test

---

## Next Steps

1. **Manual UI Testing:** Complete Steps 6-7, 8 (UI), 9 (UI), 10 (navigation) in browser
2. **Screenshot Capture:** Take screenshots of each UI state
3. **Network Traces:** Capture browser DevTools network tab for all requests
4. **Console Errors:** Document any browser console errors

## Test Artifacts

All API test responses saved in:
- `/tmp/step-2a-response.txt` - Admin list (no workspace)
- `/tmp/step-2b-response.txt` - Owner list (with workspace)
- `/tmp/step-3-response.txt` - Create ORG template
- `/tmp/step-4-response.txt` - Create WORKSPACE template
- `/tmp/step-5a-response.txt` - Member create ORG (403)
- `/tmp/step-5b-response.txt` - Member create WORKSPACE (403)
- `/tmp/step-7-response.txt` - Update structure
- `/tmp/step-8-response.txt` - Update KPIs
- `/tmp/step-9a-response.txt` - Publish (first)
- `/tmp/step-9b-response.txt` - Publish (second)
- `/tmp/step-9c-response.txt` - Member publish (403)
- `/tmp/step-10-response.txt` - Instantiate template
