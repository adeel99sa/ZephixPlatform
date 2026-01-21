# Phase 0: Baseline Proof Capture - Summary

**Generated:** 2026-01-18 13:36:42 CST  
**Git SHA:** b9b0c2100e9e62fb12da8fdb24b36ad94c860fc0  
**Branch:** recovery/workspace-mvp

---

## EXECUTIVE SUMMARY

Phase 0 baseline proof capture completed. All 13 commands executed successfully. Evidence saved to `proofs/recovery/commands/00_phase0_*.txt`.

**Key Findings:**
- **Controllers:** 78 (not 48 as previously reported)
- **Services:** 151 (not 94 as previously reported)
- **Entities:** 98
- **Modules:** 35
- **Frontend pages:** 137 TSX files
- **Frontend routes:** 60 path attributes, 69 Route elements in App.tsx
- **Migrations:** 78

---

## PROOF FILES CREATED

All proof files saved to `proofs/recovery/commands/`:

1. `00_phase0_git_rev.txt` - Git commit SHA
2. `00_phase0_git_status.txt` - Git status (11 modified, 11 untracked)
3. `00_phase0_ls_la.txt` - Root directory listing
4. `00_phase0_docs_files.txt` - All docs files (maxdepth 3)
5. `00_phase0_controller_count.txt` - Controller count: 78
6. `00_phase0_tenant_aware_repo.txt` - TenantAwareRepository usage (20 matches)
7. `00_phase0_database_triggers_rls.txt` - RLS/trigger evidence (30 matches)
8. `00_phase0_template_creation_paths.txt` - Template/project creation paths (50 matches)
9. `00_phase0_frontend_router.txt` - Frontend router configuration (50 matches)
10. `00_phase0_frontend_pages_count.txt` - Frontend pages: 137
11. `00_phase0_entities_count.txt` - Entities: 98
12. `00_phase0_services_count.txt` - Services: 151
13. `00_phase0_modules_count.txt` - Modules: 35
14. `00_phase0_migrations_count.txt` - Migrations: 78
15. `00_phase0_raw_sql_usage.txt` - Raw SQL query usage (potential bypass patterns)
16. `00_phase0_summary.txt` - Quick reference summary

---

## DETAILED FINDINGS

### 1. Git State

**Commit:** `b9b0c2100e9e62fb12da8fdb24b36ad94c860fc0`  
**Branch:** `recovery/workspace-mvp`

**Modified Files (11):**
- `ZEPHIX_PLATFORM_AUDIT_REPORT.md`
- `zephix-backend/src/modules/auth/auth.service.ts`
- `zephix-backend/src/modules/auth/dto/login.dto.ts`
- `zephix-backend/src/modules/docs/docs.controller.ts`
- `zephix-backend/src/modules/forms/forms.controller.ts`
- `zephix-backend/src/modules/home/services/guest-home.service.ts`
- `zephix-backend/src/modules/workspaces/services/workspace-health.service.ts`
- `zephix-backend/src/modules/workspaces/workspaces.service.ts`
- `zephix-frontend/src/components/landing/Navigation.tsx`
- `zephix-frontend/src/components/layouts/DashboardLayout.tsx`
- `zephix-frontend/src/components/workspace/WorkspaceSelectionScreen.tsx`

**Untracked Files (11):**
- External architecture documents (`.docx`, `.xlsx`)
- Various status/debug markdown files

---

### 2. Backend Architecture Counts

| Metric | Count | Proof File |
|--------|-------|------------|
| **Controllers** | 78 | `00_phase0_controller_count.txt` |
| **Services** | 151 | `00_phase0_services_count.txt` |
| **Entities** | 98 | `00_phase0_entities_count.txt` |
| **Modules** | 35 | `00_phase0_modules_count.txt` |
| **Migrations** | 78 | `00_phase0_migrations_count.txt` |

**Note:** Controller and service counts are higher than previously reported (48 vs 78, 94 vs 151). This suggests previous counts may have been limited to `src/modules/` only, while actual counts include all files in `src/`.

---

### 3. Frontend Architecture Counts

| Metric | Count | Proof File |
|--------|-------|------------|
| **Page Files (TSX)** | 137 | `00_phase0_frontend_pages_count.txt` |
| **Route Elements** | 69 | `00_phase0_frontend_router.txt` |
| **Path Attributes** | 60 | `00_phase0_frontend_router.txt` |

**Router Entry Point:** `zephix-frontend/src/App.tsx` (lines 83-191)

**Router Type:** React Router v6 (`BrowserRouter`, `Routes`, `Route`)

---

### 4. Tenant Isolation Evidence

**TenantAwareRepository Implementation:**
- **File:** `zephix-backend/src/modules/tenancy/tenant-aware.repository.ts`
- **Usage:** Found in 20+ files
- **Pattern:** Services extend `TenantAwareRepository<T>`, automatically scopes by `organizationId`

