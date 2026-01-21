# ZEPHIX PLATFORM - DETAILED ARCHITECTURE TREE

**Generated:** 2025-01-27  
**Role:** Solution Architect Documentation  
**Purpose:** Comprehensive platform structure for architectural review

---

## EXECUTIVE SUMMARY

Zephix is a **monorepo-based Work OS platform** built with:
- **Backend:** NestJS 10.x (TypeScript) with TypeORM 0.3.20
- **Frontend:** React 18.3.1 with Vite 7.1.6
- **Database:** PostgreSQL with 86 migrations
- **Architecture:** Multi-tenant SaaS with workspace-scoped features
- **Deployment:** Railway (Nixpacks) with CI/CD via GitHub Actions

**Overall Status:** ~75% to MVP | Production-ready with minor fixes needed

---

## 1. MONOREPO STRUCTURE

```
ZephixApp/
├── zephix-backend/          # NestJS API (922 TypeScript files)
├── zephix-frontend/         # React SPA (467 TSX, 191 TS files)
├── zephix-landing/          # Marketing site (23 files)
├── packages/                # Shared packages (59 files)
├── docs/                    # Documentation (177 files)
├── scripts/                 # Deployment & utility scripts (33 files)
└── proofs/                  # Verification evidence (35 files)
```

---

## 2. BACKEND ARCHITECTURE TREE

### 2.1 Core Infrastructure Layer

```
zephix-backend/src/
├── app.module.ts                    # Root module (30+ module imports)
├── main.ts                          # Entry point (JWT validation, CORS, Swagger)
│
├── config/                          # Configuration
│   ├── configuration.ts            # Environment config loader
│   ├── database.config.ts          # TypeORM config (PostgreSQL)
│   ├── jwt.config.ts              # JWT secret & expiration
│   └── feature-flags.config.ts     # Feature flags (org-level)
│
├── database/                        # Database utilities
│   └── database.module.ts           # TypeORM connection
│
├── migrations/                      # Database migrations
│   └── [86 migration files]        # 78 TypeScript, 8 SQL
│
├── common/                          # Shared utilities
│   ├── guards/                     # Rate limiter guard
│   ├── interceptors/               # Response transformers
│   ├── http/                       # Auth context helpers
│   └── utils/                      # Slug, UUID validators
│
├── filters/                         # Exception filters
│   └── api-error.filter.ts         # Global error handler
│
├── middleware/                      # Request middleware
│   └── tenant.middleware.ts        # Tenant context (optional)
│
└── guards/                          # Auth guards
    └── tenant.guard.ts             # Organization scoping
```

### 2.2 Multi-Tenancy & Security Layer

```
├── modules/tenancy/                  # Multi-tenancy core
│   ├── tenant-aware.repository.ts  # Auto-filters by organizationId
│   ├── tenant-context.interceptor.ts # Global tenant interceptor
│   └── tenancy.module.ts           # Global module
│
├── modules/auth/                     # Authentication & Authorization
│   ├── controllers/
│   │   ├── auth.controller.ts      # Login, signup, logout, verify email
│   │   ├── org-invites.controller.ts # Organization invitations
│   │   └── sessions.controller.ts  # Refresh tokens, session management
│   ├── services/
│   │   ├── auth.service.ts         # Core auth logic
│   │   ├── registration.service.ts # User registration
│   │   ├── org-invites.service.ts  # Invitation management
│   │   └── outbox-processor.service.ts # Event outbox pattern
│   ├── entities/
│   │   ├── user.entity.ts          # User (organizationId, platformRole)
│   │   ├── organization.entity.ts # Organization (features JSONB)
│   │   ├── user-organization.entity.ts # User-Org membership
│   │   ├── email-verification.entity.ts
│   │   └── refresh-token.entity.ts
│   ├── guards/
│   │   ├── jwt-auth.guard.ts       # JWT validation
│   │   └── roles.guard.ts         # Role-based access (ADMIN/MEMBER/VIEWER)
│   └── strategies/
│       └── jwt.strategy.ts         # Passport JWT strategy
│
└── modules/workspace-access/        # Workspace access control
    ├── workspace-access.service.ts  # Permission resolution
    └── workspace-access.module.ts   # Used by many modules
```

