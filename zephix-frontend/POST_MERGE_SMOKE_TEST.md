# Post-Merge Smoke Test Playbook (5 minutes)

## Prerequisites
- Demo account: `adeel99sa@yahoo.com` / `ReAdY4wK73967#!@`
- Dev server running: `npm run dev`
- Browser dev tools open

## Test Sequence

### 1. Login → Dashboard (2 minutes)
- [ ] Navigate to `/login`
- [ ] Enter demo credentials
- [ ] Verify successful login redirect to `/dashboard`
- [ ] Check browser console for errors (should be clean)
- [ ] Verify dashboard loads with proper layout
- [ ] Test skip-to-content link (Tab key)

### 2. Projects → DataTable Functionality (2 minutes)
- [ ] Navigate to `/projects`
- [ ] Verify DataTable renders with sample data
- [ ] Test sorting: click column headers, verify `aria-sort` updates
- [ ] Test filtering: use search input, verify results update
- [ ] Test pagination: navigate between pages
- [ ] Test empty state: clear filters, verify "No projects found"
- [ ] Test error state: simulate network error, verify ErrorBanner
- [ ] Test keyboard navigation: Tab through table controls

### 3. Settings → Form Functionality (1 minute)
- [ ] Navigate to `/settings`
- [ ] Verify tabs render correctly (Organization, Account, Security)
- [ ] Test form submission: modify a field, click save
- [ ] Verify success toast appears
- [ ] Verify focus returns to form after save
- [ ] Test keyboard navigation: Tab through form fields
- [ ] Test form validation: submit empty required fields

### 4. Hard Refresh Test (30 seconds)
- [ ] Hard refresh `/dashboard` (Cmd+Shift+R)
- [ ] Hard refresh `/projects` (Cmd+Shift+R)
- [ ] Hard refresh `/settings` (Cmd+Shift+R)
- [ ] Verify split chunks load cleanly (no 404s in Network tab)
- [ ] Verify lazy-loaded components appear after delay

## Success Criteria
- ✅ No console errors on any page
- ✅ All interactive elements respond to keyboard
- ✅ Focus management works correctly
- ✅ Toast notifications appear and dismiss
- ✅ Split chunks load without errors
- ✅ A11y attributes present (`aria-*`, `role`, etc.)

## Failure Response
If any test fails:
1. Check browser console for errors
2. Verify network requests are successful
3. Check if backend is running and accessible
4. Document specific failure in PR comments
5. Consider reverting if critical functionality broken

## Performance Notes
- Initial page load should be < 3 seconds
- Lazy-loaded components should appear within 1 second
- Bundle size should remain under 700 KB limit
- No memory leaks during navigation
