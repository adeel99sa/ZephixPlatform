# Phase 2 Railway Environment Variables

## Commit SHA Resolution

**Note:** Railway automatically sets `RAILWAY_GIT_COMMIT_SHA` for each deployment. The `/api/version` endpoint uses this value in production.

**Priority Order:**
1. `RAILWAY_GIT_COMMIT_SHA` (Railway auto-injected) - **Used in production**
2. `GIT_COMMIT_SHA` (CI/CD or manual)
3. `APP_COMMIT_SHA` (only in non-production environments)

**Verification:**
```bash
curl -s https://zephix-backend-production.up.railway.app/api/version | jq '.data | {commitSha, commitShaTrusted}'
```

**Expected Response:**
- `commitSha`: The actual deployment commit SHA (from `RAILWAY_GIT_COMMIT_SHA`)
- `commitShaTrusted`: `true` if SHA comes from Railway or CI/CD, `false` if missing in production

**Important:** Do not set `APP_COMMIT_SHA` in production. Railway automatically provides the commit SHA via `RAILWAY_GIT_COMMIT_SHA`.

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

