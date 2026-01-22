# TenantAwareRepository hardening

## Purpose

- Require explicit orgId for all tenant-scoped repository operations.
- Remove AsyncLocalStorage dependency for tenant context.
- Prevent cross-tenant reads and writes caused by lost async context.

## What changed

### Repository API

#### Read operations
- `find(orgId, options?)`
- `findOne(orgId, options?)`
- `findAndCount(orgId, options?)`
- `count(orgId, options?)`
- `findByIds(orgId, ids)`
- `qb(orgId, alias?)`

#### Write operations
- `save(orgId, entity)`
- `saveMany(orgId, entities)`
- `create(orgId, entityLike)`
- `update(orgId, criteria, partialEntity)`
- `delete(orgId, criteria)`

#### Scoping rules
- `update` and `delete` auto-scope primitive IDs
  - `update(orgId, id, data)` becomes criteria `{ id, organizationId: orgId }`
  - `delete(orgId, id)` becomes criteria `{ id, organizationId: orgId }`
- If criteria is an object, repository merges `organizationId: orgId`.
- If criteria includes `organizationId` and it differs from `orgId`, repository throws.

### Safety mechanisms

- `getRepository` renamed to `getUnsafeRepository`.
- `getUnsafeRepository` is private.
- This blocks accidental bypass of tenant scoping.

### CI enforcement

- `scripts/check-tenant-repo-calls.sh`
  - Fails if TenantAwareRepository methods are called without orgId.
- `scripts/check-bad-rewrites.sh`
  - Fails if orgId was injected into normal Repository, EntityManager, QueryRunner, DataSource calls.
- Test files are allowlisted.

## Migration guide

### Before
```ts
const items = await repo.find({ where: { status: 'active' } })
await repo.save(entity)
await repo.update(id, { title: 'Updated' })
await repo.delete(id)
await repo.qb('item').getMany()
```

### After
```ts
const orgId = getOrgIdOrThrow(req)
const items = await repo.find(orgId, { where: { status: 'active' } })
await repo.save(orgId, entity)
await repo.update(orgId, id, { title: 'Updated' })
await repo.delete(orgId, id)
await repo.qb(orgId, 'item').getMany()
```

## Verification

```bash
cd zephix-backend && npm run build
./scripts/check-tenant-repo-calls.sh
./scripts/check-bad-rewrites.sh
```
