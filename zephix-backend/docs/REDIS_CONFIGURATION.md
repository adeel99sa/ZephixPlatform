# Redis Configuration Guide

## Overview

Zephix Backend can run with or without Redis. When Redis is not configured, the application will start successfully but queue operations will be disabled.

## Configuration Options

### 1. With Redis (Recommended for Production)

Set the `REDIS_URL` environment variable:

```bash
# Railway/Production
REDIS_URL=redis://username:password@host:port

# Local Development
REDIS_URL=redis://localhost:6379
```

**Benefits:**
- Full queue functionality (role seeding, file processing, LLM calls, emails)
- Background job processing
- Job retry and failure handling
- Queue monitoring and health checks

### 2. Without Redis (Development/Testing)

Leave `REDIS_URL` unset or empty:

```bash
# No Redis configuration needed
# The app will start without Redis
```

**Behavior:**
- App starts successfully
- Queue operations return mock job IDs
- Workers don't start
- Health checks show "Redis not configured"
- All other functionality works normally

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `REDIS_URL` | No | - | Full Redis connection URL |
| `REDIS_HOST` | No | localhost | Redis host (used if REDIS_URL not set) |
| `REDIS_PORT` | No | 6379 | Redis port (used if REDIS_URL not set) |
| `REDIS_PASSWORD` | No | - | Redis password (used if REDIS_URL not set) |
| `REDIS_TLS` | No | false | Enable TLS connection |

## Railway Deployment

### Without Redis Service

1. **Don't add Redis service** to your Railway project
2. **Don't set REDIS_URL** environment variable
3. App will start successfully with queue operations disabled

### With Redis Service

1. **Add Redis service** to your Railway project
2. **Set REDIS_URL** from Railway's Redis service
3. Full queue functionality will be available

## Health Check Responses

### With Redis Configured

```json
{
  "status": "up",
  "details": {
    "redis": "connected",
    "redisPing": "PONG",
    "workerStatus": {
      "status": "Redis configured",
      "totalWorkers": 4,
      "activeWorkers": 4
    }
  }
}
```

### Without Redis Configured

```json
{
  "status": "up",
  "details": {
    "redis": "not configured",
    "workerStatus": {
      "status": "Redis not configured",
      "totalWorkers": 0,
      "activeWorkers": 0
    },
    "note": "App running without Redis - queue operations disabled"
  }
}
```

## Queue Service Behavior

### With Redis

```typescript
// Jobs are queued and processed
const jobId = await queueService.enqueueFileProcess(payload);
// Returns: "file-123-1703123456789"
```

### Without Redis

```typescript
// Jobs return mock IDs, no processing
const jobId = await queueService.enqueueFileProcess(payload);
// Returns: "mock-file-process-1703123456789"
// Logs: "Redis not configured, file process job not queued"
```

## Troubleshooting

### App Won't Start

**Problem:** App crashes with Redis connection errors

**Solution:** 
1. Check if `REDIS_URL` is set incorrectly
2. Remove `REDIS_URL` to run without Redis
3. Verify Redis service is running (if using Redis)

### Queue Operations Not Working

**Problem:** Jobs are not being processed

**Solution:**
1. Check if `REDIS_URL` is set
2. Verify Redis service is accessible
3. Check worker logs for connection errors

### Performance Issues

**Problem:** App is slow or unresponsive

**Solution:**
1. Monitor Redis connection pool size
2. Check for Redis connection leaks
3. Consider Redis clustering for high load

## Development Workflow

### Local Development Without Redis

```bash
# Start app without Redis
npm run start:dev

# Queue operations will work but return mock IDs
# Perfect for development and testing
```

### Local Development With Redis

```bash
# Start Redis locally
docker run -d -p 6379:6379 redis:alpine

# Set environment variable
export REDIS_URL=redis://localhost:6379

# Start app with Redis
npm run start:dev
```

## Migration Strategy

### From No Redis to Redis

1. Add Redis service to Railway
2. Set `REDIS_URL` environment variable
3. Restart application
4. Queue operations will automatically become available

### From Redis to No Redis

1. Remove `REDIS_URL` environment variable
2. Restart application
3. Queue operations will be disabled
4. No data loss - jobs in Redis will remain

## Best Practices

1. **Development:** Run without Redis for simplicity
2. **Staging:** Use Redis for testing queue functionality
3. **Production:** Always use Redis for reliability
4. **Testing:** Mock queue service in unit tests
5. **Monitoring:** Check Redis health in production

## Security Considerations

- Never expose Redis directly to the internet
- Use strong passwords for Redis authentication
- Enable TLS in production environments
- Monitor Redis access logs
- Use Redis ACLs for fine-grained permissions
