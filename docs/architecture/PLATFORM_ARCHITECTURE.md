# Platform Architecture

> This is a canonical document. For the latest guidance, refer to this file.

**Status Legend**: ✅ Implemented | 🚧 Partial | 📋 Planned

---

## Source of Truth

| Component | Location |
|-----------|----------|
| Backend modules | `zephix-backend/src/modules/` |
| Frontend features | `zephix-frontend/src/features/` |
| API DTOs | `zephix-backend/src/modules/*/dto/` |
| Entities | `zephix-backend/src/modules/*/entities/` |
| Database migrations | `zephix-backend/src/migrations/` |

---

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        ZEPHIX PLATFORM                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────┐         ┌──────────────────┐            │
│  │   FRONTEND        │         │    BACKEND        │            │
│  │   (React SPA)     │◄───────►│   (NestJS API)    │            │
│  │   Port: 5173      │  HTTP   │   Port: 3000      │            │
│  └──────────────────┘         └──────────────────┘            │
│         │                              │                       │
│         │                              ▼                       │
│         │                      ┌──────────────────┐            │
│         │                      │   PostgreSQL     │            │
│         │                      │   Database       │            │
│         │                      └──────────────────┘            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Technology Stack

### Frontend ✅
- React 19 + TypeScript
- Vite 7.x
- React Router v7
- Zustand (State Management)
- Tailwind CSS v4
- Lucide Icons

### Backend ✅
- NestJS (Node.js)
- TypeORM
- PostgreSQL
- JWT Authentication

### Backend 🚧 Partial
- BullMQ (Job Queue) - basic setup
- Claude AI Integration - basic setup

### Infrastructure ✅
- Railway (Deployment)
- Nixpacks (Build)

### Infrastructure 📋 Planned
- Sentry (Error Tracking) - configured but needs validation
- Datadog (Monitoring) - not yet connected

---

## Core Domains

### Identity and Access ✅
- **Organizations**: Multi-tenant isolation boundary
- **Workspaces**: Organizational units within orgs
- **Users**: Platform users with org membership
- **Roles**: OWNER, ADMIN, MEMBER, VIEWER (platformRole is source of truth)
- **Workspace Members**: User-workspace associations with roles

### Projects ✅
- Lifecycle states, ownership, workspace linkage
- Methodology support: waterfall, agile, scrum, kanban, hybrid

### Work Management ✅
- **work-management module**: Work tasks, work phases (primary task system)
- Status, assignee, due dates, dependencies
- Note: Legacy `tasks` module exists but `work-management` is preferred

### Templates 🚧
- Project templates - implemented
- Template versioning - partial
- Lego blocks - partial

### KPIs 🚧
- Basic project metrics - implemented
- Dashboard widgets - partial
- Resource utilization - planned

### Resources 🚧
- Resource entities - implemented
- Allocation tracking - implemented
- Conflict detection - partial
- Heatmap - partial

---

## Module Dependency Graph

```
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
└── OrganizationsModule
    └── Depends on: AuthModule, TypeOrmModule

Level 2 (Domain Modules):
├── UsersModule → OrganizationsModule
├── WorkspacesModule → OrganizationsModule, UsersModule
├── ProjectsModule → WorkspacesModule, UsersModule
├── ResourcesModule → OrganizationsModule, UsersModule, ProjectsModule
├── TasksModule → ProjectsModule, UsersModule
└── TemplatesModule → OrganizationsModule

Level 3 (Feature Modules):
├── PortfoliosModule, ProgramsModule, RisksModule
├── KPIModule, CustomFieldsModule, WorkItemsModule

Level 4 (Admin & AI):
├── AdminModule, AIModule, ArchitectureModule, BRDModule

Level 5 (Supporting):
├── DashboardModule, BillingModule, HealthModule
└── ObservabilityModule, DemoModule
```

---

## Frontend Architecture

