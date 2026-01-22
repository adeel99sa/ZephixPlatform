# TenantAwareRepository Final API

## Safe Methods (Require orgId)

All methods require `orgId` as the **first parameter**.

### Read Operations

```typescript
find(orgId: string, options?: FindManyOptions<T>): Promise<T[]>
findOne(orgId: string, options?: FindOneOptions<T>): Promise<T | null>
findAndCount(orgId: string, options?: FindManyOptions<T>): Promise<[T[], number]>
count(orgId: string, options?: FindManyOptions<T>): Promise<number>
findByIds(orgId: string, ids: any[]): Promise<T[]>
qb(orgId: string, alias?: string): SelectQueryBuilder<T>
```

### Write Operations

```typescript
save(orgId: string, entity: DeepPartial<T>): Promise<T>
saveMany(orgId: string, entities: DeepPartial<T>[]): Promise<T[]>
create(orgId: string, entityLike?: DeepPartial<T>): T
update(orgId: string, criteria: string | FindOptionsWhere<T>, partialEntity: Partial<T>): Promise<UpdateResult>
delete(orgId: string, criteria: string | FindOptionsWhere<T>): Promise<DeleteResult>
softDelete(criteria: string | FindOptionsWhere<T>): Promise<UpdateResult>  // Uses ALS for orgId
restore(criteria: string | FindOptionsWhere<T>): Promise<UpdateResult>  // Uses ALS for orgId
```

## Update/Delete Scoping Rules

### `update(orgId, criteria, partialEntity)`

**String/number ID:**
- Automatically rewritten to `{ id: criteria, organizationId: orgId }`
- ✅ Safe: Always scoped

**Where object:**
- Merges `organizationId: orgId` unless already present
- If different `organizationId` present, throws error
- ✅ Safe: Always scoped

### `delete(orgId, criteria)`

**String/number ID:**
- Automatically rewritten to `{ id: criteria, organizationId: orgId }`
- ✅ Safe: Always scoped

**Where object:**
- Merges `organizationId: orgId` unless already present
- If different `organizationId` present, throws error
- ✅ Safe: Always scoped

## Unsafe Methods (Blocked)

### `getUnsafeRepository()` (private)

- **Status:** Private method
- **Purpose:** Internal use only
- **Blocked:** Cannot be called from feature code

### `updateUnsafe()` / `deleteUnsafe()`

- **Status:** Deprecated, throws error
- **Purpose:** Migration period only
- **Blocked:** Always throws "blocked" error

## Migration Guide

### Before

```typescript
// ❌ Old API
const item = await repo.create({ name: 'Item', organizationId });
await repo.save(item);
await repo.update('id', { name: 'Updated' });
await repo.delete('id');
await repo.qb('item').getMany();
await repo.findByIds(['id1', 'id2']);
```

### After

```typescript
// ✅ New API
const item = await repo.create(orgId, { name: 'Item', organizationId });
await repo.save(orgId, item);
await repo.update(orgId, 'id', { name: 'Updated' });
await repo.delete(orgId, 'id');
await repo.qb(orgId, 'item').getMany();
await repo.findByIds(orgId, ['id1', 'id2']);
```

## CI Enforcement

The build fails if:
- `saveMany()` called without `orgId`
- `create()` called without `orgId`
- `update()` called without `orgId`
- `delete()` called without `orgId`
- `qb()` called without `orgId`
- `findByIds()` called without `orgId`

Test files are allowlisted.

## Tests

- ✅ Positive: All methods work with explicit `orgId`
- ✅ Negative: Missing `orgId` in token returns 403
- ✅ Isolation: Org A cannot see Org B data
- ✅ Unsafe ops: `updateUnsafe()` and `deleteUnsafe()` throw errors
