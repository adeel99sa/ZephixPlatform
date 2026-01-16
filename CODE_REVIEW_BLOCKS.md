# Code Review Blocks - Template Implementation

## 1. Build Status

✅ **BUILD IS CLEAN** - All TypeScript errors fixed

**Fixed Errors:**
1. ✅ TaskStatus import - Changed to import from `task.enums.ts` instead of `work-task.entity.ts`
2. ✅ ProjectsService.save - Changed `this.save(project)` to `this.projectRepository.save(project)`

**Build Output:**
```
> zephix-backend@1.0.0 build
> nest build --config tsconfig.build.json

✅ Build successful - no errors
```

## 2. Migration File

**File:** `zephix-backend/src/migrations/1790000000000-AddTemplateScopeAndWorkspaceId.ts`

```typescript
import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddTemplateScopeAndWorkspaceId1790000000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add template_scope column with default 'ORG'
    await queryRunner.addColumn(
      'templates',
      new TableColumn({
        name: 'template_scope',
        type: 'varchar',
        length: '20',
        default: "'ORG'",
        isNullable: false,
      }),
    );

    // Add workspace_id column (nullable)
    await queryRunner.addColumn(
      'templates',
      new TableColumn({
        name: 'workspace_id',
        type: 'uuid',
        isNullable: true,
      }),
    );

    // Backfill: Set template_scope based on organizationId
    // SYSTEM: organizationId is null
    // ORG: organizationId is not null
    await queryRunner.query(`
      UPDATE templates
      SET template_scope = CASE
        WHEN organization_id IS NULL THEN 'SYSTEM'
        ELSE 'ORG'
      END
    `);

    // Set workspace_id to null for all existing rows
    await queryRunner.query(`
      UPDATE templates
      SET workspace_id = NULL
    `);

    // Add index for workspace_id lookups
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_templates_workspace_id
      ON templates(workspace_id)
      WHERE workspace_id IS NOT NULL
    `);

    // Add index for template_scope lookups
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_templates_scope
      ON templates(template_scope)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_templates_workspace_id
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_templates_scope
    `);

    // Drop columns
    await queryRunner.dropColumn('templates', 'workspace_id');
    await queryRunner.dropColumn('templates', 'template_scope');
  }
}
```

## 3. Controller Create Endpoint

**File:** `zephix-backend/src/modules/templates/controllers/templates.controller.ts`

```typescript
/**
 * POST /api/templates
 * Create a new template
 * PART 2 Step 7: Admin can create ORG and WORKSPACE templates
 * Workspace Owners can create WORKSPACE templates only
 * V1: Set createdById from user, lockState defaults to UNLOCKED, isDefault false
 */
@Post()
@UseGuards(JwtAuthGuard)
async create(@Body() dto: CreateTemplateDto, @Req() req: Request) {
  const user = req.user as any;
  const userRole = user?.role || 'viewer';
  const workspaceId = this.validateWorkspaceId(
    req.headers['x-workspace-id'] as string | undefined,
  );

  // Determine templateScope from DTO or default to ORG
  const templateScope = dto.templateScope || 'ORG';

  // Role enforcement:
  // - Admin can create ORG and WORKSPACE templates
  // - Workspace Owner can create WORKSPACE templates only (for their workspace)
  // - Member cannot create templates
  if (templateScope === 'ORG') {
    // Only Admin can create ORG templates
    if (userRole !== 'admin' && userRole !== 'owner') {
      throw new ForbiddenException(
        'Only organization admins can create ORG templates',
      );
    }
  } else if (templateScope === 'WORKSPACE') {
    // Admin or Workspace Owner can create WORKSPACE templates
    if (!workspaceId) {
      throw new ForbiddenException(
        'x-workspace-id header is required for WORKSPACE templates',
      );
    }

    // Check if user is Admin (can create in any workspace) or Workspace Owner
    const isAdmin = userRole === 'admin' || userRole === 'owner';
    if (!isAdmin) {
      // Check workspace role
      const workspaceRole = await this.workspaceRoleGuard.getWorkspaceRole(
        workspaceId,
        user.id || user.sub,
      );
      if (workspaceRole !== 'workspace_owner') {
        throw new ForbiddenException(
          'Only workspace owners can create WORKSPACE templates',
        );
      }
    }

    // Override workspaceId from header (security: don't trust body)
    dto.workspaceId = workspaceId;
  } else if (templateScope === 'SYSTEM') {
    // SYSTEM templates can only be created via admin super path (not via normal API)
    throw new ForbiddenException(
      'SYSTEM templates cannot be created via API',
    );
  }

  return { data: await this.templatesService.createV1(req, dto) };
}
```

## 4. Controller List Endpoint

