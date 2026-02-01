# Railway Backend Failure — Root Cause

## What You See

```
Starting Container
Stopping Container
npm error Missing script: "db:migrate"
npm error Did you mean this?
npm error   npm run migrate
```

Pre-deploy fails, then the container stops.

---

## Root Cause (single reason)

**Railway runs the Pre-deploy command from the repository root**, not from the service Root Directory (`zephix-backend`).

So when Pre-deploy is set to `npm run db:migrate`:

1. The command runs in the **monorepo root** (where the root `package.json` lives).
2. The root `package.json` (name: `zephix-app`) has scripts like `verify`, `verify:backend`, `guard:deploy` — it does **not** have `db:migrate` or `start:railway`.
3. `db:migrate` and `start:railway` exist only in **`zephix-backend/package.json`**.
4. So `npm run db:migrate` in the root fails with **Missing script: "db:migrate"**.

Railway’s Pre-deploy runs in a separate step (often from repo root in monorepos), so the “Root Directory = zephix-backend” setting does **not** change the Pre-deploy working directory. Build and Start may run from the service root inside the image; Pre-deploy does not.

---

## Evidence

| Item | Repo root `package.json` | `zephix-backend/package.json` |
|------|---------------------------|-------------------------------|
| Has `db:migrate` | No | Yes |
| Has `start:railway` | No | Yes |
| Has `build` (nest build) | No | Yes |

Pre-deploy runs where the root `package.json` is used → **Missing script: "db:migrate"**.

---

## Fix (one change)

Pre-deploy must run **inside the backend directory** so it uses `zephix-backend/package.json`.

**Option A — In Railway UI (Settings → Deploy)**  
Set **Pre-deploy Command** to:

```bash
cd zephix-backend && npm run db:migrate
```

**Option B — In `zephix-backend/railway.toml`**  
Set:

```toml
[deploy]
preDeployCommand = "cd zephix-backend && npm run db:migrate"
```

(Config-as-code overrides UI; both must use the same command.)

**If after this fix you see "no such file or directory: zephix-backend"**, then Pre-deploy runs inside the built image where `/app` is already the backend. In that case set Pre-deploy to just `npm run db:migrate` (no `cd`) and remove `preDeployCommand` from `railway.toml` or set it to `"npm run db:migrate"`.

---

## Do not redeploy until

1. Pre-deploy is set to **`cd zephix-backend && npm run db:migrate`** (in UI or in `railway.toml`).
2. You have pushed the change (if using `railway.toml`).

After that, the next deploy should run migrations from the correct `package.json` and then start the app.
