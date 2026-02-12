# Sprint 10 — Multi-Step Gate Approval Chains

## Objective

Transform Zephix's single-step gate approval (any ADMIN clicks approve) into a
configurable, sequential, multi-step approval chain with role-based routing,
escalation, and per-step notifications. Add acceptance criteria quality checks
to the gate evaluator. No breaking changes. Full backward compatibility.

---

## Architecture Constraints (Non-Negotiable)

1. Existing single-step approval must continue to work unchanged when no chain is configured.
2. All new policies follow 4-level hierarchy: Project > Workspace > Org > System.
3. No controller-level repository usage.
4. All notification routing through `TaskActivityService` → Projector → Dispatch.
5. No hardcoded thresholds, step counts, or escalation timers.
6. Tenancy: every query scoped by `organizationId` + `workspaceId`.
7. Fail-open: if chain service fails, fall back to existing single-step behavior.

---

## Phase 1 — New Entities

### 1.1 `GateApprovalChain` Entity

File: `src/modules/work-management/entities/gate-approval-chain.entity.ts`

```
Table: gate_approval_chains

id                  UUID PK
organization_id     UUID NOT NULL (indexed)
workspace_id        UUID NOT NULL (indexed)
gate_definition_id  UUID NOT NULL FK → phase_gate_definitions.id (UNIQUE)
name                VARCHAR(120) NOT NULL
description         TEXT NULLABLE
is_active           BOOLEAN DEFAULT true
created_by_user_id  UUID NOT NULL
created_at          TIMESTAMP DEFAULT now()
updated_at          TIMESTAMP DEFAULT now()
deleted_at          TIMESTAMP NULLABLE
```

Constraints:
- One chain per gate definition (UNIQUE on gate_definition_id where deleted_at IS NULL).
- Soft-deletable.

### 1.2 `GateApprovalChainStep` Entity

File: `src/modules/work-management/entities/gate-approval-chain-step.entity.ts`

```
Table: gate_approval_chain_steps

id                  UUID PK
organization_id     UUID NOT NULL (indexed)
chain_id            UUID NOT NULL FK → gate_approval_chains.id
step_order          SMALLINT NOT NULL (1-based)
name                VARCHAR(120) NOT NULL
description         TEXT NULLABLE
required_role       VARCHAR(40) NULLABLE   -- e.g. 'ADMIN', 'PMO', 'FINANCE'
required_user_id    UUID NULLABLE           -- specific user (takes precedence over role)
approval_type       ENUM('ANY_ONE', 'ALL')  -- single approver vs unanimous
min_approvals       SMALLINT DEFAULT 1      -- for ALL type: how many needed
auto_approve_after_hours SMALLINT NULLABLE  -- null = no auto-approve
created_at          TIMESTAMP DEFAULT now()
updated_at          TIMESTAMP DEFAULT now()
```

Constraints:
- `step_order` unique per `chain_id`.
- Either `required_role` or `required_user_id` must be set (check constraint).
- `approval_type`: `ANY_ONE` = first qualified approver decides. `ALL` = requires min_approvals.

### 1.3 `GateApprovalDecision` Entity

File: `src/modules/work-management/entities/gate-approval-decision.entity.ts`

```
Table: gate_approval_decisions

id                  UUID PK
organization_id     UUID NOT NULL (indexed)
workspace_id        UUID NOT NULL
submission_id       UUID NOT NULL FK → phase_gate_submissions.id (indexed)
chain_step_id       UUID NOT NULL FK → gate_approval_chain_steps.id
decided_by_user_id  UUID NOT NULL
decision            ENUM('APPROVED', 'REJECTED', 'ABSTAINED')
note                TEXT NULLABLE
decided_at          TIMESTAMP DEFAULT now()
```

Constraints:
- One decision per user per step per submission (UNIQUE on submission_id + chain_step_id + decided_by_user_id).

---

## Phase 2 — Migration

File: `src/migrations/17980260000000-CreateGateApprovalChainTables.ts`

Create all three tables. Seed no data — chains are opt-in per gate definition.

File: `src/migrations/17980261000000-SeedApprovalChainPolicies.ts`

Seed policy definitions:

