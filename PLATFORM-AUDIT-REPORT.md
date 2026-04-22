# Zephix Platform Audit Report

## Generated: Tuesday, April 14, 2026

## Auditor: Cursor AI (Solution Architect role)

**Scope:** Read-only inspection of `/Users/malikadeel/Downloads/ZephixApp` (no application code changes, no migrations executed). Commands and file reads were run in this environment to produce evidence-backed findings.

---

### Executive Summary

Zephix is a **co-located monorepo** with a NestJS 10 modular backend (`zephix-backend`) and a Vite + React 18 frontend (`zephix-frontend`), plus a thin root `package.json` that orchestrates verification scripts rather than publishing shared workspace packages. The backend exposes a large **modular monolith** surface (130+ controllers, 220+ services) with TypeORM 0.3.x, PostgreSQL, and a **glob-loaded entity model** at runtime (`**/*.entity{.ts,.js}`), while CLI migrations use a **narrow explicit entity list** in `src/config/data-source.ts`. **Authentication is dual-path: HttpOnly cookies (`zephix_session`, `zephix_refresh`) plus optional `Authorization: Bearer` fallback** in the JWT strategy. **Governance rules are real and persisted**: `GovernanceRuleEngineService.evaluate()` resolves rule sets, evaluates JSON rule definitions, persists `governance_evaluations` with snapshots/hashes, supports WARN/BLOCK/OVERRIDE, and integrates **approved governance exceptions** for task status transitions; **bulk status change does call the engine** (per-task loop). **Work management** centers on `work_tasks` (soft delete via `deleted_at`) with **MAX_LIMIT = 200** on list queries and a **~1,792-line** `WorkTasksService`. The frontend uses **TanStack Query + Zustand + axios (`withCredentials`)**, React Router 7 `Routes`, and a **WaterfallTable** (~2,527 lines) with **live phase rollups** (`computePhaseRollup`). **Type health is split**: `npx tsc --noEmit -p tsconfig.build.json` **passes** in the backend; the frontend **`tsc` reports on the order of ~24 errors** (sample: `MyWorkPage` axios typing, onboarding `"Guest"` vs `"Viewer"`, dashboard union types). **Org permission matrix** is **not display-only**: admin APIs persist toggles under **organization `settings` JSON** (`permissions`, `workspacePermissionDefaults`). Overall the platform is **feature-rich with intentional MVP gates** (several project tabs render `NotEnabledInProject`), and the highest risk areas are **type drift on the frontend**, **legacy/parallel domains** (`pm/`, legacy `tasks` module vs `work-management`), and **operational complexity** of the large controller graph.

---

### Section 1: Project Structure

#### 1.1 — Monorepo layout

- **Root:** Contains many historical markdown reports, `.cursor` rules/skills, `zephix-backend/`, `zephix-frontend/`, `scripts/` (including `scripts/smoke/*`), `docs/`, and root `package.json` (name `zephix-app`) with `verify` / `verify:backend` / `verify:frontend` scripts. **No npm `workspaces` package graph** in root `package.json` (dependencies exist at root mainly for tooling/MCP—not a shared library workspace).
- **`zephix-backend/`:** Standard NestJS app (`src/`, `test/`, `migrations/`, `scripts/`, `package.json`).
- **`zephix-frontend/`:** Vite app (`src/`, `tests/`, `package.json`).

#### 1.2 — Backend module structure

| Metric | Value |
|--------|------:|
| **`.ts` files under `zephix-backend/src`** (excl. `node_modules`, `dist`) | **1412** |
| **`*.spec.ts` / `*.test.ts` under `zephix-backend/src`** | **217** |

**NestJS module directories under `src/modules/`** (51): `ai`, `ai-orchestrator`, `analytics`, `attachments`, `audit`, `auth`, `billing`, `budgets`, `cache`, `change-requests`, `commands`, `custom-fields`, `dashboards`, `database`, `demo-requests`, `docs`, `documents`, `domain-events`, `favorites`, `forms`, `governance-exceptions`, `governance-rules`, `home`, `integrations`, `knowledge-index`, `kpi`, `kpi-queue`, `kpis`, `notifications`, `organization-analytics`, `policies`, `portfolios`, `programs`, `projects`, `resources`, `risks`, `rollups`, `scenarios`, `shared`, `signals`, `tasks`, `teams`, `template-center`, `templates`, `tenancy`, `users`, `work-items`, `work-management`, `workspace-access`, `workspaces`.

**Notable code outside `src/modules/`** (representative): `src/app.module.ts`, `src/config/*`, `src/common/*`, `src/middleware/*`, `src/admin/*`, `src/organizations/*`, `src/pm/*`, `src/health/*`, `src/billing/*`, `src/ai/*`, `src/workflows/*`, `src/brd/*`, `src/observability/*`, `src/architecture/*`, `src/waitlist/*`, `src/feedback/*`, `src/intelligence/*`, `src/dashboard/*`, `src/database/*`, `src/scripts/*`.

#### 1.3 — Frontend component structure

| Metric | Value |
|--------|------:|
| **`.ts` / `.tsx` under `zephix-frontend/src`** (excl. `node_modules`, `dist`) | **914** |
| **Test files under `zephix-frontend/src`** (`*.spec.*` / `*.test.*`) | **106** |

**`src/features/`** (top-level): `admin`, `administration`, `ai-assistant`, `attachments`, `beta`, `budget`, `budgets`, `capacity`, `change-requests`, `command-palette`, `dashboards`, `docs`, `documents`, `explanations`, `favorites`, `forms`, `integrations`, `kpis`, `notifications`, `onboarding`, `org-dashboard`, `organizations`, `phase-gates`, `policies`, `portfolio-rollups`, `portfolios`, `programs`, `projects`, `resources`, `risks`, `scenarios`, `search`, `sprints`, `tailoring`, `templates`, `widgets`, `work-items`, `work-management`, `workspaces`.

**`src/pages/`** includes both **flat page files** (e.g. `InboxPage.tsx`, `LandingPage.tsx`, …) and **route-group directories** (`auth/`, `billing/`, `dashboard/`, `my-work/`, `onboarding/`, `projects/`, `settings/`, `templates/`, `workspaces/`, …).

**Shared UI:** `src/components/` (layouts, shell, routing, pm, system, ui primitives under `components/ui/*`, etc.).

**Routing:** Primary app router is **`zephix-frontend/src/App.tsx`** using `react-router-dom` **`BrowserRouter` + `Routes` + `Route`** (not `createBrowserRouter`). Nested layouts include `ProtectedRoute`, `AppAuthenticatedChrome`, `DashboardLayout`, `RequireWorkspace`, `PaidRoute`, `AdministrationLayout`.

**State management (evidence):**

- **TanStack Query:** `useQuery` / `useMutation` widely (e.g. `Sidebar.tsx` for dashboards).
- **Zustand:** `workspace.store`, `uiStore`, sidebar UI stores, admin modal store, etc.
- **React Context:** `AuthContext` (`AuthProvider` in `App.tsx`).
- **No Redux** observed in `package.json` dependencies.

#### 1.4 — Package dependencies (high-signal)

| Technology | Version / note |
|------------|----------------|
| **NestJS** | `@nestjs/common` **^10.0.0** (backend `package.json`) |
| **TypeORM** | **0.3.28** |
| **React** | **^18.3.1** |
| **Bundler** | **Vite** (`zephix-frontend`) — not CRA/Next |
| **Tailwind CSS** | **3.4.17** (devDependency) |
| **UI stack** | **Radix** primitives (`@radix-ui/*`), **Headless UI**, **Heroicons**, **Lucide**, **cmdk**, **CVA**, **tailwind-merge** — not a full MUI/Ant install |
| **Server / HTTP** | **axios** (`withCredentials: true`), base URL `/api` in dev |
| **TanStack Query** | **^5.90.5** |
| **Zustand** | **^5.0.8** |
| **Forms** | **react-hook-form** + **@hookform/resolvers** |
| **Validation (FE)** | **zod** |
| **Validation (BE)** | **class-validator** / **class-transformer** |

---

### Section 2: Database & Entities

#### 2.1 — Entity inventory

