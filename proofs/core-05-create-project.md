# Core Flow 05: Create Project

**Status:** ❌ NOT STARTED  
**Last Verified:** 2026-01-18

## Steps

1. Select a workspace
2. Navigate to `/projects` page
3. Click "Create Project" button
4. Fill in project form (name, description, etc.)
5. Submit form
6. Verify project created in backend
7. Verify projects list refreshes
8. Verify project appears in list

## Expected Result

- Projects list page loads (currently placeholder)
- Create project modal/form opens
- Form submission creates project via `POST /api/projects`
- Projects list refreshes and shows new project
- Project is workspace-scoped
- `x-workspace-id` header sent on project API calls

## Actual Result

❌ **NOT STARTED** - Projects list is placeholder, creation flow not implemented

## Proof

- **Route:** `/projects` exists but shows `<div>Projects Page</div>`
- **API:** `POST /api/projects` endpoint exists
- **TODO:** Implement projects list page
- **TODO:** Implement project creation modal/form

## Notes

- Projects must be workspace-scoped
- `x-workspace-id` header required for project API calls
- Projects list should show inline empty state if no workspace selected

## Next Action

Implement projects list and creation flow:
- [ ] Replace placeholder with real projects list
- [ ] Implement project creation modal/form
- [ ] Verify workspace scoping
- [ ] Verify header injection