| Key | Type | Default | Category | Description |
|-----|------|---------|----------|-------------|
| `phase_gate_approval_chain_required` | BOOLEAN | false | GOVERNANCE | When true, gate definitions must have an approval chain before submission is accepted |
| `phase_gate_approval_min_steps` | NUMBER | 1 | GOVERNANCE | Minimum number of approval steps required in a chain. Only enforced when chain is required. |
| `phase_gate_approval_escalation_hours` | NUMBER | 72 | GOVERNANCE | Hours before an unanswered approval step triggers an escalation notification |
| `phase_gate_quality_check_enabled` | BOOLEAN | false | QUALITY | When true, gate evaluator warns when tasks in phase have fewer acceptance criteria than `acceptance_criteria_min_count` policy |

---

## Phase 3 — Approval Chain Service

File: `src/modules/work-management/services/gate-approval-chain.service.ts`

### Responsibilities:

**CRUD operations:**
- `createChain(auth, workspaceId, gateDefinitionId, dto)` — creates chain + steps atomically
- `updateChain(auth, workspaceId, chainId, dto)` — update name, description, reorder steps
- `addStep(auth, workspaceId, chainId, dto)` — add step at position (shift existing)
- `removeStep(auth, workspaceId, chainId, stepId)` — remove step (shift remaining)
- `getChainForDefinition(auth, workspaceId, gateDefinitionId)` — load chain with steps ordered
- `deleteChain(auth, workspaceId, chainId)` — soft delete

**Approval processing:**
- `getActiveStep(submissionId)` — returns the current step that needs decisions
  - Logic: find the lowest `step_order` where required approvals are not yet met
  - If all steps satisfied → chain is complete
- `recordDecision(auth, workspaceId, submissionId, chainStepId, decision, note)` — records a decision
  - Validates user matches required_role or required_user_id
  - Creates `GateApprovalDecision` record
  - If step is now satisfied (enough approvals for type):
    - Emit `GATE_APPROVAL_STEP_APPROVED` or `GATE_APPROVAL_STEP_REJECTED`
    - If rejected: the entire chain is blocked, submission stays SUBMITTED
    - If approved: activate next step (emit `GATE_APPROVAL_STEP_ACTIVATED`)
    - If last step approved: emit `GATE_APPROVAL_CHAIN_COMPLETED`, transition submission to APPROVED
- `getChainStatus(submissionId)` — returns per-step status for UI display

**Chain status return shape:**
```typescript
interface ChainStatusDto {
  chainId: string;
  chainName: string;
  totalSteps: number;
  currentStepOrder: number;
  completed: boolean;
  rejected: boolean;
  steps: ChainStepStatusDto[];
}

interface ChainStepStatusDto {
  stepId: string;
  stepOrder: number;
  name: string;
  requiredRole: string | null;
  requiredUserId: string | null;
  approvalType: 'ANY_ONE' | 'ALL';
  minApprovals: number;
  status: 'PENDING' | 'ACTIVE' | 'APPROVED' | 'REJECTED' | 'SKIPPED';
  decisions: {
    userId: string;
    decision: 'APPROVED' | 'REJECTED' | 'ABSTAINED';
    note: string | null;
    decidedAt: string;
  }[];
}
```

### Backward compatibility:

When `getActiveStep(submissionId)` is called and **no chain exists** for the gate definition:
- Return `null`.
- The existing single-step approval path in `PhaseGatesService.approveSubmission()` remains unchanged.

---

## Phase 4 — Gate Evaluator Changes

### 4.1 Chain-aware evaluation

Modify `PhaseGateEvaluatorService.evaluateSubmission()`:

Current behavior when `sub.status === SUBMITTED`:
- If `requireApprovedSubmission` is true → blocked until APPROVED

New behavior:
- If a chain exists for this gate definition:
  - Load chain status via `GateApprovalChainService.getChainStatus(submissionId)`
  - If chain not complete → status = `SUBMITTED_NOT_APPROVED`, add required action `AWAIT_APPROVAL_CHAIN`
  - If chain complete and all approved → status = `APPROVED`
  - If chain has a rejection → status = `NEEDS_SUBMISSION` (resubmission required)
- If no chain exists → existing single-step behavior unchanged

