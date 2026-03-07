# Implementation Change Template

Use this template before starting any implementation lane.

## 0) Hard Start Gate (must be PASS before coding)

- [ ] `git status --short` is clean
- [ ] `node -v` is v20.x
- [ ] `bash scripts/smoke/run.sh guard` passes

If any item fails, stop. No coding starts.

## 1) Change Intake

- change_id:
- lane_id:
- owner:
- date_utc:
- production_impacting: yes | no
- pilot_impacting: yes | no

## 2) Scope and Non-Goals

- problem_statement:
- scope_in:
- scope_out (non-goals):

## 3) Impact Mapping

### Backend impact

- impacted_backend_files:
- impacted_endpoints:
- guard_or_auth_changes:
- migration_required: yes | no

### Frontend impact

- impacted_frontend_files:
- route_or_permission_changes:

### Contract impact

- contract_files_to_add_or_update:
- api_behavior_change: yes | no

### Smoke impact

- smoke_lanes_to_run:
- runner_or_guard_script_changes:

### Security and tenancy impact

- organization_scope_impact:
- workspace_scope_impact:
- rbac_impact:
- secret_or_token_handling_impact:

## 4) Proof Expectation (required)

- success_proof_file_path:
- expected_success_signal:
- proof_owner:

## 5) Required Local Gates (must pass)

- [ ] `bash scripts/smoke/run.sh guard`
- [ ] `bash scripts/smoke/run.sh contract-all` (or lane-specific contract gate)
- [ ] `cd zephix-backend && npx tsc --noEmit` (if backend touched)
- [ ] `cd zephix-frontend && npx tsc --noEmit` (if frontend touched)
- [ ] `cd zephix-frontend && npm run lint:new` (if frontend touched)
- [ ] targeted tests for changed module(s)
- [ ] required smoke journey lane(s): `org-invites` / `customer-journey` / `ui-acceptance` (as applicable)

## 6) Required CI Gates (must pass)

Blocking CI gates:
- [ ] Backend Gating Tests
- [ ] Frontend Gating Tests
- [ ] Required staging smoke/contract jobs for this lane

Informational CI gates (track, do not block unless pilot-impacting):
- [ ] Backend Full Tests (informational) reviewed
- [ ] Frontend Full Tests (informational) reviewed

## 7) Rollback Criteria and Plan

- rollback_trigger_conditions:
- rollback_steps:
- rollback_validation_commands:

## 8) Pilot Protection Decision

If `pilot_impacting: yes`, confirm:
- [ ] change type is one of: security fix | data integrity fix | onboarding blocker
- [ ] pilot ledger update required:
  - `docs/architecture/proofs/pilot/WEEK3_PILOT_EXECUTION_LOG.md`
- [ ] no broad refactor mixed into this lane

## 9) Execution Approval

- reviewer:
- approved_to_start: yes | no
- approval_date_utc:
