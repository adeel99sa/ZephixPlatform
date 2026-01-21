# Admin Cleanup API - Complete Implementation

**Date:** 2025-01-27  
**Status:** ✅ COMPLETE

## Goal

Remove test and demo workspaces from production via admin-only maintenance API, without Railway UI access or direct SQL access.

## Files Created/Modified

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
import { Repository, In, IsNull } from 'typeorm';

import { TenantContextService } from '../../tenancy/tenant-context.service';
import { Workspace } from '../entities/workspace.entity';

type Candidate = {
  id: string;
  name: string;
  organizationId: string;
  createdAt: Date;
  deletedAt: Date | null;
};

const PATTERNS = ['demo', 'test', 'cursor', 'template proofs'];

function isMatch(name: string): boolean {
  const v = (name || '').toLowerCase();
  return PATTERNS.some(p => v.includes(p));
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
      where: {
        organizationId: orgId,
        deletedAt: IsNull(),
      },
      order: { createdAt: 'DESC' },
    });

    return (rows || [])
      .filter(w => isMatch(w.name))
      .map(w => ({
        id: w.id,
        name: w.name,
        organizationId: w.organizationId,
        createdAt: w.createdAt,
        deletedAt: w.deletedAt ?? null,
      }));
  }

  async cleanupTestWorkspaces(input: { dryRun: boolean; ids?: string[] }) {
    const orgId = this.tenantContextService.assertOrganizationId();

    const baseWhere: any = {
      organizationId: orgId,
      deletedAt: IsNull(),
    };

    if (input.ids && input.ids.length > 0) {
      baseWhere.id = In(input.ids);
    }

    const rows = await this.workspaceRepo.find({
      where: baseWhere,
      order: { createdAt: 'DESC' },
    });

    const candidates = (rows || []).filter(w => isMatch(w.name));

    const result = {
      orgId,
      dryRun: input.dryRun,
      matchedCount: candidates.length,
      matched: candidates.map(w => ({
        id: w.id,
        name: w.name,
        createdAt: w.createdAt,
      })),
      updatedCount: 0,
      updatedIds: [] as string[],
    };

    if (input.dryRun) {
      return result;
    }

    if (candidates.length === 0) {
      return result;
    }

    const ids = candidates.map(w => w.id);

    await this.workspaceRepo.update(
      { id: In(ids), organizationId: orgId, deletedAt: IsNull() as any },
      { deletedAt: new Date() as any },
    );

    result.updatedCount = ids.length;
    result.updatedIds = ids;

    return result;
  }
}
```

### File 3: `zephix-backend/src/modules/workspaces/admin/workspaces-maintenance.controller.ts`

```typescript
import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';

import { CleanupTestWorkspacesDto } from './dto/cleanup-test-workspaces.dto';
import { WorkspacesMaintenanceService } from './workspaces-maintenance.service';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RequireOrgRoleGuard } from '../guards/require-org-role.guard';
import { RequireOrgRole } from '../guards/require-org-role.guard';
import { PlatformRole } from '../../../shared/enums/platform-roles.enum';

@Controller('/api/admin/workspaces/cleanup-test')
@UseGuards(JwtAuthGuard, RequireOrgRoleGuard)
@RequireOrgRole(PlatformRole.ADMIN)
export class WorkspacesMaintenanceController {
  constructor(private readonly svc: WorkspacesMaintenanceService) {}

  @Get('/candidates')
  async candidates() {
    const data = await this.svc.listCleanupCandidates();
    return {
      data,
      meta: {
        count: data.length,
      },
    };
  }

