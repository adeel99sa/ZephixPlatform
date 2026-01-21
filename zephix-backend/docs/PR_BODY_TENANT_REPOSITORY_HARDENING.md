# Require explicit orgId in TenantAwareRepository and enforce via CI

## Summary

- Enforced orgId-first API across TenantAwareRepository read and write methods.
- Added strict tenant scoping rules for `update` and `delete` when criteria is a primitive ID.
- Prevented unsafe repository access by renaming `getRepository` to private `getUnsafeRepository`.
- Added CI scripts to block missing orgId and catch bad codemod rewrites on non-tenant repositories.
- Updated call sites across the codebase.

## Why

- AsyncLocalStorage loses context across NestJS Observable chains and some async boundaries.
- Tenant isolation must be explicit to prevent data leakage and runtime failures.

## What changed

- TenantAwareRepository method signatures now require orgId first.
- `update` and `delete` automatically scope IDs to the tenant.
- CI adds two checks:
  - `check-tenant-repo-calls.sh`
  - `check-bad-rewrites.sh`

## Testing

- `npm run build`
- `scripts/check-tenant-repo-calls.sh`
- `scripts/check-bad-rewrites.sh`
- Existing e2e tests pass, tenant isolation tests included.

## Notes

- `req.tenant` remains transitional where present. Do not add new dependencies on it.

## How to verify

```bash
cd zephix-backend
npm run build
./scripts/check-tenant-repo-calls.sh
./scripts/check-bad-rewrites.sh
```
