# Browser Test Runbook - Template Center Steps 6-8

## Step 1: Reset Browser State
- Clear Local Storage
- Clear Session Storage  
- Clear Cookies
- Hard refresh

## Step 2: Login and Verify Token
- Login as admin@template-proofs.test / Admin123!
- Verify zephix.at exists in localStorage

## Step 3: Verify /api/auth/me Headers
- Check Network tab for /api/auth/me
- Verify Authorization header present
- Verify NO x-workspace-id header

## Step 4: Navigate to Template Center
- Go to /templates
- Verify GET /api/templates returns 200

## Step 5: Step 6 Validation Tests
- A: Remove all phases, verify Save blocked
- B: Phase with zero tasks, verify Save blocked
- C: Empty task title, verify Save blocked

## Step 6: Step 7 Structure Persistence
- Add Phase 2 and Task 2
- Save and verify PATCH 200
- Refresh and verify persistence

## Step 7: Step 8 KPI Persistence
- Select 3 KPIs
- Save and verify PATCH 200
- Refresh and verify persistence

## Step 8: Negative Checks
- Owner tries to edit ORG template (should 403)
- Member tries to create/edit (should 403)
