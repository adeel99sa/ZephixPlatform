# Test Debt Register

Tracking skipped tests that need to be fixed. Do not keep `.skip` files long term.

## Skipped Test Files

| File Path | Why Skipped | Owner | Target Fix Date | Done Criteria |
|-----------|-------------|-------|-----------------|---------------|
| `zephix-backend/src/modules/templates/controllers/templates.controller.spec.ts.skip` | Controller API changed, tests reference methods that no longer exist (`findAll`, `findOne` → `list`, `get`) | TBD | 2026-02-12 | Tests updated to match new controller signatures, file renamed to `.spec.ts`, CI passes |
| `zephix-backend/src/workflows/__tests__/workflow-templates.controller.spec.ts.skip` | Controller method signatures changed (8 args → different signature), mock types outdated | TBD | 2026-02-12 | Tests updated to match new controller signatures, mock types fixed, file renamed to `.spec.ts`, CI passes |
| `zephix-backend/src/modules/workspaces/workspaces.controller.spec.ts.skip` | Dependency injection errors in test setup, service providers not correctly configured | TBD | 2026-02-12 | DI issues fixed in test module setup, file renamed to `.spec.ts`, CI passes |
| `zephix-backend/src/modules/projects/projects.controller.spec.ts.skip` | Mock `Project` type missing many required fields (24+ properties) | TBD | 2026-02-12 | Mock types updated to include all required Project properties, file renamed to `.spec.ts`, CI passes |
| `zephix-backend/src/modules/projects/controllers/projects.controller.spec.ts.skip` | `import * as request from 'supertest'` not callable, mock types outdated | TBD | 2026-02-12 | Import fixed to `import request from 'supertest'`, mock types updated, file renamed to `.spec.ts`, CI passes |

## CI Workarounds

These workarounds were added to CI to allow the baseline to pass:

| CI Job | Workaround | File | Line |
|--------|------------|------|------|
| Contract Tests Gate | `--passWithNoTests` for templates, workspaces, projects tests | `.github/workflows/ci.yml` | 413-418 |
| Contract Tests Gate | Backend e2e smoke tests skipped (Jest teardown issues) | `.github/workflows/ci.yml` | 161-167 |
| verify | Frontend Playwright smoke tests skipped (require backend) | `.github/workflows/ci.yml` | 541-545 |
| Templates Contract & Smoke Tests | `--passWithNoTests` | `.github/workflows/ci.yml` | 691 |

## How to Fix a Skipped Test

1. Rename the file from `.spec.ts.skip` to `.spec.ts`
2. Run `npm test -- <filename>` locally to see errors
3. Fix the issues (update mocks, fix imports, update method calls)
4. Verify test passes locally
5. Push and confirm CI passes
6. Remove the entry from this register

## Last Updated

2026-02-05 by CI baseline work
