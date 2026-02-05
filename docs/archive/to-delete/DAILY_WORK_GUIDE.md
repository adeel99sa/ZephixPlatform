# Daily Work Guide - Hardening Safeguards

## Quick Commands

### Before Committing

```bash
# Run contract tests (matches CI)
cd zephix-backend
npm run test:contracts

# Run E2E admin test
cd zephix-frontend
npm run test:e2e:admin
```

### Demo Setup

```bash
# Seed full demo data (workspace + project + template)
cd zephix-backend
npm run seed:demo:full
```

## Response Format Enforcement

### Backend: Use `formatResponse()` Helper

**Always use the helper in controllers:**

```typescript
import { formatResponse, formatArrayResponse, formatPaginatedResponse } from '@/shared/helpers/response.helper';

// Single item
return formatResponse(workspace);

// Array
return formatArrayResponse(workspaces);

// Paginated
return formatPaginatedResponse(projects, total, page, totalPages);
```

**Never return raw arrays or objects:**
```typescript
// ❌ BAD
return workspaces; // Raw array

// ✅ GOOD
return formatArrayResponse(workspaces); // { data: workspaces }
```

### Frontend: Use `unwrapData()` Helper

**Always use the helper in API clients:**

```typescript
import { unwrapData, unwrapArray } from '@/lib/api/unwrapData';

// Single item
const response = await api.get('/endpoint/:id');
const item = unwrapData<Item>(response);

// Array
const response = await api.get('/endpoint');
const items = unwrapArray<Item>(response);
```

## Observability

### Frontend Route Logging

Route changes are automatically logged to console:
```
[Route] { route: '/admin', userId: '...', orgId: '...', isAdmin: true }
```

**When debugging "page does nothing":**
1. Check console for `[Route]` logs
2. Verify `userId` and `orgId` are present
3. Check if route changed but page didn't update

### Backend Request ID

Every response includes `X-Request-Id` header.

**When debugging API issues:**
1. Copy `X-Request-Id` from response headers
2. Search backend logs for that requestId
3. Trace the full request flow

## Testing Checklist

Before opening a PR:

- [ ] `npm run test:contracts` passes
- [ ] `npm run test:e2e:admin` passes
- [ ] All new endpoints use `formatResponse()` helper
- [ ] All API clients use `unwrapData()` helper
- [ ] No console errors on hard refresh

## Branch Protection

The `contract-gate` CI job **must pass** before merge.

**If contract tests fail:**
1. Fix the failing test
2. Verify response format matches `{ data: ... }`
3. Re-run `npm run test:contracts`
4. Push and wait for CI

**Never bypass the gate** - it's there to prevent regressions.






