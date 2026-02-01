# Railway Backend Deploy Checklist

Do these checks **in this exact order**.

---

## 1. Railway service Root Directory

- **Backend service Root Directory must be `zephix-backend`.** Set it in Railway → zephix-backend → Settings → Source → Root Directory.
- **Never use `cd zephix-backend` in any command** (not in `railway.toml`, not in Railway UI overrides). The container already starts in that directory; `cd zephix-backend` fails with “No such file or directory”.

---

## 2. Commands come from the repo (`railway.toml`)

All of these are defined in **`zephix-backend/railway.toml`**. Railway reads that file on deploy. You cannot edit that file inside Railway; you edit it in the repo and push.

- **Build:** `npm run build` only (Nixpacks runs `npm ci` once in the install phase; do not add `npm ci` to the build command or you get EBUSY).
- **Pre-deploy:** `npm run db:migrate`
- **Start:** `npm run start:railway`
- **Healthcheck Path:** `/api/health/ready`

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
