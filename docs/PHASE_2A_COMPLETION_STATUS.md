# Phase 2a Completion Status & Next Steps

## ✅ Phase 2a Core Objectives - COMPLETE

### High-Risk Modules Migrated
- ✅ WorkspacesModule
- ✅ ResourcesModule (including allocations, capacity)
- ✅ RisksModule (including cron with runWithTenant)
- ✅ IntegrationsModule (webhook controller)
- ✅ ProjectsModule
- ✅ WorkItemsModule
- ✅ TemplatesModule

### Infrastructure Complete
- ✅ TenantContextService with AsyncLocalStorage
- ✅ TenantContextInterceptor (sets/clears context)
- ✅ TenantAwareRepository (DAL enforcement)
- ✅ WorkspaceScoped decorator
- ✅ Provider factory helper
- ✅ ESLint/CI guardrails
- ✅ Tests (isolation, concurrency, cross-tenant 403)
- ✅ Background script support (runWithTenant)

## 📋 Policy Decisions

### Cross-Tenant Workspace Access: 403 Forbidden

**Decision**: Standardized to **403 Forbidden** for all cross-tenant workspace access attempts.

**Rationale**:
- Consistent "permission denied" semantics across the API
- Matches existing guard behavior (`RequireWorkspaceAccessGuard`)
- Clear security boundary: "You don't have permission" vs "Resource doesn't exist"

**Trade-off**: Slightly more information leakage (confirms workspace ID format is valid), but provides clearer error semantics for clients.

**Implementation**: Applied consistently across all workspace-scoped endpoints.

**Documentation**: This decision is locked. If threat model changes require 404, update all guards and controllers in one coordinated change.

## 🔧 Remaining Work

### 1. Extend Guardrail Scope

**Current**: `lint:tenancy-guard` scans only `src/modules`

**Gap**: Bypass patterns can exist in:
- `scripts/` (background jobs, seeds)
- `test/` helpers
- `src/pm/` (legacy modules)
- `src/` bootstrap code

**Action**: Create `lint:tenancy-guard-full` that scans entire backend except:
- `migrations/`
- `node_modules/`
- `dist/`
- `src/modules/tenancy/` (infrastructure)
- `src/database/` (infrastructure)

**Priority**: Medium (after remaining module migrations)

### 2. Coverage Gaps - Remaining Modules

**High Priority** (cross-workspace rollup risk):
- ⚠️ PortfoliosModule
- ⚠️ ProgramsModule

**Medium Priority**:
- BillingModule
- Subscriptions (if separate)
- TasksModule (partial - some methods already migrated)

**Low Priority**:
- TeamsModule
- CustomFieldsModule
- Other feature modules

**Action Plan**:
1. Migrate PortfoliosModule (highest risk for cross-workspace rollups)
2. Migrate ProgramsModule (similar risk)
3. Add proof points: one org-scoped endpoint + one workspace-scoped endpoint per module
4. Verify 403 behavior is consistent

### 3. Worker Model Readiness (Phase 2b Prep)

**Current State**:
- ✅ `runWithTenant` helper exists
- ✅ Hard fail on missing organizationId (via `assertOrganizationId()`)

**Phase 2b Requirements**:
- Safe way to derive tenant from job payload
- Hard fail if tenant context missing inside job (already implemented)

**Status**: ✅ Ready for Phase 2b. No additional work needed in Phase 2a.

## 📝 Updated Prompt Edits

### Edit 1: Remove Read Query Subscriber Language
**Status**: ✅ Already excluded. Prompt explicitly states "No read query scoping via TypeORM subscriber."

### Edit 2: Hard Fail on Missing Tenant
**Status**: ✅ Already implemented. `TenantAwareRepository.assertOrganizationId()` throws if missing.

## 🎯 Next Steps: Remaining Module Migrations

### Priority Order

1. **PortfoliosModule** (HIGHEST RISK)
   - Cross-workspace rollups are common
   - Easy to accidentally bypass scoping
   - Add proof: org-scoped portfolio list + workspace-scoped portfolio detail

2. **ProgramsModule** (HIGH RISK)
   - Similar to portfolios
   - Cross-workspace aggregation patterns
   - Add proof: org-scoped program list + workspace-scoped program detail

3. **BillingModule** (MEDIUM RISK)
   - Typically org-scoped only
   - Lower risk but should be consistent

4. **TasksModule** (MEDIUM RISK)
   - Some methods already migrated
   - Complete remaining methods

5. **Other Modules** (LOW RISK)
   - Incremental migration following playbook

### Migration Checklist Per Module

For each remaining module:
- [ ] Add `createTenantAwareRepositoryProvider(Entity)` in module
- [ ] Replace `@InjectRepository` with `TenantAwareRepository` injection
- [ ] Replace `createQueryBuilder()` with `repo.qb()`
- [ ] Remove manual `organizationId` filters
- [ ] Add unit test proving tenant scoping
- [ ] Add cross-tenant negative test (403 for workspace-scoped, isolation for org-scoped)
- [ ] Verify CI passes

## 📊 Completion Metrics

**Phase 2a Core**: ✅ 100% Complete
- High-risk modules: 7/7 migrated
- Infrastructure: 8/8 components complete
- Tests: All required tests added
- CI: Guardrails active

**Phase 2a Extended** (remaining modules): ⚠️ 0/5+ modules migrated
- PortfoliosModule: Pending
- ProgramsModule: Pending
- BillingModule: Pending
- TasksModule: Partial
- Others: Pending

## 🔒 Locked Decisions

1. **403 Forbidden** for cross-tenant workspace access (documented above)
2. **No read scoping in subscriber** (only optional write subscriber)
3. **Hard fail on missing tenant** (no silent fallback)
4. **AsyncLocalStorage** for concurrency safety
5. **DAL enforcement** (not guards or middleware for scoping)

## 📚 References

- Migration Playbook: `docs/PHASE2A_MIGRATION_PLAYBOOK.md`
- Verification Report: `PHASE_2A_VERIFICATION_REPORT.md`
- Final Summary: `PHASE_2A_FINAL_SUMMARY.md`


