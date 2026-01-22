# Admin Cleanup API - Fixed Implementation

**Date:** 2025-01-27  
**Status:** ✅ COMPLETE - Hardened for production

## Changes Applied

### Security Fixes

1. **Tenant Isolation Hardened:**
   - Always uses `tenantContextService.assertOrganizationId()` - never trusts params/body
   - All queries explicitly filter by `organizationId: orgId` and `deletedAt: IsNull()`
   - Update operations include both `organizationId` and `deletedAt` filters

2. **Controller Path Updated:**
   - Changed from `/api/admin/workspaces/cleanup-test` to `/api/admin/workspaces/maintenance`
   - Provides stable namespace for future admin maintenance operations
   - Routes: `/cleanup-test/candidates` and `/cleanup-test`

3. **Service Logic Cleaned:**
   - Removed unnecessary fields from Candidate type (organizationId, deletedAt)
   - Simplified matching logic with null-safe operators (`??`)
   - Cleaner update operation without type assertions

## Files Updated

### File 1: `zephix-backend/src/modules/workspaces/admin/dto/cleanup-test-workspaces.dto.ts`

```typescript
import { IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';

export class CleanupTestWorkspacesDto {
  @IsBoolean()
  dryRun: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ids?: string[];
}
```

### File 2: `zephix-backend/src/modules/workspaces/admin/workspaces-maintenance.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';

import { TenantContextService } from '../../tenancy/tenant-context.service';
import { Workspace } from '../entities/workspace.entity';

type Candidate = {
  id: string;
  name: string;
  createdAt: Date;
};

const PATTERNS = ['demo', 'test', 'cursor', 'template proofs'];

function matches(name: string): boolean {
  const v = (name ?? '').toLowerCase();
  return PATTERNS.some((p) => v.includes(p));
}

@Injectable()
export class WorkspacesMaintenanceService {
  constructor(
    private readonly tenantContextService: TenantContextService,
    @InjectRepository(Workspace)
    private readonly workspaceRepo: Repository<Workspace>,
  ) {}

  async listCleanupCandidates(): Promise<Candidate[]> {
    const orgId = this.tenantContextService.assertOrganizationId();

    const rows = await this.workspaceRepo.find({
      where: { organizationId: orgId, deletedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });

    return (rows ?? [])
      .filter((w) => matches(w.name))
      .map((w) => ({ id: w.id, name: w.name, createdAt: w.createdAt }));
  }

  async cleanupTestWorkspaces(input: { dryRun: boolean; ids?: string[] }) {
    const orgId = this.tenantContextService.assertOrganizationId();

    const where: any = { organizationId: orgId, deletedAt: IsNull() };
    if (input.ids?.length) where.id = In(input.ids);

    const rows = await this.workspaceRepo.find({
      where,
      order: { createdAt: 'DESC' },
    });

    const candidates = (rows ?? []).filter((w) => matches(w.name));

    const matched = candidates.map((w) => ({
      id: w.id,
      name: w.name,
      createdAt: w.createdAt,
    }));

    if (input.dryRun) {
      return {
        orgId,
        dryRun: true,
        matchedCount: matched.length,
        matched,
        updatedCount: 0,
        updatedIds: [],
      };
    }

    if (matched.length === 0) {
      return {
        orgId,
        dryRun: false,
        matchedCount: 0,
        matched: [],
        updatedCount: 0,
        updatedIds: [],
      };
    }

    const ids = matched.map((m) => m.id);

    await this.workspaceRepo.update(
      { organizationId: orgId, id: In(ids), deletedAt: IsNull() },
      { deletedAt: new Date() },
    );

    return {
      orgId,
      dryRun: false,
      matchedCount: matched.length,
      matched,
      updatedCount: ids.length,
      updatedIds: ids,
    };
  }
}
```

### File 3: `zephix-backend/src/modules/workspaces/admin/workspaces-maintenance.controller.ts`

```typescript
import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RequireOrgRole } from '../guards/require-org-role.guard';
import { RequireOrgRoleGuard } from '../guards/require-org-role.guard';
import { PlatformRole } from '../../../shared/enums/platform-roles.enum';

