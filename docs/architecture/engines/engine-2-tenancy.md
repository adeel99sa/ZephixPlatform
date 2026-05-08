# Engine 2 — Tenancy & Workspaces

**Status**: Hardened (post-PR #260, #261, #264, #269 — 2026-05-07)
**Owner Engine**: Engine 2 (per Blueprint v2 §4)
**Engine Boundary**: Tenant context resolution, workspace identity, workspace ownership, workspace membership, cross-tenant isolation guardrails
**HEAD at authoring**: `2bda0868` (staging tip; BE branch root)

---

## 2.1 Purpose & Scope

Engine 2 is the substrate that answers two questions for every authenticated request that reaches the Zephix backend:

1. **Which organization is this request scoped to?** (`organizationId` derivation)
2. **Which workspace, if any, is this request scoped to?** (`workspaceId` derivation, optional)

Engine 2 then enforces that derived context propagates through every persistence path so that no query, write, or relationship can cross the tenant boundary without an explicit, audited code path.

### What Engine 2 IS responsible for

- **Tenant context resolution** — extracting `organizationId` from the JWT and `workspaceId` from request headers/route params/query, with strict UUID validation
- **Tenant context propagation** — making derived context available to services via [`TenantContextService`](zephix-backend/src/modules/tenancy/tenant-context.service.ts) (AsyncLocalStorage)
- **Tenant-aware persistence** — [`TenantAwareRepository`](zephix-backend/src/modules/tenancy/tenant-aware.repository.ts) auto-scopes queries by `organizationId`
- **Persistence guardrails** — [`TenantPersistenceGuardrailSubscriber`](zephix-backend/src/modules/tenancy/tenant-persistence-guardrail.subscriber.ts) intercepts writes that would cross tenant lines
- **Query guardrails** — [`TenantRepositoryQueryGuardrail`](zephix-backend/src/modules/tenancy/tenant-repository-query-guardrail.ts) intercepts raw queries that would cross tenant lines
- **Workspace identity & ownership** — workspace entity, owner field, canonical `change-owner` mutation
- **Workspace membership** — `WorkspaceMember` entity, role assignment, canonical role helper
- **HTTP contract for missing tenant context** — Decision C (see ADR-Engine-2-001)

### What Engine 2 is NOT responsible for

- **RBAC primitives and permission semantics** — owned by Engine 1 (RBAC). Engine 2 *consumes* role primitives but does not define them.
- **Project, work-item, document, dashboard, template scoping** — owned by their respective engines (3, 4, 6). Each engine *uses* tenant context via Engine 2 but defines its own scope predicate.
- **Authentication itself** — JWT issuance, refresh, MFA. Owned by the auth module. Engine 2 *consumes* the authenticated principal.
- **Audit emission** — owned by F-A. Engine 2 *triggers* audit events on destructive mutations (or fails to — see [F-A doc](../foundations/f-a-audit-trail.md) Section F-A.3 for the live gap).
- **Capability/feature gating** — owned by F-D. The tenant-scoped `complexity_mode` enum lives on the workspace entity (Engine 2 surface) but the gating semantics belong to F-D.

### Engine boundary tests

| Question | Answer is Engine 2 if… | Answer is *not* Engine 2 if… |
|---|---|---|
| "Does this code derive `organizationId` from the JWT?" | yes — interceptor or guardrail | it consumes a pre-derived `organizationId` |
| "Does this code enforce that a query stays within an org?" | yes — guardrail or `TenantAwareRepository` | it adds a *project-scope* or *workspace-scope* predicate on top |
| "Does this code map a workspace member to a role?" | yes — `getEffectiveWorkspaceRole` | it interprets the role as a permission set (Engine 1) |

---

## 2.2 Architectural Decisions (Retrospective ADRs)

Four decisions shape the Engine 2 surface as it stands at HEAD. Each is a retrospective ADR — the decisions were made through the regular dispatch/architect cycle; this section documents them as durable records.

### ADR-Engine-2-001 — Decision C HTTP Contract for Missing Tenant Context

**Context.** Prior to PR #260, an authenticated request that reached a tenant-scoped service path with no resolvable `organizationId` produced a 500 Internal Server Error (the service tried to scope a repository query against `undefined` and TypeORM rejected the parameter). This violated the HTTP contract: the request *was* malformed from the server's perspective (missing tenant context), but a 500 told the client that the server itself was at fault and emitted nothing useful to the audit trail.

**Decision.** Adopt **Decision C**: a structured authorization-style response contract for missing tenant context.

- **401 Unauthorized** — request had no authenticated principal (no JWT or invalid JWT)
- **403 Forbidden** — request had an authenticated principal but no resolvable tenant context (no `organizationId` on the JWT claim, or the principal is not a member of the resolved tenant)
- Both responses go through the global authorization audit filter ([`guard-audit-authz-exception.filter.ts`](zephix-backend/src/common/audit/guard-audit-authz-exception.filter.ts)) so DENY events emit on registered routes.

**Defense-in-depth layering.** Decision C is enforced at four layers, in order:

1. **Frontend transport (PR #261)** — [`zephix-frontend/src/lib/api/authContextBridge.ts`](zephix-frontend/src/lib/api/authContextBridge.ts) carries `x-organization-id` from the canonical AuthContext source.
2. **Backend interceptor (PR #260 R3b)** — [`tenant-context.interceptor.ts`](zephix-backend/src/modules/tenancy/tenant-context.interceptor.ts) populates AsyncLocalStorage; rules at lines 22–36 fix the priority (header → param → query) and validate UUIDs.
3. **Backend service (PR #260 R5-B)** — services call `tenantContextService.assertOrganizationId()` (e.g., [`workspace-access.service.ts:48`](zephix-backend/src/modules/workspace-access/workspace-access.service.ts#L48)) so that a missing org throws 403 *before* a query is attempted.
4. **Backend persistence (cross-cutting)** — `TenantAwareRepository` and the guardrail subscriber ensure that even an explicit raw query against the tenant-bearing tables fails closed.

**Consequences.**

- **Uniform error shape across 5 backend domains.** The contract is now enforced uniformly across: AI vector storage (PR #256, #258), Integrations (6 sites, PR #264), KPIs (4 sites, PR #264), Workspaces (PR #260 R5-B), Workspace ownership transfer (PR #269).
- **Audit emission gets DENY events on registered routes** instead of 500s that emit nothing. (Forensic improvement.)
- **Cost.** Every new service that touches a tenant-scoped repository must invoke `assertOrganizationId()` — easily missed. Mitigated partially by the guardrail subscriber (which fails closed) but not zero-cost. See Section 2.6.

---

### ADR-Engine-2-002 — Canonical Workspace Role Helper (`getEffectiveWorkspaceRole`)

**Context.** Three competing rules existed for "what role does this user have in this workspace?":

1. The original architect call: "ADMIN may act as `workspace_owner`; everyone else falls back to `WorkspaceMember.role`."
2. The `WorkspacePermissionService` registry at [`workspace-permission.service.ts:179`](zephix-backend/src/modules/workspaces/services/workspace-permission.service.ts#L179): `change_workspace_owner: ['workspace_owner']` only — Platform ADMIN absent.
3. Ad-hoc helpers in service files that re-implemented the lookup and sometimes forgot the ADMIN bypass.

This invited drift: a controller calling its own ad-hoc lookup might forbid an action that the original spec allowed for ADMINs.

**Decision.** Single canonical helper [`WorkspaceAccessService.getEffectiveWorkspaceRole`](zephix-backend/src/modules/workspace-access/workspace-access.service.ts#L213) with **built-in Platform ADMIN bypass**.

```ts
// Conceptual contract (sanitized; see file for full impl)
async getEffectiveWorkspaceRole(params: {
  userId: string;
  orgId: string;
  platformRole: PlatformRole | string;
  workspaceId: string;
}): Promise<WorkspaceRole | null> {
  // Platform ADMIN → workspace_owner for every workspace in the org
  // MEMBER/VIEWER → WorkspaceMember lookup, defense-in-depth org check
  // Returns null if no membership and not ADMIN
}
```

**Consequences.**

- **No callsite duplicates the ADMIN bypass.** All callers — six call sites in [`workspace-members.service.ts`](zephix-backend/src/modules/workspaces/services/workspace-members.service.ts) (lines 99, 221, 309, 544, 614, plus internal use at 189) — receive the bypass for free.
- **One file to change** if the bypass rule changes.
- **Identity vs. permission separation.** The helper answers an identity question ("what role does this user have here?"), not a permission question ("can this user do X?"). The latter is Engine 1's responsibility.
- **Registry vs. helper divergence is now the explicit debt.** The `WorkspacePermissionService` registry encodes a simpler view that omits the ADMIN bypass — this is reconciled in Section 2.6 (Debt-Engine-2-001).

---

### ADR-Engine-2-003 — Canonical Workspace Ownership Transfer Endpoint (Path B)

**Context.** Two paths existed to change the owner of a workspace:

1. **Backdoor**: `PATCH /workspaces/:id/settings` accepted an `ownerId` field and silently mutated `workspace.ownerId`. No RBAC, no audit, no member-record sync.
2. **Canonical**: `POST /workspaces/:id/change-owner` ([`workspaces.controller.ts:832`](zephix-backend/src/modules/workspaces/workspaces.controller.ts#L832)) with `RequireOrgRole(PlatformRole.ADMIN)` and proper member-record demotion/promotion.

**Decision.** **Path B** — close the backdoor; force traffic through the canonical endpoint. Landed PR #269.

- The `update-settings` DTO no longer accepts `ownerId`.
- A regression test ([`workspaces.controller.update-settings-ownership-backdoor.spec.ts`](zephix-backend/src/modules/workspaces/workspaces.controller.update-settings-ownership-backdoor.spec.ts)) asserts the field is rejected.
- The canonical service path [`changeOwner`](zephix-backend/src/modules/workspaces/services/workspace-members.service.ts#L452) handles owner record promotion *and* old-owner demotion in a single transaction.

**Consequences.**

- **Single source of truth for a destructive operation.** No silent ownership transfer.
- **Audit-trail compliance is now possible** — but not yet realized. The canonical endpoint emits `events.track('workspace.owner.changed', …)` (analytics stream) but **does not** call `auditService.record()`. There is no `WORKSPACE_OWNER_CHANGED` constant in [`audit.constants.ts`](zephix-backend/src/modules/audit/audit.constants.ts). This gap is documented as F-A.3 in [the audit-trail foundation doc](../foundations/f-a-audit-trail.md) and listed in Section 2.6 below as Debt-Engine-2-002.
- **Forensic posture is the bar.** Closing this gap is what moves Engine 2 from "destructive ops have a canonical path" to "destructive ops have a forensic-quality canonical path."

---

### ADR-Engine-2-004 — Frontend Transport Tenant Context Propagation

**Context.** Stack 1 hardening (PR #261) revealed that `x-organization-id` was being attached inconsistently — some HTTP clients attached it from a stale local-storage value, others omitted it entirely. The backend interceptor was correctly enforcing Decision C, but the frontend was producing the symptoms (401/403) for the wrong reason: not "no membership" but "client sent the wrong context."

**Decision.** All HTTP transport carries tenant context from a canonical source: the `AuthContext` React provider, surfaced via [`authContextBridge`](zephix-frontend/src/lib/api/authContextBridge.ts) into the Axios client. Local-storage tenant headers are no longer trusted as primary.

**Consequences.**

- **Tenant context cannot leak across user sessions** the way local-storage state could.
- **Backend interceptor + frontend transport coordinate.** Defense-in-depth: a malformed frontend cannot bypass the backend, and a missing backend check would still be caught by the frontend's canonical source.
- **Cost.** Every new HTTP client (e.g., a new feature module's TanStack Query factory) must use the bridged Axios instance, not a fresh `axios.create()`. This is enforced by lint rule (Rule A) but not statically guaranteed.

---

## 2.3 Current Implementation State

### Decision C contract enforcement matrix (post-PR #269)

| Layer | File | Site | PR |
|---|---|---|---|
| Frontend transport | [authContextBridge.ts](zephix-frontend/src/lib/api/authContextBridge.ts) | Axios request interceptor attaches `x-organization-id` from AuthContext | #261 |
| Backend interceptor | [tenant-context.interceptor.ts](zephix-backend/src/modules/tenancy/tenant-context.interceptor.ts) | Lines 104–end: rules 1–5 documented in file header | #260 R3b |
| Backend service | [workspaces.service.ts](zephix-backend/src/modules/workspaces/workspaces.service.ts) | `assertOrganizationId()` calls | #260 R5-B |
| AI vector storage | `src/ai/**` | Vector store scopes by tenant | #256, #258 |
| Integrations | [integrations module](zephix-backend/src/modules/integrations/) | 6 sites converted to Decision C | #264 |
| KPI module | [kpis controllers](zephix-backend/src/modules/kpis/) | 4 sites converted to Decision C | #264 |
| Workspace ownership transfer | [workspaces.controller.ts:832](zephix-backend/src/modules/workspaces/workspaces.controller.ts#L832) | `change-owner` requires Platform ADMIN; helper enforces effective role | #269 |

### Canonical helper consumers (post-PR #265, #267, #268)

[`getEffectiveWorkspaceRole`](zephix-backend/src/modules/workspace-access/workspace-access.service.ts#L213) is invoked by:

- [`workspace-members.service.ts`](zephix-backend/src/modules/workspaces/services/workspace-members.service.ts) — 6 sites (lines 99, 221, 309, 544, 614, plus internal at 189)
- [`workspace-access.service.ts:189`](zephix-backend/src/modules/workspace-access/workspace-access.service.ts#L189) — internal call from `getUserWorkspaceRole`

Lint Rule A (extended in PR #268 to `features/administration/**`) forbids ad-hoc role lookups in covered directories. Theme C Phase 1 (PR #265) and Theme C Phase 2 (PR #267) consolidated remaining ad-hoc callers onto the canonical helper. Theme C Phase 3 (consumer migration in feature modules) is deferred — see Section 2.6.

### Tenant-aware persistence

| Component | File | Role |
|---|---|---|
| Repository wrapper | [tenant-aware.repository.ts](zephix-backend/src/modules/tenancy/tenant-aware.repository.ts) | Auto-scopes `find`, `findOne`, `qb()` by `organizationId` from context |
| Provider factory | [tenant-aware-repository.provider.ts](zephix-backend/src/modules/tenancy/tenant-aware-repository.provider.ts) | DI token factory; `getTenantAwareRepositoryToken(Entity)` |
| Persistence guardrail | [tenant-persistence-guardrail.subscriber.ts](zephix-backend/src/modules/tenancy/tenant-persistence-guardrail.subscriber.ts) | TypeORM subscriber that intercepts writes crossing tenant lines |
| Query guardrail | [tenant-repository-query-guardrail.ts](zephix-backend/src/modules/tenancy/tenant-repository-query-guardrail.ts) | Intercepts raw QueryBuilder paths bypassing the wrapper |

### Wave9 governance smoke baseline

Post-PR #260, the Wave9 governance smoke run baseline is **10/10** (recorded in [proofs/phase5a/wave9](../proofs/phase5a/wave9/)). All 10 governance-smoke endpoints emit consistent Decision C semantics under missing-tenant conditions.

### Architect-side carries (running annex)

- **F-A audit emission gap on success-case mutations** — [`workspace-members.service.ts:452 changeOwner()`](zephix-backend/src/modules/workspaces/services/workspace-members.service.ts#L452) emits only `events.track('workspace.owner.changed', …)`. Documented in [F-A doc Section F-A.3](../foundations/f-a-audit-trail.md) (Commit 5).
- **`WorkspacePermissionService` registry vs. canonical helper divergence** — [`workspace-permission.service.ts:179`](zephix-backend/src/modules/workspaces/services/workspace-permission.service.ts#L179) lists `change_workspace_owner: ['workspace_owner']`; ADMIN bypass lives in `getEffectiveWorkspaceRole`. Reconciliation pending.
- **Two `PlatformRole` definitions** — historical drift between [`shared/enums/platform-roles.enum.ts`](zephix-backend/src/shared/enums/platform-roles.enum.ts) and a legacy alias still imported in places. Tracked.
- **`complexity_mode` substrate work** — workspace-level capability gate landed (AD-026, [migration 18000000000080](zephix-backend/src/migrations/18000000000080-AddComplexityModeToWorkspaces.ts)); positioning into F-D substrate is the recon-resume position.
- **Theme C Phase 3 (consumer migration)** — deferred until canonical helpers stabilize across all administration feature modules.

---

## 2.4 Integration Patterns

Engine 2 is consumed by every other engine. The integration pattern is uniform: **Engine 2 produces tenant context; the consuming engine produces the scope predicate.**

### Engine 2 ↔ Engine 1 (RBAC)

- Engine 2 supplies `(organizationId, userId, platformRole, workspaceId)` to Engine 1.
- Engine 1 (`WorkspacePermissionService`, `WorkspaceAccessService.hasWorkspaceRoleAtLeast`) consumes that tuple and produces a boolean permission decision.
- The canonical helper `getEffectiveWorkspaceRole` lives in Engine 2 *not* Engine 1 because it answers an identity question ("what role does this user have here?") not a permission question ("can this user do X?").
- Boundary tension: the Platform ADMIN bypass is *expressed* in Engine 2 (the helper) but is *semantically* a permission-system rule. This is the architectural debt noted in ADR-Engine-2-002 consequences.

### Engine 2 ↔ Engine 3 (Work Management)

- Work entities (projects, work items, tasks) carry `organizationId` and `workspaceId` columns.
- `TenantAwareRepository<WorkItem>` etc. are injected via the Engine 2 DI factory.
- Workspace scope predicate is added by Engine 3 services (e.g., [`work-tasks.service.ts`](zephix-backend/src/modules/work-management/services/work-tasks.service.ts)).

### Engine 2 ↔ Engine 4 (Templates)

- SYSTEM templates are global Zephix-owned platform assets — they bypass workspace scope but carry an explicit `organization_id IS NULL` predicate.
- ORG and WORKSPACE templates carry `organizationId` and (optionally) `workspaceId`. See [feedback_template_scope_architecture](../../../.claude/projects/-Users-malikadeel-Downloads-ZephixApp/memory/feedback_template_scope_architecture.md) for the three-tier rule.
- Engine 2 enforces the org/workspace scope; Engine 4 enforces the SYSTEM/ORG/WORKSPACE tier.

### Engine 2 ↔ Engine 5 (Governance)

- Governance evaluations are scoped to a workspace: `governance-rules` are resolved through `tenantContextService.assertWorkspaceId()` for workspace-scoped rules.
- Phase-gate evaluations use the workspace + project scope; Engine 2 supplies both.

### Engine 2 ↔ F-A (Audit Trail)

- Every audited destructive operation receives `(organizationId, workspaceId, userId)` from Engine 2.
- The DENY filter ([guard-audit-authz-exception.filter.ts](zephix-backend/src/common/audit/guard-audit-authz-exception.filter.ts)) extracts these from the request and calls `auditService.recordGuardEvent`.
- **Gap:** success-case business audit emission is missing on destructive ops (workspace ownership transfer, template publish). See [F-A doc Section F-A.3](../foundations/f-a-audit-trail.md).

### Engine 2 ↔ F-D (Capability Registry & Feature Flags)

- The `complexity_mode` enum on the workspace entity ([`workspace.entity.ts:150`](zephix-backend/src/modules/workspaces/entities/workspace.entity.ts#L150)) is *physically* a workspace property (Engine 2 surface) but *semantically* a capability gate (F-D surface).
- The `ZEPHIX_WS_MEMBERSHIP_V1` feature flag (`process.env`-driven, registered in [feature-flags.config.ts](zephix-backend/src/config/feature-flags.config.ts)) gates whether `getEffectiveWorkspaceRole` enforces membership lookup or treats every accessor as `workspace_member`. F-D doc Section F-D.3 elaborates.

---

## 2.5 Practitioner Discipline + Competitive Positioning

This section frames Engine 2 against three things in order: what robust tenancy discipline actually requires of a B2B governed PM platform; what existing platforms in this space do (and don't do); and how Zephix's architectural decisions produce defensible differentiation.

### 2.5.1 — What Discipline Requires

A B2B governed PM platform serves enterprises that operate under regulatory and contractual exposure: SOC 2 Type II commitments, ISO 27001 certifications, customer contractual data-handling clauses, and (for some segments) sector-specific frameworks. For these customers, tenancy is not a feature; it is a property of the architecture.

Robust tenant-isolation discipline requires the following non-negotiables:

- **Tenant isolation is an architectural property, not a configuration concern.** It cannot be a setting an administrator toggles on per workspace; it cannot be a "multi-tenant mode" flag. The very existence of an off-state is a vulnerability — administrators forget to flip it, or a default leaks into production. Tenant isolation must be the *only* mode the codebase knows how to operate in.
- **Defense-in-depth across the request path.** A single guard at any layer is not sufficient. The frontend transport, the backend interceptor, the service-tier assertion, and the persistence-tier guardrail must each fail-closed independently. Any one being bypassed in isolation must not produce a cross-tenant breach.
- **Identity-grounded tenant context, not client-supplied.** The authoritative source of `organizationId` is the authenticated principal — the JWT claim, the session record, the principal token. It is never the client's request body, query string, or local-storage state, because all of those are forgeable. Headers may *carry* tenant signals for routing convenience, but the server must verify them against the principal before trust.
- **Forensically auditable boundary.** Every cross-tenant access *attempt* — whether allowed, denied, or rejected for missing context — must produce a durable record sufficient to reconstruct who attempted what, when, against which tenant, with what outcome. This is not analytics. SOC 2 CC7.2, ISO 27001 A.12.4, and most enterprise security questionnaires require structured, immutable audit evidence; `events.track('user.did.thing', …)` to a product-analytics pipeline does not satisfy this requirement.
- **Single canonical paths for destructive operations.** Workspace ownership transfer, member suspension, organization deletion: each must have exactly one code path. Backdoor paths — even well-intentioned settings endpoints that "happen to" mutate ownership — are vulnerabilities. Closing them is not refactoring hygiene; it is a security control.
- **Ownership distinguished from membership.** A workspace owner is not "a member with extra checkboxes." Ownership is a singleton; membership is a multiset. The transfer operation is fundamentally different from a role change. Conflating them in a single endpoint is a discipline error that propagates as a security error.

What discipline explicitly forbids:

- Trust-the-client headers as the sole tenant signal (forgeable).
- Optional audit emission on tenant-boundary decisions ("we'll add it if compliance asks") — by the time compliance asks, the un-audited window is the breach.
- A "bypass" mode for development or demo that ships in production builds.
- Conflating Platform ADMIN identity with Workspace OWNER identity in the registry — the bypass exists, but it must be expressed in exactly one place, not pattern-matched into multiple registries.

### 2.5.2 — What Existing Platforms Do (and Don't Do)

#### Atlassian Jira (Cloud)

Jira's tenant model is the cloud site: each cloud customer has a distinct site URL, and projects live under it. Permission schemes are the granular control surface — administrators compose schemes from permissions, then attach them to projects.

[Source: support.atlassian.com/jira-cloud-administration/docs/manage-permissions/ — accessed 2026-05-07]

- **Strength.** Granular permission schemes; mature audit log on the Cloud Premium tier; mature SOC 2 / ISO 27001 posture at the platform level.
- **Miss.** The composition burden is on the administrator. Jira has often been described as the system "only the Jira admin understands"; the same observation applies to permission-scheme composition. The platform shifts the discipline burden to the customer rather than encoding it as architectural defaults.
- **Where Zephix differs.** Tenant isolation in Zephix is not composed by an administrator; it is the only path the request can take. There is no permission-scheme attach step that an administrator can forget.

#### Linear

Linear defines a workspace as "the container for all issues, teams and other concepts relating to an individual company. Each workspace has a unique URL and represents a distinct organizational unit where users log in."

[Source: linear.app/docs/conceptual-model — accessed 2026-05-07]

- **Strength.** Strong workspace boundary semantics; clean conceptual model; developer ergonomics.
- **Miss.** Flat workspace model — there is no organization layer above workspace. An enterprise running multiple programs as separate workspaces under one corporate identity has no first-class place to encode that relationship. Cross-workspace governance, billing, and identity propagation are administrative seams Linear leaves to the customer.
- **Where Zephix differs.** Zephix introduces an explicit organization layer above workspace, because B2B governed PM customers operate multiple workspaces under one tenant boundary. This is structural, not cosmetic — billing, governance, identity, and audit all live at the organization tier.

#### Asana

Asana's enterprise tier exposes Organization → Division → Team → Project, with admin console controls, audit log API, and SAML SSO.

[Source: asana.com/guide/help/organizations/basics — accessed 2026-05-07]

- **Strength.** Hierarchical model that fits enterprise scale; admin console with audit log API; strong identity-provider integration.
- **Miss.** Tenant-isolation primitives are abstracted from the administrator. The boundary mechanics are opaque — administrators see the controls but not the architectural enforcement. For SOC 2 audits, this works because Asana's platform attestation covers it; for customers who need to attest to their *own* customers about Asana's boundary mechanics, the abstraction is a friction.
- **Where Zephix differs.** Zephix's tenancy model is documented at the architectural level — the Decision C contract, the four-layer enforcement, the tenant-aware repository pattern. Customers running Zephix can produce architectural attestation themselves without depending on Zephix's platform attestation alone.

#### ClickUp

ClickUp positions itself as workspace-flexible: Workspace → Spaces → Folders → Lists → Tasks, with extensive customization at every level.

[Source: help.clickup.com/hc/en-us/articles/6309446654487-Hierarchy — accessed 2026-05-07]

- **Strength.** Deep nesting flexibility; strong fit for cross-functional teams that prioritize speed and customization.
- **Miss.** Industry comparisons consistently observe that "ClickUp's flexibility means development processes often feel lighter — good for shipping quickly, less ideal for deep governance." Tenant isolation primitives are positioned as user-configurable rather than architectural defaults.
- **Where Zephix differs.** Zephix is in a different market segment. The customer who has outgrown ClickUp is exactly the customer who needs Zephix's architectural-property tenancy.

#### Microsoft Project for the Web / Project Online

Microsoft's project-management tier ties tenancy to the Microsoft 365 tenant. Project-level isolation depends on project owners and on Microsoft Graph permissions.

- **Strength.** Enterprise-grade auth; mature SAML / OIDC integration; first-class identity-provider position.
- **Miss.** Project-as-tenant — the model assumes each project is the unit of administrative control. For enterprises running multiple programs under one administrative boundary (the canonical Zephix customer shape), this forces awkward project-grouping and breaks down at portfolio scale.
- **Where Zephix differs.** Zephix's organization → workspace → project hierarchy fits multi-program enterprise PM natively, where Microsoft Project's model fits single-project administrative units natively.

### 2.5.3 — Zephix's Differentiation

Engine 2's architectural decisions produce concrete, defensible differentiation against the surveyed competitive set. The differentiation is anchored in decisions already made and shipped (ADR-Engine-2-001 through ADR-Engine-2-004), not aspirational positioning.

#### Differentiation 1 — Tenant isolation as architectural property, not configuration

The Decision C contract (ADR-Engine-2-001) is enforced at four layers — frontend transport, backend interceptor, backend service, backend persistence — across five backend domains uniformly. There is no off-mode, no opt-in flag, no administrator-composable permission scheme that selects whether tenant isolation applies. This is a different posture from Atlassian Jira (where permission schemes are administrator-composed) and from ClickUp (where flexibility is the headline).

For customers who must attest to their own customers about tenancy boundary mechanics, this matters concretely. The architectural answer to "how does Zephix prevent cross-tenant access?" is a single layered contract documented in this engine doc and verified by the Wave9 governance smoke baseline (10/10 — proofs/phase5a/wave9). The answer is not "the administrator configured the right permission scheme."

#### Differentiation 2 — Identity-question separated from permission-question

The canonical role helper (ADR-Engine-2-002) answers an identity question — "what role does this user have here?" — separately from the permission question — "can this user do X?" The Platform ADMIN bypass lives in the helper, in one place. This separation is structural; it prevents the Atlassian-style burden of recomposing the bypass logic into every permission-scheme variant.

The trade-off is recognized as Debt-Engine-2-001: the `WorkspacePermissionService` registry's view diverges from the canonical helper. The architectural decision is to preserve the separation and reconcile the registry; not to merge the two surfaces.

#### Differentiation 3 — Single canonical paths for destructive operations

The closure of the workspace ownership transfer backdoor (ADR-Engine-2-003, PR #269) is a specific instance of a general discipline: every destructive operation has exactly one path. Backdoors in well-intentioned settings endpoints — the kind that accumulate in mature SaaS codebases — are systematically closed.

The remaining work on this differentiation is the audit emission gap (Debt-Engine-2-002): closing the gap between the analytics stream (`events.track`) and the forensic audit (`auditService.record`) on the canonical destructive path. Until this closes, the canonical path is single but not yet forensic-quality. The differentiation is the architectural commitment to closing it; the architectural decision (single canonical path) is shipped.

#### Differentiation 4 — Organization → Workspace hierarchy, not flat or project-as-tenant

The two-tier hierarchy (organization above workspace) is the structural fit for B2B governed PM. Linear's flat workspace model and Microsoft Project's project-as-tenant model are both legitimate for their target segments. Zephix's segment — multiple programs / divisions under one administrative boundary, with cross-workspace governance and unified billing — requires the two-tier model natively, not as a workaround.

This is not a marketing claim; it is a structural property of the data model that enables features (cross-workspace billing, organization-tier governance, unified audit) which are workarounds in flat or project-as-tenant systems.

#### Differentiation 5 — Architectural attestation for customers' own compliance posture

Zephix's tenancy mechanics are documented at the architectural level (this document, the Decision C contract enforcement matrix in Section 2.3, the file:line references throughout). Customers can produce architectural attestation about Zephix's boundary mechanics for their own SOC 2 / ISO 27001 audits without depending solely on Zephix's platform attestation.

This is a quiet differentiation that matters for the segment: B2B governed PM customers who serve regulated industries themselves need to answer their auditors about Zephix; they cannot wave through "trust Zephix's platform attestation" if their own attestation regime requires architectural review.

### Section 2.5 summary

The differentiation is structural: tenancy as architectural property (not configuration); identity separated from permission; single canonical destructive paths; two-tier hierarchy for multi-program enterprises; architectural attestation as a customer asset. None of these are marketing positions; each anchors to a shipped architectural decision (ADR-Engine-2-001 through 004) plus a tracked debt where the discipline is not yet fully realized (Debt-Engine-2-001 and Debt-Engine-2-002).

---

## 2.6 Technical Debt + Future Work

This section is the running annex for architect-side carries that intersect Engine 2. Each item names a concrete next step.

### Debt-Engine-2-001 — `WorkspacePermissionService` registry reconciliation

**State.** [`workspace-permission.service.ts:179`](zephix-backend/src/modules/workspaces/services/workspace-permission.service.ts#L179) lists `change_workspace_owner: ['workspace_owner']`. The Platform ADMIN bypass that allows ADMIN to perform owner transfers lives in `getEffectiveWorkspaceRole`, not in this registry. Two independent recons confirmed the divergence.

**Risk.** A future contributor reading the registry as the authority will believe ADMIN cannot transfer ownership. They will be wrong. Documentation drift becomes a guardrail in the wrong place.

**Resolution path.** Either:

- **(a)** Extend the registry to record Platform-role bypass rules explicitly, or
- **(b)** Remove the registry entry and let the canonical helper be the single authority. Each callsite already routes through the helper.

Option (b) is preferred: it honors the "single canonical helper" principle (ADR-Engine-2-002) and removes the registry as a competing source of truth. Tracked as architect-side carry.

### Debt-Engine-2-002 — F-A success-case audit emission on destructive Engine 2 mutations

**State.** [`workspace-members.service.ts:452 changeOwner()`](zephix-backend/src/modules/workspaces/services/workspace-members.service.ts#L452) emits `events.track('workspace.owner.changed', …)` (analytics stream) but does not call `auditService.record()`. There is no `WORKSPACE_OWNER_CHANGED` constant in [`audit.constants.ts`](zephix-backend/src/modules/audit/audit.constants.ts).

**Risk.** This is the critical debt. Section 2.5.1 named "forensically auditable boundary" as a non-negotiable; the analytics-stream-only emission on a destructive op fails that non-negotiable. ISO 27001 A.5.3's alternative-compliance route via audit trails fails for this specific destructive op. SOC 2 CC7.2 partially impaired. The Differentiation 3 positioning (single canonical paths) is single but not yet forensic-quality.

**Resolution path.** Add `WORKSPACE_OWNER_CHANGED` to `AuditAction` enum; emit `auditService.record({ action: WORKSPACE_OWNER_CHANGED, entity: workspace, … })` in the canonical service after the transaction commits; cross-check that the analytics stream and audit table agree on the same canonical timestamp.

Surface elaboration: [F-A doc Section F-A.3](../foundations/f-a-audit-trail.md) (Commit 5).

### Debt-Engine-2-003 — Two `PlatformRole` definitions

**State.** Historical drift between `shared/enums/platform-roles.enum.ts` (current canonical) and a legacy alias still imported in some files. `normalizePlatformRole` provides a runtime bridge but typing is loose (`PlatformRole | string`).

**Risk.** Low immediate risk (the normalizer handles legacy values), but tightening typing requires touching every callsite.

**Resolution path.** Migrate all callers to the canonical enum; remove the `string` fallback signature on `getEffectiveWorkspaceRole`. Bundled with Theme C Phase 3 (deferred).

### Debt-Engine-2-004 — `complexity_mode` substrate positioning

**State.** [Migration 18000000000080](zephix-backend/src/migrations/18000000000080-AddComplexityModeToWorkspaces.ts) added `complexity_mode` enum (`simple` / `standard` / `advanced`) to the workspace entity per AD-026. The column is read by [`workspaces.service.ts:900`](zephix-backend/src/modules/workspaces/workspaces.service.ts#L900) and written by `setComplexityMode` at line 916. The substrate is real but not yet wired into capability-gating call sites.

**Risk.** None present-day; column exists, value is `'simple'` by default. The risk is that future feature work assumes the gating works without a recon.

**Resolution path.** Position `complexity_mode` as F-D (capability registry) substrate. F-D doc Section F-D.3 documents the distributed substrate honestly; F-D.6 schedules consolidation.

### Debt-Engine-2-005 — Theme C Phase 3 (consumer migration)

**State.** Theme C Phases 1 (PR #265) and 2 (PR #267) consolidated controllers + lower-risk feature files onto canonical helpers. Phase 3 (consumer migration in feature modules — projects, dashboards, KPIs at the call-site level) is deferred until the helper signature stabilizes.

**Risk.** Low — Rule A lint enforcement (extended PR #268) prevents new ad-hoc lookups in covered directories.

**Resolution path.** Schedule Phase 3 dispatch when no remaining ADR-Engine-2-002 reconciliation is pending.

### Architectural debt summary

| ID | Severity | Owner stream | Surface elaborated |
|---|---|---|---|
| Debt-Engine-2-001 | Medium | Engine 2 | This doc Section 2.6 |
| Debt-Engine-2-002 | High (compliance) | Engine 2 → F-A | [F-A doc F-A.3](../foundations/f-a-audit-trail.md) |
| Debt-Engine-2-003 | Low | Engine 2 / RBAC | Theme C Phase 3 dispatch |
| Debt-Engine-2-004 | Low | Engine 2 → F-D | [F-D doc F-D.3](../foundations/f-d-capability-registry.md) |
| Debt-Engine-2-005 | Low | Engine 2 / Cross-module | Theme C Phase 3 dispatch |

---

## 2.7 Architecture Decision Record History

This section indexes Engine 2's ADRs and cross-references existing architectural documents that contextualize them. Per Gate 2.5 Refinement 3, this is a **synthesis** of existing artifacts; not a duplication.

### ADRs originating in this document

| ADR | Title | Status | Landing PR |
|---|---|---|---|
| ADR-Engine-2-001 | Decision C HTTP Contract for Missing Tenant Context | Accepted | #260 (R3b + R5-B), #256, #258, #261, #264, #269 |
| ADR-Engine-2-002 | Canonical Workspace Role Helper | Accepted | #265 (Phase 1), #267 (Phase 2) |
| ADR-Engine-2-003 | Canonical Workspace Ownership Transfer Endpoint | Accepted | #269 |
| ADR-Engine-2-004 | Frontend Transport Tenant Context Propagation | Accepted | #261 |

### Cross-references to existing architectural artifacts

| Document | Relationship to Engine 2 |
|---|---|
| [RBAC_AND_ACCESS_CONTROL_ARCHITECTURE.md](../RBAC_AND_ACCESS_CONTROL_ARCHITECTURE.md) | Engine 1 surface that consumes Engine 2's tenant context. Defines the role-set Engine 2's helper returns. |
| [PDR-2026-05-06-tenancy-assurance-and-test-reconciliation.md](../PDR-2026-05-06-tenancy-assurance-and-test-reconciliation.md) | Project Decision Record covering the tenancy assurance lane that produced PR #260 onward. Read this for the why-now sequencing. |
| [V21_RECONCILIATION_2026-05-04.md](../V21_RECONCILIATION_2026-05-04.md) | V21 architecture reconciliation that closed the AD-023 / Engine 9 boundary; constrains where Engine 2 may extend. |
| [V21_CURRENT_STATE_AUDIT.md](../V21_CURRENT_STATE_AUDIT.md) | Snapshot audit of the V21 surface; Engine 2 sections of that audit informed this doc's Section 2.3. |
| [AD-027_LOCKED.md](../AD-027_LOCKED.md), [AD-027-patch3-critical-path-rescoping.md](../AD-027-patch3-critical-path-rescoping.md) | Engine 1 / Audit / Authorization endpoint enumeration. The `change_workspace_owner` endpoint sits within the AD-027 critical-path enumeration. |
| [AD-028-frontend-work-management-unification.md](../AD-028-frontend-work-management-unification.md) | Frontend unification that underwrites ADR-Engine-2-004 (canonical AuthContext as transport source). |
| [AD-030-workspace-module-activation.md](../AD-030-workspace-module-activation.md) | Workspace module activation sequencing; predicates for `ZEPHIX_WS_MEMBERSHIP_V1` flag staging. |
| [governance-evaluations-retention.md](../governance-evaluations-retention.md) | Governance retention policy that consumes Engine 2's tenant context for evaluation scope. |
| [phase2a-authority-hardening-proof.md](../phase2a-authority-hardening-proof.md) | Phase 2A capacity governance proof; Engine 2 supplied tenant context for the governance evaluations covered. |
| [feedback_template_scope_architecture](../../../.claude/projects/-Users-malikadeel-Downloads-ZephixApp/memory/feedback_template_scope_architecture.md) | Three-tier template scope rule (SYSTEM / ORG / WORKSPACE) that constrains how Engine 2 ↔ Engine 4 integrate. |
| [CLAUDE.md](../../../CLAUDE.md) | Project Non-Negotiables: "Workspace is the container." This is the architectural axiom Engine 2 implements. |

### What this document is *not*

- **Not** a re-statement of Engine 1 (RBAC) — see `RBAC_AND_ACCESS_CONTROL_ARCHITECTURE.md` for the role/permission semantics that consume Engine 2.
- **Not** a re-statement of the audit module — see [F-A doc](../foundations/f-a-audit-trail.md) for emission patterns.
- **Not** a re-statement of feature flag mechanics — see [F-D doc](../foundations/f-d-capability-registry.md).
- **Not** the historical record of every Engine 2 PR — the PR list is in `git log`; this document records the *durable architectural decisions* those PRs realized.

### Cross-document navigation

- Sibling engine docs: [Engine 5 (Governance)](engine-5-governance.md), [Engine 7 (Capacity)](engine-7-capacity.md), [Engine 8 (Budgets/EVM)](engine-8-budgets-evm.md)
- Foundation docs: [F-A (Audit)](../foundations/f-a-audit-trail.md), [F-B (Notifications)](../foundations/f-b-notifications.md), [F-C (Integrations)](../foundations/f-c-integrations.md), [F-D (Capability Registry)](../foundations/f-d-capability-registry.md)
- Security: [STRIDE Threat Model](../security/threat-model-stride.md)
- Architect state: [Architect-side Carries Inventory](../architect-state/architect-side-carries.md)

---

**End of Engine 2 — Tenancy & Workspaces architectural document.**
