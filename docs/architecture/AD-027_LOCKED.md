# AD-027: Permission Matrix Framework

**Status:** LOCKED — architect approved 2026-05-01, Product Owner ratified 2026-05-01

**Q1-Q5 closed:**
- Q1 (Stakeholder): workspace_viewer at guard layer + service-layer project assignment check
- Q2 (Org sub-matrix): Read/Write at Member, Config/Destructive at Admin sufficient for MVP
- Q3 (Disjunctions): Custom guards as documented exceptions; default is single-role-family per endpoint
- Q4 (SmokeKeyGuard): Platform scope; production disables
- Q5 (Legacy @Roles): Migrate to @PlatformRoles style as touched per implementation batch

**Date:** 2026-05-01

**Supersedes:** None (extends AD-011)

**Affects:** All controllers in `zephix-backend/src/`, AD-011 implementation, Engine 1 gap item 8, Production Readiness Gate 1.

**Author:** Senior Solution Architect (Claude)

**Reviewed by:** Product Owner (Adi) — pending

---

## Context

AD-011 locked the role model (Platform / Workspace / Project layers, role enums per layer). It did NOT specify which roles are required to access which endpoints. That mapping is needed for:

- Engine 1 gap item 8 (permission matrix enforcement)
- Production Readiness Gate 1 (RBAC flag flip with full enforcement)
- Trust audit ("can a workspace_member access endpoint X?") — currently unanswerable consistently

