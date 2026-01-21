# API Client Migration Plan

**Issue:** Multiple API clients in use, causing potential header/base path drift

---

## Current State

### Client 1: `services/api.ts` ✅ (Preferred)
- Has `x-workspace-id` interceptor
- Does NOT send "default"
- Used by: `projects.api.ts`, `ProjectOverviewPage.tsx`

### Client 2: `lib/api/client.ts` ⚠️ (Needs Migration)
- Has `x-workspace-id` interceptor
- **FIXED:** No longer sends "default"
- Used by: `TaskListSection.tsx`, `ProjectLinkingSection.tsx`, `phases.api.ts`, `ProjectCreateModal.tsx`

### Client 3: `lib/api` (Barrel Export)
- May export `client.ts` or different instance
- Used by: `dashboards/api.ts`

---

## Migration Strategy

### Option A: Unify on `services/api.ts` (Recommended)

**Steps:**
1. Update all imports to use `services/api.ts`
2. Remove or deprecate `lib/api/client.ts`
3. Update barrel export if needed

**Files to Update:**
- `zephix-frontend/src/features/projects/components/TaskListSection.tsx`
- `zephix-frontend/src/features/projects/components/ProjectLinkingSection.tsx`
- `zephix-frontend/src/features/work-management/api/phases.api.ts`
- `zephix-frontend/src/features/projects/ProjectCreateModal.tsx`
- `zephix-frontend/src/features/dashboards/api.ts`
- `zephix-frontend/src/features/projects/api.ts`

### Option B: Keep Both, Ensure Consistency

**Steps:**
1. Ensure both clients have identical interceptor logic
2. Document which client to use for new code
3. Add ESLint rule to enforce one client

---

## Immediate Fix Applied

✅ **Fixed:** `lib/api/client.ts` no longer sends "default" as workspace ID
- Only sends actual UUID
- If no workspace, header not added (backend validates)

---

## Verification

After migration, verify:
```bash
# Should show only one import pattern
grep -r "import.*api.*from" zephix-frontend/src --include="*.ts" --include="*.tsx" | grep -v node_modules | sort | uniq
```

---

## Priority

**For MVP:** Current state is acceptable if:
- Both clients have x-workspace-id logic
- Neither sends "default"
- All workspace-scoped endpoints work

**Post-MVP:** Unify to single client for maintainability
