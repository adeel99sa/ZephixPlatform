# Browser Test Manual Runbook - Template Center Steps 6-8

## Prerequisites
- Backend running: `cd zephix-backend && npm run start:dev`
- Frontend running: `cd zephix-frontend && npm run dev`
- Fresh tokens from dev-seed (7d expiration)

## Step 1: Reset Browser State

1. Open DevTools (F12 or Cmd+Option+I)
2. Go to **Application** tab
3. **Local Storage** → `http://localhost:5173` → Right-click → Clear
4. **Session Storage** → `http://localhost:5173` → Right-click → Clear
5. **Cookies** → `http://localhost:5173` → Right-click → Clear
6. Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)

**Expected**: Login screen appears, no `zephix.at` in localStorage

## Step 2: Login and Verify Token Write

1. Login with:
   - Email: `admin@template-proofs.test`
   - Password: `Admin123!`
2. Click "Sign In Securely"
3. **Immediately** open DevTools → **Application** tab → **Local Storage**
4. Verify:
   - ✅ `zephix.at` exists and contains JWT token (starts with `eyJ...`)
   - ✅ `zephix.rt` exists (refresh token)

**Screenshot Required**: `step2_localStorage_token.png`
- Show Application tab with Local Storage expanded
- Highlight `zephix.at` key with token value visible

## Step 3: Verify /api/auth/me Headers

1. Open DevTools → **Network** tab
2. Filter: `auth/me`
3. Find the `/api/auth/me` request
4. Click it → **Headers** tab
5. Check **Request Headers**:
   - ✅ `Authorization: Bearer eyJ...` (present)
   - ✅ `x-workspace-id` (NOT present)

**Screenshot Required**: `step3_auth_me_headers.png`
- Show Request Headers section
- Highlight Authorization header
- Show that x-workspace-id is absent

## Step 4: Navigate to Template Center

1. Navigate to: `http://localhost:5173/templates`
2. Wait for templates list to load
3. In Network tab, find `GET /api/templates` request
4. Check **Request Headers**:
   - ✅ `Authorization: Bearer ...` (present)
   - ✅ `x-workspace-id` (may be present if workspace selected, or absent if no workspace)

**Screenshot Required**: `step4_templates_list_headers.png`
- Show GET /api/templates request headers
- Show response status (should be 200)

## Step 5: Step 6 - Structure Editor Validation

### 5A. No Phases Test

1. Select any ORG template you own
2. Open Structure Editor
3. Remove ALL phases (delete each phase)
4. Click "Save Structure"

**Expected**:
- Save button disabled OR inline error message
- No PATCH request fired in Network tab

**Screenshot Required**: `step6a_no_phases_blocked.png`
- Show UI with validation error or disabled Save button
- Show Network tab with no PATCH request

### 5B. Phase with Zero Tasks Test

1. Add one phase back
2. Remove all tasks from that phase
3. Click "Save Structure"

**Expected**:
- Save blocked with error: "each phase must have at least one task"
- No PATCH request fired

**Screenshot Required**: `step6b_phase_zero_tasks_blocked.png`

### 5C. Empty Task Title Test

1. Add one task to the phase
2. Clear the task title field (make it empty)
3. Click "Save Structure"

**Expected**:
- Save blocked with error: "task title required"
- No PATCH request fired

**Screenshot Required**: `step6c_empty_task_title_blocked.png`

## Step 6: Step 7 - Structure Persistence

1. Ensure at least 1 phase exists with at least 1 task
2. Add **Phase 2** with title "Phase 2"
3. Add **Task 2** under Phase 2 with title "Task 2"
4. Click "Save Structure"
5. In Network tab, find `PATCH /api/templates/:id` request
6. **Copy Request Payload** (JSON body)
7. Verify response is **200 OK**
8. **Hard refresh** page (Cmd+Shift+R)
9. Reopen the same template
10. Verify Phase 2 and Task 2 still exist

