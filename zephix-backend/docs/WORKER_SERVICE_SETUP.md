# Worker Service Setup Guide

## Overview

The Zephix backend includes background workers (e.g., `OutboxProcessorService`) that should run in a separate service from the API to avoid:
- Noisy logs in API service
- Database load from cron jobs
- Race conditions across replicas
- Log rate limit throttling

## Current Configuration

**API Service (zephix-backend):**
- `OUTBOX_PROCESSOR_ENABLED=false` - Worker disabled
- `REQUEST_CONTEXT_LOGGER_ENABLED=false` - Minimal logging
- `TYPEORM_LOGGING=false` - No query logging

## Setting Up a Dedicated Worker Service

### 1. Create New Railway Service

1. Go to Railway Dashboard → Your Project
2. Click "New" → "Service"
3. Select "GitHub Repo" → Choose your repository
4. Name it: `zephix-worker`

### 2. Configure Service Settings

**Root Directory:** `zephix-backend` (same as API service)

**Start Command:** 
- Option A (same app, worker enabled):
  ```
  npm run start:railway
  ```
- Option B (dedicated worker entry point, if created):
  ```
  node dist/src/worker.js
  ```

### 3. Set Environment Variables

**Required:**
```
OUTBOX_PROCESSOR_ENABLED=true
TYPEORM_LOGGING=false
REQUEST_CONTEXT_LOGGER_ENABLED=false
DATABASE_URL=<same as API service>
JWT_SECRET=<same as API service>
INTEGRATION_ENCRYPTION_KEY=<same as API service>
```

**Copy from API service:**
- All database connection vars
- All auth/secrets
- All feature flags

**Worker-specific:**
- `OUTBOX_PROCESSOR_ENABLED=true` (only difference from API service)

### 4. Verify Worker is Running

Check Railway logs for:
```
✅ RequestContextLoggerInterceptor disabled
OutboxProcessorService enabled: OUTBOX_PROCESSOR_ENABLED is set to "true"
```

You should see:
- Worker processing outbox events every minute
- No request logs (REQUEST_CONTEXT_LOGGER_ENABLED=false)
- No query logs (TYPEORM_LOGGING=false)

## Architecture Benefits

**Separation of Concerns:**
- API service: Handles HTTP requests only
- Worker service: Handles background jobs only

**Scalability:**
- Scale API replicas independently
- Run single worker instance (or controlled replicas with SKIP LOCKED)

**Observability:**
- Worker logs separate from API logs
- Easier to debug background job issues

## Troubleshooting

**Worker not processing:**
- Check `OUTBOX_PROCESSOR_ENABLED=true` is set
- Check `DATABASE_URL` is correct
- Check migrations have run (auth_outbox table exists)
- Check Railway logs for "OutboxProcessorService disabled" message

**Duplicate processing:**
- Ensure only one worker replica runs (or use SKIP LOCKED which is already implemented)
- Check `isProcessing` flag prevents concurrent runs

**High database load:**
- Verify composite indexes are created (migration `1796000000001`)
- Check `LIMIT 25` in queries is appropriate
- Monitor query execution time in logs
