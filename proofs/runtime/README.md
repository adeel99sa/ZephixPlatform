# Runtime Proof Artifacts

**Purpose:** Capture runtime evidence (HAR files, screenshots, curl outputs) for Auth and Workspace flows.

---

## Directory Structure

```
proofs/runtime/
├── auth/                    # Auth flow artifacts
│   ├── auth_flow.har       # Network HAR file
│   ├── console.txt         # Console logs
│   ├── 01_landing.png      # Screenshot: Landing page
│   ├── 02_login.png        # Screenshot: Login page
│   └── 03_after_login.png  # Screenshot: After login
├── workspaces/              # Workspace selection flow artifacts
│   ├── workspace_flow.har  # Network HAR file
│   ├── 01_picker.png       # Screenshot: Workspace picker
│   └── 02_workspace_home.png # Screenshot: Workspace home
└── curl/                    # API curl proofs
    ├── run.sh               # Curl script
    ├── 01_login_response.txt
    ├── 02_me_response.txt
    ├── 03_workspaces_response.txt
    └── 04_workspace_home_response.txt
```

---

## Capture Instructions

### A. Browser Artifacts (Manual)

1. **Clear localStorage:**
   ```javascript
   localStorage.removeItem('zephix.at');
   localStorage.removeItem('zephix.rt');
   localStorage.removeItem('zephix.sid');
   localStorage.removeItem('zephix.activeWorkspaceId');
   ```

2. **Start servers:**
   - Backend: `cd zephix-backend && npm run start:dev`
   - Frontend: `cd zephix-frontend && npm run dev`

3. **Chrome DevTools:**
   - Network tab: Preserve log ON, Disable cache ON
   - Start recording
   - Navigate through flow
   - Export HAR to appropriate folder
   - Save screenshots

### B. Curl Proofs (Automated)

```bash
cd proofs/runtime/curl
chmod +x run.sh
./run.sh [email] [password]
```

**Default credentials:** Uses `admin@zephix.ai` / `test123` if not provided.

---

## Status Matrix Integration

Flows marked as **Working** when:
- `proofs/runtime/auth/auth_flow.har` exists, OR
- `proofs/runtime/curl/01_login_response.txt` shows 200 response

Flows marked as **Partial** when:
- Only controllers exist, no runtime proof

---

**Last Updated:** 2026-01-18
