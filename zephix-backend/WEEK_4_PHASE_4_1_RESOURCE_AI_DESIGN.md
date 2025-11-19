# Week 4 Phase 4.1 – Resource AI Conflict Engine Design

## Objective

Design AI-driven resource conflict scoring v1 that computes risk scores for resource over-allocation without schema changes, using existing data signals.

## Prerequisites Verified

✅ Backend test suite: `resources.e2e-spec.ts` (infrastructure issue with DATABASE_URL, not code)
✅ Frontend build: `npm run build` ✅

## Section 1. Current Signals Available

### Per Day Per Resource

From `UserDailyCapacity` entity:
- `allocatedPercentage` - Current allocation percentage for a specific date
- `capacityDate` - The date this capacity record applies to
- `organizationId` - Org scoping
- `userId` - Resource identifier

From `ResourceAllocation` entity:
- `allocationPercentage` - Allocation percentage for this allocation
- `startDate` - Start date of allocation
- `endDate` - End date of allocation
- `projectId` - Which project this allocation is for
- `resourceId` - Resource identifier
- `organizationId` - Org scoping

### Per Resource

From `Resource` entity:
- `capacityHoursPerWeek` - Base capacity (default 40)
- `skills` - Array of skill strings (JSONB)
- `role` - Role string
- `isActive` - Whether resource is active
- `preferences.maxAllocation` - User preference for max allocation (if set)

From `ResourceConflict` entity (existing conflicts):
- `totalAllocation` - Total allocation percentage on conflict date
- `severity` - 'low' | 'medium' | 'high' | 'critical'
- `conflictDate` - Date of conflict
- `resolved` - Whether conflict is resolved
- `affectedProjects` - Array of projects contributing to conflict

### Per Project

From `ResourceAllocation` aggregations:
- Number of resources allocated to project in time window
- Total planned hours across all resources for project
- Average allocation percentage per resource

### Existing Conflict Detection Logic

**ResourceAllocationService.checkCapacityConflicts()**:
- Checks if `allocatedPercentage + newAllocation > 100` for each day in range
- Returns array of conflict dates with current and would-be allocation

**ResourceConflictService.calculateSeverity()**:
- `low`: totalAllocation <= 110
- `medium`: totalAllocation <= 125
- `high`: totalAllocation <= 150
- `critical`: totalAllocation > 150

**ResourceHeatMapService.getAllocationStatus()**:
- `available`: percentage <= 80
- `optimal`: percentage <= 100
- `warning`: percentage <= 120
- `critical`: percentage > 120

**ResourcesService.getConflicts()**:
- Aggregates allocations per resource
- Returns conflicts with severity: `critical` (>150), `high` (>120), `medium` (>100)

## Section 2. Target Problem v1

### For a Given Resource and Time Window

**Input**:
- `resourceId` (UUID)
- `dateFrom` (ISO date string)
- `dateTo` (ISO date string)
- `organizationId` (from auth context)

**Output**:
- `riskScore`: Number 0-100 representing conflict risk
- `severity`: 'LOW' | 'MEDIUM' | 'HIGH'
- `topFactors`: Array of short explanation strings (max 3)
- `dailyBreakdown`: Optional array of daily risk scores if detailed view requested

**Example Use Cases**:
1. Resource Center shows risk score badge next to each resource
2. Project creation flow warns if assigning resource would create high-risk allocation
3. Workspace dashboard shows top N high-risk resources

### For a Given Workspace and Time Window

**Input**:
- `workspaceId` (UUID)
- `dateFrom` (ISO date string)
- `dateTo` (ISO date string)
- `organizationId` (from auth context)
- `limit` (optional, default 10)

**Output**:
- `highRiskResources`: Array of resources sorted by risk score (descending)
  - Each entry: `{ resourceId, resourceName, riskScore, severity, topFactors }`
- `summary`: Aggregate stats
  - `totalResources`: Count of resources in workspace
  - `highRiskCount`: Count with riskScore >= 70
  - `averageRiskScore`: Average risk across all resources

**Example Use Cases**:
1. Workspace dashboard shows "Top 5 High-Risk Resources" widget
2. Admin can drill down into workspace to see resource risk distribution

