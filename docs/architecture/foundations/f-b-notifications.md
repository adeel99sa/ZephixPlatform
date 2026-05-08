# F-B — Notifications

**Status**: Substantively built — in-app + email channels shipped; Slack + Teams channels declared (enum values) but explicitly marked `// TODO` (not implemented)
**Owner Foundation**: F-B (per Blueprint v2 §4)
**Foundation Boundary**: Notification entity model, channel orchestration, per-user preferences, per-category opt-in, dispatch service, read/dismissed lifecycle, activity-event projection
**HEAD at authoring**: `8e157a8c` on `docs/engines-be-evaluation-cycle` (worktree at `../ZephixApp-be-docs`)

**Naming convention:** `Debt-F-B-XXX` for current debt; `FW-F-B-XXX` for forward-roadmap items.

---

## F-B.1 Purpose & Scope

F-B answers the question: **"how does Zephix tell the right user about the right thing through the right channel at the right time, respecting their preferences?"** F-B owns the substrate from event arrival through user-visible notification, including channel selection, preference enforcement, and read-state lifecycle.

### What F-B IS responsible for

- **`Notification` entity** — durable per-user notification records with priority, channel, status fields
- **`NotificationRead` entity** — per-user read/dismissed state (separate entity preserves notification immutability)
- **`NotificationDispatchService`** — orchestrator: reads preferences → selects channels → dispatches per channel
- **`NotificationsService`** — query API: list with cursor pagination, dismissed filter, read-state aggregation
- **In-app channel** — durable persistence in `Notification` entity, queried by `NotificationsService`
- **Email channel** — dispatched via `EmailService` consumer
- **`ActivityNotificationProjector`** — projects domain events into notifications (event-driven)
- **Per-user preferences enforcement** — consults `NotificationPreferencesService` before dispatch
- **Guest-user filter** — Platform `VIEWER` (Guest) role users do not receive notifications

### What F-B is NOT responsible for

- **Tenant scope enforcement** — owned by Engine 2.
- **Authentication / role identity** — owned by Engine 1; F-B *consumes* `platformRole` from user-organization context.
- **Domain event production** — owned by emitting modules (Engine 3 work-management, Engine 5 governance, etc.). F-B is the projector + dispatcher.
- **Email transport** — `EmailService` is a separate shared service; F-B *calls* it, does not own SMTP / SES integration.
- **Slack / Teams transport** — declared in `NotificationChannel` enum but **not implemented**; explicit `// TODO` in dispatch service.
- **Mobile push notification** — out of current scope.
- **SMS / voice channels** — out of current scope.

### Foundation boundary tests

| Question | Answer is F-B if… | Answer is *not* F-B if… |
|---|---|---|
| "Does this code persist a `Notification` row?" | yes — in-app sender | it consumes notifications for display |
| "Does this code call `EmailService.send`?" | F-B does, for notification emails; not for transactional auth emails | auth flows email directly |
| "Does this code emit a domain event?" | no — domain events are emitted by business modules | yes — F-B *consumes* domain events via the projector |
| "Does this code skip a notification because of preferences?" | yes — F-B preference check | it modifies preferences (Engine 1 / users module) |

---

## F-B.2 Architectural Decisions (Retrospective ADRs)

Five decisions shape F-B.

### ADR-F-B-001 — Notification Immutability with Separate Read State

**Context.** Two entity-modeling choices were available:

- **(a)** Single `Notification` row with mutable `readAt` and `dismissedAt` fields.
- **(b)** Immutable `Notification` row + separate `NotificationRead` row capturing per-user read/dismissed state.

**Decision.** Option (b). [`NotificationRead`](zephix-backend/src/modules/notifications/entities/notification-read.entity.ts) is a separate entity; queries that filter dismissed notifications use a `NOT EXISTS` subquery against `notification_reads`.

**Consequences.**

- **Notification content is immutable.** Auditability + reproducibility — what the user was notified of cannot change after dispatch.
- **Per-user read state is per-user.** Same notification can have different read states for different users (relevant for broadcast notifications).
- **Query cost.** List queries include a `NOT EXISTS` subquery — measurable but acceptable cost given expected volumes.

---

### ADR-F-B-002 — Per-User Preference Enforcement Before Dispatch

**Context.** Notification fatigue is a real product problem; users disengage from products that over-notify. Two enforcement points:

