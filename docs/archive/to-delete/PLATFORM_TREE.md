# Zephix Platform - Complete Directory Tree

Generated: $(date)

## Overview

Zephix is a monorepo enterprise platform with three main applications:
- **zephix-backend**: NestJS backend API
- **zephix-frontend**: React + Vite frontend application
- **zephix-landing**: Static landing page

---

## Root Structure

```
ZephixApp/
├── zephix-backend/          # NestJS Backend Application
├── zephix-frontend/         # React + Vite Frontend Application
├── zephix-landing/          # Static Landing Page
├── packages/                # Shared Packages
│   ├── nestjs-auth-service/
│   └── user-auth-service/
├── docs/                    # Documentation (100+ files)
├── scripts/                 # Utility Scripts
├── reports/                 # Reports and Analysis
├── backup/                  # Backups
├── test/                    # Root-level tests
├── src/                     # Legacy/root src (being migrated)
└── [config files]           # Root level configs
```

---

## Backend Structure (`zephix-backend/`)

### Main Source (`zephix-backend/src/`)

```
src/
├── modules/                 # Feature modules (30+ modules)
│   ├── auth/                # Authentication & Authorization
│   ├── workspaces/          # Workspace management & RBAC
│   ├── projects/            # Project management
│   ├── resources/           # Resource allocation & governance
│   ├── templates/           # Template system
│   ├── work-management/     # Work items, tasks, phases
│   ├── dashboards/          # Dashboard & analytics
│   ├── portfolios/         # Portfolio management
│   ├── programs/            # Program management
│   ├── teams/               # Team management
│   ├── integrations/        # External integrations (Jira, etc.)
│   ├── ai/                  # AI services
│   ├── analytics/           # Analytics & metrics
│   ├── custom-fields/       # Custom field system
│   ├── kpi/                 # KPI tracking
│   ├── risks/               # Risk management
│   ├── signals/             # Signals & reporting
│   ├── workflows/           # Workflow engine
│   ├── knowledge-index/     # RAG & knowledge base
│   ├── domain-events/       # Event system
│   ├── tenancy/             # Multi-tenancy
│   └── [more modules...]
│
├── admin/                   # Admin console
├── organizations/           # Organization management
├── common/                  # Shared utilities
│   ├── decorators/
│   ├── guards/
│   ├── filters/
│   ├── interceptors/
│   └── utils/
├── config/                  # Configuration
├── database/                # Database seeds
├── migrations/              # Database migrations (100+)
├── observability/           # Logging, metrics, telemetry
├── health/                  # Health checks
├── shared/                  # Shared code
└── main.ts                  # Application entry point
```

### Key Backend Modules

#### Auth Module (`modules/auth/`)
- Controllers: `auth.controller.ts`, `org-invites.controller.ts`
- Services: `auth-registration.service.ts`, `email-verification.service.ts`
- Entities: `refresh-token.entity.ts`, `email-verification.entity.ts`
- Guards: `jwt-auth.guard.ts`, `require-email-verified.guard.ts`

#### Workspaces Module (`modules/workspaces/`)
- Controllers: `workspaces.controller.ts`
- Services: `workspaces.service.ts`, `workspace-members.service.ts`, `workspace-access.service.ts`
- Entities: `workspace.entity.ts`, `workspace-member.entity.ts`, `workspace-invite-link.entity.ts`
- Guards: `require-workspace-role.guard.ts`, `require-org-role.guard.ts`
- RBAC: `rbac.ts`, `workspace.policy.ts`

#### Resources Module (`modules/resources/`)
- Controllers: `resources.controller.ts`, `resource-allocation.controller.ts`
- Services: `resources.service.ts`, `resource-allocation.service.ts`, `resource-conflict.service.ts`
- Entities: `resource.entity.ts`, `resource-allocation.entity.ts`, `resource-conflict.entity.ts`
- Helpers: `capacity-math.helper.ts`, `workspace-scope.helper.ts`

#### Templates Module (`modules/templates/`)
- Controllers: `templates.controller.ts`, `template.controller.ts`, `lego-blocks.controller.ts`
- Services: `templates.service.ts`, `template.service.ts`, `lego-blocks.service.ts`
- Entities: `template.entity.ts`, `lego-block.entity.ts`, `template-block.entity.ts`

#### Work Management Module (`modules/work-management/`)
- Controllers: `work-tasks.controller.ts`, `work-phases.controller.ts`, `work-plan.controller.ts`
- Services: `work-tasks.service.ts`, `work-phases.service.ts`, `project-overview.service.ts`
- Entities: `work-task.entity.ts`, `work-phase.entity.ts`, `ack-token.entity.ts`

---

## Frontend Structure (`zephix-frontend/`)

### Main Source (`zephix-frontend/src/`)

