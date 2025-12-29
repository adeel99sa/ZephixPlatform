# Template Center v1 - Implementation Sequence

## Phase Sequence

1. ✅ **Phase 2a:** Tenancy and CI hardening - Done
2. 🔄 **Template Center v1 Data Layer:** Migrations and entities - You are here
3. ⏭️ **Template Center v1 API:** Minimal endpoints
4. ⏭️ **Project Creation:** Uses templates with snapshots
5. ⏭️ **Cmd+K Registry:** Reads lego block catalog, attaches blocks
6. ⏭️ **KPI Runtime Surfaces:** Dashboards, reports, fields
7. ⏭️ **Integrations (Jira):** Later, not MVP

## Current Controllers Analysis

### TemplatesController (`/api/templates`)
**File:** `zephix-backend/src/modules/templates/controllers/templates.controller.ts`

**Existing Endpoints:**
- ✅ `GET /api/templates` - List templates (filters: scope, category, kind, search, isActive, methodology)
- ✅ `GET /api/templates/:id` - Get single template by ID
- ✅ `POST /api/templates` - Create template
- ✅ `PUT /api/templates/:id` - Update template
- ✅ `PATCH /api/templates/:id` - Update template (alternative)
- ✅ `DELETE /api/templates/:id` - Archive template (soft delete)
- ✅ `POST /api/templates/:id/instantiate` - Create project from template

**Missing for v1:**
- ❌ `GET /api/templates/default` - Get org default template
- ❌ `POST /api/templates/:id/clone` - Clone template
- ❌ `POST /api/templates/:id/publish` - Publish template
- ❌ `POST /api/templates/:id/archive` - Archive template (may map to DELETE)
- ❌ `POST /api/templates/:id/default` - Set as default
- ❌ `POST /api/templates/:id/lock` - Lock template
- ❌ `POST /api/templates/:id/unlock` - Unlock template

### AdminTemplatesController (`/admin/templates`)
**File:** Same file as TemplatesController

**Existing Endpoints:**
- ✅ `GET /admin/templates` - List templates (admin)
- ✅ `GET /admin/templates/:id` - Get template (admin)
- ✅ `POST /admin/templates` - Create template (admin)
- ✅ `PATCH /admin/templates/:id` - Update template (admin)
- ✅ `POST /admin/templates/:id/apply` - Apply template to create project (admin)
- ✅ `DELETE /admin/templates/:id` - Archive template (admin)

**Note:** Admin routes may be redundant with `/api/templates` if we add role guards.

### TemplateController (`/templates`) - Legacy
**File:** `zephix-backend/src/modules/templates/controllers/template.controller.ts`

**Existing Endpoints:**
- ⚠️ `GET /templates` - Get all templates (legacy, consolidate)
- ⚠️ `GET /templates/:id` - Get template by ID (legacy, consolidate)
- ⚠️ `GET /templates/blocks/all` - Get all blocks (legacy, move to `/api/lego-blocks`)
- ⚠️ `GET /templates/blocks/type/:type` - Get blocks by type (legacy, move to `/api/lego-blocks`)
- ⚠️ `POST /templates/create-project` - Create project from template (legacy, consolidate)
- ⚠️ `POST /templates/projects/:projectId/blocks/:blockId` - Add block to project (legacy, remove)

**Action:** Deprecate this controller after consolidating routes.

## V1 Endpoint Mapping

### Template Management

| V1 Endpoint | Current Status | Action | Notes |
|------------|----------------|--------|-------|
| `GET /api/templates` | ✅ Exists | **Keep** | Add filter for `isDefault`, `lockState` |
| `GET /api/templates/:id` | ✅ Exists | **Keep** | Add `blocks` array in response |
| `GET /api/templates/default` | ❌ Missing | **Add** | New endpoint |
| `POST /api/templates` | ✅ Exists | **Keep** | Add lock enforcement, set `createdById` |
| `POST /api/templates/:id/clone` | ❌ Missing | **Add** | New endpoint |
| `POST /api/templates/:id/publish` | ❌ Missing | **Add** | New endpoint (sets `publishedAt`) |
| `POST /api/templates/:id/archive` | ✅ Exists as DELETE | **Rename/Add** | Use `archivedAt` instead of soft delete |
| `POST /api/templates/:id/default` | ❌ Missing | **Add** | New endpoint (enforces unique default) |
| `POST /api/templates/:id/lock` | ❌ Missing | **Add** | New endpoint |
| `POST /api/templates/:id/unlock` | ❌ Missing | **Add** | New endpoint |
| `PUT /api/templates/:id` | ✅ Exists | **Keep** | Add lock enforcement |
| `PATCH /api/templates/:id` | ✅ Exists | **Keep** | Add lock enforcement |
| `DELETE /api/templates/:id` | ✅ Exists | **Keep** | Change to set `archivedAt` instead of delete |

