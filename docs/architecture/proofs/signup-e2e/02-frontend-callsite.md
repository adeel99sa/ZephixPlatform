# 02 — Frontend Signup Callsite

**Verdict: CALLS API — but error handling has a critical bug**

## SignupPage.tsx (primary signup page)

- **File**: `zephix-frontend/src/pages/auth/SignupPage.tsx`
- **Submit handler**: `handleSubmit` (lines 54–88)
- **API call**: `api.post('/auth/register', { email, password, fullName, orgName })`
- **API client**: `@/lib/api` — axios instance
- **Base URL**:
  - Dev: `"/api"` (Vite proxy)
  - Prod: `VITE_API_URL || "https://zephix-backend-production.up.railway.app/api"`
- **Full URL**: `{baseURL}/auth/register`

### Error handling (BUG)

```
try {
  await api.post('/auth/register', { ... });
  setSubmitSuccess(true);      // ← success
} catch (error) {
  if (error.response?.status === 400) {
    setErrors({ email: error.response.data.message });   // ← shown
  } else {
    setSubmitSuccess(true);    // ← BUG: non-400 errors ALSO show "Check email"
  }
}
```

**Impact**: If the API returns 500, 503, network error, or any non-400 status, the user sees "Check Your Email" even though signup failed. This is why the UI appeared to work even when no DB rows were written — the UI lies on non-400 errors.

### Success behavior

- Sets `submitSuccess = true`, renders inline "Check Your Email" block
- No redirect. User stays on the same page.

## OrganizationSignupPage.tsx (not routed)

- **File**: `zephix-frontend/src/pages/auth/OrganizationSignupPage.tsx`
- **API call**: `apiClient.post('/auth/organization/signup', { ... })`
- **Error handling**: Correct — `toast.error(errorMessage)`, no false success
- **Success**: Redirects to `/onboarding`
- **Status**: Page exists but is NOT in `App.tsx` routes — not reachable from the app

## Conclusion

The signup page does call the API. However, **any non-400 error is silently swallowed and the user sees "Check Your Email" regardless**. This masks backend failures.