- **Count:** **152** files matching `**/*.entity.ts` under `zephix-backend/src`.
- **Important structural note:** There are **parallel domains**:
  - **Canonical product modules** under `src/modules/**/entities`.
  - **Legacy / alternate PM domain** under `src/pm/entities` and related services.
  - **Duplicate “Task” concepts:** `modules/projects/entities/task.entity.ts`, `modules/tasks/entities/task.entity.ts`, and **`modules/work-management/entities/work-task.entity.ts`** (`work_tasks`).

**Canonical `WorkTask` (`work_tasks`) — columns & relations (full)**

| Column | Type / notes | Nullable | Default |
|--------|----------------|----------|---------|
| `id` | uuid PK | no | generated |
| `organization_id` | uuid | no | — |
| `workspace_id` | uuid | no | — |
| `project_id` | uuid | no | — |
| `parent_task_id` | uuid | yes | — |
| `phase_id` | uuid | yes | — |
| `title` | varchar(300) | no | — |
| `description` | text | yes | — |
| `status` | enum `TaskStatus` | no | `TODO` |
| `type` | enum `TaskType` | no | `TASK` |
| `priority` | enum `TaskPriority` | no | `MEDIUM` |
| `assignee_user_id` | uuid | yes | — |
| `reporter_user_id` | uuid | yes | — |
| `start_date` | date | yes | — |
| `due_date` | date | yes | — |
| `completed_at` | timestamp | yes | — |
| `planned_start_at` | timestamptz | yes | — |
| `planned_end_at` | timestamptz | yes | — |
| `actual_start_at` | timestamptz | yes | — |
| `actual_end_at` | timestamptz | yes | — |
| `percent_complete` | int | no | `0` |
| `is_milestone` | boolean | no | `false` |
| `constraint_type` | varchar(30) | no | `'asap'` |
| `constraint_date` | timestamptz | yes | — |
| `wbs_code` | varchar(50) | yes | — |
| `estimate_points` | int | yes | — |
| `estimate_hours` | numeric(10,2) | yes | — |
| `remaining_hours` | numeric(10,2) | yes | — |
| `actual_hours` | numeric(10,2) | yes | — |
| `iteration_id` | uuid | yes | — |
| `committed` | boolean | no | `false` |
| `rank` | numeric | yes | — |
| `tags` | jsonb | yes | — |
| `metadata` | jsonb | yes | — |
| `acceptance_criteria` | jsonb | yes | — |
| `approval_status` | enum `WorkTaskApprovalStatus` | no | `NOT_REQUIRED` |
| `document_required` | boolean | no | `false` |
| `remarks` | text | yes | — |
| `created_at` | timestamp | no | auto |
| `updated_at` | timestamp | no | auto |
| `deleted_at` | timestamp | yes | soft delete |
| `deleted_by_user_id` | uuid | yes | soft delete attribution |

**Relations:** `ManyToOne` → `Project`; self-ref `parentTask` / `OneToMany` `subtasks`; `ManyToOne` → `WorkPhase` (nullable); `ManyToOne` → `Iteration` (nullable). **No `@DeleteDateColumn`** — soft delete is a **manual `deleted_at` column**.

**Enums used:** `TaskStatus`, `TaskPriority`, `TaskType`, `WorkTaskApprovalStatus` from `modules/work-management/enums/task.enums`.

**Governance entities (full column lists)**

- **`governance_rule_sets`** (`GovernanceRuleSet`): `id`, `organization_id?`, `workspace_id?`, `scope_type` (default `SYSTEM`), `scope_id?`, `entity_type`, `name`, `description?`, `enforcement_mode` (default `OFF`), `is_active`, `created_by?`, `created_at`, `updated_at`; relation `OneToMany` → rules.
- **`governance_rules`** (`GovernanceRule`): `id`, `rule_set_id`, `code`, `version`, `is_active`, `rule_definition` (jsonb), `created_by?`, `created_at`; `ManyToOne` → `GovernanceRuleSet`.
- **`governance_evaluations`** (`GovernanceEvaluation`): `id`, `organization_id`, `workspace_id`, `entity_type`, `entity_id`, `transition_type`, `from_value?`, `to_value?`, `rule_set_id?`, `rule_id?`, `rule_version?`, `enforcement_mode`, `decision`, `reasons` (jsonb), `inputs_hash?`, `inputs_snapshot?`, `actor_user_id`, `request_id?`, `created_at`.
- **`governance_exceptions`** (`GovernanceException`): `id`, `organization_id`, `workspace_id`, `project_id?`, `exception_type`, `status`, `reason`, `requested_by_user_id`, `resolved_by_user_id?`, `resolution_note?`, `audit_event_id?`, `metadata?`, `created_at`, `updated_at`.

**`security_settings` (`SecuritySettings`)** (org security posture): `id`, `organizationId` (unique), `twoFactorEnabled`, `sessionTimeout`, `passwordPolicy` (jsonb), `ipWhitelist` (text[]), `maxFailedAttempts`, `lockoutDuration`, `createdAt`, `updatedAt`; `OneToOne` → `Organization`.

**Remaining entities (152 total):** Not enumerated column-by-column in this report (would be tens of pages). High-risk clusters to track separately: **billing/plan**, **dashboards**, **resources/allocations**, **template-center**, **KPI/Budget/Documents** wave modules, **legacy PM** tables.

#### 2.2 — Migration inventory

| Metric | Value |
|--------|------:|
| **TypeORM migrations** (`zephix-backend/src/migrations/*.ts`, excluding `__tests__`) | **161** |
| **Latest migration file (lexical sort of timestamp prefix)** | `18000000000071-GovernanceCatalogNinePolicies.ts` |
| **Seed-like migrations** | Examples: `18000000000067-SeedGovernancePolicyCatalog.ts`, catalog/stabilize migrations; also `scripts/seed-*` TS utilities (not all are SQL migrations). |

**Data-source / entity loading**

- **Runtime app (`database.config.ts`, `data-source-production.ts`, `data-source-migrate.ts`):** `entities: [__dirname + '/../**/*.entity{.ts,.js}']` (glob).
- **CLI `src/config/data-source.ts`:** **explicit array** of entities (subset) + `migrations: getMigrationsForRuntime()` where **production-like** NODE_ENV maps to `dist/migrations/*.js` only; non-prod includes `src/migrations/*.ts` + `*.js`.

#### 2.3 — Enum inventory

**Approach:** `find … -name "*.enum.ts" -o -name "*.enums.ts"` returns a **moderate list** (not pasted here in full). Representative enums include **`PlatformRole`** (`shared/enums/platform-roles.enum.ts` pattern), **governance** enums in `governance-rule-set.entity.ts` / `governance-evaluation.entity.ts` / `governance-rule.entity.ts`, **task enums** in `modules/work-management/enums/task.enums.ts`, **policy** enums in `modules/policies/entities/policy-definition.entity.ts` (`PolicyCategory`, `PolicyValueType`), etc.

#### 2.4 — Entity relationship map (text ERD — canonical work path)

```
Organization (1) ──< (N) UserOrganization >── (1) User
Organization (1) ──< (N) Workspace
Workspace (1) ──< (N) WorkspaceMember >── (1) User
Workspace (1) ──< (N) Project
Project (1) ──< (N) WorkPhase
Project (1) ──< (N) WorkTask ──< (N) WorkTask (subtasks via parent_task_id)
WorkTask (N) ──> (1) WorkPhase (optional)
WorkTask (N) ──> (1) Iteration (optional)
GovernanceRuleSet (1) ──< (N) GovernanceRule
GovernanceEvaluation ──> (logical FKs to rule_set/rule)
GovernanceException ──> org/workspace/project (uuid FKs as columns)
SecuritySettings (1) ── (1) Organization
```

**Orphans / loose ends:** Several **`pm/*` entities** and **legacy `modules/projects/Task`** may not participate in the modern `work_tasks` graph; treat as **integration debt** until mapped.

---

### Section 3: API Layer

#### 3.1 — Controller inventory

| Metric | Value |
|--------|------:|
| **`*.controller.ts` files** | **131** |

**Pattern:** Many controllers use **`@UseGuards(JwtAuthGuard, …)`** at class or method level. **`AdminController`** is representative: `@Controller('admin')` + `@UseGuards(JwtAuthGuard, AdminGuard)`.

