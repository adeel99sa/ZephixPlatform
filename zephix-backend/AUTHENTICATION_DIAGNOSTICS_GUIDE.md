# 🔐 Zephix Authentication Diagnostics Guide

## Overview

This guide provides comprehensive instructions for diagnosing authentication issues in the Zephix application. The diagnostic package includes automated testing, manual verification steps, and troubleshooting procedures.

## 🚀 Quick Start

### 1. Run Full Diagnostic Package (Recommended)

```bash
# From the zephix-backend directory
npm run auth:diagnose:full
```

This creates a complete diagnostic package with all information needed for troubleshooting.

### 2. Run Individual Diagnostic Tests

```bash
# Backend authentication diagnostics
npm run auth:diagnose

# Browser authentication diagnostics  
npm run auth:diagnose:browser

# Run both tests
npm run auth:test
```

## 📋 What the Diagnostics Collect

### Backend Diagnostics (`auth:diagnose`)
- ✅ Backend health check
- ✅ CORS preflight validation
- ✅ Authentication endpoint availability
- ✅ JWT configuration analysis
- ✅ Database connection test
- ✅ Rate limiting configuration
- ✅ Security headers check
- ✅ Environment variable validation

### Browser Diagnostics (`auth:diagnose:browser`)
- ✅ Pre-authentication state
- ✅ CORS preflight for login
- ✅ Login attempt simulation
- ✅ Profile access with token
- ✅ Invalid token handling
- ✅ Token refresh flow
- ✅ Logout flow
- ✅ Rate limiting behavior

### Network Diagnostics
- ✅ Backend connectivity tests
- ✅ Endpoint availability checks
- ✅ CORS preflight validation
- ✅ Health endpoint verification

### Environment Information
- ✅ System information (OS, Node.js version)
- ✅ Project configuration (Git SHA, branch)
- ✅ Environment variables (redacted for security)
- ✅ Package.json dependencies

### Application Logs
- ✅ TypeScript build logs
- ✅ Authentication diagnostic logs
- ✅ Browser diagnostic logs
- ✅ System logs (if available)
- ✅ Application logs (if available)

## 🔧 Manual Diagnostic Steps

### 1. Environment Snapshot

**Frontend URL:** `https://getzephix.com` (production) or `http://localhost:5173` (development)
**Backend URL:** `https://zephix-backend-production.up.railway.app` (production) or `http://localhost:3000` (development)
**Authentication Type:** JWT-based (not OIDC)
**Session Storage:** JWT tokens in localStorage

### 2. Browser Testing

#### Step 1: Open Browser DevTools
- Press F12 or right-click → Inspect
- Go to Network tab
- Check "Preserve log"

#### Step 2: Perform Login Attempt
1. Navigate to login page
2. Enter test credentials
3. Click login
4. Watch network tab for requests

#### Step 3: Capture Network Information
- Export HAR file: Right-click in Network tab → "Save all as HAR with content"
- Note all request/response headers
- Check for CORS errors
- Verify JWT token in response

### 3. Backend Log Analysis

#### Start Clean Log Window
```bash
# Clear existing logs
rm -f logs/*.log

# Start backend with verbose logging
LOG_LEVEL=debug npm run start:dev
```

#### Monitor During Login Attempt
- Watch console output
- Look for authentication errors
- Check database connection logs
- Monitor JWT validation logs

### 4. Configuration Verification

#### Required Environment Variables
```bash
# Core Configuration
JWT_SECRET=your-secure-jwt-secret
DATABASE_URL=postgresql://user:pass@host:port/db
NODE_ENV=production
CORS_ALLOWED_ORIGINS=https://getzephix.com

# Security Configuration
HELMET_ENABLED=true
RATE_LIMIT_ENABLED=true
JWT_EXPIRES_IN=24h
```

#### CORS Configuration
```typescript
// Verify in main.ts or app.module.ts
app.enableCors({
  origin: process.env.CORS_ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID']
});
```

## 🚨 Common Issues and Solutions

### Issue 1: CORS Errors
**Symptoms:** Browser console shows CORS errors
**Solutions:**
- Verify `CORS_ALLOWED_ORIGINS` includes frontend URL
- Check that `credentials: true` is set
- Ensure preflight OPTIONS requests are handled

