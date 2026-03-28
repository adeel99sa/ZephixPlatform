# Zephix Backend Documentation

## Quick Start

```bash
npm install
npm run start:dev     # Dev mode
npm run build         # Production build
npm run test          # Unit tests
npm run test:e2e      # E2E tests
```

## Key Documentation

| Topic | File |
|-------|------|
| Stabilization steps | `STABILIZATION_SEQUENCE.md` |
| Tenant patterns | `TENANT_AWARE_REPOSITORY_API.md` |
| Railway deployment | `RAILWAY_DEPLOY_CHECKLIST.md` |
| Environment variables | `DEPLOYMENT_ENV_VARS.md` |
| CORS configuration | `CORS_CONFIGURATION.md` |
| Auth configuration | `AUTHENTICATION_CONFIGURATION.md` |

## Module Structure

All domain modules are in `src/modules/`:

| Module | Purpose | Status |
|--------|---------|--------|
| `auth` | Authentication & JWT | ✅ |
| `users` | User management | ✅ |
| `workspaces` | Workspace CRUD | ✅ |
| `projects` | Project management | ✅ |
| `work-management` | Tasks, phases, dependencies | ✅ |
| `resources` | Resource allocation | 🚧 |
| `templates` | Project templates | 🚧 |
| `kpi` | Metrics & KPIs | 🚧 |

## API Contracts

DTOs define all API contracts:
- Request validation: `src/modules/*/dto/*.dto.ts`
- Response shapes: `src/modules/*/dto/*.response.ts`

## Database

- Entities: `src/modules/*/entities/*.entity.ts`
- Migrations: `src/migrations/`

---

*For platform-wide docs, see [/docs/](../../docs/README.md)*