### 2.3 Domain Modules (30+ Modules)

```
├── modules/organizations/            # Organization management
│   ├── controllers/
│   │   ├── organizations.controller.ts
│   │   ├── team-management.controller.ts
│   │   └── invitation-acceptance.controller.ts
│   └── services/
│       └── organizations.service.ts
│
├── modules/workspaces/               # Workspace management
│   ├── controllers/
│   │   ├── workspaces.controller.ts # CRUD (1024 lines - large)
│   │   ├── workspace-modules.controller.ts # Module gating
│   │   └── admin-trash.controller.ts
│   ├── services/
│   │   ├── workspaces.service.ts
│   │   ├── workspace-health.service.ts
│   │   └── workspace-module.service.ts
│   └── entities/
│       ├── workspace.entity.ts      # Workspace (slug, permissionsConfig)
│       ├── workspace-member.entity.ts
│       └── workspace-module-config.entity.ts # Module enable/disable
│
├── modules/projects/                 # Project management
│   ├── controllers/
│   │   ├── projects.controller.ts  # CRUD
│   │   └── workspace-projects.controller.ts # Workspace-scoped
│   ├── services/
│   │   └── projects.service.ts
│   └── entities/
│       ├── project.entity.ts       # Project (workspaceId, programId, portfolioId)
│       └── project-custom-field.entity.ts
│
├── modules/tasks/                   # Task management
│   ├── controllers/
│   │   └── tasks.controller.ts
│   └── entities/
│       └── task.entity.ts
│
├── modules/work-items/               # Work items (enhanced tasks)
│   ├── controllers/
│   │   ├── work-item.controller.ts # CRUD
│   │   └── my-work.controller.ts   # Personal work view
│   ├── services/
│   │   ├── work-item.service.ts
│   │   ├── my-work.service.ts
│   │   ├── work-item-comment.service.ts
│   │   └── work-item-activity.service.ts
│   └── entities/
│       ├── work-item.entity.ts
│       ├── work-item-comment.entity.ts
│       └── work-item-activity.entity.ts
│
├── modules/work-management/          # Work management (phases, plans)
│   ├── controllers/
│   │   ├── work-tasks.controller.ts
│   │   ├── work-phases.controller.ts
│   │   └── work-plan.controller.ts
│   ├── services/
│   │   ├── work-tasks.service.ts
│   │   ├── work-phases.service.ts
│   │   ├── work-plan.service.ts
│   │   ├── work-dependencies.service.ts
│   │   ├── work-comments.service.ts
│   │   ├── work-activity.service.ts
│   │   └── work-health.service.ts
│   └── entities/
│       ├── work-task.entity.ts
│       ├── work-phase.entity.ts
│       ├── work-plan.entity.ts
│       └── work-dependency.entity.ts
│
├── modules/resources/                # Resource management
│   ├── controllers/
│   │   ├── resources.controller.ts # CRUD (818 lines - large)
│   │   └── resource-allocation.controller.ts
│   ├── services/
│   │   ├── resources.service.ts
│   │   └── resource-allocation.service.ts
│   └── entities/
│       ├── resource.entity.ts
│       ├── resource-allocation.entity.ts # Percentage-based
│       ├── resource-conflict.entity.ts
│       └── resource-daily-load.entity.ts
│
├── modules/templates/                 # Template system (Lego blocks)
│   ├── controllers/
│   │   ├── templates.controller.ts
│   │   ├── template-actions.controller.ts
│   │   ├── template-blocks.controller.ts
│   │   ├── lego-blocks.controller.ts
│   │   └── templates.controller.ts (admin)
│   ├── services/
│   │   ├── templates.service.ts
│   │   ├── templates-instantiate.service.ts
│   │   ├── templates-preview.service.ts
│   │   ├── templates-recommendation.service.ts
│   │   └── templates-preview-v51.service.ts
│   └── entities/
│       ├── template.entity.ts
│       ├── template-block.entity.ts
│       ├── lego-block.entity.ts
│       └── template-action.entity.ts
│
├── modules/dashboards/                # Dashboard system
│   ├── controllers/
│   │   ├── dashboards.controller.ts
│   │   ├── dashboard-templates.controller.ts
│   │   ├── project-dashboard.controller.ts
│   │   ├── analytics-widgets.controller.ts
│   │   ├── ai-dashboard.controller.ts
│   │   └── metrics.controller.ts
│   ├── services/
│   │   ├── dashboards.service.ts
│   │   ├── project-dashboard.service.ts
│   │   └── analytics-widgets.service.ts
│   └── entities/
│       ├── dashboard.entity.ts
│       ├── dashboard-widget.entity.ts
│       └── dashboard-template.entity.ts
│
├── modules/portfolios/                # Portfolio management
│   ├── controllers/
│   │   └── portfolios.controller.ts
│   └── entities/
│       ├── portfolio.entity.ts
│       └── portfolio-project.entity.ts
│
├── modules/programs/                  # Program management
│   ├── controllers/
│   │   └── programs.controller.ts
│   ├── services/
│   │   ├── programs.service.ts
│   │   └── programs-rollup.service.ts
│   └── entities/
│       └── program.entity.ts
│
├── modules/risks/                     # Risk management
│   ├── controllers/
│   │   └── risks.controller.ts
│   └── entities/
│       └── risk.entity.ts
│
├── modules/teams/                     # Team management
│   ├── services/
│   │   └── teams.service.ts
│   └── entities/
│       ├── team.entity.ts
│       └── team-member.entity.ts
│
├── modules/analytics/                 # Analytics & metrics
│   ├── controllers/
│   │   └── analytics.controller.ts
│   ├── services/
│   │   └── analytics.service.ts
│   └── entities/
│       ├── materialized-project-metrics.entity.ts
│       ├── materialized-portfolio-metrics.entity.ts
│       └── materialized-resource-metrics.entity.ts
│
├── modules/integrations/              # External integrations
│   ├── controllers/
│   │   ├── integrations.controller.ts
│   │   ├── integrations-webhook.controller.ts
│   │   └── external-user-mappings.controller.ts
│   ├── services/
│   │   ├── integration-encryption.service.ts # AES-256-GCM
│   │   ├── jira-client.service.ts
│   │   └── [7 more integration services]
│   └── entities/
│       ├── integration-connection.entity.ts
│       ├── external-task.entity.ts
│       └── external-user-mapping.entity.ts
│
├── modules/notifications/             # Notifications
│   ├── controllers/
│   │   └── notifications.controller.ts
│   ├── services/
│   │   ├── notifications.service.ts
│   │   └── notification-dispatch.service.ts
│   └── entities/
│       ├── notification.entity.ts
│       └── notification-read.entity.ts
│
├── modules/custom-fields/             # Custom fields
│   ├── controllers/
│   │   └── custom-fields.controller.ts
│   └── entities/
│       └── custom-field.entity.ts
│
├── modules/kpi/                       # KPI management
│   ├── controllers/
│   │   └── kpi.controller.ts
│   └── services/
│       └── kpi.service.ts
│
├── modules/docs/                      # Document management
│   ├── controllers/
│   │   └── docs.controller.ts
│   └── entities/
│       └── doc.entity.ts
│
├── modules/forms/                     # Form management
│   ├── controllers/
│   │   └── forms.controller.ts
│   └── entities/
│       └── form.entity.ts
│
├── modules/home/                    # Home dashboard
│   └── services/
│       └── guest-home.service.ts
│
├── modules/ai/                        # AI services
│   └── [AI orchestration services]
│
├── modules/domain-events/             # Event-driven architecture
│   ├── domain-events.publisher.ts
│   └── subscribers/
│       ├── analytics-event.subscriber.ts
│       └── knowledge-index-event.subscriber.ts
│
├── modules/signals/                   # Signals & reporting
│   ├── controllers/
│   │   └── signals.controller.ts
│   └── services/
│       ├── signals.service.ts
│       └── signals-cron.service.ts
│
├── modules/commands/                  # Command pattern
│   ├── controllers/
│   │   └── command.controller.ts
│   └── services/
│       └── command.service.ts
│
├── modules/knowledge-index/           # Knowledge indexing
│   └── [Knowledge indexing services]
│
├── modules/cache/                     # Caching layer
│   └── cache.module.ts
│
└── modules/demo-requests/             # Demo requests
    └── demo-request.controller.ts
```