**Public / low-auth examples (non-exhaustive):**

- **`HealthController`** (`@Controller()`): health/version endpoints for probes (documented as `/api/health/*` with global `api` prefix in controller comments).
- **`AuthController`:** `register`, `login`, `csrf`, `refresh` paths are **intentionally reachable without JwtAuthGuard** (rate limits / smoke guards instead on some paths).
- **Smoke/demo controllers** exist under controlled env keys (`smoke/*` modules) — treat as **non-production** surfaces.

**Representative route prefixes** (from `@Controller`): `auth`, `admin`, `work`, `work/tasks`, `workspaces`, `projects`, `templates`, `template-center/*`, `dashboards`, `notifications`, `governance` modules split between `admin/governance-rules`, `admin/governance`, etc.

> **Note:** A literal “every endpoint line” for 131 controllers would be thousands of lines; this audit captures **inventory, guard patterns, and deep dives on critical domains**.

#### 3.2 — DTO inventory

| Metric | Value |
|--------|------:|
| **`*.dto.ts` files** | **184** |

**Critical DTOs (auth / work / workspace / project):** Files live under `modules/auth/dto/*`, `modules/work-management/dto/*`, `modules/workspaces/dto/*`, `modules/projects/dto/*` — generally use **`class-validator`** decorators; class-transformer usage exists in the codebase though not re-audited decorator-by-decorator here.

#### 3.3 — Guards and middleware

| Metric | Value |
|--------|------:|
| **Guards + middleware + interceptors (`*.guard.ts`, `*.middleware.ts`, `*.interceptor.ts`)** | **41** files |

**`JwtAuthGuard`:** Passport `'jwt'` guard (thin wrapper).

**`JwtStrategy`:** Extracts JWT **from HttpOnly cookie `zephix_session` first**, else **`Authorization: Bearer`**. Validates payload includes `sub` + `email`; constructs `AuthUser` with `platformRole` fallback from legacy `role`.

**Global guards (`AppModule`):** `CsrfGuard` (APP_GUARD), `PlanStatusGuard` (APP_GUARD). **JWT is not registered as a global APP_GUARD** in `app.module.ts` — controllers must opt in.

#### 3.4 — Service inventory

| Metric | Value |
|--------|------:|
| **`*.service.ts` files** | **229** |

**`WorkTasksService` (~1792 LOC)** — injected dependencies include repositories, workspace access, tenant context, optional **`GovernanceRuleEngineService`**, **`GovernanceExceptionsService`**, **`CapacityGovernanceService`**, domain events, org policy service, etc. **Public methods (verified):** `createTask`, `listTasks`, `getTaskById`, `updateTask`, `bulkUpdateStatus`, `deleteTask`, `restoreTask`, plus additional helpers.

**`WorkPhasesService`:** CRUD/list/ordering patterns; **explicit TODO** that **phase-gate governance engine hook is not wired** because phases lack a product-level “advance/submit gate” action.

**`GovernanceRuleEngineService`:** Core `evaluate(params: EvaluateParams)` + `evaluateTaskStatusChange` convenience.

**`TemplatesService` / `ProjectsService`:** Large files (**~1725** and **~2096** LOC respectively) — template/project orchestration hubs.

---

### Section 4: Authentication & Authorization

#### 4.1 — Auth flow (backend)

- **Login:** `AuthController` sets **HttpOnly** cookies **`zephix_refresh`** and **`zephix_session`** (access). SameSite logic adapts for localhost vs staging (`none` in staging for cross-site).
- **JWT configuration:** `JwtModule` registers **`expiresIn`** from `jwt.expiresIn` defaulting to **`15m`**; refresh lifetime defaults to **`7d`** via `JWT_REFRESH_EXPIRES_IN` / config.
- **Refresh:** `POST /auth/refresh` rotates tokens and re-sets cookies.
- **CSRF:** `GET /auth/csrf` issues **`XSRF-TOKEN`** cookie + body token; global `CsrfGuard` applies to mutating routes.
- **Registration:** **Self-serve registration exists** (`POST /auth/register` + alias `signup`) with rate limiting and neutral response semantics (per controller comments).

#### 4.2 — Role system

- **Platform roles:** `ADMIN`, `MEMBER`, `VIEWER` (per workspace rules + platform normalization helpers such as `normalizePlatformRole`).
- **Workspace roles:** Stored via **`WorkspaceMember`** (not fully re-opened here — audited via access services usage patterns).
- **Project roles:** Legacy `pm` / `user_project` style artifacts exist; modern work management primarily keys off **workspace access + org tenancy**.
- **JWT claims:** `platformRole`, `organizationId`, optional `workspaceId`, legacy `role`.
- **Enforcement:** Controller guards + services (`WorkspaceAccessService`, `AdminGuard`, org policy checks in sensitive mutations like task creation).

#### 4.3 — Security page backend (Administration → Security)

- **Org permission matrix:** **Backed by DB-backed org settings** through `GET/PATCH /admin/organization/permissions` and workspace defaults via `…/workspace-permissions` on **`AdminController`** (JWT + AdminGuard). Frontend tabs call these endpoints (with graceful fallback UI if errors).
- **Security settings entity:** `security_settings` exists for org-wide security posture (2FA flags, password policy JSON, lockout, etc.) — **distinct from** the “permission matrix toggles” (which are **`Organization.settings` JSON** keys `permissions` / `workspacePermissionDefaults`).

**Caveat:** **Downstream enforcement** of every matrix toggle across *all* controllers is a **separate verification task**; the persistence layer is real, not purely static UI.

---

### Section 5: Governance Engine

#### 5.1 — Engine architecture

**Primary service:** `GovernanceRuleEngineService` (`modules/governance-rules/services/governance-rule-engine.service.ts`).

- **`evaluate(params: EvaluateParams): Promise<EvaluationResult>`** inputs: org/workspace IDs, `GovernanceEntityType`, `entityId`, `TransitionType`, `fromValue`/`toValue`, `entity` snapshot object, `actor` (userId + platformRole + optional workspaceRole), optional `projectId` / `templateId`, optional `relatedEntities`, `requestId`, `overrideReason`.
- **Resolution:** `GovernanceRuleResolverService.resolve({ organizationId, workspaceId, projectId, templateId, entityType })` determines applicable rules.
- **Decision flow:** If no rules / no applicable transition → **ALLOW** (no audit row). Else evaluate JSON conditions; accumulate failures; compute highest **`EnforcementMode`** precedence among failing rules → **ALLOW / WARN / BLOCK / OVERRIDE** (override requires `ADMIN_OVERRIDE` + `overrideReason` + actor allowed).
- **Exceptions on BLOCK:** Engine searches for a **CONSUME-able approved governance bypass** (`findApprovedGovernanceBypass`) matching task + target status + blocking policy codes; if found, flips decision to **OVERRIDE** and marks exception **CONSUMED** with metadata linking evaluation id.
- **Persistence:** **Always writes** a `governance_evaluations` row on evaluated transitions (includes `inputs_snapshot`, `inputs_hash`, `reasons`).

**Call surfaces (verified in `WorkTasksService`):**

- **Task create** → governance evaluation path exists.
- **Task update / status change** → `evaluateTaskStatusChange`.
- **Bulk status** → loops tasks and calls engine when `dto.status` present; can create exceptions per blocked task; performs partial success semantics.

**Not wired (explicit code comment):**

- **`WorkPhasesService`** documents that **phase-gate engine hook** needs a product-level “advance/submit gate” action — **currently TODO**.

#### 5.2 — Policy catalog (nine-policy migration alignment)

Migration `18000000000071-GovernanceCatalogNinePolicies.ts` updates SYSTEM-scoped rules for codes:

1. `scope-change-control` — evaluable ROLE_ALLOWED condition on **creationOnly**  
2. `task-completion-signoff` — **FIELD_NOT_EMPTY** assignee on transition to **DONE**  
3. `phase-gate-approval` — placeholder conditions (empty)  
4. `deliverable-doc-required` — placeholder conditions (empty)  
5. `wip-limits` — placeholder (WARNING)  
6. `risk-threshold-alert` — placeholder (WARNING)  
7. `budget-threshold` — placeholder (WARNING)  
8. Adds / ensures **`schedule-tolerance`** and **`resource-capacity-governance`** on PROJECT system set (placeholder WARNING defs)  
9. Removes `mandatory-fields` policy rows