**Screenshots Required**:
- `step7_patch_request_payload.png` - Show PATCH request with payload
- `step7_patch_response_200.png` - Show 200 response
- `step7_after_refresh.png` - Show template after refresh with Phase 2 and Task 2 visible

**Request Payload to Copy**:
```json
{
  "structure": {
    "phases": [
      {
        "name": "Phase 1",
        "reportingKey": "...",
        "sortOrder": 1,
        "tasks": [...]
      },
      {
        "name": "Phase 2",
        "reportingKey": "...",
        "sortOrder": 2,
        "tasks": [
          {
            "title": "Task 2",
            "status": "TODO",
            "sortOrder": 1
          }
        ]
      }
    ]
  }
}
```

## Step 7: Step 8 - KPI Defaults Persistence

1. Stay on the same template
2. Open KPI defaults selector
3. Select these KPIs:
   - `schedule_variance`
   - `budget_variance`
   - `resource_utilization`
4. Click "Save KPIs"
5. In Network tab, find `PATCH /api/templates/:id` request
6. **Copy Request Payload** (JSON body)
7. Verify response is **200 OK**
8. **Hard refresh** page
9. Reopen template
10. Verify the 3 KPIs remain selected

**Screenshots Required**:
- `step8_patch_request_payload.png` - Show PATCH request with defaultEnabledKPIs
- `step8_patch_response_200.png` - Show 200 response
- `step8_after_refresh.png` - Show KPI selector after refresh with selections persisted

**Request Payload to Copy**:
```json
{
  "defaultEnabledKPIs": [
    "schedule_variance",
    "budget_variance",
    "resource_utilization"
  ]
}
```

## Step 8: Negative Checks

### 8A. Owner Tries to Edit ORG Template

1. Logout
2. Login as Owner:
   - Email: `owner@template-proofs.test`
   - Password: `Owner123!`
3. Navigate to `/templates`
4. Select an ORG template
5. Try to edit structure or KPIs
6. Click Save

**Expected**: 403 Forbidden response

**Screenshot Required**: `negative_owner_org_403.png`
- Show 403 response in Network tab

### 8B. Member Tries to Create/Edit

1. Logout
2. Login as Member:
   - Email: `member@template-proofs.test`
   - Password: `Member123!`
3. Navigate to `/templates`
4. Try to create template OR edit existing template

**Expected**: 403 Forbidden response

**Screenshot Required**: `negative_member_403.png`
- Show 403 response in Network tab

## Deliverable Checklist

### Screenshots (Minimum 6)
- [ ] `step2_localStorage_token.png` - Token in localStorage
- [ ] `step3_auth_me_headers.png` - /api/auth/me headers (no x-workspace-id)
- [ ] `step4_templates_list_headers.png` - GET /api/templates headers
- [ ] `step6a_no_phases_blocked.png` - Validation blocks save
- [ ] `step7_patch_request_payload.png` - PATCH structure payload
- [ ] `step7_patch_response_200.png` - 200 response
- [ ] `step7_after_refresh.png` - Structure persists after refresh
- [ ] `step8_patch_request_payload.png` - PATCH KPI payload
- [ ] `step8_patch_response_200.png` - 200 response
- [ ] `step8_after_refresh.png` - KPIs persist after refresh
- [ ] `negative_owner_org_403.png` - Owner 403 on ORG template
- [ ] `negative_member_403.png` - Member 403 on create/edit

### Request Payloads (JSON)
- [ ] Step 7 PATCH payload (structure with Phase 2 and Task 2)
- [ ] Step 8 PATCH payload (defaultEnabledKPIs array)

### Network Request Details (if any fail)
For any failing request, capture:
- URL
- Status code
- Response body
- Request headers
- Request payload

## Quick Test Script

After completing manual tests, run this to verify backend still works:

```bash
export ADMIN_TOKEN="<from dev-seed output>"
curl -i "http://localhost:3000/api/auth/me" -H "Authorization: Bearer $ADMIN_TOKEN"
# Should return 200
```
