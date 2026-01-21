# Template Center v1 - Endpoint Mapping & Code Diffs

## Current Controllers Summary

### TemplatesController (`/api/templates`)
**File:** `zephix-backend/src/modules/templates/controllers/templates.controller.ts`

**Status:** ✅ Active, keep and enhance

### AdminTemplatesController (`/admin/templates`)
**File:** Same file as TemplatesController

**Status:** ⚠️ Consider consolidating into `/api/templates` with role guards

### TemplateController (`/templates`) - Legacy
**File:** `zephix-backend/src/modules/templates/controllers/template.controller.ts`

**Status:** ❌ Deprecate after consolidation

## Detailed Endpoint Mapping

### Template Management Endpoints

#### ✅ KEEP: `GET /api/templates`
**Current:** List templates with filters
**V1 Changes:**
- Add filter for `isDefault` (boolean query param)
- Add filter for `lockState` ('UNLOCKED' | 'LOCKED' query param)
- Response includes `isDefault`, `lockState` fields

**Minimal Diff:**
```typescript
@Get()
async findAll(
  @Query('scope') scope?: 'organization' | 'team' | 'personal',
  @Query('category') category?: string,
  @Query('kind') kind?: 'project' | 'board' | 'mixed',
  @Query('search') search?: string,
  @Query('isActive') isActive?: string,
  @Query('methodology') methodology?: string,
  @Query('isDefault') isDefault?: string,  // NEW
  @Query('lockState') lockState?: 'UNLOCKED' | 'LOCKED',  // NEW
  @CurrentUser() user?: UserJwt,
  @Request() req?: any,
) {
  // Add isDefault and lockState to filters object
  const templates = await this.templatesService.findAll(
    organizationId,
    scope,
    {
      category,
      kind,
      search,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      methodology,
      isDefault: isDefault === 'true' ? true : isDefault === 'false' ? false : undefined,  // NEW
      lockState: lockState as 'UNLOCKED' | 'LOCKED' | undefined,  // NEW
    },
  );
  return { data: templates };
}
```

#### ✅ KEEP: `GET /api/templates/:id`
**Current:** Get single template
**V1 Changes:**
- Response includes `blocks` array (template blocks with lego block details)

**Minimal Diff:**
```typescript
@Get(':id')
async findOne(@Param('id') id: string, @CurrentUser() user: UserJwt) {
  const template = await this.templatesService.findOne(id, user.organizationId);
  // Service should include blocks array
  return { data: template };
}
```

#### ❌ ADD: `GET /api/templates/default`
**New Endpoint:**
```typescript
@Get('default')
async getDefault(@CurrentUser() user: UserJwt) {
  const template = await this.templatesService.findDefault(user.organizationId);
  return { data: template };
}
```

#### ✅ KEEP: `POST /api/templates`
**Current:** Create template
**V1 Changes:**
- Set `createdById` from user.id
- Set `lockState` = 'UNLOCKED' by default
- Set `isDefault` = false by default

**Minimal Diff:**
```typescript
@Post()
async create(@Body() dto: CreateTemplateDto, @CurrentUser() user: UserJwt) {
  return this.templatesService.create(dto, user.id, user.organizationId);
  // Service should set createdById, lockState, isDefault
}
```

#### ❌ ADD: `POST /api/templates/:id/clone`
**New Endpoint:**
```typescript
@Post(':id/clone')
async clone(
  @Param('id') id: string,
  @Body() dto: { name: string; makeDefault?: boolean },
  @CurrentUser() user: UserJwt,
) {
  // Check lock state
  // Clone template and blocks
  // Set makeDefault if requested (enforce unique default)
  return this.templatesService.clone(id, dto, user.id, user.organizationId);
}
```

#### ❌ ADD: `POST /api/templates/:id/publish`
**New Endpoint:**
```typescript
@Post(':id/publish')
async publish(@Param('id') id: string, @CurrentUser() user: UserJwt) {
  // Check lock state
  // Set publishedAt = now
  return this.templatesService.publish(id, user.id, user.organizationId);
}
```

#### ✅ KEEP: `DELETE /api/templates/:id`
**Current:** Archive template (soft delete)
**V1 Changes:**
- Change from `isActive = false` to `archivedAt = now()`
- Keep soft delete behavior