### 2.4 Supporting Modules

```
├── shared/                            # Shared services
│   ├── shared.module.ts              # Global module
│   ├── services/
│   │   ├── claude.service.ts         # AI/LLM service
│   │   ├── llm-provider.service.ts
│   │   └── email.service.ts          # Email sending
│   └── filters/
│       └── api-error.filter.ts
│
├── observability/                     # Observability
│   ├── observability.module.ts       # Global module
│   └── metrics.controller.ts         # Metrics endpoint
│
├── health/                            # Health checks
│   ├── health.module.ts
│   └── health.controller.ts
│
├── billing/                           # Billing & subscriptions
│   ├── controllers/
│   │   └── billing.controller.ts
│   ├── services/
│   │   ├── plans.service.ts
│   │   └── subscriptions.service.ts
│   └── entities/
│       ├── plan.entity.ts
│       └── subscription.entity.ts
│
├── admin/                             # Admin panel
│   ├── admin.controller.ts
│   └── modules/
│       └── organization/
│           └── organization.controller.ts
│
├── waitlist/                          # Waitlist management
│   └── waitlist.controller.ts
│
└── bootstrap/                         # Demo/bootstrap
    └── demo.module.ts
```

---

## 3. FRONTEND ARCHITECTURE TREE

### 3.1 Core Infrastructure

