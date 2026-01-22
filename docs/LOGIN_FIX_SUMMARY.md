# Login Fix Summary

**Date:** 2026-01-18  
**Issue:** Login failing with 401, token parsing incorrect

## Root Cause

1. **Backend wraps responses in envelope:** All responses are wrapped by `EnvelopeInterceptor`:
   ```json
   {
     "data": {
       "user": {...},
       "accessToken": "...",
       "refreshToken": "...",
       "sessionId": "..."
     },
     "meta": {...}
   }
   ```

2. **AuthContext was accessing tokens directly:** Code was trying to access `response.accessToken` but should access `response.data.data.accessToken` (or unwrap the envelope).

3. **API client doesn't auto-unwrap:** The response interceptor returns `response` as-is, so we need to manually unwrap `response.data`.

## Fix Applied

**File:** `zephix-frontend/src/state/AuthContext.tsx`

**Change:** Updated `login` function to properly unwrap envelope:

```typescript
const login = async (email: string, password: string) => {
  const res = await api.post("/auth/login", { email, password });
  
  // Backend wraps response in envelope: { data: { user, accessToken, ... }, meta: {...} }
  // Unwrap the envelope to get the actual login data
  const body = res.data;
  const data = body && typeof body === 'object' && 'data' in body ? body.data : body;
  
  const accessToken = data?.accessToken;
  const refreshToken = data?.refreshToken;
  const sessionId = data?.sessionId;
  const userData = data?.user;
  
  // Validate we got the required fields
  if (!accessToken) {
    console.error('[AuthContext] Login response missing accessToken. Full response:', JSON.stringify(body, null, 2));
    throw new Error('Login failed: Invalid response format');
  }
  
  // ... rest of login logic
};
```

## Verification Steps

1. **Start backend:**
   ```bash
   cd zephix-backend
   npm run start:dev
   # Should be running on http://localhost:3000
   ```

2. **Verify backend health:**
   ```bash
   curl http://localhost:3000/api/health
   # Should return 200 OK
   ```

3. **Test login:**
   - Open `http://localhost:5173/login`
   - Enter credentials (or create new account)
   - Check Network tab for POST /api/auth/login
   - Verify Request URL is `http://localhost:5173/api/auth/login` (proxied to backend)
   - Verify Response has envelope structure with `data` field

4. **Check token storage:**
   - After successful login, check localStorage
   - Should have `zephix.at` with JWT token
   - Should have `zephix.rt` with refresh token

## Expected Network Request

**POST /api/auth/login**

**Request URL:** `http://localhost:5173/api/auth/login` (proxied to `http://localhost:3000/api/auth/login`)

**Response (200 OK):**
```json
{
  "data": {
    "user": {
      "id": "...",
      "email": "...",
      "firstName": "...",
      "lastName": "...",
      "role": "...",
      "platformRole": "...",
      "permissions": {...}
    },
    "accessToken": "eyJ...",
    "refreshToken": "eyJ...",
    "sessionId": "...",
    "organizationId": "...",
    "expiresIn": 900
  },
  "meta": {
    "timestamp": "...",
    "requestId": "..."
  }
}
```

## Next Steps

1. Start backend: `cd zephix-backend && npm run start:dev`
2. Test login with real credentials
3. Capture Network tab screenshot showing:
   - Request URL (should be localhost:5173/api/auth/login)
   - Response body (should show envelope structure)
4. Verify login succeeds and redirects to `/home`
