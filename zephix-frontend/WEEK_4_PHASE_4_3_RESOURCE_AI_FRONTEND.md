# Week 4 Phase 4.3 – Resource AI Risk Scoring Frontend Integration

## Objective

Expose the new resource risk scoring endpoints in the Resource Center UI without breaking existing behavior. Respect the backend feature flag `ZEPHIX_RESOURCE_AI_RISK_SCORING_V1`. When the flag is off, the UI must behave exactly as before.

## Prerequisites Verified

✅ Frontend build: `npm run build` ✅
✅ ResourcesPage tests: Existing tests passing ✅
✅ Phase 4.2 backend: `WEEK_4_PHASE_4_2_RESOURCE_AI_IMPLEMENTATION.md` exists ✅

## Section 1. Surfaces

### Pages and Components Modified

1. **ResourcesPage** (`src/features/resources/pages/ResourcesPage.tsx`)
   - Main resource directory page
   - Shows workspace risk summary widget when feature enabled
   - Shows per-resource risk score in detail panel when feature enabled

2. **Resource Detail Panel** (within ResourcesPage)
   - Displays risk score, severity badge, and key factors
   - Only visible when feature flag is on and resource is selected

3. **Workspace Risk Overview Widget** (within ResourcesPage)
   - Shows summary statistics (total resources, high/medium/low risk counts, average score)
   - Shows top 3 high-risk resources as clickable buttons
   - Only visible when feature flag is on and workspace is selected

### API Hooks Added

1. **useResourceRiskScore** (`src/features/resources/api/useResources.ts`)
   - Fetches risk score for a single resource
   - Handles 404 gracefully (treats as feature disabled)

2. **useWorkspaceResourceRiskSummary** (`src/features/resources/api/useResources.ts`)
   - Fetches workspace-level risk summary
   - Handles 404 gracefully (treats as feature disabled)

## Section 2. Flags

### Frontend Flag

**Flag Name**: `VITE_RESOURCE_AI_RISK_SCORING_V1`

**Location**: `src/lib/flags.ts`

**Function**: `isResourceRiskAIEnabled()`

**Default Behavior**: `false` (disabled by default)

**Implementation**:
```typescript
export const isResourceRiskAIEnabled = () => {
  return import.meta.env.VITE_RESOURCE_AI_RISK_SCORING_V1 === '1' || hasFlag('resourceRiskAI');
};
```

### Backend Flag

**Flag Name**: `ZEPHIX_RESOURCE_AI_RISK_SCORING_V1`

**Default Behavior**: `OFF` (disabled by default)

**Behavior**: When disabled, endpoints return `404 NotFoundException`

### Flag Combinations

| Frontend Flag | Backend Flag | Behavior |
|--------------|--------------|----------|
| OFF | OFF | No risk UI shown, no API calls made |
| ON | OFF | Risk UI sections hidden, API calls return 404 (handled gracefully) |
| OFF | ON | No risk UI shown, no API calls made (frontend controls visibility) |
| ON | ON | Full risk scoring UI visible, API calls succeed |

**Recommended**: Both flags should be set together for production use.

## Section 3. API Usage

### Endpoints Called

1. **GET /api/resources/:id/risk-score**
   - Called by: `useResourceRiskScore` hook
   - Query params: `dateFrom` (ISO date string), `dateTo` (ISO date string)
   - Response shape:
     ```typescript
     {
       resourceId: string;
       resourceName: string;
       riskScore: number; // 0-100
       severity: 'LOW' | 'MEDIUM' | 'HIGH';
       topFactors: string[]; // Array of human-readable messages
       metrics: {
         avgAllocation: number;
         maxAllocation: number;
         daysOver100: number;
         daysOver120: number;
         daysOver150: number;
         maxConcurrentProjects: number;
         existingConflictsCount: number;
       };
     }
     ```

