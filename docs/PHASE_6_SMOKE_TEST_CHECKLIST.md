# Phase 6 Smoke Test Checklist

## Quick Route Verification (5 minutes)

### Admin User
- [ ] `/home` → Lands on Admin home
- [ ] `/workspaces` → Shows workspace list
- [ ] `/workspaces/:id` → Shows workspace overview
- [ ] `/w/:slug/home` → Shows workspace home with widgets
- [ ] `/workspaces/:id/portfolios` → Shows portfolios list, "+ New Portfolio" button visible
- [ ] `/workspaces/:id/programs` → Shows programs list, "+ New Program" button visible
- [ ] `/workspaces/:id/programs/:programId` → Shows program detail with rollup
- [ ] `/workspaces/:id/portfolios/:portfolioId` → Shows portfolio detail with rollup
- [ ] `/projects/:projectId` → Shows project overview, "Program & Portfolio" section visible

### Member User
- [ ] `/home` → Lands on Member home
- [ ] `/w/:slug/home` → Shows workspace home with widgets
- [ ] `/workspaces/:id/portfolios` → Shows portfolios list, NO create button
- [ ] `/workspaces/:id/programs` → Shows programs list, NO create button
- [ ] `/projects/:projectId` → Shows project overview, "Program & Portfolio" section shows read-only tags

### Guest User
- [ ] `/home` → Lands on Guest home
- [ ] `/w/:slug/home` → Shows workspace home (if invited to workspace)
- [ ] `/workspaces/:id/portfolios` → Shows portfolios list (if has access), NO create button
- [ ] `/workspaces/:id/programs` → Shows programs list (if has access), NO create button
- [ ] `/projects/:projectId` → Shows project overview, "Program & Portfolio" section shows read-only tags
- [ ] `/inbox` → Redirects to `/home` (403 equivalent)

## Role Access Checks (2 minutes)

### Admin
- [ ] Can see "+ New Portfolio" button on portfolios list
- [ ] Can see "+ New Program" button on programs list
- [ ] Can see "Link Project" button on project detail
- [ ] Can see "Unlink" button when project is linked

### Member
- [ ] Cannot see create buttons (portfolios/programs)
- [ ] Cannot see "Link Project" button
- [ ] Can see read-only tags (Standalone, Program: X, Portfolio: Y)

### Guest
- [ ] Cannot see create buttons
- [ ] Cannot see "Link Project" button
- [ ] Can see read-only tags
- [ ] Cannot access `/inbox` (redirects to home)

## Quick Functionality Checks (3 minutes)

### Create Flow
- [ ] Admin clicks "+ New Portfolio" → Modal opens
- [ ] Fill name → Click "Create" → Portfolio appears in list
- [ ] Admin clicks "+ New Program" → Modal opens
- [ ] Select portfolio → Fill name → Click "Create" → Program appears in list

### Link Flow
- [ ] Admin opens project detail → "Program & Portfolio" section shows current status
- [ ] Click "Link Project" → Modal opens
- [ ] Select program → Portfolio auto-populates → Click "Link" → Tag updates immediately

### Unlink Flow
- [ ] Admin clicks "Unlink" → Confirmation modal appears
- [ ] Click "Unlink" in modal → Tag updates to "Standalone" immediately

## Expected Results
- ✅ All routes load without errors
- ✅ Role-based UI shows/hides correctly
- ✅ Create modals work and complete in <60 seconds
- ✅ Link/unlink updates tags without page refresh
- ✅ No console errors in browser