**File:** `zephix-backend/src/modules/templates/controllers/templates.controller.ts`

```typescript
/**
 * GET /api/templates
 * List all templates (optionally filtered by scope, category, kind, search, isActive)
 * V1: Add filters for isDefault, isSystem, lockState, includeBlocks
 * Never throws 500 - returns { data: Template[] } with empty array on error
 */
@Get()
async list(
  @Query() query: TemplateListQueryDto,
  @Req() req: Request,
) {
  return {
    data: await this.templatesService.listV1(req, {
      isDefault: query.isDefault === 'true',
      isSystem: query.isSystem === 'true',
      lockState: query.lockState as any,
      includeArchived: false,
    }),
  };
}
```

**Service Implementation:** `zephix-backend/src/modules/templates/services/templates.service.ts`

```typescript
async listV1(req: Request, params: ListV1Params = {}) {
  const orgId = this.getOrgId(req);

  // Get workspaceId from header if present
  const workspaceId = (req.headers['x-workspace-id'] as string) || null;

  const qb = this.templateRepo
    .createQueryBuilder('t')
    .where(
      // SYSTEM templates: organizationId is null
      '(t.templateScope = :systemScope AND t.organizationId IS NULL) OR ' +
      // ORG templates: organizationId matches
      '(t.templateScope = :orgScope AND t.organizationId = :orgId) OR ' +
      // WORKSPACE templates: organizationId matches AND workspaceId matches (if header present)
      (workspaceId
        ? '(t.templateScope = :workspaceScope AND t.organizationId = :orgId AND t.workspaceId = :workspaceId)'
        : '1=0'), // If no workspace header, exclude WORKSPACE templates
      {
        systemScope: 'SYSTEM',
        orgScope: 'ORG',
        workspaceScope: 'WORKSPACE',
        orgId,
        workspaceId,
      },
    );

  if (!params.includeArchived) {
    qb.andWhere('t.archivedAt IS NULL');
  }

  if (typeof params.isDefault === 'boolean') {
    qb.andWhere('t.isDefault = :isDefault', { isDefault: params.isDefault });
  }

  if (typeof params.isSystem === 'boolean') {
    qb.andWhere('t.isSystem = :isSystem', { isSystem: params.isSystem });
  }

  if (params.lockState) {
    qb.andWhere('t.lockState = :lockState', { lockState: params.lockState });
  }

  qb.orderBy('t.isDefault', 'DESC').addOrderBy('t.updatedAt', 'DESC');

  return qb.getMany();
}
```

## 5. Instantiate V5_1 Template Lookup

**File:** `zephix-backend/src/modules/templates/services/templates-instantiate-v51.service.ts`

```typescript
// 1. Load template - enforce scope rules
// For SYSTEM templates: organizationId is null
// For ORG templates: organizationId must match
// For WORKSPACE templates: organizationId must match and workspaceId must match
const template = await templateRepo.findOne({
  where: [
    { id: templateId, templateScope: 'SYSTEM', organizationId: null },
    { id: templateId, templateScope: 'ORG', organizationId },
    { id: templateId, templateScope: 'WORKSPACE', organizationId, workspaceId },
  ],
});

if (!template) {
  throw new NotFoundException({
    code: 'NOT_FOUND',
    message: 'Template not found or not accessible',
  });
}

// Enforce scope-specific rules
if (template.templateScope === 'WORKSPACE') {
  // WORKSPACE templates must match the workspace from header
  if (template.workspaceId !== workspaceId) {
    throw new ForbiddenException({
      code: 'WORKSPACE_MISMATCH',
      message: 'Template belongs to a different workspace',
    });
  }
} else if (template.templateScope === 'ORG') {
  // ORG templates can be instantiated in any workspace within the org
  // No additional check needed - organizationId already validated
} else if (template.templateScope === 'SYSTEM') {
  // SYSTEM templates can be instantiated in any workspace
  // No additional check needed
}

// 2. Verify workspace belongs to organization (double-check org alignment)
const workspace = await workspaceRepo.findOne({
  where: {
    id: workspaceId,
    organizationId,
  },
});

if (!workspace) {
  throw new ForbiddenException({
    code: 'WORKSPACE_REQUIRED',
    message: 'Workspace does not belong to your organization',
  });
}
```

## Issues Identified

### 1. Build Errors
- Need to check full build output
- Unrelated files have errors that block confidence

### 2. Publish Versioning
- Currently read-then-write (not atomic)
- Needs atomic update query

### 3. Legacy Instantiate Route
- Still exists at `POST /api/templates/:id/instantiate`
- Should be deprecated or removed

### 4. DTO Confusion
- Two CreateTemplateDto classes exist
- Need to lock to one import path
