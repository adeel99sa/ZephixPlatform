# Backend stabilization sequence

**Root cause in one line:** Production database state and migration history were not aligned, and boot treated that as a fatal error.

Run this sequence in order. Paste the output of Step 1 and Step 2 to diagnose: wrong database URL, migration not running, migration ran but backfill left nulls, or schema verify checking wrong table/schema.

---

## 1. Prove the runtime database and the migration runner database are the same

Run once:

```bash
railway run --service zephix-backend -- node -e "
const { Client } = require('pg');
(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }});
  await c.connect();
  const db = await c.query('select current_database() db, current_user u, inet_server_addr() addr, inet_server_port() port');
  const cols = await c.query(\"select column_name from information_schema.columns where table_schema='public' and table_name='user_organizations' order by column_name\");
  const mig = await c.query('select count(*)::int as n from migrations');
  console.log(JSON.stringify({ db: db.rows[0], migrationRows: mig.rows[0].n, columns: cols.rows.map(r=>r.column_name) }, null, 2));
  await c.end();
})().catch(e=>{ console.error(e); process.exit(1); });
"
```

**Success looks like:**

- `columns` includes `user_id` and `organization_id`
- `migrationRows` is greater than 0

---

## 2. Confirm the new migration ran

Run:

```bash
railway run --service zephix-backend -- node -e "
const { Client } = require('pg');
(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }});
  await c.connect();
  const r = await c.query(\"select name, run_on from migrations order by run_on desc limit 5\");
  console.log(JSON.stringify(r.rows, null, 2));
  await c.end();
})().catch(e=>{ console.error(e); process.exit(1); });
"
```

You should see the migration **UserOrganizationsSnakeCaseColumns17980202500000** in the top rows.

If it is not there: pre-deploy is not executing on the deploy you are looking at, or it is running against a different `DATABASE_URL`.

---

## 3. Make healthcheck tell the truth while you fix schema

- **Non-fatal production behavior is kept.** Boot does not exit on schema verify failure (unless `FAIL_FAST_SCHEMA_VERIFY=true`). This prevents restart loops.
- Hit `/api/health/ready` to see the exact missing pieces (e.g. `missingColumns`).

---

## 4. Decide the data strategy, then lock it

**Option A (fastest; recommended unless you have real production data):**

- Reset the Railway Postgres (delete/recreate DB or new instance).
- Point `DATABASE_URL` at it.
- Redeploy. Let migrations build a clean schema.

**Option B (keep data):**

- Keep the backfill migration `17980202500000-UserOrganizationsSnakeCaseColumns`.
- Do not add more schema changes until the system is healthy.
- After migration runs, rerun the Step 1 column check; `verifyOnBoot` should pass.

---

## Hard rule before every push

**Make Railway the reference build.** Run this before every push:

```bash
cd zephix-backend
npm run prepush
```

(`prepush` runs `tsc --noEmit -p tsconfig.build.json`.)

Also ensure:

- `git status` is clean (or only intended changes).
- `git ls-files` includes every new module you add.

---

## Reference: what is stable now

- Build completes.
- Migrations are visible to the app (`loaded_migrations` moved from 0 to 85).
- Boot no longer fails on missing provider.
- Pre-deploy runs `db:migrate`.
- Healthcheck failures now point to real readiness issues, not silent crashes.

Schema verify is the remaining gate: the database must have `user_organizations.user_id` and `user_organizations.organization_id` (snake_case) per the auth contract and migration.
