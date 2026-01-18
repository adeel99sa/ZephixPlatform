# Runtime Proof Capture Guide

**Purpose:** Step-by-step guide for capturing HAR files, screenshots, and curl outputs.

---

## Prerequisites

1. Backend running: `cd zephix-backend && npm run start:dev`
2. Frontend running: `cd zephix-frontend && npm run dev`
3. Chrome DevTools ready
4. Test credentials available

---

## Step A: Clear Session

Open browser console and run:
```javascript
localStorage.removeItem('zephix.at');
localStorage.removeItem('zephix.rt');
localStorage.removeItem('zephix.sid');
localStorage.removeItem('zephix.activeWorkspaceId');
location.reload();
```

---

## Step B: Capture Auth Flow

### Browser Method

1. **Open Chrome DevTools:**
   - Network tab
   - ✅ Preserve log
   - ✅ Disable cache

2. **Start Recording:**
   - Click record button (red circle)

3. **Navigate:**
   - Go to `http://localhost:5173` (or frontend dev port)
   - **Screenshot 1:** Landing page → Save as `proofs/runtime/auth/01_landing.png`
   - Click "Sign In"
   - **Screenshot 2:** Login page → Save as `proofs/runtime/auth/02_login.png`
   - Enter credentials and submit
   - **Screenshot 3:** After login → Save as `proofs/runtime/auth/03_after_login.png`

4. **Stop Recording:**
   - Right-click in Network tab
   - "Save all as HAR with content"
   - Save to `proofs/runtime/auth/auth_flow.har`

5. **Save Console:**
   - Console tab → Right-click → "Save as..."
   - Save to `proofs/runtime/auth/console.txt`

### Curl Method

```bash
cd proofs/runtime/curl
./run.sh admin@zephix.ai test123
```

Verify `01_login_response.txt` contains 200 response with access token.

---

## Step C: Capture Workspace Selection Flow

### Browser Method

1. **Continue same session** (after login)

2. **If workspace picker shows:**
   - **Screenshot 1:** Picker visible → Save as `proofs/runtime/workspaces/01_picker.png`
   - Click a workspace
   - **Screenshot 2:** Workspace home → Save as `proofs/runtime/workspaces/02_workspace_home.png`

3. **Export HAR:**
   - Network tab → Right-click → "Save all as HAR with content"
   - Save to `proofs/runtime/workspaces/workspace_flow.har`

### Curl Method

The `run.sh` script automatically captures workspace home if a workspace exists.

Verify `04_workspace_home_response.txt` contains 200 response with workspace data.

---

## Verification

After capture, verify:

- [ ] `proofs/runtime/auth/auth_flow.har` exists
- [ ] `proofs/runtime/auth/01_landing.png` exists
- [ ] `proofs/runtime/auth/02_login.png` exists
- [ ] `proofs/runtime/auth/03_after_login.png` exists
- [ ] `proofs/runtime/workspaces/workspace_flow.har` exists (if workspace picker shown)
- [ ] `proofs/runtime/workspaces/01_picker.png` exists (if applicable)
- [ ] `proofs/runtime/workspaces/02_workspace_home.png` exists (if applicable)
- [ ] `proofs/runtime/curl/01_login_response.txt` shows 200
- [ ] `proofs/runtime/curl/02_me_response.txt` shows 200
- [ ] `proofs/runtime/curl/03_workspaces_response.txt` shows 200
- [ ] `proofs/runtime/curl/04_workspace_home_response.txt` shows 200 (if workspace exists)

---

## Updating Status Matrix

Once artifacts exist, update `proofs/recovery/ARCH_STATUS_MATRIX.md`:

- Change Auth Flow from **Partial** to **Working**
- Change Workspace Selection from **Partial** to **Working**
- Add evidence links to proof files

---

**Last Updated:** 2026-01-18
