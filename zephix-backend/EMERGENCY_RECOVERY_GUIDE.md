# 🚨 EMERGENCY RECOVERY GUIDE - Backend 502 Outage

## CRITICAL ISSUE IDENTIFIED
**Root Cause**: Database connection failure - PostgreSQL role "user" does not exist
**Impact**: Complete backend outage (502 errors on all endpoints)
**Status**: Application cannot start due to database authentication failure

## IMMEDIATE RECOVERY STEPS

### Step 1: Emergency Mode Startup (IMMEDIATE)
The application has been modified to support emergency mode startup without database connection.

**Option A: Railway Environment Variables (Recommended)**
1. Go to Railway dashboard for `zephix-backend`
2. Navigate to Variables tab
3. Set these environment variables:
   ```
   SKIP_DATABASE=true
   EMERGENCY_MODE=true
   ```
4. Redeploy the application

**Option B: Local Emergency Testing**
```bash
cd zephix-backend
./scripts/emergency-start.sh
```

### Step 2: Verify Emergency Mode
Once emergency mode is active, the application should:
- ✅ Start successfully
- ✅ Respond to health checks at `/api/health`
- ✅ Provide basic API structure
- ⚠️  Disable authentication features
- ⚠️  Disable data persistence

## DATABASE CONNECTION FIX

### Issue Analysis
The error `role "user" does not exist` indicates:
1. **Missing Database User**: The PostgreSQL user specified in DATABASE_URL doesn't exist
2. **Incorrect Credentials**: Database connection string has wrong username/password
3. **Database Not Created**: The target database hasn't been provisioned

### Fix Options

#### Option 1: Fix Railway Database (Recommended)
1. Check Railway PostgreSQL service status
2. Verify DATABASE_URL environment variable format
3. Ensure database user exists and has proper permissions
4. Test connection with:
   ```bash
   psql $DATABASE_URL -c "SELECT 1;"
   ```

#### Option 2: Create Missing Database User
```sql
-- Connect as postgres superuser
CREATE USER "user" WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE zephix_production TO "user";
GRANT ALL PRIVILEGES ON SCHEMA public TO "user";
```

#### Option 3: Update DATABASE_URL
If the user should be different, update Railway environment:
```
DATABASE_URL=postgresql://correct_username:password@host:port/database
```

## RECOVERY PROCEDURE

### Phase 1: Emergency Recovery (IMMEDIATE)
- [ ] Set `SKIP_DATABASE=true` in Railway
- [ ] Redeploy application
- [ ] Verify health check endpoint responds
- [ ] Confirm basic API structure works

### Phase 2: Database Restoration
- [ ] Identify and fix database connection issue
- [ ] Test database connectivity
- [ ] Run database migrations if needed
- [ ] Verify all entities can connect

### Phase 3: Full Restoration
- [ ] Set `SKIP_DATABASE=false` in Railway
- [ ] Redeploy application
- [ ] Verify full functionality restored
- [ ] Test authentication endpoints
- [ ] Confirm data persistence working

## MONITORING & VERIFICATION

### Health Check Endpoints
- **Emergency Mode**: `/api/health` should return 200
- **Full Mode**: `/api/health` should return 200 with database status

### Key Metrics to Monitor
- Application startup time
- Database connection success rate
- API response times
- Error rates by endpoint

### Rollback Plan
If emergency mode causes issues:
1. Set `SKIP_DATABASE=false`
2. Fix database connection
3. Redeploy with full functionality

## PREVENTION MEASURES

### Database Connection Resilience
- Implement connection pooling
- Add retry mechanisms with exponential backoff
- Use health checks for database connectivity
- Monitor database connection metrics

### Environment Validation
- Validate all required environment variables on startup
- Check database connectivity before accepting requests
- Implement graceful degradation for non-critical services

### Monitoring & Alerting
- Set up alerts for database connection failures
- Monitor application startup logs
- Track deployment success rates
- Implement circuit breakers for external dependencies

## CONTACT INFORMATION

**Emergency Contacts**:
- Engineering Team: [Contact Info]
- DevOps: [Contact Info]
- Database Admin: [Contact Info]

**Escalation Path**:
1. On-call Engineer (15 minutes)
2. Engineering Lead (30 minutes)
3. CTO (1 hour)

---

**Last Updated**: August 15, 2025
**Status**: CRITICAL - Emergency recovery in progress
**Next Review**: After emergency mode activation
