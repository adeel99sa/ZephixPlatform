# Railway Scaling and Worker Service Guide

## API Service Scaling (zephix-backend)

### Current Configuration
- **Service:** `zephix-backend`
- **Replicas:** 2 (scaled from 1)
- **Purpose:** API-only service, handles HTTP requests

### Environment Variables (Frozen)
```
OUTBOX_PROCESSOR_ENABLED=false          ⚠️ MUST STAY FALSE FOREVER
REQUEST_CONTEXT_LOGGER_ENABLED=false
TYPEORM_LOGGING=false
```

### Scaling Verification Checklist

After scaling to 2+ replicas, verify:

1. **No Outbox Processing Logs**
   ```bash
   railway logs | grep -i "outbox\|OutboxProcessorService"
   # Should show: "OutboxProcessorService disabled" (once per replica on boot)
   # Should NOT show: "Processing outbox events" or "auth_outbox" queries
   ```

2. **No Query Spam**
   ```bash
   railway logs | grep -i "query:"
   # Should be empty (TYPEORM_LOGGING=false)
   ```

3. **No Request Log Spam**
   ```bash
   railway logs | grep -i "request_start\|request_end"
   # Should be empty (REQUEST_CONTEXT_LOGGER_ENABLED=false)
   ```

4. **Health Checks Passing**
   ```bash
   curl https://zephix-backend-production.up.railway.app/api/health
   # Should return HTTP 200 quickly (< 500ms)
   ```

### Expected Behavior with Multiple Replicas

- ✅ Each replica handles HTTP requests independently
- ✅ No outbox processing (disabled via env var)
- ✅ No duplicate cron jobs
- ✅ Load balanced across replicas
- ✅ Health checks pass for all replicas

## Worker Service Setup (zephix-worker)

### When to Create Worker Service

Create a dedicated worker service when you need:
- Email delivery (verification, invites)
- Background job processing
- Scheduled tasks

### Step-by-Step Setup

#### 1. Create New Railway Service

1. Railway Dashboard → Your Project
2. Click **"New"** → **"Service"**
3. Select **"GitHub Repo"** → Choose `adeel99sa/ZephixPlatform`
4. Name: **`zephix-worker`**

#### 2. Configure Service Settings

**Root Directory:** `zephix-backend`

**Start Command:**
```
npm run start:railway
```

**Replicas:** 1 (only one worker instance needed)

**Public Networking:** Disabled (worker doesn't need HTTP access)

#### 3. Set Environment Variables

**Worker-Specific:**
```
OUTBOX_PROCESSOR_ENABLED=true
```

**Copy from zephix-backend service:**
```
TYPEORM_LOGGING=false
REQUEST_CONTEXT_LOGGER_ENABLED=false
DATABASE_URL=<same as API service>
JWT_SECRET=<same as API service>
INTEGRATION_ENCRYPTION_KEY=<same as API service>
# ... all other secrets and config vars
```

**How to copy variables:**
1. Railway → `zephix-backend` → Variables
2. Note all variable names and values
3. Railway → `zephix-worker` → Variables
4. Add each variable (set `OUTBOX_PROCESSOR_ENABLED=true` instead of false)

#### 4. Verify Worker is Running

**Expected Boot Logs:**
```
[Nest] X - LOG [OutboxProcessorService] OutboxProcessorService enabled: OUTBOX_PROCESSOR_ENABLED is set to "true"
```

**Expected Runtime Logs (every minute):**
```
[Nest] X - LOG [OutboxProcessorService] Processing outbox events...
[Nest] X - LOG [OutboxProcessorService] Processed 5 pending events
```

**Should NOT see:**
- `query:` spam (TYPEORM_LOGGING=false)
- `request_start`/`request_end` logs (REQUEST_CONTEXT_LOGGER_ENABLED=false)
- Health check logs (no HTTP traffic)

#### 5. Verify Separation

**On zephix-backend logs:**
```bash
railway logs --service zephix-backend | grep -i "outbox"
# Should only show: "OutboxProcessorService disabled" (on boot)
# Should NOT show: "Processing outbox events"
```

**On zephix-worker logs:**
```bash
railway logs --service zephix-worker | grep -i "outbox"
# Should show: "OutboxProcessorService enabled" (on boot)
# Should show: "Processing outbox events" (every minute)
```

## Architecture Diagram

```
┌─────────────────────┐
│  zephix-backend     │
│  (API Service)      │
│                     │
│  Replicas: 2        │
│  OUTBOX: false      │
│  Purpose: HTTP API  │
└─────────────────────┘
         │
         │ HTTP Requests
         ▼
    [Load Balancer]
         │
         │ Database Queries
         ▼
┌─────────────────────┐
│   PostgreSQL DB     │
│                     │
│  auth_outbox table  │
└─────────────────────┘
         ▲
         │ Background Jobs
         │
┌─────────────────────┐
│  zephix-worker      │
│  (Worker Service)   │
│                     │
│  Replicas: 1        │
│  OUTBOX: true       │
│  Purpose: Background│
└─────────────────────┘
```

## Troubleshooting

### Worker Not Processing

1. Check `OUTBOX_PROCESSOR_ENABLED=true` is set
2. Verify `DATABASE_URL` matches API service
3. Check migrations ran (auth_outbox table exists)
4. Check Railway logs for errors

### Duplicate Processing

- Ensure only 1 worker replica (or use SKIP LOCKED which is already implemented)
- Check `isProcessing` flag prevents concurrent runs

### High Database Load

- Verify composite indexes exist (migration `1796000000001`)
- Check query limits (currently 25 events per run)
- Monitor query execution time

## Safety Guards

### Code-Level Guard

The `OutboxProcessorService` includes a safety guard comment:
```typescript
/**
 * ⚠️ SAFETY GUARD: API Service Configuration
 * ===========================================
 * The zephix-backend API service MUST have OUTBOX_PROCESSOR_ENABLED=false.
 * This service is API-only and should never process outbox events.
 */
```

### Environment Variable Guard

- `OUTBOX_PROCESSOR_ENABLED=false` on `zephix-backend` (API service)
- `OUTBOX_PROCESSOR_ENABLED=true` on `zephix-worker` (worker service only)

### CI Guardrail (Future)

Consider adding a CI check that fails if `OUTBOX_PROCESSOR_ENABLED=true` is detected in production API service config.
