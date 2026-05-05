# Runtime tenant repository query guardrail (dev/test only)

## Scope

`zephix-backend/src/modules/tenancy/tenant-repository-query-guardrail.ts` is **defense-in-depth for development and test only**. It patches `Repository.prototype.createQueryBuilder` so unsafe query-builder usage is caught before merge.

Production behavior is explicitly disabled: both `installTenantRepositoryCreateQueryBuilderGuardrail` and `assertTenantScopedQueryBuilderExecution` **return immediately** when `NODE_ENV === 'production'`.

## What production isolation relies on instead

- Query-level `organizationId` / `workspaceId` scoping in services and repositories
- RBAC (`@RequireWorkspacePermission`, workspace access guards, org role checks)
- `TenantAwareRepository` patterns at the DAL
- Controller-level auth and tenant context resolution

## Interpreting test failures

A failing guardrail test means **dev/test harness or expectations drifted**, not that production tenant isolation is proven broken. Treat failures as tooling or env issues until reproduced with a correct test harness (see `.env.test.example` in `zephix-backend/`).

## Implementation nuance (execute)

Wrapping applies to the `SelectQueryBuilder` instance returned from `Repository.createQueryBuilder`. Chaining `.update()` / `.delete()` returns a **different** `QueryBuilder` subtype; that path is not covered by the same integration test as `select(...).execute()` on the original builder. Treat bypass coverage as **dev/test signal** for the wrapped paths listed in source, not an exhaustive map of every TypeORM API surface.

## Verification commands

From `zephix-backend/` with a test database and env vars set per `.env.test.example` (including `INTEGRATION_ENCRYPTION_KEY`):

```bash
export NODE_ENV=test
npx jest --config ./test/jest-e2e.json --runInBand --forceExit \
  --testPathPattern=runtime-guardrail-bypass --testTimeout=120000
```

Unit tests for assertion logic (no full app boot):

```bash
export NODE_ENV=test
npx jest --runInBand --forceExit src/modules/tenancy/tenant-repository-query-guardrail.spec.ts
```

## References

- Implementation: `zephix-backend/src/modules/tenancy/tenant-repository-query-guardrail.ts`
- Integration coverage: `zephix-backend/test/tenancy/runtime-guardrail-bypass.e2e-spec.ts` (included in default `npm run test:e2e` via `.e2e-spec.ts` suffix)
- Harness env template: `zephix-backend/.env.test.example` (`DATABASE_URL`, `INTEGRATION_ENCRYPTION_KEY` 32+ chars, JWT-related secrets required for full `AppModule` boot in tests)
- Session context: `docs/ai/SESSION_HANDOFF_2026-05-05.md` (dev/test vs production distinction)

## Tracked follow-ups (out of this note’s scope)

- Audit other `test/**/*.spec.ts` files excluded by `test/jest-e2e.json` (`.e2e-spec.ts$` only) for intentional vs accidental CI omission.
- Optional: script or doc step that validates required env vars before `npm run test:e2e`.
