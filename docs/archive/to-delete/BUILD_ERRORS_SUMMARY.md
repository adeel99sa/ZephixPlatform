# DELETE CANDIDATE
# Reason: Historical snapshot of build errors
# Original: BUILD_ERRORS_SUMMARY.md

# Build Errors Summary

## Frontend Build Error ✅ FIXED

**File:** `zephix-frontend/src/services/api.ts:125:39`

**Error:**
```
"await" can only be used inside an "async" function
```

**Fix:** Made the interceptor callback async:
```typescript
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // ... code with await import()
  }
);
```

**Status:** ✅ Fixed - build should pass now

## Backend Lint Errors

**Top Error Categories:**
1. `@typescript-eslint/no-unsafe-member-access` - Many instances
2. `@typescript-eslint/no-unsafe-assignment` - Many instances
3. `@typescript-eslint/no-unused-vars` - Some instances
4. `@typescript-eslint/require-await` - Some instances

**Files with Most Errors:**
- Need to identify specific files to fix

**Strategy:**
- Fix lint errors in template-related files first
- Skip non-trivial fixes with TODO comments
- Focus on making lint pass, not perfect code