**Minimal Diff:**
```typescript
@Delete(':id')
@HttpCode(HttpStatus.NO_CONTENT)
async remove(@Param('id') id: string, @CurrentUser() user: UserJwt) {
  await this.templatesService.archive(id, user.organizationId);
  // Service should set archivedAt instead of isActive
}
```

#### ❌ ADD: `POST /api/templates/:id/archive`
**New Endpoint (Alternative to DELETE):**
```typescript
@Post(':id/archive')
async archive(@Param('id') id: string, @CurrentUser() user: UserJwt) {
  await this.templatesService.archive(id, user.organizationId);
  return { data: { id, archived: true } };
}
```

#### ❌ ADD: `POST /api/templates/:id/default`
**New Endpoint:**
```typescript
@Post(':id/default')
async setDefault(@Param('id') id: string, @CurrentUser() user: UserJwt) {
  // Transaction:
  // 1. Set all org templates isDefault = false
  // 2. Set this template isDefault = true
  // Partial unique index enforces constraint
  return this.templatesService.setDefault(id, user.organizationId);
}
```

#### ❌ ADD: `POST /api/templates/:id/lock`
**New Endpoint:**
```typescript
@Post(':id/lock')
async lock(
  @Param('id') id: string,
  @Body() dto: { reason?: string },
  @CurrentUser() user: UserJwt,
) {
  return this.templatesService.lock(id, dto.reason, user.id, user.organizationId);
}
```

#### ❌ ADD: `POST /api/templates/:id/unlock`
**New Endpoint:**
```typescript
@Post(':id/unlock')
async unlock(
  @Param('id') id: string,
  @Body() dto: { reason?: string },
  @CurrentUser() user: UserJwt,
) {
  return this.templatesService.unlock(id, dto.reason, user.id, user.organizationId);
}
```

#### ✅ KEEP: `PUT /api/templates/:id`
**Current:** Update template
**V1 Changes:**
- Add lock enforcement guard

**Minimal Diff:**
```typescript
@Put(':id')
async update(
  @Param('id') id: string,
  @Body() dto: UpdateTemplateDto,
  @CurrentUser() user: UserJwt,
) {
  // Service should check lockState before update
  return this.templatesService.update(id, user.organizationId, dto);
}
```

#### ✅ KEEP: `PATCH /api/templates/:id`
**Current:** Update template (alternative)
**V1 Changes:**
- Add lock enforcement guard

**Minimal Diff:**
```typescript
@Patch(':id')
async patch(
  @Param('id') id: string,
  @Body() dto: UpdateTemplateDto,
  @CurrentUser() user: UserJwt,
) {
  // Service should check lockState before update
  return this.templatesService.update(id, user.organizationId, dto);
}
```

#### ✅ KEEP: `POST /api/templates/:id/instantiate`
**Current:** Create project from template
**V1 Changes:**
- Save `templateSnapshot` (JSONB with blocks and config)
- Set `templateVersion` = template.version
- Set `templateLocked` = template.lockState === 'LOCKED'
- Set `templateId` on project

**Minimal Diff:**
```typescript
@Post(':id/instantiate')
async instantiate(
  @Param('id') templateId: string,
  @Body() dto: { workspaceId: string; projectName: string; ... },
  @CurrentUser() user: UserJwt,
) {
  // Service should:
  // 1. Load template and template blocks
  // 2. Create templateSnapshot JSONB
  // 3. Set templateVersion, templateLocked, templateId
  return this.instantiateService.instantiate(templateId, dto, user.organizationId, user.id, userRole);
}
```

### Lego Blocks (KPI Modules) Endpoints

#### ❌ ADD: `GET /api/lego-blocks`
**New Controller:** `LegoBlocksController`
**File:** `zephix-backend/src/modules/templates/controllers/lego-blocks.controller.ts`

```typescript
@Controller('api/lego-blocks')
@UseGuards(JwtAuthGuard)
export class LegoBlocksController {
  @Get()
  async findAll(
    @Query('category') category?: string,
    @Query('q') search?: string,
    @Query('type') type?: 'kpi' | 'phase' | 'view' | 'field' | 'automation',
    @CurrentUser() user: UserJwt,
  ) {
    return this.legoBlocksService.findAll(user.organizationId, { category, search, type });
  }
}
```

