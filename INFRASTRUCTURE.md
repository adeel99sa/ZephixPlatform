# 🧭 Zephix Infrastructure Overview

## 🏗️ Core Services

| Service Name          | Type            | Role                              | Source                         | Notes                                                      |
| --------------------- | --------------- | --------------------------------- | ------------------------------ | ---------------------------------------------------------- |
| `db-postgres`         | Railway Plugin  | Primary PostgreSQL 16.10 database | Managed plugin                 | Auto-backup enabled, mounted at `/var/lib/postgresql/data` |
| `api-backend`         | Node/NestJS app | REST API layer                    | GitHub repo (`zephix-backend`) | Connects to `DATABASE_URL` via managed plugin              |
| `frontend` (optional) | React app       | User interface                    | GitHub repo                    | Calls backend API over HTTPS                               |

### Service IDs
- **Backend**: `a754bf05-356c-4173-a125-f7e3d40029eb`
- **Database**: `c683d753-f968-49a1-9be8-4e2c491f1041`

## 🔗 Connections

* `DATABASE_URL` and `RAILWAY_SERVICE_POSTGRES_URL` are injected automatically by Railway.
* `JWT_SECRET`, `RAILWAY_ENVIRONMENT`, and `NODE_ENV` come from Railway environment variables.
* All outbound DB connections require SSL (`PGSSLMODE=require`).

## 🔗 Environment Variables

### Backend Service (`api-backend`)
```bash
# Database Connection
DATABASE_URL=postgresql://postgres:***@ballast.proxy.rlwy.net:38318/railway
RAILWAY_SERVICE_POSTGRES_URL=postgres-production-7af2.up.railway.app

# Security
DB_SSL=require
JWT_SECRET=***
JWT_EXPIRES_IN=24h

# CORS
CORS_ALLOWED_ORIGINS=https://getzephix.com,https://www.getzephix.com,https://app.getzephix.com

# External Services
ANTHROPIC_API_KEY=***
SENDGRID_API_KEY=***
```

### Database Service (`db-postgres`)
```bash
# PostgreSQL Configuration
POSTGRES_USER=postgres
POSTGRES_PASSWORD=***
POSTGRES_DB=railway
PGHOST=postgres.railway.internal
PGPORT=5432

# Volume Mount
RAILWAY_VOLUME_NAME=postgres-volume
RAILWAY_VOLUME_MOUNT_PATH=/var/lib/postgresql/data
```

## 🧩 Operational Health Checks

| Layer      | Command                                                               | Expected                   |
| ---------- | --------------------------------------------------------------------- | -------------------------- |
| API        | `curl -s https://zephix-backend-production.up.railway.app/api/health` | JSON `{status:"healthy"}`  |
| Database   | `psql "$DATABASE_URL" -c "select version();"`                         | Returns PostgreSQL version |
| Auth       | `POST /api/auth/login`                                                | Returns JWT `accessToken`  |
| Phases API | `GET /api/projects/:id/phases`                                        | 200 OK + JSON list         |

## 🧰 Maintenance Scripts

### **1. Hygiene Verification**

```bash
./scripts/infra-hygiene.sh
```

**Purpose:** Confirms active connections, DB version, SSL mode, and token validity.
**Frequency:** Monthly or after deployment changes.

### **2. Health Monitor**

```bash
./scripts/health-monitor.sh
```

**Purpose:** Polls `/api/health` and DB connectivity every minute, logs anomalies.
**Recommended:** Attach to CI/CD or uptime monitor.

## 🧼 Routine Hygiene

| Check                                         | Frequency | Owner        | Action                                          |
| --------------------------------------------- | --------- | ------------ | ----------------------------------------------- |
| Rename & label services in Railway            | Once      | DevOps       | Maintain clarity (`db-postgres`, `api-backend`) |
| Validate `DATABASE_URL` & `PGSSLMODE=require` | Monthly   | Backend lead | Security check                                  |
| Verify Railway backups restore                | Quarterly | DBA          | Restore to temp DB and diff                     |
| Review environment variables                  | Quarterly | Security     | Remove stale/test keys                          |
| Run `infra-hygiene.sh`                        | Monthly   | SRE          | Record results in logs                          |

## 🧯 Incident Runbook

### **Symptom:** "Postgres" shows **Failed** in Railway

**Likely cause:** stale UI or historical code-built artifact.
**Verification:**

1. Run `./scripts/infra-hygiene.sh` — DB healthy = false alarm.
2. Run `psql "$DATABASE_URL" -c "select now();"` — live response = OK.
3. Refresh Railway dashboard or contact support with service ID.

### **Symptom:** Backend 500 on `/phases`

**Cause:** schema mismatch or migration gap.
**Fix:** run migrations, check `project_phases` table.

### Common Issues

| Issue | Symptom | Solution |
|-------|---------|----------|
| Database "Failed" in UI | App works, DB responds | Ignore UI status (stale) |
| API returns 500 | Database connection issues | Check `DATABASE_URL` |
| CORS errors | Frontend can't reach API | Verify `CORS_ALLOWED_ORIGINS` |

## 🔒 Security Notes

- **Database**: SSL required (`DB_SSL=require`)
- **JWT**: 24-hour expiration
- **CORS**: Restricted to Zephix domains only
- **Environment**: All secrets in Railway, no local `.env` files

## 📊 Monitoring

### Key Metrics
- **Database**: Active connections (~7 is healthy)
- **API**: Response time < 100ms
- **Memory**: Backend RSS ~56MB, Heap ~55MB

### Alerts
- API health check non-200
- Database connection failures
- High memory usage (>90%)

## 🔄 Backup Strategy

- **Database**: Railway plugin includes automatic backups
- **Volume**: `postgres-volume` mounted for persistence
- **Testing**: Quarterly restore test to temp DB

## 🛠️ Development

### Local Development
```bash
# Use Railway variables locally
railway shell

# Run migrations
npm run migration:run

# Check database
psql "$DATABASE_URL"
```

### Deployment
```bash
# Deploy to Railway
railway up

# Check deployment status
railway status
```

## 🧩 Versioning & Release

* **Current tag:** `v0.3.2`
* **Last verified:** PostgreSQL 16.10 / 7 active conns / memory stable
* **Next checkpoint:** after merging `feat/sprint03-phases-pr` → `main`

## 📞 Support

- **Railway Dashboard**: https://railway.app/dashboard
- **Service IDs**: See table above
- **Logs**: `railway logs --service <service-name>`

## ✅ Bottom Line

* Infra healthy, backed by Railway managed services.
* "Failed" badge in UI is non-functional noise.
* Scripts + documentation now ensure repeatable verification and zero-guess maintenance.

---

**Last Updated**: 2025-10-16  
**Status**: ✅ All systems operational
