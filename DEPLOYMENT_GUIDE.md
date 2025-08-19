# Zephix Deployment Guide

## Overview
This guide covers the deployment of Zephix to staging and production environments on Railway, with strict CORS controls and centralized API management.

## Security Changes Implemented

### ✅ CORS Lockdown
- **Removed wildcard CORS** from backend railway.toml
- **Strict origin validation** in main.ts
- **Environment-specific origins** per deployment

### ✅ API Centralization
- **Single VITE_API_URL source** for production
- **Migrated all direct fetch calls** to centralized apiJson/apiFetch
- **No fallback URLs** or hardcoded localhost references

### ✅ Single Login Endpoint
- **Only POST /api/auth/login** is active
- **Deprecated duplicate endpoint** in modules/auth

## Environment Configuration

### Backend Environment Variables

#### Staging Backend
```bash
NODE_ENV=production
PORT=3000
CORS_ALLOWED_ORIGINS=https://zephix-frontend-staging.up.railway.app
```

#### Production Backend
```bash
NODE_ENV=production
PORT=3000
CORS_ALLOWED_ORIGINS=https://zephix-frontend-production.up.railway.app,https://getzephix.com,https://www.getzephix.com,https://app.getzephix.com
```

### Frontend Environment Variables

#### Staging Frontend
```bash
VITE_API_URL=https://zephix-backend-staging.up.railway.app/api
VITE_STRICT_JWT=false
VITE_SENTRY_ENVIRONMENT=staging
VITE_SENTRY_RELEASE=$npm_package_version
```

#### Production Frontend
```bash
VITE_API_URL=https://zephix-backend-production.up.railway.app/api
VITE_STRICT_JWT=false
VITE_SENTRY_DSN=
VITE_SENTRY_ENVIRONMENT=production
VITE_SENTRY_RELEASE=$npm_package_version
```

## Deployment Process

### 1. Staging Deployment

#### Backend Staging
```bash
cd zephix-backend
./scripts/deploy-staging.sh
```

**Build Command:** `npm run build`
**Start Command:** `npm run start:prod`
**Health Check:** `/api/health`

#### Frontend Staging
```bash
cd zephix-frontend
./scripts/deploy-staging.sh
```

**Build Command:** `npm run build`
**Publish Directory:** `dist`

### 2. Production Deployment

#### Backend Production
```bash
cd zephix-backend
./scripts/deploy-production.sh
```

**Build Command:** `npm run build`
**Start Command:** `npm run start:prod`
**Health Check:** `/api/health`

#### Frontend Production
```bash
cd zephix-frontend
./scripts/deploy-production.sh
```

**Build Command:** `npm run build`
**Publish Directory:** `dist`

## Smoke Tests

### Staging Smoke Tests
```bash
# Health Check
curl -i https://zephix-backend-staging.up.railway.app/api/health

# Login Test
curl -s -X POST https://zephix-backend-staging.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@zephix.com","password":"YOURPASS"}' | jq .

# Frontend Test
open https://zephix-frontend-staging.up.railway.app
```

### Production Smoke Tests
```bash
# Health Check
curl -i https://zephix-backend-production.up.railway.app/api/health

# Login Test
curl -s -X POST https://zephix-backend-production.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@zephix.com","password":"YOURPASS"}' | jq .

# Frontend Test
open https://getzephix.com
# or
open https://zephix-frontend-production.up.railway.app
```

## CI Guardrails

### Automated Checks
The CI guardrails script prevents regressions:

```bash
cd zephix-frontend
./scripts/ci-guardrails.sh
```

**Checks:**
- ✅ No direct fetch calls outside services/api.ts
- ✅ No hardcoded localhost URLs
- ✅ No deprecated VITE_API_BASE_URL usage
- ✅ Proper VITE_API_URL usage

### Manual Verification
```bash
# Check for direct fetch calls
grep -n "fetch(" src | grep -v "services/api.ts"

# Check for hardcoded URLs
grep -n "http://localhost:3000\|https://api\." src

# Check for deprecated env vars
grep -n "VITE_API_BASE_URL" src
```

## Troubleshooting

### Common Issues

#### CORS Errors
- Verify `CORS_ALLOWED_ORIGINS` is set correctly in Railway
- Check that frontend domain matches allowed origins
- Ensure no wildcard (*) in production

#### API Connection Issues
- Verify `VITE_API_URL` is set correctly
- Check backend health endpoint
- Ensure no hardcoded fallback URLs

#### Build Failures
- Run CI guardrails: `./scripts/ci-guardrails.sh`
- Check for direct fetch calls
- Verify all imports use centralized API

### Rollback Procedure
```bash
# Backend rollback
railway rollback --service zephix-backend-staging
railway rollback --service zephix-backend-production

# Frontend rollback
railway rollback --service zephix-frontend-staging
railway rollback --service zephix-frontend-production
```

## Security Compliance

### OWASP ASVS Level 1
- ✅ CORS properly configured
- ✅ No wildcard origins in production
- ✅ Input validation via class-validator
- ✅ JWT tokens with proper expiry
- ✅ Rate limiting implemented

### Environment Security
- ✅ No secrets in code
- ✅ Environment variables in Railway UI
- ✅ Proper CORS origins per environment
- ✅ Health checks for monitoring

## Monitoring

### Health Checks
- Backend: `/api/health`
- Frontend: Railway static hosting health
- Database connectivity monitoring

### Logs
- Railway deployment logs
- Application error logs
- Security event logging

## Next Steps

### Post-MVP Improvements
- [ ] Move from localStorage to httpOnly refresh cookies
- [ ] Implement CSRF protection
- [ ] Add API rate limiting per user
- [ ] Enhanced security headers

### Monitoring Enhancements
- [ ] Sentry error tracking
- [ ] Performance monitoring
- [ ] Security event correlation
- [ ] Automated security scanning

---

**Last Updated:** Current
**Version:** 1.0
**Owner:** Engineering Team
