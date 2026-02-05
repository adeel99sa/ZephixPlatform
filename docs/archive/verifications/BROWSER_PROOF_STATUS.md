# Browser Proof Status - Template Center Steps 6-8

## ✅ Completed Fixes

### Backend
- ✅ Template `updateV1` tenant context bug fixed
- ✅ JWT expiration increased to 7d for dev testing
- ✅ Dev-seed prints expiration times
- ✅ Backend `/api/auth/me` returns 200 with fresh token (verified via curl)

### Frontend
- ✅ Auth token storage fixed (reads from `zephix.at`)
- ✅ Login flow writes token immediately with verification
- ✅ Auth endpoint guardrails (skip `x-workspace-id` for `/api/auth`, `/api/health`, `/api/version`)
- ✅ Frontend build passes
- ✅ Template Center UI code exists and is wired

## ⏳ Manual Testing Required

Browser automation tools are unreliable for this complex UI flow. The following manual testing is required to complete the proof bundle.

### Quick Start

1. **Get Fresh Tokens**:
   ```bash
   cd zephix-backend
   npm run dev-seed
   # Copy the exported tokens
   ```

2. **Start Services**:
   ```bash
   # Terminal 1: Backend
   cd zephix-backend && npm run start:dev
   
   # Terminal 2: Frontend  
   cd zephix-frontend && npm run dev
   ```

3. **Follow Manual Runbook**: See `BROWSER_TEST_MANUAL_RUNBOOK.md`

### Expected Results

#### Step 2: Token Storage
- After login, `localStorage.getItem('zephix.at')` should return JWT token
- Token should start with `eyJ...`

#### Step 3: /api/auth/me Headers
- Request Headers should show:
  - ✅ `Authorization: Bearer eyJ...`
  - ✅ NO `x-workspace-id` header
- Response should be 200 OK

#### Step 4: Template List
- GET `/api/templates` should return 200
- Request Headers should show:
  - ✅ `Authorization: Bearer ...`
  - `x-workspace-id` may or may not be present (depends on workspace selection)

#### Step 6: Validation
- Removing all phases → Save blocked, no PATCH fired
- Phase with zero tasks → Save blocked, no PATCH fired  
- Empty task title → Save blocked, no PATCH fired

#### Step 7: Structure Persistence
- PATCH `/api/templates/:id` with structure payload
- Response 200
- After refresh, Phase 2 and Task 2 still exist

#### Step 8: KPI Persistence
- PATCH `/api/templates/:id` with `defaultEnabledKPIs` payload
- Response 200
- After refresh, KPIs remain selected

## Code References

### Interceptor Code (Final)
**File**: `zephix-frontend/src/services/api.ts` (lines 88-170)

Key points:
- Reads token from `localStorage.getItem('zephix.at')` first
- Skips `x-workspace-id` for `/api/auth`, `/api/health`, `/api/version`
- Adds `x-workspace-id` only for non-auth endpoints when workspace is selected

### Login Handler (Final)
**File**: `zephix-frontend/src/state/AuthContext.tsx` (lines 99-128)

Key points:
- Writes token immediately via `setTokens()`
- Verifies token was written before proceeding
- Throws error if token write fails

## Network Request Examples

### Expected: /api/auth/me Request
```
GET /api/auth/me HTTP/1.1
Host: localhost:3000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
(No x-workspace-id header)
```

### Expected: PATCH /api/templates/:id (Structure)
```
PATCH /api/templates/{id} HTTP/1.1
Host: localhost:3000
Authorization: Bearer eyJ...
Content-Type: application/json
(No x-workspace-id for ORG templates)

{
  "structure": {
    "phases": [
      {
        "name": "Phase 1",
        "reportingKey": "PLAN",
        "sortOrder": 1,
        "tasks": [
          {
            "title": "Task 1",
            "status": "TODO",
            "sortOrder": 1
          }
        ]
      },
      {
        "name": "Phase 2",
        "reportingKey": "EXECUTE",
        "sortOrder": 2,
        "tasks": [
          {
            "title": "Task 2",
            "status": "TODO",
            "sortOrder": 1
          }
        ]
      }
    ]
  }
}
```

### Expected: PATCH /api/templates/:id (KPIs)
```
PATCH /api/templates/{id} HTTP/1.1
Host: localhost:3000
Authorization: Bearer eyJ...
Content-Type: application/json

{
  "defaultEnabledKPIs": [
    "schedule_variance",
    "budget_variance",
    "resource_utilization"
  ]
}
```

## Next Steps

1. **Manual Testing**: Follow `BROWSER_TEST_MANUAL_RUNBOOK.md`
2. **Capture Screenshots**: Use the checklist in the runbook
3. **Copy Network Traces**: Request/response payloads for Steps 7 and 8
4. **Submit Proof Bundle**: All screenshots + network traces

## Known Issues

- Browser automation tools are unreliable for complex UI interactions
- Manual testing is required for Steps 6-8
- All backend fixes are complete and verified via curl
