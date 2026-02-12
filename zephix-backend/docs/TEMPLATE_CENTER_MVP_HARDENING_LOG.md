# Template Center MVP Hardening Log

## Step 1. Snapshot (pre-hardening)

- **Git SHA:** `d2d61badb20743226d8952f4b2c96bc31219a2d9`
- **Node version:** v24.3.0
- **npm ci:** success
- **npm run build:** success
- **npm run test:** exit 1 (78 failed, 212 passed, 53 suites – many pre-existing failures e.g. CSRF, mocks)
- **db:show (migration count):**
  - `migrations_table=present`
  - `executed_count=107`
  - `loaded_migrations=86`

## Template Center endpoints (current)

| Endpoint | Behind TEMPLATE_CENTER_V1 |
|----------|---------------------------|
| GET /api/template-center/templates | No |
| GET /api/template-center/templates/:templateKey | No |
| GET /api/template-center/kpis | No |
| GET /api/template-center/docs | No |
| GET /api/template-center/search | No |
| POST /api/template-center/projects/:projectId/apply | Yes |
| POST /api/template-center/projects/:projectId/documents/:documentId/transition | Yes |
| POST /api/template-center/projects/:projectId/gates/:gateKey/decide | Yes |
| GET /api/template-center/projects/:projectId/evidence-pack | No |

## Build output

- Main entry: `dist/src/main.js` (confirmed present)
- db scripts: `dist/src/scripts/db/show.js`, `migrate.js`, `verify.js` (present)

## Step 14. Railway deploy sequence

- Pre-deploy: run `npm run db:migrate` (node dist/src/scripts/db/migrate.js).
- Healthcheck path: `/api/health/ready` (from railway.toml).
- Start command: `npm run start:railway` → `node dist/src/main.js`.
- Validate logs: BOOT_START, schema_verify_ok (or db:verify), pending_migrations=0, BOOT_BEFORE_LISTEN.
