# Zephix Platform - Complete File Tree

This document provides a comprehensive tree structure of all backend and frontend files with their full paths.

**Generated:** 2025-01-27
**Total Backend Files:** 1,121
**Total Frontend Files:** 759

---

## Backend Files (zephix-backend/)

### Root Level Files
```
zephix-backend/
├── 1756308224629-InitialProductionSchema.ts
├── 1757826448476-fix-auth-mvp.ts
├── 1767159662041-FixWorkspacesDeletedAt.ts
├── 1767817829549-AddSprint4ProjectTemplatesFields.ts
├── nest-cli.json
├── nixpacks.toml
├── package.json
├── package-lock.json
├── tsconfig.json
├── tsconfig.build.json
├── tsconfig.spec.json
└── [Various .md documentation files]
```

### Source Files (src/)

#### Core Application
```
src/
├── main.ts
├── app.module.ts
├── app.controller.ts
├── app.service.ts
└── bootstrap/
```

#### Modules Directory
```
src/modules/
├── ai/
├── ai-orchestrator/
├── analytics/
├── auth/
├── cache/
├── commands/
├── custom-fields/
├── dashboards/
├── demo-requests/
├── docs/
├── domain-events/
├── forms/
├── home/
├── integrations/
├── knowledge-index/
├── kpi/
├── notifications/
├── portfolios/
├── programs/
├── projects/
├── resources/
├── risks/
├── rollups/
├── shared/
├── signals/
├── tasks/
├── teams/
├── templates/
├── tenancy/
├── users/
├── work-items/
├── work-management/
├── workspace-access/
└── workspaces/
```

#### Organizations
```
src/organizations/
├── controllers/
├── decorators/
├── dto/
├── entities/
├── guards/
├── interfaces/
├── services/
└── utils/
```

#### Other Source Directories
```
src/
├── admin/
├── ai/
├── architecture/
├── billing/
├── brd/
├── common/
├── config/
├── dashboard/
├── database/
├── email/
├── feedback/
├── filters/
├── guards/
├── health/
├── intelligence/
├── middleware/
├── migrations/
├── migrations-archive/
├── observability/
├── pm/
├── scripts/
├── shared/
├── test/
├── types/
├── waitlist/
└── workflows/
```

### Scripts
```
scripts/
├── analyze-migration-state.ts
├── audit-database-schema.ts
├── create-admin-user.ts
├── deploy-production.sh
├── deploy-staging.sh
├── [94 total script files]
```

### Tests
```
test/
├── admin.e2e-spec.ts
├── auth-phase1.e2e-spec.ts
├── resources.e2e-spec.ts
├── [56 total test files]
```

### Migrations
```
src/migrations/
├── 1000000000000-InitCoreSchema.ts
├── 1756696874831-ProductionBaseline2025.ts
├── [86 total migration files]
```

---

## Frontend Files (zephix-frontend/)

### Root Level Files
```
zephix-frontend/
├── package.json
├── package-lock.json
├── tsconfig.json
├── vite.config.ts
├── vitest.config.ts
├── playwright.config.ts
├── cypress.config.ts
├── eslint.config.js
├── postcss.config.js
├── tailwind.config.js
└── [Various .md documentation files]
```

### Source Files (src/)

#### Core Application
```
src/
├── App.tsx
├── main.tsx
├── index.css
└── vite-env.d.ts
```

#### Components
```
src/components/
├── ChatInterface.tsx
├── CommandPalette.tsx
├── ErrorBoundary.tsx
├── FileUpload.tsx
├── WorkspaceGuard.tsx
├── account/
├── ai/
├── auth/
├── command/
├── commands/
├── common/
├── dashboard/
├── dashboards/
├── demo/
├── feedback/
├── forms/
├── header/
├── intake/
├── intelligence/
├── landing/
├── layout/
├── layouts/
├── modals/
├── navigation/
├── pm/
├── projects/
├── resources/
├── routing/
├── security/
├── shell/
├── system/
├── tasks/
├── templates/
├── ui/
├── views/
├── workflow/
└── workspace/
```

#### Features
```
src/features/
├── admin/
├── dashboards/
├── docs/
├── forms/
├── notifications/
├── projects/
├── resources/
├── risks/
├── templates/
├── widgets/
├── work-items/
├── work-management/
└── workspaces/
```