### Lego Blocks (KPI Modules)

| V1 Endpoint | Current Status | Action | Notes |
|------------|----------------|--------|-------|
| `GET /api/lego-blocks` | ⚠️ Legacy exists | **Add** | New endpoint (replaces `/templates/blocks/all`) |
| `POST /api/templates/:id/blocks` | ❌ Missing | **Add** | Attach block to template |
| `PATCH /api/templates/:id/blocks/reorder` | ❌ Missing | **Add** | Reorder blocks |
| `PATCH /api/templates/:id/blocks/:blockId/config` | ❌ Missing | **Add** | Configure block overrides |
| `DELETE /api/templates/:id/blocks/:blockId` | ❌ Missing | **Add** | Detach block |

### Project Creation

| V1 Endpoint | Current Status | Action | Notes |
|------------|----------------|--------|-------|
| `POST /api/templates/:id/instantiate` | ✅ Exists | **Keep** | Update to save `templateSnapshot` |
| `POST /api/projects` | ✅ Exists | **Update** | Accept `templateId`, save snapshot |

## Minimal Code Diffs

### Step 1: Run Migrations
```bash
# Run migrations A, B, C, D, E0, E1, E, F
npm run migration:run
```

### Step 2: Add Entities
- ✅ Template: Add v1 fields (`isDefault`, `lockState`, `createdById`, `updatedById`, `publishedAt`, `archivedAt`)
- ✅ LegoBlock: Add v1 fields (`key`, `surface`, `isActive`, `minRoleToAttach`)
- ✅ TemplateBlock: Create new entity
- ✅ Project: Add fields (`templateId`, `templateVersion`, `templateLocked`, `templateSnapshot`)
- ✅ ProjectTemplate: Add `templateId` field

### Step 3: Add DAL Providers
- Create `TemplateRepository` using `TenantAwareRepository`
- Create `TemplateBlockRepository` using `TenantAwareRepository`
- Update `LegoBlockRepository` to use `TenantAwareRepository`

### Step 4: Add API Endpoints (Minimal Diffs)

#### TemplatesController Updates

**Keep and Enhance:**
```typescript
// Keep existing
@Get()
async findAll(...) { /* Add isDefault, lockState filters */ }

@Get(':id')
async findOne(...) { /* Add blocks array in response */ }

@Post()
async create(...) { /* Add lock enforcement, set createdById */ }

@Put(':id')
async update(...) { /* Add lock enforcement */ }

@Patch(':id')
async patch(...) { /* Add lock enforcement */ }

@Delete(':id')
async remove(...) { /* Change to set archivedAt instead of delete */ }

@Post(':id/instantiate')
async instantiate(...) { /* Update to save templateSnapshot */ }
```

**Add New:**
```typescript
@Get('default')
async getDefault(@CurrentUser() user: UserJwt) {
  // Get org default template
}

@Post(':id/clone')
async clone(@Param('id') id: string, @Body() dto: CloneTemplateDto, @CurrentUser() user: UserJwt) {
  // Clone template and blocks
}

@Post(':id/publish')
async publish(@Param('id') id: string, @CurrentUser() user: UserJwt) {
  // Set publishedAt
}

@Post(':id/archive')
async archive(@Param('id') id: string, @CurrentUser() user: UserJwt) {
  // Set archivedAt
}

@Post(':id/default')
async setDefault(@Param('id') id: string, @CurrentUser() user: UserJwt) {
  // Set as org default (enforce unique)
}

@Post(':id/lock')
async lock(@Param('id') id: string, @Body() dto: LockTemplateDto, @CurrentUser() user: UserJwt) {
  // Set lockState = 'LOCKED'
}

@Post(':id/unlock')
async unlock(@Param('id') id: string, @Body() dto: UnlockTemplateDto, @CurrentUser() user: UserJwt) {
  // Set lockState = 'UNLOCKED'
}
```

#### New LegoBlocksController

**Create New File:**
```typescript
@Controller('api/lego-blocks')
@UseGuards(JwtAuthGuard)
export class LegoBlocksController {
  @Get()
  async findAll(@Query('category') category?: string, @Query('q') search?: string) {
    // List lego blocks catalog
  }
}
```

