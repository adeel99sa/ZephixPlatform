# CORS Configuration Guide for Zephix Backend

## Overview

This document describes the CORS (Cross-Origin Resource Sharing) configuration for the Zephix Backend, specifically designed for Railway deployment and frontend-backend communication.

## Production Configuration

### Frontend URLs
- **Primary**: `https://zephix-frontend-production.up.railway.app`
- **Domain**: `https://getzephix.com`
- **Subdomains**: `https://www.getzephix.com`, `https://app.getzephix.com`

### Backend URLs
- **Production**: `https://zephix-backend-production.up.railway.app`
- **API**: `https://api.getzephix.com`

## Environment Variables

### Required Variables
```bash
# Frontend and Backend URLs
FRONTEND_URL=https://zephix-frontend-production.up.railway.app
BACKEND_URL=https://zephix-backend-production.up.railway.app

# CORS Configuration
CORS_ALLOWED_ORIGINS=https://zephix-frontend-production.up.railway.app,https://getzephix.com,https://www.getzephix.com,https://app.getzephix.com
CORS_CREDENTIALS=true

# Environment
NODE_ENV=production
```

### Optional Variables
```bash
# Additional CORS origins (comma-separated)
CORS_ALLOWED_ORIGINS=https://zephix-frontend-production.up.railway.app,https://getzephix.com,https://custom-domain.com

# CORS debugging
CORS_DEBUG=true
```

## CORS Headers

### Allowed Headers
- `Authorization` - JWT token authentication
- `Content-Type` - Request content type
- `Accept` - Response content type preference
- `Origin` - Request origin
- `X-Requested-With` - AJAX request indicator
- `X-Org-Id` - Organization context
- `X-Request-Id` - Request tracking
- `X-CSRF-Token` - CSRF protection
- `X-Forwarded-For` - Proxy forwarding
- `X-Real-IP` - Real client IP

### Exposed Headers
- `X-RateLimit-Limit` - Rate limit information
- `X-RateLimit-Remaining` - Remaining requests
- `X-RateLimit-Reset` - Rate limit reset time
- `X-Request-Id` - Request tracking
- `X-Total-Count` - Pagination total
- `X-Page-Count` - Pagination page count

### HTTP Methods
- `GET` - Retrieve data
- `POST` - Create data
- `PUT` - Update data
- `PATCH` - Partial update
- `DELETE` - Remove data
- `OPTIONS` - Preflight requests
- `HEAD` - Headers only

## Configuration Details

### Production Settings
```typescript
{
  origin: [
    'https://zephix-frontend-production.up.railway.app',
    'https://getzephix.com',
    'https://www.getzephix.com',
    'https://app.getzephix.com'
  ],
  credentials: true, // Enable JWT authentication
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [/* All necessary headers */],
  exposedHeaders: [/* Response headers */],
  optionsSuccessStatus: 204,
  maxAge: 86400, // 24 hours
  preflightContinue: false
}
```

### Development Settings
```typescript
{
  origin: [
    'http://localhost:5173', // Vite default
    'http://localhost:3000', // Custom port
    'http://localhost:4173'  // Vite preview
  ],
  credentials: true, // For Vite proxy
  // ... other settings
}
```

## Testing CORS Configuration

### Local Testing
```bash
# Test CORS configuration
npm run test:cors

# Test with specific backend URL
BACKEND_URL=http://localhost:3000 npm run test:cors
```

### Production Testing
```bash
# Test production CORS
BACKEND_URL=https://zephix-backend-production.up.railway.app npm run test:cors
```

### Manual Testing
```bash
# Test OPTIONS preflight
curl -X OPTIONS \
  -H "Origin: https://zephix-frontend-production.up.railway.app" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Authorization,Content-Type" \
  https://zephix-backend-production.up.railway.app/api/auth/login

# Test POST request
curl -X POST \
  -H "Origin: https://zephix-frontend-production.up.railway.app" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test"}' \
  https://zephix-backend-production.up.railway.app/api/auth/login
```

## Troubleshooting

### Common CORS Issues

#### 1. Preflight Request Fails
**Problem**: OPTIONS request returns 404 or wrong status
**Solution**: Ensure OPTIONS method is handled and returns 204

#### 2. Missing CORS Headers
**Problem**: Response doesn't include Access-Control-Allow-Origin
**Solution**: Check CORS configuration is applied before other middleware

#### 3. Credentials Not Working
**Problem**: JWT tokens not being sent with requests
**Solution**: Ensure `credentials: true` and proper header configuration

#### 4. Wrong Origin in Response
**Problem**: CORS origin header doesn't match frontend URL
**Solution**: Verify environment variables and CORS configuration

### Debug Steps

1. **Check Environment Variables**
   ```bash
   echo $FRONTEND_URL
   echo $BACKEND_URL
   echo $CORS_ALLOWED_ORIGINS
   ```

2. **Verify CORS Configuration**
   ```bash
   npm run test:cors
   ```

3. **Check Browser Console**
   - Look for CORS errors
   - Verify request headers
   - Check response headers

4. **Test with curl**
   - Test preflight requests
   - Verify CORS headers in response

## Security Considerations

### Allowed Origins
- Only allow trusted domains
- Never use `*` in production
- Validate origin against allowed list

### Credentials
- Enable only when necessary
- Use secure cookies in production
- Implement proper CSRF protection

### Headers
- Limit exposed headers to necessary ones
- Validate request headers
- Sanitize response headers

## Deployment Checklist

- [ ] Environment variables set correctly
- [ ] CORS configuration tested locally
- [ ] Frontend URL added to allowed origins
- [ ] Credentials enabled for authentication
- [ ] All necessary headers allowed
- [ ] Preflight requests working
- [ ] Authentication flow tested
- [ ] Browser console error-free

## Support

For CORS-related issues:
1. Check this documentation
2. Run CORS tests: `npm run test:cors`
3. Verify environment variables
4. Check Railway deployment logs
5. Test with actual frontend application
