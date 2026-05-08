# F-A — Audit Trail

**Status**: Substantively built (Phase 3B append-only entity + 30+ forensic emission sites + Decision C guard audit + SANITIZE_KEYS); **multiple destructive-operation forensic gaps documented (HALT-DOC-BE-4 territory)**
**Owner Foundation**: F-A (per Blueprint v2 §4)
**Foundation Boundary**: Forensic-grade audit emission (`auditService.record`) + guard authorization audit (`auditService.recordGuardEvent`) + audit event entity + sanitization + entity/action constant registry; distinguished from analytics-stream emission (`events.track`)
**HEAD at authoring**: `d68001e6` on `docs/engines-be-evaluation-cycle` (worktree at `../ZephixApp-be-docs`)

**HALT-DOC-BE-4 sensitivity note (per architect Gate 4):** F-A is the compliance-posture foundation. Section F-A.3 documents shipped audit emission infrastructure AND a comprehensive inventory of destructive-operation forensic gaps with file:line evidence. Per the architect's discipline for this dispatch, gaps are surfaced explicitly with severity classification, not glossed. The worst gap (silent failure on success-case destructive operations) directly impairs SOC 2 CC7.2 + ISO 27001 A.12.4 compliance posture and is escalated in Section F-A.6.

**Naming convention:**
- `Debt-F-A-XXX` — current architectural debt requiring repair
- `FW-F-A-XXX` — forward-roadmap items where shipped substrate enables future surface

---

## F-A.1 Purpose & Scope

F-A is the substrate that answers the regulator's, auditor's, or operator's question: **"who did what, when, against which tenant entity, with what outcome?"** The answer must be durable, append-only, sanitized, and structurally complete enough to support SOC 2 Type II audit evidence + ISO 27001 A.12.4 logging requirements + customer-side compliance attestation.

### What F-A IS responsible for

- **Forensic emission API** — `auditService.record()` for business-event audit (governance evaluations, role changes, exceptions, etc.)
- **Guard authorization audit API** — `auditService.recordGuardEvent()` for ALLOW/DENY guard decisions on registered routes
- **Append-only persistence** — `AuditEvent` entity with no `@UpdateDateColumn` and no `@DeleteDateColumn` (forensic immutability)
- **Sanitization** — `SANITIZE_KEYS` set strips sensitive fields (token, refresh, password, secret, signature, presigned, accessKey, secretKey, apiKey, authorization, cookie) from JSONB payloads before persistence
- **Entity + action constant registry** — `AuditEntityType` (24 values) + `AuditAction` (37 values) + `AuditSource` (9 values) enums as single source of truth ("No string literals elsewhere" per file header)
- **Decision C DENY integration** — `GuardAuditAuthzExceptionFilter` emits DENY guard events on 401/403 from registered routes
- **Decision C ALLOW integration** — `GuardAuditInterceptor` emits ALLOW guard events on registered destructive routes (config/destructive 2xx)

### What F-A is NOT responsible for

- **Tenant scope enforcement** — owned by Engine 2. F-A receives `(organizationId, workspaceId)` from the caller and trusts it.
- **The decision being audited** — F-A is the persistence layer for "what happened"; the decision layer is owned by Engines 1 / 2 / 5 / 7 / 8 / individual modules.
- **Analytics-stream emission** — `events.track('…', …)` is a separate channel (Engine 6 dashboards / product analytics) and does NOT satisfy forensic audit requirements (see Section F-A.5.1 + F-A.3 gap inventory).
- **Retention purge implementation** — `RETENTION_PURGE_BATCH` action constant exists, but the purge service implementation is absent from the audit module (see Debt-F-A-007).
- **Cross-module audit log unification** — the `resources/` module ships its own `AuditLog` entity (separate from `AuditEvent`). Reconciliation is Debt-F-A-008.

### Foundation boundary tests

| Question | Answer is F-A if… | Answer is *not* F-A if… |
|---|---|---|
| "Does this code call `auditService.record(…)`?" | yes — emission site | it consumes audit data (Engine 6 dashboard) |
| "Is this entity append-only?" | yes — `AuditEvent` | it's mutable business state (Engines 2 / 3 / 5 / etc.) |
| "Does this code derive `AuditAction` enum value?" | yes — caller of F-A | it interprets the action for business logic |
| "Does this code emit `events.track(…)` for a destructive op?" | not F-A — that's analytics. **F-A says destructive ops MUST also call `auditService.record`** | (see Section F-A.3 gap inventory) |

---

## F-A.2 Architectural Decisions (Retrospective ADRs)

Six decisions shape F-A.

### ADR-F-A-001 — Append-Only `AuditEvent` Entity

**Context.** Audit events are forensic records. If they can be updated or deleted by application code, the audit trail is corruptible — operators (or attackers) could alter history. Compliance frameworks (SOC 2 CC7.2, ISO 27001 A.12.4.2) require log integrity.

**Decision.** [`AuditEvent`](zephix-backend/src/modules/audit/entities/audit-event.entity.ts) is append-only by entity declaration:

```ts
/**
 * Phase 3B: Immutable audit event record.
 * No @UpdateDateColumn. No @DeleteDateColumn. Append-only.
 */
@Entity('audit_events')
@Index('IDX_audit_events_org_created', ['organizationId', 'createdAt'])
@Index('IDX_audit_events_org_entity', ['organizationId', 'entityType', 'entityId', 'createdAt'])
export class AuditEvent {
  // … 14 columns including organizationId, workspaceId, actorUserId,
  // actorPlatformRole, actorWorkspaceRole, entityType, entityId, action,
  // beforeJson, afterJson, metadataJson, ipAddress, userAgent, createdAt
}
```

The schema enforces no soft-delete column; TypeORM cascades for delete are absent. Two indexes optimize the canonical forensic-query patterns (org+time, org+entity+time).

**Consequences.**

- **Forensic immutability at the entity level.** Application code cannot accidentally update or soft-delete an audit row.
- **Database-level mutation requires intentional admin action.** A malicious or careless DBA can still mutate via raw SQL — append-only at the application tier is necessary but not sufficient. Production policy must enforce restricted DBA access. (Out of scope for F-A code; flagged as operational concern.)
- **No retention via soft-delete.** Purge requires hard DELETE — see ADR-F-A-006 (RETENTION_PURGE_BATCH action) and Debt-F-A-007 (implementation absent).