import { CleanupTestWorkspacesDto } from './dto/cleanup-test-workspaces.dto';
import { WorkspacesMaintenanceService } from './workspaces-maintenance.service';

@Controller('/api/admin/workspaces/maintenance')
@UseGuards(JwtAuthGuard, RequireOrgRoleGuard)
@RequireOrgRole(PlatformRole.ADMIN)
export class WorkspacesMaintenanceController {
  constructor(private readonly svc: WorkspacesMaintenanceService) {}

  @Get('/cleanup-test/candidates')
  async candidates() {
    const data = await this.svc.listCleanupCandidates();
    return { data, meta: { count: data.length } };
  }

  @Post('/cleanup-test')
  async cleanup(@Body() dto: CleanupTestWorkspacesDto) {
    const data = await this.svc.cleanupTestWorkspaces({
      dryRun: dto.dryRun,
      ids: dto.ids,
    });
    return { data, meta: { orgId: data.orgId } };
  }
}
```

### File 4: `zephix-backend/src/modules/workspaces/workspaces.module.ts`

**Already registered correctly:**
- ✅ Imports: `WorkspacesMaintenanceController` and `WorkspacesMaintenanceService`
- ✅ Providers: `WorkspacesMaintenanceService`
- ✅ Controllers: `WorkspacesMaintenanceController`
- ✅ TypeOrmModule includes `Workspace` entity

## API Endpoints (Updated Paths)

### 1. GET /api/admin/workspaces/maintenance/cleanup-test/candidates

**Purpose:** List candidate workspaces for cleanup in the current tenant org.

**Auth:** Requires ADMIN role

**Response:**
```json
{
  "data": [
    {
      "id": "workspace-id",
      "name": "Demo Workspace",
      "createdAt": "2025-01-20T10:00:00Z"
    }
  ],
  "meta": {
    "count": 1
  }
}
```

### 2. POST /api/admin/workspaces/maintenance/cleanup-test

**Purpose:** Soft delete test workspaces (dry run or execute).

**Auth:** Requires ADMIN role

**Request Body:**
```json
{
  "dryRun": true,
  "ids": ["id1", "id2"]  // Optional: restrict to specific IDs
}
```

**Response (dryRun: true):**
```json
{
  "data": {
    "orgId": "org-id",
    "dryRun": true,
    "matchedCount": 2,
    "matched": [
      {
        "id": "id1",
        "name": "Demo Workspace",
        "createdAt": "2025-01-20T10:00:00Z"
      }
    ],
    "updatedCount": 0,
    "updatedIds": []
  },
  "meta": {
    "orgId": "org-id"
  }
}
```

**Response (dryRun: false):**
```json
{
  "data": {
    "orgId": "org-id",
    "dryRun": false,
    "matchedCount": 2,
    "matched": [...],
    "updatedCount": 2,
    "updatedIds": ["id1", "id2"]
  },
  "meta": {
    "orgId": "org-id"
  }
}
```

## Curl Commands (Production Ready)

### Step 1: List Candidates

```bash
curl -sS "https://YOUR_BACKEND_HOST/api/admin/workspaces/maintenance/cleanup-test/candidates" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" | jq
```

**Replace:**
- `YOUR_BACKEND_HOST` with your backend URL (e.g., `zephix-backend-production.up.railway.app`)
- `YOUR_ACCESS_TOKEN` with a valid JWT token for an ADMIN user

### Step 2: Dry Run (Preview)

```bash
curl -sS -X POST "https://YOUR_BACKEND_HOST/api/admin/workspaces/maintenance/cleanup-test" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"dryRun":true}' | jq
```

**Expected:** Returns `matchedCount` and `matched` list, but `updatedCount: 0` and `updatedIds: []`

### Step 3: Execute (Delete All Matches)

```bash
curl -sS -X POST "https://YOUR_BACKEND_HOST/api/admin/workspaces/maintenance/cleanup-test" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"dryRun":false}' | jq
```

**Expected:** Returns `updatedCount > 0` and `updatedIds` array with deleted workspace IDs

### Step 4: Execute (Delete Specific IDs)

```bash
curl -sS -X POST "https://YOUR_BACKEND_HOST/api/admin/workspaces/maintenance/cleanup-test" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"dryRun":false,"ids":["ID_1","ID_2"]}' | jq
```

**Note:** Even with `ids` provided, the service still enforces pattern matching. Only workspaces matching the name patterns will be deleted.

## Browser Console Alternative

If you prefer to run from browser console after login:

```javascript
// Step 1: List candidates
fetch('/api/admin/workspaces/maintenance/cleanup-test/candidates', {
  headers: { 'Authorization': `Bearer ${localStorage.getItem('zephix.at')}` }
}).then(r => r.json()).then(console.log);

