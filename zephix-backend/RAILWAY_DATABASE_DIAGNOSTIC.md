# Railway Database Failure Diagnostic Guide

## Quick Diagnosis Checklist

### 1. Check Database Service Status in Railway Dashboard

**Railway Dashboard → Database Service → Status**

- ✅ **Running** = Database service is active
- ❌ **Stopped** = Database service is paused (common on free tier)
- ❌ **Failed** = Database service has crashed

**Action if Stopped:**
- Click "Start" button in Railway dashboard
- Wait 30-60 seconds for database to initialize
- Redeploy backend service

---

### 2. Verify Database is Linked to Backend Service

**Railway Dashboard → Backend Service → Settings → Variables**

Check if these variables exist:
- `DATABASE_URL` (should be auto-populated if linked)
- `PGHOST`
- `PGPORT`
- `PGDATABASE`
- `PGUSER`
- `PGPASSWORD`

**Action if Missing:**
- Railway Dashboard → Backend Service → Settings → "Add Service"
- Select your PostgreSQL database service
- Railway will auto-populate `DATABASE_URL` and related variables
- Redeploy backend service

---

### 3. Check DATABASE_URL Format

**Railway Dashboard → Backend Service → Variables → DATABASE_URL**

Expected format:
```
postgresql://postgres:password@host:port/database?sslmode=require
```

Common issues:
- ❌ Missing `?sslmode=require` (Railway requires SSL)
- ❌ Wrong host (should be Railway internal host)
- ❌ Expired password (Railway rotates passwords)

**Action:**
- If DATABASE_URL looks wrong, unlink and re-link the database service
- Railway will regenerate a fresh DATABASE_URL

---

### 4. Check Backend Logs for Database Errors

**Railway Dashboard → Backend Service → Deployments → Latest → Logs**

Look for:
- ❌ `Connection terminated unexpectedly`
- ❌ `The server does not support SSL connections`
- ❌ `timeout expired`
- ❌ `role 'user' does not exist`
- ❌ `database "xyz" does not exist`

**Common Error Patterns:**

**Error: "Connection terminated unexpectedly"**
- Cause: Database service stopped or network issue
- Fix: Start database service in Railway dashboard

**Error: "The server does not support SSL connections"**
- Cause: SSL configuration mismatch
- Fix: Ensure `DATABASE_URL` includes `?sslmode=require`

**Error: "timeout expired"**
- Cause: Database taking too long to respond
- Fix: Check database service status, may need to restart

**Error: "role 'user' does not exist"**
- Cause: Wrong DATABASE_URL (using local dev credentials)
- Fix: Re-link database service to get fresh Railway credentials

---

### 5. Verify Health Check Endpoint

**Test:** `GET https://<your-backend-url>/api/health`

Expected response:
```json
{
  "status": "healthy",
  "checks": [
    {
      "name": "Database Connection",
      "status": "healthy",
      "critical": true
    }
  ]
}
```

If database check shows `"status": "unhealthy"`:
- Check Railway backend logs for specific error
- Verify database service is running
- Verify DATABASE_URL is set correctly

---

### 6. Emergency Recovery (If Database Completely Broken)

**Option A: Skip Database Temporarily**

Railway Dashboard → Backend Service → Variables:
```
SKIP_DATABASE=true
EMERGENCY_MODE=true
```

This allows backend to start without database (health checks will work, but no data operations).

**Option B: Create New Database Service**

1. Railway Dashboard → New → Database → PostgreSQL
2. Wait for database to provision
3. Link to backend service
4. Railway will auto-populate DATABASE_URL
5. Run migrations if needed
6. Redeploy backend

---

## Most Common Causes (Priority Order)

1. **Database Service Stopped** (90% of cases)
   - Free tier databases auto-pause after inactivity
   - Fix: Start database service in Railway dashboard

2. **Database Not Linked to Backend**
   - DATABASE_URL missing in backend service variables
   - Fix: Link database service to backend service

3. **Expired/Credentials**
   - Railway rotates database passwords periodically
   - Fix: Re-link database service to get fresh credentials

4. **SSL Configuration Issue**
   - DATABASE_URL missing `?sslmode=require`
   - Fix: Ensure Railway auto-generates DATABASE_URL (includes SSL)

5. **Network/Connection Timeout**
   - Database service overloaded or slow
   - Fix: Restart database service, check Railway status page

---

## Quick Fix Steps (5 Minutes)

1. **Railway Dashboard → Database Service**
   - Check status: If "Stopped", click "Start"
   - Wait 30 seconds

2. **Railway Dashboard → Backend Service → Variables**
   - Verify `DATABASE_URL` exists
   - If missing: Settings → Add Service → Select Database

3. **Railway Dashboard → Backend Service → Deployments**
   - Click "Redeploy" (or wait for auto-redeploy)
   - Watch logs for database connection success

4. **Test Health Endpoint**
   - `GET /api/health`
   - Verify database check shows "healthy"

---

## Verification Commands (If You Have Railway CLI)

```bash
# Check database service status
railway status --service <database-service-name>

# Check backend environment variables
railway variables --service <backend-service-name>

# View database connection string (masked)
railway variables --service <backend-service-name> | grep DATABASE_URL
```

---

## Still Not Working?

If database still shows failed after trying above:

1. **Check Railway Status Page**: https://status.railway.app
   - Look for PostgreSQL service outages

2. **Check Database Service Logs**:
   - Railway Dashboard → Database Service → Logs
   - Look for errors or warnings

3. **Try Creating Fresh Database**:
   - Sometimes Railway databases get into bad state
   - Create new database service and migrate data

4. **Contact Railway Support**:
   - If database service shows "Failed" and won't start
   - Railway support can investigate service-level issues

