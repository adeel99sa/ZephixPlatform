# Zephix API Debug Guide

## 🚨 Current Issue
Frontend cannot connect to backend API - requests are hanging or failing.

## 🔍 Step-by-Step Debugging

### 1. Identify the Exact Request
**Open DevTools → Network → Click Sign In → Select the red row**

**Expected Request:**
- **URL:** `https://api.getzephix.com/api/auth/login`
- **Method:** `POST`
- **Status:** Should be 2xx (success) or 4xx (client error), NOT pending

### 2. Test API Endpoints from Terminal

#### Test Railway Origin Directly
```bash
# Test health endpoint (should work)
curl -v https://zephix-backend-production.up.railway.app/api/health

# Test OPTIONS on login (should return 204)
curl -v -X OPTIONS https://zephix-backend-production.up.railway.app/api/auth/login

# Test POST on login (should return 401 - unauthorized)
curl -v -X POST https://zephix-backend-production.up.railway.app/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@example.com","password":"test"}'
```

#### Test Cloudflare Proxy
```bash
# Test health endpoint via Cloudflare
curl -v https://api.getzephix.com/api/health

# Test OPTIONS on login via Cloudflare
curl -v -X OPTIONS https://api.getzephix.com/api/auth/login

# Test POST on login via Cloudflare
curl -v -X POST https://api.getzephix.com/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@example.com","password":"test"}'
```

### 3. Expected Outcomes

| Response | Meaning | Issue |
|----------|---------|-------|
| **Fast 2xx or 4xx** | ✅ Origin reachable | Frontend config issue |
| **Long hang then fail** | ❌ Cloudflare or routing problem | DNS/Proxy issue |
| **404** | ❌ Wrong path | Backend route issue |
| **CORS error in curl** | ⚠️ Unlikely | Browser-only issue |

### 4. Frontend Configuration

#### Current Settings
- **File:** `zephix-frontend/src/utils/constants.ts`
- **Current:** `https://api.getzephix.com/api` ✅
- **Fallback:** `https://api.getzephix.com/api` ✅

#### Environment Variables
Set these in your Railway frontend service:
```bash
VITE_API_BASE_URL=https://api.getzephix.com/api
```

### 5. Cloudflare Configuration

#### DNS Settings
- **Record:** `api` CNAME → `zephix-backend-production.up.railway.app`
- **Proxy:** ✅ Proxied (orange cloud)

#### Cache Rules
- **Rule:** Bypass cache for `/api/*`
- **Pattern:** `api.getzephix.com/api/*`

#### Configuration Rules
- **Rule:** Origin cache control Off for `/api/*`
- **Pattern:** `api.getzephix.com/api/*`

#### SSL/TLS
- **Mode:** Full Strict ✅

### 6. Backend CORS Configuration

#### Current CORS Setup ✅
```typescript
app.enableCors({
  origin: (origin, callback) => {
    // Allows: getzephix.com, www.getzephix.com, *.railway.app
    const productionOrigins = [
      'https://getzephix.com',
      'https://www.getzephix.com',
      /\.railway\.app$/,
    ];
    // ... origin validation logic
  },
  credentials: true,
  methods: 'GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS',
  allowedHeaders: 'Authorization,Content-Type,Accept,Origin,X-Requested-With',
  optionsSuccessStatus: 200,
  maxAge: 86400,
});
```

#### OPTIONS Handler Added ✅
```typescript
@Options('login')
@HttpCode(204)
@Header('Access-Control-Allow-Origin', 'https://getzephix.com')
@Header('Access-Control-Allow-Credentials', 'true')
@Header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
@Header('Access-Control-Allow-Methods', 'POST, OPTIONS')
optionsLogin() {
  return;
}
```

### 7. Health Endpoints ✅

#### Available Endpoints
- `GET /api/health` - Basic health check
- `GET /api/health/detailed` - Detailed system info
- `GET /api/ready` - Readiness check

#### Test Commands
```bash
# Basic health
curl https://api.getzephix.com/api/health

# Detailed health
curl https://api.getzephix.com/api/health/detailed

# Readiness
curl https://api.getzephix.com/api/ready
```

### 8. Quick Debug Script

Run the automated debug script:
```bash
cd zephix-backend
./debug-api.sh
```

This script will:
- Test Railway origin directly
- Test Cloudflare proxy
- Check DNS resolution
- Provide summary and next steps

### 9. Common Issues & Fixes

#### Case A: 404 on Login
**Problem:** Backend route name differs
**Fix:** Check route naming in `auth.controller.ts`

#### Case B: Preflight Hangs
**Problem:** CORS not enabled or blocked by guard
**Fix:** Ensure `app.enableCors()` runs before any middleware

#### Case C: 522/524 at Cloudflare
**Problem:** Backend port/service sleeping
**Fix:** Scale to one always-on instance in Railway

#### Case D: Cookie-based Auth
**Problem:** Cookie domain/security settings
**Fix:** Set `SameSite=None, Secure, Domain=.getzephix.com`

### 10. Verification Steps

#### 1. Test from Outside Cloudflare
```bash
curl -v https://zephix-backend-production.up.railway.app/api/health
```

#### 2. Test Cloudflare Proxy
```bash
curl -v https://api.getzephix.com/api/health
```

#### 3. Compare Response Times
- **Railway direct:** Should be < 500ms
- **Cloudflare proxy:** Should be < 1000ms

### 11. Next Actions

1. **Run the debug script:** `./debug-api.sh`
2. **Check DevTools Network tab** for exact request details
3. **Test both endpoints** (Railway direct vs Cloudflare)
4. **Verify Cloudflare settings** (DNS, Cache Rules, SSL)
5. **Check Railway service status** and logs

### 12. Success Criteria

✅ **Health endpoint responds in < 500ms**
✅ **Login endpoint returns 401 (not 404) in < 1000ms**
✅ **No CORS errors in browser console**
✅ **Frontend successfully authenticates**

---

**Owner:** Backend Team  
**Priority:** High  
**Status:** In Progress