**Replaces:** `GET /templates/blocks/all` (legacy)

### Template Blocks Endpoints

#### ❌ ADD: `POST /api/templates/:templateId/blocks`
**New Controller:** `TemplateBlocksController`
**File:** `zephix-backend/src/modules/templates/controllers/template-blocks.controller.ts`

```typescript
@Controller('api/templates/:templateId/blocks')
@UseGuards(JwtAuthGuard)
export class TemplateBlocksController {
  @Post()
  async attach(
    @Param('templateId') templateId: string,
    @Body() dto: { blockId: string; enabled?: boolean; displayOrder?: number; config?: any },
    @CurrentUser() user: UserJwt,
  ) {
    // 1. Check template lockState
    // 2. Check minRoleToAttach
    // 3. Create TemplateBlock row
    return this.templateBlocksService.attach(templateId, dto, user.organizationId, user);
  }
}
```

#### ❌ ADD: `PATCH /api/templates/:templateId/blocks/reorder`
```typescript
@Patch('reorder')
async reorder(
  @Param('templateId') templateId: string,
  @Body() dto: { blockIds: string[] }, // Ordered array
  @CurrentUser() user: UserJwt,
) {
  // 1. Check template lockState
  // 2. Update displayOrder for all blocks
  return this.templateBlocksService.reorder(templateId, dto.blockIds, user.organizationId);
}
```

#### ❌ ADD: `PATCH /api/templates/:templateId/blocks/:blockId/config`
```typescript
@Patch(':blockId/config')
async updateConfig(
  @Param('templateId') templateId: string,
  @Param('blockId') blockId: string,
  @Body() dto: { config: any },
  @CurrentUser() user: UserJwt,
) {
  // 1. Check template lockState
  // 2. Update config JSONB
  return this.templateBlocksService.updateConfig(templateId, blockId, dto.config, user.organizationId);
}
```

#### ❌ ADD: `DELETE /api/templates/:templateId/blocks/:blockId`
```typescript
@Delete(':blockId')
async detach(
  @Param('templateId') templateId: string,
  @Param('blockId') blockId: string,
  @CurrentUser() user: UserJwt,
) {
  // 1. Check template lockState
  // 2. Delete TemplateBlock row
  return this.templateBlocksService.detach(templateId, blockId, user.organizationId);
}
```

## Deprecation Plan

### Legacy TemplateController (`/templates`)

**Endpoints to Deprecate:**
- `GET /templates` → Use `GET /api/templates`
- `GET /templates/:id` → Use `GET /api/templates/:id`
- `GET /templates/blocks/all` → Use `GET /api/lego-blocks`
- `GET /templates/blocks/type/:type` → Use `GET /api/lego-blocks?type=:type`
- `POST /templates/create-project` → Use `POST /api/templates/:id/instantiate`
- `POST /templates/projects/:projectId/blocks/:blockId` → Remove (not in v1 scope)

**Deprecation Steps:**
1. Add deprecation warnings to all endpoints
2. Add redirects/logging to track usage
3. Remove after 2 releases

### AdminTemplatesController (`/admin/templates`)

**Decision:** Consolidate into `/api/templates` with role guards

**Endpoints to Consolidate:**
- `GET /admin/templates` → `GET /api/templates` (add admin filter if needed)
- `GET /admin/templates/:id` → `GET /api/templates/:id` (same)
- `POST /admin/templates` → `POST /api/templates` (add role guard)
- `PATCH /admin/templates/:id` → `PATCH /api/templates/:id` (add role guard)
- `POST /admin/templates/:id/apply` → `POST /api/templates/:id/instantiate` (same)
- `DELETE /admin/templates/:id` → `DELETE /api/templates/:id` (add role guard)

**Action:** Add `@RequireOrgRole('admin')` to write endpoints in TemplatesController

## Guardrails Implementation

### Lock Enforcement Guard

**Create:** `zephix-backend/src/modules/templates/guards/template-lock.guard.ts`

```typescript
@Injectable()
export class TemplateLockGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const templateId = request.params.id || request.params.templateId;

    if (!templateId) return true;

    const template = await this.templatesService.findOne(templateId, request.user.organizationId);

    if (template.lockState === 'LOCKED') {
      throw new ForbiddenException('Template is locked and cannot be modified');
    }

    return true;
  }
}
```

