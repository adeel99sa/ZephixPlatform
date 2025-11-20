# 🚀 Go-Live Checklist (5-minute runbook)

## Preflight

* [ ] Checkout **`v0.2-stable`**; `pnpm i && pnpm build`
* [ ] Backend env: CORS allows FE origin, auth endpoints live
* [ ] FE env: `VITE_API_BASE` unset in dev, set to gateway in prod (if needed)

## Deploy

* [ ] Publish `dist/` to CDN/host; configure SPA fallback to `/index.html`
* [ ] Point FE env to backend; purge CDN cache

## Post-deploy verification

* [ ] **Auth flow**: login → hub → projects → admin → logout
* [ ] **Network tab**: no `/api/api/...`; every request has `Authorization`, `X-Workspace-Id`, `x-correlation-id`
* [ ] **Refresh path**: force a 401 → refresh → retry → success (or logout)
* [ ] **Error UX**: simulate 500 → toast visible; log contains correlationId
* [ ] **Health endpoint**: visit `/health` → shows build tag, git hash, environment
* [ ] **Telemetry**: check console for `[TELEMETRY]` logs (1% sampling)

---

# 🧯 Rollback & incident quick-response

## Rollback

```
git checkout v0.1-stable
pnpm build
# deploy build artifact
```

## Common Issues

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