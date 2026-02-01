# Railway Backend Deploy Checklist

Do these checks **in this exact order**.

---

## 1. Railway service Root Directory

- **Backend service Root Directory must be `zephix-backend`.**
- If it is **repo root**, `db:migrate` and `start:railway` resolve to the wrong `package.json` and Railway prints **Missing script: db:migrate**.
- **If it is repo root:** switch `railway.toml` to **Variant B** and set Pre-deploy to:
  ```text
  cd zephix-backend && npm run db:migrate
  ```
- **Variant B** in `railway.toml`: use `cd zephix-backend &&` in `buildCommand`, `startCommand`, and `postBuildCommand` (see comments at top of `railway.toml`).

---

## 2. Railway Deploy settings

Set these in **Railway UI** for the **backend** service (Settings → Deploy / Build):

| Setting | Value |
|--------|--------|
| **Pre-deploy Command** | `npm run db:migrate` |
| **Start Command** | `npm run start:railway` |
| **Healthcheck Path** | **`/api/health/ready`** (not `/api/health`). After deploy, confirm the UI shows `/api/health/ready`. If it shows `/api/health`, change it manually in Railway UI. |
| **Replicas** | **1** for the next deploy until you get one clean deploy with migrations and readiness green. Then raise to **2**. |

(If Root Directory is repo root, Pre-deploy = `cd zephix-backend && npm run db:migrate`.)

---

## 3. Health paths must use the global prefix

The app uses **global prefix `api`**. All health probes must use:

- **Liveness:** `/api/health/live`
- **Readiness:** `/api/health/ready`

If Railway is set to `/health/live` or `/health/ready` (without `/api`), it will **404** and restart the container. Set **Healthcheck Path** to **`/api/health/ready`** only.

---

## 4. Redeploy and read logs in this order

After redeploy, you want to see these lines **in order**, with no crash between them:

1. **BOOT_START**
2. **BOOT_AFTER_NEST_CREATE**
3. **schema_verify_ok**
4. **pending_migrations=0**
5. **BOOT_BEFORE_LISTEN**

If the container stops again, paste the lines from **BOOT_START** through the **first error line** after it. That block is enough to produce the next patch.

---

## 5. If you see "Missing script: db:migrate" — send these 2 screenshots

Do **not** change package.json or Pre-deploy command until the architect has seen:

1. **zephix-backend/package.json, scripts section visible**  
   Must show: `db:migrate`, `start:railway`, `start:prod`, `build`, `build:migrations`.

2. **Railway deployment log around pre-deploy**  
   The lines right before and after “Running Pre-deploy Command” (or equivalent), including the exact working directory if Railway prints it.

Then you will get one exact fix: either patch package.json, or Pre-deploy = `cd zephix-backend && npm run db:migrate`, or set Healthcheck/Pre-deploy in UI only if config-as-code is ignored.
