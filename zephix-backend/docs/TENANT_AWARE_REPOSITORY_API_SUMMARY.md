# TenantAwareRepository Public API Summary

## Core Methods (Explicit orgId Preferred)

### Read Operations

```typescript
// Find multiple entities
find(orgId: string, options?: FindManyOptions<T>): Promise<T[]>
// Legacy: find(options?) - uses ALS context

// Find one entity
findOne(orgId: string, options?: FindOneOptions<T>): Promise<T | null>
// Legacy: findOne(options?) - uses ALS context

// Find and count
findAndCount(orgId: string, options?: FindManyOptions<T>): Promise<[T[], number]>
// Legacy: findAndCount(options?) - uses ALS context

// Count entities
count(orgId: string, options?: FindManyOptions<T>): Promise<number>
// Legacy: count(options?) - uses ALS context

// Find by IDs
findByIds(ids: any[], orgId?: string): Promise<T[]>

// Query builder
qb(alias?: string, orgId?: string): SelectQueryBuilder<T>
```

### Write Operations

```typescript
// Save entity
save(orgId: string, entity: DeepPartial<T>): Promise<T>
// Legacy: save(entity) - uses ALS context

// Save multiple entities (uses ALS for validation)
saveMany(entities: DeepPartial<T>[]): Promise<T[]>

// Create entity instance (uses ALS for validation)
create(entityLike?: DeepPartial<T>): T
```

### Update/Delete Operations

```typescript
// ⚠️ WARNING: update() with string/number ID does NOT auto-scope
update(criteria: string | FindOptionsWhere<T>, partialEntity: Partial<T>): Promise<UpdateResult>
// ✅ Safe: Use where object with orgId included
// ❌ Unsafe: String ID bypasses tenant filter

// ⚠️ WARNING: delete() with string/number ID does NOT auto-scope
delete(criteria: string | FindOptionsWhere<T>): Promise<DeleteResult>
// ✅ Safe: Use where object with orgId included
// ❌ Unsafe: String ID bypasses tenant filter

// ✅ Safe: Automatically scoped
softDelete(criteria: string | FindOptionsWhere<T>): Promise<UpdateResult>

// ✅ Safe: Automatically scoped
restore(criteria: string | FindOptionsWhere<T>): Promise<UpdateResult>
```

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

## Best Practices

✅ **DO:**
- Always pass `orgId` as first parameter in new code
- Use where objects for `update()` and `delete()`
- Use `qb()` for complex queries

❌ **DON'T:**
- Rely on ALS context in new code
- Use string/number IDs in `update()` or `delete()` without orgId in where clause
- Use `getRepository()` in feature code (bypasses tenant scoping)
