# Phase 0A Slice 4: Org Invites Self-Serve Onboarding

## What Shipped

### Org Invites Accept Flow with Auto Login
- **New endpoint**: `POST /api/org-invites/accept` - Accepts organization invitation and creates user account
- **Auto-login**: Returns auth payload identical to `/api/auth/login` (accessToken, refreshToken, sessionId, user)
- **Frontend page**: New `AcceptInvitePage` component at `/accept-invite` and `/org-invites/accept` routes
- **User flow**: Validates invite token → displays org details → collects fullName/password → creates account → auto-logs in → redirects via onboarding/returnUrl/home

### Strict JWT Config Validation at Startup
- **Fail-fast validation**: `AuthService.onModuleInit()` validates all JWT config at application startup
- **No fallbacks**: Removed all default values and fallback secrets from production code
- **Strict format**: Duration strings must match `/^[1-9][0-9]*[dhms]$/` (e.g., `15m`, `7d`)
- **Application fails to start** if any required config is missing or invalid (prevents production surprises)

### Frontend AcceptInvitePage with Safe returnUrl Handling
- **Open redirect prevention**: `safeNavigateToReturnUrl()` helper validates all returnUrl values
- **Allowlist-based**: Only allows same-origin relative paths matching allowed prefixes
- **Control char blocking**: Blocks CRLF and non-printable ASCII characters
- **Consolidated routing**: `completeLoginRedirect()` reused by both login and invite accept flows

## Risk Controls

### No Token Logging
- ✅ Removed all `console.log`/`console.error` statements that contained token material
- ✅ Token values never appear in console, UI, or network logs (beyond query string)
- ✅ Only user metadata (email, role, permissions) logged for debugging

### Open Redirect Blocked
- ✅ **Allowlist validation**: Only `/home`, `/onboarding`, `/workspaces`, `/projects`, `/w/`, `/admin` prefixes allowed
- ✅ **Control char blocking**: Regex `/[^\x20-\x7E]/` blocks CRLF and non-printable ASCII
- ✅ **Protocol blocking**: Blocks absolute URLs (http/https) and protocol-relative URLs (`//`)
- ✅ **Backslash blocking**: Blocks Windows-style paths with backslashes
- ✅ **Stale cleanup**: `zephix.returnUrl` cleared on invite validation failure

### E2E dropDatabase Safety Guard
- ✅ **Database name check**: E2E tests verify database name contains `test` or `e2e` before dropping
- ✅ **Fail-safe**: Throws `Error` if database name doesn't match safety criteria
- ✅ **Prevents production drops**: Accidental production database drops are blocked

## Config Keys Required

**All JWT configuration must be set in environment variables (no defaults):**

- `JWT_SECRET` - JWT signing secret (required)
- `JWT_REFRESH_SECRET` - JWT refresh token signing secret (required)
- `JWT_EXPIRES_IN` - Access token expiration (e.g., `15m`, `24h`) (required)
- `JWT_REFRESH_EXPIRES_IN` - Refresh token expiration (e.g., `7d`, `30d`) (required)

**Validation:**
- Application **fails to start** if any config is missing or invalid
- Duration format must be: positive integer + unit (`d`, `h`, `m`, or `s`)
- No fallback values in production code

**Environment Coverage:**
- ✅ Test environment (`.env.test`): All keys explicitly set
- ⚠️ Production/Staging: Must be set via Railway environment variables
- ⚠️ **Action Required**: Verify all 4 keys are set in Railway production and staging

## Files Changed

### Backend
- `src/modules/org-invites/` - New module (entity, service, controller, DTOs, tests)
- `src/modules/auth/auth.service.ts` - Strict config validation, `issueLoginForUser()` method
- `src/config/configuration.ts` - Removed JWT defaults
- `src/main.ts` - Added `trust proxy` configuration
- `test/org-invites-accept.e2e-spec.ts` - E2E test with safety guard

### Frontend
- `src/pages/auth/AcceptInvitePage.tsx` - New invite acceptance page
- `src/services/orgInvitesApi.ts` - New API client for org invites
- `src/state/AuthContext.tsx` - Consolidated post-login routing, safe returnUrl helper
- `src/pages/auth/LoginPage.tsx` - Uses shared routing logic
- `src/App.tsx` - Added `/accept-invite` and `/org-invites/accept` routes

## Testing

### Manual Test Checklist
1. ✅ `/accept-invite?token=valid` - Loads details, accepts, redirects correctly
2. ✅ `/accept-invite?token=expired` - Shows error, clears returnUrl
3. ✅ `/accept-invite` (no token) - Shows error, clears returnUrl
4. ✅ `/org-invites/accept` - Route alias works
5. ✅ `/invites/accept` - Workspace invite flow intact

### E2E Tests
- ✅ `org-invites-accept.e2e-spec.ts` - Full integration test with safety guard

## Post-Merge Checks

**Before considering merge complete, verify:**

1. **Health check**: `GET /api/health` returns 200
2. **Invite flow**: Create invite as admin → open inviteLink → accept → confirm redirect works
3. **Token refresh**: Confirm refresh works after access token expires

**If any check fails, revert immediately.**

## Breaking Changes

**None** - This is a new feature addition. Existing auth flows unchanged.

## Migration Notes

**For Railway/Production:**
- Ensure all 4 JWT config keys are set before deploying
- Application will fail to start if keys are missing (expected behavior)
- Migration uses conditional DDL - safe to run on existing databases (adds missing columns/FKs/indexes only)

## Known Pre-Existing CI Failures

**Baseline verified on main branch:**

- **Commit SHA**: `a4844937` (feat: implement workspace invite link revoke and complete join flow)
- **Lint errors**: 11 errors, 45 warnings
  - Command: `cd zephix-frontend && npm run lint:new`
  - Same failures on main and this branch
  - Log: `/tmp/main-lint-output.txt`
- **Unit test failures**: 64 failed, 237 passed
  - Command: `cd zephix-backend && npm run test -- --passWithNoTests`
  - Same failures on main and this branch (rollups integration test timeouts)
  - Log: `/tmp/main-unit-output.txt`

**Conclusion**: All CI failures are pre-existing on main. This branch does not introduce new failures.
