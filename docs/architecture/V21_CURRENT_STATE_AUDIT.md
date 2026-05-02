# V21 Current State Audit — Sprint 1 Fill-In

**Status:** Sprint 1 fill-in (2026-05-01) — Sections 1, 2, 5, 6, 8 complete; Section 3 sampled (engines 1-3); Section 4 structural inventory; Section 7 template; Section 9 summary

**Audit period:** 2026-05-01 (Sprint 1 of MVP go-to-market plan)

**Auditor:** Senior Solution Architect (Claude) synthesizing Cursor reconnaissance evidence

**Scope:** Architectural ground-truth audit replacing stale [V1]–[V20] citations from blueprint v2. Captures actual current state with evidence citations, not assumed state from prior audits.

---

## Section 0: Pre-flight

**Branch:** Audit synthesized against Cursor reconnaissance run on `feat/ad-027-batch-1a-i-workspace-reads` (commit `63637e8713248e75`). Subsequent merges through PR #231 are deployed to staging. Some specific decorator counts may have shifted with PR #229's merge into staging; intent is preserved.

**Evidence sources:**

- Cursor repository reconnaissance report (2026-05-01)
- Gate Zero proof file (`docs/architecture/proofs/2026-05-01-zephix-ws-membership-v1-state.md`)
- Staging deploy proof file (`docs/architecture/proofs/2026-05-01-staging-deploy-state.md`)
- AD_INDEX (`docs/architecture/AD_INDEX.md`)
- Direct grep evidence with file:line citations where applicable

**Evidence rule applied:** All claims about repo state cite file:line OR are labeled UNVERIFIED. All claims about runtime state reference dated proof artifact OR are labeled UNVERIFIED.

---

## Section 1: Gate Zero — runtime configuration state