**Evidence Files:**
- `zephix-backend/src/modules/workspace-access/workspace-access.service.ts` (lines 10-11, 21-22, 60)
- `zephix-backend/src/modules/home/home.module.ts` (lines 29-32)
- `zephix-backend/src/common/decorators/tenant.decorator.ts` (line 44)

**Conclusion:** ✅ Tenant isolation implemented at application level via `TenantAwareRepository`.

---

### 5. Database Triggers/RLS Evidence

**RLS (Row Level Security):**
- **Found on:** `brds` table only
- **File:** `zephix-backend/src/brd/database/migrations/1704467100000-CreateBRDTable.ts`
- **Policy:** `brds_tenant_isolation` (line 136)

**Database Triggers:**
- `update_brd_search_vector_trigger` (brds table)
- `update_brds_updated_at` (brds table)
- `trg_protect_demo_users` (ProtectDemoUsers migration)

**Conclusion:** ⚠️ **Partial** - RLS exists on `brds` table only. Primary tenant isolation is application-level via `TenantAwareRepository`, not database triggers. External doc claim "database triggers prevent cross-tenant access" is **not fully accurate**.

---

### 6. Template Creation Paths Evidence

**Template Instantiation Endpoint:**
- `POST /api/templates/:templateId/instantiate-v5_1`
- **File:** `zephix-backend/src/modules/templates/controllers/templates.controller.ts` (line 590)
- **Service:** `TemplatesInstantiateV51Service.instantiateV51()`

**Direct Project Creation Endpoint:**
- `POST /api/projects`
- **File:** `zephix-backend/src/modules/projects/projects.controller.ts` (line 59)
- **Service:** `ProjectsService.createWithTemplateSnapshotV1()`
- **DTO:** `CreateProjectDto` (line 102-104: `templateId?: string` - **OPTIONAL**)

**Code Evidence:**
```typescript
// From projects.service.ts:809
if (input.templateId) {
  template = await manager.getRepository(Template).findOne({...});
}
// If no templateId, creates project without template (line 829-845)
```

**Conclusion:** ⚠️ **Template Center is NOT the single path**. Direct project creation without template is possible via `POST /api/projects` with optional `templateId`. External doc claim is **aspirational, not enforced**.

---

### 7. Frontend Router Configuration

**Router File:** `zephix-frontend/src/App.tsx`

**Router Type:** React Router v6
- Uses `BrowserRouter` (line 83)
- Uses `Routes` and `Route` components (lines 85-187)
- **Total Route elements:** 69
- **Total path attributes:** 60

**Route Categories:**
- Public routes: 8 (landing, login, signup, etc.)
- Protected routes: 51 (main app routes)
- Admin routes: 10 (admin panel routes)

**Router Entry Point:** `App.tsx` is the single source of truth for frontend routing.

---

## MISSING COMMANDS/DIRECTORIES

**All commands executed successfully.**

**Note:** `rg` (ripgrep) command not available, used `grep` instead. All searches completed successfully.

---

## DISCREPANCIES FOUND

### Controller Count Discrepancy
- **Previous report:** 48 controllers
- **Actual count:** 78 controllers
- **Reason:** Previous count may have been limited to `src/modules/`, while actual includes all `src/` directories

### Service Count Discrepancy
- **Previous report:** 94 services
- **Actual count:** 151 services
- **Reason:** Same as controllers - broader search scope

### Database Triggers Claim
- **External doc claim:** "Database triggers prevent cross-tenant access"
- **Reality:** RLS exists on `brds` table only. Primary enforcement is application-level via `TenantAwareRepository`.
- **Status:** ⚠️ Claim is partially accurate but misleading

### Template Center Claim
- **External doc claim:** "Template Center is the single path for project creation"
- **Reality:** `POST /api/projects` accepts optional `templateId`. Direct creation without template is possible.
- **Status:** ⚠️ Claim is aspirational, not enforced

---

## NEXT ACTIONS

### Phase 1: Create Inventory Generator
- Create scripts to generate `docs/generated/inventory.json`
- Create GitHub Actions workflow
- Run locally and commit proof

### Phase 2: Replace Legacy Docs
- Remove old markdown docs (except README.md)
- Create new evidence-based docs set
- Link all counts to generated inventory

### Phase 3: Tests and Enforcement
- Add tests for tenant isolation (cross-org access denial)
- Enforce template requirement for project creation (or document as optional)
- Add tests for template creation rules

---

## FILES CREATED

All proof files in `proofs/recovery/commands/`:
- 14 proof files created
- All commands executed successfully
- All evidence captured with timestamps

---

**END OF PHASE 0 SUMMARY**

**Ready for Phase 1:** Yes - All baseline evidence captured.