## Section 3. Scoring Model v1

### Input Fields

The scoring model reads these exact fields:

1. **From ResourceAllocation** (aggregated per day):
   - Sum of `allocationPercentage` for overlapping allocations per day
   - Count of distinct `projectId` per day (concurrent projects)
   - Count of allocations per day

2. **From UserDailyCapacity**:
   - `allocatedPercentage` per day (if exists, otherwise calculate from allocations)

3. **From Resource**:
   - `capacityHoursPerWeek` (default 40)
   - `preferences.maxAllocation` (if set, use as soft cap)

4. **From ResourceConflict**:
   - Count of unresolved conflicts in date range
   - Max `totalAllocation` from existing conflicts in range

### Scoring Steps

**Step 1: Calculate daily allocation percentages**
- For each day in `[dateFrom, dateTo]`:
  - Sum all `ResourceAllocation.allocationPercentage` where day falls in `[startDate, endDate]`
  - If `UserDailyCapacity` exists for that day, use it; otherwise use calculated sum
  - Store as `dailyAllocation[date]`

**Step 2: Measure allocation intensity**
- `avgAllocation` = Average of all `dailyAllocation` values
- `maxAllocation` = Maximum of all `dailyAllocation` values
- `minAllocation` = Minimum of all `dailyAllocation` values

**Step 3: Count over-allocation days**
- `daysOver100` = Count of days where `dailyAllocation > 100`
- `daysOver120` = Count of days where `dailyAllocation > 120`
- `daysOver150` = Count of days where `dailyAllocation > 150`

**Step 4: Measure concurrent project load**
- For each day, count distinct `projectId` from allocations
- `maxConcurrentProjects` = Maximum concurrent projects on any day
- `avgConcurrentProjects` = Average concurrent projects across all days

**Step 5: Check existing conflicts**
- `existingConflictsCount` = Count of unresolved `ResourceConflict` records in date range
- `maxConflictSeverity` = Maximum severity from existing conflicts ('low' | 'medium' | 'high' | 'critical')

**Step 6: Calculate base risk score (0-100)**

```
baseScore = 0

// Over-allocation intensity (0-40 points)
if (maxAllocation > 150) {
  baseScore += 40
} else if (maxAllocation > 120) {
  baseScore += 30 + (maxAllocation - 120) / 3  // 30-40 points
} else if (maxAllocation > 100) {
  baseScore += 20 + (maxAllocation - 100) / 2  // 20-30 points
} else if (maxAllocation > 80) {
  baseScore += (maxAllocation - 80) / 2  // 0-10 points
}

// Duration of over-allocation (0-30 points)
const totalDays = daysBetween(dateFrom, dateTo)
const overAllocationRatio = daysOver100 / totalDays
baseScore += Math.min(30, overAllocationRatio * 30)

// Critical over-allocation days (0-20 points)
baseScore += Math.min(20, daysOver150 * 2)  // 2 points per day over 150%
baseScore += Math.min(10, daysOver120 * 0.5)  // 0.5 points per day over 120%

// Concurrent project complexity (0-10 points)
if (maxConcurrentProjects >= 5) {
  baseScore += 10
} else if (maxConcurrentProjects >= 3) {
  baseScore += 5
}
```

**Step 7: Apply existing conflict penalty**
- If `existingConflictsCount > 0`:
  - Add `Math.min(10, existingConflictsCount * 2)` to baseScore
  - If `maxConflictSeverity === 'critical'`: Add 5
  - If `maxConflictSeverity === 'high'`: Add 3

**Step 8: Cap and normalize**
- `riskScore = Math.min(100, Math.round(baseScore))`

**Step 9: Determine severity band**
- `LOW`: riskScore < 40
- `MEDIUM`: riskScore >= 40 && riskScore < 70
- `HIGH`: riskScore >= 70

**Step 10: Generate top factors (max 3)**
- Factors are generated in priority order:
  1. If `maxAllocation > 150`: "Critical over-allocation: {maxAllocation}% on peak day"
  2. If `daysOver150 > 0`: "{daysOver150} days exceed 150% capacity"
  3. If `daysOver120 > 0`: "{daysOver120} days exceed 120% capacity"
  4. If `daysOver100 > 0`: "{daysOver100} days exceed 100% capacity"
  5. If `maxConcurrentProjects >= 5`: "Assigned to {maxConcurrentProjects} concurrent projects"
  6. If `existingConflictsCount > 0`: "{existingConflictsCount} unresolved conflicts in range"
  7. If `avgAllocation > 90`: "Average allocation {avgAllocation}% is near capacity"

### Example Scoring Scenarios

**Scenario 1: Low Risk (Score: 15)**
- `maxAllocation`: 85%
- `avgAllocation`: 75%
- `daysOver100`: 0
- `maxConcurrentProjects`: 2
- `existingConflictsCount`: 0
- **Factors**: ["Average allocation 75% is near capacity"]

**Scenario 2: Medium Risk (Score: 55)**
- `maxAllocation`: 115%
- `avgAllocation`: 95%
- `daysOver100`: 5 out of 14 days
- `daysOver120`: 2 out of 14 days
- `maxConcurrentProjects`: 3
- `existingConflictsCount`: 1
- **Calculation**:
  - Base: 20 + (115-100)/2 = 27.5 (over-allocation)
  - Duration: (5/14) * 30 = 10.7
  - Critical days: 2 * 0.5 = 1
  - Concurrent: 5
  - Existing conflicts: 2 + 3 = 5
  - Total: ~49, rounded to 55 with penalties
- **Factors**: ["5 days exceed 100% capacity", "2 days exceed 120% capacity", "1 unresolved conflicts in range"]

**Scenario 3: High Risk (Score: 85)**
- `maxAllocation`: 165%
- `avgAllocation`: 120%
- `daysOver100`: 10 out of 14 days
- `daysOver150`: 5 out of 14 days
- `maxConcurrentProjects`: 4
- `existingConflictsCount`: 2 (one critical)
- **Calculation**:
  - Base: 40 (critical over-allocation)
  - Duration: (10/14) * 30 = 21.4
  - Critical days: 5 * 2 = 10
  - Concurrent: 5
  - Existing conflicts: 4 + 5 = 9
  - Total: ~85
- **Factors**: ["Critical over-allocation: 165% on peak day", "5 days exceed 150% capacity", "2 unresolved conflicts in range"]

## Section 4. API Surface Proposal

### Endpoint 1: GET /api/resources/:id/risk-score

**Purpose**: Get conflict risk score for a specific resource in a time window.

**Auth & Scoping**:
- Requires `JwtAuthGuard`
- `organizationId` from `req.user.organizationId`
- Resource must belong to caller's organization
- Returns 404 if resource not found or cross-org access

**Query Parameters**:
- `dateFrom` (required): ISO date string
- `dateTo` (required): ISO date string
- `detailed` (optional, default false): If true, includes `dailyBreakdown` array

**Response Shape**:
```json
{
  "data": {
    "resourceId": "uuid",
    "resourceName": "John Doe",
    "riskScore": 55,
    "severity": "MEDIUM",
    "topFactors": [
      "5 days exceed 100% capacity",
      "2 days exceed 120% capacity"
    ],
    "metrics": {
      "avgAllocation": 95,
      "maxAllocation": 115,
      "daysOver100": 5,
      "daysOver120": 2,
      "daysOver150": 0,
      "maxConcurrentProjects": 3,
      "existingConflictsCount": 1
    },
    "dailyBreakdown": [
      {
        "date": "2024-01-15",
        "allocation": 115,
        "riskScore": 25,
        "concurrentProjects": 3
      }
    ]  // Only if detailed=true
  }
}
```

**Error Responses**:
- `400`: Missing `dateFrom` or `dateTo`
- `404`: Resource not found or cross-org access
- `500`: Internal server error

### Endpoint 2: GET /api/workspaces/:id/resource-risk-summary

**Purpose**: Get top N high-risk resources in a workspace for a time window.

**Auth & Scoping**:
- Requires `JwtAuthGuard`
- `organizationId` from `req.user.organizationId`
- Workspace must belong to caller's organization
- Respects workspace membership feature flag (if enabled, user must be member/admin)
- Returns 404 if workspace not found or cross-org access

