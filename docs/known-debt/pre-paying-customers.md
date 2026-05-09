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
