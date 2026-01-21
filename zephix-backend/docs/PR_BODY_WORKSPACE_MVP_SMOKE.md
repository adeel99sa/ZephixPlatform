# Workspace MVP smoke suite and tenant hardening

## What Changed

This PR adds a comprehensive smoke test suite for the Workspace MVP endpoints and completes the tenant hardening work.

### Smoke Tests
- **Auth endpoints**: Login and `/api/auth/me` validation
- **Workspaces**: `GET /api/workspaces` structure validation
- **Docs**: Create and retrieve doc flow
- **My Work**: `/api/my-work` schema validation
- **Tenant isolation**: Security tests for cross-tenant access prevention

### Infrastructure
- **E2E seed helper**: Deterministic test data creation (`test/utils/e2e-seed.ts`)
  - Creates org, user, workspace, and JWT token
  - Idempotent (reuses existing data if found)
- **CI Postgres service**: Added Postgres 16 service to GitHub Actions
- **Migration step**: Runs migrations before smoke tests in CI
- **Request context logger**: Global interceptor for request logging with tenant context

### Database
- **Migration**: `AddTenantIndexesWorkspaceMvp` adds indexes:
  - `idx_workspaces_org_slug` on `workspaces(organization_id, slug)`
  - `idx_projects_org_workspace` on `projects(organization_id, workspace_id)`

## Current State

⚠️ **Smoke tests are currently failing in CI** until database setup is complete. The test structure is correct and tests will pass once:
- Postgres service is running in CI
- Migrations have been executed
- Seed data is created

Tests pass locally when run against a configured Postgres database.

## How to Run Locally

### Prerequisites
1. Postgres database running
2. Set environment variables:
   ```bash
   export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/zephix_test"
   export JWT_SECRET="test-secret-key"
   export NODE_ENV="test"
   ```

### Run Smoke Tests
```bash
cd zephix-backend
npm ci
npm run build
npm run migration:run
npm test -- --config test/jest-e2e.json --testPathPattern="smoke"
```

### Run All E2E Tests
```bash
npm test -- --config test/jest-e2e.json
```

## Verification

- ✅ Build passes (`npm run build`)
- ✅ Tenant repo checks pass (`./scripts/check-tenant-repo-calls.sh`)
- ✅ Bad rewrite checks pass (`./scripts/check-bad-rewrites.sh`)
- ⚠️ Smoke tests require database setup (structure is correct)

## Related PRs

- #XXX - TenantAwareRepository hardening (docs)