Add to `GateEvaluationResult`:
```typescript
approvalChainStatus?: ChainStatusDto;  // Optional — only present when chain exists
```

Add to `RequiredAction` type:
```typescript
| 'AWAIT_APPROVAL_CHAIN'
| 'DECIDE_APPROVAL_STEP'
```

### 4.2 Acceptance criteria quality check

Add new merge method: `mergeQualityWarnings()`

Inject: `WorkTask` repository (via TenantAwareRepository)

Logic:
1. Resolve policy `phase_gate_quality_check_enabled`. If false, skip.
2. Resolve policy `acceptance_criteria_min_count` (already exists, default 2).
3. Load tasks in this phase where `status != DONE && status != CANCELED`.
4. Count tasks where `acceptanceCriteria` is null or `acceptanceCriteria.length < minCount`.
5. If any found:
   - HARD mode → add warning (not blocker — quality is advisory)
   - SOFT mode → add warning
   - Warning code: `ACCEPTANCE_CRITERIA_INSUFFICIENT`
   - Message: `{count} task(s) in this phase have fewer than {minCount} acceptance criteria`

This is always a warning, never a blocker. Quality is advisory. Gate blocking is for risk/budget/conflict.

### 4.3 Integration point

The evaluate() method chain becomes:
```
evaluate()
  → evaluateSubmission() — now chain-aware
  → mergeDocumentBlockers()
  → mergeRiskBlockers()
  → mergeBudgetBlockers()
  → mergeResourceConflictBlockers()
  → mergeQualityWarnings()          ← NEW
```

---

## Phase 5 — PhaseGatesService Changes

### 5.1 Submit with chain awareness

Modify `submitSubmission()`:

After transitioning to SUBMITTED:
- Check if gate definition has an approval chain.
- If chain exists:
  - Activate step 1 (emit `GATE_APPROVAL_STEP_ACTIVATED`)
  - Do NOT auto-approve. The submission stays SUBMITTED until chain completes.
- If no chain:
  - Existing behavior unchanged.

### 5.2 Approve with chain awareness

Modify `approveSubmission()`:

- If no chain exists → existing single-step behavior (ADMIN approves directly)
- If chain exists → reject direct approval. Return error:
  `"This gate has a multi-step approval chain. Use the chain approval endpoint."`

### 5.3 New endpoint: Chain approval

New method in `PhaseGatesService` or delegate to `GateApprovalChainService`:

`POST /work-management/:workspaceId/projects/:projectId/gates/:submissionId/chain-decide`

Body: `{ chainStepId: string, decision: 'APPROVED' | 'REJECTED', note?: string }`

This calls `GateApprovalChainService.recordDecision()`.

---

## Phase 6 — New Activity Types

Add to `TaskActivityType` enum:

```typescript
GATE_APPROVAL_STEP_ACTIVATED = 'GATE_APPROVAL_STEP_ACTIVATED',
GATE_APPROVAL_STEP_APPROVED = 'GATE_APPROVAL_STEP_APPROVED',
GATE_APPROVAL_STEP_REJECTED = 'GATE_APPROVAL_STEP_REJECTED',
GATE_APPROVAL_CHAIN_COMPLETED = 'GATE_APPROVAL_CHAIN_COMPLETED',
GATE_APPROVAL_ESCALATED = 'GATE_APPROVAL_ESCALATED',
```

Add to `NOTIFICATION_MAP`:

| Type | Title | Body | Audience | Priority |
|------|-------|------|----------|----------|
| `GATE_APPROVAL_STEP_ACTIVATED` | "Approval required" | "Step {name} requires your approval for gate {gateName}" | Target user/role | HIGH |
| `GATE_APPROVAL_STEP_APPROVED` | "Approval step passed" | "Step {name} approved by {userName}" | submitter + admins | NORMAL |
| `GATE_APPROVAL_STEP_REJECTED` | "Approval step rejected" | "Step {name} rejected by {userName}: {note}" | submitter + admins | HIGH |
| `GATE_APPROVAL_CHAIN_COMPLETED` | "Gate approval chain complete" | "All approval steps passed for gate {gateName}" | submitter + admins | NORMAL |
| `GATE_APPROVAL_ESCALATED` | "Approval overdue" | "Approval step {name} has been pending for {hours}h" | Target user/role + admins | HIGH |