- **(a)** Send everything, let the recipient filter client-side.
- **(b)** Enforce preferences at dispatch — never send disabled categories or channels.

**Decision.** Option (b). [`NotificationDispatchService.dispatch()`](zephix-backend/src/modules/notifications/notification-dispatch.service.ts) calls `NotificationPreferencesService.getPreferences(userId, orgId)` first, then checks:

1. **Category enabled** — `isCategoryEnabled(eventType, preferences)` filters by event-type category
2. **Channel enabled** — `preferences.channels.inApp` and `preferences.channels.email` gate per-channel dispatch

A user who has disabled the email channel for "task-assigned" events receives no email even if the system attempts to send one.

**Consequences.**

- **Server-side enforcement** — no client-side bypass.
- **Per-org preferences** — preference resolution is `(userId, organizationId)`-keyed; the same user can have different preferences in different orgs.
- **Cost.** Every dispatch loads preferences. Caching is FW (FW-F-B-001).

---

### ADR-F-B-003 — Guest-User Notification Suppression (Platform VIEWER Filter)

**Context.** Platform `VIEWER` (Guest) role users have read-only access. Sending them notifications about state changes they cannot act on produces noise without value.

**Decision.** [`NotificationDispatchService.dispatch()`](zephix-backend/src/modules/notifications/notification-dispatch.service.ts) skips dispatch for users whose normalized `PlatformRole === VIEWER`:

```ts
if (platformRole === PlatformRole.VIEWER) {
  this.logger.debug(`Notification skipped: Guest user ${userId} cannot receive notifications`);
  return;
}
```

Engine 1 (RBAC) supplies the role via `UserOrganization`; F-B consumes.

**Consequences.**

- **Quiet by default for Guests.** Aligns with the "Guest = read-only, low-friction" UX posture.
- **No opt-in path for Guest notifications** — if a future Guest tier needs notifications, this filter must be revisited (FW-F-B-002).

---

### ADR-F-B-004 — Non-Throwing Dispatch

**Context.** Notification dispatch failures (transient SMTP, mis-configured Slack, partial-stack outage) should not break the user's primary action. If a task assignment succeeds in the database but the assignee notification fails, the assignment is still done — failing the assignment because the notification failed is the wrong trade.

**Decision.** [`NotificationDispatchService.dispatch()`](zephix-backend/src/modules/notifications/notification-dispatch.service.ts) wraps the entire dispatch in `try/catch`; errors are logged at `error` level with stack but the method returns normally.

**Consequences.**

- **Primary user actions remain unaffected** by dispatch failures.
- **Silent-failure mode if logs are not monitored.** The error log is the only signal. Operators need a log alert on `Failed to dispatch notification` to detect dispatch outages. Operational concern; flagged as Debt-F-B-001.
- **Same trade-off as F-A's `record` semantics** (best-effort) — different operation, same architectural choice.

---

### ADR-F-B-005 — Channel Enum Includes Slack + Teams as Future-Reserved

**Context.** Future Slack + Teams channels were anticipated; two options:

- **(a)** Add channel enum values when implementing.
- **(b)** Reserve enum values now, mark unimplemented channels as TODO in the dispatch.

**Decision.** Option (b). [`NotificationChannel` enum](zephix-backend/src/modules/notifications/entities/notification.entity.ts) declares `IN_APP`, `EMAIL`, `SLACK`, `TEAMS`. Dispatch service comment: `// TODO: Slack and Teams notifications when integrations are configured`.

**Consequences.**

- **Schema-stable.** Adding Slack later does not require entity migration.
- **Honest declaration.** The enum value exists; the dispatch is explicitly TODO. Readers see the gap.
- **Tracked as FW-F-B-003 + FW-F-B-004.**

---

## F-B.3 Current Implementation State

### Channel inventory (verified at HEAD)

| Channel | Enum | Dispatch | Status |
|---|---|---|---|
| In-app | `IN_APP` | `sendInAppNotification` ([dispatch.service](zephix-backend/src/modules/notifications/notification-dispatch.service.ts)) — persists to `Notification` entity | **Shipped** |
| Email | `EMAIL` | `sendEmailNotification` — calls `EmailService` | **Shipped** |
| Slack | `SLACK` | `// TODO: Slack and Teams notifications when integrations are configured` | **Not shipped** (FW-F-B-003) |
| Teams | `TEAMS` | Same TODO | **Not shipped** (FW-F-B-004) |

### Module file inventory

```
notifications/
├── notifications.module.ts
├── notifications.controller.ts            # REST API: list, mark-read, dismiss
├── notifications.service.ts               # query API + dismissed filter
├── notification-dispatch.service.ts       # orchestrator: preferences → channels → dispatch
├── dto/
│   └── patch-notification-inbox-state.dto.ts
├── entities/
│   ├── notification.entity.ts             # core entity + enums (Priority, Channel, Status)
│   └── notification-read.entity.ts        # per-user read/dismissed state (ADR-F-B-001)
├── services/
│   └── activity-notification-projector.service.ts  # domain event → notification projection
├── notifications-read-all.spec.ts
└── notifications-dismiss.spec.ts
```

### Entity model (verified at HEAD)

[`Notification`](zephix-backend/src/modules/notifications/entities/notification.entity.ts) carries:

- Identity: `id`, `organizationId`, `userId`, `workspaceId` (nullable)
- Content: `eventType` (text), `title`, `body` (nullable), `data` (jsonb, default `{}`)
- Routing: `priority` (enum), `channel` (enum), `status` (enum)
- Audit: `createdAt`
- Indexes: `(userId, createdAt)`, `(organizationId, createdAt)`, `(workspaceId, createdAt)` — three forensic-query patterns

Enums:
- `NotificationPriority`: `LOW` / `NORMAL` / `HIGH` / `URGENT`
- `NotificationChannel`: `IN_APP` / `EMAIL` / `SLACK` / `TEAMS`
- `NotificationStatus`: `QUEUED` / `SENT` / `FAILED` / `DELIVERED`

### Dispatch flow (verified)

```
dispatch(userId, orgId, workspaceId, eventType, title, body, data, priority)
  ↓
Resolve UserOrganization → normalize PlatformRole
  ↓
If PlatformRole === VIEWER → skip (ADR-F-B-003)
  ↓
Load preferences via NotificationPreferencesService
  ↓
isCategoryEnabled(eventType, preferences)? → if no, skip
  ↓
For each enabled channel:
  - inApp: sendInAppNotification (persist Notification row)
  - email: sendEmailNotification (EmailService.send)
  - slack: TODO (skipped)
  - teams: TODO (skipped)
  ↓
On error: log + return (ADR-F-B-004 non-throwing)
```

### Read-state lifecycle

[`NotificationsService`](zephix-backend/src/modules/notifications/notifications.service.ts) supports:

- `list(userId, query)` — cursor-paginated, optional `status: 'unread' | 'all'` filter
- Dismissed filter via `NOT EXISTS` subquery against `notification_reads.dismissed_at`
- Mark-read / dismiss surface via REST controller (`PATCH` endpoints)

### Activity projection

[`ActivityNotificationProjector`](zephix-backend/src/modules/notifications/services/activity-notification-projector.service.ts) consumes domain events from emitting modules and produces notifications (eventType + title + data shape). Bridges Engine 3/4/5/etc. event emission to F-B dispatch.

---

## F-B.4 Integration Patterns

### F-B ↔ Engine 1 (RBAC)

- Guest-user filter (ADR-F-B-003) consumes `PlatformRole` from Engine 1 via `UserOrganization` query.
- No direct dispatch into Engine 1; F-B is one-way consumer.

### F-B ↔ Engine 2 (Tenancy)

- All notifications carry `organizationId`; preference resolution is `(userId, organizationId)`-keyed.
- Workspace context optional (`workspaceId` nullable on entity for org-level notifications).

### F-B ↔ Engine 3 (Work Management)

- `ActivityNotificationProjector` consumes work-management domain events (task-assigned, status-changed, etc.) and produces notifications.

### F-B ↔ Engine 5 (Governance)

- Governance evaluations could project to notifications (governance-rule-violation, exception-pending) via the same projector pattern. Currently shipped: `ActivityNotificationProjector` covers domain events broadly; specific governance-driven notifications are FW.

### F-B ↔ F-C (Integrations)

- **Critical dependency for FW-F-B-003 + FW-F-B-004**: Slack + Teams channel implementation requires F-C integration substrate (workspace-level connection record, encrypted credentials, webhook delivery). The TODO comment `// when integrations are configured` references this dependency.

