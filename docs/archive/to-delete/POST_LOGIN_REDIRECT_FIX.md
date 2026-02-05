# Post-Login Redirect Fix

## Problem
After login, users were redirected to `/home`, but `/home` requires a workspace. When users have 0 workspaces, they see the "Select workspace" dialog instead of the proper workspace selection page.

## Root Cause
- Login redirects to `/home` (line 63-64 in LoginPage.tsx)
- `/home` is in `WORKSPACE_REQUIRED_ROUTES` (DashboardLayout.tsx)
- When `workspaceReady` is false, `DashboardLayout` shows `WorkspaceSelectionScreen`
- This shows "No workspaces available" dialog instead of the proper `/workspaces` page

## Solution
Changed login redirect from `/home` to `/workspaces`:
- `/workspaces` is the proper workspace selection/index page
- It handles all cases: 0 workspaces (empty state), 1 workspace (auto-select), 2+ workspaces (selector)
- `/workspaces` does NOT require workspace selection - it IS the selection page

## Changes Made
1. **LoginPage.tsx**: Changed default redirect from `/home` to `/workspaces`
2. **DashboardLayout.tsx**: Added comment clarifying `/workspaces` doesn't require workspace

## Expected Behavior After Fix
- **0 workspaces**: User sees `/workspaces` with proper empty state and "Create workspace" button (if Admin)
- **1 workspace**: User auto-redirects to `/workspaces/:id` (workspace home)
- **2+ workspaces**: User sees `/workspaces` with workspace list to select from

## Phase 5.1 Alignment
This matches PROMPT 4 specs:
- "Login landing logic: Admin & no workspace: Show workspace selector"
- "Member & one workspace: Auto enter workspace home"
- "Member & multiple workspaces: Show workspace selector"
- "No blank/generic Home page"