```
zephix-frontend/src/
├── main.tsx                           # Entry point (React 18)
├── App.tsx                            # Root router (50+ routes)
│
├── config/                            # Configuration
│   ├── env.example.ts                # Environment variables
│   ├── features.ts                   # Feature flags
│   └── security.config.ts            # Security settings
│
├── services/                          # API clients
│   ├── api.ts                        # Main API client (Axios)
│   ├── auth.interceptor.ts           # JWT token injection
│   ├── adminApi.ts                   # Admin endpoints
│   ├── billingApi.ts                 # Billing endpoints
│   ├── templates.api.ts              # Templates API
│   └── [10+ more API clients]
│
├── state/                             # State management
│   ├── AuthContext.tsx               # Auth context provider
│   └── workspace.store.ts            # Workspace state
│
├── stores/                            # Zustand stores
│   ├── authStore.ts                  # Auth state (persisted)
│   ├── organizationStore.ts          # Organization state
│   ├── projectStore.ts               # Project state
│   ├── workspaceStore.ts             # Workspace state
│   └── uiStore.ts                    # UI state (sidebar, theme, toasts)
│
├── routes/                            # Route guards
│   ├── ProtectedRoute.tsx            # Auth guard
│   ├── AdminRoute.tsx                # Admin guard
│   ├── PaidRoute.tsx                 # Paid feature guard
│   ├── FeaturesRoute.tsx             # Feature flag guard
│   └── workspaceRoutes.ts            # Workspace routing
│
└── lib/                               # Utilities
    ├── api/                          # API utilities
    ├── providers/                    # React providers
    └── ui/                            # UI utilities
```

