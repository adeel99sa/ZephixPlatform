# ADR-007: Governed Mutation Pattern

## Status
Accepted

## Context
Zephix separates execution from governance. Mutations (create, update, delete on domain entities) must flow through a governed pipeline that enforces policy, validates constraints, and produces audit records. Without this, governance becomes a reporting layer instead of an enforcement layer.

## Decision
All backend mutations follow the governed mutation pattern: auth → scope → policy → domain → audit. Frontend receives clear allow/warn/deny responses.

### Backend Pipeline
1. **Auth**: JWT validation, user identity confirmed
2. **Scope**: organization and workspace context verified (`x-workspace-id`)
3. **Policy**: governance rules evaluated (capacity limits, budget thresholds, status transition rules, WIP limits)
4. **Domain**: business logic executes if policy allows
5. **Audit**: mutation recorded with actor, action, entity, timestamp, and policy outcome

### Frontend Contract
- **Allow**: mutation proceeds normally
- **Warn (soft enforcement)**: mutation proceeds after user confirmation (e.g., schedule warnings)
- **Deny (hard enforcement)**: mutation blocked with clear error code and reason (e.g., `WIP_LIMIT_EXCEEDED`, `INVALID_STATUS_TRANSITION`)

### Consistency Rules
- Single mutations and bulk mutations follow the same pipeline
- No hidden bypasses — if a mutation skips policy, it must be explicitly documented
- Error responses include domain-specific codes, not generic 400/500
- Bulk operations use `Promise.allSettled` — partial success is reported per-item

## Why
- Governance must be an enforcement layer, not a reporting afterthought
- Clear allow/warn/deny contract prevents silent policy violations
- Audit trail is non-negotiable for enterprise customers
- Consistent pipeline means governance logic is added once, not per-endpoint
- Frontend can render appropriate UI (confirmation dialogs, error messages) based on response codes

## Consequences
- Every mutation endpoint must include policy evaluation guards
- New governance rules are added to the policy layer, not scattered across controllers
- Bulk endpoints must handle per-item success/failure and report both
- Frontend must handle warn responses with confirmation UI
- Audit service must be called on every successful mutation
- No mutation endpoint should return generic errors without domain-specific codes

## What This Does Not Decide
- Specific governance rules (capacity thresholds, budget limits) — those are product configuration
- Whether policy evaluation is synchronous or event-driven
- Audit retention and compliance export specifics