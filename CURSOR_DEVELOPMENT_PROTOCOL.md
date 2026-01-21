# Cursor Development Protocol

**Purpose:** Keep speed and prevent regressions
**Date:** January 15, 2026

---

## 1. Lock the Operating Rules

### Rules
- ✅ Cursor writes code
- ✅ You approve scope per task
- ❌ No large refactors unless explicitly requested
- ❌ No new libraries unless required

---

## 2. One Branch Per Workstream

### Branch Naming
```
feat/<area>-<short-name>
```

### Examples
- `feat/ai-context-guard`
- `feat/programs-foundation`
- `feat/resources-allocation-mvp`

### Rules
- One branch per feature area
- Descriptive, short names
- Use kebab-case

---

## 3. Work in Small Commits

### Each Commit Must Include

**What changed:**
- List of files modified
- Brief description of changes

**Why:**
- Business reason or user need
- Link to requirement or issue

**How to test:**
- Steps to verify the change
- Expected behavior

**Risk:**
- Potential side effects
- Breaking changes
- Migration requirements

### Commit Message Template
```
feat(area): short description

What changed:
- File 1: Description
- File 2: Description

Why:
- Business reason or requirement

How to test:
1. Step 1
2. Step 2
3. Verify expected behavior

Risk:
- Potential impact
- Migration needed: yes/no
```

---

## 4. Mandatory Pre-Commit Checks

### Backend
- [ ] Typecheck: `npm run typecheck` or `tsc --noEmit`
- [ ] Unit tests for changed modules: `npm test -- <module>`
- [ ] Run migrations in clean DB once per migration

### Frontend
- [ ] Build: `npm run build`
- [ ] Smoke test key routes changed
- [ ] Network calls confirm headers present (x-workspace-id, Authorization)

### Pre-Commit Script
```bash
#!/bin/bash
# pre-commit.sh

# Backend checks
cd zephix-backend
npm run typecheck || exit 1
npm test -- --changed || exit 1

# Frontend checks
cd ../zephix-frontend
npm run build || exit 1

echo "✅ Pre-commit checks passed"
```

---

## 5. Evidence Capture for Every "Done"

### Proof Note Template

**Task:** [Task name]

**What Changed:**
- [List of files with paths]

**Endpoints:**
- `GET /api/...` - [Description]
- `POST /api/...` - [Description]

**Sample Request:**
```bash
curl -X POST http://localhost:3001/api/... \
  -H "Authorization: Bearer <token>" \
  -H "x-workspace-id: <uuid>" \
  -d '{...}'
```

**Sample Response:**
```json
{
  "success": true,
  "data": {...}
}
```

**Screenshots/Console Logs:**
- [Attach or paste UI changes]
- [Console output for network calls]

**File Paths Touched:**
- `zephix-backend/src/modules/...`
- `zephix-frontend/src/...`

---

## 6. Guardrail Checklist for Cursor Output

### Review Before Merging

#### Tenancy
- [ ] `organizationId` enforced in service, not only controller
- [ ] `workspaceId` validated in service layer
- [ ] Queries scoped by both org and workspace where needed

#### RBAC
- [ ] Role guard exists for write endpoints
- [ ] Viewer role cannot write (403 on PATCH/POST/DELETE)
- [ ] Member role can write in workspace
- [ ] Admin override works correctly

#### Workspace Header
- [ ] `x-workspace-id` required only where needed
- [ ] Never faked with "default"
- [ ] Interceptor adds header automatically
- [ ] Missing header fails fast with clear error

#### API Consistency
- [ ] One client path used (services/api.ts preferred)
- [ ] No duplicate axios clients
- [ ] All imports use same client instance

#### DTO Validation
- [ ] `class-validator` used for DTOs
- [ ] No `any` types for payloads
- [ ] Validation errors return 400 with clear messages

#### Audit Trail
- [ ] Who did what, when on critical actions
- [ ] `createdBy`, `updatedBy` fields populated
- [ ] Activity logs for important changes

---

## 7. Sequence for Next Development Block

### A. Foundation for "Everything Works" Usage

**Goal:** Stable cross-entity navigation

**Tasks:**
- [ ] Programs and portfolios minimal scaffolding
- [ ] Projects must be workspace-scoped always
- [ ] Cross-entity navigation stable

**Acceptance:**
- Navigate workspace → program → project → task
- No broken links or 404s
- Workspace context maintained

### B. Resource Management MVP

**Goal:** Basic allocation and warnings

**Tasks:**
- [ ] Workspace member to resource mapping
- [ ] Allocation create, update, warnings
- [ ] Program and project rollups

**Acceptance:**
- Create allocation for workspace member
- See allocation warnings
- Rollups show in program/project views

### C. AI Assistant Foundation

**Goal:** Scaffolding for AI features

**Tasks:**
- [ ] Context object builder
- [ ] Permission and scope validator
- [ ] Action preview and confirmation
- [ ] Audit log entries

**Acceptance:**
- Context built from route + selected entity
- Permissions checked before actions
- Actions previewed before execution
- Audit logs written

---

## 8. Cursor Prompt Template

### Reuse This for Every Task

```
Task

Goal:
[What we're building]

Non-goals:
[What we're NOT building]

User roles impacted:
- Admin
- Workspace Owner
- Member
- Viewer

Pages impacted:
- /workspaces
- /projects/:id
- etc.

APIs impacted:
- GET /api/...
- POST /api/...
- etc.

Data model changes:
- New entity: EntityName
- New field: Entity.field
- Migration: XXXX-Description

Acceptance checks:
1. [Test step 1]
2. [Test step 2]
3. [Expected result]

Constraints

- Enforce workspace and org scoping
- Reuse existing guards, repositories, response wrapper
- No new libraries
- Small commits only

Deliverables

- Code changes
- Tests
- Proof note with requests and outputs
```

---

## 9. First Task: AI Foundation

### Build This First

**Goal:** Scaffolding for AI features (no UI chat, no model calls yet)

**Components:**

1. **AI Context Builder**
   - Build context from route + selected entity
   - Include user role, workspace, permissions
   - Return structured context object

2. **AI Policy Matrix**
   - Permission matrix by role + page
   - Action allowlist/denylist
   - Scope validator

3. **AI Action Registry**
   - Register available actions
   - Dry-run preview
   - Confirmation required

**Files to Create:**
- `zephix-backend/src/modules/ai/context/context-builder.service.ts`
- `zephix-backend/src/modules/ai/policy/policy-matrix.service.ts`
- `zephix-backend/src/modules/ai/actions/action-registry.service.ts`

**No UI chat yet. No model calls yet. Only scaffolding.**

---

## 10. Review Process

### Before Merging

1. **Run Guardrail Checklist**
   - Review all 6 categories
   - Fix any violations

2. **Run Pre-Commit Checks**
   - Backend typecheck and tests
   - Frontend build and smoke test

3. **Capture Evidence**
   - Proof note with requests/responses
   - Screenshots for UI changes
   - File paths touched

4. **Small Commits**
   - One logical change per commit
   - Clear commit messages
   - Easy to review and revert

---

## Quick Reference

### Branch Naming
```
feat/<area>-<short-name>
```

### Commit Template
```
feat(area): description

What changed: ...
Why: ...
How to test: ...
Risk: ...
```

### Pre-Commit
```bash
# Backend
npm run typecheck
npm test -- --changed

# Frontend
npm run build
```

### Guardrails
- ✅ Tenancy enforced
- ✅ RBAC guards
- ✅ Workspace header
- ✅ API consistency
- ✅ DTO validation
- ✅ Audit trail

---

**Status:** Protocol established. Ready to use for next development block.