Add `GATE_APPROVAL_STEP_ACTIVATED` and `GATE_APPROVAL_STEP_REJECTED` to `SLACK_ELIGIBLE_EVENTS`.

---

## Phase 7 — Escalation Service

File: `src/modules/work-management/services/gate-approval-escalation.service.ts`

A lightweight scheduled check (not a cron job — triggered by notification poll or health check).

Method: `checkEscalations()`

Logic:
1. Find all submissions in SUBMITTED status where:
   - A chain exists
   - The current active step has no decision yet
   - `submittedAt` or last step activation time > `escalation_hours` ago (from policy)
2. For each: emit `GATE_APPROVAL_ESCALATED` activity
3. De-duplicate: don't escalate the same step twice within 24 hours

Trigger: Call from a `@Cron('0 */6 * * *')` (every 6 hours) or from a dedicated
escalation check endpoint. Use `@Cron` only if `@nestjs/schedule` is already installed.
Otherwise, use a manual trigger endpoint (`POST /work-management/escalation-check`, ADMIN only).

---

## Phase 8 — Controller Changes

### 8.1 Phase Gates Controller

Add endpoints:

```
GET  /work-management/:workspaceId/projects/:projectId/gates/:gateDefinitionId/chain
POST /work-management/:workspaceId/projects/:projectId/gates/:gateDefinitionId/chain
PUT  /work-management/:workspaceId/projects/:projectId/gates/:gateDefinitionId/chain
DELETE /work-management/:workspaceId/projects/:projectId/gates/:gateDefinitionId/chain

GET  /work-management/:workspaceId/projects/:projectId/gates/:submissionId/chain-status
POST /work-management/:workspaceId/projects/:projectId/gates/:submissionId/chain-decide
```

CRUD endpoints: ADMIN only.
Chain-status: Any member.
Chain-decide: User who matches the step's required role or user.

### 8.2 DTOs

File: `src/modules/work-management/dto/gate-approval-chain.dto.ts`

```typescript
class CreateGateApprovalChainDto {
  name: string;
  description?: string;
  steps: CreateChainStepDto[];
}

class CreateChainStepDto {
  name: string;
  description?: string;
  requiredRole?: string;
  requiredUserId?: string;
  approvalType: 'ANY_ONE' | 'ALL';
  minApprovals?: number;
  autoApproveAfterHours?: number;
}

class ChainDecisionDto {
  chainStepId: string;
  decision: 'APPROVED' | 'REJECTED';
  note?: string;
}
```

---

## Phase 9 — Frontend Changes

### 9.1 API types

Extend gate types with chain status types.

### 9.2 Gate Panel enhancement

In the existing `PhaseGatePanel.tsx`:
- If chain exists, show step-by-step approval progress
- Each step: status indicator (pending/active/approved/rejected)
- Active step: show "Approve" / "Reject" buttons for qualified users
- Rejected step: show rejection note and "Resubmit" action

### 9.3 Notification handling

Existing NotificationBell and InboxPage already handle new activity types through the
projector → dispatch → WebSocket pipeline. No frontend notification changes needed.
New activity types auto-surface via the existing `useInbox` hook.

### 9.4 Gate definition editor

When creating/editing a gate definition:
- New section: "Approval Chain" (collapsible)
- Drag-to-reorder steps
- Each step: name, role selector, user selector, approval type toggle
- Policy indicator: "Chain required by organization policy" when policy is true

---

## Phase 10 — Tests

### New test files:

**`gate-approval-chain.service.spec.ts`** — minimum 20 tests:
1. Create chain with 3 steps
2. Step order enforced
3. Record decision for step 1 activates step 2
4. ANY_ONE type: single approval satisfies step
5. ALL type: requires min_approvals before step satisfied
6. Rejection blocks chain progression
7. Chain completion transitions submission to APPROVED
8. User role validation (wrong role rejected)
9. Specific user validation (wrong user rejected)
10. Duplicate decision rejected (same user, same step)
11. Cannot decide on inactive step (must be current)
12. Chain status returns correct step statuses
13. No chain → getActiveStep returns null (backward compat)
14. Tenancy: cross-org chain not visible
15. Tenancy: cross-workspace chain not visible
16. Soft-deleted chain not returned
17. Auto-approve after hours (if implemented)
18. Policy: chain required but not configured → gate blocked
19. Policy: min_steps not met → creation rejected
20. Fail-open: chain service error falls back to single-step

