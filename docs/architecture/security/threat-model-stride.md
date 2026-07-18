# STRIDE Threat Model — Zephix Backend

**Status**: Phase E1 synthesis across Engines 1 / 2 / 5 / 7 / 8 + Foundations F-A / F-B / F-C / F-D
**Methodology**: Microsoft STRIDE (Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege)
**Scope**: Authentication, RBAC, tenant isolation, audit, secrets management, integrations, capability gating
**HEAD at authoring**: `098127da` on `docs/engines-be-evaluation-cycle` (worktree at `../ZephixApp-be-docs`)

**HALT-DOC-BE-4 sensitivity note (per architect Gate 4 maximum sensitivity):** This document surfaces threat-classified findings synthesized from the 7 prior engine + foundation docs. **Red-severity findings (notably F-A repudiation gaps in workspace-members.service.ts) are documented explicitly** with severity classification; not glossed. The threat model is **synthesis** of in-doc findings, not new discovery — claims trace to file:line evidence already established in the cited engine/foundation docs.

**Naming convention:** `Debt-STRIDE-XXX` for current security debt; `FW-STRIDE-XXX` for forward-roadmap structural mitigations.

---

## 9.1 Scope

This threat model covers the Zephix backend boundary: HTTP request entry through database persistence + cross-tenant boundaries + integration egress + audit trail. The scope addresses six concern domains:

| Concern | Primary owners | Cross-references |
|---|---|---|
| **Authentication** | auth module + JWT machinery | (out of explicit STRIDE matrix below; covered as substrate) |
| **RBAC / authorization** | Engine 1 + Engine 2 (tenant context boundary) | [RBAC_AND_ACCESS_CONTROL_ARCHITECTURE.md](../RBAC_AND_ACCESS_CONTROL_ARCHITECTURE.md), [Engine 2 doc](../engines/engine-2-tenancy.md) |
| **Tenant isolation** | Engine 2 (Decision C contract + tenant-aware persistence) | [Engine 2 doc Section 2.3](../engines/engine-2-tenancy.md#23-current-implementation-state) |
| **Audit trail / forensic posture** | F-A | [F-A doc](../foundations/f-a-audit-trail.md), gap inventory in F-A.3 |
| **Secrets management** | F-C (integration credentials encryption) + JWT signing key | [F-C doc ADR-F-C-001](../foundations/f-c-integrations.md#adr-f-c-001--aes-256-gcm-encrypted-secrets-at-rest-with-auth-tag) |
| **Capability gating** | F-D (feature flags + complexity_mode) + Engine 5 (governance) | [F-D doc](../foundations/f-d-capability-registry.md), [Engine 5 doc](../engines/engine-5-governance.md) |

### What this threat model is

- **Synthesis** across engine + foundation docs, classified into the STRIDE taxonomy with severity per finding
- **Improvement-plan-bearing** — every Red and Yellow finding has a remediation path traced to a `Debt-` or `FW-` item in the source engine/foundation doc
- **File:line-anchored** wherever a defense or gap is named

### What this threat model is NOT

- Not a penetration-test report. No active testing was performed; findings are static analysis + architectural review.
- Not a SOC 2 / ISO 27001 audit-readiness checklist. Compliance mapping is in [F-A doc Section F-A.6](../foundations/f-a-audit-trail.md#f-a6-technical-debt--future-work--compliance-escalation).
- Not exhaustive — covers backend application-tier; infrastructure-tier (deployment, network, OS, K8s, Railway-level) is out of scope.
- Not a vulnerability disclosure mechanism — internal architectural review document.

### Severity classification framework

Inspired by OWASP Risk Rating + NIST SP 800-30 Rev. 1 (Risk Assessment for Information Systems and Organizations).

| Severity | Definition | Example trigger |
|---|---|---|
| **Red (HIGH)** | Active compliance impact (SOC 2 / ISO 27001 partial impairment) OR breach class (cross-tenant exposure / privilege elevation) with shipped likelihood | F-A workspace-ownership-transfer audit gap |
| **Yellow (MEDIUM)** | Architectural concern that becomes a Red finding under specific operational conditions | KMS envelope encryption FW (single-key compromise = all credentials exposed) |
| **Green (LOW / well-defended)** | Defense is shipped; residual risk is operational not architectural | Tenant isolation Decision C 4-layer contract |

---

## 9.2 STRIDE Categories per Engine — Matrix Overview

The matrix below summarizes top concerns by category × engine. Detailed per-category analysis follows in 9.3 (Engine 1) / 9.4 (Engine 2) / 9.5 (F-A). Other engines are summarized inline.

| | Engine 1 (RBAC) | Engine 2 (Tenancy) | Engine 5 (Governance) | F-A (Audit) | F-C (Integrations) | F-D (Capability Reg) |
|---|---|---|---|---|---|---|
| **Spoofing** | JWT replay, smoke-login key | x-organization-id forgery, x-workspace-role header (Engine 8 controllers) | actor identity falsification on emit | actor inflation in record() input | webhook signature forgery | flag-state misrepresentation |
| **Tampering** | direct DB role manipulation; registry desync | tenant-aware repo bypass via raw SQL | governance rule mutation | audit-row mutation, retention tampering | webhook payload tampering | feature-flag value tampering |
| **Repudiation** | role changes without forensic trail (Gap-F-A-3) | **workspace ownership transfer (Gap-F-A-1)** | (defended — uniform GOVERNANCE_EVALUATE) | **gap inventory: 6 destructive ops + 2 publish gaps (HIGH)** | integration mutations (Debt-F-C-001) | flag mutations (FW-F-D-007) |
| **Info Disclosure** | over-fetch via missing scope | cross-tenant query, header leakage | governance rule cross-tenant | audit-row cross-tenant | credential exposure (encrypted) | flag substrate exposure |
| **DoS** | RBAC thundering herd | tenant-context resolution latency | governance evaluation cost | audit write back-pressure | rate-limit cascade from third-party | (n/a; flags are read-only) |
| **Elevation** | canonical-helper bypass; Platform ADMIN over-scope | ownership-transfer backdoor (CLOSED PR #269) | exception abuse | actor inflation | credential leakage → tenant takeover | flag bypass via direct env read (Debt-F-D-001) |

**Severity summary at-a-glance:**
- **Red (HIGH)**: F-A repudiation gaps (6 destructive operations) — workspace-members.service.ts single-file remediation
- **Yellow (MEDIUM)**: KMS envelope encryption FW; Engine 8 ad-hoc role mapping; Decision C principle violation via x-workspace-role header; WorkspacePermissionService registry vs helper divergence; AuditService.record silent failure
- **Green (well-defended)**: Tenant isolation 4-layer Decision C contract; F-C cryptographic posture (AES-256-GCM + HMAC SHA-256 + timing-safe + canonical-JSON idempotency); Append-only AuditEvent entity; Forensic emission discipline at 30+ shipped sites

---

## 9.3 Engine 1 (RBAC) Threats

### 9.3.1 Spoofing

**Threats:**

- **JWT replay or theft.** A captured JWT (15-minute access expiry, 7-day refresh per [config/configuration.ts:17](zephix-backend/src/config/configuration.ts#L17)) used by an attacker until expiry.
- **Smoke-login key compromise.** [`SmokeKeyGuard`](zephix-backend/src/modules/auth/guards/smoke-key.guard.ts) accepts `x-smoke-key` header against `STAGING_SMOKE_KEY` env var; if leaked, allows authentication bypass on the smoke-login endpoint (`POST /auth/smoke-login` at auth.controller.ts:433).
- **Session-context override at controller layer.** Engine 8 controllers (EarnedValueController, ScheduleBaselinesController) read `req.headers['x-workspace-role']` directly — client-supplied role headers are forgeable. See [Engine 8 Debt-Engine-8-003](../engines/engine-8-budgets-evm.md#debt-engine-8-003--header-derived-x-workspace-role-is-client-supplied).

**Current defenses:**

- **15-minute access-token expiry** ([app.module.ts:108](zephix-backend/src/app.module.ts#L108)): limits replay window.
- **Constant-time smoke-key comparison** ([smoke-key.guard.ts](zephix-backend/src/modules/auth/guards/smoke-key.guard.ts) `constantTimeEquals`): defends against timing-attack discovery of the key.
- **STAGING_SMOKE_KEY not configured = guard rejects unconditionally**: production environments without the env var fail closed.
- **JWT-bound `req.user.organizationId`** at the auth-context boundary: the authoritative tenant identity comes from the signed token, not request bodies.

**Residual risks (Yellow):**

- **Engine 8 controllers reading x-workspace-role directly** is a Decision C principle violation that resolves with [Engine 8 Debt-001/002/003 + Theme C Phase 3 migration](../engines/engine-8-budgets-evm.md#debt-engine-8-001--projectbudgetscontroller-ad-hoc-role-mapping-sibling-rbac-todo).
- **Smoke-login key rotation** is operational (not in-code); leaked keys remain valid until rotated.

### 9.3.2 Tampering

**Threats:**

- **Direct database role manipulation.** A DBA with raw write access can mutate `WorkspaceMember.role` outside application code paths.
- **Registry vs helper divergence ([Debt-Engine-2-001](../engines/engine-2-tenancy.md#debt-engine-2-001--workspacepermissionservice-registry-reconciliation)).** `WorkspacePermissionService` registry and `getEffectiveWorkspaceRole` canonical helper diverge on ADMIN bypass for `change_workspace_owner`. A future contributor reading the registry as ground truth will believe ADMIN cannot transfer ownership; they will be wrong.
- **Two `PlatformRole` definitions ([Debt-Engine-2-003](../engines/engine-2-tenancy.md#debt-engine-2-003--two-platformrole-definitions)).** `normalizePlatformRole` runtime-bridges; if a callsite forgets to normalize, role comparison fails silently.

**Current defenses:**

- **Canonical `getEffectiveWorkspaceRole` helper** ([workspace-access.service.ts:213](zephix-backend/src/modules/workspace-access/workspace-access.service.ts#L213)) with built-in Platform ADMIN bypass: single source of truth for identity-question.
- **Lint Rule A** ([extended PR #268](https://github.com/.../pulls/268)) forbids ad-hoc role lookups in covered directories.

**Residual risks (Yellow):**

- **Registry reconciliation pending.** Tracked in [Engine 2 Debt-Engine-2-001](../engines/engine-2-tenancy.md#debt-engine-2-001--workspacepermissionservice-registry-reconciliation).
- **Theme C Phase 3** consumer migration deferred ([Debt-Engine-2-005](../engines/engine-2-tenancy.md#debt-engine-2-005--theme-c-phase-3-consumer-migration)).

### 9.3.3 Repudiation

**Threats:** Role changes without forensic emission cannot be reconstructed under audit.

**Current defenses:** [`workspace-members.service.ts:409`](zephix-backend/src/modules/workspaces/services/workspace-members.service.ts#L409) `auditService.record({ action: ROLE_CHANGE, … })` — DUAL EMISSION at the dedicated `setRole` path.

**Residual risks (Red — see F-A.5):**

- **Idempotent role-change branch in addMember** ([workspace-members.service.ts:161](zephix-backend/src/modules/workspaces/services/workspace-members.service.ts#L161)) emits only `events.track` — no forensic emission. See [Gap-F-A-3](../foundations/f-a-audit-trail.md#gap-inventory--destructive-operations-with-analytics-emission-but-no-forensic-emission). **HIGH severity (compliance-impairing).**

### 9.3.4 Information Disclosure

**Threats:**

- **Over-fetch via missing scope predicate.** A controller failing to apply both org-scope and workspace-scope predicates can return cross-tenant or cross-workspace data.

**Current defenses:**

- **`TenantAwareRepository`** ([tenant-aware.repository.ts](zephix-backend/src/modules/tenancy/tenant-aware.repository.ts)) auto-scopes by `organizationId` from context.
- **`TenantPersistenceGuardrailSubscriber` + `TenantRepositoryQueryGuardrail`** ([tenancy module](zephix-backend/src/modules/tenancy/)): persistence-tier intercepts cross-tenant writes / queries.

**Residual risks (Green):** defended at 4 layers (frontend transport → backend interceptor → service → persistence). Adding workspace-scope is the controller's responsibility per Section 2.4 boundary tests; per-engine implementation enforces this through each engine's own service-tier guards.

### 9.3.5 Denial of Service

**Threats:**

- **RBAC check thundering herd.** Repeated permission checks against the same user across many endpoints could amplify database load.

**Current defenses:**

- **Workspace member lookup is O(1) per request** with composite index on `(workspaceId, userId)`.
- **No rate limiter on authenticated mutation paths** — selective coverage on public/unauthenticated paths only ([rate-limiter.guard.ts](zephix-backend/src/common/guards/rate-limiter.guard.ts) used on waitlist, intake-form, invitation-acceptance, AI controllers, integration webhook).

**Residual risks (Yellow):**

- **No global rate limiter on authenticated workspace-mutation endpoints** — relies on auth itself as the access constraint. A compromised credential could amplify writes without rate limiting at the application layer. Tracked as **FW-STRIDE-001** (global rate limiter for authenticated mutation endpoints).

### 9.3.6 Elevation of Privilege

**Threats:**

- **Canonical helper bypass.** A callsite implementing its own role lookup forgetting the ADMIN bypass would deny ADMINs a permission they should have.
- **Platform ADMIN over-scope.** ADMIN bypass is global; no scope on ADMIN actions other than the JWT claim.

**Current defenses:**

- **Lint Rule A** prevents ad-hoc role lookups (covered directories).
- **Canonical helper consolidation** PR #265 + #267 (Theme C Phases 1+2).

**Residual risks (Yellow):**

- **Theme C Phase 3 deferred**: feature-module consumers may still bypass.
- **Two PlatformRole definitions** introduce the typing-loose path.

---

## 9.4 Engine 2 (Tenancy) Threats

### 9.4.1 Spoofing

**Threats:**

- **`x-organization-id` header forgery.** A client could attempt to impersonate another tenant via header.
- **`x-workspace-id` header forgery.** Same shape, workspace level.
- **`x-workspace-role` header forgery (Engine 8 controllers).** [Engine 8 controllers](../engines/engine-8-budgets-evm.md#debt-engine-8-003--header-derived-x-workspace-role-is-client-supplied) read this directly without validating against actual membership.

**Current defenses:**

- **`organizationId` derived ONLY from `req.user.organizationId` (JWT claim)** — header is informational; authoritative source is the signed token. See [tenant-context.interceptor.ts:22-26 rules](zephix-backend/src/modules/tenancy/tenant-context.interceptor.ts#L22).
- **`workspaceId` validated against organization membership** (when ZEPHIX_WS_MEMBERSHIP_V1 enabled) — [Engine 2 doc Section 2.3](../engines/engine-2-tenancy.md#23-current-implementation-state).
- **Decision C 4-layer contract** ([ADR-Engine-2-001](../engines/engine-2-tenancy.md#adr-engine-2-001--decision-c-http-contract-for-missing-tenant-context)): missing tenant context fails closed at any of frontend transport, backend interceptor, backend service, or persistence guardrail.
- **Bootstrap path bypass for `/api/workspaces`** is intentional — listing/creating workspaces cannot validate against a workspace yet; documented in interceptor rules 33-36.

**Residual risks (Yellow):**

- **Engine 8 controllers' x-workspace-role header read** is a Decision C principle violation. The controller-level role mapping is conservative (Platform MEMBER → workspace MEMBER), so escalation is bounded, but the principle "client-supplied role is forgeable" is violated. Resolves with [Engine 8 Debt-001/002/003 migration](../engines/engine-8-budgets-evm.md#debt-engine-8-001--projectbudgetscontroller-ad-hoc-role-mapping-sibling-rbac-todo).

### 9.4.2 Tampering

**Threats:**

- **Tenant-aware repository bypass via raw SQL.** A service using raw QueryBuilder without going through `TenantAwareRepository` could query cross-tenant.
- **Persistence guardrail subscription failure.** If `TenantPersistenceGuardrailSubscriber` is not registered, writes can cross tenant lines.

**Current defenses:**

- **`TenantPersistenceGuardrailSubscriber`** intercepts every TypeORM write event and asserts tenant scope.
- **`TenantRepositoryQueryGuardrail`** intercepts raw QueryBuilder paths.
- **Both register globally** in the tenancy module — bypass requires intentional architectural decision.

**Residual risks (Green):** defended at the persistence layer for unintentional bypass. Intentional bypass requires touching the tenancy module — a high-friction path.

### 9.4.3 Repudiation

**See F-A.5 (workspace ownership transfer is the canonical destructive Engine 2 operation; gap inventory documented in F-A).**

### 9.4.4 Information Disclosure

**Threats:**

- **Cross-tenant query.** Service-tier code that forgets to call `assertOrganizationId()` could query against undefined org context, potentially returning all-org data.
- **Header leakage.** `x-organization-id` reflected in error messages or logs could leak tenant identifiers.

**Current defenses:**

- **`tenantContextService.assertOrganizationId()`** at service-tier (e.g., [workspace-access.service.ts:48](zephix-backend/src/modules/workspace-access/workspace-access.service.ts#L48)).
- **`SANITIZE_KEYS`** centralizes JSONB redaction in audit emission ([F-A ADR-F-A-003](../foundations/f-a-audit-trail.md#adr-f-a-003--centralized-sanitization-via-sanitize_keys)).

**Residual risks (Green):** defended; service-tier `assertOrganizationId()` is the canonical pattern.

### 9.4.5 Denial of Service

**Threats:**

- **Tenant-context resolution latency.** Every request resolves tenant context; if AsyncLocalStorage is misconfigured, performance degrades.

**Current defenses:**

- **Public bypass paths** for `/api/health` + `/api/version` — health checks unaffected.
- **AsyncLocalStorage native to Node.js** — minimal overhead.

**Residual risks (Green):** operational concern, not architectural.

### 9.4.6 Elevation of Privilege

**Threats:**

- **Ownership transfer backdoor (CLOSED PR #269).** Historical: `PATCH /:id/settings` accepted `ownerId` field with no RBAC. Closed in [ADR-Engine-2-003](../engines/engine-2-tenancy.md#adr-engine-2-003--canonical-workspace-ownership-transfer-endpoint-path-b).
- **Platform ADMIN over-scope.** ADMIN bypass returns `workspace_owner` for every workspace in the org; intentional but broad.

**Current defenses:**

- **Backdoor closure** PR #269 + regression test ([workspaces.controller.update-settings-ownership-backdoor.spec.ts](zephix-backend/src/modules/workspaces/workspaces.controller.update-settings-ownership-backdoor.spec.ts)).
- **Canonical `POST /:id/change-owner`** with `RequireOrgRole(PlatformRole.ADMIN)`.
- **`getEffectiveWorkspaceRole` ADMIN bypass** is documented + tested.

**Residual risks (Yellow):**

- **F-A audit emission gap on success-case** ([Gap-F-A-1](../foundations/f-a-audit-trail.md#gap-inventory--destructive-operations-with-analytics-emission-but-no-forensic-emission)) means even with the backdoor closed, a successful malicious-but-authorized owner transfer leaves only an analytics-stream record — not forensic. **Compliance-impairing.**

---

## 9.5 F-A (Audit Trail) Threats

**This section is the densest Red-severity territory in the threat model.** F-A's gap inventory (Section F-A.3) directly maps to Repudiation findings.

### 9.5.1 Spoofing

**Threats:**

- **Actor inflation in `record()` input.** A service emitting audit could pass an attacker-supplied `actorUserId` if upstream tenant context is corrupted.

**Current defenses:**

- **`actorUserId` typed as required input** to `AuditRecordInput`; callers source it from JWT-bound auth context (Engine 1 / 2 boundary).
- **Audit interceptor + filter** ([guard-audit.interceptor.ts](zephix-backend/src/common/audit/guard-audit.interceptor.ts) + [guard-audit-authz-exception.filter.ts](zephix-backend/src/common/audit/guard-audit-authz-exception.filter.ts)) source actor from `getAuthContextOptional(req)`, not request body.

**Residual risks (Green):** defended at the actor-source boundary.

### 9.5.2 Tampering

**Threats:**

- **Audit row mutation.** Application code or a malicious DBA could update audit rows to alter the forensic record.
- **Retention tampering.** A retention-purge process could be tricked into deleting rows it should not.

**Current defenses:**

- **`AuditEvent` entity is append-only** ([ADR-F-A-001](../foundations/f-a-audit-trail.md#adr-f-a-001--append-only-auditevent-entity)) — no `@UpdateDateColumn`, no `@DeleteDateColumn`. Application code cannot accidentally update.
- **`SANITIZE_KEYS`** prevents sensitive-field exposure in payloads ([ADR-F-A-003](../foundations/f-a-audit-trail.md#adr-f-a-003--centralized-sanitization-via-sanitize_keys)).
- **`recordGuardEvent` rethrows** on persistence failure — guard audit cannot be silently lost.

**Residual risks (Yellow):**

- **Database-level mutation requires intentional admin action.** Defense at app tier is necessary but not sufficient. Production policy (DBA access restriction) is operational concern. Documented in F-A ADR-F-A-001 consequences.
- **Retention service implementation absent ([Debt-F-A-007](../foundations/f-a-audit-trail.md#debt-f-a-007--retention-service-implementation-absent)).** No structurally-audited purge process exists.

### 9.5.3 Repudiation — **PRIMARY RED-SEVERITY TERRITORY**

**Threats — see [F-A doc Section F-A.3 gap inventory](../foundations/f-a-audit-trail.md#gap-inventory--destructive-operations-with-analytics-emission-but-no-forensic-emission) for full file:line evidence:**

- **Gap-F-A-1**: Workspace ownership transfer (workspace-members.service.ts:515) — `events.track` only; no `auditService.record`; `WORKSPACE_OWNER_CHANGED` constant absent.
- **Gap-F-A-2**: Workspace member added (line 181).
- **Gap-F-A-3**: Workspace role-changed idempotent path (line 161).
- **Gap-F-A-4**: Workspace member removed (line 272).
- **Gap-F-A-5**: Workspace member suspended (line 593).
- **Gap-F-A-6**: Workspace member reinstated (line 646).
- **Gap-F-A-7**: Dashboard publish/unpublish (gap-candidate, service-level emission unverified).
- **Gap-F-A-8**: Template publish (constant + emission both absent).

**Pattern**: 6 of 7 `events.track` calls in `workspace-members.service.ts` lack paired forensic emission. The dual-emission `setRole` path (line 397/409) is the canonical positive example — **execution is incomplete relative to the Phase 3B-stated intent.**

**Severity classification: HIGH (Red).** Compliance-impairing per:

- **SOC 2 Type II Common Criteria CC7.2** — partial impairment
- **ISO 27001:2022 Annex A.5.3** — audit-trail alternative-compliance route fails for destructive ops
- **ISO 27001:2022 Annex A.12.4.1** — user-activity logging requirement not fully met

**Current defenses:** 30+ shipped `auditService.record` callsites across other modules (Engine 5 governance + capacity, template-center, governance-exceptions, auth, portfolios). The discipline operates correctly **outside** workspace-members.service.ts; the single file is the gap.

**Residual risk (Red):** until Gap-F-A-1 through Gap-F-A-6 close, Repudiation is the dominant unmitigated threat.

**Remediation path:** Single-file scope (`workspace-members.service.ts`) for Gap-F-A-1 through Gap-F-A-6. Apply `setRole` dual-emission pattern uniformly. Add `WORKSPACE_OWNER_CHANGED` constant. Tracked as `FW-STRIDE-002` (cross-references [F-A FW-F-A-001 + Debt-F-A-001 through 006](../foundations/f-a-audit-trail.md#architectural-debt--future-work-summary-1)).

**Wording-precision note (per architect Gate 4 carry):** Single-file remediation scope applies to Gap-F-A-1 through Gap-F-A-6 only. Gap-F-A-7 (dashboard publish) and Gap-F-A-8 (template publish) require additional remediation surfaces (dashboard service + template-center service) — not single-file.

### 9.5.4 Information Disclosure

**Threats:**

- **Audit-row cross-tenant exposure.** Audit-read access via Engine 6 dashboards could over-fetch.
- **Audit-read access not itself audited.** Operators reading audit rows leave no trail.

**Current defenses:**

- **`@Index('IDX_audit_events_org_created', ['organizationId', 'createdAt'])`** + every read query starts with `WHERE organizationId = …`.
- **Sanitization on emission** ([ADR-F-A-003](../foundations/f-a-audit-trail.md#adr-f-a-003--centralized-sanitization-via-sanitize_keys)) prevents secret-field exposure.

**Residual risks (Yellow):**

- **Audit-read auditing absent ([FW-F-A-005](../foundations/f-a-audit-trail.md#fw-f-a-005--audit-read-access-auditing)).** Tracked.

### 9.5.5 Denial of Service

**Threats:**

- **Audit-write back-pressure.** High-volume emission path could saturate database write capacity.

**Current defenses:**

- **`auditService.record` is non-throwing** ([ADR-F-A-002](../foundations/f-a-audit-trail.md#adr-f-a-002--dual-emission-semantics)) — primary user actions remain unaffected by audit-write outages.
- **Append-only entity** with two indexes — write path is bounded.

**Residual risks (Yellow):**

- **`AUDIT_WRITE_FAILED` log is the only signal** of emission outage. Operational concern; no metric emission yet (similar to F-B Debt-F-B-001).
- **Synchronous emission in same transaction** for `recordGuardEvent` — guard rejection cascade could compound if audit DB is slow.

### 9.5.6 Elevation of Privilege

**Threats:**

- **Audit-action constant cataloging is the contract.** Adding a fictional `AuditAction` value won't escalate, but absence of a needed constant (e.g., `WORKSPACE_OWNER_CHANGED`) prevents emission, which prevents reconstruction.

**Current defenses:**

- **Single-source-of-truth constants** ([ADR-F-A-004](../foundations/f-a-audit-trail.md#adr-f-a-004--single-source-of-truth-constants)) — refactor-safe.

**Residual risks (Green):** defended.

---

## Other Engine + Foundation Findings (Summary)

### Engine 5 (Governance) — Green / Yellow

- **Repudiation: well-defended.** Uniform `GOVERNANCE_EVALUATE` emission + governance-exceptions audit. Engine 5 is the canonical positive example of F-A integration.
- **Elevation: Yellow.** ADMIN_OVERRIDE pathway ([ADR-Engine-5-004](../engines/engine-5-governance.md#adr-engine-5-004--governance-exception-as-override-pathway)) requires explicit exception; abuse leaves audit trail. Limited spec coverage on the override path ([Debt-Engine-5-007](../engines/engine-5-governance.md#debt-engine-5-005--test-coverage-for-enforcementmodeadmin_override)).

### Engine 7 (Capacity) — Green / Yellow

- **Tampering: Yellow.** Resources-module-local `AuditLog` parallel to platform `AuditEvent` ([Debt-Engine-7-002](../engines/engine-7-capacity.md#debt-engine-7-002--resources-module-local-auditlog-entity-vs-platform-auditservice)). Two audit surfaces in same codebase — risk of divergent retention.
- **Repudiation: Green.** Capacity governance emits uniform `GOVERNANCE_EVALUATE`.

### Engine 8 (Budgets/EVM) — Yellow

- **Spoofing + Elevation: Yellow.** Three controllers ([Debt-Engine-8-001/002/003](../engines/engine-8-budgets-evm.md#debt-engine-8-001--projectbudgetscontroller-ad-hoc-role-mapping-sibling-rbac-todo)) read `x-workspace-role` header directly + use ad-hoc role mapping. Decision C principle violation; Theme C Phase 3 migration target.
- **Tampering on baseline data: Green.** Atomic snapshot persistence with pessimistic write lock ([ADR-Engine-8-004](../engines/engine-8-budgets-evm.md#adr-engine-8-004--atomic-snapshot-persistence-with-pessimistic-write-lock)) prevents concurrent-write corruption.

### F-B (Notifications) — Green

- **Spoofing/Tampering: Green.** Notification immutability ([ADR-F-B-001](../foundations/f-b-notifications.md#adr-f-b-001--notification-immutability-with-separate-read-state)) prevents tampering. Per-user dispatch boundaries enforced.
- **Repudiation: not currently audited via F-A** ([FW-F-B-005](../foundations/f-b-notifications.md#fw-f-b-005--forensic-audit-emission-for-high-priority-notifications)) — most notifications don't need forensic; high-priority might.

### F-C (Integrations) — Green / Yellow

- **Spoofing: Green.** HMAC SHA-256 + timing-safe comparison ([ADR-F-C-002](../foundations/f-c-integrations.md#adr-f-c-002--webhook-signature-verification-with-hmac-sha-256--timing-safe-comparison)).
- **Tampering: Green at message layer (HMAC integrity); Yellow at credential storage (KMS envelope encryption FW [FW-F-C-001](../foundations/f-c-integrations.md#fw-f-c-001--kms-backed-envelope-encryption-for-credentials)).**
- **Information Disclosure: Yellow** until KMS envelope encryption — single process-wide key compromise = all credentials.
- **Elevation: Yellow** — webhook timestamp tolerance FW [FW-F-C-008](../foundations/f-c-integrations.md#fw-f-c-008--webhook-timestamp-tolerance-replay-prevention) means signature-valid replay is possible.

### F-D (Capability Registry) — Yellow

- **Detection capability gap (Lesson #34 case):** No flag observability surface in-platform ([FW-F-D-003](../foundations/f-d-capability-registry.md#fw-f-d-003--admin-flag-observability-endpoint)). Documented + live-infra probe codified as discipline ([ADR-F-D-005](../foundations/f-d-capability-registry.md#adr-f-d-005--live-infrastructure-probe-discipline-lesson-34-application)).
- **Repudiation gap on flag mutations** ([FW-F-D-007](../foundations/f-d-capability-registry.md#fw-f-d-007--flag-mutation-audit-emission)). Operator turning flags on/off is consequential; not currently emitted to F-A.
- **Out-of-band flag reads** ([Debt-F-D-001](../foundations/f-d-capability-registry.md#debt-f-d-001--out-of-band-feature-flag-reads-bypass-the-registry)): `ZEPHIX_RESOURCE_AI_RISK_SCORING_V1` direct `process.env` reads bypass the typed registry — type-safety + observability bypassed.

---

## 9.6 Mitigations + Improvement Plan

### Red-severity priorities (close before SOC 2 audit prep)

| Item | Surface | Source doc | Effort estimate |
|---|---|---|---|
| **Close F-A Gap-F-A-1 through Gap-F-A-6 (workspace-members.service.ts forensic emission)** | Single-file scope: `workspace-members.service.ts` | [F-A Debt-F-A-001 through 006 + FW-F-A-001](../foundations/f-a-audit-trail.md#architectural-debt--future-work-summary-1) | Single PR, ~1-3 hours |
| **Add `WORKSPACE_OWNER_CHANGED` constant to `AuditAction` enum** | `audit.constants.ts` | [F-A FW-F-A-001](../foundations/f-a-audit-trail.md#fw-f-a-001--workspace_owner_changed-constant-addition) | One-line edit + emission paired |
| **Close F-A Gap-F-A-7 (dashboard publish forensic emission)** | Dashboard service | [F-A Section F-A.3](../foundations/f-a-audit-trail.md#gap-inventory--destructive-operations-with-analytics-emission-but-no-forensic-emission) Gap-F-A-7 | Service-level addition |
| **Close F-A Gap-F-A-8 (template publish constant + emission)** | Template-center service | [F-A Section F-A.3](../foundations/f-a-audit-trail.md#gap-inventory--destructive-operations-with-analytics-emission-but-no-forensic-emission) Gap-F-A-8 | New constant + emission |

### Yellow-severity remediation (Theme C Phase 3 + cryptographic upgrades)

| Item | Surface | Source doc | Notes |
|---|---|---|---|
| Engine 8 controllers ad-hoc role mapping | Theme C Phase 3 dispatch | [Engine 8 Debt-001/002/003](../engines/engine-8-budgets-evm.md#debt-engine-8-001--projectbudgetscontroller-ad-hoc-role-mapping-sibling-rbac-todo) | Migrate `requireOwnerOrAdmin` / `isOwnerOrAdmin` to `getEffectiveWorkspaceRole` |
| `WorkspacePermissionService` registry vs helper divergence | Engine 2 / RBAC | [Engine 2 Debt-Engine-2-001](../engines/engine-2-tenancy.md#debt-engine-2-001--workspacepermissionservice-registry-reconciliation) | Remove registry entry; helper is canonical |
| `AuditService.record` silent failure on destructive ops | F-A | [F-A Debt-F-A-009](../foundations/f-a-audit-trail.md#debt-f-a-009--auditservicerecord-non-throwing-semantics-on-destructive-operations) + [FW-F-A-003](../foundations/f-a-audit-trail.md#fw-f-a-003--strict-emission-semantics-for-destructive-ops-transactional-audit) | Transactional audit via `manager` parameter |
| KMS envelope encryption | F-C | [F-C FW-F-C-001](../foundations/f-c-integrations.md#fw-f-c-001--kms-backed-envelope-encryption-for-credentials) | Single-key compromise = all credentials |
| Webhook timestamp tolerance (replay prevention) | F-C | [F-C FW-F-C-008](../foundations/f-c-integrations.md#fw-f-c-008--webhook-timestamp-tolerance-replay-prevention) | ±5 min freshness window |
| Flag mutation audit emission | F-D | [F-D FW-F-D-007](../foundations/f-d-capability-registry.md#fw-f-d-007--flag-mutation-audit-emission) | Add `FEATURE_FLAG_CHANGED` action + emission |
| Flag observability surface | F-D | [F-D FW-F-D-003](../foundations/f-d-capability-registry.md#fw-f-d-003--admin-flag-observability-endpoint) | Closes Lesson #34 staleness pattern |

### New STRIDE-originated FW items

| ID | Description | Severity addressed |
|---|---|---|
| `FW-STRIDE-001` | Global rate limiter for authenticated workspace-mutation endpoints | Yellow (DoS amplification) |
| `FW-STRIDE-002` | Coordinated dispatch closing Gap-F-A-1 through 6 (cross-references F-A FW items) | Red (Repudiation) |
| `FW-STRIDE-003` | Audit-read access auditing (cross-references F-A FW-F-A-005) | Yellow (Information Disclosure observability) |

### Improvement-plan summary

The threat model's improvement plan compounds with the per-engine FW/Debt inventories. **No new architectural redesign required to close Red items** — the gaps are emission-completion (single-file scope for Gap-F-A-1 through 6), constant additions (FW-F-A-001, FW-F-D-007), and migration coordination (Theme C Phase 3 for Engine 8 controllers).

This matches the F-A doc's compliance posture finding: substrate is forensic-grade where used; the gaps are completion debt, not architectural debt.

---

## 9.7 Industry Comparison

### OWASP Top 10 (2021)

The 2021 Top 10 categories that intersect this threat model:

[Source: owasp.org/Top10 — accessed 2026-05-07]

| OWASP Category | Zephix STRIDE mapping |
|---|---|
| A01:2021 Broken Access Control | Engine 1 (RBAC) Elevation; Engine 2 Information Disclosure |
| A02:2021 Cryptographic Failures | F-C credential storage (Yellow until KMS envelope) + JWT signing key management |
| A04:2021 Insecure Design | F-A Repudiation gaps map to "design pattern that doesn't satisfy compliance non-negotiable" |
| A07:2021 Identification and Authentication Failures | Engine 1 Spoofing (smoke-login key, JWT replay) |
| A09:2021 Security Logging and Monitoring Failures | F-A Repudiation gaps directly correspond — Top 10's specific Zephix instance |

**Where Zephix aligns**: tenant isolation at 4 layers (A01); HMAC signature verification (A02); centralized SANITIZE_KEYS (A09).

**Where Zephix has gaps**: A09 is the dominant unmitigated category (F-A.5 Repudiation) — closing the gap inventory directly addresses the Top 10's most relevant entry for this codebase.

**OBSERVABILITY-1 (A09, honest disclosure, 2026-07-18):** OpenTelemetry is *installed but inert* — the SDK is bumped and construction-tested, but there is no `ENABLE_TELEMETRY` flag, no exporter configured (`NodeSDK` has no `traceExporter`), and no trace destination. **Production observability is not yet enabled.** This is not armed-but-idle (it makes no claim to be active), but a buyer's reviewer should read it here rather than discover it: the platform currently cannot emit or observe distributed traces in production. Activation is scoped as OBSERVABILITY-1, post-tester / PROD-CUTOVER-adjacent — a cutover concern, not a staging one.

### OWASP API Security Top 10 (2023)

[Source: owasp.org/API-Security — accessed 2026-05-07]

| OWASP API Category | Zephix STRIDE mapping |
|---|---|
| API1:2023 Broken Object Level Authorization | Engine 2 cross-tenant queries; defended by tenant-aware repository |
| API2:2023 Broken Authentication | Engine 1 Spoofing; defended by JWT-bound auth context |
| API3:2023 Broken Object Property Level Authorization | RBAC over-fetch; defended by per-controller scope predicates |
| API4:2023 Unrestricted Resource Consumption | DoS Yellow finding (FW-STRIDE-001) |
| API5:2023 Broken Function Level Authorization | Theme C Phase 3 migration target (Engine 8 controllers) |
| API8:2023 Security Misconfiguration | F-D out-of-band flag reads (Debt-F-D-001) + KMS envelope encryption FW |
| API9:2023 Improper Inventory Management | F-D no flag observability surface (FW-F-D-003); Lesson #34 application territory |
| API10:2023 Unsafe Consumption of APIs | F-C webhook idempotency + signature verification + rate-limit-aware client (FW-F-C-010) |

**Where Zephix aligns**: API1 (tenant isolation), API2 (JWT discipline), API10 (HMAC signature + canonical-JSON idempotency).

**Where Zephix has gaps**: API4 (no global rate limiter), API5 (Engine 8 ad-hoc role mapping), API8 (KMS envelope FW), API9 (no flag observability).

### NIST SP 800-30 Rev. 1 — Risk Assessment

[Reference: NIST SP 800-30 Rev. 1 — Guide for Conducting Risk Assessments]

NIST SP 800-30 Rev. 1's risk-rating methodology (likelihood × impact) maps to the severity classification used here:

- **Red (HIGH)** ↔ NIST "High" or "Very High" likelihood + impact
- **Yellow (MEDIUM)** ↔ NIST "Moderate" likelihood × "Moderate" impact
- **Green (LOW)** ↔ NIST "Low" likelihood + impact OR "Very Low" any-axis

The F-A Repudiation gap inventory rates as Red because:
- Likelihood: **High** — every destructive operation through the affected paths is a potential evidence gap
- Impact: **High** — SOC 2 CC7.2 partial impairment is a real audit-readiness blocker

### MITRE ATT&CK Enterprise

[Source: attack.mitre.org/matrices/enterprise — accessed 2026-05-07]

ATT&CK techniques most relevant to the surface:

- **T1078 Valid Accounts** — Engine 1 Spoofing defenses; smoke-login key management
- **T1190 Exploit Public-Facing Application** — F-C webhook controllers; defended by signature verification + rate limiter
- **T1565 Data Manipulation** — F-A append-only entity defends against application-tier mutation; database-tier requires operational policy
- **T1562 Impair Defenses** — F-D flag mutation audit emission gap (FW-F-D-007) — turning a security flag off should leave forensic record
- **T1070 Indicator Removal** — F-A retention service implementation absent (Debt-F-A-007); audit-row deletion currently happens (if at all) without meta-audit trail

### ISO 27001:2022 Annex A

Key control mappings:

- **A.5.3 Segregation of Duties** — F-A Repudiation gaps impair this control's audit-trail alternative-compliance route
- **A.8.22 Segregation of Networks** — Engine 2 tenant isolation logical-segregation pattern
- **A.10.1.1 Cryptographic Controls** — F-C AES-256-GCM + HMAC SHA-256 alignment
- **A.12.4.1 Event Logging** — F-A user-activity logging requirement (gap inventory shortfall)
- **A.12.4.3 Administrator and Operator Logs** — F-D flag mutation emission gap (FW-F-D-007)

### SOC 2 Trust Services Criteria

- **CC6.1 / CC6.6** Logical and Physical Access Controls — Engine 1 / 2 / Decision C contract alignment
- **CC7.1** System Operations — F-C rate-limiting (FW-F-C-010) and replay-prevention (FW-F-C-008)
- **CC7.2** Security Event Detection — **F-A repudiation gap inventory directly impairs this control**
- **CC8.1** Change Management — F-D flag mutation audit emission gap (FW-F-D-007)

---

## Cross-document navigation

- Engine docs: [Engine 2 (Tenancy)](../engines/engine-2-tenancy.md), [Engine 5 (Governance)](../engines/engine-5-governance.md), [Engine 7 (Capacity)](../engines/engine-7-capacity.md), [Engine 8 (Budgets/EVM)](../engines/engine-8-budgets-evm.md)
- Foundations: [F-A (Audit)](../foundations/f-a-audit-trail.md), [F-B (Notifications)](../foundations/f-b-notifications.md), [F-C (Integrations)](../foundations/f-c-integrations.md), [F-D (Capability Registry)](../foundations/f-d-capability-registry.md)
- Architect state: [Architect-side Carries Inventory](../architect-state/architect-side-carries.md) (forthcoming)

---

**End of STRIDE Threat Model.**