```
src/
├── features/                # Feature modules (aligned with backend)
│   ├── admin/               # Admin console
│   │   ├── overview/
│   │   ├── users/
│   │   ├── workspaces/
│   │   ├── billing/
│   │   ├── security/
│   │   └── teams/
│   ├── workspaces/         # Workspace management
│   │   ├── pages/
│   │   ├── components/
│   │   ├── settings/
│   │   └── views/
│   ├── projects/           # Project management
│   │   ├── board/
│   │   ├── overview/
│   │   ├── tasks/
│   │   ├── kpis/
│   │   └── risks/
│   ├── resources/          # Resource management
│   │   ├── pages/
│   │   ├── components/
│   │   └── hooks/
│   ├── templates/          # Template center
│   ├── dashboards/         # Dashboard studio
│   ├── work-management/    # Work management
│   └── [more features...]
│
├── components/             # Shared components
│   ├── ui/                 # UI primitives
│   ├── forms/             # Form components
│   ├── layout/             # Layout components
│   ├── auth/               # Auth components
│   ├── projects/           # Project components
│   ├── resources/          # Resource components
│   ├── templates/          # Template components
│   └── [more...]
│
├── pages/                  # Page components
│   ├── admin/
│   ├── auth/
│   ├── workspaces/
│   ├── projects/
│   ├── resources/
│   ├── templates/
│   └── [more...]
│
├── hooks/                  # React hooks
│   ├── useAuth.ts
│   ├── useWorkspaceRole.ts
│   ├── useApi.ts
│   └── [more...]
│
├── services/               # API services
│   ├── api.ts
│   ├── auth.interceptor.ts
│   ├── adminApi.ts
│   └── [more...]
│
├── stores/                 # State management (Zustand)
│   ├── authStore.ts
│   ├── workspaceStore.ts
│   ├── organizationStore.ts
│   └── projectStore.ts
│
├── routes/                 # Route guards
│   ├── ProtectedRoute.tsx
│   └── AdminRoute.tsx
│
├── lib/                    # Utilities
│   ├── api/
│   ├── providers/
│   └── utils.ts
│
├── types/                  # TypeScript types
│   ├── roles.ts
│   ├── api.types.ts
│   └── [more...]
│
└── App.tsx                 # Root component
```

### Key Frontend Features

#### Admin Feature (`features/admin/`)
- `AdminOverviewPage.tsx` - Admin dashboard
- `UsersListPage.tsx` - User management
- `WorkspacesListPage.tsx` - Workspace management
- `BillingOverviewPage.tsx` - Billing management
- `RolesPermissionsPage.tsx` - RBAC management

#### Workspaces Feature (`features/workspaces/`)
- `WorkspaceHome.tsx` - Workspace home view
- `WorkspaceMembersPage.tsx` - Member management
- `WorkspaceSettingsPage.tsx` - Settings
- `WorkspaceCreateModal.tsx` - Create workspace

#### Resources Feature (`features/resources/`)
- `ResourcesPage.tsx` - Main resources page
- `ResourceHeatmap.tsx` - Heatmap visualization
- `ResourceJustificationModal.tsx` - Allocation justification
- `GovernedAllocationProvider.tsx` - Allocation governance

---

## Configuration Files

### Root Level
- `package.json` - Root package.json
- `railway.toml` - Railway deployment config
- `.railwayignore` - Railway ignore patterns
- `.cursorrules` - Cursor AI rules
- `tsconfig.json` - TypeScript config

### Backend (`zephix-backend/`)
- `package.json` - Backend dependencies
- `nest-cli.json` - NestJS CLI config
- `tsconfig.json` - TypeScript config
- `eslint.config.mjs` - ESLint config

### Frontend (`zephix-frontend/`)
- `package.json` - Frontend dependencies
- `vite.config.ts` - Vite config
- `tsconfig.json` - TypeScript config
- `tailwind.config.js` - Tailwind CSS config
- `playwright.config.ts` - Playwright E2E config

---

## Documentation (`docs/`)

### Key Documentation Files
- `RBAC_AND_WORKSPACE_BEHAVIOR.md` - RBAC rules
- `PHASE2_DEPLOYMENT_GUIDE.md` - Deployment guide
- `ENGINEERING_PLAYBOOK.md` - Engineering practices
- `OPERATIONS_RUNBOOK.md` - Operations guide
- `SMOKE_TEST_CHECKLIST.md` - Testing checklist
- Phase documentation (PHASE1-8)
- Release logs (RELEASE_LOG_PHASE*.md)

---

## Scripts (`scripts/`)

### Deployment Scripts
- `deploy-production.sh`
- `deploy-railway.sh`
- `verify-deployment.sh`

### Verification Scripts
- `complete-verification.sh`
- `verify-railway-deployment.sh`
- `check-tenancy-bypass.sh`

### CI Scripts
- `ci-guardrails.sh`
- `greenline.sh`

---

## Test Structure

### Backend Tests (`zephix-backend/test/`)
- E2E tests: `*.e2e-spec.ts`
- Tenancy isolation tests
- RBAC tests
- Integration tests

### Frontend Tests (`zephix-frontend/`)
- E2E tests: `tests/*.spec.ts` (Playwright)
- Component tests: `cypress/e2e/`
- Unit tests: `src/**/__tests__/`

---

## Database Migrations

### Location: `zephix-backend/src/migrations/`

100+ migration files covering:
- Core schema initialization
- Workspace & RBAC system
- Resource management
- Template system
- Work management
- Analytics & dashboards
- Integrations
- And more...

---

## Statistics

- **Total Directories**: 378+
- **Total Files**: 1,368+
- **Backend Modules**: 30+
- **Frontend Features**: 10+
- **Database Migrations**: 100+
- **Documentation Files**: 100+

---

## Key Entry Points

### Backend
- `zephix-backend/src/main.ts` - Application bootstrap
- `zephix-backend/src/app.module.ts` - Root module

### Frontend
- `zephix-frontend/src/main.tsx` - Application entry
- `zephix-frontend/src/App.tsx` - Root component

---

*Last updated: $(date)*