### F-B ↔ F-A (Audit)

- Notification dispatch is **not currently** audited via `auditService.record`. Notifications are not destructive operations; per F-A.5.1, forensic audit is required for destructive operations. Dispatch status changes (`SENT` / `FAILED`) are status-tracked on the entity itself.
- **Architectural concern**: high-priority notifications (e.g., security alerts) might warrant forensic audit emission. Currently scoped to `Notification.status` lifecycle; tracked as FW-F-B-005.

---

## F-B.5 Practitioner Discipline + Competitive Positioning

### F-B.5.1 — What Discipline Requires

Notification systems fail in two characteristic ways: (1) under-notify (users miss critical events) and (2) over-notify (users disengage and miss critical events anyway). The discipline is the middle path — high-signal, low-noise, per-user-respected.

Robust notification discipline requires the following non-negotiables:

- **User preferences are server-enforced, not client-filtered.** A platform that sends every notification and lets the client filter is delegating UX discipline to per-recipient configuration. Server-side enforcement at dispatch time is the only architecture that respects preferences when the recipient hasn't configured their client (most users).
- **Per-category granularity, not all-or-nothing.** "I want notifications for security events but not for task-assignment-by-myself" is a reasonable preference. Discipline requires per-event-type opt-in, not a single notifications-on/off switch.
- **Multi-channel orchestration with channel preferences.** "Email me about high-priority items, in-app for everything" is a reasonable preference. Each channel has its own preference; channels are orthogonal to event categories.
- **Notification immutability with separate read state.** What the user was notified of must not change after dispatch (forensic + reproducibility). Read state is per-user state, not notification state.
- **Delivery reliability with explicit retry + dead-letter.** Notifications that disappear into a void without retry produce silent failures. A platform that doesn't track delivery status is treating notifications as fire-and-forget — which is the wrong primitive for compliance-touching events.
- **Idempotency for cross-system events.** A domain event produced twice (race, retry) must not produce two notifications. The projector must dedupe.
- **Notification-on-notification suppression (digest mode).** A user receiving 50 notifications in 60 seconds is being spammed by the system. Discipline requires either rate-limiting at the user level or digest aggregation for high-volume periods.
- **Quiet hours / time-zone awareness.** Email at 03:00 local time is anti-discipline. Multi-tier delivery scheduling — urgent now, normal during user-defined working hours — is the practitioner-grade pattern.
- **Failure of dispatch must not break primary user action.** If task assignment succeeds but the assignee notification fails, the assignment is done. Coupling the two produces availability cascades.
- **Delivery status is observable.** Operators must be able to see "X% of notifications failed in the last hour" without log-grep-and-pray.

What discipline explicitly forbids:

- Over-notify-by-default with no unsubscribe path.
- All-or-nothing notification settings (no per-category granularity).
- Storing read state on the notification itself (forensic state mutability).
- Synchronous failure cascade (notification failure breaking primary operation).
- Silent dispatch failures with no observable signal.

### F-B.5.2 — What Existing Platforms Do (and Don't Do)

#### Pusher Beams + Knock

Knock is a notification infrastructure provider with multi-channel orchestration (email, SMS, push, in-app, Slack, Teams), per-user preferences, batching/throttling, and observability. Pusher Beams covers push notification delivery for mobile apps.

[Source: knock.app/docs + pusher.com/beams — accessed 2026-05-07]

- **Strength.** Fully-managed infrastructure; deep multi-channel orchestration; mature observability; integration-friendly SDK.
- **Miss for B2B governed PM.** Notification infrastructure is a third-party dependency; data residency, compliance posture, and audit-trail integration are tenant concerns when the notification path leaves the platform boundary.
- **Where Zephix differs.** F-B is in-platform — notifications never leave Zephix's tenant boundary for the in-app channel. Email leaves via the SMTP/SES provider but the notification record stays in Zephix's tenant database. Slack/Teams are FW.

#### AWS SNS / SQS

AWS Simple Notification Service + Simple Queue Service are the canonical fan-out-and-queue primitives. SNS publishes to topics; SQS queues messages for consumers; combined, they implement publish-subscribe with durable delivery.

[Source: aws.amazon.com/sns + aws.amazon.com/sqs — accessed 2026-05-07]

