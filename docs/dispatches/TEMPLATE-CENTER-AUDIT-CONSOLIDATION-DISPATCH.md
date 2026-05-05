# DISPATCH: TemplateCenterAuditService Consolidation

**Status:** Authored 2026-05-04. Awaiting Phase 0 reconnaissance gate before implementation.
**Author:** Solution Architect (Claude)
**Type:** Backend refactor + migration. Production data integrity fix.
**Phase B Blocker:** YES — Engine 4 Phase B cannot merge until this dispatch closes.
**Surfaced by:** Engine 4 Phase A reconnaissance (PR #245). Sequencing change committed in Section 8 architect decisions.
**Path commitment:** Path B (consolidate) — eliminate TemplateCenterAuditService entirely, migrate 7 call sites to AuditService.record().

---

## Why this dispatch exists

`TemplateCenterAuditService.emit()` is broken at multiple levels:

1. **Field name drift:** Uses `eventType`, `userId`, `oldState`, `newState`, `metadata` — entity has `action`, `actorUserId`, `beforeJson`, `afterJson`, `metadataJson`. The `as DeepPartial<AuditEvent>` cast suppresses TS errors. TypeORM silently drops unmapped fields at write time.

2. **Missing required fields:** Doesn't pass `organizationId` or `actorPlatformRole` (NOT NULL columns on entity). Even if field names were correct, INSERT would fail at constraint level.

3. **CHECK constraint rejection:** Even if fields were correct AND required fields were passed, the 6 action values used (`TEMPLATE_APPLIED`, `TEMPLATE_APPLY_FAILED`, `GATE_DECIDE`, `GATE_DECIDE_BLOCKED`, `DOC_TRANSITION`, `DOCUMENT_TRANSITION_FAILED`) are NOT in `CHK_audit_events_action` allow-list. INSERT would fail at CHECK constraint.

**Net production behavior:** Every `TemplateCenterAuditService.emit()` call silently fails. All 7 call sites across 3 services have been writing zero audit events to production since this code shipped.

**Why this is Phase B blocker:**
Engine 4 Phase B makes Template Center the canonical apply path. Every template application generates audit events through this broken service. Without this dispatch, Phase B introduces a regression in audit trail coverage exactly when Template Center becomes load-bearing for the platform's compliance posture.

**Path commitment per architect decision (PR #245 Section 8 Q6):** Consolidate TemplateCenterAuditService into existing `AuditService.record()`. Same anti-pattern AD-029 resolved for templates and AD-030 v2 resolved for modules: don't keep parallel infrastructure alive.

---

## Scope

### What this dispatch IS

Backend refactor consolidating Template Center audit event writes into the existing `AuditService.record()` pattern. Five phases:

1. Extend `AuditAction` enum with 6 new values
2. Extend `AuditEntityType` enum with 3 new values
3. Migration: expand `CHK_audit_events_action` constraint with 6 new values
4. Migrate 7 call sites across 3 services from `templateCenterAuditService.emit()` to `auditService.record()`
5. Delete `TemplateCenterAuditService` and supporting wiring entirely

### What this dispatch is NOT

- NOT extending `AuditService.record()` — recon proved it's a superset of TC needs as-is
- NOT changing `audit_events` table schema (constraint expansion only, no column changes)
- NOT changing audit retention or query patterns
- NOT touching auth-domain `@AuditGuardDecision` decorator coverage
- NOT touching `GuardAuditInterceptor` global mechanism
- NOT touching Engine 4 Phase B template work itself (this is Phase B prerequisite)
- NOT addressing other parallel audit anti-patterns elsewhere (e.g., direct `manager.create(AuditEvent, ...)` patterns) — separate cleanup if needed

### Hard scope boundary

Three files in TC services + 1 enum file + 1 migration + 1 deletion = bounded change. If executor finds a fourth call site or fifth service that uses TemplateCenterAuditService, STOP and report — recon said exactly 7 call sites.

---

## Phase 0: Pre-flight reconnaissance

Before implementation, verify state hasn't drifted since recon was captured.

### Reconnaissance commands

```bash
# 1. Confirm 7 call sites still exist (recon baseline)
grep -rn "templateCenterAuditService\|TemplateCenterAuditService" zephix-backend/src --include="*.ts" -l | head -20

# 2. Confirm exact file locations
find zephix-backend/src -name "audit-events.service.ts" -path "*template-center*"
find zephix-backend/src -name "template-apply.service.ts"
find zephix-backend/src -name "gate-approvals.service.ts"
find zephix-backend/src -name "document-lifecycle.service.ts"

# 3. Confirm AuditAction enum location and current contents
cat zephix-backend/src/modules/audit/audit.constants.ts

# 4. Confirm AuditService.record() signature unchanged from recon
grep -A 30 "async record" zephix-backend/src/modules/audit/audit.service.ts

# 5. Confirm current CHECK constraint contents on staging
psql $STAGING_DATABASE_URL -c "SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'CHK_audit_events_action';"

# 6. Confirm TemplateCenterAuditService still wired in TemplateCenterModule
grep -rn "TemplateCenterAuditService\|AuditEventsService" zephix-backend/src/modules/template-center --include="*.ts"

# 7. Identify all imports of TemplateCenterAuditService
grep -rn "from.*audit-events.service\|TemplateCenterAuditService" zephix-backend/src --include="*.ts"
```

### Gate 2 stop conditions

After Phase 0 commands run, paste raw outputs to architect. **HALT and await architect "PROCEED TO IMPLEMENTATION"** before any code changes.

**HALT additionally if:**
- More than 7 call sites discovered → STOP, report all of them
- Call sites in services other than the 3 known → STOP, report
- AuditService.record() signature has changed since recon → STOP, report new signature
- CHECK constraint already includes some of the 6 new values → STOP, report which ones
- TemplateCenterAuditService is consumed outside template-center module → STOP, report (would expand scope)

---

## Phase 1: Extend audit enums

### Changes to `audit.constants.ts`

**File:** `zephix-backend/src/modules/audit/audit.constants.ts`

Add to `AuditAction` enum:

```typescript
export enum AuditAction {
  // ... existing values preserved exactly ...

  // Template Center actions (added by TC consolidation)
  TEMPLATE_APPLIED = 'TEMPLATE_APPLIED',
  TEMPLATE_APPLY_FAILED = 'TEMPLATE_APPLY_FAILED',
  GATE_DECIDE = 'GATE_DECIDE',
  GATE_DECIDE_BLOCKED = 'GATE_DECIDE_BLOCKED',
  DOC_TRANSITION = 'DOC_TRANSITION',
  DOCUMENT_TRANSITION_FAILED = 'DOCUMENT_TRANSITION_FAILED',
}
```

Add to `AuditEntityType` enum:

```typescript
export enum AuditEntityType {
  // ... existing values preserved exactly ...

  // Template Center entity types (added by TC consolidation)
  TEMPLATE_LINEAGE = 'TEMPLATE_LINEAGE',
  GATE_APPROVAL = 'GATE_APPROVAL',
  DOCUMENT_INSTANCE = 'DOCUMENT_INSTANCE',
}
```

**HARD CONSTRAINT:** Existing enum values preserved EXACTLY. Order preserved. Only additions.

---

## Phase 2: CHECK constraint migration

### New migration file

**File:** `zephix-backend/src/migrations/18000000000083-ExpandAuditEventsActionConstraintForTemplateCenter.ts`

Pattern follows migration 082 (PR #244): DROP CONSTRAINT + ADD CONSTRAINT with expanded allow-list.

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class ExpandAuditEventsActionConstraintForTemplateCenter1800000000083
  implements MigrationInterface
{
  name = 'ExpandAuditEventsActionConstraintForTemplateCenter1800000000083';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Drop existing constraint
    await queryRunner.query(`
      ALTER TABLE audit_events DROP CONSTRAINT IF EXISTS "CHK_audit_events_action";
    `);

    // Step 2: Recreate with full existing allow-list PLUS 6 new TC values
    await queryRunner.query(`
      ALTER TABLE audit_events ADD CONSTRAINT "CHK_audit_events_action" CHECK (
        action IN (
          -- Existing values from migration 082 (PR #244) - PRESERVE ALL
          [paste full existing allow-list from Phase 0 recon output here],

          -- New TC values
          'TEMPLATE_APPLIED',
          'TEMPLATE_APPLY_FAILED',
          'GATE_DECIDE',
          'GATE_DECIDE_BLOCKED',
          'DOC_TRANSITION',
          'DOCUMENT_TRANSITION_FAILED'
        )
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverse: drop expanded constraint, restore prior (post-082) constraint
    await queryRunner.query(`
      ALTER TABLE audit_events DROP CONSTRAINT IF EXISTS "CHK_audit_events_action";
    `);

    await queryRunner.query(`
      ALTER TABLE audit_events ADD CONSTRAINT "CHK_audit_events_action" CHECK (
        action IN (
          [paste prior post-082 allow-list — without the 6 TC values]
        )
      );
    `);
  }
}
```

**CRITICAL:** Phase 0 recon must capture the FULL current CHECK constraint definition. Use that captured list to populate the migration. **Do NOT type from memory.** Copy verbatim from `pg_get_constraintdef` output.

**Migration verification (executor responsibility):**
1. Apply migration on test DB → confirm constraint includes all prior values + 6 new
2. Reverse migration → confirm constraint restored to post-082 state
3. Apply migration again → confirm clean re-apply
4. Test INSERT with each of 6 new action values → confirm no constraint violation

---

## Phase 3: Migrate 7 call sites

### Call site inventory (from recon)

| File | Line | Current eventType value | New action value | Entity type |
|---|---|---|---|---|
| `template-center/apply/template-apply.service.ts` | 84 | `TEMPLATE_APPLY_FAILED` | `AuditAction.TEMPLATE_APPLY_FAILED` | `TEMPLATE_LINEAGE` |
| `template-center/apply/template-apply.service.ts` | 300 | `TEMPLATE_APPLIED` | `AuditAction.TEMPLATE_APPLIED` | `TEMPLATE_LINEAGE` |
| `template-center/gates/gate-approvals.service.ts` | 150 | `GATE_DECIDE_BLOCKED` | `AuditAction.GATE_DECIDE_BLOCKED` | `GATE_APPROVAL` |
| `template-center/gates/gate-approvals.service.ts` | 192 | `GATE_DECIDE` | `AuditAction.GATE_DECIDE` | `GATE_APPROVAL` |
| `template-center/documents/document-lifecycle.service.ts` | 117 | `DOCUMENT_TRANSITION_FAILED` | `AuditAction.DOCUMENT_TRANSITION_FAILED` | `DOCUMENT_INSTANCE` |
| `template-center/documents/document-lifecycle.service.ts` | 137 | `DOCUMENT_TRANSITION_FAILED` | `AuditAction.DOCUMENT_TRANSITION_FAILED` | `DOCUMENT_INSTANCE` |
| `template-center/documents/document-lifecycle.service.ts` | 168 | `DOCUMENT_TRANSITION_FAILED` | `AuditAction.DOCUMENT_TRANSITION_FAILED` | `DOCUMENT_INSTANCE` |
| `template-center/documents/document-lifecycle.service.ts` | 226 | `DOC_TRANSITION` | `AuditAction.DOC_TRANSITION` | `DOCUMENT_INSTANCE` |

**Total: 8 emit() call sites in 3 service files** (recon said 7 — one document-lifecycle service may have either 3 or 4 calls; verify in Phase 0).

### Migration pattern per call site

**Before (broken pattern):**

```typescript
await this.templateCenterAuditService.emit({
  eventType: 'TEMPLATE_APPLIED',
  entityType: 'TemplateLineage',
  entityId: lineage.id,
  userId: actor.userId,
  workspaceId: project.workspaceId,
  projectId: project.id,
  oldState: null,
  newState: { templateKey, version, kpisCreated },
  metadata: { source: 'apply' },
});
```

**After (consolidated to AuditService):**

```typescript
await this.auditService.record({
  organizationId: project.organizationId,
  workspaceId: project.workspaceId,
  actorUserId: actor.userId,
  actorPlatformRole: actor.platformRole, // resolved from auth context
  entityType: AuditEntityType.TEMPLATE_LINEAGE,
  entityId: lineage.id,
  action: AuditAction.TEMPLATE_APPLIED,
  before: null,
  after: { templateKey, version, kpisCreated },
  metadata: {
    source: 'template_apply',
    projectId: project.id, // preserved in metadata since not first-class
  },
});
```

### Field mapping rules

| TC field | AuditService field | Notes |
|---|---|---|
| `eventType` | `action` (typed enum) | Use `AuditAction.<VALUE>`, not raw string |
| `entityType` | `entityType` (typed enum) | Use `AuditEntityType.<VALUE>` |
| `entityId` | `entityId` (string, NOT NULL) | If null at call site, see below |
| `userId` | `actorUserId` | Resolved from auth context |
| (missing) | `organizationId` | NEW required field — resolve from entity or context |
| (missing) | `actorPlatformRole` | NEW required field — resolve from auth context |
| `workspaceId` | `workspaceId` | Same name |
| `projectId` | (preserved in `metadata.projectId`) | NOT first-class on AuditEvent entity |
| `oldState` | `before` | Direct rename |
| `newState` | `after` | Direct rename |
| `metadata` | `metadata` | Same name (sanitization automatic) |

### Handling null entityId

Recon noted: `entityId: null` at some failed-event call sites. AuditService.record() requires `entityId: string`.

**Resolution per call site type:**

- **TEMPLATE_APPLY_FAILED at line 84:** entityId should be the template definition ID being applied (always available at call site, not lineage ID since lineage may not exist yet).
- **GATE_DECIDE_BLOCKED at line 150:** entityId should be the gate approval ID being attempted.
- **DOCUMENT_TRANSITION_FAILED at lines 117, 137, 168:** entityId should be the document instance ID.

**HARD CONSTRAINT:** entityId is always non-null. If a call site genuinely has no entity reference, that's a design issue surfaced by this migration — STOP and report to architect, do not use placeholder UUIDs.

### Resolving organizationId and actorPlatformRole

Required NOT NULL fields not currently passed at any TC call site. Two resolution paths per call site:

**Path 1 (preferred): from existing entity context.**
Most TC call sites have access to a `project`, `workspace`, or `lineage` entity. `project.organizationId` is the right source.

**Path 2 (fallback): from auth context.**
If no entity context available, inject `TenantContextService` (existing pattern) and resolve from there:

```typescript
constructor(
  // ... existing deps ...
  private readonly tenantContext: TenantContextService,
  private readonly auditService: AuditService, // replacing templateCenterAuditService
) {}

// In method:
const orgId = this.tenantContext.getOrganizationId();
const platformRole = this.tenantContext.getActorPlatformRole();
```

**Per-call-site resolution (executor decides at implementation time, verify at PR review):**

| Call site | organizationId source | actorPlatformRole source |
|---|---|---|
| template-apply.service.ts:84 | `project.organizationId` | `actor.platformRole` (existing param) |
| template-apply.service.ts:300 | `project.organizationId` | `actor.platformRole` |
| gate-approvals.service.ts:150 | `gate.project.organizationId` | tenantContext fallback |
| gate-approvals.service.ts:192 | `gate.project.organizationId` | tenantContext fallback |
| document-lifecycle.service.ts:117 | `documentInstance.project.organizationId` | tenantContext fallback |
| document-lifecycle.service.ts:137 | `documentInstance.project.organizationId` | tenantContext fallback |
| document-lifecycle.service.ts:168 | `documentInstance.project.organizationId` | tenantContext fallback |
| document-lifecycle.service.ts:226 | `documentInstance.project.organizationId` | tenantContext fallback |

If any of these can't resolve cleanly, STOP and report — alternative is to defer that call site, not paper over with bad data.

### Service constructor changes

In each of the 3 service files, replace dependency injection:

**Remove:**
```typescript
private readonly templateCenterAuditService: TemplateCenterAuditService,
```

**Add (if not already present):**
```typescript
private readonly auditService: AuditService,
```

If `TenantContextService` injection needed for organizationId/actorPlatformRole resolution, add that too.

---

## Phase 4: Delete TemplateCenterAuditService

After all 8 call sites migrated and tests passing:

### Files to delete

```bash
zephix-backend/src/modules/template-center/audit/audit-events.service.ts
zephix-backend/src/modules/template-center/audit/audit-events.service.spec.ts (if exists)
```

### Module wiring updates

**File:** `zephix-backend/src/modules/template-center/template-center.module.ts` (or wherever TemplateCenterAuditService is registered)

- Remove `TemplateCenterAuditService` from `providers: []`
- Remove import statement
- Remove from any `exports: []` if exported

**File:** `zephix-backend/src/modules/template-center/audit/audit.module.ts` (if exists as separate audit module)

- May be deletable entirely if it only exists to wrap TemplateCenterAuditService
- If deletable: also remove from parent module imports

### Verify zero remaining references

```bash
# Should return zero matches after deletion
grep -rn "TemplateCenterAuditService\|templateCenterAuditService" zephix-backend/src --include="*.ts"
grep -rn "audit-events.service" zephix-backend/src/modules/template-center --include="*.ts"
```

If any matches remain, STOP — incomplete deletion will cause runtime errors.

---

## Phase 5: Tests and verification

### Required tests

**Unit tests (per migrated service):**
- Verify `auditService.record()` is called with correct shape (organizationId, actorUserId, action, entityType, etc.)
- Verify field name mapping (no `eventType`, no `userId`, no `oldState`/`newState`)
- Verify enum usage (not raw strings for action/entityType)

**Integration tests:**
- Apply a template → verify audit_events row written with `action='TEMPLATE_APPLIED'` and correct fields
- Trigger TEMPLATE_APPLY_FAILED path → verify audit_events row with `action='TEMPLATE_APPLY_FAILED'`
- Decide a gate → verify GATE_DECIDE row
- Block a gate → verify GATE_DECIDE_BLOCKED row
- Transition a document → verify DOC_TRANSITION row
- Fail document transition → verify DOCUMENT_TRANSITION_FAILED row

**Migration tests:**
- Forward migration runs cleanly on test DB
- Reverse migration restores prior constraint state
- Forward again → clean re-apply
- INSERT with each new action value succeeds

**Regression tests:**
- All existing audit-related tests still pass (no regressions in 30 existing AuditAction values)
- Permission matrix preserved (84/84 PASS)
- TS compile succeeds (`tsc --noEmit`)
- Build succeeds (`npm run build`)

### Performance check

`auditService.record()` should perform equivalently or better than `templateCenterAuditService.emit()` (which was always failing). No specific performance test required — replacing a no-op write with a successful write is monotonically better.

---

## Hard constraints

### CONSTRAINT 1: Migration additive only

CHECK constraint expansion is ADDITIVE. ALL existing values preserved. Only 6 new TC values added. Down() restores prior post-082 state. HALT if executor finds need to remove existing values.

### CONSTRAINT 2: Bounded scope

Three TC service files modified. Audit constants extended. One migration added. TemplateCenterAuditService deleted. NO other changes. HALT if executor finds urge to "while I'm in here, also fix..."

### CONSTRAINT 3: Field mapping discipline

Every TC `emit()` call becomes an `auditService.record()` call. Field names mapped exactly per the table above. NO new fields invented. NO existing data dropped without metadata preservation (e.g., projectId moves to metadata, not lost).

### CONSTRAINT 4: Required fields enforced

Every call site provides organizationId and actorPlatformRole. If a call site can't resolve them cleanly, STOP and report. Do NOT use placeholder values like `'unknown'` or `'system'`.

### CONSTRAINT 5: Reversibility

Migration must be reversible. Code changes can be reverted via git. Combined revert (migration down + code revert) must restore working state.

### CONSTRAINT 6: Single PR

This entire dispatch ships as ONE PR. Reasoning:
- Enum extension + migration + call site migration + service deletion are interdependent
- Cannot land migration without call sites updated (would expose constraint to broken code)
- Cannot land call sites without migration (constraint rejects new values)
- Cannot delete service without call sites migrated (compile error)

If PR diff exceeds reasonable review size, may split:
- PR 1: Phase 1 + 2 (enums + migration only) — safe to land alone, just makes new values available
- PR 2: Phases 3-5 (call site migration + service deletion + tests) — depends on PR 1

Default: single PR. Split only if reviewer requests.

### CONSTRAINT 7: No silent failures preserved

Audit writes that previously failed silently must now succeed. If executor encounters a call site where resolution is genuinely impossible (no organizationId derivable, no entityId derivable), STOP and report — do not preserve silent failure.

### CONSTRAINT 8: Pre-investigation discipline

Phase 0 reconnaissance is mandatory. Recon outputs reviewed by architect before implementation begins. This prevents the AD-024/AD-030 v1 pattern of producing against assumed state.

---

## Sequencing and PR dependencies

### Upstream dependencies (must be complete before this dispatch can merge)

- ✓ PR #244 merged (foundational migration 082 establishing CHECK constraint expansion pattern)
- ✓ PR #245 merged (Engine 4 Phase A inventory committed)
- No other dependencies

### Downstream dependencies (waiting on this dispatch)

- Engine 4 Phase B dispatch — cannot merge until this dispatch closes
- Future audit-trail consolidation work (e.g., other parallel `manager.create(AuditEvent, ...)` patterns) — separate dispatches

### Sequencing

```
PR #244 ✓ → PR #245 ✓ → THIS DISPATCH → Phase B → Phase C → ... → Engine 4 complete
```

This dispatch is the gating step between Engine 4 Phase A complete and Phase B starting.

---

## Risks and mitigations

### Risk 1: Hidden audit consumers downstream

**Risk:** Some compliance/reporting system may query audit_events filtered by `event_type` (old field name) or specific old-vocabulary values. Migration breaks them.

**Mitigation:** Recon found audit_events distribution healthy (644 events with actions like `org_created`, `update`, `PHASE_CREATED`). No `eventType` column on table — only `action`. The "old field names" only existed at the TS service layer, never in DB. Risk is theoretical.

**Verification:** Phase 0 recon includes `SELECT DISTINCT action FROM audit_events` to confirm vocabulary in production.

### Risk 2: Auth context unavailable in some flows

**Risk:** Some TC call sites may run in async contexts (queue processors, background jobs) where `TenantContextService` doesn't have request-scoped data populated.

**Mitigation:** All 8 call sites are in synchronous request-handling services (template apply, gate decide, document transition). None are queue-driven per recon. If executor finds otherwise, STOP and report.

### Risk 3: Test coverage for migrated code

**Risk:** Existing TemplateCenterAuditService tests (if any) were testing broken behavior. Tests pass != code works. Migration to AuditService.record() is the first time this code actually writes audit events.

**Mitigation:** Phase 5 mandates integration tests that verify audit_events ROWS, not just service method calls. Round-trip verification: trigger event → query DB → confirm row exists with correct fields.

### Risk 4: Constraint expansion ordering

**Risk:** If migration runs but code deploy lags (e.g., partial deploy failure), staging is in a state where constraint allows new values but no code writes them. Or vice versa: code deploys before migration applies, and writes get rejected.

**Mitigation:**
- Single PR ensures atomicity at PR level
- Railway pre-deploy hook runs migrations BEFORE deploying new code
- If migration fails, deploy aborts (no code change reaches users)
- If code change deploys without migration (shouldn't happen with Railway hook), CHECK constraint rejection is loud (transaction rollback) not silent — surfaces immediately

### Risk 5: Performance regression

**Risk:** `auditService.record()` may be slower than no-op failing emit (which was returning early on caught error).

**Mitigation:** Successful write is the correct behavior. Audit failures should not be performance-optimized. AuditService.record() catches errors and logs — doesn't throw — so user-facing latency is bounded.

---

## Estimated effort

- **Phase 0 reconnaissance:** ~30 min (executor)
- **Phase 1 enum extensions:** ~30 min (executor)
- **Phase 2 migration:** ~1 hour (executor) — includes verification cycle
- **Phase 3 call site migration:** ~3-4 hours (executor) — 8 call sites with context resolution per site
- **Phase 4 service deletion:** ~30 min (executor)
- **Phase 5 tests + verification:** ~2-3 hours (executor)
- **Total executor work:** ~7-9 hours, single focused day or split across two days

- **Architect review at Gate 2:** ~30 min (after Phase 0 recon)
- **Architect review at Gate 4:** ~30 min (pre-PR)
- **Architect review of PR:** ~45 min (PR description + diff review)

---

## Success criteria

PR closes successfully when ALL of the following are true:

- [ ] Phase 0 recon confirmed scope (8 call sites, 3 services)
- [ ] AuditAction enum has 6 new TC values
- [ ] AuditEntityType enum has 3 new TC values
- [ ] Migration 18000000000083 applied cleanly with up/down/up cycle verified
- [ ] All 8 call sites migrated to `auditService.record()` with correct field mapping
- [ ] All 8 call sites pass organizationId and actorPlatformRole correctly
- [ ] TemplateCenterAuditService file deleted
- [ ] Module wiring updated (no orphaned references)
- [ ] `grep -rn "TemplateCenterAuditService"` returns zero matches
- [ ] All TS compile passes
- [ ] All build passes
- [ ] Integration tests verify audit_events rows written for all 6 new actions
- [ ] Permission matrix preserved (84/84 PASS)
- [ ] PR description follows PR #243 template
- [ ] Manual local round-trip OR explicit Path B (post-merge staging verification) chosen and documented

---

## Post-merge verification checklist (for PR description)

After PR merges and Railway deploys:

- [ ] Migration 18000000000083 applied on staging (verify via Railway boot logs + `pg_get_constraintdef` query)
- [ ] On staging: apply a template → verify audit_events row with `action='TEMPLATE_APPLIED'`
- [ ] On staging: decide a gate → verify audit_events row with `action='GATE_DECIDE'`
- [ ] On staging: transition a document → verify audit_events row with `action='DOC_TRANSITION'`
- [ ] No new errors in Railway logs for 24h post-deploy
- [ ] Permission matrix re-run on staging → 84/84 PASS preserved
- [ ] Confirm Engine 4 Phase B dispatch can now author against unblocked state

---

## Engine 4 Phase B unblock

Once this dispatch merges and post-merge verification confirms TC audit events are writing correctly, Engine 4 Phase B is unblocked. Phase B dispatch authoring can begin.

Phase B will then make Template Center the canonical apply path with confidence that template application audit events are persisting correctly — the integrity guarantee that TC consolidation provides.

---

## Document end

This dispatch is binding until executor reports Phase 0 outputs. Architect reviews recon at Gate 2 and may revise Phase 1-5 scope based on what state has drifted (e.g., new call sites discovered).
