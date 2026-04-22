# Pre-Push Policy

## Purpose

Verify that the branch is ready for remote review before pushing. Pre-push checks are heavier than pre-commit but must still complete in under 60 seconds for a typical feature branch.

---

## Required Local Checks

These must pass before push succeeds.

### 1. TypeScript compilation
- **What**: `tsc --noEmit` on the relevant project (frontend or backend, based on changed files)
- **Why**: type errors must not reach the remote branch. This is the primary quality gate for type safety.
- **How**: if only frontend files changed, check frontend. If only backend files changed, check backend. If both changed, check both.
- **Tolerance**: zero new errors introduced by the branch. Pre-existing errors in unrelated files are tolerated (tracked separately).

### 2. Targeted tests for changed area
- **What**: run tests matching the changed directory or module
- **Why**: untested changes should not be pushed without at least running the relevant specs.
- **How**: derive test pattern from changed file paths (e.g., changes in `modules/billing/` → run `jest --testPathPattern=billing`). If no matching tests exist, warn but do not block.

### 3. Route duplication scan (when routing files change)
- **What**: if `App.tsx` or route definition files are staged, scan for duplicate route paths
- **Why**: route duplication is a documented Zephix risk. Catching it before push prevents staging regression.
- **How**: extract `path=` attributes from route files and flag any path that appears more than once.

### 4. Branch targets staging
- **What**: verify the push target is not `main`
- **Why**: all feature work targets `staging`, never `main` (operating model rule, CLAUDE.md non-negotiable).
- **How**: check the upstream tracking branch or push target. Block push to `main` unless branch name starts with `hotfix/` or operator has explicitly approved.

---

## Required Review Artifacts Before Push

These are not automated checks — they are discipline expectations for the developer before pushing.

### 5. Branch summary readiness
- The developer should be able to state in one sentence what this branch does.
- If the branch touches multiple unrelated domains, it violates "one branch, one intent" and should be split.

### 6. Duplicate surface review
- If the branch adds a new page, component, or route, the developer should confirm that no old surface serving the same purpose was left behind.
- This is a manual check supported by the pre-commit warning (#5 above).

### 7. Architecture-sensitive change awareness
- If the branch modifies files flagged as architecture-sensitive (pre-commit warning #6), the developer should confirm alignment with relevant ADRs before pushing.

---

## Deferred to CI

These are too heavy for local pre-push execution.

- **Full test suite**: all backend + frontend tests across all modules — CI only
- **Full build verification**: `nest build` (backend) and `vite build` (frontend) — CI only
- **Cross-branch regression**: comparing against staging baseline — CI only
- **Staging smoke tests**: endpoint verification after deploy — CI only
- **Bundle size analysis**: measuring chunk impact — CI only
- **E2E Playwright tests**: full browser tests — CI only
- **Dependency vulnerability scan**: `npm audit` — CI only

---

## Notes on Release Discipline

- **Pre-push does not replace CI.** It catches the most common local mistakes early. CI is the authoritative gate.
- **Bypass is available** with `git push --no-verify` for exceptional cases. Bypassed pushes should be documented in the PR description.
- **Branch readiness ≠ merge readiness.** A branch that passes pre-push is ready for remote review, not for merge. Merge requires CI pass + staging verification + operator approval.
- **Staging verification** is always required before a branch is considered complete (operating model completion criteria). Pre-push does not replace this.