---

### ADR-F-A-002 — Dual Emission Semantics: `record` (Non-Throwing) vs. `recordGuardEvent` (Throwing)

**Context.** Two distinct emission needs surfaced:

- **Business-event audit** — services emit "this transition happened" / "this exception was created" after the underlying business operation succeeds. If the audit write fails, the business operation has already happened; throwing would corrupt the user-visible result.
- **Guard authorization audit** — guard interceptors emit "this 401/403 was issued" or "this 2xx was allowed." If the audit write fails, the caller MUST know — silent guard-audit failure is a compliance gap.

**Decision.** Two emission methods on [`AuditService`](zephix-backend/src/modules/audit/services/audit.service.ts):

- **[`record(input, options?)`](zephix-backend/src/modules/audit/services/audit.service.ts#L62)** — non-throwing. On persistence failure: logs `AUDIT_WRITE_FAILED | …` at error level, returns the unsaved event object, **does not throw**. Caller treats audit emission as best-effort.
- **[`recordGuardEvent(input)`](zephix-backend/src/modules/audit/services/audit.service.ts#L104)** — strict. On persistence failure: logs and **rethrows** so the caller cannot treat a failed write as successful. Comment header explicitly states: "Unlike `AuditService.record`, persistence failures are logged and **rethrown** so callers cannot treat a failed write as successful."

**Consequences.**

- **Dual-semantics give callers explicit choice.** Engine services use `record` (best-effort); guard interceptors use `recordGuardEvent` (strict).
- **Non-throwing `record` is appropriate for most business events** — but for destructive operations (workspace ownership transfer, dashboard publish, template publish), silent failure means the forensic trail can be incomplete without the caller knowing. Tracked as **Debt-F-A-009** (destructive ops should emit through a throwing-variant or use a compensating transaction).
- **`AUDIT_WRITE_FAILED` log is the only signal** when `record` swallows a failure. Operators need a log alert on this string to detect emission failures in production. Operational concern; flagged.

---

### ADR-F-A-003 — Centralized Sanitization via `SANITIZE_KEYS`

**Context.** Audit JSONB payloads are operator-readable; they must not contain secrets that can leak through audit-log access. A scattered "remember to redact this field in this service" approach fails at scale.

**Decision.** [`audit.constants.ts`](zephix-backend/src/modules/audit/audit.constants.ts) exports a `SANITIZE_KEYS` set of forbidden keys:

```ts
export const SANITIZE_KEYS = new Set([
  'token', 'refresh', 'refreshToken', 'password', 'secret',
  'signature', 'presigned', 'presignedUrl', 'presignedPutUrl',
  'presignedGetUrl', 'url', 'storageEndpoint', 'accessKey',
  'secretKey', 'apiKey', 'authorization', 'cookie',
]);
```

`AuditService.record()` calls `sanitizeJson(input.before)`, `sanitizeJson(input.after)`, `sanitizeJson(input.metadata)` before persistence — every audit row passes through one sanitizer.

**Consequences.**

- **Single source of truth for redaction.** Adding a new sensitive field is a one-line edit to the set.
- **Defense-in-depth.** Even if a service forgets to redact, the central sanitizer catches the leak.
- **Cost.** New sensitive field types (e.g., a new auth scheme's "bearer-credential" field) require explicit addition. Mitigated by keeping the set close to the emission site for visibility.

---

### ADR-F-A-004 — Single-Source-of-Truth Constants (`AuditEntityType`, `AuditAction`, `AuditSource`)

**Context.** Audit emission with string literals scattered across services produces: (1) typos that silently miss in queries, (2) drift between modules' implicit "vocabulary" of what an action is called, (3) impossible refactoring (rename "delete" to "soft_delete" without finding every site).

**Decision.** All audit constants live in [`audit.constants.ts`](zephix-backend/src/modules/audit/audit.constants.ts) as TypeScript enums:

- `AuditEntityType` — 24 values (ORGANIZATION, WORKSPACE, PROJECT, …, GATE_APPROVAL, DOCUMENT_INSTANCE, AUTHORIZATION_DECISION)
- `AuditAction` — 37 values (CREATE, UPDATE, DELETE, …, GOVERNANCE_EVALUATE, GUARD_ALLOW, GUARD_DENY, TEMPLATE_APPLIED, GATE_DECIDE, …)
- `AuditSource` — 9 values for double-logging deduplication tags (ATTACHMENTS, SCENARIOS, BASELINES, …)

The file header makes the rule explicit: "Single source of truth for entity types and actions. **No string literals elsewhere.**"

**Consequences.**

- **Refactor-safe.** Renaming `DELETE` to `HARD_DELETE` requires touching the enum + all enum-using callsites; TypeScript's compiler catches it.
- **Query-side parity.** Engine 6 dashboards filter by enum; the enum is the contract.
- **Constant gaps are visible in this file.** `WORKSPACE_OWNER_CHANGED`, for example, is not in `AuditAction` (verified absent at HEAD via `grep -E "WORKSPACE_OWNER_CHANGED|OWNER_CHANGED|OWNERSHIP_TRANSFER"` returning empty). This makes the gap diagnosable rather than hidden.

---

### ADR-F-A-005 — Decision C Contract Integration via Guard Audit Filter + Interceptor

**Context.** Engine 2's Decision C contract (401 Unauthorized / 403 Forbidden for missing tenant context, on registered routes) requires forensic audit emission for both denials and allows. Two complementary mechanisms:

- **Filter** — global Nest exception filter that catches `ForbiddenException` and `UnauthorizedException` and emits DENY events.
- **Interceptor** — global Nest interceptor that emits ALLOW events for 2xx responses on routes registered as audited.

**Decision.** Both shipped in [`zephix-backend/src/common/audit/`](zephix-backend/src/common/audit/):

- [`GuardAuditAuthzExceptionFilter`](zephix-backend/src/common/audit/guard-audit-authz-exception.filter.ts) — at line 60: `await this.auditService.recordGuardEvent(...)` for DENY
- [`GuardAuditInterceptor`](zephix-backend/src/common/audit/guard-audit.interceptor.ts) — at line 61: `await this.auditService.recordGuardEvent(...)` for ALLOW
- Route registration via `GuardAuditRouteRegistry` — only audited routes emit (avoids logging every health-check)

**Consequences.**

- **Decision C produces forensic emission**, not just an HTTP status code. The DENY event captures actor + endpoint + required role + reason.
- **Strict semantics** (rethrowing variant) means a guard-audit write failure surfaces immediately — operators know if compliance posture is degraded.
- **Cross-engine reuse.** Engines 1 / 2 / 5 / 7 / 8 controllers register their destructive routes once; the filter+interceptor handle emission centrally.

---

### ADR-F-A-006 — Retention Purge as a First-Class Audit Action (Constant Reserved; Implementation FW)

**Context.** Audit retention requires a controlled purge process — append-only persistence means automatic delete must itself be auditable.

**Decision.** Reserve `RETENTION_PURGE_BATCH` action constant ([audit.constants.ts:69](zephix-backend/src/modules/audit/audit.constants.ts#L69)) for the purge process to use when it eventually runs. Each purge batch emits an audit event of itself (meta-audit) with metadata about which rows were purged and why.

**Consequences.**

- **The purge has a consent shape.** When the service exists, it cannot purge silently — the purge itself emits.
- **Constant precedes implementation by design.** Reserving the action allows existing code to depend on it without churn when the implementation lands.
- **Implementation is FW.** [Audit module](zephix-backend/src/modules/audit/) does not currently include a retention service. Tracked as **Debt-F-A-007**.

---

## F-A.3 Current Implementation State + GAP INVENTORY

**This section is gap-explicit per architect Gate 4 + HALT-DOC-BE-4 sensitivity. Compliance impact escalated in Section F-A.6.**

### Shipped emission infrastructure

| Component | File | Role |
|---|---|---|
| `AuditEvent` entity | [audit-event.entity.ts](zephix-backend/src/modules/audit/entities/audit-event.entity.ts) | Append-only persistence; 14 columns; 2 indexes |
| `AuditService.record` | [audit.service.ts:62](zephix-backend/src/modules/audit/services/audit.service.ts#L62) | Non-throwing business-event emission |
| `AuditService.recordGuardEvent` | [audit.service.ts:104](zephix-backend/src/modules/audit/services/audit.service.ts#L104) | Throwing strict guard-event emission |
| `GuardAuditAuthzExceptionFilter` | [guard-audit-authz-exception.filter.ts](zephix-backend/src/common/audit/guard-audit-authz-exception.filter.ts) | DENY emission on 401/403 |
| `GuardAuditInterceptor` | [guard-audit.interceptor.ts](zephix-backend/src/common/audit/guard-audit.interceptor.ts) | ALLOW emission on registered destructive 2xx routes |
| `AuditAction` enum (37 values) | [audit.constants.ts](zephix-backend/src/modules/audit/audit.constants.ts) | Single-source-of-truth action vocabulary |
| `AuditEntityType` enum (24 values) | [audit.constants.ts](zephix-backend/src/modules/audit/audit.constants.ts) | Single-source-of-truth entity vocabulary |
| `SANITIZE_KEYS` set (16 keys) | [audit.constants.ts](zephix-backend/src/modules/audit/audit.constants.ts) | Centralized JSONB payload redaction |

### Forensic-emission inventory across modules (verified at HEAD)

`auditService.record` is invoked from 30+ callsites across these modules:

- **work-management** — `capacity-calendar.controller.ts:132`, `capacity-governance.service.ts:129`, `schedule-reschedule.service.ts:135`, `baseline.service.ts:113 + 174`, `work-risks.service.ts:542`, `work-tasks.service.ts:1226`
- **template-center** — `template-apply.service.ts:86 + 304`, `gate-approvals.service.ts:151 + 194`, `document-lifecycle.service.ts:118 + 139 + 171 + 230`
- **governance-exceptions** — `governance-exceptions.service.ts:44 + 131`
- **auth** — `auth.controller.ts:226`, `auth.service.ts:580 + 1249 + 1335`, `auth-registration.service.ts:253 + 267 + 280 + 293`, `email-verification.service.ts:131`
- **portfolios** — `portfolios.service.ts:215 + 249`
- **workspaces** — `workspace-invite.service.ts:284`, `workspace-members.service.ts:409` (only 1 call in this file — see gap inventory below)

### Analytics-stream emission inventory (`events.track`)

`events.track` is invoked from these workspace-members.service.ts sites:

- Line 161: `'workspace.role.changed'` (idempotent role-update branch in addMember)
- Line 181: `'workspace.member.added'`
- Line 272: `'workspace.member.removed'`
- Line 397: `'workspace.role.changed'` (dedicated setRole)
- Line 515: `'workspace.owner.changed'`
- Line 593: `'workspace.member.suspended'`
- Line 646: `'workspace.member.reinstated'`

### **GAP INVENTORY — destructive operations with analytics emission but no forensic emission**

**Severity classification: HIGH (compliance-impairing). HALT-DOC-BE-4 candidates per architect Gate 4 sensitivity.**

| Gap ID | Operation | Site | Emission today | Gap |
|---|---|---|---|---|
| Gap-F-A-1 | Workspace ownership transfer | [workspace-members.service.ts:515](zephix-backend/src/modules/workspaces/services/workspace-members.service.ts#L515) inside `changeOwner()` method | `events.track('workspace.owner.changed', …)` only | No `auditService.record()` paired; `WORKSPACE_OWNER_CHANGED` constant absent from `AuditAction` |
| Gap-F-A-2 | Workspace member added (initial create path) | [workspace-members.service.ts:181](zephix-backend/src/modules/workspaces/services/workspace-members.service.ts#L181) | `events.track('workspace.member.added', …)` only | No `auditService.record()` paired; existing constants `INVITE` / `ACCEPT` / `CREATE` could anchor a forensic emission |
| Gap-F-A-3 | Workspace member role-changed (idempotent path via addMember) | [workspace-members.service.ts:161](zephix-backend/src/modules/workspaces/services/workspace-members.service.ts#L161) | `events.track('workspace.role.changed', …)` only | No `auditService.record()` paired. **Note:** the *dedicated* `setRole` method (line 397/409) DOES have dual emission — this gap is the addMember idempotent branch only |
| Gap-F-A-4 | Workspace member removed | [workspace-members.service.ts:272](zephix-backend/src/modules/workspaces/services/workspace-members.service.ts#L272) | `events.track('workspace.member.removed', …)` only | No `auditService.record()` paired; existing constant `DELETE` could anchor |
| Gap-F-A-5 | Workspace member suspended | [workspace-members.service.ts:593](zephix-backend/src/modules/workspaces/services/workspace-members.service.ts#L593) | `events.track('workspace.member.suspended', …)` only | No `auditService.record()` paired; existing constant `SUSPEND` could anchor |
| Gap-F-A-6 | Workspace member reinstated | [workspace-members.service.ts:646](zephix-backend/src/modules/workspaces/services/workspace-members.service.ts#L646) | `events.track('workspace.member.reinstated', …)` only | No `auditService.record()` paired; existing constant `REINSTATE` could anchor |
| Gap-F-A-7 | Dashboard publish / unpublish | [dashboards.controller.ts:454, 476](zephix-backend/src/modules/dashboards/controllers/dashboards.controller.ts#L454) | Controller invokes service; service-level forensic emission unverified at this controller probe; gap-candidate pending service-level confirmation | If unverified, treat as gap until confirmed otherwise |
| Gap-F-A-8 | Template publish | No explicit publish controller endpoint surfaced via grep; templates have `publishedAt` timestamp but no dedicated publish action | Implicit publish via field update; no audit emission tied to the act of publishing | Constant + emission both absent |

**Pattern observation:** Six of seven `events.track` calls in `workspace-members.service.ts` lack paired forensic emission. The single dual-emission path (line 397/409 `setRole`) is the canonical positive example — Phase 3B labeling: `// Phase 3B: Audit role change`. The intent was to dual-emit; the execution is incomplete.

### Other architectural concerns

- **`AuditService.record` is non-throwing** (ADR-F-A-002). Combined with the gap inventory above, destructive operations that *do* emit forensic audit can also lose emissions silently if the audit write fails. `AUDIT_WRITE_FAILED` log is the only signal. Tracked as **Debt-F-A-009**.
- **Retention service is not present in the audit module** (ADR-F-A-006 reserved the constant; implementation is FW). Production retention currently relies on database-level cron / DBA process or accumulates indefinitely.
- **`resources/` module ships its own `AuditLog` entity** ([Engine 7 Debt-Engine-7-002 cross-ref](../engines/engine-7-capacity.md#debt-engine-7-002--resources-module-local-auditlog-entity-vs-platform-auditservice)), parallel to platform `AuditEvent`. Two audit surfaces in the same codebase.

---

## F-A.4 Integration Patterns

### F-A ↔ Engine 1 (RBAC)

- RBAC mutations (role grants, role revokes, permission changes) MUST emit forensic audit. Currently: dedicated `setRole` does (workspace-members.service.ts:409); other paths in the same file do not (Gap-F-A-3, Gap-F-A-2, Gap-F-A-4, Gap-F-A-5, Gap-F-A-6).
- Guard ALLOW/DENY emission via `GuardAuditAuthzExceptionFilter` + `GuardAuditInterceptor` covers Decision C contract (ADR-F-A-005).

### F-A ↔ Engine 2 (Tenancy)

- All audit emission carries `(organizationId, workspaceId)` from Engine 2 tenant context.
- Decision C 401/403 emit DENY guard events (ADR-F-A-005).
- **Critical gap (Gap-F-A-1):** workspace ownership transfer, the canonical destructive Engine 2 operation, has no forensic emission. Documented in [Engine 2 Debt-Engine-2-002](../engines/engine-2-tenancy.md#debt-engine-2-002--f-a-success-case-audit-emission-on-destructive-engine-2-mutations).

### F-A ↔ Engine 5 (Governance)

- Engine 5 is the **canonical positive example** of F-A integration.
- Every governance evaluation (rule-engine + capacity + exception) emits `AuditAction.GOVERNANCE_EVALUATE` with full metadata.
- Pattern referenced from [Engine 5 doc Section 5.3](../engines/engine-5-governance.md#audit-emission-state).

### F-A ↔ Engine 7 (Capacity)

- Capacity-governance shares the Engine 5 pattern: uniform `GOVERNANCE_EVALUATE` emission.
- **Architectural concern:** `resources/` module ships local `AuditLog` entity parallel to platform `AuditEvent`. Tracked as Debt-Engine-7-002 + Debt-F-A-008.

### F-A ↔ Engine 8 (Budgets/EVM)

- Phase 2B `BudgetGovernanceService` emits `GOVERNANCE_EVALUATE` (uniform with Engines 5 + 7).
- `BaselineService` emits audit on baseline creation + activation.
- Both anchored in [Engine 8 doc ADR-Engine-8-005](../engines/engine-8-budgets-evm.md#adr-engine-8-005--phase-2b-budget-governance-with-warn-mode-20-threshold).

### F-A ↔ Engine 6 (Dashboards)

- Engine 6 is the **read-side consumer** of audit events: forensic-trail dashboards, governance-decision histograms, gate-decision distribution.
- **Gap-F-A-7:** dashboard publish/unpublish controller paths route to service; service-level forensic emission unverified at controller probe. Gap-candidate.

---

## F-A.5 Practitioner Discipline + Competitive Positioning

### F-A.5.1 — What Discipline Requires

Audit trail is the most-confused concept in B2B PM tooling. Most platforms ship "activity logs" or "history feeds" and call them audit trails; auditors and compliance teams consistently reject those as evidence. The discipline requires structural distinctions that consumer-grade activity logs collapse.

Robust audit-trail discipline requires the following non-negotiables:

- **Audit emission is forensic, not analytics.** A forensic audit captures who, what, when, against which entity, with what before/after state, with what outcome, immutable, append-only, sanitized. An analytics event captures user behavior for product instrumentation. The two are different storage systems with different retention, different access controls, different mutation semantics. Conflating them is the cardinal discipline error.
- **Append-only is structural, not policy.** "We don't update audit rows" enforced by team agreement is not a control. The schema must lack the columns that enable update + soft-delete; the entity declaration must be append-only; production DBA access must be restricted. Each layer is necessary.
- **Both ALLOW and DENY are forensic events.** A platform that audits only denials produces a misleading record: "this user was never denied this action" does not mean the action did not happen. ALLOW events are required to reconstruct what happened.
- **Sanitization is centralized.** Per-emission "remember to redact" works until one service forgets. The sanitizer must run on every emission, not at the discretion of the emitter.
- **Constants are single-source-of-truth.** String-literal action codes scattered across services produce silent typos and refactor-impossible vocabularies. The action enum is the contract.
- **Destructive operations MUST emit forensic audit on success.** Compliance requires reconstruction of "who transferred ownership of workspace X to user Y at time T." If the only record of that transfer is in an analytics stream (which has different retention, different access controls, different semantics), the record fails for compliance purposes.
- **Audit-write failure for destructive ops must surface.** Silent failure on a destructive operation's audit emission is a compliance failure mode that auditors specifically test for. The platform must distinguish best-effort emission (some events) from required emission (destructive ops).
- **Retention is a process with audit, not a forgotten cron.** A purge that runs without leaving an audit row is itself a forensic gap. The purge action must be a first-class audit action.
- **Audit-read access is itself audited.** Operators reading audit rows leave their own trail. Most platforms forget this; auditors check for it.
- **Cross-tenant audit-row exposure is a breach class.** Audit rows carry tenant identifiers; over-fetching across tenants is the same severity as cross-tenant business-data exposure.

What discipline explicitly forbids:

- Treating `events.track` (analytics) emission as audit-trail-equivalent.
- Mutable audit rows.
- Soft-deleted audit rows that operators can "purge mistakes from."
- String-literal action codes in service code.
- Silent failure on destructive-operation audit emission.
- Untracked retention purges.

### F-A.5.2 — What Existing Platforms Do (and Don't Do)

#### AWS CloudTrail

AWS CloudTrail is the canonical reference for cloud-platform audit. CloudTrail records API calls across AWS services, persists events to S3 + CloudWatch, integrates with CloudTrail Lake for query, and supports event integrity validation via SHA-256 hash chain.

[Source: aws.amazon.com/cloudtrail/features — accessed 2026-05-07]

- **Strength.** Cryptographic integrity validation; append-only by infrastructure; cross-region / cross-account aggregation; mature audit posture.
- **Miss for PM context.** CloudTrail is infrastructure-level — it audits API calls, not business operations. It does not know "user X transferred ownership of workspace Y to user Z" as a domain event; it knows "user X called API endpoint /workspaces/:id/change-owner" and the request body (potentially sanitized).
- **Where Zephix differs.** Zephix's `AuditEvent` records the *domain event* (`action: 'role_change'`, `entityType: 'workspace'`, `before/after JSON`) — the semantic operation, not the HTTP call shape. This is more useful for PM compliance reconstruction; less useful for infrastructure security audit.

#### Stripe API Event / Audit Logs

Stripe's audit logs (Sigma SQL access in the dashboard, plus Logs API) cover API request history and dashboard-user actions in the platform.

[Source: stripe.com/docs/api/events + stripe.com/docs/observability/audit-logs — accessed 2026-05-07]

- **Strength.** Per-tenant log scoping (one Stripe account = one tenant); SQL-queryable via Sigma; immutable retention; integration-friendly Events API.
- **Miss.** Audit log surface is dashboard-user actions + API request history. Not a generic business-event audit primitive available to integrators.
- **Where Zephix differs.** Zephix's audit emission is inside the application — every business service can emit. Customers don't need to install a separate audit SDK or enable a feature flag.

#### GitHub Audit Log API

GitHub Enterprise + Cloud expose an audit log API capturing organization/repo administration, security-relevant events, and (for Enterprise) workflow events.

[Source: docs.github.com/en/enterprise-cloud@latest/admin/monitoring-activity-in-your-enterprise/reviewing-audit-logs-for-your-enterprise — accessed 2026-05-07]

- **Strength.** Comprehensive coverage of GitHub admin actions; structured event types; Enterprise tier streaming to SIEM.
- **Miss.** Coverage is GitHub-specific (repos, orgs, workflows). Not a general-purpose business-domain audit primitive.
- **Where Zephix differs.** Zephix's `AuditAction` + `AuditEntityType` enums are the domain vocabulary — adding a new audited domain event is enum-additive, not platform-vendor-coupled.

#### Linear Audit History

Linear has an audit log feature for Enterprise customers covering team/workspace changes, member changes, integration installs.

[Source: linear.app/docs/audit-log — accessed 2026-05-07]

- **Strength.** Enterprise-tier feature with reasonable coverage of administrative events; UI surface in the admin console.
- **Miss.** Coverage gaps similar to other audit-as-feature platforms — not all destructive operations leave an audit row; enterprise-tier-only access reduces auditability for the segment that needs it most (smaller B2B customers facing SOC 2 audits).
- **Where Zephix differs.** Zephix's audit emission is platform-default, not enterprise-gated. The forensic substrate is the same for every customer; differential is in the read-side dashboard tier.

#### Atlassian Jira Audit Log

Jira Cloud Premium tier exposes audit logs for the cloud site; Cloud Free / Standard tiers do not.

[Source: support.atlassian.com/security-and-access-policies/docs/track-organization-activities-from-the-audit-log — accessed 2026-05-07]

- **Strength.** Coverage of organization-level and project-level admin events; SIEM integration on Premium.
- **Miss.** Tier-gated; the customer who outgrew Free/Standard is the customer who needs audit; the audit feature is the upsell anchor.
- **Where Zephix differs.** Zephix's audit emission infrastructure is platform-default per CLAUDE.md — not a tier-upsell feature. (Read-side tier differentiation may apply for some advanced query / streaming features in future, but the substrate is uniform.)

### F-A.5.3 — Zephix's Differentiation

F-A's architectural decisions enable concrete differentiation. **Anti-marketing discipline note:** Section F-A.3 inventories real gaps in current emission. The differentiations below are anchored in shipped substrate; the gaps are honestly labeled. No claim of "comprehensive audit coverage" is made — it is not currently true.

#### Differentiation 1 — Append-only entity declaration as forensic primitive

Per ADR-F-A-001, `AuditEvent` lacks `@UpdateDateColumn` and `@DeleteDateColumn` by entity declaration. Combined with two performance-tuned indexes (org+time, org+entity+time), this is forensic-grade persistence at the schema level — not a "we don't update these rows" team policy.

This is a different posture from most "activity log" implementations where mutability is structurally possible.

**Shipped.** Anchored in: [audit-event.entity.ts](zephix-backend/src/modules/audit/entities/audit-event.entity.ts) + entity comment header.

#### Differentiation 2 — Dual emission semantics (best-effort vs. strict) as architectural choice

ADR-F-A-002 ships two methods on the same service: `record` (non-throwing, business events) + `recordGuardEvent` (throwing, guard events). Most platforms ship a single semantics — usually best-effort everywhere — and inherit the trade-off without making it explicit. Zephix made the choice consciously and documented it in service-level comments.

The trade-off is real: best-effort everywhere preserves business-operation success in the face of audit-write failures; strict everywhere produces compliance-failures-as-availability-failures. Splitting the two by use-case is the right call.

**Shipped.** Anchored in: [audit.service.ts:62 + 104](zephix-backend/src/modules/audit/services/audit.service.ts#L62) + comment headers explicitly contrasting the two semantics.

#### Differentiation 3 — Decision C contract integration as platform property

Engines 1 / 2 / 5 / 7 / 8 all benefit from uniform Decision C audit emission via `GuardAuditAuthzExceptionFilter` + `GuardAuditInterceptor` (ADR-F-A-005). Adding a new audited route requires registering it in `GuardAuditRouteRegistry`; emission is automatic.

This is platform property, not per-controller responsibility. Competitors that layer audit on per-controller produce drift between controllers; Zephix doesn't.

**Shipped.** Anchored in: [common/audit/](zephix-backend/src/common/audit/) global filter + interceptor.

#### Differentiation 4 — SANITIZE_KEYS centralization as security-by-default

Per ADR-F-A-003, the sanitizer runs on every emission. Adding a new sensitive field type is a one-line change. Defense-in-depth — a service that forgets to redact is caught by the central sanitizer.

This contrasts with platforms where sanitization is per-emission and drifts as new sensitive field types are added.

**Shipped.** Anchored in: [audit.constants.ts SANITIZE_KEYS](zephix-backend/src/modules/audit/audit.constants.ts) + AuditService.record sanitizeJson invocations.

#### Differentiation 5 — Single-source-of-truth constants vocabulary

Per ADR-F-A-004, `AuditAction` (37 values) and `AuditEntityType` (24 values) are the contract. `AuditSource` (9 values) prevents double-logging. The "no string literals elsewhere" rule is in the file header.

Refactor safety + query parity + gap diagnosability are all properties of this design. (The visible absence of `WORKSPACE_OWNER_CHANGED` is itself diagnostic — gap discoverable by reading one file.)

**Shipped.** Anchored in: [audit.constants.ts](zephix-backend/src/modules/audit/audit.constants.ts) full enum declarations + file header policy.

#### Differentiation 6 — Architectural enabler for comprehensive destructive-operation forensic emission (FW-F-A-001)

The discipline (Section F-A.5.1) requires forensic emission on every destructive operation. Currently shipped: 30+ forensic emission sites, including the canonical `setRole` dual-emission pattern. Currently NOT shipped: forensic emission for 6 operations in `workspace-members.service.ts`, dashboard publish, template publish (Section F-A.3 gap inventory).

The architectural enabler is real: the emission API, the constants registry, the entity, the dual semantics, the sanitization, the guard integration are all shipped. The completion of pairing every destructive `events.track` with an `auditService.record` is FW. The completion is additive, not architectural.

Differentiation positioning: *the architectural foundation for compliance-complete forensic emission is shipped; closing the gap inventory is FW-F-A-001 + FW-F-A-002 (constants) + FW-F-A-003 (audit-write strict semantics for destructive ops).* **No fictional shipped feature claimed; no "comprehensive coverage" claim made; gaps explicit in Section F-A.3.**

**Substrate enabler shipped; surface FW (and Debt to close).** FW items: F-A-001 + F-A-002 + F-A-003.

#### Differentiation 7 — Architectural enabler for retention service (FW-F-A-004)

Per ADR-F-A-006, `RETENTION_PURGE_BATCH` constant is reserved; meta-audit-on-purge is part of the design. Implementation FW (no retention service in the audit module).

Differentiation positioning: *the audit-on-purge discipline is reserved in the constants registry; the service that performs the purge is FW.*

**Substrate enabler reserved; surface FW.** FW: F-A-004.

### Section F-A.5 summary

The architectural decisions (append-only entity, dual emission, Decision C integration, centralized sanitization, single-source-of-truth constants) are shipped and produce defensible differentiation. The gap inventory in Section F-A.3 is comprehensive and honestly labeled — closing it is FW + Debt work, not an architectural redesign. Anti-marketing discipline maintained: no claim of "comprehensive audit coverage" is made because Section F-A.3 documents the specific destructive operations that lack forensic emission today.

---

## F-A.6 Technical Debt + Future Work — COMPLIANCE ESCALATION

**This section escalates compliance impact per architect Gate 4 + HALT-DOC-BE-4 sensitivity.**

### Compliance posture summary

The shipped audit infrastructure is forensic-grade where used. The destructive-operation gaps documented in Section F-A.3 directly impair:

- **SOC 2 Type II Common Criteria CC7.2** (Detection of System Failures and Security Events): an auditor reviewing audit-event coverage of destructive workspace operations finds that 6 of 7 paths emit only analytics events. SOC 2 evidence requires forensic, not analytics-stream, records.
- **ISO 27001:2022 Annex A.5.3** (Segregation of Duties): the audit-trail alternative-compliance route fails for destructive operations that lack forensic emission. The control is partially impaired.
- **ISO 27001:2022 Annex A.12.4** (Logging and Monitoring): A.12.4.1 (event logging) requires that "user activities, exceptions, faults, and information security events" be logged. The destructive workspace operations are user activities; analytics-stream is not the logging system A.12.4.1 contemplates.

**Severity classification: HIGH.** Closing Gap-F-A-1 through Gap-F-A-6 (and ideally Gap-F-A-7 + Gap-F-A-8) moves Zephix from partial to full compliance for the controls cited above.

### Debt-F-A-001 through Debt-F-A-006 — Six destructive-operation forensic emission gaps

| ID | Operation | Site | Resolution |
|---|---|---|---|
| Debt-F-A-001 | Workspace ownership transfer | [workspace-members.service.ts:515](zephix-backend/src/modules/workspaces/services/workspace-members.service.ts#L515) | Add `WORKSPACE_OWNER_CHANGED` to `AuditAction` enum + emit via `auditService.record` after transaction commit |
| Debt-F-A-002 | Workspace member added (initial create) | [workspace-members.service.ts:181](zephix-backend/src/modules/workspaces/services/workspace-members.service.ts#L181) | Emit via `auditService.record` with action `INVITE` or new `WORKSPACE_MEMBER_ADDED` constant |
| Debt-F-A-003 | Workspace member role-changed (idempotent path) | [workspace-members.service.ts:161](zephix-backend/src/modules/workspaces/services/workspace-members.service.ts#L161) | Emit via `auditService.record` with action `ROLE_CHANGE` (matches dedicated `setRole` pattern at line 397/409) |
| Debt-F-A-004 | Workspace member removed | [workspace-members.service.ts:272](zephix-backend/src/modules/workspaces/services/workspace-members.service.ts#L272) | Emit via `auditService.record` with action `DELETE` (or new `WORKSPACE_MEMBER_REMOVED` constant) |
| Debt-F-A-005 | Workspace member suspended | [workspace-members.service.ts:593](zephix-backend/src/modules/workspaces/services/workspace-members.service.ts#L593) | Emit via `auditService.record` with action `SUSPEND` |
| Debt-F-A-006 | Workspace member reinstated | [workspace-members.service.ts:646](zephix-backend/src/modules/workspaces/services/workspace-members.service.ts#L646) | Emit via `auditService.record` with action `REINSTATE` |

**Risk.** HIGH (compliance-impairing per CC7.2 + A.12.4). Each gap is a missed opportunity for forensic reconstruction.

**Resolution path.** Single dispatch closing all six in `workspace-members.service.ts` (single file scope) — apply the `setRole` dual-emission pattern uniformly. Add `WORKSPACE_OWNER_CHANGED` constant. Audit emission is best-effort (record semantics) by default; consider Debt-F-A-009 (strict semantics for destructive ops) in same dispatch.

### Debt-F-A-007 — Retention service implementation absent

**State.** `RETENTION_PURGE_BATCH` action constant reserved (ADR-F-A-006). No retention service in [audit module](zephix-backend/src/modules/audit/) (verified — services dir contains audit.service only).

**Risk.** Medium-term. Audit table grows indefinitely without operator intervention. Production cron / DBA process may exist outside the codebase but is invisible to this audit.

**Resolution path.** Implement `AuditRetentionService` with configurable retention periods per `AuditAction`; emit `RETENTION_PURGE_BATCH` audit event for each purge batch (meta-audit). Tracked as `FW-F-A-004`.

### Debt-F-A-008 — Resources-module-local `AuditLog` parallel to platform `AuditEvent`

**State.** `resources/` module ships own `AuditLog` entity ([Engine 7 Debt-Engine-7-002](../engines/engine-7-capacity.md#debt-engine-7-002--resources-module-local-auditlog-entity-vs-platform-auditservice)) parallel to platform `AuditEvent`.

**Risk.** Medium. Two audit surfaces produce divergent retention, query, and export behavior. Compliance audits may surface inconsistencies.

**Resolution path.** Migrate resources module to platform `AuditService.record`; deprecate local `AuditLog`. Coordinated with Engine 7 dispatch.

### Debt-F-A-009 — `AuditService.record` non-throwing semantics on destructive operations

**State.** `AuditService.record` swallows persistence failures (logs `AUDIT_WRITE_FAILED` and returns the unsaved event). For destructive operations (Debt-F-A-001 through Debt-F-A-006), silent failure is itself a compliance gap.

**Risk.** Medium-High. Even after closing Debt-F-A-001 through 006, a database hiccup during the destructive-op transaction could leave the operation completed without forensic record.

**Resolution path.** Either (a) add a `recordStrict` variant on `AuditService` that rethrows (parity with `recordGuardEvent`), and route destructive emissions through it; or (b) wrap destructive-op transactions to include the audit write atomically, so failure of audit fails the operation. Option (b) is architecturally cleaner; tracked as `FW-F-A-003`.

### FW-F-A-001 — `WORKSPACE_OWNER_CHANGED` constant addition

**State.** Cross-references Debt-F-A-001. Adding the enum value is the first step of closing the gap.

**Resolution path.** One-line edit to `audit.constants.ts` `AuditAction` enum + the emission paired with the enum value.

### FW-F-A-002 — Per-action emission-required policy (compile-time)

**State.** Currently, the agreement that destructive operations should emit forensic audit is documentation-and-review-driven. A compile-time check (e.g., a TypeScript decorator on destructive controller methods that requires an audit emission within the call graph) would make the policy structural.

**Risk.** Medium-term. Future contributors may add destructive operations without forensic emission; the gap inventory expands silently.

**Resolution path.** Investigate decorator-based or AST-based enforcement; coordinate with Rule A lint extension (cross-engine consistency).

### FW-F-A-003 — Strict emission semantics for destructive ops (transactional audit)

**State.** Cross-references Debt-F-A-009. Wrapping destructive-op transactions to include the audit write atomically is the architectural fix for silent emission failure.

**Resolution path.** `AuditService.record` accepts an optional `manager: EntityManager` parameter ([line 63-65](zephix-backend/src/modules/audit/services/audit.service.ts#L63)) — the substrate for transactional audit is shipped. Closing this gap means destructive-op services use `manager` consistently. Per-service audit, per-service migration.

### FW-F-A-004 — Retention service implementation

**State.** Cross-references Debt-F-A-007.

**Resolution path.** Implement `AuditRetentionService`; configure retention windows per action class; emit meta-audit on each batch.

### FW-F-A-005 — Audit-read access auditing

**State.** Operators reading audit rows (via Engine 6 dashboards, admin tooling, or direct DB query) leave no trail. Per discipline (Section F-A.5.1: "audit-read access is itself audited"), this is a gap.

**Risk.** Low-Medium. Auditors check for this; principal of least surprise is that audit-read is itself auditable.

**Resolution path.** Add an "audit_read" event type emitted on dashboard query / admin-tooling read; coordinate with Engine 6 read path.

### Architectural debt + future-work summary

| ID | Type | Severity | Resolution |
|---|---|---|---|
| Debt-F-A-001 | Debt | HIGH (compliance) | Add `WORKSPACE_OWNER_CHANGED` + emit |
| Debt-F-A-002 | Debt | HIGH (compliance) | Emit on workspace.member.added |
| Debt-F-A-003 | Debt | HIGH (compliance) | Emit on idempotent role-changed |
| Debt-F-A-004 | Debt | HIGH (compliance) | Emit on workspace.member.removed |
| Debt-F-A-005 | Debt | HIGH (compliance) | Emit on workspace.member.suspended |
| Debt-F-A-006 | Debt | HIGH (compliance) | Emit on workspace.member.reinstated |
| Debt-F-A-007 | Debt | Medium | Implement retention service |
| Debt-F-A-008 | Debt | Medium | Migrate resources/ AuditLog to platform |
| Debt-F-A-009 | Debt | Medium-High | Strict emission semantics for destructive ops |
| FW-F-A-001 | Future Work | — | WORKSPACE_OWNER_CHANGED enum |
| FW-F-A-002 | Future Work | — | Compile-time emission-required policy |
| FW-F-A-003 | Future Work | — | Transactional audit (substrate shipped) |
| FW-F-A-004 | Future Work | — | Retention service implementation |
| FW-F-A-005 | Future Work | — | Audit-read access auditing |

---

## F-A.7 Architecture Decision Record History

### ADRs originating in this document

| ADR | Title | Status | Anchor PR/artifact |
|---|---|---|---|
| ADR-F-A-001 | Append-Only `AuditEvent` Entity | Accepted | Phase 3B |
| ADR-F-A-002 | Dual Emission Semantics (record vs. recordGuardEvent) | Accepted | audit.service.ts:62 + 104 |
| ADR-F-A-003 | Centralized Sanitization via SANITIZE_KEYS | Accepted | audit.constants.ts |
| ADR-F-A-004 | Single-Source-of-Truth Constants | Accepted | audit.constants.ts file header |
| ADR-F-A-005 | Decision C Contract Integration | Accepted | common/audit/ filter + interceptor |
| ADR-F-A-006 | Retention Purge as First-Class Audit Action | Accepted (constant); implementation FW | audit.constants.ts:69 |

### Cross-references to existing architectural artifacts

| Document | Relationship to F-A |
|---|---|
| [phase3b-audit-proof.md](../phase3b-audit-proof.md) | Phase 3B audit-trail proof; the empirical anchor for ADR-F-A-001 + ADR-F-A-004 |
| [AD-027_LOCKED.md](../AD-027_LOCKED.md), [AD-027-patch3-critical-path-rescoping.md](../AD-027-patch3-critical-path-rescoping.md) | AD-027 Section 12 authorization-decision audit; anchors `AUTHORIZATION_DECISION` entity type + `GUARD_ALLOW`/`GUARD_DENY` actions |
| [governance-evaluations-retention.md](../governance-evaluations-retention.md) | Retention policy reference; `governance_evaluations` table parallels audit retention concerns |
| [V21_RECONCILIATION_2026-05-04.md](../V21_RECONCILIATION_2026-05-04.md) | V21 reconciliation; audit boundary confirmed |
| [Engine 2 doc](../engines/engine-2-tenancy.md) | Engine 2 destructive-operation gaps (Debt-Engine-2-002 cross-ref to F-A.3 Gap-F-A-1) |
| [Engine 5 doc](../engines/engine-5-governance.md) | Canonical positive example of F-A integration (uniform GOVERNANCE_EVALUATE emission) |
| [Engine 7 doc](../engines/engine-7-capacity.md) | Local AuditLog reconciliation (Debt-Engine-7-002 ↔ Debt-F-A-008) |
| [Engine 8 doc](../engines/engine-8-budgets-evm.md) | Phase 2B budget governance + baseline service emission alignment |

### What this document is *not*

- **Not** an exhaustive audit-event catalog — the 30+ emission sites are listed by file:line in Section F-A.3 but the action+entity tuples for each are best read from the code.
- **Not** a SOC 2 / ISO 27001 audit-readiness checklist — the compliance escalation in Section F-A.6 is engineering-side; formal audit prep is a separate workstream.
- **Not** a retention policy specification — retention windows + purge schedule live in operational documentation when FW-F-A-004 lands.

### Cross-document navigation

- Foundation siblings: [F-B (Notifications)](f-b-notifications.md), [F-C (Integrations)](f-c-integrations.md), [F-D (Capability Registry)](f-d-capability-registry.md)
- Engine docs: [Engine 2 (Tenancy)](../engines/engine-2-tenancy.md), [Engine 5 (Governance)](../engines/engine-5-governance.md), [Engine 7 (Capacity)](../engines/engine-7-capacity.md), [Engine 8 (Budgets/EVM)](../engines/engine-8-budgets-evm.md)
- Security: [STRIDE Threat Model](../security/threat-model-stride.md) — F-A's gap inventory is direct input to the Repudiation category
- Architect state: [Architect-side Carries Inventory](../architect-state/architect-side-carries.md)

---

**End of F-A — Audit Trail architectural document.**
