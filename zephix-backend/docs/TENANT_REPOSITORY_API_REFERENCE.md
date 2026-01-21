# TenantAwareRepository Public API Reference

## Overview

All methods support **explicit `orgId` parameter** (preferred) or fall back to AsyncLocalStorage context (legacy).

**Priority:** Explicit orgId > ALS context > Throw error

---

## Read Operations

### `find(orgId, options?)` or `find(options?)`

```typescript
// ✅ Preferred
async find(orgId: string, options?: FindManyOptions<T>): Promise<T[]>

// ⚠️ Legacy (uses ALS)
async find(options?: FindManyOptions<T>): Promise<T[]>
```

**Example:**
```typescript
const items = await repo.find(organizationId, {
  where: { status: 'active' },
  relations: ['project'],
});
```

---

### `findOne(orgId, options?)` or `findOne(options?)`

```typescript
// ✅ Preferred
async findOne(orgId: string, options?: FindOneOptions<T>): Promise<T | null>

// ⚠️ Legacy (uses ALS)
async findOne(options?: FindOneOptions<T>): Promise<T | null>
```

**Example:**
```typescript
const item = await repo.findOne(organizationId, {
  where: { id },
  relations: ['workspace'],
});
```

---

### `findAndCount(orgId, options?)` or `findAndCount(options?)`

```typescript
// ✅ Preferred
async findAndCount(orgId: string, options?: FindManyOptions<T>): Promise<[T[], number]>

// ⚠️ Legacy (uses ALS)
async findAndCount(options?: FindManyOptions<T>): Promise<[T[], number]>
```

---

### `count(orgId, options?)` or `count(options?)`

```typescript
// ✅ Preferred
async count(orgId: string, options?: FindManyOptions<T>): Promise<number>

// ⚠️ Legacy (uses ALS)
async count(options?: FindManyOptions<T>): Promise<number>
```

---

### `findByIds(ids, orgId?)`

```typescript
async findByIds(ids: any[], orgId?: string): Promise<T[]>
```

---

### `findOneBy(where)`

```typescript
async findOneBy(where: FindOptionsWhere<T>): Promise<T | null>
```
**Note:** Uses `findOne` internally, requires orgId or ALS context.

---

### `qb(alias?, orgId?)`

```typescript
qb(alias?: string, orgId?: string): SelectQueryBuilder<T>
```

**Example:**
```typescript
const items = await repo.qb('item', organizationId)
  .where('item.status = :status', { status: 'active' })
  .getMany();
```

---

## Write Operations

### `save(orgId, entity)` or `save(entity)`

```typescript
// ✅ Preferred
async save(orgId: string, entity: DeepPartial<T>): Promise<T>

// ⚠️ Legacy (uses ALS)
async save(entity: DeepPartial<T>): Promise<T>
```

**Example:**
```typescript
const saved = await repo.save(organizationId, {
  id: 'some-id',
  title: 'New Item',
  organizationId, // Should match the orgId parameter
});
```

---

### `saveMany(entities)`

```typescript
async saveMany(entities: DeepPartial<T>[]): Promise<T[]>
```
**Note:** Still uses ALS context (not yet updated to accept orgId).

---

### `create(entityLike?)`

```typescript
create(entityLike?: DeepPartial<T>): T
```
**Note:** Still uses ALS context (not yet updated to accept orgId).

---

### `update(criteria, partialEntity)`

⚠️ **WARNING:** Does NOT automatically scope by tenant for string/number IDs.

```typescript
async update(
  criteria: string | string[] | number | number[] | FindOptionsWhere<T>,
  partialEntity: Partial<T>
): Promise<UpdateResult>
```

**Safe usage:**
```typescript
// ✅ Safe: Where object (automatically scoped)
await repo.update({ id: 'some-id', organizationId }, { title: 'Updated' });
```

**Unsafe usage:**
```typescript
// ❌ Unsafe: String ID (bypasses tenant filter)
await repo.update('some-id', { title: 'Updated' });
```

---

### `delete(criteria)`

⚠️ **WARNING:** Does NOT automatically scope by tenant for string/number IDs.

```typescript
async delete(
  criteria: string | string[] | number | number[] | FindOptionsWhere<T>
): Promise<DeleteResult>
```

**Safe usage:**
```typescript
// ✅ Safe: Where object (automatically scoped)
await repo.delete({ id: 'some-id', organizationId });
```

**Unsafe usage:**
```typescript
// ❌ Unsafe: String ID (bypasses tenant filter)
await repo.delete('some-id');
```

---

### `softDelete(criteria)`

✅ **Safe:** Automatically scoped by tenant.

```typescript
async softDelete(
  criteria: string | string[] | number | number[] | FindOptionsWhere<T>
): Promise<UpdateResult>
```

---

### `restore(criteria)`

✅ **Safe:** Automatically scoped by tenant.

```typescript
async restore(
  criteria: string | string[] | number | number[] | FindOptionsWhere<T>
): Promise<UpdateResult>
```

---

## Utility Methods

### `exists(options?)`

```typescript
async exists(options?: FindManyOptions<T>): Promise<boolean>
```
**Note:** Uses ALS context (not yet updated).

---

### `preload(entityLike)`

```typescript
async preload(entityLike: DeepPartial<T>): Promise<T | null>
```
**Note:** Uses ALS context.

---

## Known Limitations & Footguns

1. **`update()` and `delete()` with string/number IDs** - Not automatically scoped
   - **Risk:** Can update/delete entities from other orgs
   - **Fix:** Always use where objects: `update({ id, organizationId }, data)`

2. **`saveMany()`** - Still uses ALS context
   - **Risk:** Fails if ALS context is lost
   - **Fix:** Pass orgId explicitly in entity objects (future: accept orgId parameter)

3. **`create()`** - Still uses ALS context
   - **Risk:** Fails if ALS context is lost
   - **Fix:** Set organizationId in entityLike (future: accept orgId parameter)

4. **`exists()`** - Uses ALS context
   - **Risk:** Fails if ALS context is lost
   - **Fix:** Use `count(orgId, options) > 0` instead

5. **`findOneBy()`** - Uses `findOne` internally
   - **Risk:** Requires orgId or ALS context
   - **Fix:** Pass orgId explicitly or ensure ALS context

6. **`getRepository()`** - Bypasses tenant scoping
   - **Risk:** Can access data from other orgs
   - **Fix:** Never use in feature code

---

## Migration Checklist

When updating code to use explicit orgId:

- [ ] Update controller to use `getOrgIdOrThrow(req)`
- [ ] Update service signature to accept `organizationId: string` as first parameter
- [ ] Update repository calls to pass `orgId` as first parameter
- [ ] Remove `runWithTenant` wrappers (no longer needed)
- [ ] Update `update()` and `delete()` to use where objects instead of string IDs
- [ ] Test with multi-tenant data to verify isolation
