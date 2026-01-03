# Phase 3 Deployment Checklist

## Status: ⏳ Awaiting Railway Deployment

**Local Commits Pushed:**
- `50fe290` - test(resources): add Phase 3 workspace scope and conflict lifecycle e2e coverage
- `eb12571` - feat(scripts): add Phase 3 deploy verification script
- `afcb838` - docs: update Phase 3 implementation plan and completion notes

**Expected Production SHA:** `afcb8388961a4b20543e57464010b266e38a3c11`

## Completed Steps ✅

1. ✅ **Commits pushed to main**
   - All Phase 3 code committed and pushed
   - Migration file included

2. ✅ **Migration executed in Railway**
   - Migration: `AddConflictLifecycleFields1767376476696`
   - Status: Success
   - Columns verified:
     - `resolved_by_user_id` (uuid, nullable)
     - `resolution_note` (text, nullable)
     - Foreign key constraint added

## Pending Steps ⏳

3. **Railway Deployment**
   - [ ] Check Railway dashboard for deployment status
   - [ ] Wait for deployment to complete
   - [ ] Verify `/api/version` shows commit SHA `afcb838` (or later)
   - [ ] Verify `commitShaTrusted: true`

4. **Production Verification**
   - [ ] Get fresh access token (see Developer Auth Workflow below)
   - [ ] Run Phase 3 verification script:
     ```bash
     export BASE="https://zephix-backend-production.up.railway.app"
     export TOKEN="fresh-token"
     bash scripts/phase3-deploy-verify.sh
     ```
   - [ ] Capture script output
   - [ ] Verify all tests pass

## Developer Authentication Workflow

**⚠️ Engineer-only tooling. Customers never use this.**

### Why This Exists

- Access tokens expire fast (15 minutes by design)
- Verification scripts run outside browser sessions
- Browser auto-refreshes tokens; terminal does not
- This eliminates token copy-paste friction for engineers

### Correct Usage

```bash
# Set base URL
export BASE="https://zephix-backend-production.up.railway.app"

# Interactive login (prompts for email/password)
source scripts/auth-login.sh

# Or non-interactive
export EMAIL="your-email@example.com"
export PASSWORD="your-password"
source scripts/auth-login.sh

# Token is now in TOKEN variable
bash scripts/phase3-deploy-verify.sh
```

### Incorrect Usage

```bash
# ❌ WRONG: Using 'bash' runs script in subshell
bash scripts/auth-login.sh
# TOKEN export won't persist to current shell

# ❌ WRONG: Copy-pasting tokens manually
export TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
# This works but defeats the purpose
```

### Why `source` is Required

- `bash scripts/auth-login.sh` → runs in subshell → `export TOKEN` doesn't persist
- `source scripts/auth-login.sh` → runs in current shell → `export TOKEN` persists
- Without `source`, the TOKEN variable won't be available for verification scripts

### How It Works

1. Calls `POST /api/auth/login` with email/password
2. Extracts `.data.accessToken` from response
3. Exports `TOKEN` to current shell (only when sourced)
4. Masks token in output (shows first 6 and last 6 chars)
5. Shows token expiry time

### Security

- Password input is hidden (`read -rs`)
- Token is masked in console output
- No password logging
- No token persistence to disk
- Dev/staging only (no production impact)

### Security Notes

- **Dev and staging only**: This workflow is for engineering verification only
- **No production impact**: JWT expiry, refresh tokens, and auth guards are unchanged
- **Password masking**: Password input is hidden (read -rs)
- **Token masking**: Full token is never printed to console
- **No persistence**: Token is only exported to current shell session

### Troubleshooting

- **"BASE environment variable is required"**: Set `export BASE="https://..."` first
- **"jq is required"**: Install jq: `brew install jq` (macOS) or `apt-get install jq` (Linux)
- **"Login failed (HTTP 401)"**: Check email and password are correct
- **"Access token not found"**: Check API response format hasn't changed

5. **Release Documentation**
   - [ ] Update `docs/RELEASE_LOG_PHASE3.md` with:
     - Post-deploy production SHA
     - Verification script output
     - Any requestIds for failures
     - Final status

## Verification Commands

### Check Deployment Status
```bash
curl -s "https://zephix-backend-production.up.railway.app/api/version" | jq '{commitSha: .data.commitSha, commitShaTrusted: .data.commitShaTrusted}'
```

### Verify Migration Columns
```bash
railway run --service zephix-backend -- sh -lc 'psql "$DATABASE_URL" -c "\d resource_conflicts" | grep -E "(resolved_by_user_id|resolution_note)"'
```

### Run Phase 3 Verification
```bash
export BASE="https://zephix-backend-production.up.railway.app"
export TOKEN="your-fresh-token"
bash scripts/phase3-deploy-verify.sh
```

## Expected Verification Results

- ✅ Preflight: commitShaTrusted = true
- ✅ Resource creation: 201
- ✅ HOURS allocation: 201, unitsType = HOURS
- ✅ PERCENT allocation: 201
- ✅ Conflict creation: conflicts found with totalAllocation > 100
- ✅ Conflict resolve: 200, resolved = true
- ✅ Conflict reopen: 200, resolved = false
- ✅ Patch allocation: 200, conflicts removed
- ✅ Delete allocation: 200, conflicts still absent
- ✅ HARD breach: 409 (negative test)

## Notes

- Migration already executed successfully
- Waiting for Railway to deploy new code
- Once deployed, run verification script and update release log

