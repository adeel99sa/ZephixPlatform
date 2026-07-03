# Pre-Paying-Customers Debt Log

**Purpose:** Track items deliberately scoped out of pre-MVP work. Each item has an explicit revisit trigger so future build dispatches know when to promote it back into active scope.

**Convention:** Any item promoted from this list to active scope must update its own ADR and acceptance criteria in the relevant build dispatch.

**Owner:** Platform engineering + security
**Status:** Living document — updated as items are promoted, deferred, or completed

---

## Source attribution

- **Original Build 1 dispatch (2026-05-08)** — items deferred from pre-MVP B1 (RBAC foundations) per operator decision
- **Reconciled Build 1 spec, Appendix B** — items confirmed as pre-existing debt during Build 1 reconciliation cycle
- **PO Resolution Q7 (2026-05-08)** — alerting wiring for refresh-token reuse detection

---

## Security and auth posture

| # | Item | Trigger | Notes |
|---|------|---------|-------|
| S1 | JWT signing key rotation infrastructure (`signing_keys` table, `kid` header in JWT, two-key validation window) | Before opening to paying customers | Currently single key from `JWT_SECRET` env var. Acceptable for staging; real rotation needs a key registry + grace overlap. |
| S2 | Switch refresh token transport to httpOnly Secure SameSite=Strict cookie only (drop response-body refresh token) | Before public beta | Today: `zephix_refresh` cookie + body. Body keeps frontend simple; XSS risk acceptable for trusted Founding Members. |
| S3 | HIBP password breach check on signup + password change (k-anonymity API) | Before paid tier launch | No breach check today. argon2id hashing is fine; weak/reused passwords are the gap. |
| S4 | Multi-layer rate limiting beyond login (password reset already done; add: refresh, generic API per-IP, per-user write QPS) | When abuse signals appear in audit log or operator dashboards | Existing: login lockout (5/15min), password reset (3/15min email). Refresh and generic API have no caps. |
| S5 | Constant-time enumeration timing parity test in CI (verify dummy-bcrypt-on-not-found stays within target ±X ms of real bcrypt) | Before public beta | B1 ships dummy bcrypt verify on user-not-found for body+status parity. Sub-50ms timing-attack defense deferred. |
| S6 | Full security header set (CSP with nonce, HSTS strict + preload, X-Frame-Options DENY, COEP, CSP report-uri) | Before public beta | Currently helmet defaults via [main.ts:309-313](../../zephix-backend/src/main.ts#L309-L313). Audit and tighten before non-trusted users. |
| S7 | WebAuthn / passkey support | Phase 1B+ | TOTP MFA only in B1. Passkey is the eventual answer; deferred. |
| S8 | SSO (SAML, OIDC corporate) and SCIM provisioning | Phase 1B (enterprise tier) | Per ADR-003: email + password + Google OAuth only for Phase 1A. Founding Members don't require SSO. |
| S9 | Anomaly detection (unusual geo, new device, impossible travel alerts) | Phase 1B | No anomaly signal today. Audit log is the substrate; consumer is missing. |
| S10 | Wire `auth.token_refresh_reuse_detected` events to alerting channel (Slack or PagerDuty) | Before public beta opens | B1 emits the event to `auth_outbox` and audit log only. High-severity signal needs operator visibility before non-trusted users. |
| S11 | Tighten password reset token TTL from 1h to 15min once reset-email delivery latency is measured stable | When email delivery p99 < 30s confirmed via observability | Currently 1h (already tightened from earlier 24h). Smaller window reduces token-leak window but punishes slow inboxes. |
| S12 | Mandatory MFA enforcement for org admins (grace-period state machine + `MFA_NOT_ENROLLED` gate + login challenge) | Before Phase 1B GA | MFA is opt-in across the board in MVP per ADR-009b. `MfaService.isAdminBlockedByMfaPolicy()` helper and `mfa_grace_until` column already exist in code/schema; missing pieces are the guard wiring on sensitive endpoints and the login-flow challenge dispatch. |
| S13 | Cosmetic: `/api/version` reports stale `commitSha` after manual `railway up` | When version display matters for support/debugging | Railway only injects `RAILWAY_GIT_COMMIT_SHA` for git-triggered deploys. Manual uploads keep the prior value. Fix options: set `RAILWAY_GIT_COMMIT_SHA=$(git rev-parse HEAD)` in the deploy script, or extend `commit-sha.resolver.ts` to read `package.json` build metadata. |

---

## Compliance and data lifecycle

| # | Item | Trigger | Notes |
|---|------|---------|-------|
| C1 | GDPR data export (subject access request) endpoint | Before EU customers | Data model supports export; endpoint not built. |
| C2 | GDPR hard-delete (right to erasure) endpoint with audit-trail-preservation strategy | Before EU customers | Soft-delete exists for projects/workspaces. User hard-delete needs cascade plan. |
| C3 | Audit log retention policy and partition pruning | Before customers with retention requirements | Audit table grows unbounded today; need tiered retention (hot 90d, cold 1y, archive). |
| C4 | Cross-region read replica or backup verification cadence | When SLA commitments require it | Railway managed Postgres has SLA; we don't currently verify backups. |

---

## RBAC v3.5 — structural cleanup deferred from B1 (per reconciled spec Appendix B)

| # | Item | Trigger | Notes |
|---|------|---------|-------|
| R1 | Physically retire 3 legacy admin guard variants (`shared/guards/admin.guard.ts`, `shared/guards/admin-only.guard.ts`, `modules/auth/guards/admin.guard.ts`) | Next RBAC cleanup pass | All 4 guards are semantically equivalent post-V2; retained for back-compat (esp. audit logging in `shared/guards/admin.guard.ts`). Removal must preserve `AuditService.logAction('admin.unauthorized')` from the legacy guard or fold into `PlatformAdminGuard`. |
| R2 | Drop legacy `users.role` column (currently normalized fallback for guards) | RBAC v3.5 | Field is harmlessly normalized at every read. Removal requires JWT payload audit (some clients may still read `role`) and frontend coordination. |
| R3 | Migrate `user_organizations.role` DB enum from 4 values to 3 (`owner` → `admin`) | RBAC v3.5 | Today: `owner|admin|member|viewer`. App layer collapses `owner → ADMIN`. Renaming requires migrating Google OAuth signup path which actively writes `'owner'`. |
| R4 | Drop dormant legacy `refresh_tokens` table | RBAC v3.5 | Replaced by `auth_sessions` since pre-AD-011 era. Used only in defensive `revokeLegacyRefreshTokensForUser()` paths. |
| R5 | Remove deprecated `organizations/entities/invitation.entity.ts` + `InvitationService` | RBAC v3.5 | New code uses `OrgInvite` + `OrgInvitesService`. Legacy `Invitation` consumers exist in organization controllers; migrate before drop. |
| R6 | Drop dead inline columns on User: `password_reset_token`, `password_reset_token_expires`, `email_verification_token`, `email_verification_expires`, `two_factor_enabled`, `two_factor_secret` | After PR2 cutover stabilizes (or RBAC v3.5) | Dedicated tables are authoritative. Inline columns are dead writes. PR2 may include this drop migration; otherwise defer. |

---

## Wave 0 — test gating floor

| # | Item | Trigger | Notes |
|---|------|---------|-------|
| W1 | Fix 12 pre-existing gating-suite failures left after Wave 0 Track B (commit 69040917): `workspaces-controller-no-seeder`, `system-templates`, `auth-session-refresh`, `templates-instantiate-v51.service`, `auth-registration.service`, `workspaces.controller.update-settings-ownership-backdoor`, `platform-trash-admin.service`, `workflow.project-only-dashboard-signal-ai.contract`, `project-budgets.service`, `workspace-access.service`, `auth.skip-email-verification`, `template-authoring` | Post-Wave-0 cleanup sprint | None reference deleted Task entities; all pre-date Track B. Gating suite passes 2301/2310 with these standing. Each failure must be investigated individually; do not add to testPathIgnorePatterns without a fix-or-explicit-deferral decision. |
| W1 floor update (GATE 2 accounting, 2026-07-02) | Reality: 34-failure floor / 24 failing suites at Wave 1 Track A STEP 2 gate. +12 suites vs W1 entry above. Root causes: (a) malformed test files with Babel parse errors — `dashboards-mutations.integration.spec.ts:43`, `ai/__tests__/document-parser.service.spec.ts`, `brd/services/__tests__/brd.service.spec.ts`, `brd/validation/__tests__/brd-validation.service.spec.ts`, `rollups-phase6-closeout.integration.spec.ts`, `home.integration.spec.ts`, `dashboards-share.integration.spec.ts`, `template-center.apply.integration.spec.ts`, `templates.service.spec.ts`, `auth.integration.spec.ts`, `auth.routes.spec.ts`, `rollups.integration.spec.ts`. (b) env-dependent suites requiring a live `malikadeel` Postgres DB not provisioned in dev. None are regressions; all trace to pre-Wave-0 commits. Surfaced via rebase onto origin/staging expanding Jest discovery scope (+51 total tests). Fix: repair malformed spec syntax + provision local DB, or explicitly defer per original W1 instruction. | Post-Wave-1 cleanup sprint | Same rule: no testPathIgnorePatterns bypass without fix-or-deferral. |

---

## Platform observability

| # | Item | Trigger | Notes |
|---|------|---------|-------|
| O1 | OpenTelemetry coverage for auth check spans (currently spotty) | When measurable p99 budgets need verification | NFR §7 of B1 spec requires p99 < 5ms cached for `canAccessWorkspace`. We can't prove it without OTel spans. |
| O2 | Operator dashboard for auth failure rates, MFA enrollment status, refresh reuse incidents | Before public beta | Audit log is the substrate; visualization is missing. |

---

## Conventions

- **Promotion to active scope**: Update the relevant ADR (or open a new one), add the item to the next dispatch's acceptance criteria, mark this row as "PROMOTED to <build/PR>" instead of removing — preserves history.
- **Completion**: Mark the row "DONE in <PR/commit>" with date. Do not delete; this log is also a security-audit artifact.
- **Re-prioritization**: If a trigger date moves up (e.g., a customer with EU data lands earlier than expected), update the trigger column with the new condition and a note.

---

## Document control

| Field | Value |
|-------|-------|
| Created | 2026-05-08 (Build 1 reconciled spec — commit 2 of `build1/rbac-foundations`) |
| Source dispatches | docs/builds/build1-rbac-reconciled-spec.md |
| Updated | (track updates inline as items move) |