**Apply to:**
- `PUT /api/templates/:id`
- `PATCH /api/templates/:id`
- `POST /api/templates/:id/clone`
- `POST /api/templates/:id/publish`
- `POST /api/templates/:id/archive`
- `POST /api/templates/:id/default`
- `POST /api/templates/:id/blocks` (attach)
- `PATCH /api/templates/:id/blocks/reorder`
- `PATCH /api/templates/:id/blocks/:blockId/config`
- `DELETE /api/templates/:id/blocks/:blockId`

### Unique Default Enforcement

**In Service:**
```typescript
async setDefault(templateId: string, organizationId: string): Promise<Template> {
  return this.dataSource.transaction(async (manager) => {
    // 1. Set all org templates isDefault = false
    await manager.update(Template,
      { organizationId, isDefault: true },
      { isDefault: false }
    );

    // 2. Set this template isDefault = true
    await manager.update(Template,
      { id: templateId, organizationId },
      { isDefault: true }
    );

    // Partial unique index enforces constraint
    return this.findOne(templateId, organizationId);
  });
}
```

### Role Gate on minRoleToAttach

**In Service:**
```typescript
async attach(templateId: string, dto: AttachBlockDto, organizationId: string, user: UserJwt): Promise<TemplateBlock> {
  const block = await this.legoBlocksService.findOne(dto.blockId, organizationId);

  if (block.minRoleToAttach) {
    const hasRole = this.hasRequiredRole(user.role, block.minRoleToAttach);
    if (!hasRole) {
      throw new ForbiddenException(
        `Role ${block.minRoleToAttach} required to attach this block`
      );
    }
  }

  // Create TemplateBlock...
}
```

### Snapshot Required

**In Project Creation:**
```typescript
async createProjectFromTemplate(templateId: string, dto: CreateProjectDto, organizationId: string, userId: string) {
  const template = await this.templatesService.findOne(templateId, organizationId);
  const blocks = await this.templateBlocksService.findByTemplate(templateId, organizationId);

  // Create snapshot
  const templateSnapshot = {
    templateId: template.id,
    templateVersion: template.version,
    blocks: blocks.map(b => ({
      blockId: b.blockId,
      enabled: b.enabled,
      displayOrder: b.displayOrder,
      config: b.config,
    })),
    locked: template.lockState === 'LOCKED',
  };

  // Create project with snapshot
  return this.projectsService.create({
    ...dto,
    templateId: template.id,
    templateVersion: template.version,
    templateLocked: template.lockState === 'LOCKED',
    templateSnapshot,
  }, organizationId, userId);
}
```

## Summary

### Keep (7 endpoints)
- `GET /api/templates` (enhance)
- `GET /api/templates/:id` (enhance)
- `POST /api/templates` (enhance)
- `PUT /api/templates/:id` (add lock guard)
- `PATCH /api/templates/:id` (add lock guard)
- `DELETE /api/templates/:id` (change to archivedAt)
- `POST /api/templates/:id/instantiate` (add snapshot)

### Add (10 endpoints)
- `GET /api/templates/default`
- `POST /api/templates/:id/clone`
- `POST /api/templates/:id/publish`
- `POST /api/templates/:id/archive`
- `POST /api/templates/:id/default`
- `POST /api/templates/:id/lock`
- `POST /api/templates/:id/unlock`
- `GET /api/lego-blocks`
- `POST /api/templates/:id/blocks`
- `PATCH /api/templates/:id/blocks/reorder`
- `PATCH /api/templates/:id/blocks/:blockId/config`
- `DELETE /api/templates/:id/blocks/:blockId`

### Deprecate (6 endpoints)
- `GET /templates` (legacy)
- `GET /templates/:id` (legacy)
- `GET /templates/blocks/all` (legacy)
- `GET /templates/blocks/type/:type` (legacy)
- `POST /templates/create-project` (legacy)
- `POST /templates/projects/:projectId/blocks/:blockId` (legacy, remove)

### Consolidate (6 endpoints)
- All `/admin/templates` endpoints → `/api/templates` with role guards