  @Post()
  async cleanup(@Body() dto: CleanupTestWorkspacesDto) {
    const data = await this.svc.cleanupTestWorkspaces({
      dryRun: dto.dryRun,
      ids: dto.ids,
    });

    return {
      data,
      meta: {
        orgId: data.orgId,
      },
    };
  }
}
```

### File 4: `zephix-backend/src/modules/workspaces/workspaces.module.ts`

**Added imports:**
```typescript
import { WorkspacesMaintenanceController } from './admin/workspaces-maintenance.controller';
import { WorkspacesMaintenanceService } from './admin/workspaces-maintenance.service';
```

**Added to providers:**
```typescript
WorkspacesMaintenanceService, // Admin maintenance API for cleanup
```

**Added to controllers:**
```typescript
controllers: [WorkspacesController, AdminTrashController, WorkspacesMaintenanceController],
```

## Security Features

✅ **Tenant Isolation:**
- Always reads `orgId` from `TenantContextService.assertOrganizationId()`
- Never trusts `organizationId` from request params or body
- All queries explicitly filter by `organizationId: orgId`

✅ **Role Enforcement:**
- `@UseGuards(JwtAuthGuard, RequireOrgRoleGuard)`
- `@RequireOrgRole(PlatformRole.ADMIN)`
- Only ADMIN role can access these endpoints

✅ **Soft Delete Only:**
- Uses `deletedAt` timestamp, never hard deletes
- Does not touch already deleted workspaces (`deletedAt IS NULL` filter)

✅ **Pattern Matching:**
- Only matches workspaces with names containing: 'demo', 'test', 'cursor', 'template proofs'
- Case-insensitive matching

## API Endpoints

### 1. GET /api/admin/workspaces/cleanup-test/candidates

**Purpose:** List candidate workspaces for cleanup in the current tenant org.

**Auth:** Requires ADMIN role

**Response:**
```json
{
  "data": [
    {
      "id": "workspace-id",
      "name": "Demo Workspace",
      "organizationId": "org-id",
      "createdAt": "2025-01-20T10:00:00Z",
      "deletedAt": null
    }
  ],
  "meta": {
    "count": 1
  }
}
```

### 2. POST /api/admin/workspaces/cleanup-test

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

## Curl Commands

### Step 1: Dry Run - List Candidates

```bash
curl -s -X GET "https://YOUR_BACKEND_HOST/api/admin/workspaces/cleanup-test/candidates" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" | jq
```

**Replace:**
- `YOUR_BACKEND_HOST` with your backend URL (e.g., `zephix-backend-production.up.railway.app`)
- `YOUR_ACCESS_TOKEN` with a valid JWT token for an ADMIN user

### Step 2: Dry Run - Preview Deletion

```bash
curl -s -X POST "https://YOUR_BACKEND_HOST/api/admin/workspaces/cleanup-test" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"dryRun":true}' | jq
```

**Expected:** Returns `matchedCount` and `matched` list, but `updatedCount: 0` and `updatedIds: []`

### Step 3: Execute - Delete All Matches

```bash
curl -s -X POST "https://YOUR_BACKEND_HOST/api/admin/workspaces/cleanup-test" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"dryRun":false}' | jq
```

**Expected:** Returns `updatedCount > 0` and `updatedIds` array with deleted workspace IDs

### Step 4: Execute - Delete Specific IDs

```bash
curl -s -X POST "https://YOUR_BACKEND_HOST/api/admin/workspaces/cleanup-test" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"dryRun":false,"ids":["ID_1","ID_2"]}' | jq
```

**Note:** Even with `ids` provided, the service still enforces pattern matching. Only workspaces matching the name patterns will be deleted.

## Verification Checklist

After running cleanup:

- [ ] **Candidates endpoint returns only org workspaces from tenant context**
  - Run: `GET /api/admin/workspaces/cleanup-test/candidates`
  - Verify: All returned workspaces have `organizationId` matching your tenant org
  - Verify: No workspaces from other orgs appear

- [ ] **Candidates list excludes deletedAt not null**
  - Verify: All candidates have `deletedAt: null`
  - Verify: Already deleted workspaces do not appear

- [ ] **Cleanup dryRun returns matched list and updatedCount 0**
  - Run: `POST /api/admin/workspaces/cleanup-test` with `{"dryRun":true}`
  - Verify: `matchedCount` shows number of workspaces that would be deleted
  - Verify: `updatedCount: 0` (no actual deletion)
  - Verify: `updatedIds: []` (empty array)

- [ ] **Cleanup execute returns updatedCount equals updatedIds length**
  - Run: `POST /api/admin/workspaces/cleanup-test` with `{"dryRun":false}`
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

- [ ] **Header behavior verified**
  - `GET /api/workspaces`: Must NOT include `x-workspace-id` header ✅
  - `GET /api/projects`: Must include `x-workspace-id` header after selecting workspace ✅

## Build Verification

```bash
cd zephix-backend && npm run build
# ✅ Exit code: 0 - Build successful
```

## Full File Contents

All files have been created with exact content as specified above.

---

**Admin Cleanup API Complete** ✅