**Enforceability:** Seed migration `18000000000067-SeedGovernancePolicyCatalog.ts` documents SYSTEM sets ship with **`OFF`** enforcement at catalog level; real BLOCK/WARN behavior depends on **scoped rule set enforcement** attached to templates/projects and resolver wiring.

#### 5.3 — Governance “catalog” tables vs policy_definitions

- **Governance engine tables:** `governance_rule_sets`, `governance_rules`, `governance_rule_active_versions` (not fully re-listed here), `governance_evaluations`, `governance_exceptions`.
- **Separate catalog:** `policy_definitions` (`PolicyDefinition` entity) is a **generic policy key catalog** (category/value_type/default_value) — **not the same thing** as governance rules, though both relate to “policy” language in product docs.

---

### Section 6: Work Management

#### 6.1 — Task entity deep dive

See **Section 2.1** for the authoritative column list. **KT “44 columns”:** the audited `WorkTask` entity maps to **~40 scalar columns + relations**; legacy knowledge-transfer counts may include **indexes**, **removed**, or **DB-only** fields — treat **entity source** as truth.

#### 6.2 — Task service deep dive (`work-tasks.service.ts`)

- **Size:** **1792** lines.
- **Governance engine:** Called in **create**, **update/status change**, and **bulkUpdateStatus** paths (grep-verified `evaluateTaskStatusChange`).
- **200 task limit:** `const MAX_LIMIT = 200` enforced for listing (`listTasks` path).
- **Bulk update:** `bulkUpdateStatus` batches updates, integrates governance + capacity warnings, supports partial success paths.
- **Soft delete:** uses `deleted_at` / `deleted_by_user_id` fields (not TypeORM `@DeleteDateColumn`).
- **Cascade delete:** not re-derived here beyond FK `onDelete` behaviors on relations in entities (e.g., parent uses `SET NULL`).

#### 6.3 — Phase service (`work-phases.service.ts`)

- **Public capabilities:** list/create/update/delete patterns with workspace access checks; ordering via **`sortOrder`** ascending.
- **Lifecycle:** **No OPEN/IN_PROGRESS/CLOSED enum** in the audited portion — phases are structural (`is_locked`, milestone flags, dates).
- **Governance engine:** **Not injected** in constructor; **TODO** for phase-gate evaluation hook.

#### 6.4 — Template structure (high level)

- **Storage:** Multiple template systems coexist: **`modules/templates`** (lego blocks, project templates) and **`modules/template-center`** (`TemplateDefinition`, `TemplateVersion`, etc.).
- **`columnConfig` on `Project`:** `project.entity.ts` includes **`columnConfig: Record<string, boolean> | null`** (migration `18000000000066-AddColumnConfigToTemplatesAndProjects.ts` exists in repo history).
- **Template → project:** Orchestrated in large `TemplatesService` / template-center apply pipeline (not line-traced in this audit).
- **Governance inheritance:** Resolver accepts **`templateId`** to include template-scoped governance sets when evaluating transitions.

---

### Section 7: Frontend Routing & Pages

#### 7.1 — Router configuration (complete route table — from `App.tsx`)

Legend: ✅ content · ❌ placeholder/disabled · 🔒 `ProtectedRoute` · 👑 admin/paid gates

| Route | Component / behavior | Flags |
|------|------------------------|------|
| `/` | `RootRoute` → authed `/inbox`, else landing/marketing | public |
| `/login` | `LoginPage` | public |
| `/signup` | `SignupPage` | public |
| `/verify-email` | `VerifyEmailPage` | public |
| `/invites/accept` | `InviteAcceptPage` | public |
| `/invite` | `InvitePage` | public |
| `/join/workspace` | `JoinWorkspacePage` | public |
| `/w/:slug` | `WorkspaceSlugRedirect` | 🔒? (component decides) |
| `/w/:slug/home` | `WorkspaceHomeBySlug` | 🔒? |
| `/onboarding` | `OnboardingGuard` + `OnboardingPage` | 🔒 |
| `/setup/workspace` | redirect → `/onboarding` | 🔒 |
| `/inbox` | `InboxPage` | 🔒 ✅ |
| `/home` | redirect → `/inbox` | 🔒 |
| `/work` | `WorkRoute` → `/projects` or `/workspaces` | 🔒 |
| `/documents` | `DocumentsRoute` redirect | 🔒 |
| `/select-workspace` | `SelectWorkspacePage` | 🔒 |
| `/guest/home` | `GuestHomePage` | 🔒 |
| `/workspaces` | `WorkspacesIndexPage` | 🔒 ✅ |
| `/settings` | `SettingsPage` | 🔒 ✅ |
| `/settings/profile` | redirect → `/settings` | 🔒 |
| `/billing` | 👑 `RequireAdminInline` + `BillingPage` | 🔒 👑 |
| `/org-dashboard` | 👑 `RequireAdminInline` + `OrgDashboardPage` | 🔒 👑 |
| `/dashboards` | 👑 `RequireAdminInline` + `DashboardsIndex` | 🔒 👑 |
| `/my-work` | `PaidRoute` + `MyWorkPage` | 🔒 🔒 paid |
| `/reports` | redirect `/analytics` | 🔒 |
| `/risks` | redirect `/workspaces` | 🔒 |
| `/dashboards/:id` | `DashboardView` | 🔒 ✅ |
| `/dashboards/:id/edit` | `DashboardBuilder` | 🔒 ✅ |
| `/projects` | `ProjectsPage` | 🔒 ✅ |
| `/projects/:projectId` | `ProjectPageLayout` | 🔒 ✅ |
| `/projects/:projectId` (index) | `ProjectOverviewTab` | 🔒 ✅ |
| `/projects/:projectId/tasks` | `ProjectTasksTab` | 🔒 ✅ |
| `/projects/:projectId/board` | `ProjectBoardTab` | 🔒 ✅ |
| `/projects/:projectId/gantt` | `ProjectGanttTab` | 🔒 ✅ |
| `/projects/:projectId/plan` | ❌ `NotEnabledInProject` | 🔒 ❌ |
| `…/table` | ❌ `NotEnabledInProject` | 🔒 ❌ |
| `…/risks` | ❌ `NotEnabledInProject` | 🔒 ❌ |
| `…/resources` | ❌ `NotEnabledInProject` | 🔒 ❌ |
| `…/change-requests` | ❌ `NotEnabledInProject` | 🔒 ❌ |
| `…/documents` | ❌ `NotEnabledInProject` | 🔒 ❌ |
| `…/budget` | ❌ `NotEnabledInProject` | 🔒 ❌ |
| `…/kpis` | ❌ `NotEnabledInProject` | 🔒 ❌ |
| `/work/projects/:projectId/plan` | `ProjectPlanView` (legacy) | 🔒 ✅ |
| `/workspaces/:workspaceId/home` | `WorkspaceHomePage` | 🔒 ✅ |
| `/workspaces/:id` | `WorkspaceView` | 🔒 ✅ |
| `/workspaces/:id/members` | `RequirePaidInline` + `WorkspaceMembersPage` | 🔒 |
| `/workspaces/:id/settings` | `WorkspaceSettingsPage` | 🔒 ✅ |
| `/workspaces/:id/heatmap` | `ResourceHeatmapPage` | 🔒 ✅ |
| `/workspaces/:workspaceId/programs(/**)` | programs pages behind `FeaturesRoute` | 🔒 / flag |
| `/workspaces/:workspaceId/portfolios(/**)` | portfolios pages behind `FeaturesRoute` | 🔒 / flag |
| `/templates` | `RequirePaidInline` + `TemplateRouteSwitch` | 🔒 |
| `/docs/:docId` | `DocsPage` | 🔒 |
| `/forms/:formId/edit` | `FormsPage` | 🔒 |
| `/resources` | `ResourcesPage` | 🔒 ✅ |
| `/resources/:id/timeline` | `ResourceTimelinePage` | 🔒 ✅ |
| `/analytics` | `AnalyticsPage` | 🔒 ✅ |
| `/capacity` | `CapacityPage` | 🔒 ✅ |
| `/scenarios` | `ScenarioPage` | 🔒 ✅ |
| `/settings/notifications` | `PaidRoute` + `NotificationsSettingsPage` | 🔒 paid |
| `/settings/security` | `PaidRoute` + `SecuritySettingsPage` | 🔒 paid |
| `/403` | `Forbidden` | 🔒 |
| `/404` | `NotFound` | 🔒 |
| `/administration(/**)` | `RequireAdminInline` + `AdministrationLayout` + pages | 🔒 👑 |
| `/admin`, `/admin/*` | redirect → `/administration` | 🔒 👑 |
| `/dashboard` | redirect `/dashboards` | — |
| `*` | redirect `/404` | — |

