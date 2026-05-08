# F-C — Integrations

**Status**: Substantively built — Jira fully shipped (client + sync + webhook + encrypted secrets + idempotency); Linear + GitHub declared in `IntegrationConnection.type` enum but **no client implementations exist** (declared-but-unimplemented; FW)
**Owner Foundation**: F-C (per Blueprint v2 §4)
**Foundation Boundary**: Third-party integration substrate — connection identity, authentication credential management, sync orchestration, webhook ingestion with signature verification, idempotency for cross-system delivery, external entity mapping
**HEAD at authoring**: `8e157a8c` on `docs/engines-be-evaluation-cycle` (worktree at `../ZephixApp-be-docs`)

**Naming convention:** `Debt-F-C-XXX` for current debt; `FW-F-C-XXX` for forward-roadmap items.

---

## F-C.1 Purpose & Scope

F-C answers the question: **"how does Zephix safely connect to a third-party system, authenticate, sync data both ways, ingest webhook events idempotently, and recover from failures?"** F-C owns the substrate from connection record through sync execution, including encryption-at-rest of credentials, signature-verified webhook ingestion, and dedup against duplicate event delivery.

### What F-C IS responsible for

- **`IntegrationConnection` entity** — per-org connection record with type, baseUrl, encrypted secrets, polling/webhook toggles, sync state tracking
- **Encrypted credential storage** — AES-256-GCM via `IntegrationEncryptionService` with auth-tag verification
- **Sync orchestration** — `IntegrationSyncService.syncNow()` with org-scoped connection lookup + JQL query construction
- **Jira REST client** — `JiraClientService` for issue search + retrieval
- **Webhook ingestion** — `IntegrationsWebhookController` with HMAC SHA-256 signature verification + timing-safe comparison
- **Idempotency for cross-system delivery** — `idempotency.util.ts` with canonical JSON serialization (sorted keys) + deterministic key generation
- **External entity mapping** — `ExternalUserMapping` + `ExternalTask` entities to bridge external IDs ↔ Zephix entities
- **Decision C contract enforcement** — closure across 6 integration sites (PR #264)
- **Domain event emission** — sync results published via `DomainEventsPublisher`

### What F-C is NOT responsible for

- **Tenant scope enforcement** — owned by Engine 2; F-C consumes `organizationId` from tenant context.
- **RBAC on integration controllers** — owned by Engine 1.
- **The third-party API itself** — F-C is the client; the remote API (Jira, Linear, GitHub) is external.
- **Audit emission infrastructure** — owned by F-A; F-C *uses* the emission API.
- **Notification delivery to integration channels** — Slack/Teams notification delivery is F-B (which depends on F-C integration substrate; see [F-B FW-F-B-003 + FW-F-B-004](f-b-notifications.md#fw-f-b-003--slack-channel-implementation)).
- **Mapping configuration UX** — Engine 6 owns the read/configure surfaces; F-C provides the substrate.

### Foundation boundary tests

| Question | Answer is F-C if… | Answer is *not* F-C if… |
|---|---|---|
| "Does this code encrypt or decrypt integration credentials?" | yes — `IntegrationEncryptionService` | it consumes already-decrypted credentials |
| "Does this code call a third-party REST API?" | yes — `JiraClientService` | it's a Zephix-internal API |
| "Does this code verify a webhook HMAC signature?" | yes — `IntegrationsWebhookController.verifyWebhookSignature` | it's a Zephix-internal trust boundary |
| "Does this code compute an idempotency key from an external payload?" | yes — `generateWebhookIdempotencyKey` | it's an internal request/operation idempotency |

---

## F-C.2 Architectural Decisions (Retrospective ADRs)

Six decisions shape F-C.

### ADR-F-C-001 — Encrypted Secrets at Rest with AES-256-GCM + Auth Tag

**Context.** Integration connections carry the credentials needed to act in the customer's third-party tenant — API tokens, OAuth refresh tokens, basic-auth passwords. Storing these in plaintext database columns is a breach class. Symmetric encryption with authenticated mode is the defensible choice for credentials that the platform itself must be able to decrypt to use.

**Decision.** [`IntegrationEncryptionService`](zephix-backend/src/modules/integrations/services/integration-encryption.service.ts) implements AES-256-GCM:

- **Algorithm**: `aes-256-gcm` (authenticated encryption — confidentiality + integrity)
- **Key**: read from `INTEGRATION_ENCRYPTION_KEY` env var; **startup-time validation** rejects keys shorter than 32 chars
- **IV**: per-encryption random 16 bytes (`crypto.randomBytes(16)`)
- **Auth tag**: captured from cipher and prepended to ciphertext
- **Wire format**: `iv:authTag:encrypted` (all hex, colon-separated)

`IntegrationConnection.encryptedSecrets` is a JSONB column storing the wire-format strings keyed by credential type (`apiToken`, `clientId`, `clientSecret`, `refreshToken`).

**Consequences.**

- **Confidentiality + integrity** — AES-256-GCM auth tag means a tampered ciphertext fails decryption (does not silently produce garbage plaintext).
- **Startup validation prevents misconfiguration** — service throws on construction if key is too short or absent. Integration features are unavailable rather than insecure.
- **Single-tier encryption.** No per-tenant data-key rotation (envelope encryption with KMS) shipped. FW-F-C-001 — KMS-backed envelope encryption for compliance-grade key management.

---

### ADR-F-C-002 — Webhook Signature Verification with HMAC SHA-256 + Timing-Safe Comparison

**Context.** Webhooks from third-party systems arrive at a public-facing endpoint. Without authentication, anyone can post fake events. Signature-based authentication is the standard pattern; the implementation details matter (timing-attack resistance, what gets signed).

**Decision.** [`IntegrationsWebhookController.verifyWebhookSignature`](zephix-backend/src/modules/integrations/integrations-webhook.controller.ts) implements:

- **HMAC SHA-256** over the raw request body (`createHmac('sha256', secret).update(rawBody).digest('hex')`)
- **Timing-safe comparison** — `timingSafeEqual(sigBuffer, expectedBuffer)` — prevents timing-attack discovery of valid signatures
- **Raw body required** — controller uses Nest's raw body capture; JSON.stringify-then-sign would fail because key ordering differs from the source

**Disabled by default.** Per the controller header comment: "DISABLED BY DEFAULT: Only processes webhooks when `connection.webhookEnabled === true`. Webhook signature verification enforced when `webhookSecret` is configured."

**Consequences.**

- **Forgery-resistant.** An attacker without the shared secret cannot produce a valid signature.
- **Timing-attack-resistant.** Sub-microsecond comparison timing differences would otherwise leak signature bytes; timing-safe comparison closes that channel.
- **Disabled-by-default posture.** Customer must explicitly enable webhook ingestion AND configure a webhook secret. No silent acceptance.
- **Cost.** Customer must configure the secret in both their Jira webhook setup and the Zephix `IntegrationConnection`. Mis-configuration produces 401, not silent acceptance.

---

### ADR-F-C-003 — Idempotency via Canonical JSON + Deterministic Key Generation

**Context.** Webhook delivery is at-least-once; the same event can arrive twice (network retry, third-party redelivery, customer-initiated replay). Without dedup, the same Jira issue update would be processed twice, producing double-counted state changes.

**Decision.** [`idempotency.util.ts`](zephix-backend/src/modules/integrations/utils/idempotency.util.ts) implements:

- **Canonical JSON serialization** — `canonicalJsonStringify` recursively sorts object keys before stringifying, producing deterministic output regardless of input key order
- **Deterministic idempotency key** — `generateWebhookIdempotencyKey(connectionId, payload)`:
  - **Primary**: `jira:webhook:{connectionId}:{webhookEvent}:{issue.id}:{timestamp}` (when all fields present)
  - **Fallback**: `jira:webhook:{connectionId}:{issue.key}:{issue.fields.updated}` (when timestamp missing — `updated` is more stable than `id`+`timestamp`)

The key feeds dedup logic at the consumer; duplicate keys produce no-op processing.

**Consequences.**

- **Dedup is deterministic** — same payload produces same key regardless of object key ordering.
- **Two-tier key strategy** — primary is most-specific; fallback covers payload variants. Stable across Jira webhook format minor changes.
- **Connection-scoped** — different `connectionId` produces different keys, even for the same external event. Multi-tenant safe.

---

### ADR-F-C-004 — Polling and Webhook as Independent Toggles

**Context.** Two delivery modes for sync are common: poll (Zephix periodically asks for updates) and push (third-party sends events via webhook). Customers might want one, both, or neither. Coupling them produces awkward configuration.

**Decision.** [`IntegrationConnection`](zephix-backend/src/modules/integrations/entities/integration-connection.entity.ts) has independent toggles:

```ts
@Column({ name: 'polling_enabled', type: 'boolean', default: false })
pollingEnabled: boolean;

@Column({ name: 'webhook_enabled', type: 'boolean', default: false })
webhookEnabled: boolean;
```

Both default `false`. Customer enables explicitly.

**Consequences.**

- **Customer chooses delivery mode** — webhooks are real-time but require third-party configuration; polling is simpler but lags.
- **Both can coexist** — a customer running both gets at-least-once delivery with potential dup; idempotency (ADR-F-C-003) handles the dup case.
- **Disabled-by-default posture aligns with ADR-F-C-002** (webhook signature verification disabled-by-default). Integrations are off until explicitly turned on.

---

### ADR-F-C-005 — Decision C Contract Closure Across 6 Sites (PR #264)

**Context.** Engine 2's Decision C contract requires uniform 401/403 semantics for missing tenant context. Integration controllers initially had ad-hoc tenant-context handling; PR #264 closed the inconsistencies.

**Decision.** Per PR #264 (referenced in [Engine 2 doc Section 2.3](../engines/engine-2-tenancy.md#decision-c-contract-enforcement-matrix-post-pr-269)): 6 sites in the integrations module migrated to the canonical Decision C contract.

**Consequences.**

- **Uniform error semantics** — integration endpoints fail closed the same way as workspace, KPI, and AI vector storage endpoints.
- **DENY emission via guard-audit filter** — 401/403 from integration endpoints emit forensic audit events (Engine 2 ADR-Engine-2-001 + F-A ADR-F-A-005).
- **Aligned with broader codebase** — reader can apply the same mental model to integration-module code as to other Decision C-bearing modules.

---

### ADR-F-C-006 — Connection-Level Sync State + Error Resilience Tracking

**Context.** Integrations fail. Network outages, third-party deprecation, expired tokens. The platform needs visibility into connection health without operator log-grep.

**Decision.** `IntegrationConnection` carries connection-level state:

- `status: 'active' | 'error' | 'paused'` — operator-visible health
- `errorCount: integer` — consecutive failures (incremented on sync failure, reset on success)
- `lastError: text` — latest error message
- `lastPolledAt: timestamp` — most recent poll
- `lastIssueUpdatedAt: timestamp` — high-water-mark for incremental sync

**Consequences.**

- **Operator-visible health** without log diving.
- **Incremental sync via high-water-mark** — `lastIssueUpdatedAt` lets the next poll fetch only newer items.
- **Auto-pause on persistent failure** is not yet implemented — `errorCount` could drive auto-status-change to `paused` after threshold (FW-F-C-002).

---

## F-C.3 Current Implementation State

### Module file inventory

```
integrations/
├── integrations.module.ts
├── integrations.controller.ts                  # CRUD on connections (auth, list, create, test)
├── integrations-webhook.controller.ts          # Jira webhook ingestion with HMAC verification
├── external-user-mappings.controller.ts        # external user ID → Zephix user mapping CRUD
├── dto/
│   ├── create-integration-connection.dto.ts
│   ├── create-external-user-mapping.dto.ts
│   ├── sync-now.dto.ts
│   └── test-connection.dto.ts
├── entities/
│   ├── integration-connection.entity.ts        # core connection (auth, secrets, sync state)
│   ├── external-task.entity.ts                 # imported task linkage
│   ├── external-task-event.entity.ts           # event audit for external tasks
│   └── external-user-mapping.entity.ts         # external user ID ↔ Zephix user
├── services/
│   ├── integration-connection.service.ts       # CRUD orchestrator
│   ├── integration-encryption.service.ts       # AES-256-GCM (ADR-F-C-001)
│   ├── integration-sync.service.ts             # syncNow orchestrator
│   ├── jira-client.service.ts                  # Jira REST client
│   ├── external-task.service.ts                # imported task processing
│   └── external-user-mapping.service.ts        # mapping CRUD
└── utils/
    └── idempotency.util.ts                     # canonical JSON + deterministic keys (ADR-F-C-003)
```

### Connection-type matrix (verified at HEAD)

| Type | Enum value | Client implementation | Sync support | Webhook support |
|---|---|---|---|---|
| Jira | `'jira'` | [`JiraClientService`](zephix-backend/src/modules/integrations/services/jira-client.service.ts) — full REST client | **Shipped** ([`syncNow`](zephix-backend/src/modules/integrations/services/integration-sync.service.ts)) | **Shipped** ([webhook controller](zephix-backend/src/modules/integrations/integrations-webhook.controller.ts)) |
| Linear | `'linear'` | **Not shipped** — declared in `IntegrationConnection.type` enum, no client class | Sync rejects: `if (connection.type !== 'jira') throw new Error('Sync not supported for integration type: ${connection.type}')` ([integration-sync.service.ts](zephix-backend/src/modules/integrations/services/integration-sync.service.ts)) | Not shipped |
| GitHub | `'github'` | **Not shipped** — same as Linear | Same rejection | Not shipped |

**Honest framing:** the type enum reserves three values; only Jira has a client. This is declared-but-unimplemented for Linear + GitHub. Tracked as `FW-F-C-003` (Linear) + `FW-F-C-004` (GitHub).

### Authentication-type matrix

| AuthType | Enum value | Status |
|---|---|---|
| API token | `'api_token'` | Shipped (Jira API tokens supported) |
| OAuth | `'oauth'` | Schema reserved (`clientId`, `clientSecret`, `refreshToken` in encryptedSecrets); no OAuth flow controller surfaced |
| Basic | `'basic'` | Schema reserved; not actively used |

The `encryptedSecrets` JSONB column accepts all four key types (`apiToken`, `clientId`, `clientSecret`, `refreshToken`); the active code path uses `apiToken` for Jira.

### Sync flow (verified at HEAD)

```
syncNow(connectionId, organizationId)
  ↓
Load IntegrationConnection where id=connectionId AND organizationId=orgId
  ↓
Validate: connection exists, enabled, type === 'jira'
  ↓
Build JQL query (default: "ORDER BY updated DESC"; uses connection.jqlFilter if set)
  ↓
Call JiraClientService.searchIssues
  ↓
For each issue: ExternalTaskService.upsertExternalTask(...)
  ↓
DomainEventsPublisher.publish(...)
  ↓
Update connection: lastPolledAt, lastIssueUpdatedAt (high-water mark)
  ↓
Return SyncNowResult { status, issuesProcessed, totalIssues, errorMessage? }
```

### Webhook ingestion flow (verified at HEAD)

```
POST /integrations/jira/webhook (raw body)
  ↓
Rate limiter guard
  ↓
Load IntegrationConnection by webhook URL or header
  ↓
If !connection.webhookEnabled → reject (disabled by default per ADR-F-C-002)
  ↓
If connection.webhookSecret configured:
  - Verify HMAC SHA-256 over raw body
  - Timing-safe comparison
  - Reject 401 if mismatch
  ↓
generateWebhookIdempotencyKey(connectionId, payload)
  ↓
Dedup against idempotency key store (consumer-side)
  ↓
ExternalTaskService.processWebhookEvent(...)
```

### Decision C contract enforcement (PR #264 closure)

6 sites in integrations module migrated to canonical Decision C semantics. Cross-references [Engine 2 doc Section 2.3 enforcement matrix](../engines/engine-2-tenancy.md#decision-c-contract-enforcement-matrix-post-pr-269).

---

## F-C.4 Integration Patterns

### F-C ↔ Engine 2 (Tenancy)

- All integration operations org-scoped — `IntegrationConnection.organizationId` + Decision C contract.
- Unique constraint `(organizationId, type, baseUrl)` prevents duplicate connections per tenant.

### F-C ↔ Engine 1 (RBAC)

- Integration connection CRUD requires admin role; controllers gate accordingly.
- (Specific RBAC enforcement pattern in integrations.controller follows the broader Theme C migration scope; refer to [Engine 2 Debt-005 / Theme C Phase 3](../engines/engine-2-tenancy.md#debt-engine-2-005--theme-c-phase-3-consumer-migration).)

### F-C ↔ Engine 3 (Work Management)

- `ExternalTask` entity bridges Jira issues to Zephix work items.
- `ExternalUserMapping` resolves Jira user identity to Zephix user identity.
- Sync results emit domain events; Engine 3 consumers project to work entities.

### F-C ↔ F-A (Audit Trail)

- Integration mutations should emit forensic audit. Currently shipped: Decision C DENY events emit via guard-audit filter (PR #264). Business-event audit emission for integration mutations (connect, sync, disconnect, webhook-event-processed) is patchy — gap-candidate; tracked as Debt-F-C-001 pending audit-trace probe.

### F-C ↔ F-B (Notifications)

- **Critical dependency for F-B FW**: F-B's Slack + Teams channels depend on F-C integration substrate. Currently F-C does not have Slack or Teams connection types — those are FW-F-C-005 + FW-F-C-006.

### F-C ↔ Engine 5 (Governance)

- No direct integration today. Future: governance rules could fire on integration events (e.g., "block sync if rule X violated"); currently out of scope.

---

## F-C.5 Practitioner Discipline + Competitive Positioning

### F-C.5.1 — What Discipline Requires

Third-party integrations are the surface where the platform meets reality. Reality includes: rate limits the platform doesn't control, transient network outages, third-party API deprecation, customer-tenant credential rotations. Discipline is the difference between integrations that work and integrations that randomly break.

Robust integration discipline requires the following non-negotiables:

- **Credentials at rest must be encrypted with authenticated encryption.** Plaintext credentials in a database column is a breach class. Symmetric encryption without authentication mode (raw AES-CBC) lets an attacker tamper ciphertext into different plaintext. Authenticated encryption (AES-GCM, ChaCha20-Poly1305) closes that channel. Compliance-grade posture requires KMS-backed envelope encryption with per-tenant data keys.
- **Webhooks must be signature-verified with timing-safe comparison.** A public-facing webhook endpoint without authentication is anyone's input. HMAC signature verification is standard; the timing-safe comparison detail matters because string-equality comparison leaks signature bytes via timing.
- **Idempotency for at-least-once delivery.** Webhooks can be delivered twice; sync can run mid-failure and resume. Without idempotency, the same external event produces duplicate side effects. Deterministic key generation with canonical-JSON serialization is the discipline-grade pattern.
- **Disabled by default.** Integration features are off until explicitly turned on by the customer. Defaults are quiet; opt-in is explicit. This is a security posture: an integration that ships enabled-by-default is an attack surface that customers didn't ask for.
- **Per-tenant credential isolation.** A connection record belongs to one organization; cross-tenant credential bleed is a breach class. Schema constraints + tenant-aware persistence enforce this.
- **Rate-limit awareness for the third-party API.** Calling Jira too fast gets you 429-throttled and possibly banned. The client must respect rate limits — backoff, queue, batch, or all three.
- **Connection health is operator-visible.** "Is this integration working?" must be answerable without log-grep. Status field + error count + last error give operators (and customers) the answer.
- **Auth-token rotation is a workflow, not a recompile.** Customers will rotate their Jira API tokens; the platform must support credential update without redeploy or full reconnect.
- **OAuth refresh-token rotation must be transparent.** OAuth tokens expire; refresh tokens swap to new tokens. Mid-flight refresh-token rotation must not break in-flight operations.
- **Webhook delivery dedup is connection-scoped, not global.** The same payload from two different customer connections is two different events. Connection-ID is part of the idempotency key.
- **Sync failures must auto-recover or escalate visibly.** Transient failure → retry; persistent failure → status flip to `error` and operator alert. Silent persistent failure produces "the integration broke three weeks ago" surprises.
- **Webhook payload sanitization on logging.** Customer webhook payloads can contain PII or sensitive customer-tenant data. Logging the payload requires sanitization parity with audit-payload sanitization (F-A SANITIZE_KEYS).

What discipline explicitly forbids:

- Plaintext credentials in database columns.
- Webhook endpoints without signature verification.
- String-equality signature comparison (timing-attack vulnerable).
- Auto-enabled integrations on connection creation.
- Cross-tenant credential lookups (constraint or scope-predicate enforcement).
- Sync that retries indefinitely without dead-letter or status escalation.
- Silent webhook payload logging including sensitive fields.

### F-C.5.2 — What Existing Platforms Do (and Don't Do)

#### Zapier

Zapier is the canonical no-code integration platform. Customer wires events from one service ("when a Jira issue is created") to actions in another ("create a Slack message"). Zapier hosts the execution; users configure rules.

[Source: zapier.com/help — accessed 2026-05-07]

- **Strength.** Massive integration breadth (thousands of services); zero-code customer experience; pre-built recipes.
- **Miss for governed-PM context.** Customer data flows through Zapier's infrastructure — data residency and audit-trail integration are Zapier's choices, not the customer's. The platform integrating *into* Zephix via Zapier means events leave Zephix's tenant boundary before reaching Zephix.
- **Where Zephix differs.** F-C is in-platform — webhook ingestion + sync run in Zephix's tenant boundary, not via a third-party orchestrator. For customers with data-residency requirements, this matters.

#### Make.com (formerly Integromat)

Make.com is similar to Zapier with deeper visual-flow capabilities and lower price-per-operation.

[Source: make.com/en/integrations — accessed 2026-05-07]

- **Strength.** More sophisticated than Zapier for multi-step flows; cheaper at scale.
- **Miss.** Same as Zapier for governed-PM context — data flows through Make's infrastructure.
- **Where Zephix differs.** Same as Zapier comparison.

#### Stripe Webhook Design

Stripe's webhook design is the reference for compliance-grade webhook ingestion: signed payloads with `Stripe-Signature` header, support for multiple secrets during rotation, idempotency keys on event delivery, replay-prevention via timestamp tolerance.

[Source: stripe.com/docs/webhooks/signatures — accessed 2026-05-07]

- **Strength.** Cryptographic integrity; rotation-friendly multi-secret model; replay protection.
- **Miss.** Stripe-specific — this is webhooks Stripe sends to its customers, not a generic webhook ingestion library.
- **Where Zephix differs (partially aligned).** F-C's webhook signature verification (ADR-F-C-002) follows the same shape — HMAC SHA-256 over raw body, timing-safe comparison. Multi-secret rotation support is `FW-F-C-007`. Replay-prevention via timestamp tolerance is `FW-F-C-008`.

#### Atlassian Connect Framework

Atlassian Connect is Atlassian's app development framework — apps installed into a customer's Atlassian Cloud site receive lifecycle webhooks (installed, uninstalled, enabled), can call Atlassian APIs scoped to the installation, and authenticate using shared-secret JWT.

[Source: developer.atlassian.com/cloud/jira/platform/about-connect — accessed 2026-05-07]

- **Strength.** Native to Atlassian; deep Jira integration; OAuth-equivalent authentication via JWT shared secret; lifecycle webhooks for install/uninstall.
- **Miss.** Atlassian-specific — useful for building Jira apps, not generic for cross-platform integration.
- **Where Zephix differs.** F-C is an integration *into* Jira (and others) from the Zephix side, not an app *running inside* Jira. The customer installs Zephix as their PM platform; Zephix connects out to Jira. Different direction of integration.

#### GitHub Webhooks

GitHub webhooks are a long-standing reference design: signed payloads via `X-Hub-Signature-256` header, push event types, organization-level + repository-level webhooks, replay via re-deliver from UI.

[Source: docs.github.com/en/webhooks-and-events/webhooks/about-webhooks — accessed 2026-05-07]

- **Strength.** Mature design; consistent across GitHub's API; strong developer documentation; UI replay.
- **Miss.** GitHub-specific.
- **Where Zephix differs (aligned).** F-C's HMAC SHA-256 + timing-safe comparison shape matches GitHub's pattern.

### F-C.5.3 — Zephix's Differentiation

F-C's architectural decisions enable concrete differentiation. Differentiations 1-5 are shipped; Differentiations 6-7 are honestly labeled as architectural enablers with FW surface.

#### Differentiation 1 — In-platform integration substrate (not third-party orchestrator)

F-C is built into Zephix, not delegated to Zapier or Make. Customer data flowing through integration paths stays within Zephix's tenant boundary; data residency and audit-trail discipline are Zephix's properties.

This contrasts directly with platforms whose integration story is "use Zapier" — fine for casual integration, inadequate for governed-PM customers who need their integrations under their data-handling regime.

**Shipped.** Anchored in: [integrations module](zephix-backend/src/modules/integrations/) being a first-party Zephix module, not a third-party SDK.

#### Differentiation 2 — AES-256-GCM encrypted secrets at rest with startup-time key validation

Per ADR-F-C-001: authenticated encryption with auth-tag verification; startup validation rejects keys shorter than 32 chars. Configuration errors surface at deploy time, not at first decryption attempt.

Most platforms ship "we encrypt your tokens" without specifying the algorithm or validation; F-C is explicit (AES-256-GCM) and structurally validated (startup throws on misconfiguration).

**Shipped.** Anchored in: [integration-encryption.service.ts](zephix-backend/src/modules/integrations/services/integration-encryption.service.ts) constructor validation + algorithm choice.

#### Differentiation 3 — HMAC SHA-256 webhook signature verification with timing-safe comparison

Per ADR-F-C-002: signature-verified webhooks; timing-attack-resistant comparison. Disabled-by-default ingestion (`webhookEnabled` defaults `false`).

Aligned with Stripe + GitHub reference designs. This is industry-standard for compliance-grade webhook ingestion.

**Shipped.** Anchored in: [integrations-webhook.controller.ts verifyWebhookSignature](zephix-backend/src/modules/integrations/integrations-webhook.controller.ts) + crypto.timingSafeEqual.

#### Differentiation 4 — Deterministic idempotency via canonical JSON serialization

Per ADR-F-C-003: canonical JSON (recursive sorted keys) before key generation. Same payload regardless of object-key-ordering produces same idempotency key.

Most platforms hand-roll idempotency from "stringify and hash" which fails when JSON producers serialize keys in different orders. F-C's canonical-JSON approach is correctness-by-design.

**Shipped.** Anchored in: [idempotency.util.ts canonicalJsonStringify](zephix-backend/src/modules/integrations/utils/idempotency.util.ts).

#### Differentiation 5 — Disabled-by-default integration posture

Per ADR-F-C-004: both `pollingEnabled` and `webhookEnabled` default `false`. Integration features are off until explicitly enabled. No silent activation.

This is security-posture discipline — an integration enabled-by-default is an attack surface customers didn't ask for.

**Shipped.** Anchored in: [integration-connection.entity.ts default values](zephix-backend/src/modules/integrations/entities/integration-connection.entity.ts).

#### Differentiation 6 — Architectural enabler for multi-vendor integration (FW-F-C-003 + FW-F-C-004)

The discipline (Section F-C.5.1) is provider-agnostic. The shipped behavior is Jira-only (full client + sync + webhook). Linear and GitHub are declared in `IntegrationConnection.type` enum but have no client implementation — sync rejects with explicit "Sync not supported for integration type" error.

The architectural enabler is real: the connection entity is type-agnostic; encryption + signature verification + idempotency are vendor-agnostic; the dispatch pattern (`syncNow` consults `connection.type` to choose client) is the right shape.

Differentiation positioning: *the architectural foundation for multi-vendor integration is shipped; Jira is the first vendor; Linear and GitHub clients are forward roadmap. The connection schema is type-agnostic — adding a vendor is additive, not architectural.* **No fictional shipped vendor claimed.**

**Substrate enabler shipped; surface FW.** FW: `FW-F-C-003` (Linear) + `FW-F-C-004` (GitHub).

#### Differentiation 7 — Architectural enabler for KMS-backed envelope encryption (FW-F-C-001)

The discipline (Section F-C.5.1) calls compliance-grade posture per-tenant data-key rotation via KMS. The shipped behavior is single-tier AES-256-GCM with a process-wide key from `INTEGRATION_ENCRYPTION_KEY`.

The architectural enabler exists: `IntegrationEncryptionService` is the encapsulation point; replacing single-tier encryption with envelope encryption (DEK encrypted by KMS-backed KEK) is service-internal change, not schema change.

Differentiation positioning: *the architectural encapsulation is shipped; KMS-backed envelope encryption is forward roadmap for compliance-grade key management.*

**Substrate enabler shipped; surface FW.** FW: `FW-F-C-001`.

### Section F-C.5 summary

Differentiations 1-5 are shipped: in-platform integration substrate, AES-256-GCM with startup validation, HMAC SHA-256 + timing-safe webhook verification, canonical-JSON idempotency, disabled-by-default posture. Differentiations 6-7 are honestly labeled with FW surfaces (multi-vendor expansion + KMS envelope encryption). Linear + GitHub vendor support is declared-but-unimplemented; this is HALT-DOC-BE-3 territory — the doc honors shipped reality, not the type enum's aspirational coverage.

---

## F-C.6 Technical Debt + Future Work

### Debt-F-C-001 — Business-event audit emission on integration mutations (gap-candidate)

**State.** Decision C DENY events emit via guard-audit filter (PR #264 closure). Business-event audit emission for integration mutations (connect, sync, disconnect, webhook-event-processed) is uncertain pending dedicated probe.

**Risk.** Medium. Consistency with F-A discipline calls for business-event emission on destructive integration operations.

**Resolution path.** Probe `auditService.record` invocations in integrations module; for any destructive op without forensic emission, apply F-A pattern. Coordinated with F-A FW-F-A-002 (compile-time emission-required policy).

### FW-F-C-001 — KMS-backed envelope encryption for credentials

**State.** Per Differentiation 7. Single-tier `INTEGRATION_ENCRYPTION_KEY` is process-wide; envelope encryption with per-tenant DEKs encrypted by KMS-backed KEK is the compliance-grade upgrade.

**Resolution path.** Introduce KMS client (AWS KMS, GCP KMS, or HashiCorp Vault); per-org DEK generated at connection creation; DEK encrypted at rest by KMS KEK; in-memory decryption uses DEK. Service-internal change, no schema change.

### FW-F-C-002 — Auto-pause on persistent failure threshold

**State.** Per ADR-F-C-006: `errorCount` increments on sync failure but does not auto-flip `status` to `'paused'`. A connection failing for weeks remains `'active'` with high errorCount.

**Resolution path.** Threshold-based auto-pause (e.g., 10 consecutive failures → `status = 'paused'` + operator notification via F-B URGENT priority).

### FW-F-C-003 — Linear client + sync + webhook implementation

**State.** Per Differentiation 6. `'linear'` declared in `IntegrationConnection.type` enum; no client.

**Resolution path.** Implement `LinearClientService`, extend `IntegrationSyncService.syncNow` to dispatch on `connection.type === 'linear'`, add Linear-specific webhook controller path with Linear's signature scheme. Estimate: similar surface area to Jira implementation.

### FW-F-C-004 — GitHub client + sync + webhook implementation

**State.** Per Differentiation 6. `'github'` declared in enum; no client.

**Resolution path.** Implement `GitHubClientService`, extend sync dispatch, add GitHub webhook controller path (GitHub's `X-Hub-Signature-256` header).

### FW-F-C-005 — Slack integration (for F-B FW-F-B-003 dependency)

**State.** F-B's Slack notification channel depends on F-C Slack integration substrate (workspace-level Slack connection, OAuth flow, webhook delivery).

**Resolution path.** Add `'slack'` to `IntegrationConnection.type` enum + Slack OAuth flow + Slack webhook delivery service. Coordinate with F-B FW-F-B-003.

### FW-F-C-006 — Microsoft Teams integration (for F-B FW-F-B-004 dependency)

**State.** F-B's Teams notification channel depends on F-C Teams integration substrate.

**Resolution path.** Add `'teams'` to `IntegrationConnection.type` enum + Teams webhook delivery service. Coordinate with F-B FW-F-B-004.

### FW-F-C-007 — Multi-secret rotation for webhook signature

**State.** Current behavior: single `webhookSecret` per connection. Stripe-style rotation (multiple active secrets) is more rotation-friendly.

**Resolution path.** Schema change: `webhookSecret` becomes JSONB array of `{ secret, createdAt, expiresAt? }`; verification accepts any active secret.

### FW-F-C-008 — Webhook timestamp tolerance (replay prevention)

**State.** Current behavior: HMAC verifies payload integrity but does not enforce a freshness window. A captured webhook payload could be replayed indefinitely.

**Resolution path.** Verify `Date` header (or webhook-event timestamp) against a tolerance window (e.g., ±5 minutes from server time); reject stale events.

### FW-F-C-009 — OAuth flow controller surface

**State.** `IntegrationConnection.authType` enum reserves `'oauth'`; encryptedSecrets schema reserves `clientId`, `clientSecret`, `refreshToken`. No OAuth flow controller surfaced (no callback endpoint, no token-exchange logic).

**Resolution path.** Per-vendor OAuth callback endpoint; token-exchange + refresh-token rotation logic; integrate with vendor-specific OAuth scopes.

### FW-F-C-010 — Rate-limit-aware client behavior

**State.** Jira REST has rate limits; current client does not implement explicit backoff, queueing, or batching.

**Resolution path.** Honor `Retry-After` header on 429 responses; exponential backoff with jitter; per-connection rate-limit tracking.

### Architectural debt + future-work summary

| ID | Type | Severity | Resolution |
|---|---|---|---|
| Debt-F-C-001 | Debt (gap-candidate) | Medium | Audit-trace probe for business-event emission |
| FW-F-C-001 | Future Work | — | KMS envelope encryption |
| FW-F-C-002 | Future Work | — | Auto-pause on failure threshold |
| FW-F-C-003 | Future Work | — | Linear client + sync + webhook |
| FW-F-C-004 | Future Work | — | GitHub client + sync + webhook |
| FW-F-C-005 | Future Work | — | Slack integration (F-B dep) |
| FW-F-C-006 | Future Work | — | Teams integration (F-B dep) |
| FW-F-C-007 | Future Work | — | Multi-secret rotation |
| FW-F-C-008 | Future Work | — | Webhook timestamp tolerance |
| FW-F-C-009 | Future Work | — | OAuth flow controller |
| FW-F-C-010 | Future Work | — | Rate-limit-aware client |

---

## F-C.7 Architecture Decision Record History

### ADRs originating in this document

| ADR | Title | Status |
|---|---|---|
| ADR-F-C-001 | AES-256-GCM Encrypted Secrets at Rest | Accepted |
| ADR-F-C-002 | HMAC SHA-256 Webhook Signature Verification + Timing-Safe Comparison | Accepted |
| ADR-F-C-003 | Idempotency via Canonical JSON + Deterministic Key Generation | Accepted |
| ADR-F-C-004 | Polling and Webhook as Independent Toggles | Accepted |
| ADR-F-C-005 | Decision C Contract Closure (PR #264) | Accepted |
| ADR-F-C-006 | Connection-Level Sync State + Error Resilience Tracking | Accepted |

### Cross-references to existing architectural artifacts

| Document | Relationship to F-C |
|---|---|
| [Engine 2 doc Section 2.3](../engines/engine-2-tenancy.md#decision-c-contract-enforcement-matrix-post-pr-269) | Decision C contract enforcement matrix; integration sites in row 5 |
| [F-A doc](f-a-audit-trail.md) | Audit emission patterns; Decision C DENY emission via guard-audit filter |
| [F-B doc](f-b-notifications.md) | Slack + Teams channel implementations depend on F-C integration substrate (FW-F-C-005 + FW-F-C-006) |
| [AD-027_LOCKED.md](../AD-027_LOCKED.md) | AD-027 critical-path enumeration; integration controllers in scope |

### What this document is *not*

- **Not** a Jira API client reference — see `JiraClientService` source for the methods + types.
- **Not** a vendor-by-vendor integration capability matrix — see Section F-C.3 connection-type matrix for shipped vs. FW.
- **Not** a key-rotation operational runbook — that's deployment / SRE territory.

### Cross-document navigation

- Foundation siblings: [F-A (Audit)](f-a-audit-trail.md), [F-B (Notifications)](f-b-notifications.md), [F-D (Capability Registry)](f-d-capability-registry.md)
- Engine docs: [Engine 2 (Tenancy)](../engines/engine-2-tenancy.md)
- Security: [STRIDE Threat Model](../security/threat-model-stride.md)
- Architect state: [Architect-side Carries Inventory](../architect-state/architect-side-carries.md)

---

**End of F-C — Integrations architectural document.**
