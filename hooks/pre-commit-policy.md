# Pre-Commit Policy

## Purpose

Catch common Zephix-specific drift at commit time. These checks run on staged files only and must complete in under 5 seconds for a typical commit.

---

## Hard-Block Conditions

These prevent the commit from proceeding.

### 1. New `@ts-ignore` without justification
- **What**: any new `@ts-ignore` or `@ts-expect-error` added without an adjacent comment explaining why
- **Why**: ts-ignore hides real type errors. Zephix has a no-new-ts-ignore gate (operating model P0).
- **Scope**: all `.ts` and `.tsx` files in staged changes

### 2. Secrets or credentials in staged files
- **What**: patterns matching API keys, tokens, passwords, or connection strings in staged files
- **Why**: secrets were previously committed to `.env` files (Lane 1A incident). Must not recur.
- **Scope**: all staged files except `*.example` and `*.template` files

---

## Warning Conditions

These print a warning but do not block the commit.

### 3. New `any` in critical boundaries
- **What**: new `: any`, `as any`, or `<any>` in files under `lib/api/`, `services/enterprise*`, `modules/auth/`, `modules/admin/`
- **Why**: high-risk `any` at auth/API/admin boundaries is a P0 quality carry-forward item.
- **Scope**: staged `.ts` and `.tsx` files matching critical boundary paths

### 4. Console statements in critical flows
- **What**: new `console.log`, `console.debug`, or `console.info` in files under `pages/`, `features/`, `modules/auth/`, `modules/dashboards/`
- **Why**: console spam in production-facing flows degrades UX and leaks internal state.
- **Scope**: staged files in critical flow paths. `console.warn` and `console.error` are allowed.

### 5. Route file changes without cleanup note
- **What**: changes to `App.tsx` or route definition files that add new `<Route` elements without a corresponding removal or a commit message containing "cleanup" or "replace"
- **Why**: duplicate route accumulation is a documented Zephix risk (operating model lesson).
- **Scope**: staged changes to routing files

### 6. Architecture-sensitive file changes
- **What**: changes to files in `CLAUDE.md`, `platform_map.md`, `project_operating_model.md`, entity files with `onboardingStatus`, `isPublished`, or `audience` fields
- **Why**: these are architecture-sensitive areas (CLAUDE.md list). Changes should be intentional and documented.
- **Scope**: staged files matching architecture-sensitive patterns. Warning only — not all changes are wrong.

### 7. Sidebar or navigation changes
- **What**: changes to `Sidebar.tsx`, `Header.tsx`, or `DashboardLayout.tsx` that add navigation items
- **Why**: shell navigation has locked architecture decisions (ADR-002, ADR-003). Changes must be reviewed against ADRs.
- **Scope**: staged changes to shell component files

### 8. Dead UI affordances
- **What**: new `onClick` handlers in staged JSX that reference functions containing only `// TODO` or `toast.info('Coming soon')` patterns
- **Why**: fake UI for unsupported backend behavior violates frontend skill discipline.
- **Scope**: staged `.tsx` files. Best-effort pattern match — false positives are acceptable as warnings.

---

## Deferred to CI

These are too expensive or broad for local pre-commit.

- Full TypeScript compilation (`tsc --noEmit`) — deferred to pre-push and CI
- Full test suite execution — CI only
- Cross-file duplicate surface detection — CI only
- Import graph analysis — CI only
- Bundle size impact — CI only

---

## Notes on Scope and Pragmatism

- All checks run on **staged files only**, not the entire codebase.
- Hard blocks must be fast and have zero false positives.
- Warnings are acceptable with occasional false positives — they prompt review, not rejection.
- Developers can bypass with `--no-verify` in exceptional cases, but this should be rare and justified.
- These policies target Zephix-specific risks, not generic code style (that's ESLint/Prettier's job).