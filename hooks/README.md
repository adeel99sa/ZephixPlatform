# Zephix Git Hook Policies

## Purpose

Hooks catch Zephix-specific drift early — before it reaches staging, before it reaches review, and before it accumulates into technical debt or architectural regression.

These are **policy documents**, not executable scripts. Scripts will be created after policies are reviewed and accepted. This separation ensures the team agrees on *what* to enforce before debating *how* to enforce it.

## Hook Categories

| Hook | When | Purpose |
|------|------|---------|
| [pre-commit](pre-commit-policy.md) | Before each commit | Catch type safety regressions, duplicate surfaces, console spam, and architecture-sensitive changes without docs |
| [pre-push](pre-push-policy.md) | Before push to remote | Verify typecheck, targeted tests, route hygiene, and branch readiness for operator review |

## Local vs CI Philosophy

**Local hooks** are fast, lightweight, and focused on early prevention. They catch the most common Zephix-specific mistakes before they leave the developer's machine. They must not make normal development unusable.

**CI checks** are thorough, expensive, and authoritative. They run full test suites, build verification, and cross-domain regression checks. They are the final gate before merge.

| Check | Local | CI |
|-------|-------|-----|
| New `any` in critical boundaries | Local (warning) | CI (block) |
| TypeScript compilation | Local (pre-push) | CI (block) |
| Full test suite | CI only | CI (block) |
| Route duplication scan | Local (pre-push, when routing files change) | CI (full scan) |
| Build success | CI only | CI (block) |
| Staging smoke tests | CI only | CI (block) |
| Branch contamination detection | Local (warning) | CI (block) |

## What These Hooks Protect Against

These policies are designed around the specific risks that have caused real problems in Zephix development:

- **Duplicate surfaces**: onboarding pages, project creation modals, admin entry points that accumulate instead of being replaced (PRs #68-75 lesson)
- **Shell and navigation drift**: admin items appearing in the sidebar, home/inbox conflation, profile menu regression (ADR-003)
- **Workspace-first violations**: domain pages or endpoints that bypass workspace scoping
- **Governed mutation bypasses**: mutations that skip policy evaluation or audit
- **Stale route truth**: routes added without cleanup of old routes they replace
- **Branch contamination**: mixed work across domains in a single branch (operating model rule)
- **Type safety regression**: new `any` at auth, API, or admin boundaries
- **Misleading UI**: frontend controls wired to nonexistent backend endpoints

## Adoption Sequence

1. **Now**: Review and accept policy documents
2. **Next**: Create lightweight scripts implementing accepted policies
3. **Then**: Install as git hooks (husky or manual)
4. **Later**: Promote critical checks to CI workflow gates