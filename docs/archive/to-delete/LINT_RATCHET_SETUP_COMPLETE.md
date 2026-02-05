# Lint Ratchet Setup Complete

## Summary

Implemented lint ratchet strategy to enforce quality on new/changed code while allowing existing debt to be addressed incrementally.

## Changes Made

### 1. ESLint Rule Fix (Commit: `ae0f0a3a`)
- **File**: `zephix-backend/eslint.config.mjs`
- **Change**: Removed broad pattern matcher that incorrectly blocked `TypeOrmModule` from `@nestjs/typeorm`
- **Result**: 
  - ✅ `TypeOrmModule` imports now allowed (required for NestJS module wiring)
  - ✅ Direct `typeorm` package imports still blocked
  - ✅ `InjectRepository` from `@nestjs/typeorm` still blocked

### 2. Lint Ratchet Implementation (Commit: `ea2a9ff4`)

#### Package.json Script
- **Added**: `lint:changed` script
- **Command**: `npm run lint:changed`
- **Purpose**: Lint only changed TypeScript files in PR

#### CI Integration
- **File**: `.github/workflows/ci.yml`
- **Added**: Required step "Lint changed files (merge gate)" in `contract-gate` job
- **Behavior**: Fails PR if any changed file has lint errors

- **File**: `.github/workflows/enterprise-ci.yml`
- **Added**: 
  - Required step "Lint changed files (merge gate)"
  - Informational step "Run full lint (informational)" (non-blocking)
- **Behavior**: 
  - Changed files must pass lint (blocks merge)
  - Full lint runs but doesn't block (reports top 20 errors)

#### Script: `zephix-backend/scripts/lint-changed.sh`
- Detects changed `.ts` and `.tsx` files vs base branch
- Filters out `dist`, `node_modules`, migration outputs
- Runs `eslint` with `--max-warnings 0` on changed files only
- Exits successfully if no files changed

## Verification

### ✅ TypeOrmModule Import Allowed
```bash
# workflows.module.ts, template.module.ts, tasks.module.ts all pass
npx eslint src/workflows/workflows.module.ts
# No errors
```

### ✅ Direct typeorm Import Blocked
```bash
# workflow-templates.service.ts correctly flagged
npx eslint src/workflows/services/workflow-templates.service.ts
# Error: 'typeorm' import is restricted
```

### ✅ Lint-Changed Script Works
```bash
# No changed files
npm run lint:changed
# ✅ No valid TypeScript files to lint

# With deliberate violation
echo "import { Repository } from 'typeorm';" >> test.ts
npm run lint:changed
# ❌ Error: 'typeorm' import is restricted
```

## Next Steps

### Immediate
1. ✅ ESLint rule fixed
2. ✅ CI wired
3. ✅ Package.json script added
4. ⏳ Check for `InjectRepository` and direct `typeorm` imports in recently touched files

### Follow-up (Backlog)
- Replace `TypeOrmModule.forFeature` usage with tenancy wrappers module by module
- Address existing lint debt incrementally (target: 300 errors per sprint)

## Developer Workflow

Before pushing:
```bash
cd zephix-backend
npm run lint:changed
```

If errors found, fix them before pushing. CI will enforce this automatically.

## CI Behavior

- **PRs**: `lint:changed` runs and blocks merge on failures
- **Full lint**: Runs as informational job, publishes top 20 errors
- **Existing debt**: Not blocking, tracked for incremental cleanup
