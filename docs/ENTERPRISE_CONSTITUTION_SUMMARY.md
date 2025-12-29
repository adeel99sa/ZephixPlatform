# Zephix Enterprise Constitution - Summary

**Date**: 2025-01-XX
**Purpose**: Single source of truth for all engineering rules and RBAC behavior

## Overview

The `.cursorrules` file is the **single engineering constitution** for Zephix. It contains all rules, guardrails, and behaviors that must be followed.

## Structure

### PART 1: Global Engineering and Safety Rules
- Hard stops (fail fast conditions)
- Monorepo & deployment guardrails
- CI pipeline guardrails
- Evidence-first protocol
- Frontend-backend contract rules
- Database verification
- Zephix domain rules (allocations)
- Security & supply chain

### PART 2: RBAC and Workspace Behavior
- **Core role model (FROZEN):**
  - Platform roles: ADMIN, MEMBER, VIEWER
  - Workspace roles: workspace_owner, workspace_member, workspace_viewer
  - No new roles, no new levels
- Permission matrix
- JWT and authentication
- Guards and backend behavior
- Frontend behavior
- Project transfer and duplication (planned)
- Logging and observability
- Testing requirements
- Process for RBAC changes
- Safety and constraints

### PART 3: Environments, Branching, and Deployment
- Environment definitions (local, staging, production)
- Branching strategy (main, feature/*, release/*)
- Merge requirements
- Deployment guardrails

### PART 4: Workspace Feature Phases
- Phase B: Ownership transfer and self removal
- Phase C: Project transfer between workspaces
- Phase D: Project duplication modes

### PART 5: AI and PM Intelligence with RBAC
- AI orchestrator RBAC rules
- Platform role behavior for AI
- Logging requirements

### PART 6: Working Mode for Cursor
- Conflict resolution
- Evidence and verification
- CI test gates

## Key Principles

### 1. Role Model is Frozen
- Platform roles: ADMIN, MEMBER, VIEWER (no changes)
- Workspace roles: workspace_owner, workspace_member, workspace_viewer (no changes)
- All permission decisions flow from PlatformRole → WorkspaceRole → Effective role helper
- Fail closed when unsure

### 2. Single Source of Truth
- `.cursorrules` is the only source for engineering rules
- All deployment, CI, RBAC, and workspace rules are in one place
- No scattered documentation

### 3. Test Gates
- RBAC-related files trigger RBAC test suite
- No merge if RBAC tests fail
- CI job `rbac-tests` runs automatically

### 4. Evidence-First
- Before claiming "fixed", show:
  - Build output
  - Lint output
  - Test output
  - Deploy plan

## Quick Reference

### For Developers
- Read `.cursorrules` before starting work
- Follow the 6-step process for RBAC changes
- Use role helpers, never hardcode role strings
- Add tests for all RBAC changes

### For Testers
- See `docs/RBAC_AND_WORKSPACE_BEHAVIOR.md` for behavior reference
- Test as ADMIN, MEMBER, and VIEWER
- Verify workspace creation (ADMIN only)
- Verify last owner protection

### For Architects
- Role model is frozen - no changes
- All new features must respect RBAC
- All access checks must use effective role helper
- All sensitive actions must be logged

## Enforcement

### Automated
- CI test gates block merges if RBAC tests fail
- Linters catch role string leaks
- TypeScript enforces enum usage

### Manual
- Code review checks for role helper usage
- Architecture review for RBAC changes
- Security audit for permission changes

## Related Documents

- `docs/RBAC_AND_WORKSPACE_BEHAVIOR.md` - Tester one-pager
- `docs/RBAC_IMPLEMENTATION_COMPLETE.md` - Implementation details
- `docs/RBAC_ROLE_STRING_LEAKS.md` - Remaining fixes needed

---

**Remember: `.cursorrules` is the constitution. Follow it exactly.**