#### TemplateBlocksController (New)

**Create New File:**
```typescript
@Controller('api/templates/:templateId/blocks')
@UseGuards(JwtAuthGuard)
export class TemplateBlocksController {
  @Post()
  async attach(@Param('templateId') templateId: string, @Body() dto: AttachBlockDto, @CurrentUser() user: UserJwt) {
    // Attach block, enforce lock, enforce minRoleToAttach
  }

  @Patch('reorder')
  async reorder(@Param('templateId') templateId: string, @Body() dto: ReorderBlocksDto, @CurrentUser() user: UserJwt) {
    // Reorder blocks, enforce lock
  }

  @Patch(':blockId/config')
  async updateConfig(@Param('templateId') templateId: string, @Param('blockId') blockId: string, @Body() dto: BlockConfigDto, @CurrentUser() user: UserJwt) {
    // Update block config, enforce lock
  }

  @Delete(':blockId')
  async detach(@Param('templateId') templateId: string, @Param('blockId') blockId: string, @CurrentUser() user: UserJwt) {
    // Detach block, enforce lock
  }
}
```

### Step 5: Update Project Creation Flow

**ProjectsController or ProjectsService:**
```typescript
@Post()
async create(@Body() dto: CreateProjectDto, @CurrentUser() user: UserJwt) {
  // If templateId provided:
  // 1. Load template and template blocks
  // 2. Create templateSnapshot JSONB
  // 3. Set templateVersion = template.version
  // 4. Set templateLocked = template.lockState === 'LOCKED'
  // 5. Save project with snapshot
}
```

### Step 6: Add Guardrails

**Lock Enforcement Guard:**
```typescript
// In every template mutation endpoint:
if (template.lockState === 'LOCKED') {
  throw new ForbiddenException('Template is locked and cannot be modified');
}
```

**Unique Default Enforcement:**
```typescript
// In setDefault endpoint:
// Transaction:
// 1. Set all org templates isDefault = false
// 2. Set this template isDefault = true
// Partial unique index enforces constraint
```

**Role Gate on minRoleToAttach:**
```typescript
// In attach block endpoint:
if (block.minRoleToAttach && !hasRole(user, block.minRoleToAttach)) {
  throw new ForbiddenException(`Role ${block.minRoleToAttach} required to attach this block`);
}
```

**Snapshot Required:**
```typescript
// In project creation:
if (templateId && !templateSnapshot) {
  throw new BadRequestException('Template snapshot is required when creating from template');
}
```

## Deprecation Plan

### Legacy TemplateController (`/templates`)
1. **Phase 1:** Add deprecation warnings to all endpoints
2. **Phase 2:** Redirect to new endpoints
3. **Phase 3:** Remove after 2 releases

### AdminTemplatesController (`/admin/templates`)
1. **Option A:** Keep for admin-only operations (if needed)
2. **Option B:** Consolidate into `/api/templates` with role guards
3. **Recommendation:** Option B - use role guards instead of separate controller

## Implementation Checklist

- [ ] Run migrations A, B, C, D, E0, E1, E, F on fresh DB
- [ ] Run migrations on seeded DB
- [ ] Add entity fields (Template, LegoBlock, TemplateBlock, Project, ProjectTemplate)
- [ ] Create TemplateBlock entity file
- [ ] Add DAL providers (TenantAwareRepository)
- [ ] Add lock enforcement guard/service
- [ ] Add `GET /api/templates/default`
- [ ] Add `POST /api/templates/:id/clone`
- [ ] Add `POST /api/templates/:id/publish`
- [ ] Add `POST /api/templates/:id/archive`
- [ ] Add `POST /api/templates/:id/default`
- [ ] Add `POST /api/templates/:id/lock`
- [ ] Add `POST /api/templates/:id/unlock`
- [ ] Create `LegoBlocksController` with `GET /api/lego-blocks`
- [ ] Create `TemplateBlocksController` with attach/detach/reorder/config endpoints
- [ ] Update `POST /api/templates/:id/instantiate` to save snapshot
- [ ] Update `POST /api/projects` to accept templateId and save snapshot
- [ ] Add unique default enforcement
- [ ] Add role gate on minRoleToAttach
- [ ] Add snapshot required validation
- [ ] Deprecate legacy TemplateController
- [ ] Add tests for all new endpoints
- [ ] Add tests for lock enforcement
- [ ] Add tests for unique default enforcement



