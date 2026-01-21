# TenantAwareRepository Public API

## Core Read Operations

### `find(orgId, options?)` or `find(options?)`
Find multiple entities with automatic tenant scoping.

**Preferred signature:**
```typescript
find(orgId: string, options?: FindManyOptions<T>): Promise<T[]>
```

**Legacy signature (uses ALS context):**
```typescript
find(options?: FindManyOptions<T>): Promise<T[]>
```

---

### `findOne(orgId, options?)` or `findOne(options?)`
Find one entity with automatic tenant scoping.

**Preferred signature:**
```typescript
findOne(orgId: string, options?: FindOneOptions<T>): Promise<T | null>
```

**Legacy signature (uses ALS context):**
```typescript
findOne(options?: FindOneOptions<T>): Promise<T | null>
```

---

### `findAndCount(orgId, options?)` or `findAndCount(options?)`
Find entities and count total with automatic tenant scoping.

**Preferred signature:**
```typescript
findAndCount(orgId: string, options?: FindManyOptions<T>): Promise<[T[], number]>
```

**Legacy signature (uses ALS context):**
```typescript
findAndCount(options?: FindManyOptions<T>): Promise<[T[], number]>
```

---

### `count(orgId, options?)` or `count(options?)`
Count entities with automatic tenant scoping.

**Preferred signature:**
```typescript
count(orgId: string, options?: FindManyOptions<T>): Promise<number>
```

**Legacy signature (uses ALS context):**
```typescript
count(options?: FindManyOptions<T>): Promise<number>
```

---

### `findByIds(ids, orgId?)`
Find entities by IDs with automatic tenant scoping.

```typescript
findByIds(ids: any[], orgId?: string): Promise<T[]>
```

---

### `findOneBy(where)`
Find one entity by where condition (convenience method).

```typescript
findOneBy(where: FindOptionsWhere<T>): Promise<T | null>
```
**Note:** Uses `findOne` internally, which requires orgId or ALS context.

---

### `qb(alias?, orgId?)`
Create a query builder with automatic tenant scoping.

```typescript
qb(alias?: string, orgId?: string): SelectQueryBuilder<T>
```

---

## Write Operations

### `save(orgId, entity)` or `save(entity)`
Save entity. Validates tenant context exists but doesn't filter.

**Preferred signature:**
```typescript
save(orgId: string, entity: DeepPartial<T>): Promise<T>
```

**Legacy signature (uses ALS context):**
```typescript
save(entity: DeepPartial<T>): Promise<T>
```

---

### `saveMany(entities)`
Save multiple entities. **Still uses ALS context** (not yet updated).

```typescript
saveMany(entities: DeepPartial<T>[]): Promise<T[]>
```

---

### `create(entityLike?)`
Create entity instance (doesn't save). **Still uses ALS context** (not yet updated).

```typescript
create(entityLike?: DeepPartial<T>): T
```

---

### `update(criteria, partialEntity)`
⚠️ **WARNING:** Does NOT automatically scope by tenant for string/number IDs.

```typescript
update(
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
delete(
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
softDelete(
  criteria: string | string[] | number | number[] | FindOptionsWhere<T>
): Promise<UpdateResult>
```

---

### `restore(criteria)`
✅ **Safe:** Automatically scoped by tenant.

```typescript
restore(
  criteria: string | string[] | number | number[] | FindOptionsWhere<T>
): Promise<UpdateResult>
```

---

## Utility Methods

### `exists(options?)`
Check if entity exists with automatic tenant scoping.

```typescript
exists(options?: FindManyOptions<T>): Promise<boolean>
```

---

### `preload(entityLike)`
Preload entity relations. Uses ALS context.

```typescript
preload(entityLike: DeepPartial<T>): Promise<T | null>
```

---

## Priority Resolution

1. **Explicit `orgId` parameter** (preferred) - Always wins
2. **AsyncLocalStorage context** (legacy) - Fallback
3. **Throw error** - If neither available

## Known Limitations

1. **`update()` and `delete()` with string/number IDs** - Not automatically scoped
   - **Fix:** Use where objects: `update({ id, organizationId }, data)`

2. **`saveMany()`** - Still uses ALS context (not yet updated)
   - **Fix:** Pass orgId explicitly in entity objects

3. **`create()`** - Still uses ALS context (not yet updated)
   - **Fix:** Set organizationId in entityLike

4. **`exists()`** - Uses ALS context (not yet updated)
   - **Fix:** Use `count(orgId, options) > 0` instead

## Best Practices

✅ **DO:**
- Always pass `orgId` as first parameter in new code
- Use where objects for `update()` and `delete()`
- Use `qb()` for complex queries

❌ **DON'T:**
- Rely on ALS context in new code
- Use string/number IDs in `update()` or `delete()` without orgId in where clause
- Use `getRepository()` in feature code (bypasses tenant scoping)
