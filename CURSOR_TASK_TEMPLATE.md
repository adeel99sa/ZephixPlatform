# Cursor Task Template

**Copy this template for every new task**

---

## Task

**Goal:**
[What we're building - be specific]

**Non-goals:**
[What we're NOT building - prevents scope creep]

**User roles impacted:**
- [ ] Admin
- [ ] Workspace Owner
- [ ] Member
- [ ] Viewer

**Pages impacted:**
- `/workspaces`
- `/projects/:id`
- `/my-work`
- [List all affected pages]

**APIs impacted:**
- `GET /api/...`
- `POST /api/...`
- `PATCH /api/...`
- `DELETE /api/...`
- [List all affected endpoints]

**Data model changes:**
- [ ] New entity: `EntityName`
- [ ] New field: `Entity.field`
- [ ] Migration: `XXXX-Description`
- [ ] No data model changes

**Acceptance checks:**
1. [Test step 1 - specific and measurable]
2. [Test step 2]
3. [Expected result]
4. [Edge case to verify]

---

## Constraints

- ✅ Enforce workspace and org scoping
- ✅ Reuse existing guards, repositories, response wrapper
- ✅ No new libraries
- ✅ Small commits only
- ✅ Follow existing patterns in codebase

---

## Deliverables

- [ ] Code changes
- [ ] Tests (unit + integration if needed)
- [ ] Proof note with requests and outputs
- [ ] Migration file (if data model changes)
- [ ] Documentation update (if API changes)

---

## Proof Note Template

**Task:** [Task name]

**What Changed:**
- `zephix-backend/src/modules/.../file.ts` - [Description]
- `zephix-frontend/src/.../file.tsx` - [Description]

**Endpoints:**
- `GET /api/...` - [Description]
- `POST /api/...` - [Description]

**Sample Request:**
```bash
curl -X POST http://localhost:3001/api/... \
  -H "Authorization: Bearer <token>" \
  -H "x-workspace-id: <uuid>" \
  -d '{
    "field": "value"
  }'
```

**Sample Response:**
```json
{
  "success": true,
  "data": {
    "id": "...",
    "field": "value"
  }
}
```

**Screenshots/Console Logs:**
- [Attach UI screenshots]
- [Paste console output]

**File Paths Touched:**
- `zephix-backend/src/modules/...`
- `zephix-frontend/src/...`

---

## Guardrail Checklist

Before marking done, verify:

- [ ] Tenancy: organizationId and workspaceId enforced in service
- [ ] RBAC: Role guard exists for write endpoints
- [ ] Workspace header: Required where needed, never "default"
- [ ] API consistency: One client path, no duplicate axios clients
- [ ] DTO validation: class-validator used, no any types
- [ ] Audit trail: Who did what, when on critical actions

---

**Copy this template for each new task**
