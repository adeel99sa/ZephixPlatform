# ZEPHIX PLATFORM ARCHITECTURE TREE

**Generated:** 2025-01-27  
**Source:** Codebase-driven analysis with proof artifacts  
**Purpose:** Comprehensive platform structure documentation

---

## PROOF ARTIFACTS

All numeric claims in this document are backed by command outputs saved in `proofs/recovery/commands/`. See `RAW_OUTPUTS.md` for complete command reference.

---

## 1. MONOREPO STRUCTURE

**Proof:** `proofs/recovery/commands/01_repo_root.txt`, `proofs/recovery/commands/02_top_level_tree.txt`

```
ZephixApp/
├── zephix-backend/          # NestJS API backend
├── zephix-frontend/         # React SPA frontend
├── zephix-landing/          # Marketing landing site
├── packages/                # Shared packages
├── docs/                    # Documentation
├── scripts/                 # Deployment & utility scripts
├── proofs/                  # Verification evidence
├── railway.toml             # Railway deployment config
├── .github/workflows/       # CI/CD workflows (3 files)
└── .nixpacks/               # Nixpacks builder config
```

**Deployment Files:** `proofs/recovery/commands/80_deployment_files.txt`
- `railway.toml` exists
- `.github/workflows/` contains 3 workflow files (ci.yml, enterprise-ci.yml, release.yml)
- `.nixpacks/config.toml` exists

---

## 2. BACKEND ARCHITECTURE

### 2.1 File Counts

**Proof:** `proofs/recovery/commands/10_backend_counts.txt`

- **Total files in src/:** 868 files
- **TypeScript files (.ts):** 812 files
- **Module directories (maxdepth 2):** 134 directories
- **Controllers:** 48 files (`*.controller.ts`)
- **Services:** 94 files (`*.service.ts`)
- **Entities:** 62 files (`*.entity.ts`)
- **Test files (.spec.ts):** 52 files

### 2.2 Module Structure

**Proof:** `proofs/recovery/commands/10_backend_counts.txt`

**Total Modules:** 37 modules (including `src/modules` root)

1. `ai` - AI services
2. `ai-orchestrator` - AI orchestration
3. `analytics` - Analytics & metrics
4. `auth` - Authentication & authorization
5. `cache` - Caching layer
6. `commands` - Command pattern
7. `custom-fields` - Custom fields
8. `dashboards` - Dashboard system
9. `demo-requests` - Demo requests
10. `docs` - Document management
11. `domain-events` - Event-driven architecture
12. `forms` - Form management
13. `home` - Home dashboard
14. `integrations` - External integrations
15. `knowledge-index` - Knowledge indexing
16. `kpi` - KPI management
17. `notifications` - Notifications
18. `portfolios` - Portfolio management
19. `programs` - Program management
20. `projects` - Project management
21. `resources` - Resource management
22. `risks` - Risk management
23. `rollups` - Data rollups
24. `shared` - Shared utilities
25. `signals` - Signals & reporting
26. `tasks` - Task management
27. `teams` - Team management
28. `templates` - Template system
29. `tenancy` - Multi-tenancy core
30. `users` - User management
31. `work-items` - Work items
32. `work-management` - Work management
33. `workspace-access` - Workspace access control
34. `workspaces` - Workspace management

### 2.3 API Architecture

**Proof:** `proofs/recovery/commands/40_controllers_list.txt`, `proofs/recovery/commands/42_route_counts.txt`

**Controller Files:** 48 controllers

**Route Decorators:**
- `@Get()` handlers: 118
- `@Post()` handlers: 78
- `@Patch()` handlers: 37
- `@Delete()` handlers: 18

**Total Estimated Endpoints:** 251 endpoints (118 + 78 + 37 + 18)

**Controller List:** See `proofs/recovery/commands/40_controllers_list.txt` for complete list.

### 2.4 Database Architecture

**Proof:** `proofs/recovery/commands/30_db_counts.txt`

- **Migration files:** 86 migrations
- **Entity files:** 98 entities

**Migration Types:**
- TypeScript migrations: 78 files
- SQL migrations: 8 files

---

## 3. FRONTEND ARCHITECTURE

### 3.1 File Counts

**Proof:** `proofs/recovery/commands/20_frontend_counts.txt`