// Step 2: Dry run
fetch('/api/admin/workspaces/maintenance/cleanup-test', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('zephix.at')}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ dryRun: true })
}).then(r => r.json()).then(console.log);

// Step 3: Execute
fetch('/api/admin/workspaces/maintenance/cleanup-test', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('zephix.at')}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ dryRun: false })
}).then(r => r.json()).then(console.log);
```

## After Execution

1. **Clear browser localStorage:**
   ```javascript
   localStorage.removeItem('zephix.activeWorkspaceId');
   ```

2. **Refresh app:**
   - Workspace dropdown should show only real workspaces
   - Deleted test workspaces should not appear

3. **Verify in Network tab:**
   - `GET /api/workspaces`: No `x-workspace-id` header ✅
   - `GET /api/projects`: `x-workspace-id` header present after selecting workspace ✅

## Verification Checklist

- [ ] **Candidates endpoint returns only org workspaces from tenant context**
  - Run: `GET /api/admin/workspaces/maintenance/cleanup-test/candidates`
  - Verify: All returned workspaces belong to your tenant org
  - Verify: No workspaces from other orgs appear

- [ ] **Candidates list excludes deletedAt not null**
  - Verify: All candidates have `deletedAt: null` (implicitly, since we filter `IsNull()`)
  - Verify: Already deleted workspaces do not appear

- [ ] **Cleanup dryRun returns matched list and updatedCount 0**
  - Run: `POST /api/admin/workspaces/maintenance/cleanup-test` with `{"dryRun":true}`
  - Verify: `matchedCount` shows number of workspaces that would be deleted
  - Verify: `updatedCount: 0` (no actual deletion)
  - Verify: `updatedIds: []` (empty array)

- [ ] **Cleanup execute returns updatedCount equals updatedIds length**
  - Run: `POST /api/admin/workspaces/maintenance/cleanup-test` with `{"dryRun":false}`
  - Verify: `updatedCount > 0` if workspaces were deleted
  - Verify: `updatedCount === updatedIds.length`
  - Verify: `updatedIds` contains the workspace IDs that were soft deleted

- [ ] **GET /api/workspaces no longer returns deleted workspaces**
  - Run: `GET /api/workspaces` as ADMIN
  - Verify: Deleted workspaces do not appear in the list
  - Run: `GET /api/workspaces` as MEMBER
  - Verify: Deleted workspaces do not appear in the list

- [ ] **Frontend dropdown shows only real workspaces**
  - Clear `zephix.activeWorkspaceId` from localStorage
  - Refresh and login
  - Verify: Dropdown shows only real workspaces (no test/demo ones)

## Build Verification

```bash
cd zephix-backend && npm run build
# ✅ Exit code: 0 - Build successful
```

## Cursor Rules Updated

### `.cursor/rules/10-zephix-backend.mdc`
Added "Admin maintenance endpoints" section enforcing:
- Use `tenantContextService.assertOrganizationId`
- Ignore `organizationId` passed in params or body
- Filter `deletedAt IS NULL` on reads
- Use soft delete only
- Return envelope shape `{ data, meta }`

### `.cursor/rules/20-zephix-frontend.mdc`
Added "Workspace dropdown list source" section enforcing:
- Only `GET /api/workspaces`
- No local mocks
- No auto select when list length > 1

### `.cursorrules`
Added hard stops:
- If any maintenance endpoint reads orgId from request params or body, stop
- If any workspace listing for admin omits deletedAt filter, stop
- If any frontend code adds x-workspace-id to /workspaces requests, stop

---

**Admin Cleanup API Fixed and Hardened** ✅
