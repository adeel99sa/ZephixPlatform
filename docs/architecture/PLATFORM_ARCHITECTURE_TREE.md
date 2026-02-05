# 🌳 Zephix Platform Architecture Tree

**Complete Platform Architecture Documentation**
**Last Updated:** 2025-01-30
**Version:** 0.5.0-alpha

---

## Table of Contents

1. [System Architecture Overview](#system-architecture-overview)
2. [Frontend Architecture Tree](#frontend-architecture-tree)
3. [Backend Architecture Tree](#backend-architecture-tree)
4. [Database Entity Tree](#database-entity-tree)
5. [Module Dependency Graph](#module-dependency-graph)
6. [API Structure](#api-structure)
7. [Data Flow Diagrams](#data-flow-diagrams)
8. [Component Hierarchy](#component-hierarchy)
9. [Integration Points](#integration-points)

---

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        ZEPHIX PLATFORM                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────┐         ┌──────────────────┐          │
│  │   FRONTEND        │         │    BACKEND        │          │
│  │   (React SPA)     │◄───────►│   (NestJS API)    │          │
│  │   Port: 5173      │  HTTP   │   Port: 3000      │          │
│  └──────────────────┘         └──────────────────┘          │
│         │                              │                       │
│         │                              │                       │
│         ▼                              ▼                       │
│  ┌──────────────────┐         ┌──────────────────┐          │
│  │   Vite Dev       │         │   PostgreSQL     │          │
│  │   Server         │         │   Database       │          │
│  └──────────────────┘         └──────────────────┘          │
│                                                                 │
│  ┌──────────────────┐         ┌──────────────────┐          │
│  │   External       │         │   AI Services     │          │
│  │   Services       │         │   (Claude/LLM)   │          │
│  │   - Railway      │         │   - Pinecone     │          │
│  │   - Sentry       │         │   - Vector DB    │          │
│  └──────────────────┘         └──────────────────┘          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Technology Stack

**Frontend:**
- React 19 + TypeScript
- Vite 7.1.6
- React Router v7
- Zustand (State Management)
- Tailwind CSS v4
- Lucide Icons

**Backend:**
- NestJS (Node.js)
- TypeORM
- PostgreSQL
- JWT Authentication
- BullMQ (Job Queue)
- Claude AI Integration

**Infrastructure:**
- Railway (Deployment)
- Nixpacks (Build)
- Sentry (Error Tracking)
- Datadog (Monitoring)

---

## Frontend Architecture Tree

```
zephix-frontend/
│
├── src/
│   ├── App.tsx                    # Main router & route configuration
│   ├── main.tsx                   # Application entry point
│   │
│   ├── components/                # Reusable UI components
│   │   ├── shell/                 # Shell components (Header, Sidebar, etc.)
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── UserProfileDropdown.tsx
│   │   │   ├── WorkspaceSwitcher.tsx
│   │   │   └── CommandPalette.tsx
│   │   │
│   │   ├── layouts/               # Layout components
│   │   │   ├── DashboardLayout.tsx
│   │   │   └── AdminLayout.tsx
│   │   │
│   │   ├── ui/                    # Base UI components (45 files)
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Table.tsx
│   │   │   └── ...
│   │   │
│   │   ├── dashboard/             # Dashboard components (16 files)
│   │   ├── projects/              # Project components (5 files)
│   │   ├── resources/             # Resource components (5 files)
│   │   ├── tasks/                 # Task components (7 files)
│   │   ├── templates/             # Template components
│   │   ├── workspace/             # Workspace components (2 files)
│   │   ├── pm/                    # PM module components (22 files)
│   │   ├── ai/                    # AI components (4 files)
│   │   ├── command/               # Command palette
│   │   ├── modals/                # Modal components (5 files)
│   │   └── ...
│   │
│   ├── pages/                     # Page components
│   │   ├── admin/                 # Admin pages (41 files)
│   │   │   ├── AdminOverviewPage.tsx
│   │   │   ├── AdminUsersPage.tsx
│   │   │   ├── AdminWorkspacesPage.tsx
│   │   │   ├── AdminAuditPage.tsx
│   │   │   └── ...
│   │   │
│   │   ├── auth/                  # Authentication pages (9 files)
│   │   │   ├── LoginPage.tsx
│   │   │   ├── SignupPage.tsx
│   │   │   └── InvitePage.tsx
│   │   │
│   │   ├── dashboard/             # Dashboard pages (3 files)
│   │   ├── projects/              # Project pages (5 files)
│   │   ├── workspaces/            # Workspace pages
│   │   ├── templates/             # Template pages (3 files)
│   │   ├── settings/              # Settings pages (5 files)
│   │   ├── analytics/             # Analytics page
│   │   ├── resources/             # Resources page
│   │   └── ...
│   │
│   ├── features/                  # Feature modules
│   │   ├── admin/                 # Admin features
│   │   ├── dashboards/            # Dashboard features (10 files)
│   │   ├── projects/              # Project features (5 files)
│   │   ├── resources/             # Resource features (4 files)
│   │   ├── risks/                  # Risk features (2 files)
│   │   ├── templates/             # Template features (5 files)
│   │   ├── workspaces/            # Workspace features (9 files)
│   │   ├── work-items/            # Work item features (4 files)
│   │   └── widgets/               # Widget features
│   │
│   ├── views/                     # View components
│   │   ├── HomeView.tsx
│   │   ├── dashboards/            # Dashboard views (3 files)
│   │   ├── templates/             # Template views
│   │   └── workspaces/            # Workspace views
│   │
│   ├── services/                  # API service layer
│   │   ├── api.ts                 # Base API client
│   │   ├── adminApi.ts            # Admin API
│   │   ├── projectService.ts     # Project service
│   │   ├── resourceService.ts     # Resource service
│   │   ├── taskService.ts         # Task service
│   │   ├── templates.api.ts       # Template API
│   │   ├── workflowService.ts     # Workflow service
│   │   └── ...
│   │
│   ├── stores/                    # Zustand state stores
│   │   ├── authStore.ts           # Authentication state
│   │   ├── organizationStore.ts   # Organization state
│   │   ├── workspaceStore.ts      # Workspace state
│   │   ├── projectStore.ts       # Project state
│   │   └── uiStore.ts             # UI state
│   │
│   ├── state/                     # React Context state
│   │   ├── AuthContext.tsx        # Auth context
│   │   └── workspace.store.ts    # Workspace store
│   │
│   ├── hooks/                     # Custom React hooks
│   │   ├── useAuth.ts
│   │   ├── useApi.ts
│   │   ├── useProjectSelection.ts
│   │   ├── useAIRecommendations.ts
│   │   ├── useDocumentProcessing.ts
│   │   └── ...
│   │
│   ├── routes/                    # Route guards
│   │   ├── ProtectedRoute.tsx
│   │   └── AdminRoute.tsx
│   │
│   ├── types/                     # TypeScript type definitions
│   │   ├── roles.ts               # Role types
│   │   └── ...                    # (12 files)
│   │
│   ├── lib/                       # Utility libraries
│   │   ├── api.ts                 # API utilities
│   │   ├── analytics.ts           # Analytics
│   │   ├── telemetry.ts           # Telemetry
│   │   ├── utils.ts               # General utilities
│   │   └── ...
│   │
│   ├── config/                    # Configuration
│   │   ├── env.example.ts
│   │   ├── features.ts
│   │   ├── security.config.ts
│   │   └── sentry.ts
│   │
│   └── styles/                    # Styles
│       ├── globals.css
│       ├── design-tokens.ts
│       └── ...
│
└── package.json
```

### Frontend Route Structure

```
/ (Landing)
├── /login
├── /signup
├── /invite
│
└── / (Protected)
    ├── /onboarding
    │
    ├── / (DashboardLayout)
    │   ├── /home
    │   ├── /workspaces
    │   ├── /workspaces/:id
    │   ├── /workspaces/:id/settings
    │   ├── /templates
    │   ├── /resources
    │   ├── /analytics
    │   ├── /settings
    │   ├── /billing
    │   ├── /dashboards
    │   └── /dashboards/:id
    │
    └── /admin (AdminLayout) [Admin/Owner Only]
        ├── /admin/overview
        ├── /admin/users
        ├── /admin/workspaces
        └── /admin/audit
```

---

## Backend Architecture Tree

```
zephix-backend/
│
├── src/
│   ├── main.ts                    # Application bootstrap
│   ├── app.module.ts              # Root module
│   │
│   ├── modules/                   # Core domain modules
│   │   ├── auth/                  # Authentication module
│   │   │   ├── auth.module.ts
│   │   │   ├── controllers/
│   │   │   ├── services/
│   │   │   ├── guards/
│   │   │   ├── strategies/
│   │   │   ├── dto/
│   │   │   └── entities/
│   │   │       ├── refresh-token.entity.ts
│   │   │       └── email-verification.entity.ts
│   │   │
│   │   ├── users/                 # User management
│   │   │   ├── users.module.ts
│   │   │   ├── entities/
│   │   │   │   ├── user.entity.ts
│   │   │   │   └── user-settings.entity.ts
│   │   │   └── ...
│   │   │
│   │   ├── projects/              # Project management
│   │   │   ├── projects.module.ts
│   │   │   ├── entities/
│   │   │   │   ├── project.entity.ts
│   │   │   │   ├── task.entity.ts
│   │   │   │   └── task-dependency.entity.ts
│   │   │   ├── controllers/
│   │   │   ├── services/
│   │   │   └── dto/
│   │   │
│   │   ├── workspaces/            # Workspace management
│   │   │   ├── workspaces.module.ts
│   │   │   ├── entities/
│   │   │   │   ├── workspace.entity.ts
│   │   │   │   └── workspace-member.entity.ts
│   │   │   ├── controllers/
│   │   │   ├── services/
│   │   │   └── dto/
│   │   │
│   │   ├── resources/             # Resource allocation
│   │   │   ├── resource.module.ts
│   │   │   ├── entities/
│   │   │   │   ├── resource.entity.ts
│   │   │   │   ├── resource-allocation.entity.ts
│   │   │   │   ├── resource-conflict.entity.ts
│   │   │   │   ├── user-daily-capacity.entity.ts
│   │   │   │   └── audit-log.entity.ts
│   │   │   └── ...
│   │   │
│   │   ├── tasks/                 # Task management
│   │   │   ├── tasks.module.ts
│   │   │   ├── entities/
│   │   │   │   ├── task.entity.ts
│   │   │   │   └── task-dependency.entity.ts
│   │   │   └── ...
│   │   │
│   │   ├── templates/            # Template system
│   │   │   ├── template.module.ts
│   │   │   ├── entities/
│   │   │   │   ├── template.entity.ts
│   │   │   │   ├── project-template.entity.ts
│   │   │   │   └── lego-block.entity.ts
│   │   │   └── ...
│   │   │
│   │   ├── work-items/           # Work items
│   │   │   ├── work-item.module.ts
│   │   │   ├── entities/
│   │   │   │   └── work-item.entity.ts
│   │   │   └── ...
│   │   │
│   │   ├── portfolios/          # Portfolio management
│   │   │   ├── portfolios.module.ts
│   │   │   ├── entities/
│   │   │   │   └── portfolio.entity.ts
│   │   │   └── ...
│   │   │
│   │   ├── programs/             # Program management
│   │   │   ├── programs.module.ts
│   │   │   ├── entities/
│   │   │   │   └── program.entity.ts
│   │   │   └── ...
│   │   │
│   │   ├── risks/                # Risk management
│   │   │   ├── risks.module.ts
│   │   │   ├── entities/
│   │   │   │   └── risk.entity.ts
│   │   │   └── ...
│   │   │
│   │   ├── kpi/                  # KPI module
│   │   │   ├── kpi.module.ts
│   │   │   └── ...
│   │   │
│   │   ├── custom-fields/        # Custom fields
│   │   │   ├── custom-fields.module.ts
│   │   │   ├── entities/
│   │   │   │   └── custom-field.entity.ts
│   │   │   └── ...
│   │   │
│   │   ├── commands/            # Command pattern
│   │   ├── cache/                # Caching
│   │   └── demo-requests/        # Demo requests
│   │
│   ├── organizations/             # Organization management
│   │   ├── organizations.module.ts
│   │   ├── entities/
│   │   │   ├── organization.entity.ts
│   │   │   ├── user-organization.entity.ts
│   │   │   ├── invitation.entity.ts
│   │   │   ├── organization-settings.entity.ts
│   │   │   └── security-settings.entity.ts
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── guards/
│   │   └── dto/
│   │
│   ├── admin/                     # Admin module
│   │   ├── admin.module.ts
│   │   ├── admin.controller.ts
│   │   ├── admin.service.ts
│   │   ├── guards/
│   │   │   └── admin.guard.ts
│   │   └── dto/
│   │
│   ├── ai/                        # AI services
│   │   ├── ai.module.ts
│   │   ├── controllers/
│   │   │   ├── document-upload.controller.ts
│   │   │   ├── project-generation.controller.ts
│   │   │   ├── ai-mapping.controller.ts
│   │   │   └── ai-suggestions.controller.ts
│   │   ├── services/
│   │   │   ├── claude.service.ts
│   │   │   ├── llm-provider.service.ts
│   │   │   ├── document-parser.service.ts
│   │   │   ├── embedding.service.ts
│   │   │   └── vector-database.service.ts
│   │   └── entities/
│   │       └── ai-analysis.entity.ts
│   │
│   ├── architecture/              # Architecture derivation
│   │   ├── architecture.module.ts
│   │   ├── architecture.controller.ts
│   │   └── architecture-derivation.service.ts
│   │
│   ├── brd/                       # BRD processing
│   │   ├── brd.module.ts
│   │   ├── entities/
│   │   │   ├── brd.entity.ts
│   │   │   ├── brd-analysis.entity.ts
│   │   │   └── generated-project-plan.entity.ts
│   │   ├── controllers/
│   │   ├── services/
│   │   └── dto/
│   │
│   ├── pm/                        # PM module (legacy)
│   │   ├── risk-management/
│   │   ├── status-reporting/
│   │   └── entities/              # (20+ entities)
│   │
│   ├── workflows/                 # Workflow engine
│   │   ├── entities/
│   │   │   ├── workflow-template.entity.ts
│   │   │   ├── workflow-stage.entity.ts
│   │   │   ├── workflow-approval.entity.ts
│   │   │   └── workflow-version.entity.ts
│   │   └── ...
│   │
│   ├── billing/                    # Billing module
│   │   ├── billing.module.ts
│   │   ├── entities/
│   │   │   ├── plan.entity.ts
│   │   │   └── subscription.entity.ts
│   │   ├── controllers/
│   │   ├── services/
│   │   └── guards/
│   │
│   ├── dashboard/                 # Dashboard module
│   │   ├── dashboard.module.ts
│   │   ├── dashboard.controller.ts
│   │   └── dashboard.service.ts
│   │
│   ├── health/                    # Health checks
│   │   ├── health.module.ts
│   │   └── health.controller.ts
│   │
│   ├── observability/             # Observability
│   │   └── ...                    # (9 files)
│   │
│   ├── shared/                    # Shared services
│   │   ├── shared.module.ts
│   │   ├── services/
│   │   │   ├── claude.service.ts
│   │   │   ├── llm-provider.service.ts
│   │   │   ├── email.service.ts
│   │   │   └── ...                # (13 services)
│   │   └── ...
│   │
│   ├── waitlist/                  # Waitlist
│   │   ├── entities/
│   │   │   └── waitlist.entity.ts
│   │   └── ...
│   │
│   ├── feedback/                  # Feedback
│   │   ├── feedback.module.ts
│   │   ├── entities/
│   │   │   └── feedback.entity.ts
│   │   └── ...
│   │
│   ├── intelligence/              # Intelligence module
│   │   ├── intelligence.module.ts
│   │   └── intelligence.controller.ts
│   │
│   ├── bootstrap/                 # Demo/bootstrap
│   │   └── demo.module.ts
│   │
│   ├── config/                    # Configuration
│   │   ├── configuration.ts
│   │   ├── database.config.ts
│   │   ├── jwt.config.ts
│   │   ├── ai.config.ts
│   │   └── feature-flags.config.ts
│   │
│   ├── database/                  # Database
│   │   ├── seeds/
│   │   └── ...
│   │
│   ├── migrations/                # Database migrations
│   │   └── ...                    # (31 migration files)
│   │
│   ├── guards/                    # Global guards
│   │   └── tenant.guard.ts
│   │
│   ├── middleware/                 # Middleware
│   │   └── tenant.middleware.ts
│   │
│   ├── common/                     # Common utilities
│   │   ├── decorators/
│   │   ├── filters/
│   │   ├── guards/
│   │   └── interceptors/
│   │
│   └── scripts/                   # Utility scripts
│       └── ...                    # (14 files)
│
└── package.json
```

### Backend Module Dependencies

```
AppModule (Root)
│
├── ConfigModule (Global)
├── JwtModule (Global)
├── ThrottlerModule (Global)
├── TypeOrmModule (Conditional)
│
├── SharedModule (Global)
│   ├── ClaudeService
│   ├── LLMProviderService
│   └── EmailService
│
├── AuthModule
│   ├── JwtStrategy
│   ├── LocalStrategy
│   └── User, Organization entities
│
├── OrganizationsModule
│   ├── OrganizationService
│   ├── UserOrganizationService
│   └── Organization, UserOrganization entities
│
├── ProjectsModule
│   ├── ProjectService
│   └── Project, Task entities
│
├── WorkspacesModule
│   ├── WorkspaceService
│   └── Workspace, WorkspaceMember entities
│
├── ResourcesModule
│   ├── ResourceService
│   └── Resource, ResourceAllocation entities
│
├── TemplatesModule
│   ├── TemplateService
│   └── Template, ProjectTemplate entities
│
├── TasksModule
│   └── TaskService
│
├── PortfoliosModule
│   └── PortfolioService
│
├── ProgramsModule
│   └── ProgramService
│
├── RisksModule
│   └── RiskService
│
├── KPIModule
│   └── KPIService
│
├── CustomFieldsModule
│   └── CustomFieldService
│
├── AdminModule
│   ├── AdminService
│   └── AdminGuard
│
├── AIModule
│   ├── DocumentParserService
│   ├── EmbeddingService
│   └── VectorDatabaseService
│
├── ArchitectureModule
│   └── ArchitectureDerivationService
│
├── BRDModule
│   └── BRDService
│
├── DashboardModule
│   └── DashboardService
│
├── BillingModule
│   └── BillingService
│
├── HealthModule
│   └── HealthController
│
├── ObservabilityModule
│   └── Observability services
│
└── DemoModule
    └── DemoBootstrapService
```

---

## Database Entity Tree

```
DATABASE: zephix_production
│
├── Core Identity & Access
│   ├── users
│   │   ├── id (uuid, PK)
│   │   ├── email (unique)
│   │   ├── password (hashed)
│   │   ├── first_name, last_name
│   │   ├── organization_id (FK)
│   │   ├── role
│   │   ├── is_active
│   │   ├── is_email_verified
│   │   └── last_login_at
│   │
│   ├── organizations
│   │   ├── id (uuid, PK)
│   │   ├── name
│   │   ├── slug (unique)
│   │   ├── status
│   │   └── settings (jsonb)
│   │
│   ├── user_organizations
│   │   ├── id (uuid, PK)
│   │   ├── user_id (FK → users)
│   │   ├── organization_id (FK → organizations)
│   │   ├── role (enum: owner, admin, pm, viewer)
│   │   ├── is_active
│   │   └── permissions (jsonb)
│   │
│   └── invitations
│       ├── id (uuid, PK)
│       ├── email
│       ├── organization_id (FK)
│       └── token
│
├── Workspaces
│   ├── workspaces
│   │   ├── id (uuid, PK)
│   │   ├── name
│   │   ├── organization_id (FK)
│   │   ├── owner_id (FK → users)
│   │   ├── visibility (public/private)
│   │   ├── status (active/archived)
│   │   ├── permissions_config (jsonb) - Phase 3: Permission matrix
│   │   ├── default_methodology (varchar) - Phase 3: Default methodology
│   │   └── settings (jsonb)
│   │
│   └── workspace_members
│       ├── id (uuid, PK)
│       ├── workspace_id (FK)
│       ├── user_id (FK)
│       └── role (owner/admin/member/viewer) - Phase 3: Extended to include 'admin'
│
│   **Note**: Workspace deletion is soft-delete only (sets deleted_at).
│   Full cascading delete behavior is deferred to future phase.
│   See docs/WORKSPACE_DELETE_BEHAVIOR.md for details.
│
├── Projects
│   ├── projects
│   │   ├── id (uuid, PK)
│   │   ├── name
│   │   ├── workspace_id (FK → workspaces)
│   │   ├── organization_id (FK)
│   │   ├── owner_id (FK → users)
│   │   ├── status
│   │   ├── methodology (waterfall/agile/scrum/kanban/hybrid)
│   │   ├── start_date, end_date
│   │   └── metadata (jsonb)
│   │
│   ├── tasks
│   │   ├── id (uuid, PK)
│   │   ├── project_id (FK → projects)
│   │   ├── name, description
│   │   ├── assignee_id (FK → users)
│   │   ├── status
│   │   ├── priority
│   │   ├── due_date
│   │   └── metadata (jsonb)
│   │
│   └── task_dependencies
│       ├── id (uuid, PK)
│       ├── task_id (FK → tasks)
│       ├── depends_on_task_id (FK → tasks)
│       └── type (blocks/blocks_by)
│
├── Resources
│   ├── resources
│   │   ├── id (uuid, PK)
│   │   ├── user_id (FK → users)
│   │   ├── organization_id (FK)
│   │   ├── department
│   │   ├── role
│   │   ├── skills (jsonb)
│   │   └── capacity (jsonb)
│   │
│   ├── resource_allocations
│   │   ├── id (uuid, PK)
│   │   ├── resource_id (FK → resources)
│   │   ├── project_id (FK → projects)
│   │   ├── allocation_percentage
│   │   ├── start_date, end_date
│   │   └── auto_adjust
│   │
│   ├── resource_conflicts
│   │   ├── id (uuid, PK)
│   │   ├── resource_id (FK)
│   │   ├── conflict_type
│   │   └── details (jsonb)
│   │
│   └── user_daily_capacity
│       ├── id (uuid, PK)
│       ├── user_id (FK)
│       ├── date
│       └── capacity_hours
│
├── Templates
│   ├── templates
│   │   ├── id (uuid, PK)
│   │   ├── name
│   │   ├── type (project/board/document/form)
│   │   ├── organization_id (FK)
│   │   └── definition (jsonb)
│   │
│   ├── project_templates
│   │   ├── id (uuid, PK)
│   │   ├── template_id (FK)
│   │   ├── methodology
│   │   └── phases (jsonb)
│   │
│   └── lego_blocks
│       ├── id (uuid, PK)
│       ├── template_id (FK)
│       └── block_data (jsonb)
│
├── Portfolios & Programs
│   ├── portfolios
│   │   ├── id (uuid, PK)
│   │   ├── name
│   │   ├── organization_id (FK)
│   │   └── strategic_goals (jsonb)
│   │
│   └── programs
│       ├── id (uuid, PK)
│       ├── name
│       ├── portfolio_id (FK → portfolios)
│       └── status
│
├── Risks
│   ├── risks
│   │   ├── id (uuid, PK)
│   │   ├── project_id (FK → projects)
│   │   ├── title, description
│   │   ├── severity (high/medium/low)
│   │   ├── probability
│   │   ├── status
│   │   └── mitigation_plan (jsonb)
│   │
│   └── risk_assessments
│       ├── id (uuid, PK)
│       ├── risk_id (FK)
│       └── assessment_data (jsonb)
│
├── Work Items
│   └── work_items
│       ├── id (uuid, PK)
│       ├── project_id (FK)
│       ├── type (task/bug/feature/epic)
│       ├── status
│       └── metadata (jsonb)
│
├── Custom Fields
│   └── custom_fields
│       ├── id (uuid, PK)
│       ├── organization_id (FK)
│       ├── entity_type (project/task/resource)
│       ├── field_name
│       └── field_config (jsonb)
│
├── KPIs
│   └── kpi_metrics
│       ├── id (uuid, PK)
│       ├── project_id (FK)
│       ├── metric_type
│       └── value (jsonb)
│
├── AI & BRD
│   ├── ai_analyses
│   │   ├── id (uuid, PK)
│   │   ├── project_id (FK)
│   │   └── analysis_data (jsonb)
│   │
│   ├── brds
│   │   ├── id (uuid, PK)
│   │   ├── organization_id (FK)
│   │   └── brd_data (jsonb)
│   │
│   └── brd_analyses
│       ├── id (uuid, PK)
│       ├── brd_id (FK)
│       └── extracted_elements (jsonb)
│
├── Workflows
│   ├── workflow_templates
│   │   ├── id (uuid, PK)
│   │   └── workflow_definition (jsonb)
│   │
│   ├── workflow_stages
│   │   ├── id (uuid, PK)
│   │   ├── template_id (FK)
│   │   └── stage_config (jsonb)
│   │
│   └── workflow_approvals
│       ├── id (uuid, PK)
│       └── approval_data (jsonb)
│
├── Billing
│   ├── plans
│   │   ├── id (uuid, PK)
│   │   └── plan_details (jsonb)
│   │
│   └── subscriptions
│       ├── id (uuid, PK)
│       ├── organization_id (FK)
│       ├── plan_id (FK)
│       └── status
│
├── Audit & Logging
│   └── audit_logs
│       ├── id (uuid, PK)
│       ├── organization_id (FK)
│       ├── user_id (FK)
│       ├── action
│       └── details (jsonb)
│
└── System
    ├── email_verifications
    ├── refresh_tokens
    └── waitlist
```

### Entity Relationships

```
Organization (1) ──< (N) UserOrganization (N) >── (1) User
Organization (1) ──< (N) Workspace
Organization (1) ──< (N) Project
Organization (1) ──< (N) Resource

Workspace (1) ──< (N) Project
Workspace (1) ──< (N) WorkspaceMember (N) >── (1) User

Project (1) ──< (N) Task
Project (1) ──< (N) ResourceAllocation
Project (1) ──< (N) Risk
Project (1) ──< (N) WorkItem

User (1) ──< (N) Resource
User (1) ──< (N) ResourceAllocation
User (1) ──< (N) Task (assignee)

Portfolio (1) ──< (N) Program
Program (1) ──< (N) Project

Template (1) ──< (N) ProjectTemplate
Template (1) ──< (N) LegoBlock
```

---

## Module Dependency Graph

```
┌─────────────────────────────────────────────────────────────┐
│                    DEPENDENCY FLOW                            │
└─────────────────────────────────────────────────────────────┘

Level 0 (Foundation):
├── ConfigModule (Global)
├── JwtModule (Global)
├── TypeOrmModule (Global)
└── SharedModule (Global)
    ├── ClaudeService
    ├── LLMProviderService
    └── EmailService

Level 1 (Core Identity):
├── AuthModule
│   └── Depends on: SharedModule, TypeOrmModule
│
└── OrganizationsModule
    └── Depends on: AuthModule, TypeOrmModule

Level 2 (Domain Modules):
├── UsersModule
│   └── Depends on: OrganizationsModule
│
├── WorkspacesModule
│   └── Depends on: OrganizationsModule, UsersModule
│
├── ProjectsModule
│   └── Depends on: WorkspacesModule, UsersModule
│
├── ResourcesModule
│   └── Depends on: OrganizationsModule, UsersModule, ProjectsModule
│
├── TasksModule
│   └── Depends on: ProjectsModule, UsersModule
│
└── TemplatesModule
    └── Depends on: OrganizationsModule

Level 3 (Feature Modules):
├── PortfoliosModule
│   └── Depends on: OrganizationsModule
│
├── ProgramsModule
│   └── Depends on: PortfoliosModule
│
├── RisksModule
│   └── Depends on: ProjectsModule
│
├── KPIModule
│   └── Depends on: ProjectsModule
│
├── CustomFieldsModule
│   └── Depends on: OrganizationsModule
│
└── WorkItemsModule
    └── Depends on: ProjectsModule

Level 4 (Admin & AI):
├── AdminModule
│   └── Depends on: OrganizationsModule, WorkspacesModule, UsersModule
│
├── AIModule
│   └── Depends on: SharedModule, ProjectsModule
│
├── ArchitectureModule
│   └── Depends on: AIModule, ObservabilityModule
│
└── BRDModule
    └── Depends on: AIModule, OrganizationsModule

Level 5 (Supporting):
├── DashboardModule
│   └── Depends on: ProjectsModule, KPIModule
│
├── BillingModule
│   └── Depends on: OrganizationsModule
│
├── HealthModule
│   └── No dependencies
│
├── ObservabilityModule
│   └── No dependencies
│
└── DemoModule
    └── Depends on: Multiple modules
```

---

## API Structure

### API Endpoint Tree

```
/api
│
├── /auth
│   ├── POST   /login
│   ├── POST   /signup
│   ├── POST   /refresh
│   ├── POST   /logout
│   └── POST   /verify-email
│
├── /organizations
│   ├── GET    /                          # List organizations
│   ├── POST   /                          # Create organization
│   ├── GET    /:id                       # Get organization
│   ├── PATCH  /:id                       # Update organization
│   ├── DELETE /:id                       # Delete organization
│   ├── GET    /:id/members               # List members
│   ├── POST   /:id/invite                # Invite member
│   └── GET    /:id/settings              # Get settings
│
├── /workspaces
│   ├── GET    /                          # List workspaces
│   ├── POST   /                          # Create workspace (Admin only)
│   ├── GET    /:id                       # Get workspace
│   ├── PATCH  /:id                       # Update workspace
│   ├── DELETE /:id                       # Delete workspace
│   ├── GET    /:id/members               # List members
│   ├── POST   /:id/members               # Add member
│   └── DELETE /:id/members/:userId       # Remove member
│
├── /projects
│   ├── GET    /                          # List projects
│   ├── POST   /                          # Create project (from template)
│   ├── GET    /:id                       # Get project
│   ├── PATCH  /:id                       # Update project
│   ├── DELETE /:id                       # Delete project
│   ├── GET    /:id/tasks                 # List tasks
│   ├── GET    /:id/timeline              # Get timeline
│   └── GET    /:id/resource-load        # Get resource load
│
├── /tasks
│   ├── GET    /                          # List tasks
│   ├── POST   /                          # Create task
│   ├── GET    /:id                       # Get task
│   ├── PATCH  /:id                       # Update task
│   ├── DELETE /:id                       # Delete task
│   └── POST   /:id/dependencies          # Add dependency
│
├── /resources
│   ├── GET    /                          # List resources
│   ├── POST   /                          # Create resource
│   ├── GET    /:id                       # Get resource
│   ├── GET    /:id/allocations           # Get allocations
│   ├── POST   /:id/allocations           # Create allocation
│   └── GET    /conflicts                 # Get conflicts
│
├── /templates
│   ├── GET    /                          # List templates
│   ├── POST   /                          # Create template
│   ├── GET    /:id                       # Get template
│   └── POST   /:id/instantiate           # Create from template
│
├── /portfolios
│   ├── GET    /
│   ├── POST   /
│   ├── GET    /:id
│   └── GET    /:id/programs
│
├── /programs
│   ├── GET    /
│   ├── POST   /
│   ├── GET    /:id
│   └── GET    /:id/projects
│
├── /risks
│   ├── GET    /
│   ├── POST   /
│   ├── GET    /:id
│   └── PATCH  /:id
│
├── /kpi
│   ├── GET    /projects/:id/metrics
│   └── GET    /organizations/:id/summary
│
├── /admin
│   ├── GET    /org/summary               # Org summary
│   ├── GET    /users/summary             # Users summary
│   ├── GET    /workspaces/summary        # Workspaces summary
│   ├── GET    /risk/summary              # Risk summary
│   ├── GET    /users                     # List users (paginated)
│   ├── PATCH  /users/:id/role           # Update user role
│   ├── DELETE /users/:id                 # Remove user
│   ├── GET    /workspaces                # List workspaces
│   └── PATCH  /workspaces/:id            # Update workspace
│
├── /ai
│   ├── POST   /documents/upload          # Upload document
│   ├── POST   /projects/generate          # Generate project
│   ├── POST   /mapping                   # AI mapping
│   └── GET    /suggestions               # Get suggestions
│
├── /architecture
│   ├── POST   /derive                    # Derive architecture
│   ├── GET    /:id/bundle                # Get bundle
│   └── POST   /:id/review                # Review architecture
│
├── /brd
│   ├── POST   /                          # Create BRD
│   ├── GET    /:id                       # Get BRD
│   └── POST   /:id/analyze               # Analyze BRD
│
├── /dashboard
│   ├── GET    /                          # List dashboards
│   ├── POST   /                          # Create dashboard
│   └── GET    /:id                       # Get dashboard
│
├── /billing
│   ├── GET    /plans                     # List plans
│   ├── GET    /subscription              # Get subscription
│   └── POST   /subscribe                 # Subscribe
│
└── /health
    └── GET    /                          # Health check
```

### API Authentication Flow

```
1. Client → POST /api/auth/login
   ├── Request: { email, password }
   └── Response: { accessToken, refreshToken, user }

2. Client → All subsequent requests
   ├── Header: Authorization: Bearer <accessToken>
   └── Backend validates JWT via JwtAuthGuard

3. Token Refresh:
   ├── Client → POST /api/auth/refresh
   ├── Request: { refreshToken }
   └── Response: { accessToken, refreshToken }
```

### API Authorization Levels

```
Public (No Auth):
├── POST /api/auth/login
├── POST /api/auth/signup
└── GET  /api/health

Authenticated (JWT Required):
├── All /api/organizations/*
├── All /api/workspaces/*
├── All /api/projects/*
└── ...

Admin Only (JWT + AdminGuard):
├── All /api/admin/*
├── POST /api/workspaces (create)
└── PATCH /api/admin/users/:id/role

Organization Scoped:
└── All queries filtered by organizationId from JWT
```

---

## Data Flow Diagrams

### User Authentication Flow

```
┌─────────┐
│ Browser │
└────┬────┘
     │
     │ 1. POST /api/auth/login
     ▼
┌─────────────┐
│ AuthModule  │
│ Controller  │
└────┬────────┘
     │
     │ 2. Validate credentials
     ▼
┌─────────────┐
│ AuthService │
└────┬────────┘
     │
     │ 3. Query User + UserOrganization
     ▼
┌─────────────┐
│ PostgreSQL  │
└────┬────────┘
     │
     │ 4. Return user data
     ▼
┌─────────────┐
│ AuthService │
│ (Generate   │
│  JWT)       │
└────┬────────┘
     │
     │ 5. Return { accessToken, refreshToken, user }
     ▼
┌─────────┐
│ Browser │
│ (Store  │
│  tokens)│
└─────────┘
```

### Project Creation Flow (Template Center)

```
┌─────────┐
│ Browser │
└────┬────┘
     │
     │ 1. User selects template
     │    POST /api/templates/:id/instantiate
     ▼
┌─────────────┐
│ Template    │
│ Controller  │
└────┬────────┘
     │
     │ 2. Validate workspace access
     ▼
┌─────────────┐
│ Template    │
│ Service     │
└────┬────────┘
     │
     │ 3. Load template definition
     ▼
┌─────────────┐
│ PostgreSQL  │
│ (templates) │
└────┬────────┘
     │
     │ 4. Create project from template
     ▼
┌─────────────┐
│ Project     │
│ Service     │
└────┬────────┘
     │
     │ 5. Create project + tasks
     ▼
┌─────────────┐
│ PostgreSQL  │
│ (projects,  │
│  tasks)     │
└────┬────────┘
     │
     │ 6. Return created project
     ▼
┌─────────┐
│ Browser │
│ (Navigate │
│  to project)│
└─────────┘
```

### Resource Allocation Flow

```
┌─────────┐
│ Browser │
└────┬────┘
     │
     │ 1. Create allocation
     │    POST /api/resources/:id/allocations
     ▼
┌─────────────┐
│ Resource    │
│ Controller  │
└────┬────────┘
     │
     │ 2. Validate allocation %
     ▼
┌─────────────┐
│ Resource    │
│ Service     │
└────┬────────┘
     │
     │ 3. Check conflicts
     ▼
┌─────────────┐
│ Conflict    │
│ Detection   │
└────┬────────┘
     │
     │ 4. Create allocation
     ▼
┌─────────────┐
│ PostgreSQL  │
│ (resource_ │
│  allocations)│
└────┬────────┘
     │
     │ 5. Update conflicts if needed
     ▼
┌─────────────┐
│ Resource    │
│ Service     │
└────┬────────┘
     │
     │ 6. Return allocation + conflicts
     ▼
┌─────────┐
│ Browser │
└─────────┘
```

---

## Component Hierarchy

### Frontend Component Tree

```
App
│
├── AuthProvider
│   └── Router
│       │
│       ├── Public Routes
│       │   ├── LandingPage
│       │   ├── LoginPage
│       │   └── SignupPage
│       │
│       └── ProtectedRoute
│           │
│           ├── OnboardingPage
│           │
│           ├── DashboardLayout
│           │   ├── Header
│           │   │   ├── Logo
│           │   │   ├── WorkspaceSwitcher
│           │   │   ├── CommandPalette (Cmd+K)
│           │   │   ├── AIToggle
│           │   │   └── UserProfileDropdown
│           │   │       └── Administration (Admin only)
│           │   │
│           │   ├── Sidebar
│           │   │   ├── Home
│           │   │   ├── Workspaces (with kebab)
│           │   │   │   └── Active Workspace Nav
│           │   │   │       ├── Overview
│           │   │   │       ├── Projects
│           │   │   │       ├── Boards
│           │   │   │       ├── Documents
│           │   │   │       ├── Forms
│           │   │   │       └── Members
│           │   │   ├── Template Center
│           │   │   ├── Resources
│           │   │   ├── Analytics
│           │   │   └── Settings
│           │   │
│           │   └── Main Content
│           │       ├── HomeView
│           │       ├── WorkspacesPage
│           │       ├── WorkspaceView
│           │       │   └── WorkspaceHome
│           │       ├── TemplateCenter
│           │       ├── ResourcesPage
│           │       ├── AnalyticsPage
│           │       └── SettingsPage
│           │
│           └── AdminRoute
│               └── AdminLayout
│                   ├── Admin Left Nav
│                   │   ├── Overview
│                   │   ├── Users
│                   │   ├── Workspaces
│                   │   └── Audit Log
│                   │
│                   ├── Header (reused)
│                   │
│                   └── Main Content
│                       ├── AdminOverviewPage
│                       ├── AdminUsersPage
│                       ├── AdminWorkspacesPage
│                       └── AdminAuditPage
│
└── ErrorBoundary
```

### Component Communication Flow

```
User Action
    │
    ▼
UI Component
    │
    ├──→ Zustand Store (State Update)
    │
    ├──→ React Query (Cache Update)
    │
    └──→ API Service
            │
            ▼
        HTTP Request
            │
            ▼
        Backend Controller
            │
            ▼
        Service Layer
            │
            ▼
        Repository/TypeORM
            │
            ▼
        PostgreSQL
            │
            ▼
        Response
            │
            ▼
        Frontend State Update
            │
            ▼
        UI Re-render
```

---

## Integration Points

### External Services

```
┌─────────────────────────────────────────────────┐
│              ZEPHIX PLATFORM                     │
└─────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Railway    │    │    Sentry     │    │   Claude AI   │
│  (Deployment)│    │ (Error Track) │    │   (LLM API)   │
└──────────────┘    └──────────────┘    └──────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Nixpacks   │    │   Datadog    │    │   Pinecone    │
│   (Builder)  │    │ (Monitoring) │    │ (Vector DB)   │
└──────────────┘    └──────────────┘    └──────────────┘
```

### AI Integration Points

```
Frontend
    │
    │ User uploads document
    ▼
POST /api/ai/documents/upload
    │
    ▼
Backend AI Module
    │
    ├──→ DocumentParserService
    │       └──→ Parse .docx/.pdf
    │
    ├──→ EmbeddingService
    │       └──→ Generate embeddings
    │
    └──→ VectorDatabaseService
            └──→ Store in Pinecone
                │
                ▼
            ClaudeService
                └──→ LLM Analysis
                    │
                    ▼
                Return structured data
                    │
                    ▼
            Frontend displays results
```

### Observability Integration

```
Application Events
    │
    ├──→ Sentry (Errors)
    │       └──→ Error tracking & alerts
    │
    ├──→ Datadog (Metrics)
    │       └──→ Performance monitoring
    │
    └──→ Structured Logs
            └──→ Centralized logging
```

---

## Security Architecture

### Authentication & Authorization Layers

```
Request
    │
    ├──→ JwtAuthGuard (Verify JWT)
    │       │
    │       ├──→ Valid? → Continue
    │       └──→ Invalid? → 401 Unauthorized
    │
    ├──→ AdminGuard (Admin routes only)
    │       │
    │       ├──→ Admin/Owner? → Continue
    │       └──→ Other? → 403 Forbidden
    │
    ├──→ TenantGuard (Multi-tenant isolation)
    │       │
    │       └──→ Filter by organizationId
    │
    └──→ Route Handler
            │
            └──→ Service Layer
                    │
                    └──→ Database (org-scoped query)
```

### Data Isolation

```
Organization A
    ├── Workspaces (A only)
    ├── Projects (A only)
    ├── Resources (A only)
    └── Users (A only)

Organization B
    ├── Workspaces (B only)
    ├── Projects (B only)
    ├── Resources (B only)
    └── Users (B only)

No cross-organization data access
```

---

## Deployment Architecture

### Railway Deployment

```
┌─────────────────────────────────────┐
│         RAILWAY PLATFORM             │
├─────────────────────────────────────┤
│                                     │
│  ┌──────────────────┐              │
│  │  Frontend Service │              │
│  │  (Nixpacks)       │              │
│  │  Port: $PORT      │              │
│  └──────────────────┘              │
│         │                            │
│         ▼                            │
│  ┌──────────────────┐              │
│  │  Backend Service  │              │
│  │  (Nixpacks)       │              │
│  │  Port: 3000       │              │
│  └──────────────────┘              │
│         │                            │
│         ▼                            │
│  ┌──────────────────┐              │
│  │  PostgreSQL      │              │
│  │  (Managed DB)    │              │
│  └──────────────────┘              │
│                                     │
└─────────────────────────────────────┘
```

### Build Process

```
Frontend:
├── npm ci
├── npm run build
└── vite preview --host 0.0.0.0 --port $PORT

Backend:
├── npm ci
├── npm run build
└── node dist/main.js
```

---

## Summary

This architecture tree represents the complete Zephix platform structure:

- **Frontend**: React SPA with feature-based organization
- **Backend**: NestJS modular architecture with domain-driven design
- **Database**: PostgreSQL with TypeORM, multi-tenant isolation
- **AI Integration**: Claude AI + Pinecone vector database
- **Deployment**: Railway with Nixpacks
- **Observability**: Sentry + Datadog

**Key Principles:**
1. Workspace-first architecture
2. Multi-tenant isolation at every layer
3. Role-based access control (RBAC)
4. Template-driven project creation
5. Resource allocation with conflict detection
6. AI-powered document processing and project generation

---

**Document Version:** 1.0
**Last Updated:** 2025-01-30
**Maintained By:** Zephix Engineering Team