### 3.2 Page Components (138 pages)

```
├── pages/
│   ├── auth/                          # Authentication (11 pages)
│   │   ├── LoginPage.tsx             # ✅ Working
│   │   ├── SignupPage.tsx            # ✅ Working
│   │   ├── VerifyEmailPage.tsx
│   │   ├── InvitePage.tsx
│   │   └── InviteAcceptPage.tsx
│   │
│   ├── admin/                         # Admin panel (45 pages)
│   │   ├── AdminDashboardPage.tsx
│   │   ├── AdminOrganizationPage.tsx
│   │   ├── AdminUsersPage.tsx
│   │   ├── AdminTeamsPage.tsx
│   │   ├── AdminRolesPage.tsx
│   │   ├── AdminWorkspacesPage.tsx
│   │   ├── AdminProjectsPage.tsx
│   │   ├── AdminTemplatesPage.tsx
│   │   ├── AdminBillingPage.tsx
│   │   └── [36 more admin pages]
│   │
│   ├── projects/                      # Projects (5 pages)
│   │   └── [Project detail pages]
│   │
│   ├── workspaces/                    # Workspaces (2 pages)
│   │   ├── WorkspaceHomePage.tsx     # ✅ Working
│   │   └── [Workspace pages]
│   │
│   ├── templates/                     # Templates (8 pages)
│   │   ├── TemplateCenterPage.tsx    # ✅ Working
│   │   └── [Template pages]
│   │
│   ├── dashboard/                     # Dashboards (3 pages)
│   │   └── DashboardPage.tsx         # ✅ Working
│   │
│   ├── programs/                      # Programs (2 pages)
│   │   ├── ProgramsListPage.tsx      # ✅ Feature-gated
│   │   └── ProgramDetailPage.tsx     # ✅ Feature-gated
│   │
│   ├── portfolios/                    # Portfolios (2 pages)
│   │   ├── PortfoliosListPage.tsx     # ✅ Feature-gated
│   │   └── PortfolioDetailPage.tsx    # ✅ Feature-gated
│   │
│   ├── resources/                     # Resources (2 pages)
│   │   ├── ResourcesPage.tsx
│   │   ├── ResourceHeatmapPage.tsx   # ✅ Working
│   │   └── ResourceTimelinePage.tsx  # ✅ Working
│   │
│   ├── settings/                      # Settings (7 pages)
│   │   ├── SettingsPage.tsx
│   │   ├── NotificationsSettingsPage.tsx
│   │   └── SecuritySettingsPage.tsx
│   │
│   ├── my-work/                       # My Work (1 page)
│   │   └── MyWorkPage.tsx            # ✅ Paid feature
│   │
│   ├── billing/                       # Billing (1 page)
│   │   └── BillingPage.tsx
│   │
│   ├── docs/                          # Documents (1 page)
│   │   └── DocsPage.tsx
│   │
│   ├── forms/                         # Forms (1 page)
│   │   └── FormsPage.tsx
│   │
│   ├── ai/                            # AI features (2 pages)
│   │   └── [AI pages]
│   │
│   ├── onboarding/                    # Onboarding (1 page)
│   │   └── OnboardingPage.tsx
│   │
│   └── system/                        # System pages
│       ├── NotFound.tsx
│       └── Forbidden.tsx
```

### 3.3 Component Library (196 components)

