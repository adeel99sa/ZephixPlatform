# Zephix Master Plan v2026.01

**Last Updated:** 2026-01-03  
**Maintained By:** Solution Architect & Delivery Architect

## Phase Status Rules

- **In Progress**: Code is underway on a branch
- **Code Complete**: Built and pushed, pending verification and merge
- **Complete**: Merged to main, migrations applied in staging, smoke tests passed

---

## Phase 0. Org Foundations and Onboarding

**Goal:** A real first time experience for external testers, with minimal billing.

**Scope:**
- Org creation path
- Invite admin user, set password, first login wizard
- Org directory
- Org admin invites employees
- Org admin creates workspace
- Org admin assigns workspace owner

**Status:** Not started

**Billing Foundation (Phase 0B):**
- ✅ Billing endpoints no longer return 501
- ✅ Default subscription auto-created on first access to current plan
- ✅ Billing mode switch: disabled, manual, stripe
- ✅ Cancel fields added to Subscription plus migration
- ✅ Admin-only enforcement for subscribe, update, cancel

---

## Phase 1. Access and Membership

**Scope:**
- Org roles: admin, member, viewer
- Workspace roles: owner, member, viewer
- Invites, join, revoke, role changes

**Status:** Partially complete
- ✅ Workspace invite link flow: Complete
- ❌ Org invite flow end to end UX: Not done

---

## Phase 2. Work Execution MVP

**Scope:**
- Projects and work items
- My Work
- Dependencies, comments, activity
- Basic list and board

**Status:** In progress historically, latest hardening completed for My Work filters and drilldown

**Recent Work:**
- ✅ My Work server-side filters hardened
- ✅ Dashboard drilldown to My Work with URL-driven filters
- ✅ Database indexes for filter performance
- ✅ Security audit: role enforcement, workspace scoping, data leak prevention

---

## Phase 3. Dashboards Security Foundation

**Scope:**
- Org and workspace dashboards
- Invite only shares
- Viewer always view only
- Drilldown path to My Work

**Status:** Code complete, pending merge and smoke tests

**Branch:** `phase6-1-dashboards-invite-only`

**Completed Work:**
- ✅ Dashboard scope (org/workspace) and shares
- ✅ Invite-only share model
- ✅ Share panel shows invited user info
- ✅ Export button gating by role
- ✅ "Open as list" drilldown to My Work with filters
- ✅ Migration fixes: enum mismatch, My Work filter indexes

**Next Steps:**
1. Create PR: `phase6-1-dashboards-invite-only` → `main`
2. Merge to main
3. Smoke test:
   - 4 dashboard routes (org/workspace create, read, update, delete)
   - Share invite, update, revoke
   - "Open as list" drilldown
   - My Work filters by role (admin, member, viewer)
4. Mark Phase 3 as **Complete**

---

## Phase 4. Reporting and Exports

**Scope:**
- Export jobs
- PDF pack, Excel pack
- Audit logs for share, export, view

**Status:** Not started

---

## Phase 5. Resource and Capacity Truth

**Scope:**
- People, roles, calendars
- Hard vs soft allocations
- Conflicts, what if scenarios
- Capacity driven health

**Status:** Not started

---

## Phase 6. Risk and Issue Engine

**Scope:**
- RAID register tied to work and milestones
- Scoring, mitigations, triggers from signals
- Rollups to workspace and org

**Status:** Not started

---

## Phase 7. Portfolio and Program Governance

**Scope:**
- Portfolios, programs, stage gates
- Baselines, variance, approvals
- Exec rollups with traceability

**Status:** Not started

---

## Top Priority Sequence (Next 3 Moves)

### Move 1. Close Phase 3 Properly
- Create PR, merge to main
- Smoke test 4 dashboard routes, share invite/update/revoke, Open as List, My Work filters by role
- Mark Phase 3 as Complete

### Move 2. Build Phase 0 as Self Serve Lite
- Landing page sign up form, or admin invite flow first
- Create org, create first admin user, send invite email
- First login wizard by role
- No payments required

### Move 3. Make the Onboarding Wizard Land Users in Value Fast
- Admin lands on Org Setup checklist
- Workspace owner lands on Workspace Home
- Member lands on My Work
- Viewer lands on invited dashboards or read only views

---

## High Leverage Concepts (PM Best Practices)

**To encode into Zephix:**
- Baseline management (store baseline dates/effort, track variance automatically)
- Integrated change control (change requests tied to scope/schedule/budget/resources)
- Stakeholder and RACI clarity (role-driven dashboards and report packs)
- RAID discipline (risks, assumptions, issues, dependencies as first-class objects)
- Stage gates and governance (program phases with entry/exit criteria)
- Benefits and outcomes tracking (tie programs to goals and OKRs)

**Market Advantage:**
- Trustworthy rollups (no manual RAG)
- Exec grade packs (PDF, Excel, narrative, all permissioned)
- Delivery truth tied to capacity and risk signals

---

## Cursor AI Usage Guidelines

**Best Practices:**
- Use written contract first, then code (endpoint list, DTO schema, permission rules, query scoping, migration plan, test cases)
- Give Cursor small slices (one controller, one service, one migration, one test file per prompt)
- Add guardrails (never run commands touching prod credentials, no auto reading secrets, require diff review per commit)
- Run tight commit rhythm (commit per slice, keep PRs small for verification)

**Risks to Mitigate:**
- Unsafe automation (prompt injection, data exfiltration)
- Security issues in AI-assisted IDE workflows

---

## Immediate Next Steps

1. **Step 1:** Merge `phase6-1-dashboards-invite-only` into `main`
2. **Step 2:** Run smoke tests and mark Phase 3 as Complete
3. **Step 3:** Start Phase 0 onboarding self serve lite
   - Org create
   - Admin invite and password set
   - Role based first login wizard
   - Org directory and invites
   - Workspace create and owner assignment

**Signal to proceed:** When you say "Phase 3 is merged and smoke tested", I will mark Phase 3 as Complete and list only the next Phase 0 tasks in the right order.