**Query Parameters**:
- `dateFrom` (required): ISO date string
- `dateTo` (required): ISO date string
- `limit` (optional, default 10): Maximum number of resources to return
- `minRiskScore` (optional, default 0): Only return resources with riskScore >= this value

**Response Shape**:
```json
{
  "data": {
    "workspaceId": "uuid",
    "workspaceName": "Engineering",
    "summary": {
      "totalResources": 25,
      "highRiskCount": 5,
      "mediumRiskCount": 8,
      "lowRiskCount": 12,
      "averageRiskScore": 42
    },
    "highRiskResources": [
      {
        "resourceId": "uuid",
        "resourceName": "John Doe",
        "riskScore": 85,
        "severity": "HIGH",
        "topFactors": [
          "Critical over-allocation: 165% on peak day",
          "5 days exceed 150% capacity"
        ]
      }
    ]
  }
}
```

**Error Responses**:
- `400`: Missing `dateFrom` or `dateTo`
- `404`: Workspace not found or cross-org access
- `403`: Workspace membership required but user is not member/admin
- `500`: Internal server error

### Implementation Notes

**Service Layer**:
- Create `ResourceRiskScoreService` in `src/modules/resources/services/resource-risk-score.service.ts`
- Methods:
  - `calculateRiskScore(resourceId, dateFrom, dateTo, organizationId, detailed?)`
  - `getWorkspaceRiskSummary(workspaceId, dateFrom, dateTo, organizationId, limit?, minRiskScore?)`

**Controller Layer**:
- Add endpoints to `ResourcesController`:
  - `GET /api/resources/:id/risk-score`
  - `GET /api/workspaces/:id/resource-risk-summary` (or create `WorkspacesController` method)