- **Strength.** Battle-tested durability; cross-region; deep AWS integration; dead-letter queues; large-scale.
- **Miss for B2B PM context.** Infrastructure-level — implements the message-passing, not the notification-product. User preferences, multi-channel orchestration, in-app inbox are out of scope.
- **Where Zephix differs.** Different layer. SNS/SQS would be a F-B implementation detail (queue between projector and dispatch) if F-B needed durability beyond the database. Currently F-B uses synchronous dispatch with database persistence — durable enough for current scale; FW for queue-backed delivery (FW-F-B-006).

#### Slack + Teams (real-time messaging platforms — as integration target)

Slack and Microsoft Teams expose webhooks + OAuth-based bot integrations for posting messages.

[Source: api.slack.com/messaging/webhooks + learn.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors/ — accessed 2026-05-07]

- **Strength.** Where the user already is. Posting to a Slack channel reaches the user without context-switching to email or the Zephix app.
- **Miss for in-product UX.** Messages in Slack/Teams don't carry the same depth of context that an in-app notification does. Integration is one-way (Zephix → Slack); reply / action-from-Slack is more complex.
- **Where Zephix differs (today).** Not yet integrated. Channels declared in `NotificationChannel` enum; dispatch is `// TODO`. FW-F-B-003 + FW-F-B-004.

#### Linear notification system

Linear ships per-team and per-issue notification subscriptions, batched delivery for high-volume periods, and customizable per-event preferences.

[Source: linear.app/docs/notifications — accessed 2026-05-07]

- **Strength.** Per-issue subscription model; batched delivery; respects user preferences per category.
- **Miss for governed-PM context.** Linear's segment is engineering teams; notification breadth is appropriate to that segment. Governance-event notifications, compliance-event notifications, audit-trail-driven notifications are out of scope.
- **Where Zephix differs.** F-B can project any domain event to a notification (via `ActivityNotificationProjector`); the breadth is broader, including governance + compliance event types. Per-issue subscription is a future surface (FW-F-B-007).

#### GitHub notifications

GitHub's notification system supports per-repository / per-issue subscriptions, threading by event source, web + email + mobile push delivery, and sophisticated filter rules (mentioned, assigned, review-requested).

[Source: docs.github.com/en/account-and-profile/managing-subscriptions-and-notifications-on-github — accessed 2026-05-07]

- **Strength.** Mature subscription model; deep filter granularity; web interface for triage.
- **Miss for governed-PM context.** Same as Linear — engineering-segment-appropriate; not governance/compliance-aware.
- **Where Zephix differs.** F-B's projector can project any event type, and Engine 5/8 governance events are first-class. The subscription model is currently coarser (per-user preferences + per-category opt-in); per-entity subscription is FW-F-B-007.

### F-B.5.3 — Zephix's Differentiation

F-B's architectural decisions enable concrete differentiation. Differentiations 1-4 are shipped; Differentiations 5-6 are honestly labeled as architectural enablers with FW surface.

#### Differentiation 1 — Notification immutability with separate read state

Per ADR-F-B-001: `Notification` is immutable; `NotificationRead` is per-user mutable state. This produces forensic-quality notification records (what the user was told never changes) while supporting per-user read tracking (different users have different read states for the same notification).

Most consumer-grade notification systems collapse the two into a single mutable row. F-B's separation is structural.

**Shipped.** Anchored in: [notification-read.entity.ts](zephix-backend/src/modules/notifications/entities/notification-read.entity.ts) + `NOT EXISTS` query pattern in NotificationsService.

#### Differentiation 2 — Server-enforced per-user preferences with per-category granularity

Per ADR-F-B-002: dispatch checks preferences before sending. Per-category enabled-check (`isCategoryEnabled(eventType, preferences)`) plus per-channel enabled-check (`preferences.channels.inApp`, `preferences.channels.email`).

This is more granular than all-or-nothing notification systems and structurally different from client-side-filter systems where the dispatch always happens.

**Shipped.** Anchored in: [notification-dispatch.service.ts](zephix-backend/src/modules/notifications/notification-dispatch.service.ts) `isCategoryEnabled` + per-channel check.

#### Differentiation 3 — Guest-user notification suppression as RBAC integration

Per ADR-F-B-003: Platform `VIEWER` (Guest) users skipped at dispatch. RBAC integration is structural; preference systems aren't asked to handle the Guest case.