### Folder Structure
```
src/
  app/                # App shell (routes, layouts, providers)
  features/<domain>/  # vertical slices (ui, api/, hooks/, pages/)
    api/              # apiClient calls per feature (no fetch)
    pages/            # route components (lazy)
    hooks/            # react-query hooks, domain hooks
  lib/                # cross-cutting (api client, errors, auth, flags, utils)
  stores/             # zustand stores (hydration-safe)
  components/         # shared ui only (no data fetching)
  test/               # guardrails, utils, e2e helpers
```

### Route Structure
```
/ (Landing)
├── /login
├── /signup
├── /invite
│
└── / (Protected)
    ├── /onboarding
    ├── / (DashboardLayout)
    │   ├── /home, /workspaces, /templates, /resources
    │   ├── /analytics, /settings, /billing, /dashboards
    │
    └── /admin (AdminLayout) [Admin/Owner Only]
        ├── /admin/overview, /admin/users
        ├── /admin/workspaces, /admin/audit
```

---

## Backend Architecture

### Core Modules
```
zephix-backend/src/
├── modules/
│   ├── auth/          # Authentication & authorization
│   ├── users/         # User management
│   ├── projects/      # Project management
│   ├── workspaces/    # Workspace management
│   ├── resources/     # Resource allocation
│   ├── tasks/         # Task management
│   ├── templates/     # Template system
│   ├── work-items/    # Work items
│   ├── portfolios/    # Portfolio management
│   ├── programs/      # Program management
│   ├── risks/         # Risk management
│   ├── kpi/           # KPI metrics
│   └── custom-fields/ # Custom fields
├── organizations/     # Organization management
├── admin/             # Admin module
├── ai/                # AI services
├── brd/               # BRD processing
├── health/            # Health checks
└── observability/     # Monitoring
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
    └──→ Route Handler → Service Layer → Database
```

### Data Isolation
- All queries scoped by `organizationId`
- Workspace-level queries scoped by `workspaceId`
- No cross-organization data access
- MEMBER and VIEWER filtered to `accessibleWorkspaceIds`

---

## Non-Functional Requirements

### Must Respect
- **Multi-tenant isolation**: Every query org/workspace scoped
- **API stability**: No breaking changes without migration plan
- **Performance**: Pagination, no N+1, indexes for growing queries
- **Security**: No secrets in logs, RBAC, OWASP ASVS
- **Observability**: Structured logging, metrics, health checks

---

## Deployment Architecture

### Railway Deployment
```
┌─────────────────────────────────────┐
│         RAILWAY PLATFORM             │
├─────────────────────────────────────┤
│  ┌──────────────────┐               │
│  │  Frontend Service │               │
│  │  (Nixpacks)       │               │
│  └──────────────────┘               │
│         │                            │
│         ▼                            │
│  ┌──────────────────┐               │
│  │  Backend Service  │               │
│  │  (Nixpacks)       │               │
│  └──────────────────┘               │
│         │                            │
│         ▼                            │
│  ┌──────────────────┐               │
│  │  PostgreSQL      │               │
│  │  (Managed DB)    │               │
│  └──────────────────┘               │
└─────────────────────────────────────┘
```

---

## Key Principles

1. **Workspace-first architecture** ✅
2. **Multi-tenant isolation at every layer** ✅
3. **Role-based access control (RBAC)** ✅
4. **Template-driven project creation** 🚧
5. **Resource allocation with conflict detection** 🚧
6. **AI-powered document processing** 📋 Planned

---

## What This Doc Does NOT Cover

External services configuration (Railway, Sentry, etc.) is documented in:
- `docs/guides/OPERATIONS_RUNBOOK.md` - deployment and monitoring
- `zephix-backend/docs/DEPLOYMENT_ENV_VARS.md` - environment variables

---

## Source Notes

This document was created by merging the following sources:

- `docs/PLATFORM_ARCHITECTURE_TREE.md` (archived)
- `ARCHITECTURE_GUIDE.md` (archived)

*Merged on: 2026-02-04*
*Last verified: 2026-02-04*