### Issue 2: JWT Token Invalid
**Symptoms:** 401 Unauthorized errors after login
**Solutions:**
- Verify `JWT_SECRET` is set and secure
- Check token expiration settings
- Ensure JWT strategy is properly configured

### Issue 3: Database Connection Failed
**Symptoms:** Health check shows database disconnected
**Solutions:**
- Verify `DATABASE_URL` is correct
- Check database server is running
- Verify network connectivity to database

### Issue 4: Rate Limiting Too Aggressive
**Symptoms:** Legitimate requests get 429 errors
**Solutions:**
- Adjust `RATE_LIMIT_MAX` and `RATE_LIMIT_WINDOW_MS`
- Check if auth-specific rate limiting is too strict
- Verify rate limiting configuration

### Issue 5: Frontend Can't Reach Backend
**Symptoms:** Network errors in browser console
**Solutions:**
- Verify backend URL is correct
- Check backend service is running
- Verify network/firewall configuration

## 📊 Diagnostic Output Analysis

### Critical Issues (Must Fix)
- ❌ JWT_SECRET not set
- ❌ Database connection failed
- ❌ CORS preflight failing
- ❌ Authentication endpoints unavailable

### Warning Issues (Should Fix)
- ⚠️ Rate limiting not configured
- ⚠️ Security headers missing
- ⚠️ Environment variables incomplete
- ⚠️ Logging level too low

### Information Issues (Monitor)
- ℹ️ Optional features not configured
- ℹ️ Performance metrics
- ℹ️ Configuration recommendations

## 🔍 Advanced Troubleshooting

### 1. JWT Token Analysis
```bash
# Decode JWT token (header and payload only)
echo "your.jwt.token" | cut -d'.' -f1,2 | base64 -d | jq .

# Check token expiration
jwt decode your.jwt.token
```

### 2. Database Connection Test
```bash
# Test PostgreSQL connection
psql "$DATABASE_URL" -c "SELECT version();"

# Test from backend container
docker exec -it backend-container psql "$DATABASE_URL" -c "SELECT 1;"
```

### 3. Network Connectivity Test
```bash
# Test backend reachability
curl -v "$BACKEND_URL/health"

# Test CORS preflight
curl -X OPTIONS \
  -H "Origin: $FRONTEND_URL" \
  -H "Access-Control-Request-Method: POST" \
  "$BACKEND_URL/auth/login"
```

### 4. Log Analysis
```bash
# Search for authentication errors
grep -i "auth\|jwt\|token" logs/*.log

# Search for CORS errors
grep -i "cors\|origin" logs/*.log

# Search for database errors
grep -i "database\|connection" logs/*.log
```

## 📤 Sharing Diagnostic Results

### 1. Complete Diagnostic Package
- Run `npm run auth:diagnose:full`
- Share the generated `.tar.gz` file
- Include any additional error messages

### 2. Manual Information Collection
If automated diagnostics fail, collect:
- Environment snapshot (URLs, versions, time)
- Browser console errors
- Network tab HAR file
- Backend logs during issue
- Configuration files (redacted)

### 3. Issue Reproduction Steps
- Exact steps to reproduce
- Expected vs actual behavior
- Error messages and timestamps
- Browser and OS information

## 🛠️ Maintenance and Updates

### Regular Health Checks
```bash
# Weekly diagnostic run
npm run auth:test

# Monthly full diagnostic
npm run auth:diagnose:full
```

### Configuration Validation
- Verify environment variables after deployments
- Test CORS settings after domain changes
- Validate JWT configuration after secret updates
- Check rate limiting after traffic pattern changes

### Performance Monitoring
- Monitor authentication response times
- Track failed authentication attempts
- Monitor token refresh patterns
- Watch for rate limiting triggers

## 📚 Additional Resources

### Documentation
- [NestJS Authentication Guide](https://docs.nestjs.com/security/authentication)
- [JWT Best Practices](https://auth0.com/blog/a-look-at-the-latest-draft-for-jwt-bcp/)
- [CORS Configuration](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)

### Tools
- [JWT Debugger](https://jwt.io/)
- [CORS Tester](https://www.test-cors.org/)
- [HTTP Status Codes](https://httpstatuses.com/)

### Support
- Check diagnostic reports for specific recommendations
- Review error logs for detailed error information
- Use browser dev tools for frontend debugging
- Monitor backend logs for server-side issues

---

**Last Updated:** Current  
**Version:** 1.0  
**Maintainer:** Engineering Team