This recognizes that read-only users have no actions to take on notification-driven events. Quiet by default for the role that doesn't act.

**Shipped.** Anchored in: dispatch.service VIEWER skip block + Engine 1 PlatformRole consumption.

#### Differentiation 4 — Non-throwing dispatch as availability discipline

Per ADR-F-B-004: dispatch failures don't break primary user actions. Same architectural pattern as F-A's `record` (best-effort) — different operation, same trade-off discipline applied consistently.

**Shipped.** Anchored in: dispatch.service `try/catch` with logger.error + return.

#### Differentiation 5 — Architectural enabler for multi-channel orchestration including Slack + Teams (FW-F-B-003 + FW-F-B-004)

The discipline (Section F-B.5.1) requires multi-channel orchestration with channel preferences. Currently shipped: in-app + email channels with preference enforcement. Currently NOT shipped: Slack + Teams channels (declared in enum, explicit `// TODO` in dispatch).

The architectural enabler is real: `NotificationChannel` enum reserves the values; dispatch service has the per-channel branch structure; preference resolution covers per-channel checks. Adding a channel implementation is additive (one branch per channel in dispatch + a sender service).

Differentiation positioning: *the architectural foundation for multi-channel orchestration is shipped; Slack and Teams channels are FW pending F-C integration substrate (workspace-level Slack/Teams connection record, encrypted credentials, webhook delivery).* **No fictional shipped channel claimed.**

**Substrate enabler shipped; surface FW.** Anchored enabler in: NotificationChannel enum + dispatch.service branch structure. FW: `FW-F-B-003` (Slack) + `FW-F-B-004` (Teams).

#### Differentiation 6 — Architectural enabler for queue-backed durable delivery (FW-F-B-006)

The discipline (Section F-B.5.1) requires explicit retry + dead-letter for delivery reliability. Currently shipped: synchronous dispatch with database persistence (durable, but no retry on transient transport failure).

The architectural enabler exists: `NotificationStatus` enum reserves `QUEUED` / `SENT` / `FAILED` / `DELIVERED` values. A queue-backed dispatcher could move notifications through this lifecycle without entity-model change.

Differentiation positioning: *the architectural foundation for queue-backed delivery is reserved in the entity model; the queue + dispatcher service are FW.*

**Substrate enabler reserved; surface FW.** Anchored in: NotificationStatus enum. FW: `FW-F-B-006`.

### Section F-B.5 summary

Differentiations 1-4 are shipped: immutability + read state separation, server-enforced per-user-per-category preferences, RBAC-integrated Guest filter, non-throwing availability discipline. Differentiations 5-6 are honestly labeled with FW surfaces (Slack/Teams channels pending F-C integration; queue-backed delivery as roadmap). No claim of "comprehensive multi-channel orchestration" is made — F-B currently delivers two channels.

---

## F-B.6 Technical Debt + Future Work

### Debt-F-B-001 — Silent dispatch failure has no observable signal beyond log

**State.** `NotificationDispatchService.dispatch()` catches errors and logs at `error` level but returns normally (ADR-F-B-004). Operators need a log alert on the error string to detect dispatch outages.

**Risk.** Medium. A misconfigured EmailService could silently fail every notification email; operators only know via log monitoring.

**Resolution path.** Add metric emission (counter for `notification_dispatch_failures`) alongside log; integrate with existing observability stack.

### FW-F-B-001 — Preference caching

**State.** Every dispatch loads preferences via `NotificationPreferencesService.getPreferences(userId, orgId)`. At scale, this is a hot-path read.

**Resolution path.** Add memoization or short-TTL cache keyed on `(userId, orgId)`; invalidate on preference mutation.

### FW-F-B-002 — Guest-tier notifications opt-in

**State.** Per ADR-F-B-003, Platform VIEWER users get no notifications. A future Guest tier (read-only customer-facing portal users, or external collaborators) might need limited notifications (e.g., "your gate decision is pending review").

**Resolution path.** Per-organization feature flag for Guest notifications; specific event categories opt-in for Guests.

### FW-F-B-003 — Slack channel implementation

**State.** Per ADR-F-B-005, `NotificationChannel.SLACK` reserved; dispatch is `// TODO`.

**Resolution path.** Depends on F-C Slack integration (FW-F-C-XXX). When F-C ships Slack OAuth + webhook posting, F-B adds a `sendSlackNotification` branch in dispatch.

