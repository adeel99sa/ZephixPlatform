# Template Center v1 - Controllers Implementation Complete

## Files Created

### Guards
1. ✅ `zephix-backend/src/modules/templates/guards/template-lock.guard.ts`
   - Rejects writes when `lockState = 'LOCKED'`
   - Used by: clone, block attach, block config, reorder

2. ✅ `zephix-backend/src/modules/templates/guards/block-role.guard.ts`
   - Compares user role with `minRoleToAttach`
   - Used by: block attach

### DTOs
3. ✅ `zephix-backend/src/modules/templates/dto/template.dto.ts`
   - `TemplateListQueryDto` - filters for list endpoint
   - `CreateTemplateDto` - create template
   - `UpdateTemplateDto` - update template
   - `CloneTemplateDto` - clone template
   - `AttachBlockDto` - attach block
   - `ReorderBlocksDto` - reorder blocks
   - `PatchBlockConfigDto` - update block config

### Controllers

4. ✅ **TemplatesController** (Updated)
   - `GET /api/templates` - Updated to use `listV1(q, req)`
   - `GET /api/templates/:id` - Updated to use `getV1(id, req)`
   - `POST /api/templates` - Updated to use `createV1(dto, req)`

5. ✅ **TemplateActionsController** (New)
   - `POST /api/templates/:id/clone` - Uses `TemplateLockGuard`
   - `POST /api/templates/:id/default` - Admin only
   - `POST /api/templates/:id/lock`
   - `POST /api/templates/:id/unlock` - Admin only
   - `POST /api/templates/:id/archive`

6. ✅ **LegoBlocksController** (New)
   - `GET /api/lego-blocks` - List lego blocks catalog

7. ✅ **TemplateBlocksController** (New)
   - `POST /api/templates/:id/blocks` - Uses `TemplateLockGuard` + `BlockRoleGuard`
   - `PATCH /api/templates/:id/blocks/reorder` - Uses `TemplateLockGuard`
   - `PATCH /api/templates/:id/blocks/:blockId/config` - Uses `TemplateLockGuard`
   - `DELETE /api/templates/:id/blocks/:blockId` - Uses `TemplateLockGuard`

### Projects Controller Update
8. ✅ **ProjectsController** (Updated)
   - `POST /projects` - Updated to call `createWithTemplateSnapshotV1(dto, orgId, userId, req)`
   - `CreateProjectDto` - Added `templateId?: string` field

### Module Wiring
9. ✅ **TemplateModule** (Updated)
   - Added `Template` entity to `TypeOrmModule.forFeature`
   - Added `TemplateBlock` entity to `TypeOrmModule.forFeature` (entity file must be created)
   - Added new controllers: `TemplateActionsController`, `TemplateBlocksController`, `LegoBlocksController`
   - Added new providers: `TemplateBlocksService`, `LegoBlocksService`, `TemplateLockGuard`, `BlockRoleGuard`
   - Added `TenantAwareRepository` providers for `Template`, `TemplateBlock`, `LegoBlock`

## Service Contracts Required

The following service methods must be implemented:

### TemplatesService
- `listV1(q: TemplateListQueryDto, req: Request)`
- `getV1(id: string, req: Request)`
- `createV1(dto: CreateTemplateDto, req: Request)`
- `cloneV1(id: string, dto: CloneTemplateDto, req: Request)`
- `setDefaultV1(id: string, req: Request)`
- `lockV1(id: string, req: Request)`
- `unlockV1(id: string, req: Request)`
- `archiveV1(id: string, req: Request)`
- `getByIdForGuard(id: string, req: Request)` - Returns template with lockState

### TemplateBlocksService
- `attachV1(templateId: string, dto: AttachBlockDto, req: Request)`
- `reorderV1(templateId: string, dto: ReorderBlocksDto, req: Request)`
- `patchConfigV1(templateId: string, blockId: string, dto: PatchBlockConfigDto, req: Request)`
- `detachV1(templateId: string, blockId: string, req: Request)`

### LegoBlocksService
- `listV1(filters: { type?, methodology?, isActive? }, req: Request)`
- `getByIdForGuard(blockId: string, req: Request)` - Returns block with minRoleToAttach
- `userMeetsMinRole(user: any, minRole: string): boolean`

### ProjectsService
- `createWithTemplateSnapshotV1(dto: CreateProjectDto, organizationId: string, userId: string, req: Request)`
  - If `dto.templateId` provided:
    - Load template and template blocks
    - Create `templateSnapshot` JSONB
    - Set `templateVersion`, `templateLocked`, `templateId`

## Next Steps

1. ✅ Controllers implemented
2. ⏭️ **Services** - Implement all service methods listed above
3. ⏭️ Create `TemplateBlock` entity file (if not exists)
4. ⏭️ Ensure `Template` entity has v1 fields added
5. ⏭️ Ensure `LegoBlock` entity has v1 fields added
6. ⏭️ Ensure `Project` entity has template snapshot fields added

## Notes

- All controllers use `@Req() req: Request` pattern for consistency
- Guards are applied at method level where needed
- Admin-only endpoints use `@RequireOrgRole('admin')` decorator
- Legacy controllers (`TemplateController`, `AdminTemplatesController`) are kept but marked deprecated
- All new endpoints follow `/api/templates` or `/api/lego-blocks` pattern