2. **GET /api/workspaces/:id/resource-risk-summary**
   - Called by: `useWorkspaceResourceRiskSummary` hook
   - Query params: `dateFrom` (required), `dateTo` (required), `limit` (optional, default 10), `minRiskScore` (optional, default 0)
   - Response shape:
     ```typescript
     {
       workspaceId: string;
       workspaceName: string;
       summary: {
         totalResources: number;
         highRiskCount: number;
         mediumRiskCount: number;
         lowRiskCount: number;
         averageRiskScore: number;
       };
       highRiskResources: Array<{
         resourceId: string;
         resourceName: string;
         riskScore: number;
         severity: 'LOW' | 'MEDIUM' | 'HIGH';
         topFactors: string[];
       }>;
     }
     ```

### Date Range Parameters

Both endpoints use the same date range that the Resource Center uses for capacity filters:
- **Source**: URL search params (`dateFrom`, `dateTo`) or default to next 4 weeks
- **Default**: Today to 28 days from today
- **Format**: ISO date strings (YYYY-MM-DD)

The date range is shared across:
- Resource list filters
- Capacity summary
- Capacity breakdown
- Risk score (when enabled)

## Section 4. Tests

### Test File

**File**: `src/features/resources/pages/__tests__/ResourcesPage.test.tsx`

### Test Coverage

1. ✅ **Feature flag off**
   - Mocks `isResourceRiskAIEnabled` to return `false`
   - Renders ResourcesPage
   - Asserts no risk-related text appears in DOM
   - Asserts risk score hooks are not called

2. ✅ **Feature flag on, happy path (resource risk score)**
   - Mocks `isResourceRiskAIEnabled` to return `true`
   - Mocks `useResourceRiskScore` to return valid risk score data
   - Renders ResourcesPage with selected resource
   - Asserts risk score, severity badge, and factors appear in detail panel

3. ✅ **Feature flag on, happy path (workspace summary)**
   - Mocks `isResourceRiskAIEnabled` to return `true`
   - Mocks `useWorkspaceResourceRiskSummary` to return valid summary data
   - Renders ResourcesPage with workspace filter
   - Asserts risk overview widget appears with summary statistics

4. ✅ **Backend 404 handling (feature disabled on backend)**
   - Mocks `isResourceRiskAIEnabled` to return `true` (frontend enabled)
   - Mocks `useResourceRiskScore` to return error with 404 status
   - Renders ResourcesPage
   - Asserts page does not crash
   - Asserts no risk section is shown (graceful degradation)

5. ✅ **Loading state**
   - Mocks `isResourceRiskAIEnabled` to return `true`
   - Mocks `useResourceRiskScore` to return `isLoading: true`
   - Renders ResourcesPage with selected resource
   - Asserts "Risk score loading..." message appears

### Test Command

```bash
npm test -- ResourcesPage.test.tsx
```

### Test Status

✅ All new tests passing
✅ All existing tests continue to pass

## Section 5. UX Behavior

### Behavior When Feature Off

- **Risk Overview Widget**: Not rendered
- **Risk Score in Detail Panel**: Not rendered
- **API Calls**: Not made (hooks are disabled via `enabled` prop)
- **UI Appearance**: Identical to Phase 3.3 Resource Center v1

### Behavior When Feature On and API Succeeds

- **Risk Overview Widget**:
  - Appears at top of Resource Center when workspace is selected
  - Shows summary statistics (total resources, risk counts, average score)
  - Shows top 3 high-risk resources as clickable buttons
  - Clicking a resource button selects that resource and opens detail panel

- **Risk Score in Detail Panel**:
  - Appears at top of detail panel when resource is selected
  - Shows risk score (0-100) with severity badge (LOW/MEDIUM/HIGH)
  - Shows color-coded background (green/yellow/red) based on severity
  - Lists key factors as bullet points (human-readable messages)

- **Severity Colors**:
  - LOW: Green badge (`badge-success`), green background (`bg-green-50`)
  - MEDIUM: Yellow badge (`badge-warning`), yellow background (`bg-yellow-50`)
  - HIGH: Red badge (`badge-error`), red background (`bg-red-50`)

### Behavior When API Fails or Returns 404

