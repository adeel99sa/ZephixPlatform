# Engineering Playbook

> This is a canonical document. For the latest guidance, refer to this file.

---

## Platform Contract (Non-Negotiables)

* **Single API client only**: All HTTP goes through `src/lib/api/client.ts`
* **No `fetch()`** in app code (ESLint, pre-commit, CI guardrails enforce)
* **Auth**: Access token on requests, auto refresh (single-flight) on 401, logout on refresh failure
* **Workspace**: Every request carries `X-Workspace-Id` (interceptor handles it)
* **Observability**: Every request has `x-correlation-id` & `x-request-id`; errors normalized and logged

---

## Folder Standards

### Frontend
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

### Backend
```
src/
  modules/<domain>/   # Domain modules (auth, projects, workspaces, etc.)
    controllers/      # HTTP controllers
    services/         # Business logic
    entities/         # TypeORM entities
    dto/              # Data transfer objects
    guards/           # Route guards
  shared/             # Cross-cutting services
  config/             # Configuration
  migrations/         # Database migrations
```

---

## API Client Rules

### Call Pattern
```ts
import { apiClient } from '@/lib/api/client';

export async function listProjects(params?: { q?: string }) {
  const { data } = await apiClient.get('/projects', { params });
  return data;
}
```

### Rules
* **Never** pass full URLs; pass clean paths (`'/projects'`, not `'/api/projects'`)
* **Errors** must be rendered with `getErrorText(error)` and never as raw objects
* **Retries**: Leave to react-query; client does not retry non-idempotent calls

---

## Auth & Routing

* **Auth store** exposes `{ isAuthenticated, isHydrated, accessToken, login(), logout() }`
* **Guards**:
  * `ProtectedRoute` waits for `isHydrated`; if unauth → `/login`
  * `PublicRoute` redirects authenticated users away from `/login` to `/hub`
* **Lazy imports** use `lazyDefault()` helper to avoid "lazy resolves to undefined"

---

## React Query Conventions

* **Keys**: `['projects', params]`, `['project', id]`, etc.
* **Cache times**: Fast lists 1–5m; detail 5–10m; set `staleTime` explicitly
* **Mutations**: Invalidate exact keys; no global `invalidateQueries()` sledgehammer

---

## Working Style and Safety Rules

### Scan and Plan
* Use search and code navigation to understand existing design
* Look for related patterns and call sites
* Write a brief plan in comments or commit message

### Apply Focused Changes
* One concern per change
* Update code, tests, and comments together

### Run Checks

**Backend:**
```bash
cd zephix-backend
npm run lint
npm run build
npm run test
```

**Frontend:**
```bash
cd zephix-frontend
npm run lint
npm run build
npm run test:guardrails
```

### Summarize
At the end of each batch, document:
* What changed
* Why it changed
* How it was verified
* Follow-up tasks or risks

---

## Testing & Guardrails

* **Guardrail test**: Fails build if any raw `fetch` exists outside tests
* **Smoke (Playwright)**: `login → hub → projects → admin → logout`
* **Unit**: Hooks/render with MSW when calling API; no network in unit tests
* **CI**: `lint → build → guardrails → smoke`

---

## Observability & Errors

* Request headers auto-add `x-correlation-id` & `x-request-id`
* Central logger stamps `{ method, url, status, correlationId, message }`
* Global error toasts for `>=500`; 401 flows through refresh

---

## Versioning & Releases

* **Stable tags**: `vX.Y-stable` cut from green main
* **Hotfix**: Branch from last stable, cherry-pick, tag `vX.Y.Z-hotfix`
* **Rollback**: Redeploy previous stable tag; FE/BE are backward-tolerant

---

## PR Checklist

Copy/paste for every PR:

- [ ] No `fetch()` added; all new calls use `apiClient`
- [ ] Added/updated smoke where user flow changed
- [ ] Errors rendered via `getErrorText`
- [ ] Route pages are lazy + default export
- [ ] Bundle diff acceptable (no unexpected chunk bloat)
- [ ] CI green (lint/build/guardrails/smoke)

---

## Dev Quick-Start

```bash
# Frontend
cd zephix-frontend
pnpm dev             # run vite
pnpm test:guardrails # ensure no fetch()
pnpm test:smoke      # playwright e2e
pnpm ci:verify       # full CI locally
pnpm lint:fix        # autofix lint

# Backend
cd zephix-backend
npm run start:dev    # run NestJS
npm run lint         # lint check
npm run test         # unit tests
npm run test:e2e     # e2e tests
```

---

## Development Protocol

### Git and Branches
* Do not run `git push` without human approval
* Respect existing branching model
* Clear commit messages listing files included

### Infrastructure
* Do not touch DNS, domains, or Railway projects without approval
* Do not add or edit Railway configuration files or Dockerfiles without explicit request

---

## Documentation Policy

### Document Categories

**A) Execution-Backed Docs** (must be reproducible)
- Checklists tied to real commands (CI, scripts, manual run steps)
- Verification artifacts with actual output evidence
- Release readiness reports backed by CI runs
- Smoke test documentation with command examples

**B) Canonical Engineering Docs** (governing contracts)
- Architecture boundaries and system design
- RBAC rules and tenancy isolation
- Operations runbooks with exact procedures
- API contracts and schemas

**C) Narrative/Planning Docs** (descriptive only)
- Progress summaries and "what we did" writeups
- Strategy reasoning and roadmaps
- Competitive analysis
- "What's next" planning documents

### Folder Boundaries

| Category | Allowed Locations |
|----------|-------------------|
| Execution-backed | `docs/verification/`, `docs/guides/` |
| Canonical engineering | `docs/architecture/`, `docs/guides/`, `docs/security/` |
| Narrative/planning | `docs/archive/planning/`, `docs/competitive/` |

### Execution Language Rules

- **DO NOT** use "PR created", "sweep complete", "verification passed", or "deployed successfully" unless backed by CI output, script logs, or reproducible commands
- **DO NOT** claim work is done in prose without linking to commits, CI runs, or verification evidence
- Execution claims must be verifiable by running actual commands

### Required Disclaimer for Narrative Docs

Any doc that is descriptive-only (not backed by automation) MUST include this header:

```
> ⚠️ **DESCRIPTIVE ONLY** - This document describes intent, strategy, or progress.
> It is not generated by CI or automation. Do not treat as verification evidence.
```

### No Secrets in Docs
- Never store secrets: No tokens, API keys, passwords, private URLs, SSH keys, Railway credentials, or env var values
- Treat docs as internal engineering contracts: Architecture boundaries, API contracts, RBAC rules, runbooks, verification checklists
- Reference `.env.example` for environment variable names without values

### Strategy Docs Live Elsewhere
- Pricing strategy, competitor teardowns, and go-to-market notes belong in a private repo or private Google Doc
- Limit competitor content to `docs/competitive/` directory only
- Do not reference competitor analysis from canonical engineering docs

### What Belongs in Platform Docs
- Platform invariants (workspace header rules, tenancy scoping, RBAC ceilings, error contracts)
- API contracts and response schemas
- Runbooks and operational procedures
- Verification checklists and acceptance criteria

---

## Source Notes

This document was created by merging the following sources:

- `docs/ENGINEERING_PLAYBOOK.md` (commit: see git log)
- `CURSOR_DEVELOPMENT_PROTOCOL.md` (commit: see git log)
- `DAILY_WORK_GUIDE.md` (commit: see git log)

*Merged on: 2026-02-04*
