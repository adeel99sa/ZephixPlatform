# Frontend deploy (Railway staging)

## Command (always)

From the **monorepo root** (for example `ZephixApp-main-sync`), with staging tip checked out:

```bash
railway up -s zephix-frontend -e staging
```

Do **not** run `railway up` from inside `zephix-frontend/`.

## Why

The Railway `zephix-frontend` service has `rootDirectory: zephix-frontend`. A deploy issued from inside that directory uploads an archive that is **missing** the nested `zephix-frontend/` path Nixpacks expects. The build **FAILS**. Railway keeps serving the last successful deployment — the site looks fine, nothing shipped.

Silent failure mode (OV-1 Phase A Stage 2, 2026-07-14): public FE stayed on pre-change asset hash while CLI returned upload IDs that were FAILED in GraphQL.