**Source:** `docs/architecture/proofs/2026-05-01-zephix-ws-membership-v1-state.md` (merged via PR #231)

| Environment | ZEPHIX_WS_MEMBERSHIP_V1 | Default behavior | Confidence |
|---|---|---|---|
| Default (env unset) | OFF | `feature-flags.config.ts:45` returns false | HIGH |
| Local dev | Bypassed by NODE_ENV check | `WorkspaceMembershipFeatureGuard` allows | HIGH |
| Staging | ON (value: `1`) | Strict workspace membership enforcement | HIGH (Railway dashboard 2026-05-01) |
| Production | OFF (variable absent) | Mixed: compat permissive on some routes, FEATURE_DISABLED 403 on others | HIGH (Railway dashboard 2026-05-01) |

**Critical context:** Production has NO customers. Architecture has been built and tested against staging (flag-ON). Production runs default behavior because no users hit production paths.

**Production Readiness Gate 1 reframing:** Not a customer-impacting cutover event. Reframed as configuration alignment before first customer onboards: set `ZEPHIX_WS_MEMBERSHIP_V1=1` in production to match staging-tested behavior. ~5 minutes of dashboard work, plus standard deploy/smoke verification.

**Architectural finding:** Two-behavior nuance when flag is OFF in production NODE_ENV:

- `RequireWorkspaceRoleGuard` / `RequireProjectWorkspaceRoleGuard`: ALLOW (compat path)
- `WorkspaceMembershipFeatureGuard`: 403 with FEATURE_DISABLED unless flag is `'1'`

This means flag-OFF state is not uniformly permissive — it depends on which guards a route uses. Documented for future Gate 1 cutover planning.

---

## Section 2: AD-027 enforcement metrics (split per reviewer recommendation)

**Source:** Cursor repository reconnaissance (2026-05-01)

### Total endpoint denominator

**732 endpoints** (`@Get|@Post|@Put|@Patch|@Delete` on `zephix-backend/src/**/*.controller.ts`).

### Metric A1: @RequireWorkspacePermission

**Total:** 15 instances

| File | Count |
|---|---|
| `workspaces.controller.ts` | 15 |

Coverage: 15 of 732 endpoints (~2.05%) — note: decorators can stack, so this is decorator-instance count, not unique endpoint count.

### Metric A2: @RequireWorkspaceAccess

**Total:** 12 instances

| File | Count |
|---|---|
| `workspaces.controller.ts` | 10 |
| `projects/controllers/projects-view.controller.ts` | 1 |
| `projects/controllers/project-clone.controller.ts` | 1 |

Coverage: 12 of 732 endpoints (~1.64%) — decorator-instance count.

### Metric A3: Imperative patterns remaining

**Total:** 105 lines in controllers using `canAccessWorkspace`, `normalizePlatformRole`, or `enforceUpdate`

Examples:

- `workspace-projects.controller.ts:62-66` — canAccessWorkspace check
- `metrics.controller.ts:69-73` — canAccessWorkspace check
- `workspaces.controller.ts:622` — `this.policy.enforceUpdate(u.role)` (still present despite batch 1a-i migration)

Note: Line-based count, not endpoint-based. Multiple imperative checks may exist on single endpoint.

### Additional declarative: @RequireOrgRole

**Total:** 23 instances (informational, not strictly AD-027 framework)

| File | Count |
|---|---|
| `templates.controller.ts` | 12 |
| `workspaces.controller.ts` | 4 |
| `template-actions.controller.ts` | 3 |
| `workspace-modules.controller.ts` | 1 |
| `workspace-members.controller.ts` | 1 |
| `workspaces-maintenance.controller.ts` | 1 |
| `custom-fields.controller.ts` | 1 |

**Code quality red flag:** `templates.controller.ts:602` uses `@RequireOrgRole('admin')` with **string literal** rather than `PlatformRole.ADMIN` enum. Plus contains TODO: "Add workspace owner check for WORKSPACE templates." Mixed pattern + incomplete authorization. Tech debt.

### Metric B: @AuditGuardDecision

**Total on live controllers:** 0

Infrastructure registration (verified):

- `GuardAuditInterceptor` registered in `app.module.ts:200`
- `GuardAuditAuthzExceptionFilter` registered in `app.module.ts:185`
- Imports present at `app.module.ts:65-66`

**Honest finding:** F-A audit infrastructure is plumbed but adoption on live controllers is **0%**. Tier 1 governance compliance positioning ("audit emission for every Config/Destructive guard decision") is not achieved on any production endpoint.

### Coverage summary

**Controllers with at least one AD-027-style decorator:** 9 files

| File | A1 | A2 | OrgRole | B |
|---|---|---|---|---|
| `workspaces.controller.ts` | 15 | 10 | 4 | 0 |
| `workspace-modules.controller.ts` | 0 | 0 | 1 | 0 |
| `workspace-members.controller.ts` | 0 | 0 | 1 | 0 |
| `workspaces-maintenance.controller.ts` | 0 | 0 | 1 | 0 |
| `project-clone.controller.ts` | 0 | 1 | 0 | 0 |
| `projects-view.controller.ts` | 0 | 1 | 0 | 0 |
| `templates.controller.ts` | 0 | 0 | 12 | 0 |
| `custom-fields.controller.ts` | 0 | 0 | 1 | 0 |
| `template-actions.controller.ts` | 0 | 0 | 3 | 0 |

**Honest assessment of AD-027 enforcement state:**

- 9 of ~50 controller files have any AD-027 decorator
- Even within decorated controllers, imperative patterns persist alongside declarative
- Audit emission is 0% on live code
- Migration is partial in coverage AND partial in completeness within covered controllers

**Implication for Sprint 2 priority:** Identify ~150-200 critical-path endpoints (auth, workspace, project, member, billing-touching). Apply AD-027 decorators + audit emission. Defer the remaining ~530 endpoints to post-MVP unless customer-data-touching.

---

## Section 3: Per-engine current state (sampled — engines 1-3 only)

**Format:** Engine | Tier | Sampled evidence | Honest assessment vs blueprint claim | Sprint 2-3 audit pending?

### Engine 1: Identity & Access (Tier 1)

**Sampled evidence:**

- Module structure exists: `auth.module.ts`, `auth.controller.ts`, `controllers/`, `services/`, `guards/`
- Test coverage indicators: 7 files in `test/` with `*auth*`, 13 `.spec.ts` files in `src/modules/auth/`
- Password reset: migration `18000000000075-CreatePasswordResetTokensTable.ts` present, endpoints at `auth.controller.ts:242-259`
- Google OAuth: NO matches in `modules/auth/**/*.ts` for `google|oauth` — confirmed gap

**Blueprint claim:** 71-90% functional per [V2]

**Honest assessment:** Substantively built, specific known gaps (Google OAuth, RBAC enforcement state differs prod vs staging). Range plausible.

**Sprint 2 audit pending:** Verify password reset E2E flow on staging, confirm session management hardening, document audit trail per AD-027.

### Engine 2: Tenancy & Workspaces (Tier 1)

**Sampled evidence:**

- `complexity_mode` / `complexityMode` column NOT present in `workspace.entity.ts` (verified via grep)
- Multiple workspace controllers exist (workspaces, workspace-modules, workspace-members, workspaces-maintenance)
- 15 `@RequireWorkspacePermission` decorators applied (per Section 2)

**Blueprint claim:** 88% built per [V19]

**Honest assessment:** Module exists at code level, but AD-026 complexity dial is paper-only — schema doesn't have the column. This blocks AD-014 capability registry, AD-026 complexity mode, and the entire "opinionated defaults" moat positioning.

**Critical gap:** `complexity_mode` column absent. Blocks downstream architectural ambitions. Schema migration required to unlock AD-014/026/029 capabilities.

**Sprint 2 audit pending:** Capability registry actual implementation state, workspace settings UI alignment with AD-026, member management invite-to-platform flow.

### Engine 3: Work Management (Tier 1)

**Sampled evidence:**

- `work-task.entity.ts` exists
- `work-item*.entity.ts` exists separately (AD-010 unification incomplete)
- 7 risk-related entity files exist (AD-012 + AD-025 unification incomplete)

**Blueprint claim:** Mixed — work_tasks 90%, work_items 50%, risks 52%

**Honest assessment:** Three separate entity systems still coexist. Unification work per AD-010, AD-012, AD-025 is incomplete. This is significant architectural debt and contradicts the "unified work entity model" moat positioning.

**Sprint 2 audit pending:** D5 risk consolidation actual phases-complete count, AD-013 tabs implementation, AD-024 custom fields rebuild status, AD-017 default tab sets per methodology.

### Engines 4-9: Audit pending (Sprint 2-3)

**Engine 4 (Templates & Methodology):** Not sampled this audit. Blueprint claim: unknown. Sprint 2 priority.

**Engine 5 (Governance & Phase Gates):** Not sampled. Blueprint claim: unknown. AD-021 multi-step approval chains spec'd, build status unverified.

**Engine 6 (Dashboards & KPIs) — Tier 2:** Not sampled. Fast-follow tier.

**Engine 7 (Resources & Capacity) — Tier 2:** Not sampled. Fast-follow tier.

**Engine 8 (Budgets & EVM) — Tier 3:** Blueprint claim 47%, ships as Beta.

**Engine 9 (AI Engine) — Tier 3:** Blueprint claim 40%, ships as Beta. **PLUS:** D4 deletion incomplete — `src/ai/` has 22 files despite D4 marked "DONE." Tech debt.

**Pattern observed:** Sampled engines (1, 2, 3) show "code exists, target architecture not achieved." Likely pattern for engines 4-9. Different from blueprint percentages which suggest progress toward target. Reality is incomplete unification, missing key columns/tables, partial implementations.
---

## Section 4: Frontend canonical map (structural inventory)

**Source:** Cursor reconnaissance (2026-05-01)

### Top-level structure

`zephix-frontend/src/` includes: `App.tsx`, `features/`, `pages/`, `routing/`, `views/`, `components/`, `services/`, `hooks/`.

### Onboarding components (verified present)

- `pages/onboarding/OnboardingPage.tsx`
- `CreateFirstWorkspacePage.tsx`
- `features/onboarding/` directory
- `hooks/useOnboardingCheck.ts`
- `services/onboardingApi.ts`

**Honest assessment:** Onboarding has substantive frontend structure. Whether the flow is complete and functional end-to-end (signup → email verification → first workspace → first project → invite team) is UNVERIFIED. Sprint 2 manual smoke test priority.

### Dual paradigm: Work Management vs Work Items

Three locations exist (per CANONICAL.md flagged dual paradigm):

- `features/work-management/`
- `features/work-items/`
- `views/work-management/`
- `pages/my-work/`

**Honest assessment:** Dual paradigm is real and visible in code. Architectural decision needed: is this intentional (unified post-AD-010) or transitional? CANONICAL.md flagged but doesn't resolve. Sprint 2 architectural decision.

### Shell

`App.tsx` present. `features/`, `pages/`, `routing/`, `views/`, `components/` standard structure.

### Frontend AD alignment — UNVERIFIED

Code structure exists. Whether frontend matches AD architecture (capability gating UI per AD-014, complexity mode UI per AD-026, tab system per AD-013, methodology-aware defaults per AD-017) — UNVERIFIED. Cannot determine from file inventory alone. Requires behavioral audit.

**Sprint 2 architect deliverable:** Frontend canonical map with AD-by-AD alignment status. Cannot just inventory files; must inventory behaviors.

---

## Section 5: Operational + commercial state (Production Readiness gates)

**Source:** Cursor reconnaissance (2026-05-01) + Gate Zero proof

### Authentication & Security

| Gate | State | Evidence |
|---|---|---|
| 1. ZEPHIX_WS_MEMBERSHIP_V1 flag flip in production | NOT DONE (production unset; staging ON) | Gate Zero proof |
| 2. Password reset merged + smoke tested | MERGED, smoke pending | Migration 18000000000075, endpoints `auth.controller.ts:242-259` |
| 3. Multi-tenant isolation tested | TEST INFRASTRUCTURE EXISTS, RUN STATUS UNVERIFIED | Files: `test/security/tenant-isolation.e2e-spec.ts`, `test/tenancy/*.e2e-spec.ts`, helper at `test/tenancy/helpers/cross-tenant-workspace.test-helper.ts` |
| 4. Google social login | NOT DONE | No matches in `modules/auth/**/*.ts` |
| 5. OWASP Top 10 review | UNKNOWN | `docs/security/` files exist (e.g., `DASHBOARDS_SECURITY_REVIEW.md`) but formal OWASP gate evidence absent |

### Data Integrity & Migration

| Gate | State | Evidence |
|---|---|---|
| 6. D2 (Custom Fields rebuild) | PARTIAL | Custom-field entities exist at `modules/custom-fields/entities/`; rebuild completion UNVERIFIED |
| 7. D3 (Workflow delete) | DONE | `src/workflows` doesn't exist |
| 8. D4 (AI consolidate) | **PARTIALLY DONE — TECH DEBT** | `src/modules/ai` empty BUT `src/ai/` has 22 .ts files. Earlier session memory marked this DONE; reality is partial. |
| 9. D5 (Risk consolidate) Phases 1-3 | PARTIAL | 7 risk entity files still exist, target was unification into work_tasks |

### Code Cleanup

| Gate | State | Evidence |
|---|---|---|
| 10. `pm` org-role migration | DONE | PR #221 (per session memory) |
| 11. `workspace_admin` alias cleanup | DONE | PR #222 (per session memory) |

### Infrastructure

| Gate | State | Evidence |
|---|---|---|
| 12. Email delivery worker | CODE EXISTS, COMPLETENESS UNVERIFIED | SendGrid in `EmailService` (file `shared/services/email.service.ts:1-38`); call paths in `outbox-processor.service.ts:342`, `notification-dispatch.service.ts` |
| 13. Production environment provisioned | INFRA EXISTS, UNUSED | Production Railway service exists (per Gate Zero proof reference); no customers |
| 14. Database backup/restore tested | UNVERIFIED | No in-tree evidence |
| 15. Incident runbook | PARTIAL | `docs/OPERATIONS_RUNBOOK.md`, `docs/RAILWAY_MIGRATION_RUNBOOK.md` exist |
| 16. Status page | NOT DONE | No in-tree evidence |

### Legal & Compliance

| Gate | State | Evidence |
|---|---|---|
| 17. Terms of service published | DRAFT EXISTS | `zephix-landing/terms.html`, `pages/TermsPage.tsx` — content quality UNVERIFIED |
| 18. Privacy policy published | DRAFT EXISTS | `zephix-landing/privacy.html`, `pages/PrivacyPage.tsx` — content quality UNVERIFIED |
| 19. Subscription/billing wiring | CODE EXISTS, COMMERCIAL MOTION INCOMPLETE | 13 files in `modules/billing` + 11 endpoints in `src/billing/controllers/billing.controller.ts`; Stripe stubbed at `billing.controller.ts:314-340` ("Stripe checkout is not yet configured", "webhook processing is not yet configured") |

### Updated Production Readiness score

**Confirmed DONE:** 3 (gates 7, 10, 11)

**PARTIAL or DRAFT or UNVERIFIED:** 12 (gates 2, 3, 5, 6, 8, 9, 12, 13, 15, 17, 18, 19)

**NOT DONE:** 3 (gates 4, 16, plus #1 reframed)

**UNKNOWN:** 1 (gate 5)

**Honest score: ~40% with substantial PARTIAL/DRAFT inventory.** This is meaningfully better than my evaluation's 21% claim. Reviewer was right that "billing exists, commercial motion incomplete" is the precise framing — same applies to email, legal docs, runbook.

**Critical implication:** The remaining work is more about COMPLETION + VERIFICATION than greenfield building. Most gates have substrate. Sprint 2 work is finishing what's started, not starting from zero.

---

## Section 6: Tenancy & isolation

**Source:** Cursor reconnaissance (2026-05-01)

### Test infrastructure present

Files identified:

- `test/security/tenant-isolation.e2e-spec.ts`
- `test/tenancy/*.e2e-spec.ts` (multiple)
- `test/tenant-isolation.e2e-spec.ts`
- `test/tenant-repository-unsafe-ops.e2e-spec.ts`
- Helper: `test/tenancy/helpers/cross-tenant-workspace.test-helper.ts`

### Test execution status

UNVERIFIED. Files exist; whether they pass, what they cover, when they last ran — not captured in this audit. Sprint 2 priority: actually run these tests with current schema and capture results.

### Pen test status

NOT DONE. No external pen test conducted per Production Readiness Gate 3.

### Critical sequencing reminder

Per architectural plan: scope critical APIs → automated tenancy tests pass → THEN env flag decisions (Production Readiness Gate 1 cutover). Currently:

- Critical APIs not yet scoped (Sprint 2 work)
- Automated tenancy tests exist but pass-status UNVERIFIED
- Gate 1 reframed (no production customers, low cutover risk)

**Sequencing implication:** Tenancy test verification is Sprint 2 priority, even though Gate 1 cutover risk is reduced. Multi-tenant isolation pen test is still required before first paying customer regardless of when Gate 1 happens.

---

## Section 7: Customer discovery — Track 0 (template)

**Owner:** Product Owner (Adi)

**Cadence:** 2 interviews per week target × 6 weeks

**Status:** NOT STARTED as of 2026-05-01

### Decision log structure (template)

```markdown
# Customer Discovery — Decision Log

## Sprint 1 (weeks 1-2)
- Interviews completed: 0 of target 4
- Patterns emerging: [empty until pattern visible across 3+ interviews]
- Decisions confirmed/changed: [none yet]
- Will NOT build for SMB v1: [list as decisions emerge]

## Per-interview notes
- [date] [name/anon] [company size] → notes/file link
```

### Reversible vs non-reversible engineering decisions

**Non-reversible (proceed without discovery):**

- Tenancy isolation testing — required regardless of customer signal
- Email worker completeness — required regardless
- AD-027 enforcement on auth/workspace/project access — required regardless
- Multi-tenant isolation pen test — required regardless

**Reversible (wait for first wave of discovery notes):**

- Industry-specific governance templates (AD-043) — wait for signal that customers want them
- Phase gate evidence requirements (AD-041) — wait for signal that customers configure these
- Quantitative gate thresholds (AD-042) — wait for signal
- AI strategy depth (AD-039) — wait for signal
- Real-time collaboration depth (AD-031 Tier 1) — wait for signal whether Tier 2 polling is acceptable

**Sprint 2-3 priority should be non-reversible only.** Reversible items wait for discovery signal.

### Discovery interview structure (suggested)

Five questions for first 5 interviews:

1. "Walk me through how your team manages projects today — what tools, what feels broken?"
2. "Last time a project went off-track, what was the warning sign you wished you'd caught earlier?"
3. "What does your week look like — how much of your time is actual work vs reporting/coordinating?"
4. "If you could change one thing about how your team's projects run, what would it be?"
5. "What would have to be true for you to switch tools? What's stopped you from switching before?"

Don't pitch Zephix. Don't show mockups. Listen and capture.

---

## Section 8: PO decisions pending

These are NOT settled. Architect work should not pretend they are.

### Decision 1: Pricing model

- Free tier + paid? Per-seat? Per-workspace? Enterprise upsell?
- Affects: billing wiring scope, capability gating implementation, sales motion
- Required by: Sprint 4 (week 8) latest

### Decision 2: Initial customer profile

- 10-50 employee companies vs 50-500 vs both
- Affects: feature priorities, governance depth, onboarding tone
- Required by: Sprint 4 latest, ideally informed by first 4-6 discovery interviews

### Decision 3: Beta customer source

- Personal network, cold outreach, Product Hunt, partner channel?
- Affects: timing of marketing investment, when first customers arrive
- Required by: Sprint 4-5

### Decision 4: Team composition / hiring trigger

- When does headcount expansion happen? Who first (backend, frontend, devops, designer)?
- Affects: timeline directly — current capacity (architect + Cursor + PO) limits parallel tracks to 2
- Required by: ASAP if team scaling is planned; informs Sprint 5+ priorities

### Decision 5: Funding model

- Bootstrap vs raise?
- Affects: timeline pressure, scope discipline, headcount decisions
- Required by: ASAP if raising; informs all of the above

**Critical:** These decisions need answers. Engineering can proceed on non-reversible items in parallel, but Sprint 5+ priority selection requires PO direction. Earlier is better.

---

## Section 9: Summary — blockers, deferrals, AD_INDEX follow-ups

### Sprint 1 architectural state

**Documented and verified:**

- Gate Zero proof captured (staging ON, production OFF, no customers)
- Staging deploy state captured (PR #231 active on both backend + frontend)
- AD_INDEX in tree with tech debt callouts
- V21 audit template in tree (this document fills it in)
- AD-027 enforcement metrics with split A1/A2/A3/B (50 decorator instances across 9 files; audit emission 0%)
- Production Readiness gates evidence-cited (revised score ~40%)
- Per-engine sample (engines 1-3) replacing stale blueprint percentages

**Discovered tech debt during Sprint 1:**

1. **D4 partial completion** — `src/ai/` has 22 files despite D4 marked DONE. Needs cleanup PR or formal acknowledgment of partial state.
2. **`templates.controller.ts` string-literal role checks + TODO** — Code debt: mixed pattern, incomplete authorization. Needs ticketing.
3. **AD-029 + AD-031 + blueprint v2 not in repo** — Known lazy-commit pattern. Resolve when implementation depends on them.
4. **AD-027 patch #4 candidate** — Document feature-flag dependency for imperative-to-declarative migrations (transitional flag testing approach).
5. **`@AuditGuardDecision` 0% adoption on live controllers** — F-A foundation infrastructure exists, application missing. Critical for Tier 1 governance compliance positioning.
6. **`complexity_mode` column missing from workspace.entity.ts** — Blocks AD-014 + AD-026 + AD-029 cascade. Schema migration required.
7. **Frontend dual paradigm unresolved** — Work Management vs Work Items vs My Work — three locations, no decision recorded.
8. **CI job timeout for sprint-merge-gate** — 45-60 min timeout needed (separate workflow PR).
9. **NEST_HTTP_GLOBAL_PREFIX duplication** — Per PR #226 architect note.
10. **forFeature audit** — Relation graph review across all modules (PR #229 finding).
11. **Stripe live integration stubbed** — Commercial motion gap.
12. **Google OAuth `state` parameter disabled** — `passport-google-oauth20` `state: true` requires `express-session`, which is not in the stack (PR #234). CSRF protection on the authorize step relies on fixed registered redirect URIs (Google validates server-side). Acceptable for staging; future PR should implement a custom Redis-backed state store without adopting session middleware for this single use case.

### Sprint 2 priority recommendations (informed by V21 evidence)

**Lane 1: Production Readiness operational gates**

- Stripe live integration design + implementation (Gate 19 commercial motion)
- Email worker completeness verification + email-dependent flow E2E test (Gate 12)
- Multi-tenant isolation tests RUN with current schema + capture results (Gate 3 verification)
- Legal review of ToS + Privacy drafts → publish-ready (Gates 17-18)
- Status page setup (Gate 16)
- Incident runbook gap-filling (Gate 15)

**Lane 2: AD-027 critical-path enforcement + audit emission**

- Identify ~150-200 critical-path endpoints (auth, workspace, project, member, billing-touching)
- Apply `@RequireWorkspacePermission` / `@RequireWorkspaceAccess` per AD-027
- Apply `@AuditGuardDecision` to Config/Destructive on those endpoints (move Metric B from 0% to meaningful coverage)
- Tenancy isolation tests for those endpoints
- Migration: `complexity_mode` column on workspaces table (unblocks AD-014/026/029)

**PO continues discovery throughout.** 2 interviews/week. Decision log updated.

**Architect continues V21 audit completion in parallel:**

- Sprint 2 audit: Engines 4-9 sampled
- Frontend canonical map with AD alignment status
- Engine 4 (Templates & Methodology) deeper audit if customer signal indicates priority

### Deferrals (explicit non-work for Sprint 2)

- AD-032 through AD-046 drafting paused — V21 audit may reshape what's needed
- AD-027 batches 1a-ii through 7 sequential — defer until critical-path scope defined
- Industry templates (AD-043 with AI Project) — wait for discovery signal
- Frontend rework — wait for canonical map completion
- Engine 6/7/8/9 deep audits — Sprint 3+

### AD_INDEX follow-ups

- AD-029 commit to repo when Sprint 2 implementation depends on Tier framework discipline
- AD-031 commit to repo when Sprint 2 implementation needs F-F real-time collaboration spec
- Blueprint v2 either commit or formally deprecate (AD_INDEX currently flags as "external")
- Migration of AD-010 through AD-026 from Cursor rules summary to standalone files: lazy-commit when each is next touched

---

## Document end

**Next architect work:** Sprint 2 dispatch plan based on this V21 evidence. Specific Cursor prompts for Lane 1 + Lane 2 work, sequenced and scoped per ground truth captured here.

**Next PO work:** Customer discovery interviews + PO decisions list (Section 8).

**Next reviewer engagement (if available):** Spot-check this V21 fill-in for accuracy or gaps before Sprint 2 dispatch begins.
