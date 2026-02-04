# Railway Backend Deploy Checklist

Do these checks **in this exact order**.

---

## Before Push (Dev Workflow)

Before every push to main or a deploy branch:

```bash
cd zephix-backend
npm run prepush
git status   # must be clean
git ls-files -- 'src/**/*.ts' 'src/**/*.tsx'   # verify new src files are tracked
```

If `git status` shows uncommitted changes, commit or stash before pushing. If `git ls-files` does not show your new source files, run `git add` first.

---

## 0. If start fails with “cd: zephix-backend: No such file or directory”

**Cause:** The start command being run still contains `cd zephix-backend`. When Root Directory is `zephix-backend`, the container **is already** in that directory; there is no `zephix-backend` subfolder, so `cd zephix-backend` fails.

**Repo fix (done):** Root `railway.toml` and `zephix-backend/railway.toml` no longer contain `cd zephix-backend`. Build/start/pre-deploy run without `cd`.

**Fix in Railway UI (mandatory):**

1. **Railway UI:** Service → **Settings** → **Deploy** → find **Custom Start Command** (and Custom Build Command, Pre-deploy Command if present).
2. **Delete the entire value** for each. Make the fields empty. Save.
3. Railway will then use commands from the repo `railway.toml` (no `cd`).
4. Clear build cache and redeploy once.

**Do not** set Custom Start Command to `cd zephix-backend && npm run start:railway` or any variant that changes directory.

---

## 1. Railway service Root Directory

- **Backend service Root Directory must be `zephix-backend`.** Set it in Railway → zephix-backend → Settings → Source → Root Directory.
- **Never use `cd zephix-backend` in any command** (not in `railway.toml`, not in Railway UI overrides). The container already starts in that directory; `cd zephix-backend` fails with “No such file or directory”.

---

## 2. Commands come from the repo (`railway.toml`)

All of these are defined in **`zephix-backend/railway.toml`**. Railway reads that file on deploy. You cannot edit that file inside Railway; you edit it in the repo and push.

- **Build:** `npm run build && npm run check:railway` (Nixpacks runs `npm ci` in the install phase; `check:railway` fails the deploy if `dist/main.js` is missing).
- **Pre-deploy:** `npm run db:migrate`
- **Start:** `npm run start:railway` (runs `node dist/main.js`)
- **Healthcheck Path:** `/api/health/ready`

If you set **Build Command** in Railway UI (e.g. for a non-Nixpacks builder), use: `npm ci && npm run build && npm run check:railway`.

---

## 3. Railway UI — do not override with wrong values

In Railway → zephix-backend → **Settings** (Build / Deploy):

- If the UI shows “The value is set in **zephix-backend/railway.toml**”, the repo is the source; that is correct.
- **Do not set** Custom Build Command, Pre-deploy Command, Custom Start Command, or Healthcheck Path to anything that includes `cd zephix-backend`.
- If Healthcheck Path is shown as `/api/health`, change it in the UI to **`/api/health/ready`** (or clear the override so the file value is used).

See **RAILWAY_BACKEND_SINGLE_SOURCE.md** for the full table and why overrides cause the “cd zephix-backend” failure.

---

## 4. Health path uses global prefix

The app uses global prefix `api`. Healthcheck must be **`/api/health/ready`**, not `/health/ready` or `/api/health`.

---

## 5. Redeploy and read logs

After redeploy, you want to see these lines **in order**:

1. **BOOT_START**
2. **BOOT_AFTER_NEST_CREATE**
3. **schema_verify_ok**
4. **pending_migrations=0**
5. **BOOT_BEFORE_LISTEN**
6. Healthcheck passes on `/api/health/ready`

If the container stops again, capture **Deploy logs from BOOT_START to the first error line** and share that (e.g. one screenshot).

---

## 6. If you see “Missing script: db:migrate”

Confirm Root Directory is `zephix-backend` (so Railway uses `zephix-backend/package.json`). Then send:

1. **zephix-backend/package.json** — scripts section showing `db:migrate`, `start:railway`, `build`.
2. **Railway deployment log** around “Running Pre-deploy Command” and the working directory Railway prints.

---

## 7. Schema verify / DB–migration alignment

If healthcheck fails with schema verify or missing user_organizations.user_id / organization_id, run the exact stabilization sequence in **docs/STABILIZATION_SEQUENCE.md**: Step 1 (prove DB = migration DB), Step 2 (confirm new migration ran), then Option A (reset Postgres) or Option B (keep data, let backfill migration run). Before every push: `cd zephix-backend && npm run prepush`.

---

## 8. Lock-in and validation (Railway UI + deploy sequence)

**In Railway UI (do once):**

1. **Healthcheck:** Service → Settings → Health → **Path** = `/api/health/ready`, **Timeout** = `120`.
2. **Replicas:** Set to **1** for the next two deploys; after validation set to **2** and deploy again.
3. **Env:** Ensure **DEBUG_BOOT** and **FAIL_FAST_SCHEMA_VERIFY** are **not set** (delete if present). Remove **NO_CACHE** if it was added during the incident.

**Deploy sequence:**

1. Deploy from the branch that has commit `b8fc3bb5` (e.g. `fix/railway-start-path`).
2. After deploy: `curl -s https://<backend-url>/api/health/ready | jq` → confirm `status` ok, `checks.db.status` ok, `checks.schema.status` skipped or ok.
3. Restart the service once (Railway → Service → ⋮ → Restart).
4. Hit `/api/health/ready` again → must stay 200.
5. Set replicas to **2**, deploy again.

**Frontend smoke:** Login → GET `/api/users/me`, GET `/api/workspaces` → select a workspace → confirm no 500s in Network tab.

**If anything fails,** paste only: `/api/health/ready` JSON, first 30 lines after BOOT_START, and any DatabaseVerifyService error block.
