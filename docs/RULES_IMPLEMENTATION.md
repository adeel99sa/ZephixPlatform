# Cursor Rules Implementation Summary

This document tracks the implementation of modular Cursor rules and evidence-first development practices.

## What Was Implemented (Today)

### 1. ✅ Modular Rules Structure
- **`.cursorrules`** - Minimal configuration (24 lines)
- **`rules/enterprise-core.mdc`** - Always-on guardrails (102 lines)
- **`rules/allocations.mdc`** - Domain logic (32 lines)
- **`rules/frontend.mdc`** - Auto-attached to .tsx/.ts (60 lines)
- **`rules/backend.mdc`** - Auto-attached to NestJS files (43 lines)
- **`rules/tests.mdc`** - Auto-attached to tests (25 lines)
- **`rules/process.mdc`** - Agent behavior + quick commands (35 lines)

**Status:** All rule files under 500 lines ✅

### 2. ✅ Lint Enforcement (Already Existed)
- ESLint rule blocks direct `axios` imports in frontend
- Error message directs to centralized API client
- Located in `zephix-frontend/eslint.config.js` lines 57-64

### 3. ✅ Contract Checking Scripts
- **`scripts/check-contract.sh`** - Smoke test for API contract
- **`scripts/diff-contracts.sh`** - Compare expected vs actual API responses
- **`scripts/check-rules-size.sh`** - Prevents rule bloat (>500 lines)

### 4. ✅ CI Integration
- Added `check-rules-size` job to `.github/workflows/ci.yml`
- Contract check commented out (requires deployed backend)
- Future: Uncomment when backend is available in CI environment

### 5. ✅ Evidence-First Protocol
- **Quick commands** in `rules/process.mdc`:
  - `@build-frontend` - Build and paste output
  - `@build-backend` - Build and paste output
  - `@contract` - Diff API contracts
  - `@e2e-real` - Run E2E tests
  - `@lint` - Run lint checks
- **PR Template** at `.github/pull_request_template.md`:
  - Checklists for build logs, lint, tests, contracts
  - Forces evidence before merge

### 6. ✅ Developer Ergonomics
- **`.editorconfig`** - UTF-8, LF line endings, 2-space indent
- **`.vscode/settings.json`** - Auto-format, trim whitespace, Tailwind intellisense
- **`.vscode/extensions.json`** - Recommended extensions (Prettier, ESLint, Tailwind, Playwright)
- **`.gitignore`** - Added `.contracts/` directory

### 7. ✅ Contract Documentation
- **`contracts/README.md`** - How to use contract fixtures
- Directory structure ready for expected API responses

## How to Use

### For Developers

1. **Cursor will auto-apply rules** based on file patterns
2. **Before committing:**
   ```bash
   # Check rules haven't bloated
   bash scripts/check-rules-size.sh

   # Lint
   npm run lint:new

   # If backend available, check contracts
   TOKEN=$TOKEN bash scripts/diff-contracts.sh
   ```

3. **PR Checklist:** Follow `.github/pull_request_template.md`

### For CI/Development Agents

**Quick Commands:**
- Type `@build-frontend` to trigger `cd zephix-frontend && npm ci && npm run build`
- Type `@contract resources/allocations` to diff API
- Type `@e2e-real` to run real-auth E2E tests

**Evidence Protocol:**
- Never claim "fixed" without showing build logs
- Never claim "working" without test output
- Never modify API without running contract diff

## Next Steps (From Plan)

### Immediate (This Week)
- [ ] **Workspace flow UI** - Modal + list + CRUD operations
- [ ] **Project flow** - Scoped to workspace
- [ ] **Work Items** - Simple task list
- [ ] **Dashboard wiring** - Real KPI data

### Foundational (This Month)
- [ ] Wire contract checks into CI (when backend deployed)
- [ ] Add Husky pre-commit: `npm run lint:new`
- [ ] Generate initial expected fixtures for key endpoints
- [ ] Expand real-auth E2E coverage

### Long-Term
- [ ] Telemetry with `requestId` in user-facing errors
- [ ] Add `x-user`, `x-org` headers to context
- [ ] Expand contract fixtures for all critical endpoints
- [ ] Add rules for new domains (resources, risks, etc.)

## Compliance Checklist

- [x] Rules split into <500 line modules
- [x] Auto-attachment by file pattern configured
- [x] ESLint rule blocks axios imports
- [x] Contract checking scripts created
- [x] CI wired to check rule sizes
- [x] PR template enforces evidence-first
- [x] Developer ergonomics (.editorconfig, .vscode)
- [ ] Husky pre-commit hooks (not implemented - requires root package.json setup)
- [ ] Initial contract fixtures created (empty directory ready)
- [ ] Contract checks in CI (commented out pending backend)

## Key Principles

1. **Evidence-first** - No claims without proof
2. **Modular rules** - <500 lines per file
3. **Auto-attach** - Right rules for right files
4. **CI enforcement** - No drifting from standards
5. **Developer UX** - IDE settings, quick commands

## Files Modified/Created

### Created
- `.cursorrules`
- `rules/enterprise-core.mdc`
- `rules/allocations.mdc`
- `rules/frontend.mdc`
- `rules/backend.mdc`
- `rules/tests.mdc`
- `rules/process.mdc` (enhanced)
- `scripts/check-contract.sh`
- `scripts/diff-contracts.sh`
- `scripts/check-rules-size.sh`
- `contracts/README.md`
- `.github/pull_request_template.md`
- `.editorconfig`
- `.vscode/settings.json`
- `.vscode/extensions.json`
- `docs/RULES_IMPLEMENTATION.md` (this file)

### Modified
- `.gitignore` (added `.contracts/`)
- `.github/workflows/ci.yml` (added rules size check)

### Deleted
- `.cursor/rules/zephixapp.mdc` (replaced by modular structure)

## Architecture Decisions

1. **Split monolith into modules** - Easier maintenance, clearer ownership
2. **Auto-attach by pattern** - No manual @mentioning needed
3. **CI checks rules themselves** - Meta-governance prevents bloat
4. **Contract fixtures separate from code** - Easy to update when API changes
5. **Evidence-first templated** - Forces discipline in PRs

## Success Metrics

- ✅ All rules <500 lines
- ✅ CI checks rule sizes automatically
- ✅ Quick commands documented in process.mdc
- ✅ PR template requires evidence
- ⏳ Contract fixtures generated (pending endpoints)
- ⏳ Husky pre-commit (optional quality-of-life)
- ⏳ CI contract checks (pending backend deployment)