```
├── components/
│   ├── layout/                        # Layout components
│   │   ├── DashboardLayout.tsx       # Main app layout
│   │   └── [Layout components]
│   │
│   ├── shell/                         # Shell components
│   │   ├── Header.tsx                # App header
│   │   ├── Sidebar.tsx               # Navigation sidebar
│   │   ├── ProfileMenu.tsx          # User menu
│   │   └── WorkspaceSwitcher.tsx     # Workspace selector
│   │
│   ├── projects/                      # Project components
│   │   └── [Project UI components]
│   │
│   ├── workspaces/                    # Workspace components
│   │   ├── WorkspaceSelectionScreen.tsx
│   │   └── [Workspace UI components]
│   │
│   ├── templates/                     # Template components
│   │   └── [Template UI components]
│   │
│   ├── resources/                     # Resource components
│   │   └── [Resource UI components]
│   │
│   ├── dashboards/                    # Dashboard components
│   │   └── [Dashboard widgets]
│   │
│   ├── forms/                         # Form components
│   │   └── [Form UI components]
│   │
│   ├── modals/                        # Modal components
│   │   └── [Modal dialogs]
│   │
│   ├── buttons/                       # Button components
│   │   └── Button.tsx                # ✅ Accessible button
│   │
│   └── system/                        # System components
│       ├── ErrorBoundary.tsx
│       └── [Error handling]
```

### 3.4 Feature Modules (132 files)

```
├── features/
│   ├── admin/                         # Admin features (34 files)
│   │   └── [Admin feature modules]
│   │
│   ├── workspaces/                    # Workspace features (23 files)
│   │   ├── api.ts                    # Workspace API client
│   │   ├── pages/
│   │   │   └── WorkspaceMembersPage.tsx
│   │   └── views/
│   │       └── WorkspaceHome.tsx
│   │
│   ├── projects/                      # Project features (15 files)
│   │   ├── overview/
│   │   │   └── ProjectOverviewPage.tsx
│   │   └── [Project feature modules]
│   │
│   ├── templates/                     # Template features (13 files)
│   │   ├── api.ts
│   │   └── [Template feature modules]
│   │
│   ├── dashboards/                    # Dashboard features (21 files)
│   │   └── [Dashboard feature modules]
│   │
│   ├── resources/                     # Resource features (10 files)
│   │   └── [Resource feature modules]
│   │
│   ├── work-items/                    # Work item features
│   │   ├── api.ts
│   │   ├── types.ts
│   │   └── [Work item components]
│   │
│   ├── work-management/              # Work management features (5 files)
│   │   └── [Work management components]
│   │
│   ├── risks/                         # Risk features (2 files)
│   │   └── [Risk components]
│   │
│   ├── notifications/                 # Notification features (2 files)
│   │   └── [Notification components]
│   │
│   └── widgets/                       # Widget features
│       └── api.ts
```

### 3.5 Views (High-level page compositions)

```
├── views/
│   ├── HomeView.tsx                   # Home dashboard
│   ├── dashboards/
│   │   ├── Index.tsx                 # Dashboard list
│   │   ├── Builder.tsx               # Dashboard builder
│   │   └── View.tsx                  # Dashboard viewer
│   ├── templates/
│   │   └── TemplateCenter.tsx        # Template center
│   ├── workspaces/
│   │   ├── WorkspacesIndexPage.tsx
│   │   ├── WorkspaceView.tsx
│   │   ├── WorkspaceHomeBySlug.tsx
│   │   └── [Workspace views]
│   └── work-management/
│       └── ProjectPlanView.tsx       # Work plan view
```

### 3.6 Hooks (20+ custom hooks)

```
├── hooks/
│   ├── useAuth.ts                    # Auth hook
│   ├── useApi.ts                     # API hook
│   ├── useWorkspaceModule.ts         # Workspace module hook
│   ├── useWorkspacePermissions.ts    # Permission hook
│   ├── useWorkspaceRole.ts           # Role hook
│   ├── useAIRecommendations.ts      # AI recommendations
│   ├── useAnalytics.ts               # Analytics hook
│   └── [15+ more hooks]
```

---

## 4. DATABASE ARCHITECTURE

### 4.1 Entity Count
- **Total Entities:** 98 entity files
- **Migrations:** 86 migration files (78 TypeScript, 8 SQL)

### 4.2 Key Entity Categories

