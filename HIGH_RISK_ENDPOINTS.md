# High-Risk Endpoints - Hardening Priority

## 🚨 Priority 1: Workspaces List and Switch

### Endpoints to Harden

#### `GET /api/workspaces`
**File:** `zephix-backend/src/modules/workspaces/workspaces.controller.ts:62-65`

**Current Behavior:**
- Returns raw array from `listByOrg()`
- Can throw if DB error occurs
- No standardized response format

**Hardening Needed:**
```typescript
@Get()
async findAll(@CurrentUser() u: UserJwt) {
  try {
    const workspaces = await this.svc.listByOrg(u.organizationId, u.id, u.role);
    return { data: workspaces || [] };
  } catch (error) {
    this.logger.error('Failed to get workspaces', {
      error: error instanceof Error ? error.message : String(error),
      errorClass: error instanceof Error ? error.constructor.name : 'Unknown',
      organizationId: u.organizationId,
      userId: u.id,
      requestId: req.headers['x-request-id'],
      endpoint: 'GET /api/workspaces',
    });
    return { data: [] };
  }
}
```

#### `GET /api/workspaces/:id`
**File:** `zephix-backend/src/modules/workspaces/workspaces.controller.ts:67-82`

**Current Behavior:**
- Throws `ForbiddenException` if no access (correct)
- Can throw if workspace not found
- No standardized response format

**Hardening Needed:**
```typescript
@Get(':id')
async get(@Param('id') id: string, @CurrentUser() u: UserJwt) {
  try {
    const canAccess = await this.accessService.canAccessWorkspace(
      id,
      u.organizationId,
      u.id,
      u.role,
    );

    if (!canAccess) {
      throw new ForbiddenException('You do not have access to this workspace');
    }

    const workspace = await this.svc.getById(u.organizationId, id);
    if (!workspace) {
      return { data: null };
    }
    return { data: workspace };
  } catch (error) {
    if (error instanceof ForbiddenException) {
      throw error; // Re-throw auth errors
    }
    // Log and return null for not found
    this.logger.error('Failed to get workspace', {
      error: error instanceof Error ? error.message : String(error),
      errorClass: error instanceof Error ? error.constructor.name : 'Unknown',
      organizationId: u.organizationId,
      userId: u.id,
      workspaceId: id,
      requestId: req.headers['x-request-id'],
      endpoint: 'GET /api/workspaces/:id',
    });
    return { data: null };
  }
}
```

#### `GET /api/admin/workspaces`
**File:** `zephix-backend/src/admin/admin.controller.ts:450-498`

**Current Behavior:**
- Throws `InternalServerErrorException` on error
- No standardized response format

**Hardening Needed:**
- Wrap in try-catch
- Return `{ data: [] }` on error
- Add structured logging

---

## 🚨 Priority 2: Projects List and Settings

### Endpoints to Harden

#### `GET /api/projects`
**File:** `zephix-backend/src/modules/projects/projects.controller.ts:70-92`

**Current Behavior:**
- Returns paginated response directly
- Can throw if DB error occurs
- No standardized response format

**Hardening Needed:**
```typescript
@Get()
async findAll(
  @GetTenant() tenant: TenantContext,
  @Query('workspaceId') workspaceId?: string,
  @Query('page') page?: string,
  @Query('limit') limit?: string,
  @Query('status') status?: string,
  @Query('search') search?: string,
) {
  try {
    this.logger.log(`Fetching projects for org ${tenant.organizationId}`);

    const options = {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 10,
      status,
      search,
      workspaceId,
      userId: tenant.userId,
      userRole: tenant.userRole,
    };

    const result = await this.projectsService.findAllProjects(tenant.organizationId, options);
    return { data: result };
  } catch (error) {
    this.logger.error('Failed to get projects', {
      error: error instanceof Error ? error.message : String(error),
      errorClass: error instanceof Error ? error.constructor.name : 'Unknown',
      organizationId: tenant.organizationId,
      userId: tenant.userId,
      requestId: req.headers['x-request-id'],
      endpoint: 'GET /api/projects',
    });
    return {
      data: {
        projects: [],
        total: 0,
        page: 1,
        totalPages: 0,
      },
    };
  }
}
```

#### `GET /api/projects/:id`
**File:** `zephix-backend/src/modules/projects/projects.controller.ts:118-127`

**Current Behavior:**
- Can throw if project not found
- No standardized response format

**Hardening Needed:**
- Wrap in try-catch
- Return `{ data: null }` if not found (200 status)
- Add structured logging

#### `GET /api/projects/stats`
**File:** `zephix-backend/src/modules/projects/projects.controller.ts:94-98`

**Current Behavior:**
- Can throw if DB error occurs
- No standardized response format

**Hardening Needed:**
- Wrap in try-catch
- Return `{ data: { ... } }` with zeroed values on error
- Add structured logging

---

## 🚨 Priority 3: Organizations Switch

### Endpoints to Harden

#### `GET /api/organizations`
**Needs Investigation:**
- Find organization list endpoint
- Check if it can 500 on empty
- Standardize response format

#### `GET /api/organizations/:id`
**Needs Investigation:**
- Find organization detail endpoint
- Check if it can 500 on not found
- Standardize response format

---

## 🚨 Priority 4: Resource Endpoints (Stats from Empty Tables)

### Endpoints to Harden

#### `GET /api/resources/allocations`
**Needs Investigation:**
- Find resource allocations endpoint
- Check if it can 500 on empty tables
- Return `{ data: [] }` on empty

#### `GET /api/resources/risk`
**Needs Investigation:**
- Find resource risk endpoint
- Check if it can 500 on empty tables
- Return `{ data: { ... } }` with zeroed values

#### `GET /api/resources/stats`
**Needs Investigation:**
- Find resource stats endpoint
- Check if it can 500 on empty tables
- Return `{ data: { ... } }` with zeroed values

---

## 📋 Hardening Checklist Template

For each endpoint:

1. ✅ Wrap handler in try-catch
2. ✅ Return `{ data: ... }` format
3. ✅ Return safe defaults on error (empty array, null, or zeroed object)
4. ✅ Add structured logging with:
   - `requestId`
   - `organizationId`
   - `userId`
   - `workspaceId` (if applicable)
   - `endpoint`
   - `errorClass`
5. ✅ Never throw 500 for "no rows found" or "not configured"
6. ✅ Create contract test
7. ✅ Update frontend API client to handle `{ data: ... }` format
8. ✅ Add auth guard to frontend page (wait for `authLoading === false`)

---

## 🎯 Next Steps

1. **Start with Workspaces** (highest impact - used everywhere)
2. **Then Projects** (used by template instantiation)
3. **Then Organizations** (used by org switching)
4. **Finally Resources** (used by risk/stats calculations)






