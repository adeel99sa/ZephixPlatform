# Verification Master Checklist

> This is a canonical document. For the latest guidance, refer to this file.

---

## Pre-Release Verification

### Build Verification

#### Backend
```bash
cd zephix-backend
npm ci
npm run lint
npm run build
npm run test
# All must pass with exit code 0
```

#### Frontend
```bash
cd zephix-frontend
npm ci
npm run lint
npm run build
npm run test:guardrails
# Verify dist/.vite/manifest.json exists
tail -n +1 dist/.vite/manifest.json | head -n 40
```

---

## Smoke Test Checklist

### Authentication Flow
- [ ] Navigate to `/login`
- [ ] Enter valid credentials
- [ ] Verify redirect to `/home` or `/hub`
- [ ] Check `Authorization` header in network requests
- [ ] Verify `X-Workspace-Id` header present

### Workspace Flow
- [ ] View workspace list
- [ ] Select a workspace
- [ ] Verify workspace-scoped data loads
- [ ] Check sidebar shows workspace context

### Project Flow
- [ ] List projects in workspace
- [ ] Create new project (if authorized)
- [ ] View project details
- [ ] Check tasks load correctly

### Admin Flow (Admin users only)
- [ ] Navigate to `/admin`
- [ ] View admin overview
- [ ] Check user list loads
- [ ] Verify workspace list loads
- [ ] Check audit log accessible

### Logout Flow
- [ ] Click logout
- [ ] Verify redirect to login
- [ ] Confirm tokens cleared
- [ ] Verify protected routes blocked

---

## API Verification

### Health Endpoints
```bash
# Backend health
curl -s https://api.yourdomain.com/api/health | jq

# Frontend health (if implemented)
curl -s https://yourdomain.com/health | jq
```

### Auth Endpoints
```bash
# Login
curl -X POST https://api.yourdomain.com/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@example.com","password":"password"}'

# Verify returns accessToken and refreshToken
```

### Protected Endpoints
```bash
# With valid token
curl https://api.yourdomain.com/api/workspaces \
  -H 'Authorization: Bearer <token>'

# Verify 200 response with data
```

---

## Database Verification

### Schema Check
```bash
psql $DATABASE_URL -c "\dt" | grep -E "users|organizations|workspaces|projects"
```

### Migration Status
```bash
# Check migrations table
psql $DATABASE_URL -c "SELECT * FROM migrations ORDER BY timestamp DESC LIMIT 10"
```

---

## Security Verification

### CORS Check
```bash
curl -I -X OPTIONS https://api.yourdomain.com/api/health \
  -H "Origin: https://yourdomain.com"

# Verify Access-Control-Allow-Origin header
```

### Headers Check
Open browser DevTools → Network → any API request:
- [ ] `Authorization: Bearer ...` present
- [ ] `X-Workspace-Id: <uuid>` present
- [ ] `X-Correlation-Id` present
- [ ] `X-Request-Id` present

### Role Enforcement
- [ ] VIEWER cannot create projects
- [ ] MEMBER cannot access admin routes
- [ ] ADMIN can access all routes
- [ ] Cross-org data not accessible

---

## Performance Verification

### Response Times
| Endpoint | Target | Acceptable |
|----------|--------|------------|
| `/api/health` | < 100ms | < 500ms |
| `/api/workspaces` | < 500ms | < 2s |
| `/api/projects` | < 500ms | < 2s |

### Bundle Size
```bash
cd zephix-frontend
npm run build
du -sh dist/
# Should be < 5MB compressed
```

---

## Deployment Verification

### Railway Status
- [ ] Backend service green
- [ ] Frontend service green
- [ ] Database service green
- [ ] No pending migrations

### DNS/SSL
- [ ] Frontend domain resolves
- [ ] Backend API domain resolves
- [ ] SSL certificates valid
- [ ] No mixed content warnings

---

## Post-Deployment Verification

### Immediate (0-5 min)
- [ ] Health endpoints return 200
- [ ] Login flow works
- [ ] No console errors

### Short-term (5-30 min)
- [ ] Error rates normal
- [ ] Response times acceptable
- [ ] No auth loop issues

### Monitoring (1-24 hours)
- [ ] No 5xx spike
- [ ] No memory leaks
- [ ] No connection exhaustion

---

## Rollback Criteria

Rollback immediately if:
- [ ] Health endpoint returns non-200
- [ ] Auth flow completely broken
- [ ] Error rate > 10%
- [ ] Response times > 10s
- [ ] Data integrity issues

---

## Source Notes

This document was created by merging the following sources:

- `BASELINE_PUSH_CHECKLIST.md` (commit: see git log)
- `docs/STEP8_VERIFICATION_CHECKLIST.md` (commit: see git log)
- `docs/WORKSPACE_VERIFICATION_CHECKLIST.md` (commit: see git log)
- `BROWSER_PROOF_STATUS.md` (commit: see git log)

*Merged on: 2026-02-04*