```
Core Entities:
├── User (organizationId, platformRole: ADMIN/MEMBER/VIEWER)
├── Organization (features JSONB, billing)
├── UserOrganization (membership)
├── Workspace (slug, permissionsConfig JSONB)
├── WorkspaceMember (role: OWNER/ADMIN/MEMBER/VIEWER)
└── WorkspaceModuleConfig (module enable/disable)

Project Management:
├── Project (workspaceId, programId, portfolioId)
├── Task
├── WorkItem (enhanced task)
├── WorkTask (work management)
├── WorkPhase
├── WorkPlan
└── WorkDependency

Resource Management:
├── Resource (organizationId)
├── ResourceAllocation (percentage-based)
├── ResourceConflict
└── ResourceDailyLoad

Template System:
├── Template (organizationId)
├── TemplateBlock
├── LegoBlock
└── TemplateAction

Portfolio & Programs:
├── Portfolio
├── PortfolioProject
└── Program

Analytics:
├── MaterializedProjectMetrics
├── MaterializedPortfolioMetrics
└── MaterializedResourceMetrics

Integrations:
├── IntegrationConnection (encrypted credentials)
├── ExternalTask
└── ExternalUserMapping
```

### 4.3 Multi-Tenancy Pattern
- **Tenant Key:** `organizationId` (UUID)
- **Scoping:** All queries filtered by `organizationId` via `TenantAwareRepository`
- **Workspace Scoping:** Additional `workspaceId` filter for workspace-scoped entities
- **Security:** Global `TenantContextInterceptor` enforces scoping

---

## 5. API ARCHITECTURE

### 5.1 API Structure
- **Base Path:** `/api`
- **Total Endpoints:** 200+ endpoints
- **Controllers:** 51 controller files
- **Auth Coverage:** 82% of controllers use `JwtAuthGuard`

### 5.2 Endpoint Categories

```
Authentication (10+ endpoints):
├── POST /api/auth/register
├── POST /api/auth/login
├── POST /api/auth/logout
├── GET  /api/auth/me
├── POST /api/auth/refresh
├── POST /api/auth/verify-email
└── POST /api/auth/org-invites

Workspaces (20+ endpoints):
├── GET    /api/workspaces
├── POST   /api/workspaces
├── GET    /api/workspaces/:id
├── PATCH  /api/workspaces/:id
├── GET    /api/workspaces/:id/role
├── GET    /api/workspaces/:id/summary
├── GET    /api/workspaces/:workspaceId/modules
└── PATCH  /api/workspaces/:workspaceId/modules/:moduleKey

Projects (15+ endpoints):
├── GET    /api/projects
├── POST   /api/projects
├── GET    /api/projects/:id
├── PATCH  /api/projects/:id
└── GET    /api/workspaces/:workspaceId/projects

Resources (20+ endpoints):
├── GET    /api/resources
├── POST   /api/resources
├── GET    /api/resources/allocations
└── POST   /api/resources/allocations

Templates (15+ endpoints):
├── GET    /api/templates
├── POST   /api/templates
├── POST   /api/templates/:id/instantiate
└── GET    /api/templates/:id/preview

Work Management (25+ endpoints):
├── GET    /api/work-tasks
├── POST   /api/work-tasks
├── GET    /api/work-phases
└── GET    /api/work-plan/:projectId

Dashboards (20+ endpoints):
├── GET    /api/dashboards
├── POST   /api/dashboards
└── GET    /api/projects/:projectId/dashboard

Programs & Portfolios:
├── GET    /api/programs
├── POST   /api/programs
├── GET    /api/portfolios
└── POST   /api/portfolios
```

---

## 6. DEPLOYMENT ARCHITECTURE

### 6.1 Infrastructure
- **Platform:** Railway
- **Builder:** Nixpacks (auto-detect)
- **Database:** PostgreSQL (Railway managed)
- **CI/CD:** GitHub Actions (3 workflow files)

