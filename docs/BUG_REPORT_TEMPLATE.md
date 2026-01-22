# Bug Report Template

Use this template for each bug you encounter during testing.

## Bug Report

**Title:** [Brief description of the issue]

**Role Used:** [admin / member / viewer]

**Steps to Reproduce:**
1.
2.
3.

**Expected Result:**
[What should have happened according to the tester script]

**Actual Result:**
[What actually happened]

**Screenshots:**
[Attach screenshots if helpful]

**Network Details:**
- **URL:** [e.g., `/api/workspaces`]
- **Method:** [GET / POST / PATCH / DELETE]
- **Status Code:** [e.g., 200, 403, 404, 500]
- **Response JSON:** [Paste relevant response if available]

**Browser Console Errors:**
[Paste any errors from browser console]

**Additional Notes:**
[Any other relevant information]

---

## Critical Bugs to Report Immediately

Report these as HIGH PRIORITY:

1. **Auto Content in New Workspace**
   - Any prepopulated projects or folders in a brand new workspace
   - Any content that appears without user explicitly creating it

2. **Wrong Visibility**
   - Non-admin seeing "Create workspace" button
   - Member/viewer seeing management controls they shouldn't

3. **Last Owner Protection Failure**
   - Last workspace_owner can be removed or demoted
   - No error message when trying to remove last owner

4. **API Errors**
   - Any 4xx or 5xx errors on basic flows (create workspace, add member, etc.)
   - Unexpected 403 Forbidden errors

5. **Empty State Issues**
   - Empty state doesn't appear for new workspace
   - Empty state shows wrong actions or missing actions