#### 7.2 — Admin console pages

**Location pattern:** `zephix-frontend/src/features/administration/pages/*.tsx` + `components/*`.

**`AdministrationSecurityPage`:** Thin wrapper with tabs (`OrgPermissionsTab`, `WorkspacePermissionsTab`, `SecuritySettingsTab`) — ✅ functional structure; depends on child tabs for depth.

**`OrgPermissionsTab`:** ✅ Calls **`GET /admin/organization/permissions`** and **`PATCH /admin/organization/permissions`**; includes explicit UX copy that endpoint might fail and falls back to defaults.

> Full per-file line counts for every admin page were not pasted; largest nearby surfaces include **workspace sidebar** and **waterfall table**.

#### 7.3 — Settings page

- **Routes:** `/settings` hub; nested `/settings/notifications`, `/settings/security` (paid-gated).
- **Tabs:** Account, Workspace, Organization, Billing (admin only), Notifications, Security.
- **Backend calls:** Security sessions use **`/auth/sessions`**, **`/auth/sessions/:id/revoke`**, **`/auth/sessions/revoke-others`** (axios `request` helper).
- **Broken / risk (static review):** Main app **`tsc`** currently flags multiple unrelated TS issues; settings subtree not isolated as clean.

#### 7.4 — Project / work management pages

- **Project detail:** `ProjectPageLayout` with nested routes for tabs.
- **Tasks vs Waterfall:** `ProjectTasksTab` chooses **`WaterfallTable`** when `project.methodology === 'waterfall'` else **`TaskListSection`** (`features/projects/components/TaskListSection.tsx`, **~1596** LOC).
- **Board:** `ProjectBoardTab` in `features/projects/tabs`.
- **Data flow:** API modules in `features/work-management/workTasks.api.ts` + axios interceptors (`x-workspace-id`, CSRF) → TanStack Query/local state inside large components.

#### 7.5 — Sidebar (operational shell)

**File:** `components/shell/Sidebar.tsx`.

**Top items:** Brand → **Inbox**; **My Work** (paid users only); **Favorites** section; **Workspaces** tree (`SidebarWorkspaces`); **Dashboards** section (org admin); **Shared** (conditional); workspace filtering uses org/workspace stores. **Workspace membership v1 flag:** implemented as **`isWorkspaceMembershipV1Enabled()`** in `lib/flags.ts` (`VITE_WS_MEMBERSHIP_V1 === '1'` or flag helper) — used in workspace settings modal (not globally grepped inside `SidebarWorkspaces` in this audit).

**Administration entry:** Not in left nav per product rules; accessed via **profile/header** paths (Header component family — not re-opened here). **Admin console exit:** `AdministrationLayout` **native `<a href="/inbox">`** “Back to Zephix”.

#### 7.6 — Admin sidebar

**File:** `features/administration/layout/AdministrationLayout.tsx` + constants `features/administration/constants.ts`.

**Groups & routes:**

- **Platform Management:** `/administration`, `/administration/governance`, workspaces modal (`opensWorkspacesModal`), `/administration/templates`
- **People & Access:** `/administration/people`, `/administration/security`
- **Organization:** `/administration/organization`, `/administration/teams`, `/administration/notifications`
- **System:** `/administration/audit-trail`, `/administration/billing`

**Active state:** `NavLink` `isActive` styling; collapsed mode shows icons only.

---

### Section 8: Shared Components & Design System

#### 8.1 — Component library

- **Yes:** `src/components/ui/*` contains a growing primitives set (Button/Input/Card/overlay components referenced by `lint:new` scope).
- **Design tokens:** Tailwind utility-first; `tailwind.config.js` exists (theme extensions not re-printed here).

#### 8.2 — API client layer

- **File:** `src/lib/api.ts` — axios instance **`withCredentials: true`**, baseURL `/api` in dev, prod uses `VITE_API_URL` defaulting to hosted API.
- **CSRF:** Prefers **response-body token caching** + optional `XSRF-TOKEN` cookie read; mutating methods attach `X-CSRF-Token` header via interceptors (read in-file comments).
- **Errors:** Interceptor-based refresh/403 recovery patterns exist in the same module (not line-quoted in report).

#### 8.3 — State management

- **Primary:** TanStack Query for server state; Zustand for UI/workspace shell; AuthContext for session user.

---

### Section 9: Infrastructure & Deployment

#### 9.1 — Build configuration

- **Backend `tsconfig.json`:** **Does not enable full strict mode** — notably **`"strictNullChecks": false`**, **`noImplicitAny": false`** (enterprise quality risk).
- **Frontend `tsconfig.app.json`:** **`"strict": true`**.

#### 9.2 — Environment variables (names only — sampling)

