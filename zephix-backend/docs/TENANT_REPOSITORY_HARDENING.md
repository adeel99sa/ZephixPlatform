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

## Smoke tests

Smoke tests for Workspace MVP are located in `test/smoke/`:

- `test/smoke/auth.e2e-spec.ts` - Auth endpoints (login, /api/auth/me)
- `test/smoke/workspaces.e2e-spec.ts` - Workspace listing
- `test/smoke/docs.e2e-spec.ts` - Doc creation and retrieval flow
- `test/smoke/my-work.e2e-spec.ts` - My Work endpoint schema validation
- `test/security/tenant-isolation.e2e-spec.ts` - Tenant isolation security tests

Run smoke tests:
```bash
npm test test/smoke
```

## Request context logging

The `RequestContextLoggerInterceptor` logs request start and end with context:

- `method` - HTTP method
- `path` - Request path (without query string)
- `requestId` - From X-Request-Id header or generated UUID
- `userId` - From req.user.sub or req.user.id
- `orgId` - From req.user.organizationId (may be null)
- `statusCode` - HTTP status code
- `durationMs` - Request duration in milliseconds

No body logging for security. Registered globally in `main.ts`.

## Migration: AddTenantIndexesWorkspaceMvp

Migration `1795000000000-AddTenantIndexesWorkspaceMvp.ts` adds tenant indexes:

- `idx_workspaces_org_slug` - Index on `workspaces(organization_id, slug)` for efficient workspace lookup by slug within an organization
- `idx_projects_org_workspace` - Index on `projects(organization_id, workspace_id)` for efficient workspace-scoped project queries

Note: `docs` table is workspace-scoped only and does not have `organizationId` column, so no tenant index is added for it.