### FW-F-B-004 — Teams channel implementation

**State.** Same as FW-F-B-003 for Microsoft Teams.

**Resolution path.** Depends on F-C Teams integration. When F-C ships Teams webhook posting, F-B adds a `sendTeamsNotification` branch in dispatch.

### FW-F-B-005 — Forensic audit emission for high-priority notifications

**State.** Notification dispatch is not currently audited via F-A `auditService.record`. Most notifications don't need forensic audit; some (security alerts, compliance events) might.

**Resolution path.** Add optional `auditService.record` call for `NotificationPriority.URGENT` or specific event-type categories; coordinate with F-A discipline.

### FW-F-B-006 — Queue-backed durable delivery with retry + dead-letter

**State.** Per Differentiation 6: `NotificationStatus` enum reserves the lifecycle values; queue + dispatcher are FW.

**Resolution path.** Introduce queue (BullMQ, AWS SQS, or in-database job table); dispatch enqueues notifications; queue worker calls per-channel sender; failures move to dead-letter after retry exhaustion.

### FW-F-B-007 — Per-entity subscription model

**State.** Current preferences are per-user-per-category. Per-entity subscription ("notify me about this specific project, but not others") is a future surface.

**Resolution path.** New `NotificationSubscription` entity keyed on (user, entity-type, entity-id); preference resolution consults subscriptions before category check.

### FW-F-B-008 — Quiet hours / time-zone awareness

**State.** No time-zone or quiet-hours respect at dispatch.

**Resolution path.** User preference for quiet hours window; non-urgent notifications delayed until next allowed window.

### Architectural debt + future-work summary

| ID | Type | Severity | Resolution |
|---|---|---|---|
| Debt-F-B-001 | Debt | Medium | Add metric emission for dispatch failures |
| FW-F-B-001 | Future Work | — | Preference caching |
| FW-F-B-002 | Future Work | — | Guest-tier notification opt-in |
| FW-F-B-003 | Future Work | — | Slack channel (depends on F-C) |
| FW-F-B-004 | Future Work | — | Teams channel (depends on F-C) |
| FW-F-B-005 | Future Work | — | Forensic audit on URGENT notifications |
| FW-F-B-006 | Future Work | — | Queue-backed durable delivery |
| FW-F-B-007 | Future Work | — | Per-entity subscription model |
| FW-F-B-008 | Future Work | — | Quiet hours / time-zone awareness |

---

## F-B.7 Architecture Decision Record History

### ADRs originating in this document

| ADR | Title | Status |
|---|---|---|
| ADR-F-B-001 | Notification Immutability with Separate Read State | Accepted |
| ADR-F-B-002 | Per-User Preference Enforcement Before Dispatch | Accepted |
| ADR-F-B-003 | Guest-User Notification Suppression (Platform VIEWER) | Accepted |
| ADR-F-B-004 | Non-Throwing Dispatch | Accepted |
| ADR-F-B-005 | Channel Enum with Future-Reserved Slack + Teams | Accepted (Slack + Teams implementation FW) |

### Cross-references to existing architectural artifacts

| Document | Relationship to F-B |
|---|---|
| [Engine 2 doc](../engines/engine-2-tenancy.md) | Tenant context for `(userId, organizationId)`-keyed preference resolution |
| [F-A doc](f-a-audit-trail.md) | Audit emission patterns; FW-F-B-005 cross-reference |
| [F-C doc](f-c-integrations.md) | Slack + Teams integration substrate dependency for FW-F-B-003 + FW-F-B-004 |
| [AD-027_LOCKED.md](../AD-027_LOCKED.md) | AD-027 critical-path enumeration; notifications controllers in scope |

### Cross-document navigation

- Foundation siblings: [F-A (Audit)](f-a-audit-trail.md), [F-C (Integrations)](f-c-integrations.md), [F-D (Capability Registry)](f-d-capability-registry.md)
- Engine docs: [Engine 2 (Tenancy)](../engines/engine-2-tenancy.md), [Engine 5 (Governance)](../engines/engine-5-governance.md)
- Security: [STRIDE Threat Model](../security/threat-model-stride.md)
- Architect state: [Architect-side Carries Inventory](../architect-state/architect-side-carries.md)

---

**End of F-B — Notifications architectural document.**