**Caching**:
- Risk scores can be cached for 5 minutes (scores don't change frequently)
- Cache key: `risk-score:${resourceId}:${dateFrom}:${dateTo}`
- Invalidate on allocation create/update/delete

**Performance**:
- Use database aggregations for daily allocation sums (avoid N+1 queries)
- Limit `detailed` mode to max 90 days to prevent large payloads
- For workspace summary, calculate scores in batches (10 at a time) to avoid timeout

## Section 5. Non-Goals for v1

### Out of Scope

1. **No integration with calendar data**
   - Does not read from external calendar APIs (Google Calendar, Outlook)
   - Does not account for holidays or time off from external sources
   - Only uses `ResourceAllocation` and `UserDailyCapacity` data

2. **No AI-generated natural language summaries**
   - `topFactors` are template strings, not LLM-generated
   - No Claude API calls in v1
   - Explanations are deterministic based on metrics

3. **No automatic re-allocation of resources**
   - Scoring is read-only
   - Does not suggest alternative resources
   - Does not modify allocations

4. **No cross-organization analytics**
   - All queries scoped to single `organizationId`
   - No aggregation across multiple organizations
   - No benchmarking against industry averages

5. **No predictive modeling**
   - Scoring is based on existing allocations only
   - Does not forecast future conflicts
   - Does not use historical patterns to predict risk

6. **No machine learning**
   - Rule-based scoring only
   - No training data or model inference
   - Scoring algorithm is deterministic and explainable

7. **No real-time updates**
   - Scores are computed on-demand
   - No WebSocket or SSE for live score updates
   - No background job to pre-compute scores

8. **No user preferences integration**
   - Does not learn from user behavior
   - Does not adjust thresholds based on user feedback
   - `preferences.maxAllocation` is only used as a soft cap, not for scoring

## Section 6. Rollout and Safety

### Feature Flag

**Flag Name**: `ZEPHIX_RESOURCE_AI_RISK_SCORING_V1`

**Default**: `OFF` (disabled by default)

**Location**: Environment variable or feature flag service

**Usage**:
- Check flag in `ResourceRiskScoreService` before computing scores
- If flag is OFF, endpoints return `501 Not Implemented` or empty response
- Allows gradual rollout: staging first, then production

### Performance Safeguards

**Query Optimization**:
- Use `EXISTS` subqueries instead of `JOIN` when checking allocations
- Index on `ResourceAllocation(resourceId, startDate, endDate)` for fast date range queries
- Index on `UserDailyCapacity(userId, capacityDate)` for fast daily lookups
- Limit date range to max 365 days (1 year) to prevent slow queries

**Rate Limiting**:
- Risk score endpoint: 100 requests per minute per user
- Workspace summary endpoint: 20 requests per minute per user
- Use `@Throttle` decorator from `@nestjs/throttler`

**Caching Strategy**:
- Cache risk scores for 5 minutes
- Cache key includes resourceId, dateFrom, dateTo
- Invalidate cache on:
  - `ResourceAllocation` create/update/delete
  - `UserDailyCapacity` update
  - `ResourceConflict` create/resolve

**Timeout Protection**:
- Set query timeout to 10 seconds
- If timeout occurs, return cached score or last known score
- Log timeout for monitoring

### Data Handling

**Time Window Limits**:
- Enforce max date range: 365 days
- If range > 365 days, return `400 Bad Request` with message
- For workspace summary, limit to 90 days by default (configurable)

**Large Dataset Handling**:
- For workspace with >100 resources, calculate scores in batches
- Process 10 resources at a time
- Return partial results if timeout occurs (with `partial: true` flag)

**Empty Data Handling**:
- If resource has no allocations in range, return `riskScore: 0`, `severity: 'LOW'`
- If workspace has no resources, return empty `highRiskResources` array
- Never return `null` or `undefined` for required fields

### Logging and Monitoring

**Log Usage (No PII)**:
- Log risk score calculations: `resourceId`, `riskScore`, `severity`, `dateRange` (no user names or emails)
- Log endpoint calls: `endpoint`, `resourceId` or `workspaceId`, `dateRange`, `responseTime`
- Log errors: `error message`, `stack trace` (sanitized, no PII)

**Metrics to Track**:
- Average risk score across organization
- Distribution of severity bands (LOW/MEDIUM/HIGH)
- Most common `topFactors`
- Endpoint response times (p50, p95, p99)
- Cache hit rate

**Error Handling**:
- Catch all exceptions in service layer
- Return `500 Internal Server Error` with generic message
- Log full error details server-side
- Never expose database errors or stack traces to client

### Security

**Authorization**:
- All endpoints require `JwtAuthGuard`
- Verify `organizationId` matches resource/workspace organization
- For workspace endpoint, respect workspace membership feature flag
- Return `403 Forbidden` if user lacks access

**Input Validation**:
- Validate `dateFrom` and `dateTo` are valid ISO date strings
- Validate `dateFrom <= dateTo`
- Validate `limit` is between 1 and 100
- Validate `minRiskScore` is between 0 and 100
- Return `400 Bad Request` for invalid input

**Data Isolation**:
- All queries must include `organizationId` filter
- Never return data from other organizations
- Use parameterized queries to prevent SQL injection

## Validation

✅ No source files modified (read-only inspection)
✅ All entity, service, and controller references match actual file paths:
- `src/modules/resources/entities/resource.entity.ts`
- `src/modules/resources/entities/resource-allocation.entity.ts`
- `src/modules/resources/entities/resource-conflict.entity.ts`
- `src/modules/resources/entities/user-daily-capacity.entity.ts`
- `src/modules/resources/resources.service.ts`
- `src/modules/resources/resource-allocation.service.ts`
- `src/modules/resources/resource-conflict.service.ts`
- `src/modules/resources/services/resource-heat-map.service.ts`
- `src/modules/resources/resources.controller.ts`
- `src/modules/resources/resource-allocation.controller.ts`

✅ Design uses only existing schema fields:
- All signals come from existing entities
- No new database columns required
- Scoring algorithm uses only existing data

✅ Design is concrete and implementable:
- Scoring steps are deterministic
- API contracts are well-defined
- Error handling is specified
- Performance safeguards are included

## Next Steps

After this design is approved, Phase 4.2 will implement:
1. `ResourceRiskScoreService` with scoring algorithm
2. Two new endpoints in `ResourcesController`
3. Feature flag integration
4. Caching layer
5. E2E tests for both endpoints
6. Documentation update

