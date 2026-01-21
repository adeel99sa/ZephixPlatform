# Template Center UI Test Results

## Test Execution Summary

**Date:** 2026-01-16  
**Branch:** feat/template-center-ui  
**Status:** ⚠️ Manual testing required - Browser automation incomplete

## Setup Status

✅ **Backend:** Running on http://localhost:3000  
✅ **Frontend:** Running on http://localhost:5173  
✅ **Dev Seed:** Completed successfully  
✅ **Tokens Generated:** Admin, Owner, Member tokens available

## Test Results

### Step 1: Setup
- ✅ Dev seed completed
- ✅ Backend health check passed
- ✅ Frontend dev server started
- ⚠️ Browser login automation incomplete (requires manual login)

### Step 2A: Admin with no workspace selected
**Expected:** ORG + SYSTEM templates only, no x-workspace-id header

**Test Command:**
```bash
curl -v -X GET "http://localhost:3000/api/templates" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  2>&1 | grep -E "(x-workspace-id|templateScope|SYSTEM|ORG)"
```

**Status:** ⏳ Pending manual execution

### Step 2B: Owner with workspace selected
**Expected:** WORKSPACE + ORG + SYSTEM templates, x-workspace-id header present

**Test Command:**
```bash
curl -v -X GET "http://localhost:3000/api/templates" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "x-workspace-id: $WORKSPACE_ID" \
  -H "Content-Type: application/json" \
  2>&1 | grep -E "(x-workspace-id|templateScope|WORKSPACE)"
```

**Status:** ⏳ Pending manual execution

### Step 3: Create ORG template
**Expected:** 201, templateScope=ORG, workspaceId=null, no x-workspace-id header

**Test Command:**
```bash
curl -v -X POST "http://localhost:3000/api/templates" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test ORG Template",
    "kind": "project",
    "templateScope": "ORG",
    "structure": {
      "phases": [{
        "name": "Phase 1",
        "reportingKey": "PLAN",
        "sortOrder": 1,
        "tasks": [{"title": "Task 1", "status": "TODO", "sortOrder": 1}]
      }]
    },
    "defaultEnabledKPIs": ["schedule_variance"]
  }' \
  2>&1 | grep -E "(HTTP|templateScope|workspaceId|x-workspace-id)"
```

**Status:** ⏳ Pending manual execution

### Step 4: Create WORKSPACE template
**Expected:** 201, templateScope=WORKSPACE, workspaceId matches, x-workspace-id header present

**Status:** ⏳ Pending manual execution

### Step 5: Member restrictions
**Expected:** 403 for both ORG and WORKSPACE template creation

**Status:** ⏳ Pending manual execution

### Step 6: Structure editor validation
**Expected:** Save blocked for invalid states, succeeds when valid

**Status:** ⏳ Pending manual execution

### Step 7: Update structure persistence
**Expected:** Structure persists after refresh

**Status:** ⏳ Pending manual execution

### Step 8: DefaultEnabledKPIs persistence
**Expected:** Selected KPIs persist after refresh

**Status:** ⏳ Pending manual execution

### Step 9: Publish behavior
**Expected:** Version increments, role-based access enforced

**Status:** ⏳ Pending manual execution

### Step 10: Instantiate behavior
**Expected:** Project created, navigation to /projects/:id

**Status:** ⏳ Pending manual execution

## Known Issues

1. **Browser Automation:** Login flow requires manual intervention
2. **Screenshot Capture:** Screenshots saved but need manual verification
3. **Network Traces:** Need to capture actual request/response headers from browser DevTools

## Next Steps

1. **Manual Test Execution:** Complete the test sequence manually in browser
2. **Network Trace Capture:** Use browser DevTools to capture all API requests/responses
3. **Screenshot Verification:** Review captured screenshots for each test step
4. **Documentation:** Update this file with actual test results

## Test Commands Reference

All test commands are ready to run. See individual test sections above.