**`phase-gate-evaluator-quality.spec.ts`** — minimum 5 tests:
1. Quality check disabled by policy → no warning
2. Quality check enabled, all tasks have criteria → no warning
3. Quality check enabled, tasks missing criteria → warning
4. Quality check never blocks (always warning)
5. Policy override at project level changes min count

### Updated test files:

**`phase-gate-evaluator.service.spec.ts`** — add chain-aware evaluation tests
**`work-tasks.service.spec.ts`** — no changes needed

---

## Phase 11 — Security Review

1. Only users matching step's `required_role` or `required_user_id` can record decisions.
2. Submitter cannot approve their own submission (self-approval prevention).
3. Chain CRUD restricted to ADMIN/OWNER.
4. Tenancy enforced on all chain queries.
5. Decision notes sanitized (no XSS in stored notes).
6. Escalation notifications do not leak user PII.

---

## Phase 12 — Module Registration

Update `work-management.module.ts`:
- Add `GateApprovalChain`, `GateApprovalChainStep`, `GateApprovalDecision` to `TypeOrmModule.forFeature`
- Add `GateApprovalChainService` to providers
- Add `GateApprovalEscalationService` to providers (if cron-based)

---

## Phase 13 — Manual Test Script

1. Create gate definition on a phase.
2. Create 3-step approval chain: Step 1 = PMO, Step 2 = Finance, Step 3 = ADMIN.
3. Submit gate → verify step 1 activated, PMO user receives notification.
4. PMO approves → verify step 2 activated, Finance user receives notification.
5. Finance approves → verify step 3 activated, ADMIN receives notification.
6. ADMIN approves → verify chain complete, submission transitions to APPROVED.
7. Resubmit test: submit new gate, step 1 rejects → verify chain blocked, submitter notified.
8. Backward compat: gate without chain → existing single-step approval works.
9. Policy test: set `phase_gate_approval_chain_required` = true → verify gate blocked without chain.
10. Policy test: set `phase_gate_approval_min_steps` = 2 → verify 1-step chain rejected on creation.
11. Quality test: enable quality check → verify warning when tasks lack acceptance criteria.
12. Escalation test: wait for escalation window → verify notification sent (or simulate with reduced hours).

---

## Definition of Done

- No hardcoded thresholds.
- No controller-level repository usage.
- No breaking response shapes. `GateEvaluationResult` extended, not modified.
- Existing single-step approval works unchanged when no chain configured.
- 25+ new tests passing.
- TypeScript clean.
- Linter clean.
- All activity types routed through projector.
- Policy-driven chain requirements.
- Self-approval prevented.
- Tenancy enforced.

---

## Files Changed Summary (Expected)

### New files:
- `entities/gate-approval-chain.entity.ts`
- `entities/gate-approval-chain-step.entity.ts`
- `entities/gate-approval-decision.entity.ts`
- `services/gate-approval-chain.service.ts`
- `services/gate-approval-escalation.service.ts`
- `dto/gate-approval-chain.dto.ts`
- `migrations/17980260000000-CreateGateApprovalChainTables.ts`
- `migrations/17980261000000-SeedApprovalChainPolicies.ts`
- `services/gate-approval-chain.service.spec.ts`
- `services/phase-gate-evaluator-quality.spec.ts`

### Modified files:
- `enums/task.enums.ts` — 5 new activity types
- `services/phase-gate-evaluator.service.ts` — chain-aware evaluation + quality warnings
- `services/phase-gates.service.ts` — chain-aware submit/approve
- `controllers/phase-gates.controller.ts` — chain endpoints
- `work-management.module.ts` — register new entities and services
- `notifications/services/activity-notification-projector.service.ts` — 5 new notification mappings
- `policies/entities/policy-definition.entity.ts` — 4 new policy definitions
- Frontend: `PhaseGatePanel.tsx`, gate API types, gate definition editor
