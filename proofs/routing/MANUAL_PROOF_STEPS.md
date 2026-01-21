# Manual Proof Steps - Workspace Create UI Flow

## Prerequisites
- Backend running on http://localhost:3000
- Frontend running on http://localhost:5173
- Chrome browser with DevTools

## Step 1: Setup DevTools
1. Open Chrome
2. Navigate to http://localhost:5173/login
3. Open DevTools (F12 or Cmd+Option+I)
4. Go to Network tab
5. Enable:
   - ✅ Preserve log
   - ✅ Disable cache
6. Set filter: `workspaces`

## Step 2: Login
1. Login with test account (admin@zephix.ai / admin123456)
2. Wait for dashboard to load

## Step 3: Capture BEFORE Fix (if needed)
**Note:** If you already have the fix applied, skip to Step 4.

1. Open Create Workspace modal
2. Enter:
   - Name: `Data Management`
   - Slug: `data-management-before`
3. Click Create
4. **Capture:**
   - Screenshot of error toast: `proofs/routing/workspace-create.ui.before.screenshot.png`
   - Right-click POST request → Copy → Copy as cURL → Save to `proofs/routing/workspace-create.ui.before.curl.txt`
   - Right-click POST request → Save all as HAR → Save as `proofs/routing/workspace-create.ui.before.har`

## Step 4: Capture AFTER Fix
1. Hard refresh (Cmd+Shift+R)
2. Open Create Workspace modal
3. Enter:
   - Name: `Data Management`
   - Slug: `data-management-2` (new slug to avoid unique constraint)
4. Click Create
5. **Capture:**
   - Screenshot of success toast + new workspace visible: `proofs/routing/workspace-create.ui.after.screenshot.png`
   - Right-click POST request → Copy → Copy as cURL → Save to `proofs/routing/workspace-create.ui.after.curl.txt`
   - Right-click POST request → Save all as HAR → Save as `proofs/routing/workspace-create.ui.after.har`

## Step 5: Verify Request Body
Open the curl files and verify:
- **Before:** Contains `"ownerId": "..."` in body
- **After:** Contains only `"name"` and `"slug"` in body

## What to Look For
- Request URL: Should be `/api/workspaces` (no query params)
- Request Method: POST
- Request Body: Only `name` and `slug` (after fix)
- Response Status: 201 Created (after fix)
- Response Body: `{"data": {"workspaceId": "..."}}`