### 6.2 Environment Configuration
- **Backend:** NestJS app on port 3000
- **Frontend:** Vite preview server on `$PORT`
- **Database:** Connection via `DATABASE_URL`
- **Secrets:** JWT secret, encryption keys from environment

### 6.3 Build Process
```
Backend:
├── npm ci
├── npm run build (NestJS build)
└── npm run start:prod

Frontend:
├── npm ci
├── npm run build (Vite build)
└── npm run preview (Vite preview server)
```

---

## 7. SECURITY ARCHITECTURE

### 7.1 Authentication
- **Method:** JWT tokens (15-minute expiration)
- **Refresh:** Server-tracked refresh tokens
- **Storage:** Tokens in `localStorage` (key: `zephix.at`)
- **Guards:** `JwtAuthGuard` on protected routes

### 7.2 Authorization
- **Platform Roles:** ADMIN, MEMBER, VIEWER
- **Workspace Roles:** OWNER, ADMIN, MEMBER, VIEWER
- **Guards:** `RolesGuard`, `WorkspaceMembershipGuard`
- **Feature Flags:** Organization-level feature flags

### 7.3 Multi-Tenancy
- **Scoping:** All queries filtered by `organizationId`
- **Interceptor:** `TenantContextInterceptor` (global)
- **Repository:** `TenantAwareRepository` pattern

### 7.4 Data Encryption
- **Integration Credentials:** AES-256-GCM encryption
- **Service:** `IntegrationEncryptionService`

---

## 8. TESTING ARCHITECTURE

### 8.1 Backend Tests
- **Test Files:** 52 `.spec.ts` files
- **Categories:**
  - Unit tests: 40+ files
  - Integration tests: 8+ files
  - E2E tests: 1 file

### 8.2 Frontend Tests
- **Test Files:** 42 `.test.{ts,tsx}` files
- **Framework:** Vitest 2.1.9
- **Categories:**
  - Unit tests: 35+ files
  - Component tests: 30+ files
  - Integration tests: 5+ files

---

## 9. DOCUMENTATION STRUCTURE

```
docs/ (177 files)
├── [169 markdown files]
├── [3 JSON files]
└── [3 text files]

Key Documentation:
├── PHASE1_IMPLEMENTATION_SUMMARY.md
├── PHASE2_IMPLEMENTATION_STATUS.md
├── PHASE_6_FRONTEND_IMPLEMENTATION_COMPLETE.md
└── [Implementation status docs]
```

---

## 10. KEY METRICS

| Metric | Count |
|--------|-------|
| **Backend TypeScript Files** | 922 |
| **Frontend TSX/TS Files** | 658 (467 TSX, 191 TS) |
| **Backend Modules** | 30+ |
| **Frontend Pages** | 138 |
| **Frontend Components** | 196 |
| **API Endpoints** | 200+ |
| **Database Entities** | 98 |
| **Migrations** | 86 |
| **Test Files (Backend)** | 52 |
| **Test Files (Frontend)** | 42 |
| **Routes (Frontend)** | 50+ |

---

## 11. ARCHITECTURAL PATTERNS

### 11.1 Backend Patterns
- **Modular Architecture:** NestJS modules with clear separation
- **Repository Pattern:** TypeORM repositories with tenant-aware base
- **Service Layer:** Business logic in services
- **DTO Pattern:** Data transfer objects for API contracts
- **Guard Pattern:** Route guards for auth/authorization
- **Interceptor Pattern:** Global interceptors for tenant context
- **Event-Driven:** Domain events with subscribers

### 11.2 Frontend Patterns
- **Component Composition:** React component hierarchy
- **Feature Modules:** Feature-based organization
- **State Management:** Zustand stores + React Query
- **Route Guards:** Protected routes with guards
- **API Client:** Centralized Axios client with interceptors
- **Code Splitting:** Lazy-loaded routes

---

**END OF ARCHITECTURE TREE**