**Backend (`process.env.*` grep sample):** `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `JWT_REFRESH_SECRET`, `JWT_REFRESH_EXPIRES_IN`, `PORT`, `NODE_ENV`, `CORS_ALLOWED_ORIGINS`, `FRONTEND_URL`, `ENABLE_GOVERNANCE`, `ENABLE_AI_MODULE`, `KPI_*`, `SMTP_*`, `AWS_*` (via SDK usage), `SENTRY_*` (if used), etc. *(Full unique set is large; grep output truncated at ~80 lines in audit session.)*

**Frontend (`VITE_*`):** includes `VITE_API_URL`, `VITE_SENTRY_DSN`, `VITE_FLAGS`, `VITE_WS_MEMBERSHIP_V1`, feature flags for capacity/resources/risks, etc.

#### 9.3 — Railway configuration

- **No `Procfile` / `railway.json` found** under `zephix-backend/` in this workspace snapshot (may live only in hosting UI or another branch).

#### 9.4 — Scripts (summary)

- **Backend:** `start:dev`, `build`, `migration:*`, many `seed:*`, `smoke:*`, `test:*`, `lint`, `db:*`.
- **Frontend:** `dev`, `build`, `preview`, `test:*`, `lint`, `lint:new`, `guard:*`.

---

### Section 10: Code Quality & Health

#### 10.1 — TypeScript strictness

- **Backend:** **Partial strictness off** (`strictNullChecks: false` in `tsconfig.json`).
- **Frontend:** **`strict: true`** in `tsconfig.app.json`.

#### 10.2 — Type safety check (`tsc --noEmit`)

| App | Command | Result |
|-----|---------|--------|
| **Backend** | `npx tsc --noEmit -p tsconfig.build.json` | **PASS (exit 0)** |
| **Frontend** | `npx tsc -p tsconfig.app.json --noEmit` | **FAIL** — **`rg "error TS" | wc -l` ≈ 24** in this environment |

**Example FE error classes observed:** axios response typing in `MyWorkPage`, onboarding union mismatch (`"Guest"` vs `"Viewer"`), dashboard widget union mismatches.

#### 10.3 — Test suite

| Suite | Result |
|-------|--------|
| **Backend `npm run test:smoke`** | **PASS** — `src/smoke-boot.spec.ts` (4 tests) |
| **Frontend `npm run test:guardrails`** | **PASS** — `src/test/guardrails/api-prefix.spec.ts` (1 test) |

**Counts:** backend **217** test files under `src/`; frontend **106** test files under `src/`.

#### 10.4 — Dead code detection

- **Observation:** Parallel folders (`features/admin` vs `features/administration`, legacy pages under `pages/dev`, large retired components like `TaskManagement.tsx`) are **candidates** for dead/legacy code — requires `ts-prune`/coverage-guided cleanup (not executed here).

#### 10.5 — Large file flag (>500 lines — top offenders)

**Backend (TS):** `projects.service.ts` (~2096), `work-tasks.service.ts` (~1792), `templates.service.ts` (~1725), `resources.service.ts` (~1306), `resource-allocation.service.ts` (~1300), `admin.controller.ts` (~1246), `workspaces.controller.ts` (~1213), `templates.controller.ts` (~1102), `dashboards.service.ts` (~1086), …

**Frontend (TSX):** `WaterfallTable.tsx` (~2527), `SidebarWorkspaces.tsx` (~1600), `TaskListSection.tsx` (~1596), `WorkItemDetailPanel.tsx` (~1525), `ProjectPlanView.tsx` (~1378), `ProjectTableTab.tsx` (~1341), …

---

### Section 11: Smoke Test — End-to-End Verification

#### 11.1 — Backend compile

- **`npx tsc --noEmit -p tsconfig.build.json`:** **PASS** (see §10.2).

#### 11.2 — Frontend compile

- **`npx tsc -p tsconfig.app.json --noEmit`:** **FAIL** (~24 errors).

#### 11.3 — Existing smoke scripts

- **Backend:** `zephix-backend/scripts/smoke-*.ts|sh`, `scripts/capture-smoke-proof.sh`, `test/smoke-boot.spec.ts`, repo `test/smoke.e2e-spec.ts`.
- **Frontend Playwright:** `zephix-frontend/tests/smoke*.spec.ts`, `tests/admin-smoke.spec.ts`.
- **Root:** `scripts/smoke/wave*.sh` family for staged waves.

---

### Section 12: Critical Questions (answers)

1. **Monorepo?** **Co-located apps** + root tooling scripts; **not** a shared-package Nx/Turborepo-style workspace graph.
2. **Microservices?** **Modular monolith** (single Nest deployable) with optional external integrations.
3. **How many DB tables (entity proxy)?** **152** `*.entity.ts` files (upper bound; some may map to same table rarely—unlikely).
4. **Deepest chain (example):** `Organization → Workspace → Project → WorkPhase → WorkTask → (subtask WorkTask)`.
5. **Auth cookie vs JWT?** **Both:** JWT payload carried in **HttpOnly cookie** primarily; **Bearer** supported.
6. **Multi-workspace different roles?** **Yes** via `WorkspaceMember` model (standard SaaS pattern).
7. **Security permission matrix enforced?** **Persisted + admin APIs exist**; **uniform enforcement across every endpoint** is **not proven** here.
8. **Unauthenticated endpoints?** **Yes** (health probes, auth login/register/csrf/refresh, etc.).
9. **Governance hooks wired vs TODO:** **Wired** for **task transitions / bulk**; **TODO** for **phase gate transitions** in `WorkPhasesService` commentary; separate **budget/capacity** governance services exist adjacent to domain.
10. **Approve → retry flow?** Engine supports **CONSUMED exception → OVERRIDE** on retry; **full UX proof** not executed in this read-only audit.
11. **Evaluations persisted with audit?** **Yes** (`governance_evaluations` includes snapshots + hash + actor + requestId).
12. **How many `work_tasks` columns used by FE?** **`WorkTask` interface in `workTasks.api.ts` omits several DB columns** (e.g. **`plannedStartAt` / `plannedEndAt` / `percentComplete` / `constraintType` / `wbsCode` not present** in the type grep) — UI may still receive them depending on DTO mapping, but **typed client surface lags DB**.
13. **Waterfall phase rollups?** **Yes** — `computePhaseRollup` computes **task count, duration span, completion %** from child tasks.
14. **Customize View panel?** **Exists** (`CustomizeViewPanel.tsx`) with **Fields** tab functional for default columns; **hidden pool marked “Coming soon”**; **View** tab placeholder.
15. **Bulk status governance?** **Yes** — `bulkUpdateStatus` references `evaluateTaskStatusChange` (grep-verified).

**Frontend/integration (16–22)**

16. **Dead code?** **Likely** (duplicate admin namespaces, large legacy PM components).
17. **Settings backend integration?** **Partially** — sessions endpoints; other tabs depend on components not exhaustively traced here.
18. **Placeholder routes?** **At least 7** `NotEnabledInProject` tabs under `/projects/:id/*` (see §7.1).
19. **Sidebar items rendered:** **Inbox**, optional **My Work**, **Favorites**, **Workspaces** tree, optional **Dashboards** (admin), optional **Shared** (conditional), plus **brand** link — **~4–7 primary sections** depending on role/data.
20. **API mismatches?** Not systematically diffed; **one known risk** is **MyWork axios typing**, suggesting **response unwrapping inconsistencies** in places.
21. **FE calls missing BE?** **Org permissions tab explicitly anticipates missing endpoints** (fallback path) — **should be verified per env**.
22. **BE endpoints unused?** **Highly likely true** given **130+ controllers** and partial MVP UI.

---

### Critical Findings

1. **Frontend `tsc` failures (~24 errors)** — merge/release risk; likely correlates with runtime edge cases.
2. **Backend TS strictness disabled** (`strictNullChecks: false`) — increases defect density in a security-sensitive codebase.
3. **Parallel legacy domains** (`pm/*`, multiple task entities) — migration/mental overhead + potential inconsistent behaviors.
4. **Very large files** (`WaterfallTable`, `SidebarWorkspaces`, `projects.service`, `admin.controller`) — maintainability and reviewability risk.
5. **Governance phase-gate** product action **not wired** to engine despite catalog existence.
6. **Permission matrix enforcement breadth** unproven beyond persistence and a few explicit checks (needs endpoint matrix test).

---

### Recommendations

1. **Stabilize frontend types:** Fix `MyWorkPage` axios generics/unwrapping; align onboarding **Guest→Viewer** naming with platform enums; repair dashboard union types — until green, treat **`npm run build` (tsc && vite)** as release gate.
2. **Re-tighten backend TS** incrementally: enable `strictNullChecks` in a dedicated hardening sprint with assigned owners per module.
3. **Consolidate “Task” domains:** Document canonical **`work_tasks`** vs legacy tables; deprecate/remove unused paths with data migration plan.
4. **Governance roadmap:** Implement explicit **phase transition** command that calls `evaluatePhaseGateTransition` (or equivalent) to close the TODO in `WorkPhasesService`.
5. **Controller inventory automation:** Generate OpenAPI/Swagger coverage report + “frontend route → backend handler” pairing in CI.
6. **Dead code program:** Run `knip` / `ts-prune` outputs already scripted in `package.json` (`dead-code:report`) and track reduction KPIs.

---

## Addendum: Follow-Up Findings (Phase 0B)

### Q1: Settings Page — What’s Actually Broken?

**Settings-related `.tsx` files (representative list):** `pages/settings/SettingsPage.tsx`, `pages/settings/SecuritySettingsPage.tsx`, `pages/settings/NotificationsSettingsPage.tsx`, `pages/settings/components/{AccountSettings,WorkspaceSettings,OrganizationSettings}.tsx`, `pages/settings/__tests__/SettingsPage.test.tsx`, plus workspace/project settings under `features/workspaces/settings/**` and `features/projects/settings/**` (separate from the `/settings` hub).

| Tab | Component | API calls | Backend exists? | Editable vs broken | Save wired? |
|-----|-----------|-----------|-----------------|-------------------|-------------|
| **Account** | `AccountSettings` | **None** | **No** `PATCH /auth/profile` (or `change-password`) found under `zephix-backend/src/modules/auth/` (grep: **no matches** for `profile`, `updateProfile`, `changePassword`, etc.) | Inputs are **uncontrolled** (no `value` / `onChange` binding to state or `user`); **broken / stub** | **Button calls `handleSave` → only `track('settings.account.saved')` + `// TODO: Implement save functionality`** |
| **Workspace** | `WorkspaceSettings` | None | N/A | **Read-only copy** (“available in a future release”) | No |
| **Organization** | `OrganizationSettings` | None | No invite URL API in this component | Single placeholder input; **stub** | **Save → telemetry + `// TODO: Implement save functionality`** |
| **Billing & Plans** | `BillingPage` (same as `/billing`) | (not re-traced in 0B; separate billing module) | Backend billing module exists | Admin-only visibility | Depends on `BillingPage` implementation |
| **Notifications** | `NotificationsSettingsPage` (nested route) | `GET /users/me/notification-preferences`, `PUT /users/me/notification-preferences` | **Yes** — `UsersController` `@Get/PUT('me/notification-preferences')` with `JwtAuthGuard` | Channel/category toggles **editable**; UI does not expose entire `emailDigest` object in JSX (schema exists in TS) | **Yes** — `handleSave` calls `request.put` |
| **Security** | `SecuritySettingsPage` (nested, `PaidRoute`) | `GET /auth/sessions`, `POST /auth/sessions/:id/revoke`, `POST /auth/sessions/revoke-others` | **Yes** — `SessionsController` `@Controller('auth/sessions')` + `JwtAuthGuard` | Session table **functional**; relies on `localStorage` `zephix.sessionId` for “current” badge | Revoke actions **wired** |

**Response shape note:** `UsersController` / `SessionsController` return `formatResponse(...)` → `{ data: T }`. The frontend axios instance in `lib/api.ts` **unwraps** nested `.data`, so `request.get<...>()` should receive the **inner** payload for these endpoints.

---

### Q2: User Entity — Profile Fields

**Source:** `zephix-backend/src/modules/users/entities/user.entity.ts` (`users` table).

- **Name:** **`firstName`**, **`lastName`** (nullable columns `first_name`, `last_name`). **No** `displayName` column on `User`.
- **Avatar:** **`profilePicture`** (`profile_picture` column), not `avatar` / `profileImage`.
- **Preferences (timezone, dateFormat, defaultView):** **Not on `User`**. Separate entity **`UserSettings`** (`user_settings` table) in `user-settings.entity.ts` with:
  - `preferences` (**jsonb**, default `{}`)
  - `notifications` (**jsonb**, default `{}`) — used by `NotificationPreferencesService`
  - `theme` (**string**, default `'light'`)
  - composite uniqueness on `(userId, organizationId)`
- **Other `User` fields (profile-adjacent):** `email`, `password`, `role`, `organizationId`, `isEmailVerified`, `onboardingStatus`, 2FA columns, lockout/password-reset tokens, etc.

---

### Q3: Admin Sidebar — Exact Current Code

**Constants:** `zephix-frontend/src/features/administration/constants.ts` exports `ADMINISTRATION_NAV_GROUPS` (array of `{ label, items[] }`).

| Group | Label | Item label | Icon (lucide) | Path / behavior |
|-------|--------|------------|---------------|-----------------|
| Platform Management | `Platform Management` | Overview | `LayoutGrid` | `/administration` |
| | | Governance | `ShieldCheck` | `/administration/governance` |
| | | Workspaces | `Building2` | path `/administration/workspaces` but **`opensWorkspacesModal: true`** → **button** opens modal, does not navigate |
| | | Templates | `FileStack` | `/administration/templates` |
| People & Access | `People & Access` | People | `Users` | `/administration/people` |
| | | Security | `Lock` | `/administration/security` |
| Organization | `Organization` | Organization | `Landmark` | `/administration/organization` |
| | | Teams | `UsersRound` | `/administration/teams` |
| | | Notifications | `Bell` | `/administration/notifications` |
| System | `System` | Audit Trail | `ClipboardList` | `/administration/audit-trail` |
| | | Billing | `CreditCard` | `/administration/billing` |

**Rendering:** `AdministrationLayout.tsx` **`map`s over `ADMINISTRATION_NAV_GROUPS`**, then **`map`s `group.items`**. Each item is either a **`<button>`** (workspaces modal) or **`<NavLink>`** (router). **Collapsed** mode: `aside` width **`w-16`** vs expanded **`w-64`** (`useMemo` on `collapsed`).

**Role filtering in layout:** **None** in `AdministrationLayout` / `constants.ts`. **Route-level** gating is **`RequireAdminInline`** + backend **`AdminGuard`** for `/administration` tree in `App.tsx`.

**“Back to Zephix”:** Native **`<a href="/inbox">`** (full document navigation) — targets **`/inbox`**.

**Layout structure:** Column flex: **`Header`** full width on top; below **`lg:flex`**: **`aside`** (border-r, scrollable `nav` with `maxHeight: calc(100vh - 120px)`), **`section`** main content **`flex-1 overflow-auto bg-gray-50 p-6`** with **`<Outlet />`**. Mobile: message that admin is desktop-first (`lg:hidden`).

---

### Q4: Frontend TypeScript Errors — Exact List (first batch)

**Command:** `cd zephix-frontend && npx tsc -p tsconfig.app.json --noEmit 2>&1 | head -80`  
**Exit code:** 2 (errors remain after first 80 lines).

```
src/components/shell/FavoritesSidebarSection.tsx(110,7): error TS2322: Type 'RefObject<HTMLDivElement | null>' is not assignable to type 'LegacyRef<HTMLDivElement> | undefined'.
  Type 'RefObject<HTMLDivElement | null>' is not assignable to type 'RefObject<HTMLDivElement>'.
    Type 'HTMLDivElement | null' is not assignable to type 'HTMLDivElement'.
      Type 'null' is not assignable to type 'HTMLDivElement'.
src/components/shell/FavoritesSidebarSection.tsx(196,27): error TS2345: Argument of type '(v: any) => boolean' is not assignable to parameter of type 'boolean'.
src/components/shell/FavoritesSidebarSection.tsx(196,28): error TS7006: Parameter 'v' implicitly has an 'any' type.
src/components/shell/FavoritesSidebarSection.tsx(268,27): error TS2345: Argument of type '(v: any) => boolean' is not assignable to parameter of type 'boolean'.
src/components/shell/FavoritesSidebarSection.tsx(268,28): error TS7006: Parameter 'v' implicitly has an 'any' type.
src/features/admin/utils/getOrgUsers.ts(27,55): error TS2339: Property 'platformRole' does not exist on type 'OrgUser'.
src/features/projects/components/TaskListSection.tsx(303,11): error TS2739: Type '{ id: string; organizationId: string; workspaceId: string; projectId: string; parentTaskId: null; phaseId: null; title: string; description: string | null; status: WorkTaskStatus; ... 22 more ...; deletedByUserId: null; }' is missing the following properties from type 'WorkTask': approvalStatus, documentRequired, remarks, isMilestone
src/features/projects/tabs/ProjectBoardTab.tsx(473,50): error TS2552: Cannot find name 'navigate'. Did you mean 'navigator'?
src/features/projects/tabs/ProjectBoardTab.tsx(473,72): error TS2304: Cannot find name 'projectId'.
src/features/projects/tabs/ProjectTableTab.tsx(570,46): error TS2322: Type 'string | null' is not assignable to type 'string | undefined'.
  Type 'null' is not assignable to type 'string | undefined'.
src/features/projects/waterfall/WaterfallTable.tsx(1210,14): error TS2741: Property 'children' is missing in type '{ className: string; }' but required in type '{ children: ReactNode; className?: string | undefined; }'.
src/features/projects/waterfall/WaterfallTable.tsx(1531,15): error TS2322: Type '(taskId: string, patch: Parameters<typeof updateTask>[1]) => Promise<void>' is not assignable to type '(taskId: string, patch: Partial<{ title: string; status: WorkTaskStatus; priority: WorkTaskPriority; assigneeUserId: string | null; startDate: string | null; ... 4 more ...; phaseId: string; }>) => void | Promise<...>'.
  Types of parameters 'patch' and 'patch' are incompatible.
    Type 'Partial<{ title: string; status: WorkTaskStatus; priority: WorkTaskPriority; assigneeUserId: string | null; startDate: string | null; dueDate: string | null; description: string | null; remarks: string | null; isMilestone: boolean; phaseId: string; }>' is not assignable to type 'UpdateTaskPatch'.
      Types of property 'description' are incompatible.
        Type 'string | null | undefined' is not assignable to type 'string | undefined'.
          Type 'null' is not assignable to type 'string | undefined'.
src/pages/my-work/MyWorkPage.tsx(111,44): error TS2339: Property 'items' does not exist on type 'AxiosResponse<MyWorkResponse | undefined, any, {}>'.
src/pages/my-work/MyWorkPage.tsx(111,61): error TS2339: Property 'items' does not exist on type 'AxiosResponse<MyWorkResponse | undefined, any, {}>'.
src/pages/my-work/MyWorkPage.tsx(113,34): error TS2339: Property 'version' does not exist on type 'AxiosResponse<MyWorkResponse | undefined, any, {}>'.
src/pages/my-work/MyWorkPage.tsx(113,65): error TS2339: Property 'version' does not exist on type 'AxiosResponse<MyWorkResponse | undefined, any, {}>'.
src/pages/my-work/MyWorkPage.tsx(115,20): error TS2339: Property 'counts' does not exist on type 'AxiosResponse<MyWorkResponse | undefined, any, {}>'.
src/pages/onboarding/OnboardingPage.tsx(157,9): error TS2322: Type '"Member" | "Guest"' is not assignable to type '"Admin" | "Member" | "Viewer"'.
  Type '"Guest"' is not assignable to type '"Admin" | "Member" | "Viewer"'.
src/pages/onboarding/OnboardingPage.tsx(158,9): error TS2322: Type '{ workspaceId: string; accessLevel: "Member" | "Guest"; }[]' is not assignable to type '{ workspaceId: string; accessLevel: "Member" | "Viewer"; }[]'.
  Type '{ workspaceId: string; accessLevel: "Member" | "Guest"; }' is not assignable to type '{ workspaceId: string; accessLevel: "Member" | "Viewer"; }'.
    Type '"Member" | "Guest"' is not assignable to type '"Member" | "Viewer"'.
      Type '"Guest"' is not assignable to type '"Member" | "Viewer"'.
src/views/dashboards/View.tsx(178,16): error TS2367: This comparison appears to be unintentional because the types 'WidgetType' and '"kpi"' have no overlap.
src/views/dashboards/View.tsx(183,16): error TS2367: This comparison appears to be unintentional because the types 'WidgetType' and '"kpi"' have no overlap.
src/views/dashboards/View.tsx(453,41): error TS2339: Property 'isPublished' does not exist on type 'DashboardEntity | SharedDashboardEntity'.
  Property 'isPublished' does not exist on type 'SharedDashboardEntity'.
src/views/dashboards/View.tsx(454,38): error TS2339: Property 'audience' does not exist on type 'DashboardEntity | SharedDashboardEntity'.
  Property 'audience' does not exist on type 'SharedDashboardEntity'.
src/views/dashboards/View.tsx(455,39): error TS2339: Property 'isDefault' does not exist on type 'DashboardEntity | SharedDashboardEntity'.
  Property 'isDefault' does not exist on type 'SharedDashboardEntity'.
```

**Phase A relevance:** **None of the above paths are under `pages/settings/`** — settings hub TS is not in this slice; failures cluster in **shell/favorites**, **projects (board/table/waterfall/task list)**, **my-work**, **onboarding**, **dashboards View**, and **legacy admin util** `features/admin/utils/getOrgUsers.ts`.

---

### Q5: Profile Menu — Admin Console Access

**Entry:** **`UserProfileDropdown`** (`components/shell/UserProfileDropdown.tsx`), rendered from **`Header`** (avatar button, **no** `administration` string in `Header.tsx` itself).

**Trigger:** User clicks **circular avatar** (`data-testid="user-profile-button"`) → portaled menu (`data-testid="user-profile-menu"`).

**Menu items (current code):**

- **My Profile** → `navigate("/settings")`
- **Preferences** → `navigate("/settings")` *(same destination as My Profile)*
- **Invite Members** (platform admin only) → opens **`InviteMembersDialog`**
- **Administration Console** (**`platformRole === ADMIN` only**) → `navigate("/administration")`
- **Help** → external `https://docs.zephix.io`
- **Log out**

**`/settings` vs `/administration`:** **Settings** from menu always **`/settings`** (both “My Profile” and “Preferences”). **Administration** is **admin-only** menu row to **`/administration`**.

---

### Q6: Organization Entity — `settings` JSON

**Source:** `zephix-backend/src/organizations/entities/organization.entity.ts`

- **`settings`:** `@Column({ type: 'jsonb', default: {} }) settings: object;` — **untyped `object`** at entity level (no dedicated TS interface in this file).
- **Documented examples in JSDoc:** resource management thresholds (`warningThreshold`, `criticalThreshold`, etc.) inside nested objects.
- **`permissions` / `workspacePermissionDefaults`:** Not declared as columns; they live **inside** the **`settings` JSONB** (as used by `AdminController.getOrgPermissions` / `updateOrgPermissions` / workspace-permissions endpoints — keys `permissions` and `workspacePermissionDefaults` on `org.settings`).

---

### Q7: Notification Infrastructure

**Backend**

- **Module / files:** e.g. `modules/notifications/notifications.controller.ts`, services, **`entities/notification.entity.ts`** (`notifications` table: `organization_id`, `user_id`, optional `workspace_id`, `event_type`, `title`, `body`, `data` jsonb, `priority`, `channel`, `status`, timestamps, `delivered_at`), plus **`notification-read.entity.ts`** (reads / inbox state pattern).
- **Preferences:** `NotificationPreferencesService` persists into **`user_settings.notifications`** JSON (merged with defaults). Exposed via **`UsersController`** (`/users/me/notification-preferences`).

**Frontend**

- Examples: `pages/settings/NotificationsSettingsPage.tsx`, hooks/components under `features/notifications/**`, `pages/InboxPage.tsx`, header bell (navigates to **`/inbox`**).

**Admin console → Notifications page**

- **`AdministrationNotificationsPage`:** **Placeholder only** — “Notifications — Coming Soon”, **no API calls**, no org policy editor.

---

### Q8: `computePhaseRollup` — Behavior

**File:** `zephix-frontend/src/features/projects/waterfall/phaseRollups.ts`

- **Input:** `directChildren: readonly WorkTask[]` — **only direct (level-0) children** of a phase; **does not recurse** into subtasks.
- **`percent_complete`:** **Not used.** Comments state completion % comes from **`computeCompletionPercent(statuses)`** where `statuses` is mapped from each child’s **`status`** field — i.e. **status-bucket based**, not DB percent field.
- **Duration:** From children’s **`startDate`** / **`dueDate`** strings (parsed to `Date`), earliest start → latest due via `computeDurationDays`.
- **Return type `PhaseRollup`:** `{ taskCount: number; durationDays: number; completionPercent: number }`.

---

### Q9: `features/admin` vs `features/administration`

| Directory | Role |
|-----------|------|
| **`features/administration/`** | **Current “Admin Console”** for **`/administration`** routes (layout + pages + security tabs wired to `/admin/...` APIs). |
| **`features/admin/`** | **Legacy / alternate admin toolkit** (users, teams, workspaces lists, KPI catalog, compliance pages, etc.). |

**Imports:** `grep "features/admin/"` (excluding false positives) shows **active imports**, e.g.:

- `pages/admin/AdminWorkspacesPage.tsx`, `AdminTeamsPage.tsx` → `@/features/admin/...`
- `features/workspaces/settings/tabs/MembersTab.tsx` & `GeneralTab.tsx` → `@/features/admin/users/users.api`

**Conclusion:** **`features/admin` is not dead**; it is **shared legacy/admin API & screens** still referenced by **workspace settings** and **`pages/admin/*`**. **`features/administration`** is the **new IA** for the **`/administration`** shell. Deletion would require **migration of dependents** first.

---

### Q10: `WorkspaceMember` Schema & Access

**Entity:** `zephix-backend/src/modules/workspaces/entities/workspace-member.entity.ts` (`workspace_members`).

- **`role` column:** **Yes** — `Column({ type: 'text' }) role: WorkspaceRole`.
- **Valid roles (`WorkspaceRole` type in `workspace.entity.ts`):** `workspace_owner` (legacy; normalized to **`workspace_admin`** in code), **`workspace_admin`**, **`workspace_member`**, **`workspace_viewer`**, plus **project-scoped** `delivery_owner`, `stakeholder` (documented as **not** workspace membership roles in the same sense).
- **Other columns:** `organizationId`, `workspaceId`, `userId`, audit `createdBy` / `updatedBy`, **`status`** (`active` \| `suspended`) + suspension/reinstate timestamps and actor FKs.
- **Workspace access:** **`WorkspaceAccessModule` / `WorkspaceAccessService`** (referenced across services) implements **canAccessWorkspace**-style checks — separate from the entity but **the enforcement layer** for workspace scope.

---

**End of report.**
