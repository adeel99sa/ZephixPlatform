# Step 8: Sharing and Permissions - Runbook

## Authentication Context

**Why tokens are needed:**
- JWT access tokens expire fast (900 seconds / 15 minutes)
- Each terminal run is a separate process - if `TOKEN` is not in the current shell, the script has nothing to send
- This is an **engineer workflow**, not a customer workflow
- Normal customers use the web app which handles login and token refresh automatically

**For customer API access later:**
- Personal access tokens with scoped permissions and rotation
- OAuth2 for third-party apps
- Service accounts for automated systems

**Which credentials to use:**
- Use the email and password for the **UAT user** you created
- The script uses them only to call `POST /api/auth/login` and export `TOKEN` for the current shell
- **Do not use admin personal credentials for automation**

## How to Run Backend Locally

```bash
# Terminal 1: Start backend
cd zephix-backend
export DATABASE_URL="postgres://user:pass@host:port/db"
npm install
npm run migration:run
npm run start:dev
```

```bash
# Terminal 2: Run verification (at repo root)
export BASE="http://localhost:3000"
export EMAIL="uat-user-email"
export PASSWORD="uat-user-password"
source scripts/auth-login.sh  # IMPORTANT: Use 'source', not 'bash'
bash scripts/phase4-dashboard-studio-verify.sh
```

## How to Run Backend in Production

```bash
export BASE="https://zephix-backend-production.up.railway.app"
export EMAIL="uat-user-email"
export PASSWORD="uat-user-password"
source scripts/auth-login.sh  # IMPORTANT: Use 'source', not 'bash'
bash scripts/run-phase4-dashboard-verify.sh
```

This runner discovers `ORG_ID` and `WORKSPACE_ID`, then runs the full verification.

## How to Run Step 8 Share-Only Smoke Script

**Prerequisites:**
- You need `DASHBOARD_ID` and `WORKSPACE_ID`
- If you don't know them, run the full verification once - it prints created IDs

```bash
export BASE="http://localhost:3000"  # or production BASE
export EMAIL="uat-user-email"
export PASSWORD="uat-user-password"
source scripts/auth-login.sh  # IMPORTANT: Use 'source', not 'bash'
export WORKSPACE_ID="your-workspace-uuid"
export DASHBOARD_ID="your-dashboard-uuid"
bash scripts/step8-backend-smoke.sh
```

## How to Run Frontend Locally

```bash
cd zephix-frontend
npm install
npm run dev
```

Open `http://localhost:5173`

**Important:** Select a workspace in your UI. Dashboard pages require `x-workspace-id` behind the scenes.

## Manual Checks for Step 8 Sharing

1. Open `/dashboards` and activate a template
2. Open the dashboard view. Click **Share**. Enable sharing. Copy link
3. Open the copied link in an **incognito window**
4. **Confirm:**
   - Edit and Share buttons are **hidden**
   - Analytics widgets show **"Sign in required"** state
5. Go back to signed-in window. **Disable sharing**
6. Refresh the incognito link. It should **fail** (403/400)

## Troubleshooting

### Authentication Issues

- **"TOKEN not set" errors**: 
  - ✅ Use `source scripts/auth-login.sh` (not `bash scripts/auth-login.sh`)
  - ✅ Confirm `BASE` points to the same environment where you deployed
  - ✅ Check that `EMAIL` and `PASSWORD` are set correctly

- **403 Forbidden errors**:
  - ✅ Confirm you selected a workspace in the UI
  - ✅ No workspace means 403 for most endpoints
  - ✅ Ensure `x-workspace-id` header is included in authenticated requests

### Share Functionality Issues

- **Share token missing**: Enable share route response shape changed, check `.data.shareToken` or `.data.token` path
- **Public fetch returns 401**: `OptionalJwtAuthGuard` is not allowing unauthenticated access, check guard implementation
- **Templates or share routes return 404**: Route order or controller registration order issue, ensure static routes before `:id` routes

### Debugging Failed Requests

1. Copy the `RequestId` printed by the scripts
2. Check Railway logs for that `RequestId`
3. Look for authentication errors, missing headers, or route mismatches

