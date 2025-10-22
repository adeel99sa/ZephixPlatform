# 🛠️ Troubleshooting Guide

## Common Issues & Solutions

### 401 Authentication Loops

**Symptoms**: Infinite 401 → refresh → 401 → refresh cycles

**Root Causes**:
- Refresh endpoint changed URL
- Refresh token expired
- Backend refresh endpoint not working

**Solutions**:
1. Check refresh endpoint URL in `src/lib/api/client.ts`
2. Verify refresh token is valid in localStorage
3. Test refresh endpoint directly: `curl -X POST /api/auth/refresh`
4. Update auth route exclusion list if new auth routes added

**Code Check**:
```typescript
// In src/lib/api/client.ts - ensure these routes are excluded from refresh
const isAuthRoute = (url: string) =>
  url.includes('/auth/login') || 
  url.includes('/auth/refresh') || 
  url.includes('/auth/logout');
```

### CORS Errors

**Symptoms**: `Access to fetch at '...' from origin '...' has been blocked by CORS policy`

**Root Causes**:
- Backend CORS not configured for frontend origin
- Missing credentials in CORS config
- Preflight requests failing

**Solutions**:
1. Update backend CORS to allow frontend origin
2. Ensure `credentials: true` in CORS config
3. Check preflight OPTIONS requests in Network tab
4. Verify `VITE_API_BASE` environment variable

**Backend CORS Example**:
```javascript
app.use(cors({
  origin: ['http://localhost:5178', 'https://yourdomain.com'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Workspace-Id', 'x-request-id', 'x-correlation-id']
}));
```

### Chunk Load Errors

**Symptoms**: `Loading chunk ... failed` or `lazy resolves to undefined`

**Root Causes**:
- CDN cache serving old chunks
- Chunk names changed between builds
- Network issues during chunk loading

**Solutions**:
1. Purge CDN cache completely
2. Verify chunk names in `dist/.vite/manifest.json`
3. Check Network tab for 404s on chunk files
4. Ensure SPA fallback is configured (`/index.html`)

**CDN Configuration**:
```nginx
# Nginx SPA fallback
location / {
  try_files $uri $uri/ /index.html;
}
```

### Double API Prefix (`/api/api/...`)

**Symptoms**: 404 errors on API calls, URLs show `/api/api/users`

**Root Causes**:
- Passing full URLs to apiClient
- Incorrect baseURL configuration
- Manual URL construction

**Solutions**:
1. Use relative paths: `apiClient.get('/users')` not `apiClient.get('/api/users')`
2. Check `normalizeApiPath` function in `src/lib/api/client.ts`
3. Remove any manual `/api` prefixing

**Correct Pattern**:
```typescript
// ✅ Correct
const { data } = await apiClient.get('/users');

// ❌ Wrong
const { data } = await apiClient.get('/api/users');
```

### MSW (Mock Service Worker) Issues

**Symptoms**: Tests failing, network requests not intercepted

**Root Causes**:
- MSW not started in test environment
- Handler patterns not matching requests
- MSW version compatibility issues

**Solutions**:
1. Ensure MSW is started in test setup
2. Check handler patterns match actual requests
3. Update MSW to latest version
4. Verify MSW is only active in test environment

**Test Setup Example**:
```typescript
// src/test/setup.ts
import { setupServer } from 'msw/node';
import { handlers } from './mocks/handlers';

export const server = setupServer(...handlers);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

### Token Refresh Failures

**Symptoms**: Users getting logged out unexpectedly, 401 errors after token expiry

**Root Causes**:
- Refresh token expired
- Refresh endpoint returning errors
- Network issues during refresh

**Solutions**:
1. Check refresh token expiry in localStorage
2. Test refresh endpoint manually
3. Verify refresh token is being sent correctly
4. Check for network connectivity issues

**Debug Steps**:
```typescript
// Add logging to refresh function
private async refreshToken(): Promise<void> {
  console.log('Attempting token refresh...');
  try {
    const { data } = await apiClient.post('/auth/refresh', { refreshToken });
    console.log('Token refresh successful');
    // ... rest of function
  } catch (error) {
    console.error('Token refresh failed:', error);
    throw error;
  }
}
```

### Bundle Size Issues

**Symptoms**: Slow page loads, large bundle sizes

**Root Causes**:
- Unused dependencies
- Large libraries not tree-shaken
- Duplicate code across chunks

**Solutions**:
1. Run bundle analysis: `npm run build && npx vite-bundle-analyzer dist`
2. Remove unused dependencies
3. Use dynamic imports for large libraries
4. Check for duplicate code in chunks

**Bundle Analysis**:
```bash
npm install --save-dev vite-bundle-analyzer
npm run build
npx vite-bundle-analyzer dist
```

### Environment Variable Issues

**Symptoms**: API calls going to wrong endpoints, missing configuration

**Root Causes**:
- Environment variables not set
- Wrong variable names
- Build-time vs runtime variables

**Solutions**:
1. Check `.env` files are in correct location
2. Verify variable names start with `VITE_`
3. Restart dev server after changing env vars
4. Check build process includes env vars

**Environment Setup**:
```bash
# .env.local
VITE_API_BASE=https://api.yourdomain.com
VITE_APP_NAME=Zephix
```

### React Query Cache Issues

**Symptoms**: Stale data, cache not updating, infinite loading

**Root Causes**:
- Incorrect query keys
- Cache not invalidated after mutations
- Stale time too long

**Solutions**:
1. Use consistent query keys
2. Invalidate cache after mutations
3. Adjust stale time settings
4. Use `refetchOnWindowFocus: false` if needed

**Query Key Patterns**:
```typescript
// ✅ Consistent keys
['users', { page: 1, search: 'john' }]
['user', userId]
['projects', { status: 'active' }]

// ❌ Inconsistent keys
['users', 'page1', 'search-john']
['user-detail', userId]
```

## Debugging Tools

### Network Tab Analysis
1. Open DevTools → Network tab
2. Look for:
   - Request headers (`Authorization`, `X-Workspace-Id`, `x-correlation-id`)
   - Response status codes
   - Request/response timing
   - CORS preflight requests

### Console Logging
```typescript
// Add to apiClient for debugging
console.log('API Request:', {
  url: config.url,
  method: config.method,
  headers: config.headers
});
```

### Error Boundary
```typescript
// Add error boundary to catch React errors
class ErrorBoundary extends React.Component {
  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }
}
```

## Getting Help

### Log Collection
When reporting issues, include:
1. Browser console errors
2. Network tab screenshots
3. Request/response details
4. Steps to reproduce
5. Environment details (browser, OS, etc.)

### Common Commands
```bash
# Check for issues
npm run lint
npm run test:guardrails
npm run build

# Debug mode
npm run dev -- --debug
npm run test -- --verbose

# Clean install
rm -rf node_modules package-lock.json
npm install
```

### Emergency Rollback
```bash
# Quick rollback to last stable
git checkout v0.1-stable
npm ci && npm run build
# Deploy immediately
```

## Prevention

### Pre-commit Checks
- Run `npm run lint` before committing
- Run `npm run test:guardrails` to catch fetch issues
- Test locally with `npm run dev`

### Regular Maintenance
- Update dependencies monthly
- Review bundle size quarterly
- Test rollback procedures
- Monitor error rates and performance

### Code Reviews
- Check for raw `fetch` usage
- Verify error handling with `getErrorText`
- Ensure proper query key patterns
- Test API client usage patterns
