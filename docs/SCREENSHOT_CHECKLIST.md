# Screenshot Checklist - Core Flow 04

**Date:** 2026-01-18  
**Purpose:** Track required screenshots before marking Flow 04 as PASS

## Required Screenshots

### Part A: Platform Health URLs

- [ ] **A1:** Network list showing all 5 requests (`/api/workspaces`, `/api/projects`, `/api/health`, `/api/auth/me`, `/api/version`)
  - File: `proofs/platform-health-screenshot-01-network-list.png`
  - Must NOT show `/api/api` anywhere

- [ ] **A2:** Request URL detail (click on one request, show Headers tab)
  - File: `proofs/platform-health-screenshot-02-request-url.png`
  - Show Request URL field with correct path (e.g., `/api/workspaces`)

### Part B: Create Workspace Refresh

- [ ] **B1:** POST /api/workspaces request headers
  - File: `proofs/core-04-screenshot-01-post-headers.png`
  - Show `x-workspace-id` **ABSENT**
  - Show `authorization` **PRESENT**

- [ ] **B2:** GET /api/workspaces request headers (after POST)
  - File: `proofs/core-04-screenshot-02-get-headers.png`
  - Show `x-workspace-id` **ABSENT**
  - Show request appears immediately after POST

- [ ] **B3:** Sidebar dropdown showing "Real Workspace 01" selected
  - File: `proofs/core-04-screenshot-03-dropdown.png`
  - Show new workspace in dropdown
  - Show it's selected/active

- [ ] **B4:** Local Storage showing `zephix.activeWorkspaceId`
  - File: `proofs/core-04-screenshot-04-localstorage.png`
  - Show key and value
  - Value equals new workspace ID

## After All Screenshots Captured

1. Add screenshots to `proofs/core-04-create-workspace.md`
2. Add observed results:
   - Dropdown refreshed without reload ✅
   - localStorage updated to new workspace ID ✅
3. Update status to ✅ PASS
4. Update execution board with commit hash

---

**Status:** ⚠️ Awaiting screenshots