- **Total files in src/:** 667 files
- **TypeScript files (.ts):** 168 files
- **React components (.tsx):** 467 files
- **Page components:** 137 pages (`src/pages/*.tsx`)
- **Components:** 213 files (`src/components/`)
- **Feature modules:** 132 files (`src/features/`)
- **Test files:** 42 files (`*.test.ts`, `*.test.tsx`)

### 3.2 Frontend Structure

```
zephix-frontend/src/
├── pages/          # 137 page components
├── components/     # 213 UI components
├── features/       # 132 feature modules
├── services/       # API clients
├── stores/         # Zustand state stores
├── hooks/          # Custom React hooks
├── routes/         # Route guards
└── lib/            # Utilities
```

---

## 4. BUILD STATUS

### 4.1 Backend Build

**Proof:** `proofs/recovery/commands/50_backend_build.txt`

**Status:** ✅ **PASSES**

Build command: `npm run build` (NestJS build)
- Compiles TypeScript successfully
- No errors reported

### 4.2 Frontend Build

**Proof:** `proofs/recovery/commands/60_frontend_build.txt`

**Status:** ✅ **PASSES**

Build command: `npm run build` (Vite build)
- 2076 modules transformed
- Build completes successfully
- Warnings: Some chunks >500KB (performance optimization opportunity)
- Output: `dist/index.html`, `dist/assets/index-*.css`, `dist/assets/index-*.js`

---

## 5. DEPLOYMENT ARCHITECTURE

**Proof:** `proofs/recovery/commands/80_deployment_files.txt`

### 5.1 Railway Configuration

- **railway.toml:** Exists
- **Nixpacks config:** `.nixpacks/config.toml` exists

### 5.2 CI/CD

- **GitHub Actions workflows:** 3 files
  - `ci.yml` - Main CI pipeline
  - `enterprise-ci.yml` - Enterprise CI
  - `release.yml` - Release workflow

---

## 6. KEY METRICS SUMMARY

| Metric | Count | Proof File |
|--------|-------|------------|
| **Backend Files** | 868 | `10_backend_counts.txt` |
| **Backend TypeScript** | 812 | `10_backend_counts.txt` |
| **Backend Modules** | 37 | `10_backend_counts.txt` |
| **Controllers** | 48 | `10_backend_counts.txt` |
| **Services** | 94 | `10_backend_counts.txt` |
| **Entities** | 62 | `10_backend_counts.txt` |
| **Test Files (Backend)** | 52 | `10_backend_counts.txt` |
| **GET Endpoints** | 118 | `42_route_counts.txt` |
| **POST Endpoints** | 78 | `42_route_counts.txt` |
| **PATCH Endpoints** | 37 | `42_route_counts.txt` |
| **DELETE Endpoints** | 18 | `42_route_counts.txt` |
| **Total Endpoints** | 251 | `42_route_counts.txt` |
| **Migrations** | 86 | `30_db_counts.txt` |
| **Entities** | 98 | `30_db_counts.txt` |
| **Frontend Files** | 667 | `20_frontend_counts.txt` |
| **Frontend TypeScript** | 168 | `20_frontend_counts.txt` |
| **Frontend TSX** | 467 | `20_frontend_counts.txt` |
| **Pages** | 137 | `20_frontend_counts.txt` |
| **Components** | 213 | `20_frontend_counts.txt` |
| **Features** | 132 | `20_frontend_counts.txt` |
| **Test Files (Frontend)** | 42 | `20_frontend_counts.txt` |

---

## 7. ARCHITECTURAL PATTERNS

### 7.1 Backend Patterns

- **Modular Architecture:** NestJS modules with clear separation
- **Repository Pattern:** TypeORM repositories
- **Service Layer:** Business logic in services
- **DTO Pattern:** Data transfer objects
- **Guard Pattern:** Route guards for auth/authorization
- **Interceptor Pattern:** Global interceptors for tenant context
- **Event-Driven:** Domain events with subscribers

### 7.2 Frontend Patterns

- **Component Composition:** React component hierarchy
- **Feature Modules:** Feature-based organization
- **State Management:** Zustand stores + React Query
- **Route Guards:** Protected routes with guards
- **API Client:** Centralized Axios client with interceptors
- **Code Splitting:** Lazy-loaded routes

---

**END OF ARCHITECTURE TREE**
