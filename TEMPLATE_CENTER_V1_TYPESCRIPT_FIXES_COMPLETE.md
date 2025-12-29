# Template Center v1 - TypeScript Fixes Complete

## Summary

Fixed the last 2 TypeScript errors with explicit types as requested.

## Fix 1: ProjectsService Return Type Inference ✅

**File:** `zephix-backend/src/modules/projects/services/projects.service.ts`

**Changes:**
1. Added explicit type `ProjectTemplateSnapshotV1` for the snapshot structure
2. Typed the snapshot variable: `const snapshot: ProjectTemplateSnapshotV1 | null`
3. Changed project creation from `manager.getRepository(Project).create()` to direct object creation with `Partial<Project>` type
4. Added explicit return type assertion: `return saved as unknown as Project`
5. Typed transaction callback: `async (manager): Promise<Project> =>`

**Key Fix:**
```typescript
type ProjectTemplateSnapshotV1 = {
  templateId: string;
  templateVersion: number;
  blocks: Array<{
    blockId: string;
    enabled: boolean;
    displayOrder: number;
    config: Record<string, unknown>;
    locked: boolean;
  }>;
  locked: boolean;
};

async createWithTemplateSnapshotV1(req: Request, input: CreateProjectV1Input): Promise<Project> {
  // ...
  return this.dataSource.transaction<Project>(async (manager): Promise<Project> => {
    // ...
    const project: Partial<Project> = { /* ... */ };
    const saved = await manager.getRepository(Project).save(project);
    return saved as unknown as Project;
  });
}
```

## Fix 2: TemplateBlock Array Type Inference ✅

**File:** `zephix-backend/src/modules/templates/services/templates.service.ts`

**Changes:**
1. Changed `copies` array type from `TemplateBlock[]` to `Partial<TemplateBlock>[]`
2. Changed from using `manager.getRepository(TemplateBlock).create()` to direct object creation
3. Added type assertion when saving: `save(copies as TemplateBlock[])`

**Key Fix:**
```typescript
if (existingBlocks.length > 0) {
  const copies: Partial<TemplateBlock>[] = existingBlocks.map((b) => ({
    organizationId: orgId,
    templateId: (saved as any).id,
    blockId: b.blockId,
    enabled: b.enabled,
    displayOrder: b.displayOrder,
    config: b.config,
    locked: b.locked,
  }));
  await manager.getRepository(TemplateBlock).save(copies as TemplateBlock[]);
}
```

## Build Status ✅

```bash
npm run build
# ✅ Success - No TypeScript errors
```

## Verification

Both fixes use explicit types instead of relying on inference:
- ✅ `ProjectTemplateSnapshotV1` type explicitly defined
- ✅ `Partial<Project>` type for project creation
- ✅ `Partial<TemplateBlock>[]` type for copies array
- ✅ Explicit return type `Promise<Project>` on transaction callback
- ✅ Type assertions where needed (`as unknown as Project`, `as TemplateBlock[]`)

All TypeScript errors resolved. Ready for migration execution and testing.



