# Dashboards Security Review - Code for Sanity Check

**Date:** 2026-01-14
**Reviewer Request:** Sanity-check `deleteDashboard` and `isShareTokenValid` for edge-case leakage and timing behavior

## 1. `isShareTokenValid` - Constant-Time Token Comparison

**Location:** `zephix-backend/src/modules/dashboards/services/dashboards.service.ts:246-270`

```typescript
private isShareTokenValid(
  storedToken: string | null,
  providedToken: string | undefined,
): boolean {
  if (!storedToken || !providedToken) {
    return false;
  }
  const stored = Buffer.from(storedToken);
  const provided = Buffer.from(providedToken);

  // Always perform constant-time comparison, even on length mismatch
  // Zero-pad both buffers to same length to prevent timing leaks
  const maxLength = Math.max(stored.length, provided.length);
  const storedPadded = Buffer.alloc(maxLength, 0);
  const providedPadded = Buffer.alloc(maxLength, 0);
  stored.copy(storedPadded, 0, 0, stored.length);
  provided.copy(providedPadded, 0, 0, provided.length);

  // Perform comparison (always same length now)
  const lengthMatch = stored.length === provided.length;
  const compareResult = timingSafeEqual(storedPadded, providedPadded);

  // Only return true if both length and content match
  return lengthMatch && compareResult;
}
```

**Security Properties:**
- ✅ Always performs `timingSafeEqual` even on length mismatch (prevents timing leak)
- ✅ Zero-pads buffers to same length before comparison
- ✅ Returns `false` early only for null/undefined (safe, no timing leak)
- ✅ Requires both length match AND content match

**Edge Cases:**
- Null/undefined tokens: Returns `false` immediately (safe, no timing leak)
- Length mismatch: Still performs full comparison, then checks length separately
- Empty strings: Handled by length check (empty !== UUID)

## 2. `deleteDashboard` - Authorization Off Stored Record

**Location:** `zephix-backend/src/modules/dashboards/services/dashboards.service.ts:414-430`

```typescript
async deleteDashboard(
  id: string,
  organizationId: string,
  userId: string,
  platformRole?: string,
): Promise<void> {
  // Authorize off stored record (not header/DTO)
  const dashboard = await this.getDashboardForMutation(
    id,
    organizationId,
    userId,
    platformRole,
  );

  // Soft delete
  dashboard.deletedAt = new Date();
  await this.dashboardRepository.save(dashboard);
}
```

**Security Properties:**
- ✅ Uses `getDashboardForMutation` which loads dashboard by `id + organizationId`
- ✅ Authorization based on stored `dashboard.workspaceId`, not header
- ✅ Returns 404 for non-existent or cross-org dashboards (prevents existence probing)
- ✅ Enforces workspace access via `WorkspaceAccessService` for WORKSPACE dashboards
- ✅ Enforces ownership for PRIVATE dashboards

**Edge Cases:**
- Cross-org access: Blocked by `organizationId` filter in `getDashboardForMutation`
- Cross-workspace access: Blocked by `WorkspaceAccessService.canAccessWorkspace` check
- Deleted dashboard: Returns 404 (soft delete via `deletedAt`)
- Missing workspaceId on WORKSPACE dashboard: Returns 400 BadRequest

## 3. `getDashboardForMutation` - Core Authorization Helper

**Location:** `zephix-backend/src/modules/dashboards/services/dashboards.service.ts:434-470`

```typescript
private async getDashboardForMutation(
  id: string,
  organizationId: string,
  userId: string,
  platformRole?: string,
): Promise<Dashboard> {
  // Load dashboard by id + organizationId (never trust headers)
  const dashboard = await this.dashboardRepository.findOne({
    where: { id, organizationId, deletedAt: null },
  });

  if (!dashboard) {
    throw new NotFoundException('Dashboard not found');
  }

  // PRIVATE: Only owner can mutate
  if (dashboard.visibility === DashboardVisibility.PRIVATE) {
    if (dashboard.ownerUserId !== userId) {
      throw new NotFoundException('Dashboard not found');
    }
  } else if (dashboard.visibility === DashboardVisibility.WORKSPACE) {
    // WORKSPACE: Must have access to dashboard's stored workspaceId
    if (!dashboard.workspaceId) {
      throw new BadRequestException(
        'Workspace dashboard missing workspaceId',
      );
    }
    // Authorize off stored workspaceId, not header
    const hasAccess = await this.workspaceAccessService.canAccessWorkspace(
      dashboard.workspaceId, // <-- Stored value, not header
      organizationId,
      userId,
      platformRole,
    );
    if (!hasAccess) {
      throw new NotFoundException('Workspace not found');
    }
  }
  // ORG visibility: No additional checks (org members can access)

  return dashboard;
}
```

**Security Properties:**
- ✅ Always loads dashboard by `id + organizationId` (prevents cross-org access)
- ✅ Uses stored `dashboard.workspaceId` for authorization (never trusts header)
- ✅ Returns 404 for access denial (prevents existence probing)
- ✅ Enforces ownership for PRIVATE dashboards
- ✅ Enforces workspace membership for WORKSPACE dashboards

## 4. Widget Config Sanitization - Type Enforcement

**Location:** `zephix-backend/src/modules/dashboards/services/dashboards.service.ts:134-214`

**Schema Definition:**
```typescript
type WidgetConfigSchema = {
  [key: string]: {
    type: 'string' | 'number' | 'boolean' | 'enum';
    maxLength?: number;
    enum?: readonly string[];
    min?: number;
    max?: number;
  };
};

const SHARED_WIDGET_CONFIG_SCHEMA: Record<WidgetKey, WidgetConfigSchema> = {
  project_health: {},
  sprint_metrics: {},
  // ... all widgets default to empty schema (reject all keys)
};
```

**Validation Logic:**
- ✅ Per-key type checks (string/number/boolean/enum)
- ✅ String: maxLength, printable character validation
- ✅ Number: finite check, min/max bounds
- ✅ Boolean: strict type check
- ✅ Enum: strict membership check
- ✅ Default: Reject keys without schema (defense in depth)

**Write-Time Sanitization:**
- ✅ `sanitizeWidgetConfigForWrite` applies same rules on widget create/update
- ✅ Rejects nested objects/arrays
- ✅ Rejects unsafe strings (SQL-like, template expressions)
- ✅ Only allows primitives (string, number, boolean)

## Summary

**Timing Behavior:**
- `isShareTokenValid` performs constant-time comparison even on length mismatch
- Zero-padding ensures equal-length buffers before `timingSafeEqual`
- No early returns that leak timing information

**Authorization:**
- All mutations authorize off stored `dashboard.workspaceId`
- No trust of `x-workspace-id` header for authorization
- Returns 404 for access denial (prevents existence probing)

**Data Sanitization:**
- Widget config validated per-key with strict type checks
- Unsafe values rejected (SQL-like, template expressions, nested objects)
- Write-time sanitization matches share-read rules
