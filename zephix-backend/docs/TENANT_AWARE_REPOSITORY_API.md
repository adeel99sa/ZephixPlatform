# TenantAwareRepository Public API

## Overview

`TenantAwareRepository` enforces tenant isolation at the Data Access Layer. All methods support **explicit `orgId` parameter** (preferred) or fall back to AsyncLocalStorage context (legacy).

## Priority Order

1. **Explicit `orgId` parameter** (preferred) - Always use this in new code
2. **AsyncLocalStorage context** (legacy) - Fallback for backward compatibility
3. **Throw error** - If neither is available

## Read Operations

### `find(orgId, options?)` or `find(options?)`

Find multiple entities with automatic tenant scoping.

```typescript
// ✅ Preferred: Explicit orgId
const items = await repo.find(organizationId, {
  where: { status: 'active' },
  relations: ['project'],
});

// ⚠️ Legacy: Uses ALS context
const items = await repo.find({
  where: { status: 'active' },
});
```

**Returns:** `Promise<T[]>`

---

### `findOne(orgId, options?)` or `findOne(options?)`

Find one entity with automatic tenant scoping.

```typescript
// ✅ Preferred: Explicit orgId
const item = await repo.findOne(organizationId, {
  where: { id },
  relations: ['workspace'],
});

// ⚠️ Legacy: Uses ALS context
const item = await repo.findOne({ where: { id } });
```

**Returns:** `Promise<T | null>`

---

### `findAndCount(orgId, options?)` or `findAndCount(options?)`

Find entities and count total with automatic tenant scoping.

```typescript
// ✅ Preferred: Explicit orgId
const [items, total] = await repo.findAndCount(organizationId, {
  where: { status: 'active' },
  take: 10,
  skip: 0,
});
```

**Returns:** `Promise<[T[], number]>`

---

### `count(orgId, options?)` or `count(options?)`

Count entities with automatic tenant scoping.

```typescript
// ✅ Preferred: Explicit orgId
const total = await repo.count(organizationId, {
  where: { status: 'active' },
});
```

**Returns:** `Promise<number>`

---

### `findByIds(ids, orgId?)`

Find entities by IDs with automatic tenant scoping.

```typescript
// ✅ Preferred: Explicit orgId
const items = await repo.findByIds(['id1', 'id2'], organizationId);

// ⚠️ Legacy: Uses ALS context
const items = await repo.findByIds(['id1', 'id2']);
```

**Returns:** `Promise<T[]>`

---

### `findOneBy(where)`

Find one entity by where condition (convenience method).

```typescript
// Note: This uses findOne internally, which requires orgId or ALS context
const item = await repo.findOneBy({ id: 'some-id' });
```

**Returns:** `Promise<T | null>`

---

### `qb(alias?, orgId?)`

Create a query builder with automatic tenant scoping.

```typescript
// ✅ Preferred: Explicit orgId
const items = await repo.qb('item', organizationId)
  .where('item.status = :status', { status: 'active' })
  .getMany();

// ⚠️ Legacy: Uses ALS context
const items = await repo.qb('item')
  .where('item.status = :status', { status: 'active' })
  .getMany();
```

**Returns:** `SelectQueryBuilder<T>`

---

## Write Operations

### `save(orgId, entity)` or `save(entity)`

Save entity. Validates tenant context exists but doesn't filter.

```typescript
// ✅ Preferred: Explicit orgId
const saved = await repo.save(organizationId, {
  id: 'some-id',
  title: 'New Item',
  organizationId, // Should match the orgId parameter
});

// ⚠️ Legacy: Uses ALS context
const saved = await repo.save({
  id: 'some-id',
  title: 'New Item',
  organizationId, // Should be set by caller
});
```

**Returns:** `Promise<T>`

---

### `saveMany(entities)`

Save multiple entities. Uses ALS context for validation.

```typescript
const saved = await repo.saveMany([
  { title: 'Item 1', organizationId },
  { title: 'Item 2', organizationId },
]);
```

**Returns:** `Promise<T[]>`

---

### `create(entityLike?)`

Create entity instance (doesn't save). Uses ALS context for validation.

```typescript
const entity = repo.create({
  title: 'New Item',
  organizationId,
});
```

**Returns:** `T`

---

### `update(criteria, partialEntity)`

Update entities. **WARNING:** Does NOT automatically scope by tenant for string/number IDs.

```typescript
// ✅ Safe: Where object (automatically scoped)
await repo.update(
  { id: 'some-id', organizationId }, // Include orgId in criteria
  { title: 'Updated' },
);

// ⚠️ Unsafe: String ID (not automatically scoped)
await repo.update('some-id', { title: 'Updated' }); // Bypasses tenant filter!
```

**Returns:** `Promise<UpdateResult>`

---

### `delete(criteria)`

Delete entities. **WARNING:** Does NOT automatically scope by tenant for string/number IDs.

```typescript
// ✅ Safe: Where object (automatically scoped)
await repo.delete({ id: 'some-id', organizationId });

// ⚠️ Unsafe: String ID (not automatically scoped)
await repo.delete('some-id'); // Bypasses tenant filter!
```

**Returns:** `Promise<DeleteResult>`

---

### `softDelete(criteria)`

Soft delete entities with automatic tenant scoping.

```typescript
// ✅ Safe: Automatically scoped
await repo.softDelete({ id: 'some-id' }); // orgId added automatically
```

**Returns:** `Promise<UpdateResult>`

---

### `restore(criteria)`

Restore soft-deleted entities with automatic tenant scoping.

```typescript
// ✅ Safe: Automatically scoped
await repo.restore({ id: 'some-id' }); // orgId added automatically
```

**Returns:** `Promise<UpdateResult>`

---

## Utility Methods

### `exists(options?)`

Check if entity exists with automatic tenant scoping.

```typescript
const exists = await repo.exists({
  where: { id: 'some-id' },
});
```

**Returns:** `Promise<boolean>`

---

### `preload(entityLike)`

Preload entity relations. Uses ALS context.

```typescript
const entity = await repo.preload({
  id: 'some-id',
  title: 'Updated Title',
});
```

**Returns:** `Promise<T | null>`

---

## Best Practices

1. **Always pass `orgId` explicitly** in new code
2. **Use where objects** for `update()` and `delete()` to ensure tenant scoping
3. **Avoid string/number IDs** in `update()` and `delete()` - use where objects instead
4. **Use `qb()` for complex queries** that need explicit tenant scoping
5. **Never use `getRepository()`** in feature code - it bypasses tenant scoping

## Migration Example

**Before (legacy):**
```typescript
async list() {
  return this.repo.find({ where: { active: true } });
}
```

**After (explicit):**
```typescript
async list(organizationId: string) {
  return this.repo.find(organizationId, { where: { active: true } });
}
```