Discovery (PR #221 cleanup work) found:
- 130 controllers, 731 endpoints
- Three competing enforcement patterns: declarative `@UseGuards`, imperative `WorkspaceRoleGuardService`, `@RequireEntitlement`
- No consistent guard policy across modules
- Roughly 69 controllers use only JWT-class guards (no workspace role check at controller layer)

A per-endpoint matrix of 731 rows would be unmaintainable. AD-027 instead specifies **decision rules** that determine the correct guard for any endpoint based on its scope and action.

---

## Decision

AD-027 establishes:

1. **Endpoint scope classification** — every endpoint has exactly one scope
2. **Endpoint action classification** — every endpoint has exactly one action verb category
3. **Required guard determination** — derived from (scope, action) pair
4. **Canonical enforcement pattern** — declarative `@UseGuards` with role decorators
5. **Public endpoint allowlist** — explicit list, audit verifies others have guards
6. **Out-of-scope concerns** — what AD-027 does NOT cover

---

## Section 1: Scope classification

Every endpoint has exactly one **scope**, determined by the resource the endpoint operates on.

### 1.1 Public scope

**Definition:** No authentication required. Endpoint is intentionally accessible without credentials.

**Allowlist (only these path patterns are public):**
- `/health/*` — health and readiness probes
- `/observability/metrics` — Prometheus metrics scraping
- `/auth/login`, `/auth/register`, `/auth/forgot-password`, `/auth/reset-password` — authentication entry points
- `/auth/refresh-token` — token refresh
- `/auth/verify-email/:token` — email verification callback
- `/integrations/webhook/*` — third-party webhook receivers (signature-validated, not auth-validated)
- `/organization-signup` — org creation entry point
- `/demo-request` — marketing lead capture
- `/waitlist/*` — waitlist signup
- Root `/` and ping endpoints

**Rule:** Endpoints not on this list must be guarded. Adding to allowlist requires architect approval (AD update).

### 1.2 Platform scope

**Definition:** Endpoint operates on platform-wide resources affecting all organizations. Examples: platform admin operations, platform-wide settings, observability tooling for ops staff.

**Required role:** Platform Admin only.

**Examples:**
- Admin trash management
- Platform-wide audit log access
- Platform-wide feature flag administration
- Platform health beyond `/health/*` (deeper diagnostics)

### 1.3 Org scope

**Definition:** Endpoint operates on a specific organization's data, where the user must belong to that organization.

**Resolution:** Endpoint URL contains `:orgId` or `:organizationId`, OR the endpoint operates on the user's current org via session context.

**Required role determination:** Per action (Section 2 + Section 3 matrix).

**Examples:**
- `/organizations/:orgId/users` — list org members
- `/organizations/:orgId/users/:userId/role` — change member's org role
- `/organizations/:orgId/invitations` — invite new member

### 1.4 Workspace scope

**Definition:** Endpoint operates on a specific workspace's data within an organization.

**Resolution:** Endpoint URL contains `:workspaceId`, OR the endpoint accesses workspace-scoped resources (projects, work items, etc.) where the workspace is resolvable from the resource ID via path.

**Required role determination:** Per action (Section 2 + Section 3 matrix). Roles drawn from workspace_member.role enum: `workspace_owner`, `delivery_owner`, `workspace_member`, `workspace_viewer`.

**Examples:**
- `/workspaces/:workspaceId/settings` — workspace configuration
- `/workspaces/:workspaceId/members` — workspace membership
- `/projects/:projectId` — project resource (workspace resolved from project)
- `/work-tasks/:taskId` — work task resource (workspace resolved from task → project)

### 1.5 Project scope

**Definition:** Endpoint operates on resources within a specific project where the authorization decision depends on the user's relationship to that specific project (PM, Delivery Owner, team member, stakeholder).

**Resolution:** Endpoint operates on a single project's data AND the action requires project-specific role enforcement.

**AD-011 specifies:** Project-layer authorization is per-row (does THIS user have an assignment to THIS project), not per-route.

**AD-027 explicit scope-out:** Project-layer authorization is NOT covered by guard-decorator enforcement at the controller layer. It is enforced at the service/data-access layer via assignment checks.

**Implication for AD-027:** Endpoints that AD-011 would consider project-scoped are still classified as workspace-scoped for guard purposes. Workspace role guard ensures user has workspace access; service layer ensures user has project-specific assignment. Two-layer authorization.

This means AD-027's matrix has FOUR scopes for guard purposes (public, platform, org, workspace). Project-layer is not a guard scope.

### 1.6 Scope resolution rules

When an endpoint has multiple potential scopes, the most specific applies:

- Workspace > Org (a workspace endpoint also implies org membership; workspace check is stricter)
- Org > Public (an org endpoint requires authentication; not public)
- Platform is parallel, not nested (platform admin is a separate role from org membership)

If an endpoint genuinely needs to span scopes (e.g., a single endpoint that switches behavior based on whether `:workspaceId` is provided), it should be split into two endpoints with single scopes each.

### 1.7 BFF / aggregation scope

**Definition:** Backend-for-Frontend endpoints that aggregate data across multiple scopes in a single response. Examples: dashboard endpoints returning workspace KPIs + org-level alerts + user's own tasks; "home" endpoints returning a multi-scope summary.

**Resolution rule:** Identify the WEAKEST role required across all underlying data items. The controller-layer guard checks at this weakest level. The service layer is responsible for filtering each underlying item by that user's actual access.

**Example:** A home endpoint returning workspace project count + user's pending notifications + org news.
- Workspace project count: requires workspace_viewer in workspace
- User's notifications: implicit (always own)
- Org news: requires org membership (Platform Member)
- Controller guard: weakest = workspace_viewer (when in workspace context); workspace context resolved from user's default workspace
- Service: returns null/empty for items user can't access, doesn't 403 entire request

**Forbidden pattern:** A single endpoint that 403s the WHOLE response if user lacks access to ANY item. Aggregate endpoints must gracefully degrade per-item.

**Restriction:** Aggregate endpoints are READ-ONLY. Aggregating writes across scopes is forbidden — split into separate endpoints, each with single scope.

### 1.8 Versioned endpoints

**Definition:** Endpoints with explicit version paths like `/v1/...`, `/v2/...`, OR endpoints with version metadata indicating multiple versions coexist.

**Rule:** Each version classified independently per AD-027. v1 and v2 of the same logical endpoint may have different (scope, action) classifications if they split, merge, or restructure functionality.

**Sunset path:** Deprecated versions retain their original guards until removed. Adding/removing versions does not change the live version's classification.

**Cross-version consistency:** When v2 supersedes v1, both classifications must be documented in the AD-027 endpoint mapping artifact (the per-endpoint mapping work happening between AD-027 lock and implementation batches).

### 1.9 Service-to-service / internal scope

**Definition:** Endpoints called by Zephix internal workers, schedulers, or service-to-service integration — NOT by user-facing flows. Examples: KPI worker dispatching to compute endpoints, audit aggregation workers, cross-service event handlers.

**Authentication mechanism:** Service tokens (signed JWTs with `service` claim, not user JWTs). Separate from user authentication.

**AD-027 coverage:** Service-to-service authentication is OUT OF SCOPE for AD-027 user-role matrix. These endpoints use a separate `@ServiceTokenGuard` (or equivalent) that validates the service identity, not user role.

**Detection rule for implementation:** During endpoint mapping, if an endpoint:
- Cannot be reached via authenticated user flow (no UI calls it)
- Is called by Zephix's own background workers or schedulers
- Has no user-context in its request handling

Then classify as service-to-service scope. Tag with `@ServiceOnly` decorator (to be defined) and exclude from user-role matrix.

**Required separate work:** Service authentication mechanism (token issuance, validation, revocation) is a separate architectural concern. May warrant a future AD-028 if not already specified. Flagged for follow-up.

---

## Section 2: Action classification

Every endpoint has exactly one **action verb category** based on what it does, not the HTTP verb used.

### 2.1 Read

**Definition:** Endpoint returns data without modifying state. Idempotent. Safe to call multiple times.

**HTTP verb:** Usually GET. Sometimes POST for queries with complex bodies (POST /search).

**Examples:**
- `GET /workspaces/:id/projects` — list projects
- `GET /work-tasks/:id` — get task detail
- `POST /projects/search` — search with body parameters

### 2.2 Write

**Definition:** Endpoint creates or modifies user-facing data within the user's normal operational scope. Day-to-day operations.

**HTTP verb:** Usually POST, PATCH, PUT.

**Examples:**
- `POST /work-tasks` — create task
- `PATCH /work-tasks/:id` — update task
- `POST /projects/:id/comments` — add comment

### 2.3 Config

**Definition:** Endpoint modifies workspace or org configuration that affects all members of that scope. Settings that persist beyond a single user's operations.

**HTTP verb:** Usually PATCH, PUT, sometimes POST.

**Examples:**
- `PATCH /workspaces/:id/settings` — workspace settings
- `POST /workspaces/:id/methodology-template` — apply template
- `PATCH /workspaces/:id/governance-policy` — policy configuration
- `POST /workspaces/:id/members` — invite member to workspace

### 2.4 Destructive

**Definition:** Endpoint deletes or archives resources, OR transfers ownership/control, OR performs operations that are irreversible or expensive to reverse.

**HTTP verb:** Usually DELETE, sometimes POST (transfer ownership), sometimes PATCH (archive flag).

**Examples:**
- `DELETE /workspaces/:id` — delete workspace
- `DELETE /projects/:id` — delete project
- `POST /workspaces/:id/transfer-ownership` — change owner
- `PATCH /work-tasks/:id { archived: true }` — archive (depending on intent)

### 2.5 Action classification rules

**The action is determined by INTENT, not HTTP verb.**

- Sometimes PATCH is destructive (archive flag).
- Sometimes POST is read (search query).
- Sometimes DELETE is config (turning off a feature flag — destructive to data, not destructive to scope).

**When ambiguous between Write and Config:** Ask "does this affect only the user's data, or all users' data in this scope?" If all users → Config.

**When ambiguous between Write and Destructive:** Ask "if this happens accidentally, can it be undone in <5 minutes by anyone with appropriate role?" If no → Destructive.

### 2.6 Bulk operations and mode-transition actions

**Bulk operation rule:** A bulk endpoint takes the action category of its individual underlying operation, with one elevation:

| Underlying operation | Single endpoint action | Bulk endpoint action |
|---|---|---|
| Read 1 task | Read | Read |
| Update 1 task | Write | Write |
| Delete 1 task | Destructive | Destructive |
| Mark notification as read | Write | Write (no elevation — trivial state) |
| Archive 1 project | Destructive | Destructive |
| Apply governance policy to N projects | Config | Config (governance is per-scope, not per-resource) |

**Elevation rule:** Bulk Write operations elevate to Config when N > a threshold AND the operation affects scope state (e.g., bulk-reassigning 50 tasks between PMs is workspace-scoped Config because it restructures workspace work distribution). Single bulk delete is still Destructive.

**Mode transitions:** Endpoints that transition a resource between major modes (active → archived, draft → submitted → approved) are classified by the FORWARD action's reversibility:

- Submit (draft → submitted): Write (reversible: rollback to draft)
- Approve (submitted → approved): Config (state change requires authority)
- Archive (active → archived): Destructive (slow to reverse, semantically destructive)
- Cancel/withdraw (any → cancelled): Destructive (terminal state)

**Implementation rule for endpoint mapping:** When uncertain, default to the STRICTER action category. Easier to relax post-launch than to tighten without user disruption.

---

## Section 3: Required guard matrix

Combining Section 1 scope × Section 2 action gives the required minimum role.

### 3.1 Public scope

| Action | Required role |
|---|---|
| Read | None — public |
| Write | N/A — public endpoints are read-only by definition |
| Config | N/A |
| Destructive | N/A |

If a public endpoint needs to write (e.g., signup creates a user), it's still public-read-conceptually but the act of "calling it" is the write. Authorization comes from rate limiting and signup flow validation, not role guards.

### 3.2 Platform scope

| Action | Required role |
|---|---|
| Read | Platform Admin |
| Write | Platform Admin |
| Config | Platform Admin |
| Destructive | Platform Admin |

Platform scope has only one role.

### 3.3 Org scope

| Action | Required role (minimum) |
|---|---|
| Read | Platform Member (i.e., any authenticated user with org membership) |
| Write | Platform Member |
| Config | Platform Admin |
| Destructive | Platform Admin |

**Note:** Some org-scoped writes have business-logic restrictions beyond role (e.g., a Member can update their own profile but not another member's). That's enforced in the service layer, not the guard. AD-027 specifies the **floor** — the minimum role to even reach the controller method.

### 3.4 Workspace scope

| Action | Required role (minimum, in workspace_member.role enum) |
|---|---|
| Read | workspace_viewer |
| Write | workspace_member |
| Config | workspace_owner OR delivery_owner |
| Destructive | workspace_owner |

**Reasoning:**
- workspace_viewer: read-only access by definition
- workspace_member: day-to-day operations
- delivery_owner: configuration-class authority for delivery decisions (gates, schedules, governance) — may need to apply phase gates, configure templates within workspace
- workspace_owner: only role allowed to perform irreversible actions

**Note on delivery_owner for Config:** Some Config endpoints are exclusively workspace_owner (billing, member management). The matrix says "minimum" — endpoints can require stricter roles if their nature demands. AD-027 specifies the floor.

### 3.5 Workspace scope — explicit refinements

Some workspace-scoped Config endpoints are owner-only because they affect things outside delivery_owner's authority:

| Sub-category | Required role |
|---|---|
| Billing/plan changes | workspace_owner only |
| Member invitation / role changes | workspace_owner only |
| Workspace deletion / archive | workspace_owner only |
| Workspace transfer of ownership | workspace_owner only |
| Methodology template application | workspace_owner OR delivery_owner |
| Governance policy enable/disable | workspace_owner OR delivery_owner |
| Custom field schema | workspace_owner OR delivery_owner |
| Phase gate definition | workspace_owner OR delivery_owner |

This is the workspace scope sub-matrix. Endpoints fall into the broad Config category but get stricter role requirements based on what they configure.

### 3.6 Self vs. other resource access

**Critical rule that overrides Sections 3.1-3.5 when applicable.**

When an endpoint operates on user-specific data, classify by whether the user is operating on their OWN resource or ANOTHER user's resource.

**Pattern recognition:**
- Path contains `/me/` OR no `:userId` parameter (resource resolved from `req.user.id`): SELF endpoint
- Path contains `/:userId` parameter: OTHER-USER endpoint (potentially)

**Rules:**

| Pattern | Required role |
|---|---|
| User reads/writes OWN profile, preferences, sessions | Authenticated user (no role check beyond JWT) |
| User reads OTHER user's profile (within same workspace) | workspace_viewer minimum |
| User writes/modifies OTHER user's profile | workspace_owner only (member management) |
| User reads/writes OWN notifications, OWN tasks (assigned to them), OWN draft drafts | Authenticated user |
| User reads OTHER user's tasks (within same workspace) | workspace_viewer minimum (work visibility) |
| User modifies OTHER user's tasks | Workspace Write matrix applies (Section 3.4) |

**Implementation guidance:**
- SELF endpoints: `@UseGuards(JwtAuthGuard)` only; service uses `req.user.id` and never accepts `:userId` in path
- OTHER-USER endpoints: full scope guard + role check + service-layer assertion that target user is in the actor's workspace

**Forbidden pattern:** An endpoint that takes `:userId` in path, accepts both "self" and "other" semantics in the same handler, with conditional logic. **Split into two endpoints** — `/me/...` for self, `/:userId/...` for other. Each gets its own classification.

**Why this matters:** Most security holes in role-based systems come from "user can do X to OWN data" being conflated with "user can do X to ANYONE's data." Section 3.6 forces explicit separation.

---

## Section 4: Canonical enforcement pattern

### 4.1 Declarative `@UseGuards` with role decorators

All endpoints requiring authorization use this pattern:

```typescript
@Controller('workspaces/:workspaceId/projects')
@UseGuards(JwtAuthGuard, WorkspaceRoleGuard)
export class ProjectsController {

  @Get()
  @WorkspaceRoles('workspace_viewer')  // Section 3.4 Read row
  list() { ... }

  @Post()
  @WorkspaceRoles('workspace_member')  // Section 3.4 Write row
  create() { ... }

  @Patch(':id/settings')
  @WorkspaceRoles('workspace_owner', 'delivery_owner')  // Section 3.4 Config row
  updateSettings() { ... }

  @Delete(':id')
  @WorkspaceRoles('workspace_owner')  // Section 3.4 Destructive row
  delete() { ... }
}
```

**Required decorators on controllers (or per-method):**
- `@UseGuards(JwtAuthGuard, ...)` — JWT verification always present (except Public scope)
- `@UseGuards(..., WorkspaceRoleGuard)` for workspace-scoped endpoints
- `@UseGuards(..., RequireOrgRoleGuard)` for org-scoped endpoints
- `@UseGuards(..., PlatformAdminGuard)` for platform-scoped endpoints
- Action-determining decorator: `@WorkspaceRoles(...)`, `@OrgRoles(...)`, `@PlatformRoles(...)` indicating minimum role

**Why declarative is canonical:**
- Authorization visible at endpoint definition (audit-friendly)
- Single place to read what a controller protects
- Standard NestJS pattern, well-supported by tooling
- Testable independently from business logic

### 4.1.1 Permission-decorator pattern (canonical alternative — locked 2026-05-01 per batch 1 enumeration)

Discovery during AD-027 batch 1 enumeration revealed the codebase has invested in **fine-grained permission decorators** (`@RequireWorkspacePermission`, `@RequireWorkspaceAccess`) that map to role tiers. This pattern is MORE expressive than pure role decorators and is **canonical alongside `@WorkspaceRoles`**.

**Both patterns are acceptable:**
- `@WorkspaceRoles('workspace_owner')` — role-based, simpler, matches Section 3.4 matrix directly
- `@RequireWorkspacePermission('edit_workspace_settings')` — permission-based, more granular, requires permission-to-role mapping

**Permission-to-role mapping table (locked 2026-05-01):**

| Permission string | Required minimum role | AD-027 action category |
|---|---|---|
| `view_workspace` | workspace_viewer | read |
| `view_dashboard` | workspace_viewer | read |
| `view_workspace_members` | workspace_viewer | read |
| `view_workspace_modules` | workspace_viewer | read |
| `edit_workspace_settings` | workspace_owner OR delivery_owner | config |
| `manage_workspace_members` | workspace_owner | config |
| `manage_workspace_modules` | workspace_owner | config |
| `archive_workspace` | workspace_owner | destructive |
| `delete_workspace` | workspace_owner | destructive |
| `transfer_workspace_ownership` | workspace_owner | destructive |

**Migration policy:** Existing endpoints using `@RequireWorkspacePermission` are CORRECT and need no migration. Endpoints using imperative patterns (`WorkspaceAccessService.canAccessWorkspace`, `WorkspacePolicy.enforceUpdate`) ARE migrated to declarative permission decorators per Section 4.3.

**Adding new permissions:** When a new permission is needed, it MUST be added to this mapping table as part of the AD-027 amendment. Permissions added without table entry are AD violations.

**RequireWorkspaceAccess vs RequireWorkspacePermission:**
- `@RequireWorkspaceAccess('viewer' | 'member' | 'owner')` is the **role-tier shorthand** — equivalent to permission with implicit "view-tier permissions" mapping
- `@RequireWorkspacePermission('specific_permission')` is **explicit permission** — used for fine-grained control
- For Read endpoints, `@RequireWorkspaceAccess('viewer')` is sufficient (clearer than listing every read permission)
- For Config/Destructive endpoints, `@RequireWorkspacePermission('specific_permission')` preferred (clearer audit trail of what specifically is being authorized)

### 4.2 Entitlement layered ON TOP of role guards

`@RequireEntitlement` is for AD-014 capability gating (does this workspace have access to this capability?). It is NOT a role check.

**Correct pattern:**

```typescript
@Patch(':id/governance-policy')
@WorkspaceRoles('workspace_owner', 'delivery_owner')  // Role check
@RequireEntitlement('governance.policy_engine')         // Capability check
applyPolicy() { ... }
```

Both decorators run. Role guard checks role; entitlement guard checks capability availability (per AD-014, AD-026 complexity_mode). Endpoint must pass both.

**Forbidden:** Using `@RequireEntitlement` as a substitute for role check. Capability gating is orthogonal to authorization.

### 4.3 Imperative pattern is deprecated

Pattern found in discovery in attachments, scenarios, capacity-* controllers and confirmed in batch 1 enumeration:

**Imperative patterns DEPRECATED by AD-027 (expanded list per 2026-05-01 enumeration):**

```typescript
// Pattern 1: WorkspaceRoleGuardService (in attachments, scenarios, capacity-* modules)
async someEndpoint() {
  await this.workspaceRoleGuardService.ensureMinimumRole(user, workspaceId, 'workspace_member');
  // ... business logic
}

// Pattern 2: WorkspaceAccessService.canAccessWorkspace (in workspaces.controller.ts — 5 endpoints)
async someEndpoint() {
  const canAccess = await this.workspaceAccessService.canAccessWorkspace(user, workspaceId);
  if (!canAccess) throw new ForbiddenException();
  // ... business logic
}

// Pattern 3: WorkspacePolicy.enforceUpdate (in workspaces.controller.ts — restore endpoint)
async restore() {
  this.policy.enforceUpdate(u.role);  // imperative
  // ... business logic
}

// Pattern 4: Manual role checks in handlers (4+ endpoints in workspaces.controller.ts)
async someEndpoint() {
  if (normalizePlatformRole(user.platformRole) !== PlatformRole.ADMIN) {
    throw new ForbiddenException();
  }
  // ... business logic
}
```

**All four patterns are deprecated by AD-027.**

**Reasoning:**
- Authorization hidden in business logic, not visible at endpoint definition
- Easy to forget, hard to audit
- No standard testing pattern
- Mixes concerns (controller method does both auth check and business logic)

**Migration policy:** When a controller using imperative pattern is touched for any reason, it MUST be migrated to declarative pattern (using `@RequireWorkspacePermission`, `@RequireWorkspaceAccess`, `@RequireOrgRole`, or `@WorkspaceRoles`) as part of that change. No new imperative usage is permitted.

**Existing imperative usage:** Inventoried during AD-027 implementation sub-prompts. Does NOT need to be migrated all at once. Migrated as touched. Goal: zero imperative usage by Engine 1 validation gate.

**Batch 1 imperative migration scope (per enumeration):** ~10 endpoints in workspaces.controller.ts migrate from imperative to declarative as part of batch 1 implementation.

---

## Section 5: Test coverage requirement

For every endpoint affected by AD-027, integration tests must cover:

### 5.1 Permission matrix tests (per endpoint)

For each endpoint:
- Test 1: Required role can access — returns success
- Test 2: One role below required cannot access — returns 403
- Test 3: User with no membership cannot access — returns 403 or 404 (per existing pattern)
- Test 4: Unauthenticated request — returns 401

### 5.2 Test harness implementation

A reusable test harness will be built (test infrastructure sub-prompt) that:
- Generates fixture users at every role level
- Has factory methods to create test workspaces with users at each role
- Provides assertion helpers (`expectAccessible`, `expectForbidden`, `expectUnauthenticated`)

**Mandatory tenancy requirements:**

The harness MUST support cross-tenant test patterns. Specifically:

1. **Multi-workspace fixtures:** Standard setup creates AT LEAST two workspaces (Workspace_A and Workspace_B) with distinct member rosters per workspace.

2. **Cross-workspace user fixtures:** At least one user is workspace_owner of A AND nothing in B. At least one user is workspace_owner of B AND nothing in A.

3. **Cross-tenant test assertion (mandatory per workspace-scoped endpoint):**
   - Test 5: User with valid role in Workspace_B attempts to access Workspace_A endpoint → must return 403 or 404

This is in addition to the standard 4-test matrix from Section 5.1, making the per-endpoint test count 5 (or more) for workspace-scoped endpoints.

**Why Test 5 is mandatory:** Most authorization bugs in multi-tenant SaaS are cross-tenant leaks where role check passes but tenancy isolation fails. A user with `workspace_member` role in some workspace can sometimes access OTHER workspaces' data due to missing scope check. Test 5 catches this. Without it, AD-027 implementation could pass tests and still ship cross-tenant violations.

**Org scope cross-tenancy:** Same principle. User who is member of Org_A must 403 on Org_B endpoints.

**Platform scope:** No tenancy concept; Test 5 not applicable.

### 5.3 Coverage threshold

By Engine 1 validation gate:
- 100% of endpoints have at least Tests 1 and 2 (positive + negative)
- 90%+ of endpoints have full 4-test matrix
- Any endpoint without coverage is flagged in audit report; architect approves exceptions

---

## Section 6: Out-of-scope explicit list

AD-027 does NOT cover:

1. **Project-layer per-row authorization.** Service-layer concern. Possible separate AD if needed.

2. **Resource ownership rules.** Section 3.6 specifies path-based pattern recognition (self vs. other). Beyond that, "user can edit their own comment but not another user's" specifics are business logic in the service.

3. **Rate limiting.** Per-endpoint rate limits are operational concerns, not authorization. Use `@RateLimiterGuard` separately. **Admin override of rate limits requires Platform Admin role applied via separate decorator.** AD-027 does not govern rate limiting itself; it governs who can configure rate limits (which is a workspace_owner Config action, in the standard matrix).

4. **Anti-tampering / signature validation.** Webhook signature checks, CSRF tokens, etc. are integrity concerns, not authorization. Section 1.1's `/integrations/webhook/*` allowlist refers to INBOUND webhook endpoints (signature-validated, not auth-validated). **Outbound webhook configuration** (managing where Zephix sends webhooks externally) follows standard workspace-scope rules: workspace_owner or delivery_owner Config action.

5. **Audit logging of authorization decisions.** Foundation F-A handles audit. AD-027 declares audit dependency in Section 12.

6. **Multi-tenant data isolation.** That's enforced at the data access layer (every query filters by workspace_id). Guards check role; data access enforces tenancy. Section 5.2 Test 5 verifies this layer.

7. **Cross-org sharing scenarios.** Not currently supported. If future product requires it, separate AD.

8. **Frontend route guards.** Separate concern; addressed in Section 11.

9. **Service-to-service authentication.** Section 1.9 scopes this out and flags potential AD-028 follow-up.

---

## Section 7: Migration approach

### 7.1 Sub-prompt sequence

After AD-027 locks:

1. **Test harness sub-prompt** — build reusable matrix test infrastructure. Code-only, bounded.

2. **Implementation batch 1: workspace settings module** — apply guards to most-sensitive workspace endpoints first (settings, member management, billing). High value, bounded scope (~20 endpoints).

3. **Implementation batch 2: project + work-management modules** — largest set of workspace-scoped endpoints (~80-120 endpoints across multiple controllers). May be split into batches 2a, 2b, 2c.

4. **Implementation batch 3: dashboards + KPIs + analytics** — mostly read-only, simpler matrix.

5. **Implementation batch 4: org-scoped endpoints** — organizations, admin, team management.

6. **Implementation batch 5: cleanup** — remaining controllers, imperative-pattern migrations triggered as side effects.

7. **Final batch: Public endpoint allowlist audit** — verify nothing public was missed, every non-public endpoint has guards.

8. **Validation: integration test pass** — full matrix tests pass before flag flip.

9. **Production Readiness Gate 1: flag flip** — `ZEPHIX_WS_MEMBERSHIP_V1` ON in production.

### 7.2 Effort revised

Original blueprint estimate: 2-3 weeks
Post-discovery revised: 4-6 weeks

Driven by 731 endpoints (vs estimated 100-200) and need for declarative migration on top of role-rule application.

### 7.3 Each implementation sub-prompt structure

Each batch sub-prompt:
1. Lists endpoints in batch (architect provides via AD-027 mapping)
2. Architect specifies (scope, action) for each endpoint based on AD-027 rules
3. Cursor applies decorators per matrix
4. Cursor adds tests per Section 5
5. Four-gate review per established pattern

This means architect work is substantial: applying AD-027 rules to 731 endpoints means ~731 (scope, action) decisions. Architect does this work between sub-prompts, not all at once. Each batch defines its mappings before Cursor executes.

---

## Section 8: Decision rules — quick reference

For any endpoint, ask in order:

1. **Is this in the public allowlist (Section 1.1)?** → No guard. Done.
2. **Is this platform-admin scope?** → `@UseGuards(JwtAuthGuard, PlatformAdminGuard)`. Done.
3. **What's the scope?** Org or workspace.
4. **What's the action?** Read / Write / Config / Destructive.
5. **Apply scope × action matrix (Section 3)** for required role.
6. **Add appropriate guard + role decorator** (Section 4).
7. **Add `@RequireEntitlement` if capability-gated** (Section 4.2).
8. **Add tests** (Section 5).

---

## Section 9: Acceptance criteria for AD-027 to lock

This AD is locked when:

- [ ] Architect (Claude) approves draft as-is or with revisions
- [ ] Product Owner (Adi) ratifies (technical decision per AD-007 but PO informed)
- [ ] Section 9 acceptance criteria itself explicit
- [ ] AD-027 added to blueprint Section 2
- [ ] Blueprint version bumped (3,218 lines + AD-027 section)
- [ ] `.cursor/rules/architecture-principles.mdc` updated to reference AD-027 as canonical permission framework

---

## Section 10: Open questions for architect resolution before lock

These items need decisions before AD-027 is final:

### Q1: Stakeholder role placement

AD-011 includes "stakeholder" as a project-scoped role. AD-027 scopes-out project-layer authorization. **Where does stakeholder enforcement happen?**

Proposal: Stakeholder is enforced at the workspace_viewer level (read-only workspace access), narrowed to specific projects at the service layer. So a stakeholder gets `workspace_viewer` for guard purposes but service-layer assignment check ensures they only see their project.

### Q2: Org scope sub-matrix needed?

Section 3.3 has only Read/Write/Config/Destructive at platform-member or platform-admin level. Is that sufficient, or does org scope need finer distinctions like workspace does?

Proposal: Sufficient as-is. Org-scoped endpoints are simpler than workspace-scoped (less product complexity). Can refine if specific endpoints need it.

### Q3: How do we handle endpoints that are "platform admin OR org owner" or similar disjunctions?

Some endpoints might allow platform admin to do things on behalf of org owners. Section 4 doesn't explicitly cover OR-of-scopes.

Proposal: These are rare. Handle as "platform admin OR explicit role" via custom guard. Document in AD-027 implementation as exceptions, not the norm.

### Q4: Smoke endpoints (`SmokeKeyGuard`)

Discovery found `SmokeKeyGuard` on `/auth/smoke-*` endpoints. These are dev/test surfaces guarded by a smoke key.

Proposal: Treated as Platform scope (admin-only) for AD-027, since SmokeKeyGuard is dev-tooling-only. Production deploys disable these endpoints.

### Q5: `@Roles('admin', 'owner')` legacy decorators

Discovery found 3 controllers using `@Roles('admin', 'owner')` — these are legacy strings not aligned with AD-011's enum names.

Proposal: Migrate to `@PlatformRoles(PlatformRole.ADMIN)` style during implementation batches. Not a separate cleanup sub-prompt; included in each batch where these appear.

---

## Section 11: Frontend authorization alignment

**Scoped out of AD-027 with explicit reasoning.**

Frontend has its own route guards (`ProtectedRoute`, `RequireWorkspace`, `PaidRoute`, `RequireAdminInline`, `RequirePaidInline`, `FeaturesRoute` per V5 audit). These provide UX (redirect to login, hide menu items, show upsell prompts) but are NOT authoritative for security.

**Architectural principle:** Backend AD-027 is the SOLE source of truth for authorization decisions. Frontend guards are advisory.

**Implication:** Frontend guards may be inconsistent with backend rules without creating security holes. Worst case: user sees a UI element they can click that returns 403 from the backend — annoying UX, not a security failure.

**Best case:** Frontend guards align with backend AD-027 scope categories so users don't see actions they cannot perform.

**Future work:** Frontend authorization alignment may warrant a separate AD (AD-XXX) when frontend RBAC becomes a UX priority. Not blocking AD-027 implementation.

**Implementation note:** Engine 1 implementation batches MAY include incidental frontend updates when controllers being modified have obvious frontend pairings. NOT required to complete frontend alignment as part of AD-027.

---

## Section 12: Audit emission dependency

**Critical sequencing dependency.**

AD-027 declares: every guard that DENIES access emits an audit event. Every guard that ALLOWS access for Config or Destructive actions emits an audit event. Read and Write actions do NOT emit audit events at the guard layer (volume too high; service-layer audit handles state changes).

**Audit event content:**
- Actor user ID
- Endpoint accessed (method + path)
- Decision: ALLOW / DENY
- Reason for DENY (e.g., "missing workspace_owner role")
- Required role per AD-027 matrix
- Actor's actual role
- Timestamp
- Correlation ID

### 12.1 Canonical audit store (locked 2026-05-01)

The `audit_events` table (Phase 3B) is the AUTHORITATIVE store for guard-layer audit emission and all AD-027 audit operations. Discovery (F-A audit utility prompt, 2026-05-01) found three parallel audit stores in the platform:

- `audit_events` (canonical, in `modules/audit/entities/audit-event.entity.ts`)
- `audit_logs` (legacy, in `modules/resources/services/audit.service.ts`)
- Logger-only "AuditService" in `shared/services/audit.service.ts` — not persisted

**AD-027 binding decision:** Guard-layer audit writes go to `audit_events` exclusively. The other two stores are not used for AD-027 purposes. Deprecation/reconciliation of the other stores is deferred — possibly addressed in future AD-028 (Audit Store Reconciliation).

### 12.2 Failure semantics — guard audit must succeed (locked 2026-05-01)

When a guard's audit emission fails (DB unavailable, write rejection, etc.), the guard MUST fail the request with HTTP 500.

**Rationale:**
- Authorization decisions are security events. If they cannot be recorded, they cannot be authorized.
- Aligns with Engineering Quality Standard #4 (every state-changing operation emits audit event).
- Better failure mode than silently-lost audit: user sees 500, retries, escalates if persistent.

**Implementation requirement:**
- `AuditService.record` currently swallows DB failures (returns event without rethrow). This MUST be changed for guard-emission paths.
- Two possible paths:
  - (a) Modify `AuditService.record` globally to rethrow on failure — affects all 19 existing call sites (auth, governance, resources, etc.)
  - (b) Add new method `AuditService.recordGuardEvent` that rethrows; existing `record` retains current behavior for backward compatibility

**Architect decision:** Option (b) — preserve existing behavior, add new method. Service-layer audit (resource lifecycle, governance, etc.) keeps tolerant failure mode for now; guard-layer audit gets strict failure mode. Future AD-028 may unify behavior.

### 12.3 Guard-audit infrastructure (NEW BUILD requirement)

Discovery found ZERO guard-emission audit infrastructure in the codebase. AD-027 implementation includes building this infrastructure.

**Pattern: NestJS Interceptor with metadata reflection.**

```typescript
@Injectable()
export class GuardAuditInterceptor implements NestInterceptor {
  // Reads metadata about expected role from @WorkspaceRoles, @OrgRoles, etc.
  // Emits ALLOW audit event for Config/Destructive actions on success
  // Emits DENY audit event for any guard rejection
  // Calls AuditService.recordGuardEvent() — strict failure mode
}
```

**Out of scope for this AD:** Specific implementation details. This belongs in implementation batch 1 deliverables. AD-027 specifies REQUIREMENT (guard audit infrastructure), not implementation.

### 12.4 Hard dependency on Foundation F-A (Audit Trail)

AD-027 implementation cannot complete validation without F-A audit functional. Specifically, the audit emission infrastructure must exist before AD-027 implementation batches finalize. If F-A is not ready, AD-027 work continues but audit emission is stubbed (logged to console only) until F-A is wired.

**Sequencing implication:**

| Order | Work item | Dependency |
|---|---|---|
| 1 | AD-027 patched and locked (this document) | — |
| 2 | F-A failure semantics + canonical store decisions | Item 1 |
| 3 | Guard-audit interceptor pattern built | Items 2 + AuditService.recordGuardEvent |
| 4 | AD-027 endpoint mapping (architect work) | Item 1 |
| 5 | Test harness sub-prompt | Item 1 |
| 6 | Implementation batches 1-N | Items 3, 4, 5 |
| 7 | Production Readiness Gate 1 (flag flip) | Item 6 + audit verified |

**If guard-audit interceptor is not built by implementation batch 1 dispatch:** Batch 1 proceeds with audit-stubbed guards (console.log placeholder). Stubs are upgraded to real audit emission via interceptor when interceptor lands. **Do NOT skip audit dependency declaration; tracking explicitly is what prevents post-implementation retrofit pain.**

**Why this matters in retrospect:** The original AD-027 draft punted "audit logging of authorization decisions" to Foundation F-A without declaring the dependency explicitly. That created risk: implementation batches could merge in 4-6 weeks without audit on authorization, and retrofitting audit across 731 endpoints post-fact would cost 2-3 weeks of additional work. Declaring the dependency now turns a future retrofit into a parallel-track build.

### 12.5 Append-only enforcement is a separate concern

Discovery noted `audit_events` table has documentation-level append-only intent but no DB-level enforcement (no triggers preventing UPDATE/DELETE).

**AD-027 position:** Append-only enforcement at DB level is desirable but NOT a hard prerequisite for AD-027. Application-level discipline (no UPDATE/DELETE APIs in AuditService) is sufficient for MVP. DB-level enforcement is a Foundation F-A hardening item.

**Recommended:** Add DB-level enforcement (REVOKE UPDATE, DELETE permissions on `audit_events`) before MVP launch as part of Production Readiness gate work. Not in AD-027 scope.

---

## Document end

**Status:** PATCHED 2026-05-01 (third patch — permission-decorator pattern formalized + imperative pattern list expanded per batch 1 enumeration findings)

**Original status:** LOCKED 2026-05-01 (Q1-Q5 closed)

**Audit history:**
- 2026-05-01 morning: Initial draft, Q1-Q5 closed at lock time
- 2026-05-01 afternoon: 10 gap audit performed; sections 1.7-1.9, 2.6, 3.6, 5.2, 6, 11, 12 added/expanded
- 2026-05-01 evening: F-A audit utility discovery completed; Section 12 expanded to 12.1-12.5 covering canonical store decision, failure semantics (option a — strict failure), guard-audit infrastructure as build deliverable, append-only deferred to Production Readiness
- 2026-05-01 night: Batch 1 enumeration revealed permission-decorator pattern as canonical; Section 4.1.1 added with permission-to-role mapping table; Section 4.3 expanded with 4 imperative patterns (was 1)

**Decisions added in third patch:**
- Permission-decorator pattern is canonical alongside role-decorator pattern (Section 4.1.1)
- Permission-to-role mapping table locked (10 permission strings mapped to role tiers and action categories)
- @RequireWorkspaceAccess vs @RequireWorkspacePermission usage guidance (Read endpoints use Access shorthand; Config/Destructive use explicit Permission)
- Imperative pattern list expanded from 1 (WorkspaceRoleGuardService) to 4 (added WorkspaceAccessService.canAccessWorkspace, WorkspacePolicy.enforceUpdate, manual normalizePlatformRole checks)
- Batch 1 imperative migration scope: ~10 endpoints

**Next action:** F-A audit utility build (Cursor in flight); architect awaits Gate 2 review for that prompt. After F-A utility merges + this patch is in repo, batch 1 implementation prompt can be drafted.

