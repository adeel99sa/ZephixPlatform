# Phase 2 Railway Environment Variables

## Required Variables

### APP_COMMIT_SHA

**Purpose:** Provides commit SHA to `/api/version` endpoint for deployment verification.

**How to Set:**
1. Go to Railway Dashboard → Zephix project → zephix-backend service
2. Click on "Variables" tab
3. Add new variable:
   - **Name:** `APP_COMMIT_SHA`
   - **Value:** Full git commit SHA (e.g., `ad956a2721a6b3311576f1cc9471ad5d24faf13d`)
4. Redeploy the service

**Verification:**
```bash
curl -s https://zephix-backend-production.up.railway.app/api/version | jq .data.commitSha
```

Should return the commit SHA, not "unknown".

## Verification Script Environment Variables

When running `scripts/phase2-deploy-verify.sh`, you need:

- `TOKEN` - Authentication token from browser Local Storage (`zephix.at`)
- `ORG_ID` - Organization ID (from `/api/organizations`)
- `PROJECT_ID` - Project ID (from `/api/projects`)
- `WORKSPACE_ID` - Workspace ID (from `/api/workspaces`)

**Quick Setup:**
```bash
export TOKEN="your-token"
export ORG_ID=$(curl -s "$BASE/api/organizations" -H "Authorization: Bearer $TOKEN" | jq -r '.data[0].id')
export WORKSPACE_ID=$(curl -s "$BASE/api/workspaces" -H "Authorization: Bearer $TOKEN" | jq -r '.data[0].id')
export PROJECT_ID=$(curl -s "$BASE/api/projects" -H "Authorization: Bearer $TOKEN" | jq -r '.data.projects[0].id')
```

