# Local development setup — full stack

**Audience:** Full-stack developers  
**Goal:** Run PostgreSQL + NestJS backend + Vite frontend on macOS so you can test changes without deploying to Railway staging.

**Prerequisites:** Docker Desktop (optional but recommended for Postgres). Install from [Docker Desktop](https://www.docker.com/products/docker-desktop/).

---

## Docker basics (first time using Docker?)

You only need a small mental model to run Zephix locally.

### What you are doing

Docker runs **isolated Linux processes** on your Mac (inside a lightweight VM). For Zephix, we use it to run **PostgreSQL** so you do not have to install Postgres with Homebrew. Your **Nest app and Vite app still run on your Mac normally** (`npm run start:dev`, `npm run dev`) — only the database is inside Docker.

### Three words to remember

| Term | Meaning |
|------|--------|
| **Image** | A read-only template (e.g. `postgres:16`). Think “installer disk.” |
| **Container** | A running (or stopped) instance created from an image. Think “a running program.” |
| **Volume** | Named disk space Docker keeps for a container so **database files survive** when you stop/start the container. |

### Docker Desktop (what you see on screen)

1. **Engine running** (bottom-left) must be green. If Docker is off, start **Docker Desktop** from Applications.
2. **Containers** lists every container. A **gray** dot = stopped; **green** = running.
3. **Play** ▶ starts a stopped container; you can also use Terminal commands below.
4. Old containers like `zephix-backend` or `zephix-local-vali` are **not** the Postgres from this guide unless you created them for that purpose. This guide expects a container named **`zephix-postgres`**. If you do not see it, create it in Step 1.

### Commands you will actually use

```bash
# Is Docker responding?
docker info

# List RUNNING containers
docker ps

# List ALL containers (including stopped)
docker ps -a

# Start an existing stopped container by name
docker start zephix-postgres

# Stop it (data in the volume is kept)
docker stop zephix-postgres

# See logs if Postgres fails to start
docker logs zephix-postgres
```

### First-time: create the Postgres container

When you run the `docker run ...` block in **Step 1**, Docker will:

1. **Download** the `postgres:16` image once (needs internet).
2. **Create** a container named `zephix-postgres`.
3. **Map** port `5432` on your Mac to Postgres inside the container (`-p 5432:5432`).
4. **Store** data in a volume named `zephix_pgdata` so your DB survives restarts.

### Common problems

| Problem | What to do |
|--------|------------|
| `The name "zephix-postgres" is already in use` | You already created it. Run `docker start zephix-postgres` or remove the old one: `docker rm -f zephix-postgres` (only if you are OK losing that container’s data unless it used the same volume — when unsure, ask before `rm`). |
| Port `5432` already allocated | Something else is using Postgres (another container or Homebrew Postgres). Stop it or change the left side of the port mapping, e.g. `-p 5433:5432` and set `DATABASE_URL` to use port `5433`. |
| `Cannot connect to the Docker daemon` | Open Docker Desktop and wait until **Engine running** is healthy. |

### Trust but verify

After Step 1, `docker ps` should show **`zephix-postgres`** with **STATUS** “Up …” and port **0.0.0.0:5432->5432/tcp**. Then your backend `.env` can use `localhost:5432` in `DATABASE_URL`.

---

## Step 1: Start local PostgreSQL

```bash
# Check if Docker is running
docker info > /dev/null 2>&1 && echo "Docker is running" || echo "Start Docker Desktop first"

# Create and start PostgreSQL container
docker run -d \
  --name zephix-postgres \
  -p 5432:5432 \
  -e POSTGRES_USER=zephix \
  -e POSTGRES_PASSWORD=zephix_local \
  -e POSTGRES_DB=zephix_dev \
  -v zephix_pgdata:/var/lib/postgresql/data \
  postgres:16

# Verify it's running
docker ps | grep zephix-postgres

# Test connection
docker exec zephix-postgres psql -U zephix -d zephix_dev -c "SELECT 1 AS connected;"
```

**If you already have PostgreSQL via Homebrew**, skip Docker and create a database:

```bash
createdb zephix_dev
```

Adjust `DATABASE_URL` in Step 2 to match your local user/password.

---

## Step 2: Configure backend environment

```bash
cd zephix-backend

ls -la .env 2>/dev/null && echo ".env exists — review and merge" || echo "Create .env"
```

Create or update `zephix-backend/.env`. **Generate secrets first** (the API exits on boot if these are missing or shorter than 32 characters):

```bash
openssl rand -hex 32   # INTEGRATION_ENCRYPTION_KEY
openssl rand -hex 32   # REFRESH_TOKEN_PEPPER
openssl rand -hex 32   # JWT_SECRET
openssl rand -hex 32   # JWT_REFRESH_SECRET
```

**Use the JWT variable names the app reads** (`JWT_EXPIRES_IN` / `JWT_REFRESH_EXPIRES_IN`, not `JWT_EXPIRATION`):

```bash
# ============================================
# Zephix local development
# ============================================

DATABASE_URL=postgresql://zephix:zephix_local@localhost:5432/zephix_dev
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=zephix
DB_PASSWORD=zephix_local
DB_DATABASE=zephix_dev

NODE_ENV=development
ZEPHIX_ENV=development
PORT=3000

# Required at boot (see zephix-backend/src/main.ts) — each must be ≥ 32 characters
# Generate: openssl rand -hex 32   (run three times for three different values)
INTEGRATION_ENCRYPTION_KEY=REPLACE_WITH_64_HEX_CHARS_FROM_openssl_rand_hex_32
REFRESH_TOKEN_PEPPER=REPLACE_WITH_ANOTHER_64_HEX_CHARS_FROM_openssl_rand_hex_32

# JWT — must match names in src/config/configuration.ts / jwt.config.ts (≥ 32 chars each)
JWT_SECRET=REPLACE_WITH_THIRD_64_HEX_CHARS_FROM_openssl_rand_hex_32
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=REPLACE_WITH_FOURTH_64_HEX_CHARS_FROM_openssl_rand_hex_32
JWT_REFRESH_EXPIRES_IN=7d

# CORS — Vite dev server (use the exact origin you open in the browser)
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000

# CSRF — set a long random string if your auth module requires it
# CSRF_SECRET=...

FRONTEND_URL=http://localhost:5173

# Rate limiting — relaxed for local
AUTH_RATE_LIMIT_MAX=100
AUTH_RATE_LIMIT_WINDOW_MS=900000

LOG_LEVEL=debug
```

**Email:** Copy `SENDGRID_API_KEY` (and related vars) from Railway staging if you need verification/password emails locally; otherwise those flows may no-op or log links in the console.

**Cookies:** Prefer logging in at **`http://localhost:5173`** consistently; mixing `127.0.0.1` and `localhost` splits cookies.

---

## Step 3: Install dependencies and build backend

```bash
cd zephix-backend
npm ci
npm run build
```

Migrations in this repo run from **compiled** output (`dist/...`), so build before `db:migrate`.

---

## Step 4: Run database migrations

```bash
cd zephix-backend
npm run db:migrate
```

This runs TypeORM against `dist/src/config/data-source-migrate.js` (see `package.json`).

**Verify:**

```bash
docker exec zephix-postgres psql -U zephix -d zephix_dev -c "SELECT COUNT(*) FROM migrations;"
```

The exact row count changes over time; a non‑empty table means migrations have run.

**Useful fixes:**

```bash
docker exec zephix-postgres psql -U zephix -d zephix_dev -c 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";'
```

---

## Step 5: Seed initial data (optional)

The repo provides several scripts, for example:

```bash
cd zephix-backend
# Example: developer-oriented seed (see package.json for others)
npm run dev-seed
```

Other entries include `seed:demo`, `seed:system-templates`, `demo:bootstrap`, etc. Pick what your lane needs; read `package.json` scripts and script headers.

---

## Step 6: Start the backend

```bash
cd zephix-backend
npm run start:dev
```

Expect Nest to listen on **port 3000** (see `PORT` in `.env`).

**Health check (global prefix is `/api`):**

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health/ready
# Expect 200 when DB is reachable
```

Leave this terminal running.

---

## Step 7: Start the frontend

```bash
cd zephix-frontend
npm ci
npm run dev
```

In **development**, `src/lib/api.ts` uses **`baseURL: "/api"`** and Vite proxies `/api` → `http://localhost:3000` (see `vite.config.ts`). You typically **do not** need `VITE_API_URL` for local dev unless you have customized the client.

Open **http://localhost:5173**.

---

## Step 8: Sign in locally

Staging session cookies **do not** apply to `localhost`. Register or sign in **on the local app** after the API and DB are ready.

If registration requires email verification and SendGrid is unset, check backend logs for verification tokens or use org-approved seed scripts.

---

## Step 9: Verify

- **Network:** Requests should appear as `http://localhost:5173/api/...` and return **200** for authenticated routes (not **401** everywhere).
- **Administration → Preferences:** `GET /api/users/me/preferences` should succeed so the form renders.
- **No CORS errors** if `CORS_ALLOWED_ORIGINS` includes the exact browser origin you use.

---

## Step 10: Daily workflow

```bash
# Postgres (if stopped)
docker start zephix-postgres

# Terminal 1
cd zephix-backend && npm run start:dev

# Terminal 2
cd zephix-frontend && npm run dev
```

After pulling changes:

```bash
git pull origin staging
cd zephix-backend && npm ci && npm run build && npm run db:migrate
cd ../zephix-frontend && npm ci
```

**`npm run db:migrate`** must run from **`zephix-backend`** (so `.env` is found). It requires **`npm run build`** first (the CLI loads `dist/src/config/data-source-migrate.js`). Ensure **`DATABASE_URL`** is set in **`zephix-backend/.env`** (the script loads it automatically).

---

## Staging parity (what “works on staging” implies locally)

Use the **same branch** you deploy (e.g. `staging`), run **migrations** on your local DB, and keep **one browser origin** for the app (prefer `http://localhost:5173`, not mixed with `127.0.0.1`) so cookies and CSRF match how the dev proxy expects requests.

- **Workspace create (`POST /api/workspaces`)** requires **organization admin** platform role and a JWT with **`organizationId`**. Members/viewers get **403**, not 400. A **400** often means validation (`VALIDATION_ERROR`), missing org on the token, or CSRF/body issues—check the Network tab response JSON for `message` / `code`.
- **API base URL:** In dev the Vite app should call **`/api`** (proxied to `http://localhost:3000`). Only set **`VITE_API_URL`** when pointing the production build at a remote API.

---

## Troubleshooting

| Symptom | What to check |
|--------|----------------|
| Cannot connect to DB | `docker ps`, `DATABASE_URL`, Postgres listening on 5432 |
| Port 3000 in use | `lsof -i :3000` / `npm run dev:killport` in backend |
| Port 5173 in use | `lsof -i :5173` |
| CORS errors | `CORS_ALLOWED_ORIGINS` includes `http://localhost:5173` (and match `127.0.0.1` if you use it) |
| 401 on all API calls | Log in on localhost; confirm `JWT_SECRET` and `JWT_REFRESH_SECRET` set |
| Migration errors | Run `npm run build` first; verify `DATABASE_URL`; `uuid-ossp` extension |
| Preferences page empty / error | Backend up, migrations ran, user logged in on localhost, `/api/users/me/preferences` returns 200 |
| `Query data cannot be undefined` for `["favorites"]` | Fixed by unwrapping `{ __zephixInner }` from the API client; ensure frontend includes `unwrapApiData` for envelope+meta responses |
| **400** on `POST /api/workspaces` | Response body: `MISSING_ORGANIZATION_ID` → re-login after org assignment; `VALIDATION_ERROR` → payload shape; ensure CSRF cookie/token for mutating requests |
| `relation "migrations" already exists` during `npm run db:migrate` | A **`migrations`** table is already in the DB (often from a prior run or another tool), but TypeORM didn’t recognize it and tried `CREATE TABLE` again. **Local dev only:** inspect with `psql "$DATABASE_URL" -c '\d migrations'` — if the table is empty or you can reset the DB, run `DROP TABLE IF EXISTS public.migrations CASCADE;` then `npm run db:migrate` again. If it already has TypeORM rows (`id`, `timestamp`, `name`), stop and compare with `SELECT * FROM migrations LIMIT 5;` before dropping. |

---

## Related

- Backend env template: `zephix-backend/README.md`
- Vite proxy: `zephix-frontend/vite.config.ts`
