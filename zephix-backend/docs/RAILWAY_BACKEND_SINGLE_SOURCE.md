# Railway Backend — Single Source of Truth

**You cannot edit `railway.toml` inside Railway.** The file lives in the repo. Railway reads it when you deploy. So the fix is: get `zephix-backend/railway.toml` right in the repo and push. Then ensure Railway UI does **not** override it with wrong values.

---

## Root cause of past failures (summary)

| Failure | Error | Cause | Fix |
|--------|------|--------|-----|
| 1 | TS5058 path does not exist (`tsconfig.migrations.json`) | File not on GitHub branch Railway builds from | Push branch so file is on origin |
| 2 | EBUSY rmdir `/app/node_modules/.cache` | `npm ci` run twice (Nixpacks install + buildCommand) | `buildCommand = "npm run build"` only; Nixpacks runs `npm ci` once in install |
| 3 | `cd: zephix-backend: No such file or directory` | Root Directory is already `zephix-backend`; a command (often from **Railway UI override**) still did `cd zephix-backend` | No `cd zephix-backend` anywhere; remove UI overrides that add it |
| 4 | Healthcheck fails / wrong path | Healthcheck Path was `/api/health` | Must be `/api/health/ready` |

---

## What is fixed in the repo (`railway.toml`)

- **Root Directory** is set in Railway UI to `zephix-backend`. The container CWD is already that folder. So **no command in the repo** uses `cd zephix-backend`.
- **Build:** `buildCommand = "npm run build"` only. Nixpacks install phase runs `npm ci --legacy-peer-deps` once; build phase runs `npm run build`. No double install → no EBUSY.
- **Deploy:** `preDeployCommand = "npm run db:migrate"`, `startCommand = "npm run start:railway"`, `healthcheckPath = "/api/health/ready"`. No `cd` in any of them.

---

## Railway UI — do not override with wrong values

Railway can show “The value is set in **zephix-backend/railway.toml**”. That means the value comes from the repo file. If you later set a **custom** value in the UI, it **overrides** the file.

To avoid the “cd zephix-backend” failure:

1. **Root Directory** (Settings → Source): must be **`zephix-backend`**.
2. **Custom Build Command**: leave blank so it uses the file, or set exactly: `npm run build` (no `npm ci`, no `cd zephix-backend`).
3. **Pre-deploy Command**: leave blank so it uses the file, or set exactly: `npm run db:migrate` (no `cd zephix-backend`).
4. **Custom Start Command**: leave blank so it uses the file, or set exactly: `npm run start:railway` (no `cd zephix-backend`).
5. **Healthcheck Path**: leave blank so it uses the file, or set exactly: `/api/health/ready` (not `/api/health`).

If any of these are set in the UI to something that includes `cd zephix-backend`, the container will fail with “cd: zephix-backend: No such file or directory” because the app is already running inside `zephix-backend`.

---

## After you push

1. Railway → zephix-backend → **Settings**: confirm Build / Deploy values match the table above (no `cd`, healthcheck `/api/health/ready`). Clear any override that adds `cd zephix-backend`.
2. **Deployments** → **Redeploy** (or “Clear build cache and redeploy” once).
3. In deploy logs, confirm in order: BOOT_START → BOOT_AFTER_NEST_CREATE → schema_verify_ok → pending_migrations=0 → BOOT_BEFORE_LISTEN → healthcheck passes on `/api/health/ready`.

If it still fails, send one screenshot: **Deploy logs from BOOT_START to the first error line.**
