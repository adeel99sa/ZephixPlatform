# 🧭 Zephix Engineering Playbook (one-pager)

## 0) Platform contract (non-negotiables)

* **Single API client** only: all HTTP goes through `src/lib/api/client.ts`.
* **No `fetch()`** in app code (ESLint, pre-commit, CI guardrails enforce).
* **Auth**: access token on requests, **auto refresh** (single-flight) on 401, logout on refresh failure.
* **Workspace**: every request carries `X-Workspace-Id` (interceptor handles it).
* **Observability**: every request has `x-correlation-id` & `x-request-id`; errors are normalized and logged.

## 1) Folder standards

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

## 2) API client rules

* **Call pattern**

  ```ts
  import { apiClient } from '@/lib/api/client';

  export async function listProjects(params?: { q?: string }) {
    const { data } = await apiClient.get('/projects', { params });
    return data;
  }
  ```
* **Never** pass full URLs; pass clean paths (`'/projects'`, not `'/api/projects'`).
* **Errors** must be rendered with `getErrorText(error)` and never as raw objects.
* **Retries**: leave to react-query; client does not retry non-idempotent calls.

## 3) Auth & routing

* **Auth store** exposes `{ isAuthenticated, isHydrated, accessToken, login(), logout() }`.
* **Guards**:

  * `ProtectedRoute` waits for `isHydrated`; if unauth → `/login`.
  * `PublicRoute` redirects authenticated users away from `/login` to `/hub`.
* **Lazy imports** use `lazyDefault()` helper to avoid "lazy resolves to undefined".

## 4) React Query conventions

* Keys: `['projects', params]`, `['project', id]`, etc.
* Cache times: fast lists 1–5m; detail 5–10m; set `staleTime` explicitly.
* Mutations invalidate exact keys; no global `invalidateQueries()` sledgehammer.

## 5) Testing & guardrails

* **Guardrail test**: fails build if any raw `fetch` exists outside tests.
* **Smoke (Playwright)**: `login → hub → projects → admin → logout`.
* **Unit**: hooks/render with MSW when calling API; no network in unit tests.
* **CI**: `lint → build → guardrails → smoke`.

## 6) Observability & errors

* Request headers auto-add `x-correlation-id` & `x-request-id`.
* Central logger stamps `{ method, url, status, correlationId, message }`.
* Global error toasts for `>=500`; 401 flows through refresh.

## 7) Versioning & releases

* **Stable tags**: `vX.Y-stable` cut from green main.
* **Hotfix**: branch from last stable, cherry-pick, tag `vX.Y.Z-hotfix`.
* **Rollback**: redeploy previous stable tag; FE/BE are backward-tolerant.

## 8) PR checklist (copy/paste in PR template)

* [ ] No `fetch()` added; all new calls use `apiClient`
* [ ] Added/updated smoke where user flow changed
* [ ] Errors rendered via `getErrorText`
* [ ] Route pages are lazy + default export
* [ ] Bundle diff acceptable (no unexpected chunk bloat)
* [ ] CI green (lint/build/guardrails/smoke)

---

# 🚀 Go-Live Checklist (5-minute runbook)

**Preflight**

* [ ] Checkout **`v0.2-stable`**; `pnpm i && pnpm build`
* [ ] Backend env: CORS allows FE origin, auth endpoints live
* [ ] FE env: `VITE_API_BASE` unset in dev, set to gateway in prod (if needed)

**Deploy**

* [ ] Publish `dist/` to CDN/host; configure SPA fallback to `/index.html`
* [ ] Point FE env to backend; purge CDN cache

**Post-deploy verification**

* [ ] **Auth flow**: login → hub → projects → admin → logout
* [ ] **Network tab**: no `/api/api/...`; every request has `Authorization`, `X-Workspace-Id`, `x-correlation-id`
* [ ] **Refresh path**: force a 401 → refresh → retry → success (or logout)
* [ ] **Error UX**: simulate 500 → toast visible; log contains correlationId

---

# 🧯 Rollback & incident quick-response

**Rollback**

```
git checkout v0.1-stable
pnpm build
# deploy build artifact
```

**If 401 loops**: check refresh endpoint; adjust client's "auth route exclusion" list.
**If 5xx spike**: client surfaces toast; grab `x-correlation-id` from failing call → search backend logs.
**If chunk load error**: purge CDN cache; verify chunk names didn't change vs deployed HTML.

---

# 🧪 Dev quick-start (cheat sheet)

```
pnpm dev             # run vite
pnpm test:guardrails # ensure no fetch()
pnpm test:smoke      # playwright e2e
pnpm ci:verify       # full CI locally
pnpm lint:fix        # autofix lint
```

---

# 📚 Docs to keep in repo

* `docs/ENGINEERING_PLAYBOOK.md` (this page)
* `docs/API-CLIENT.md` (usage patterns & examples)
* `docs/GO-LIVE-CHECKLIST.md` (above runbook)
* `docs/TROUBLESHOOTING.md` (401/refresh, CORS, chunk errors, MSW tips)

---

## Next 3 incremental upgrades (high value, low risk)

1. **Disallow direct `axios` imports** via ESLint rule (except in `lib/api/client.ts`).
2. **Bundle budgets** in CI (fail PR on unexpected chunk > threshold).
3. **Synthetic canary**: tiny cron hitting `/api/health` + mock login; ping Slack on anomalies.