- **404 (Feature Disabled on Backend)**:
  - Hooks catch 404 and return `null` data (not treated as error)
  - UI sections remain hidden (no error message shown)
  - Page continues to function normally

- **Other Errors**:
  - Error is logged to console
  - Detail panel shows "Error loading risk score" message
  - Page does not crash
  - Other Resource Center features continue to work

### Date Range Synchronization

- Risk score uses the same date range as capacity filters
- Changing date range in filters automatically updates risk score
- Date range is persisted in URL search params

## Section 6. Implementation Details

### Feature Flag Check

The feature flag is checked once at the component level:
```typescript
const riskAIEnabled = isResourceRiskAIEnabled();
```

This value is then passed to hooks via the `enabled` prop:
```typescript
const { data: riskScore } = useResourceRiskScore(
  selectedResourceId,
  dateFrom,
  dateTo,
  riskAIEnabled // Controls whether hook makes API call
);
```

### Error Handling

Both hooks implement custom error handling:
- 404 errors are caught and treated as "feature disabled" (return `null`)
- Other errors are propagated for UI-level handling
- Retry logic skips 404s (no retries for disabled features)

### Performance Considerations

- Risk score is only fetched when:
  1. Feature flag is enabled
  2. A resource is selected
  3. Date range is valid

- Workspace summary is only fetched when:
  1. Feature flag is enabled
  2. A workspace is selected (via filter or active workspace)
  3. Date range is valid

- Both hooks use `staleTime: 30_000` (30 seconds) to reduce unnecessary refetches

## Section 7. Known Limitations

1. **No Risk Indicators in List View**: Risk scores are only shown in the detail panel, not in the resource table rows. This avoids N+1 API call patterns.

2. **Workspace Summary Requires Workspace Selection**: The workspace risk overview only appears when a workspace is explicitly selected (via filter or active workspace). It does not aggregate across all workspaces.

3. **Date Range Limit**: Backend enforces a 365-day maximum date range. Frontend does not validate this, but errors are handled gracefully.

4. **No Real-time Updates**: Risk scores are cached for 30 seconds. Changes to allocations may not immediately reflect in risk scores.

## Section 8. Validation Checklist

✅ With both flags off, Resource Center behaves exactly as in Phase 3.3
✅ With both flags on, risk information appears without breaking existing capacity features
✅ Frontend build passes
✅ ResourcesPage tests pass (including new risk scoring tests)
✅ No new unguarded network calls are introduced (all calls respect feature flag)
✅ 404 errors are handled gracefully (no UI crashes)
✅ Date range is synchronized across all Resource Center features

## Section 9. Files Modified

### Frontend Files

1. `src/lib/flags.ts`
   - Added `isResourceRiskAIEnabled()` function

2. `src/features/resources/api/useResources.ts`
   - Added `ResourceRiskScore` type
   - Added `WorkspaceRiskSummary` type
   - Added `useResourceRiskScore` hook
   - Added `useWorkspaceResourceRiskSummary` hook

3. `src/features/resources/pages/ResourcesPage.tsx`
   - Added feature flag check
   - Added workspace risk summary widget
   - Added risk score section in detail panel
   - Added severity color helper functions

4. `src/features/resources/pages/__tests__/ResourcesPage.test.tsx`
   - Added feature flag mock
   - Added risk score hook mocks
   - Added 5 new test cases for risk scoring behavior

### Documentation

1. `WEEK_4_PHASE_4_3_RESOURCE_AI_FRONTEND.md` (this file)

## Section 10. Next Steps

1. **Manual Verification**:
   - Test with backend flag off (should see no risk UI)
   - Test with both flags on (should see full risk UI)
   - Verify date range changes update risk scores
   - Verify clicking high-risk resources in summary opens detail panel

2. **Future Enhancements** (out of scope for Phase 4.3):
   - Add risk score indicators to resource table rows (requires batch API)
   - Add risk score trends over time
   - Add risk score filtering/sorting
   - Add risk score export functionality

