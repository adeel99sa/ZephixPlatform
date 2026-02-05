# Zephix Platform Documentation

> **Where to Look First** - Canonical documentation index for the Zephix platform.

---

## Quick Start

### Run Backend
```bash
cd zephix-backend
npm install
npm run start:dev          # Dev mode on port 3000
```

### Run Frontend
```bash
cd zephix-frontend
npm install
npm run dev                # Dev mode on port 5173
```

### Key Environment Variables
- Backend: `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`
- Frontend: `VITE_API_BASE` (optional, defaults to `/api`)

---

## Source of Truth

| Topic | Location |
|-------|----------|
| **API Contracts** | `zephix-backend/src/modules/*/dto/*.ts` |
| **MVP Scope** | [docs/scope/MVP_SCOPE.md](./scope/MVP_SCOPE.md) |
| **Master Plan** | [docs/implementation/MASTER_PLAN.md](./implementation/MASTER_PLAN.md) |
| **Release Process** | [docs/guides/OPERATIONS_RUNBOOK.md](./guides/OPERATIONS_RUNBOOK.md) |
| **Competitive Analysis** | [docs/competitive/PLATFORM_COMPARISON.md](./competitive/PLATFORM_COMPARISON.md) |
| **Workspace Header Rules** | Every request must include `X-Workspace-Id` header (set by frontend interceptor in `src/lib/api/client.ts`) |
| **Tenancy Rules** | All queries scoped by `organizationId`; use `platformRole` as source of truth. See [RBAC](./security/RBAC.md) |

---

## Canonical Documentation

### Scope & Planning
- [MVP Scope Matrix](./scope/MVP_SCOPE.md) - Must ship, ship dark, explicitly deferred
- [Master Plan](./implementation/MASTER_PLAN.md) - Vision, principles, execution sequence

### Architecture
- [Platform Architecture](./architecture/PLATFORM_ARCHITECTURE.md) - System design, modules, data flow

### Guides
- [Engineering Playbook](./guides/ENGINEERING_PLAYBOOK.md) - Development standards, PR process
  - See [Documentation Policy](./guides/ENGINEERING_PLAYBOOK.md#documentation-policy) for docs standards
- [Operations Runbook](./guides/OPERATIONS_RUNBOOK.md) - Releases, monitoring, incidents

### Security
- [RBAC](./security/RBAC.md) - Roles, permissions, tenancy isolation

### Verification
- [Verification Master](./verification/VERIFICATION_MASTER.md) - Release checklists

### Competitive Analysis
- [Platform Comparison](./competitive/PLATFORM_COMPARISON.md) - Market context (not scope)
- [Monday Research](./monday-research/) - Feature research

---

## Backend & Frontend Docs

| Area | Location |
|------|----------|
| Backend README | [zephix-backend/README.md](../zephix-backend/README.md) |
| Backend API Docs | [zephix-backend/docs/](../zephix-backend/docs/) |
| Frontend README | [zephix-frontend/README.md](../zephix-frontend/README.md) |
| Frontend Routing | [zephix-frontend/docs/](../zephix-frontend/docs/) |

---

## Archive

Historical phase docs, proofs, and debug artifacts: [./archive/](./archive/)

---

## Planned Docs (Not Yet Created)

The following are planned but not yet written:
- `./architecture/WORKSPACE_MODEL.md` - Workspace ownership model
- `./guides/DEPLOYMENT_GUIDE.md` - Railway deployment
- `./guides/QA_TESTING_GUIDE.md` - Testing procedures
- `./security/AUTH.md` - Authentication flows

---

*Last updated: 2026-02-04*