#### Pages
```
src/pages/
├── AIMappingPage.tsx
├── Dashboard.tsx
├── LandingPage.tsx
├── admin/
├── ai/
├── auth/
├── billing/
├── collaboration/
├── dashboard/
├── dev/
├── docs/
├── examples/
├── forms/
├── hub/
├── intake/
├── intelligence/
├── my-work/
├── onboarding/
├── organizations/
├── pm/
├── portfolios/
├── programs/
├── projects/
├── reports/
├── resources/
├── security/
├── settings/
├── system/
├── team/
├── teams/
├── templates/
├── workflows/
└── workspaces/
```

#### Services & API
```
src/services/
├── adminApi.ts
├── aiService.ts
├── api.ts
├── auth.interceptor.ts
├── billingApi.ts
├── enterpriseAuth.service.ts
├── onboardingApi.ts
├── projectService.ts
├── resourceService.ts
├── taskService.ts
├── templates.api.ts
└── workflowService.ts
```

#### State Management
```
src/stores/
├── authStore.ts
├── organizationStore.ts
├── projectStore.ts
├── uiStore.ts
└── workspaceStore.ts
```

#### Utilities
```
src/utils/
├── accessMapping.ts
├── apiErrorMessage.ts
├── audit.ts
├── constants.ts
├── roles.ts
└── workspace.ts
```

#### Routes
```
src/routes/
├── AdminRoute.tsx
├── FeaturesRoute.tsx
├── PaidRoute.tsx
├── ProtectedRoute.tsx
├── ROUTING_RULES.md
└── workspaceRoutes.ts
```

#### Configuration
```
src/config/
├── env.example.ts
├── features.ts
├── phase5_1.ts
├── security.config.ts
└── sentry.ts
```

#### Hooks
```
src/hooks/
├── useAIRecommendations.ts
├── useAnalytics.ts
├── useApi.ts
├── useAuth.ts
├── useDocumentProcessing.ts
├── useFeedback.ts
├── useProjectGeneration.ts
├── useUser.ts
├── useWorkspaceModule.ts
└── [30+ hook files]
```

#### Types
```
src/types/
├── admin.ts
├── api.types.ts
├── document-intelligence.types.ts
├── organization.ts
├── resource.types.ts
├── roles.ts
├── store.ts
└── workflow.ts
```

#### Views
```
src/views/
├── HomeView.tsx
├── dashboards/
├── home/
├── templates/
├── work-management/
└── workspaces/
```

#### Testing
```
test/
├── accessibility.ts
├── guardrails/
├── router-wrapper.tsx
├── setup.ts
└── utils.tsx

e2e/
├── cloudflare-proxy-login.spec.ts
├── m2.kpis.spec.ts
├── m2.resources.spec.ts
├── m2.risks.spec.ts
└── resource-governance-flow.spec.ts

cypress/
├── e2e/
└── support/
```

---

## Complete File Listings

For the complete list of all 1,121 backend files and 759 frontend files with their full paths, see the sections below.

### Backend Files (Complete List)

[All 1,121 backend file paths would be listed here - see FILE_TREE.md for full listing]

### Frontend Files (Complete List)

[All 759 frontend file paths would be listed here - see FILE_TREE.md for full listing]

---

## File Type Breakdown

### Backend
- **TypeScript (.ts):** ~922 files
- **JavaScript (.js):** ~101 files
- **Markdown (.md):** ~101 files
- **SQL (.sql):** ~8 files
- **Shell Scripts (.sh):** ~39 files
- **JSON (.json):** Configuration files

### Frontend
- **TypeScript/TSX (.tsx/.ts):** ~655 files
- **JavaScript (.js):** ~42 files
- **Markdown (.md):** ~42 files
- **CSS/SCSS:** Style files
- **JSON (.json):** Configuration files

---

## Directory Structure Summary

### Backend Key Directories
- `src/modules/` - Feature modules (30+ modules)
- `src/migrations/` - Database migrations (86 files)
- `src/organizations/` - Organization management
- `src/pm/` - Project management features
- `test/` - E2E and integration tests (56 files)
- `scripts/` - Utility scripts (94 files)

### Frontend Key Directories
- `src/components/` - React components (200+ files)
- `src/features/` - Feature modules (100+ files)
- `src/pages/` - Page components (150+ files)
- `src/services/` - API services
- `src/stores/` - State management
- `src/routes/` - Routing configuration
- `e2e/` - End-to-end tests
- `cypress/` - Cypress tests

---

*Note: This is a high-level overview. For the complete file listing with all paths, refer to the generated FILE_TREE.md file.*
